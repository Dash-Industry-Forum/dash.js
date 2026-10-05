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

// Phase 1b: ESPCN x4 super-resolution (Shi et al. 2016) as hand-written WebGPU compute shaders.
// Weights: OpenCV dnn_superres ESPCN_x4 (Apache-2.0, see LICENSE-espcn_x4.txt), converted by convert-weights.py
// into espcn_x4.bin. Source: https://github.com/fannymonori/TF-ESPCN
//
// Per frame, all at input resolution except the last step:
//   luma:  video frame -> Y (BT.601 weights, like OpenCV's YCrCb)
//   conv1: 5x5,  1 -> 64, ReLU
//   conv2: 3x3, 64 -> 32, ReLU
//   conv3: 3x3, 32 -> 16
//   render (output resolution): DepthToSpace(4) + tanh gives Y_sr; colour comes from bilinear RGB,
//   shifted by (Y_sr - Y_bilinear). That keeps bilinear chroma, same as swapping Y in YCrCb.

// Output resolution = input resolution * SCALE (320x180 -> 1280x720). Fixed by the model.
export const SCALE = 4;

// Difference view (setDifference(true)): 0.5 + 10 * (upscaled - bilinear), so mid-grey means the upscaler added nothing
const DIFF_GAIN = 10;

// Offsets (in floats) into espcn_x4.bin, see convert-weights.py
const LAYERS = [
    { k: 5, cin: 1, cout: 64, w: 0, b: 1600, relu: true },
    { k: 3, cin: 64, cout: 32, w: 1664, b: 20096, relu: true },
    { k: 3, cin: 32, cout: 16, w: 20128, b: 24736, relu: false }
];
const WEIGHT_COUNT = 24752;

const LUMA = 'vec3f(0.299, 0.587, 0.114)';

const LUMA_SHADER = /* wgsl */`
@group(0) @binding(0) var tex: texture_external;
@group(0) @binding(1) var<storage, read_write> dst: array<f32>;
@group(0) @binding(2) var<uniform> dims: vec2u;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= dims.x || id.y >= dims.y) {
        return;
    }
    dst[id.y * dims.x + id.x] = dot(textureLoad(tex, id.xy).rgb, ${LUMA});
}
`;

// Same-padded (zero) convolution, channel-last layout: src[pixel * CIN + c], weights in TF HWIO order.
// ponytail: one thread per pixel computing all output channels, no shared-memory tiling; tile if ms/frame is too high
function convShader({ k, cin, cout, w, b, relu }) {
    return /* wgsl */`
@group(0) @binding(0) var<storage, read> weights: array<f32>;
@group(0) @binding(1) var<storage, read> src: array<f32>;
@group(0) @binding(2) var<storage, read_write> dst: array<f32>;
@group(0) @binding(3) var<uniform> dims: vec2u;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= dims.x || id.y >= dims.y) {
        return;
    }
    var acc: array<f32, ${cout}>;
    for (var o = 0u; o < ${cout}u; o++) {
        acc[o] = weights[${b}u + o];
    }
    for (var ky = 0u; ky < ${k}u; ky++) {
        let y = i32(id.y) + i32(ky) - ${k >> 1};
        if (y < 0 || y >= i32(dims.y)) {
            continue;
        }
        for (var kx = 0u; kx < ${k}u; kx++) {
            let x = i32(id.x) + i32(kx) - ${k >> 1};
            if (x < 0 || x >= i32(dims.x)) {
                continue;
            }
            let s = (u32(y) * dims.x + u32(x)) * ${cin}u;
            for (var i = 0u; i < ${cin}u; i++) {
                let v = src[s + i];
                let wb = ${w}u + ((ky * ${k}u + kx) * ${cin}u + i) * ${cout}u;
                for (var o = 0u; o < ${cout}u; o++) {
                    acc[o] += v * weights[wb + o];
                }
            }
        }
    }
    let d = (id.y * dims.x + id.x) * ${cout}u;
    for (var o = 0u; o < ${cout}u; o++) {
        dst[d + o] = ${relu ? 'max(acc[o], 0.0)' : 'acc[o]'};
    }
}
`;
}

const RENDER_SHADER = /* wgsl */`
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_external;
@group(0) @binding(2) var<storage, read> conv3: array<f32>;
@group(0) @binding(3) var<uniform> dims: vec2u;
@group(0) @binding(4) var<uniform> view: vec4u;

struct VSOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
};

// Fullscreen triangle, no vertex buffer
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
    let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u));
    var o: VSOut;
    o.pos = vec4f(p * 2.0 - 1.0, 0.0, 1.0);
    o.uv = vec2f(p.x, 1.0 - p.y);
    return o;
}

@fragment fn fs(in: VSOut) -> @location(0) vec4f {
    let rgb = textureSampleBaseClampToEdge(tex, samp, in.uv).rgb;
    // DepthToSpace(4): output pixel (4y + dy, 4x + dx) <- channel dy * 4 + dx of input pixel (y, x)
    let p = vec2u(in.pos.xy);
    let l = min(p / ${SCALE}u, dims - 1u);
    let ySr = tanh(conv3[(l.y * dims.x + l.x) * 16u + (p.y % ${SCALE}u) * ${SCALE}u + p.x % ${SCALE}u]);
    let delta = ySr - dot(rgb, ${LUMA});
    if (view.x == 1u) {
        return vec4f(vec3f(0.5 + delta * ${DIFF_GAIN}.0), 1.0);
    }
    return vec4f(clamp(rgb + delta, vec3f(0.0), vec3f(1.0)), 1.0);
}
`;

// onResize(cssWidth, cssHeight) fires when the output resolution changes, so the page can size the
// <video> element to match. CSS size is output / devicePixelRatio: one canvas pixel per device pixel.
export async function createEspcnRenderer(video, canvas, { onStats, onResize } = {}) {
    if (!navigator.gpu) {
        throw new Error('WebGPU not available in this browser');
    }
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) {
        throw new Error('No WebGPU adapter found');
    }
    const device = await adapter.requestDevice();
    const format = navigator.gpu.getPreferredCanvasFormat();
    const ctx = canvas.getContext('webgpu');
    ctx.configure({ device, format, alphaMode: 'opaque' });

    const res = await fetch(new URL('./espcn_x4.bin', import.meta.url));
    if (!res.ok) {
        throw new Error(`Failed to load ESPCN weights (${res.status})`);
    }
    const weightData = new Float32Array(await res.arrayBuffer());
    if (weightData.length !== WEIGHT_COUNT) {
        throw new Error(`Unexpected ESPCN weight count ${weightData.length}, expected ${WEIGHT_COUNT}`);
    }
    const weights = device.createBuffer({ size: weightData.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(weights, 0, weightData);
    const dims = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    const view = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    const compute = code => device.createComputePipeline({
        layout: 'auto',
        compute: { module: device.createShaderModule({ code }), entryPoint: 'main' }
    });
    const lumaPipeline = compute(LUMA_SHADER);
    const convPipelines = LAYERS.map(l => compute(convShader(l)));
    const renderModule = device.createShaderModule({ code: RENDER_SHADER });
    const renderPipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module: renderModule, entryPoint: 'vs' },
        fragment: { module: renderModule, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
    });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });

    // Activation buffers and their bind groups depend on the input resolution
    let width = 0;
    let height = 0;
    let luma, activations, convBindGroups;

    function allocate(w, h) {
        [luma, ...(activations || [])].forEach(b => b?.destroy());
        width = w;
        height = h;
        device.queue.writeBuffer(dims, 0, new Uint32Array([w, h]));
        const storage = channels => device.createBuffer({ size: w * h * channels * 4, usage: GPUBufferUsage.STORAGE });
        luma = storage(1);
        activations = LAYERS.map(l => storage(l.cout));
        convBindGroups = LAYERS.map((l, i) => device.createBindGroup({
            layout: convPipelines[i].getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: weights } },
                { binding: 1, resource: { buffer: i === 0 ? luma : activations[i - 1] } },
                { binding: 2, resource: { buffer: activations[i] } },
                { binding: 3, resource: { buffer: dims } }
            ]
        }));

        canvas.width = w * SCALE;
        canvas.height = h * SCALE;
        const cssW = canvas.width / devicePixelRatio;
        const cssH = canvas.height / devicePixelRatio;
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        onResize?.(cssW, cssH);
    }

    let avgMs = 0;

    function render() {
        if (!video.videoWidth) {
            return;
        }
        const t0 = performance.now();

        if (width !== video.videoWidth || height !== video.videoHeight) {
            allocate(video.videoWidth, video.videoHeight);
        }

        // External textures expire after the current task, so these bind groups are rebuilt every frame
        const tex = device.importExternalTexture({ source: video });
        const lumaBindGroup = device.createBindGroup({
            layout: lumaPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: tex },
                { binding: 1, resource: { buffer: luma } },
                { binding: 2, resource: { buffer: dims } }
            ]
        });
        const renderBindGroup = device.createBindGroup({
            layout: renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: tex },
                { binding: 2, resource: { buffer: activations[LAYERS.length - 1] } },
                { binding: 3, resource: { buffer: dims } },
                { binding: 4, resource: { buffer: view } }
            ]
        });

        const encoder = device.createCommandEncoder();
        const cpass = encoder.beginComputePass();
        const groupsX = Math.ceil(width / 8);
        const groupsY = Math.ceil(height / 8);
        cpass.setPipeline(lumaPipeline);
        cpass.setBindGroup(0, lumaBindGroup);
        cpass.dispatchWorkgroups(groupsX, groupsY);
        convPipelines.forEach((p, i) => {
            cpass.setPipeline(p);
            cpass.setBindGroup(0, convBindGroups[i]);
            cpass.dispatchWorkgroups(groupsX, groupsY);
        });
        cpass.end();

        const rpass = encoder.beginRenderPass({
            colorAttachments: [{
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        rpass.setPipeline(renderPipeline);
        rpass.setBindGroup(0, renderBindGroup);
        rpass.draw(3);
        rpass.end();
        device.queue.submit([encoder.finish()]);

        // ponytail: CPU-side wall clock incl. queue latency, switch to GPU timestamp queries if numbers look noisy
        device.queue.onSubmittedWorkDone().then(() => {
            const ms = performance.now() - t0;
            avgMs = avgMs ? avgMs * 0.9 + ms * 0.1 : ms;
            onStats?.({
                ms: avgMs,
                input: `${width}x${height}`,
                output: `${canvas.width}x${canvas.height}`,
                scale: SCALE
            });
        });
    }

    function onFrame() {
        render();
        video.requestVideoFrameCallback(onFrame);
    }
    video.requestVideoFrameCallback(onFrame);

    return {
        setDifference(on) {
            device.queue.writeBuffer(view, 0, new Uint32Array([on ? 1 : 0, 0, 0, 0]));
            render();
        }
    };
}
