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

// Phase 1a: WebGPU passthrough. Draws each decoded video frame onto a canvas with bilinear scaling.
// The SR model replaces the fragment shader in Phase 1b.

// Output resolution = input resolution * SCALE (320x180 -> 1280x720)
export const SCALE = 4;

// Difference view (setDifference(true)): 0.5 + 10 * (upscaled - bilinear), so mid-grey means the upscaler added nothing
const DIFF_GAIN = 10;

const SHADER = /* wgsl */`
@group(0) @binding(0) var samp: sampler;
@group(0) @binding(1) var tex: texture_external;
@group(0) @binding(2) var<uniform> view: vec4u;

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
    let out = rgb; // passthrough is bilinear, so the difference view is flat grey
    if (view.x == 1u) {
        return vec4f(vec3f(0.5) + (out - rgb) * ${DIFF_GAIN}.0, 1.0);
    }
    return vec4f(out, 1.0);
}
`;

// onResize(cssWidth, cssHeight) fires when the output resolution changes, so the page can size the
// <video> element to match. CSS size is output / devicePixelRatio: one canvas pixel per device pixel.
export async function createUpscaleRenderer(video, canvas, { onStats, onResize } = {}) {
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

    const module = device.createShaderModule({ code: SHADER });
    const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: { module, entryPoint: 'vs' },
        fragment: { module, entryPoint: 'fs', targets: [{ format }] },
        primitive: { topology: 'triangle-list' }
    });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const view = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

    let avgMs = 0;

    function render() {
        if (!video.videoWidth) {
            return;
        }
        const t0 = performance.now();

        if (canvas.width !== video.videoWidth * SCALE || canvas.height !== video.videoHeight * SCALE) {
            canvas.width = video.videoWidth * SCALE;
            canvas.height = video.videoHeight * SCALE;
            const cssW = canvas.width / devicePixelRatio;
            const cssH = canvas.height / devicePixelRatio;
            canvas.style.width = `${cssW}px`;
            canvas.style.height = `${cssH}px`;
            onResize?.(cssW, cssH);
        }

        // External textures expire after the current task, so the bind group is rebuilt every frame
        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: device.importExternalTexture({ source: video }) },
                { binding: 2, resource: { buffer: view } }
            ]
        });

        const encoder = device.createCommandEncoder();
        const pass = encoder.beginRenderPass({
            colorAttachments: [{
                view: ctx.getCurrentTexture().createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(3);
        pass.end();
        device.queue.submit([encoder.finish()]);

        // ponytail: CPU-side wall clock incl. queue latency, switch to GPU timestamp queries if numbers look noisy
        device.queue.onSubmittedWorkDone().then(() => {
            const ms = performance.now() - t0;
            avgMs = avgMs ? avgMs * 0.9 + ms * 0.1 : ms;
            onStats?.({
                ms: avgMs,
                input: `${video.videoWidth}x${video.videoHeight}`,
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
