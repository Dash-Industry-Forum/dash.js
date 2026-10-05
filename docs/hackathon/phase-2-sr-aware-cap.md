# Phase 2 — SR-aware Quality Cap

## Goal

While SR is active, dash.js fetches the lowest rendition that SR can upscale to display size. This is the actual
dash.js integration and the source of the bandwidth savings.

## Files

- `samples/ai/2-sr-aware-cap/`, copied from the 1b sample: add a cap function and the savings stats

## Approach

This phase needs no custom ABR rule. The existing dynamic setting is enough:

```js
player.updateSettings({ streaming: { abr: { maxBitrate: { video: kbps } } } });
```

dash.js already reacts to changes of this setting through `SETTING_UPDATED_MAX_BITRATE` (`src/core/Settings.js`).

## Steps

1. Compute the target height `H = canvas.clientHeight * devicePixelRatio`.
2. With SR on at scale `s`: from `player.getRepresentationsByType('video')`, pick the lowest representation with
   `height * s >= H` and cap `maxBitrate.video` at its bitrate (kbps).
3. With SR off: set the cap to `-1`.
4. Recompute on SR toggle, on resize, and on `STREAM_INITIALIZED`.
5. Stats:
   - current representation: `player.getCurrentRepresentationForType('video')`
   - throughput: `player.getAverageThroughput('video')`
   - bytes saved: (uncapped bitrate − capped bitrate) × play time, using the bitrate ABR would have picked
     without the cap. The top representation that fits the throughput is a good-enough approximation.

## Exit criterion

DevTools Network shows segment requests switching to the 540p rendition when SR turns on, and back to 1080p when it
turns off. The stats show a non-zero saving.

## Upgrade path

Write a custom ABR rule (pattern in `samples/abr/LowestBitrateRule.js`, registered as shown in
`samples/abr/custom-abr-rules.html`) only if the cap needs per-segment decisions, for example when buffer level
should matter.

## Open questions

- With SR on and very low throughput, ABR may pick something below the cap. That's fine, since the cap is only an
  upper bound.
- How should the switch be shown in the demo? A fast switch makes the effect visible immediately; see
  `samples/abr/fastswitch.html`.
