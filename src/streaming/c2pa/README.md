# C2PA provenance validation

Native, opt-in per-segment C2PA provenance scanning and validation for live CMAF/DASH
streams, built directly into dash.js (not an external plugin). Validates C2PA §19.3
(Manifest Box) and §19.4 (VSI) live signing methods per segment as they're fetched, and
surfaces the result through the public dash.js event system.

Off by default: while disabled, no init or media segment is parsed, no C2PA event is
emitted, and the validation engine (`@svta/cml-c2pa`) is never imported.

## Architecture

- **`C2paController`** — owns the scanning lifecycle. Created once during
  `MediaPlayer.initialize()`. Lazily creates the scanner/coordinator/detector and
  registers the response interceptor only while `streaming.c2pa.enabled` is true; reacts
  to `SETTING_UPDATED_C2PA_ENABLED` so the operator can toggle at runtime without
  reloading the source. See ADR-0002 for the zero-cost-when-disabled design.
- **`C2paScanner`** — a thin adapter over dash.js's public response interceptor API
  (`customParametersModel.addResponseInterceptor`). Observes every fetched init/media
  segment, copies its bytes (mandatory: dash.js transfers the original `ArrayBuffer` to
  MSE once the response handler resolves, detaching it), normalizes it into a
  `SegmentInput`, and forwards it to the coordinator without ever blocking or altering
  the fetch-to-MSE path.
- **`C2paValidationCoordinator`** — owns per-track state and orchestrates validation.
  Classifies each track from its init segment (§19.4 when session keys are present,
  §19.3 when only a manifest is present, non-C2PA otherwise), then validates each media
  segment through `@svta/cml-c2pa` (dynamically imported, code-split out of both default
  bundles) and emits a result record per segment.
- **`C2paDetector`** (`detection/BoxParsingDetector.js`) — in `auto` mode, classifies each
  *media* segment independently by inspecting its ISO-BMFF boxes, so a track can be
  correctly identified even if its init segment was missed or ambiguous. This is a
  swappable strategy: once DASH-IF/MPEG define how to signal C2PA in the MPD itself, an
  `MpdSignalingDetector` can implement the same `C2paDetector` contract and replace
  box-parsing without touching the validation path (see `detection/C2paDetector.js`).

## Settings

```js
player.updateSettings({
    streaming: {
        c2pa: {
            enabled: true,       // off by default
            method: 'auto',      // 'auto' | '19.3' | '19.4'
            mediaTypes: ['video', 'audio']  // optional, defaults to video+audio
        }
    }
});
```

- `method: 'auto'` uses the detector per segment. A forced method (`'19.3'` or `'19.4'`)
  skips detection entirely; a segment that doesn't match the forced structure is reported
  `invalid` with a `c2pa.forcedMethodMismatch` code rather than silently ignored.
- `enabled` and `method` both take effect at runtime via `updateSettings` — no need to
  reattach the source.

## Events

- **`C2PA_INIT_PROCESSED`** — once per track, after its init segment is classified.
  Payload: `{ trackKey, method, manifestId, issuer, sessionKeyCount, isValid, errorCodes }`.
- **`C2PA_SEGMENT_VALIDATED`** — once per media segment (plus synthetic records for any
  gap detected in the signed sequence). Payload: `{ segmentNumber, mediaType, method,
  status, keyId, hash, manifestId, issuer, previousManifestId, errorCodes, timestamp }`.
  `status` is one of `valid`, `invalid`, `replayed`, `reordered`, `missing`, `unverified`.
- **`C2PA_ERROR`** — emitted alongside an `unverified` segment record when the engine
  throws unexpectedly or Web Crypto is unavailable. Payload: `{ trackKey, segmentNumber,
  mediaType, errorCodes, message, timestamp }`.

See `samples/c2pa/index.html` for a working example that renders a per-segment ✅/❌ grid.

## Continuity semantics

Each representation (not each media type) has its own independent signed chain
(`previousManifestId` for §19.3, a monotonic sequence number for §19.4), tracked under a
stable per-representation `trackKey` derived from the segment URL. Two things follow
from that:

- **Joining a live stream mid-broadcast**: a track's first observed segment has no known
  predecessor, so its continuity baseline starts unknown (`null`) rather than being
  seeded from the init segment's own manifest — the chain only self-anchors from that
  first segment onward.
- **ABR switches**: when the active representation of a media type changes, the
  abandoned representation's continuity state is reset. Resuming it later starts a fresh
  baseline instead of reporting a false gap for segments that were never fetched because
  a sibling representation was playing instead.

## Gotchas

- **Browser only**: `@svta/cml-c2pa` needs a real Web Crypto implementation and correctly
  validates certificate/signature data only in a browser context; it should always be
  tested in an actual browser, not assumed correct from a Node script.
- **A track's init is async**: classifying it (dynamic import + crypto work) takes real
  time, and the scanner never blocks later segments waiting for it. The coordinator
  awaits a track's own init promise before validating that track's first media segment,
  so this doesn't race — but any change to `handleSegment`'s dispatch order should keep
  that invariant.
