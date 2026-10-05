# Phase 3 — Energy-aware Budget

## Goal

The SR level adapts to what the device can afford: `full` (2x model), `light` (cheap sharpen shader) or `off`. The
level feeds the Phase 2 cap, so compute and bandwidth trade off automatically.

## Files

- `samples/ai/3-energy-budget/`, copied from the Phase 2 sample: add a budget controller next to the pipeline, and show
  the level, its reason and a timeline

## Inputs

| Signal | API | Step down when | Notes |
|--------|-----|----------------|-------|
| Frame cost | moving average of SR ms/frame vs. frame interval (`requestVideoFrameCallback` metadata) | cost > ~50% of interval | always available |
| CPU pressure | `new PressureObserver(cb).observe('cpu')` | `serious` / `critical` | Chromium only; feature-detect |
| Battery | `navigator.getBattery()` | discharging and level < ~20% → cap at `light` | Chromium only; feature-detect |
| Dropped frames | `video.getVideoPlaybackQuality()` delta | rising | always available |

## Steps

1. Implement the controller as a small state machine: `full ⇄ light ⇄ off`.
2. **Step down** immediately on any trigger. **Step up** only after every signal has been healthy for N seconds
   (hysteresis, a minimum dwell time per level) so SR doesn't flap.
3. On each level change, call the Phase 2 cap function: `off` → cap `-1`, `light` / `full` → cap for that level's
   effective scale.
4. UI: current level, reason (for example `pressure: serious`), and a timeline of levels over time.

## Exit criterion

Emulated `critical` pressure (DevTools → Sensors → Compute pressure) or heavy CPU throttling steps SR down to `off`
within a few seconds, and the player climbs back to the higher rendition. Releasing the pressure restores SR and
the lower rendition.

## Open questions

- What should `light` be? A CAS/unsharp WGSL pass is cheap and good enough.
- How should N and the thresholds be tuned? Use the ms/frame data from Phase 1; this is a calibration knob, not a
  constant.
- `PressureObserver` reports CPU pressure, not GPU. Frame cost is the GPU proxy, so keep both.
