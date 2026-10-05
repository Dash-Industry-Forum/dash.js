/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

// Phase 1c: Real-ESRGAN realesr-animevideov3 (SRVGGNetCompact, x4) via onnxruntime-web on WebGPU.
// Weights: official Real-ESRGAN v0.2.5.0 (BSD-3-Clause, see LICENSE-realesr-animevideov3.txt); model.onnx is a
// third-party export, checked against the official .pth by verify-model.py.
//
// One GPUDevice is shared with onnxruntime, so frames never leave the GPU:
//   compute: video frame -> input buffer, NCHW float32 [1,3,H,W], RGB 0..1
//   onnxruntime: input -> output buffer [1,3,4H,4W]
//   render: output -> canvas (difference view: 0.5 + 10 * (sr - bilinear))
// The model is slower than the video frame rate, so frames that arrive while inference runs are skipped; the latest
// skipped frame is upscaled as soon as the current run finishes.

import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/ort.webgpu.bundle.min.mjs';

// Output resolution = input resolution * SCALE (320x180 -> 1280x720). Fixed by the model.
export const SCALE = 4;

// Difference view (setDifference(true)): 0.5 + 10 * (upscaled - bilinear), so mid-grey means the upscaler added nothing
const DIFF_GAIN = 10;

const INPUT_SHADER = /* wgsl */`
@group(0) @binding(0) var tex: texture_external;
@group(0) @binding(1) var<storage, read_write> dst: array<f32>;
@group(0) @binding(2) var<uniform> dims: vec4u;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= dims.x || id.y >= dims.y) {
        return;
    }
    let rgb = textureLoad(tex, id.xy).rgb;
    let plane = dims.x * dims.y;
    let i = id.y * dims.x + id.x;
    dst[i] = rgb.r;
    dst[plane + i] = rgb.g;
    dst[2u * plane + i] = rgb.b;
}
`;

// dims: x, y = input size, z = difference view on/off
const RENDER_SHADER = /* wgsl */`
@group(0) @binding(0) var<storage, read> sr: array<f32>;
@group(0) @binding(1) var<storage, read> src: array<f32>;
@group(0) @binding(2) var<uniform> dims: vec4u;

// Fullscreen triangle, no vertex buffer
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
    let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
    return vec4f(p * 2.0 - 1.0, 0.0, 1.0);
}

fn texel(c: u32, x: i32, y: i32) -> f32 {
    let cx = u32(clamp(x, 0, i32(dims.x) - 1));
    let cy = u32(clamp(y, 0, i32(dims.y) - 1));
    return src[c * dims.x * dims.y + cy * dims.x + cx];
}

// Bilinear upscale of the input frame, for the difference view (the external texture has expired by now)
fn bilinear(c: u32, p: vec2f) -> f32 {
    let s = p / ${SCALE}.0 - 0.5;
    let f = floor(s);
    let t = s - f;
    let x = i32(f.x);
    let y = i32(f.y);
    return mix(mix(texel(c, x, y), texel(c, x + 1, y), t.x), mix(texel(c, x, y + 1), texel(c, x + 1, y + 1), t.x), t.y);
}

@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
    let p = vec2u(pos.xy);
    let w = dims.x * ${SCALE}u;
    let plane = w * dims.y * ${SCALE}u;
    let i = p.y * w + p.x;
    let rgb = vec3f(sr[i], sr[plane + i], sr[2u * plane + i]);
    if (dims.z == 1u) {
        let base = vec3f(bilinear(0u, pos.xy), bilinear(1u, pos.xy), bilinear(2u, pos.xy));
        return vec4f(vec3f(0.5) + (rgb - base) * ${DIFF_GAIN}.0, 1.0);
    }
    return vec4f(clamp(rgb, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

// onResize(cssWidth, cssHeight) fires when the output resolution changes, so the page can size the
// <video> element to match. CSS size is output / devicePixelRatio: one canvas pixel per device pixel.
export async function createRealEsrganRenderer(video, canvas, { onStats, onResize } = {}) {
    if (!navigator.gpu) {
        throw new Error('WebGPU not available in this browser');
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
        throw new Error('No WebGPU adapter found');
    }
    // onnxruntime needs more than the default limits; ask for what the adapter offers
    const limits = ['maxBufferSize', 'maxStorageBufferBindingSize', 'maxComputeWorkgroupStorageSize',
        'maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupSizeX', 'maxComputeWorkgroupSizeY',
        'maxComputeWorkgroupSizeZ', 'maxComputeWorkgroupsPerDimension', 'maxStorageBuffersPerShaderStage'];
    const device = await adapter.requestDevice({
        requiredLimits: Object.fromEntries(limits.map(l => [l, adapter.limits[l]])),
        requiredFeatures: ['shader-f16', 'timestamp-query'].filter(f => adapter.features.has(f))
    });
    // onnxruntime-web 1.30 takes a shared device through the execution provider options (not env.webgpu.device)
    const session = await ort.InferenceSession.create(new URL('./model.onnx', import.meta.url).href, {
        executionProviders: [{ name: 'webgpu', device }],
        preferredOutputLocation: 'gpu-buffer'
    });

    const format = navigator.gpu.getPreferredCanvasFormat();
    const ctx = canvas.getContext('webgpu');
    ctx.configure({ device, format, alphaMode: 'opaque' });

    const inputPipeline = device.createComputePipeline({
        layout: 'auto',
        compute: { module: device.createShaderModule({ code: INPUT_SHADER }), entryPoint: 'main' }
    });
    const renderModule = device.createShaderModule({ code: RENDER_SHADER });
    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: { module: renderModule, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
    });
    const dims = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    let width = 0;
    let height = 0;
    let difference = false;
    let input, inputTensor, output;

    function writeDims() {
        device.queue.writeBuffer(dims, 0, new Uint32Array([width, height, difference ? 1 : 0, 0]));
    }

    function allocate(w, h) {
        input?.destroy();
        width = w;
        height = h;
        writeDims();
        input = device.createBuffer({
            size: 3 * w * h * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        inputTensor = ort.Tensor.fromGpuBuffer(input, { dataType: 'float32', dims: [1, 3, h, w] });

        canvas.width = w * SCALE;
        canvas.height = h * SCALE;
        const cssW = canvas.width / devicePixelRatio;
        const cssH = canvas.height / devicePixelRatio;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        onResize?.(cssW, cssH);
    }

    function draw() {
        if (!output) {
            return;
        }
        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        pass.setPipeline(renderPipeline);
        pass.setBindGroup(0, device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: output.gpuBuffer } },
                { binding: 1, resource: { buffer: input } },
                { binding: 2, resource: { buffer: dims } }
            ]
        }));
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);
    }

    let busy = false;
    let pending = false;
    let avgMs = 0;
    let done = [];

    async function upscale() {
        if (!video.videoWidth) {
            return;
        }
        if (busy) {
            // Skip this frame, but run once more on the latest frame afterwards (e.g. the frame shown after a seek)
            pending = true;
            return;
        }
        busy = true;
        const t0 = performance.now();
        try {
            if (width !== video.videoWidth || height !== video.videoHeight) {
                allocate(video.videoWidth, video.videoHeight);
            }

            const encoder = device.createCommandEncoder();
            const pass = encoder.beginComputePass();
            pass.setPipeline(inputPipeline);
            pass.setBindGroup(0, device.createBindGroup({
                layout: inputPipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: device.importExternalTexture({ source: video }) },
                    { binding: 1, resource: { buffer: input } },
                    { binding: 2, resource: { buffer: dims } }
                ]
            }));
            pass.dispatchWorkgroups(Math.ceil(width / 8), Math.ceil(height / 8));
            pass.end();
            device.queue.submit([encoder.finish()]);

            const result = await session.run({ [session.inputNames[0]]: inputTensor });
            // Queue order makes the previous frame's render read finish before onnxruntime reuses its buffer
            output?.dispose();
            output = result[session.outputNames[0]];
            draw();
            await device.queue.onSubmittedWorkDone();

            const now = performance.now();
            const ms = now - t0;
            avgMs = avgMs ? avgMs * 0.9 + ms * 0.1 : ms;
            done = done.filter(t => now - t < 1000).concat(now);
            onStats?.({
                ms: avgMs,
                srFps: done.length,
                input: `${width}x${height}`,
                output: `${canvas.width}x${canvas.height}`,
                scale: SCALE
            });
        } finally {
            busy = false;
            if (pending) {
                pending = false;
                upscale();
            }
        }
    }

    function onFrame() {
        upscale();
        video.requestVideoFrameCallback(onFrame);
    }
    video.requestVideoFrameCallback(onFrame);

    return {
        setDifference(on) {
            difference = on;
            writeDims();
            draw();
        }
    };
}
