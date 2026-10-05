# SR + Energy-Aware Playback for dash.js

SVTA Hackathon — Track 1: Player Intelligence.

## Pitch

Run client-side super-resolution (SR) on WebGPU and let dash.js deliberately fetch a **lower** rendition, since SR
recovers the detail. That saves bandwidth. An energy budget decides how much SR the device can afford. When the
budget runs out, SR steps down and the bitrate cap lifts, so the network supplies the quality the GPU no longer can.

A plain `<video>` filter can't make this trade. Only the player can, which is why it belongs in dash.js.

Track bullets covered: client-side video super-resolution, AI-assisted playback optimization, and energy-aware
inference that adapts to device constraints.

## Architecture

```
 dash.js MediaPlayer ──► <video> (hidden / underneath)
        ▲                    │ requestVideoFrameCallback
        │ updateSettings     ▼
        │ maxBitrate     SR pipeline (WebGPU) ──► <canvas> (visible)
        │                    ▲  level: full | light | off
        └──── SR cap ◄──── Energy budget
                             ▲
          frame cost · PressureObserver · Battery · dropped frames
```

- **SR pipeline**: the WebGPU frame loop and the model (Phase 1).
- **SR cap**: maps the SR level to `streaming.abr.maxBitrate.video` (Phase 2).
- **Energy budget**: picks the SR level from device signals (Phase 3).

Every phase is its own isolated sample under `samples/ai/<phase>-<name>/` and starts as a copy of the previous
one. The public dash.js API is enough, and nothing in `src/` changes. Move it into `src/` after the hackathon only if it proves out.

## Phases

| Phase | Doc | Outcome |
|-------|-----|---------|
| 1 | [Plain SR](phase-1-plain-sr.md) | WebGPU upscaler on top of the dash.js player, with ms/frame stats |
| 2 | [SR-aware cap](phase-2-sr-aware-cap.md) | Lower rendition fetched while SR is on; bandwidth savings shown |
| 3 | [Energy budget](phase-3-energy-budget.md) | SR level adapts to pressure, battery and frame cost |
| 4 | [Extras](phase-4-extras.md) | CMCD signaling, savings panel |

Start with Phase 1. Every later phase depends on it, and it's the riskiest part (frame loop performance and model
choice). Phase 3 needs real ms/frame numbers from Phase 1 to tune against.

## Verification (end to end)

1. `npm start` → open the phase's sample (e.g. `/samples/ai/1a-webgpu-upscale-passthrough/`) in Chrome with WebGPU enabled.
2. Toggle SR and check the split view and the ms/frame stat.
3. DevTools Network: segment requests switch to the lower rendition when SR is on, and back when it's off.
4. DevTools → Sensors → Compute pressure (or CPU throttling): the SR level steps down and the cap lifts.
5. `npm run lint` only if something in `src/` changes.

## Demo script (≈3 min)

1. Play at 1080p with SR off. Show the bitrate.
2. Turn SR on. The player drops to 540p, the picture still looks sharp, and the bandwidth saving appears in the stats.
3. Emulate `critical` CPU pressure. SR switches off and the player climbs back to 1080p.
4. Release the pressure. SR comes back and the bitrate drops again.
