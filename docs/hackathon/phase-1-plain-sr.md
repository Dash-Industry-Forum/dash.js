# Phase 1 — Plain SR

## Goal

Upscale dash.js video output in real time on WebGPU. No ABR changes and no energy logic in this phase.

## Files

- 1a: `samples/ai/1a-webgpu-upscale-passthrough/` (`index.html`, `upscale.js`) — done
- 1b: `samples/ai/1b-espcn-super-resolution/` — done
  - `espcn.js`: ESPCN x4 as hand-written WGSL compute shaders (luma → conv 5x5 1→64 → 3x3 64→32 → 3x3 32→16 →
    pixel shuffle + tanh in the render pass). No ML runtime dependency.
  - `espcn_x4.bin`: OpenCV dnn_superres ESPCN_x4 weights (Apache-2.0, `LICENSE-espcn_x4.txt`)
  - `convert-weights.py`: rebuilds the `.bin` from `ESPCN_x4.pb`; `--check image.jpg` validates it with a numpy
    reference (ESPCN must beat bicubic)
  - Measured: 320x180 → 1280x720 at ~10 ms/frame (Apple GPU, Chrome). The WebGPU output matches the numpy
    reference at 61.8 dB for the same RGB input.
- 1c: `samples/ai/1c-realesrgan-animevideov3/` — done
  - `realesrgan.js`: Real-ESRGAN realesr-animevideov3 (SRVGGNetCompact x4, trained on realistic degradations incl.
    compression) via onnxruntime-web 1.30 on WebGPU. One GPUDevice is shared with onnxruntime (passed through the
    execution provider options), so frames stay on the GPU. Frames that arrive during inference are skipped; the
    latest one is upscaled right after.
  - `model.onnx`: third-party export (Hugging Face `skillsafe-ai/realesr-animevideov3`, commit `185e914`);
    `verify-model.py` proves all 53 tensors are identical to the official v0.2.5.0 `.pth` (BSD-3-Clause,
    `LICENSE-realesr-animevideov3.txt`) and that a numpy forward reproduces the reference output.
  - Measured: 320x180 → 1280x720 at ~55–70 ms/frame, 11–18 SR fps (Apple GPU, Chrome). The WebGPU output matches the
    numpy reference at 58.9 dB for the same RGB input. Clearly visible gain: crisp text and edges, compression
    blur and blocking removed (slightly painted look, as usual for Real-ESRGAN).
- `samples/samples.json`: register each sample

## Steps

1. **Player setup.** Copy the bootstrap from `samples/abr/abr.html`. Put the `<video>` underneath (or hidden) and a
   `<canvas>` on top at display size × `devicePixelRatio`.
2. **Frame loop.**
   `video.requestVideoFrameCallback` → `device.importExternalTexture({ source: video })` → render or compute pass →
   canvas context configured with `navigator.gpu.getPreferredCanvasFormat()`. Re-register the callback on every frame.
3. **1a: bilinear passthrough.** A fullscreen-triangle shader samples the external texture. This proves the pipeline
   and gives the baseline cost.
4. **1b: real SR at 2x.** Pick one:
   - **Anime4K-style CNN in WGSL.** Weights are baked into the shaders, with no runtime dependency. Fastest to get
     working; it's trained on anime but still sharpens other content.
   - **ESPCN/FSRCNN through onnxruntime-web (WebGPU EP).** Load it from a CDN; the model is about 100 KB. A "real"
     ML model and a better pitch. Run it on **luma only** (Y channel) and upscale chroma bilinearly; this is the
     standard trick and keeps the cost down. Keep the tensors on the GPU (IO binding) to avoid readback.
5. **UI.**
   - SR on/off toggle.
   - Split-screen slider: left is native bilinear, right is SR.
   - Stats line: ms/frame (GPU timestamp query if available, otherwise `performance.now()` around
     `queue.onSubmittedWorkDone()`), input resolution and output resolution.
6. **Content.** A multi-rendition stream from `samples/samples.json` with 540p and 1080p renditions. Pin it to 540p
   with `setRepresentationForTypeByIndex('video', idx)` to judge SR quality.

## Exit criterion

540p + SR looks visibly closer to 1080p than to 540p, at under ~8 ms/frame on a laptop GPU.

## Open questions

- ~~Anime4K or ESPCN?~~ ESPCN (trained on natural images; fits the test content).
- Real time with 1c: next speed knobs are fp16 (`model_fp16.onnx`, needs `shader-f16`) and onnxruntime graph capture.
  In Phase 3 the energy budget can switch between 1c (best), ESPCN (cheap) and off.
- The visible gain on 200 kbps content is modest: ESPCN sharpens edges but was trained on clean bicubic
  downscales, so it does not remove compression artifacts. A model trained on compressed video would help more.
- 10 ms/frame is 30% of the 33 ms budget at 30 fps. If that's too much, tile conv2 in workgroup shared memory (marked
  with `ponytail:` in `espcn.js`).
- Does `importExternalTexture` work for EME-protected content? It shouldn't (protected frames aren't readable), so
  use clear content only.
- Scale factor 2x only, or 2x and 3x? 2x is enough for 540p → 1080p.
