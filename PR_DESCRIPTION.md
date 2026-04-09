# Feature/Add Dodge module: opt-in video fingerprinting defense framework

## Summary

This PR adds the **Dodge module** (`dash.dodge.js`), an opt-in extension that provides a framework with the building blocks for purely client-side defenses against video identification via traffic analysis. It follows the same plugin architecture as `dash.mss.js` -- auto-detected at `attachView()` time, loaded as a separate script, and wired in via overrides. The module adds 13 new files in `src/dodge/` (~3,000 lines), modifies 10 core files with minimal stubs and hooks, and includes 7 unit test files (~5,000 lines) with a requirements traceability document and 13 functional test files with 10 JSON configuration files for end-to-end browser testing. The design is based on a [paper published at PoPETS 2026](https://www.ethanwitwer.com/assets/pdf/2026-dodge.pdf), with production-ready improvements and a couple of new features that experience has shown may lead to better defenses.

## Motivation

Encrypted DASH traffic leaks segment size patterns, request timing, etc. that network observers can use to identify which video a user is watching. Dodge lets content providers control which segments to fetch, at what byte ranges, in what order, and with what padding, so that traffic patterns no longer uniquely identify content. Dodge is purely client-side; no server or network infrastructure changes are required beyond hosting a JSON configuration file (extended manifest), which is used in place of an ordinary MPD. The name is a play on words: to play videos normally is to "dash", and when defenses are needed to mitigate traffic analysis, we "dodge".

## Operating Modes

| Scripts loaded | Source URL | Result |
|---|---|---|
| `dash.all.min.js` only | Plain MPD | Standard DASH, completely unchanged |
| `dash.all.min.js` + `dash.dodge.min.js` | Plain MPD | Standard DASH, graceful degradation |
| `dash.all.min.js` + `dash.dodge.min.js` | Extended manifest | Dodge defense active |

No API changes are needed. The user passes an extended manifest URL instead of an MPD URL; everything else works through the existing `MediaPlayer.initialize()` interface.

## Extended Manifests

An **extended manifest** is a JSON file that wraps the original MPD and adds per-representation download schedules. `ManifestLoader` detects the JSON format, validates it via the `DefenseRegistry` singleton, and extracts the embedded MPD for normal `DashParser` processing. The defense schedules are stored separately and consulted by the `DashHandler` override during playback.

```json
{
  "start": {
    "mpd": "<MPD xmlns='urn:mpeg:dash:schema:mpd:2011' ...>...</MPD>",
    "base_uri": "https://example.com/segments/"
  },
  "streams": [
    {
      "label": "video_1000k",
      "init": [
        {"range": "0-449"},
        {"range": "44-898"}
      ],
      "data": [
        {"index": 0, "range": "0-43999"},
        {"index": 0, "range": "16000-43999", "buffer": true},
        {"index": 1, "range": "0-43999"},
        {"index": 5, "range": "16000-43999", "padding": true},
        {"index": 2, "buffer": true}
      ]
    }
  ]
}
```

Each stream entry's `label` matches a representation ID from the MPD. Cycles in the `data` array specify a segment `index`, optional `range` for partial downloads, and `buffer`/`padding` flags that control when all pending data is buffered for playback and whether it is discarded as cover traffic, respectively. Padding can be downloaded after playable content (trailing padding) to increase a video's duration, as seen by network observers.

New features in Dodge: The `buffer` field can also be an array of segment indices (e.g., `"buffer": [0, 1]`) for selective buffering. Pending data is held until the cycle with the buffer array completes, then all listed indices are buffered together. Data cycles may also carry a `quality` field (a representation ID string or numeric index) to fetch from a different representation in the same adaptation set, allowing defenses to conceal a segment's true size by substituting a smaller or larger version from an alternate quality level.

## Strict Mode (Fail-Safe)

The `dodge.strictMode` setting prevents accidental undefended playback:

| Level | Behavior |
|---|---|
| `'representation'` (default) | Blocks undefended representations when an extended manifest is active; plain DASH still works. Disables DRM, thumbnail tracks, non-fragmented text, segment retries |
| `'manifest'` | Same safeguards as `'representation'` but refuses to play if the source URL is not an extended manifest; an extended manifest is required for playback to proceed |
| `false` | Always falls back to vanilla dash.js (not recommended for production) |

Disabling strict mode entirely is possible but not recommended. It does not really increase convenience - proper extended manifest design does that - and defenses could easily be undermined, since representations that are present in the MPD but not covered by the extended manifest are downloaded without any defense, among other issues. However, certain secondary features are enabled in strict mode that may be worth testing: if they are defended or turn out not to be an issue, they could be allowed in strict mode in the future.

The `'representation'` default is suitable for many use cases: undefended playback is possible, but when an extended manifest is used, playback does not proceed if an undefended representation is encountered. DRM handshakes, thumbnail tracks, non-fragmented text, and request retries are disabled (they may be compatible with traffic analysis defenses, but this has not been studied - "better safe than sorry" applies here).

The `'manifest'` option is included for use cases where proper defense is critical and playback should not proceed without a defense. However, it could also be considered for more typical uses cases if extended manifests are available for the entire catalog of videos that may be viewed. When `strictMode: 'manifest'` blocks playback, the player fires an error event with code 300 (`DODGE_STRICT_MODE_ERROR_CODE`).

## Integration Approach

- `dash.dodge.min.js` sets `dashjs.DodgeHandler` on the global `dashjs` object at load time
- `MediaPlayer._detectDodge()` auto-detects the module (parallel to `_detectMss()`) and wires it in during `attachView()`
- Six controller/loader overrides are registered via `mediaPlayer.extend(..., true)`: `DashHandler`, `BufferController`, `ScheduleController`, `GapController`, `FetchLoader`, `XHRLoader`
- Three custom events are registered via `Events.extend()`: `PADDING_LOADED`, `INIT_FRAGMENT_PARTIAL`, `MEDIA_FRAGMENT_PARTIAL`
- Separate webpack entry: `'dash.dodge': './src/dodge/index.js'`

## New Files (`src/dodge/`)

- **`index.js`** -- Webpack entry point; registers `DodgeHandler` on the global `dashjs` object
- **`DodgeHandler.js`** -- Main orchestrator: registers overrides, intercepts `FRAGMENT_LOADING_COMPLETED` events, manages partial segment combination and scheduling
- **`DefenseRegistry.js`** -- FactoryMaker singleton that validates extended manifests, stores them, and provides stream info lookups by representation ID and period index
- **`events/DodgeEvents.js`** -- Three module-specific events
- **`errors/DodgeErrors.js`** -- Strict mode error code (300), following the MSS errors pattern
- **`overrides/DodgeDashHandlerOverride.js`** -- Replaces request generation functions with cycle-based logic; handles init, data, padding, and trailing cycles
- **`overrides/DodgeBufferControllerOverride.js`** -- Mock buffer management for the trailing phase and to account for segment duration variance throughout playback
- **`overrides/DodgeScheduleControllerOverride.js`** -- Enforces random walk delays on segment scheduling; prevents timer clearing during trailing
- **`overrides/DodgeGapControllerOverride.js`** -- Suppresses gap jumps during trailing to prevent spurious seeks
- **`overrides/DodgeFetchLoaderOverride.js`** / **`DodgeXHRLoaderOverride.js`** -- Apply HTTP-level request padding before delegating to parent loaders
- **`utils/SegmentsUtils.js`** -- Private copy of template functions (`replaceIDForTemplate`, `replaceTokenForTemplate`, etc.) that were removed in v5.2.0
- **`utils/RequestPadding.js`** -- Appends a padding query parameter to normalize URL wire sizes

## Core Files Modified

All core changes are minimal stubs and hooks, except for a few new statistics functions:

- **`src/streaming/MediaPlayer.js`** -- Added `_detectDodge()` (parallel to `_detectMss()`), deferred GapController singleton creation to after override registration, `dodgeHandler` passed to ManifestLoader config and cleaned up in `reset()`, and added a few playback statistics functions
- **`src/streaming/ManifestLoader.js`** -- Calls `dodgeHandler.tryProcessExtendedManifest()` before parsing, swaps data and base URI on success, returns early on strict mode abort
- **`src/dash/DashHandler.js`** -- Six no-op stub methods added to the instance object (`updateDefendedStreamInfo`, `getIsDefended`, `getIsTrailing`, `getNextExpectedIndex`, `getRemainingInitCycles`, `getCurrentIndex`) so `FactoryMaker.merge()` can replace them
- **`src/streaming/StreamProcessor.js`** -- Passes `playbackController` and `adapter` to `DashHandler` config; calls `updateDefendedStreamInfo(representation)` before init and segment requests
- **`src/streaming/controllers/BufferController.js`** -- `mockBuffer` variable + `setMockBuffer()` method, mock buffer added to reported buffer level; two no-op stubs (`onPaddingLoaded`, `onBufferCycleLoaded`)
- **`src/streaming/controllers/ScheduleController.js`** -- `_shouldClearScheduleTimer()` exposed in instance object for override interception
- **`src/streaming/controllers/GapController.js`** -- `_shouldJumpGap()` exposed in instance object for override interception
- **`src/streaming/controllers/PlaybackController.js`** -- `getTimeSinceStreamEnd()` added with a stall time accumulator approach
- **`src/streaming/SourceBufferSink.js`** -- Buffer measurement trace for precise per-segment buffer contribution tracking
- **`src/core/Settings.js`** -- `dodge` settings block with defaults for scheduling delays, request/URL padding, and strict mode
- **`build/webpack/common/webpack.common.base.cjs`** -- `dash.dodge` entry added to both `prodEntries` and `devEntries`

## Tests

This version of Dodge has gone through the same experiments as in the PoPETS 2026 paper, and:

### Unit Tests (299 tests)

- **7 test files** covering: DefenseRegistry validation, DodgeHandler event routing and strict mode, DashHandler override cycle traversal (including SegmentBase, multi-period videos, and quality overrides), BufferController mock buffer, GapController trailing suppression, ScheduleController delay enforcement, and RequestPadding
- **1 mock file** (`DefenseRegistryMock.js`)
- **`REQUIREMENTS.md`** traceability index mapping requirements to individual test cases with statistics
- **Regression safety**: Existing dash.js tests are completely unaffected -- stubs return no-op values, no control flow changes, no new dependencies

```bash
# Run Dodge unit tests only
npx mocha --timeout 10000 'test/unit/test/dodge/*.js'

# Run all unit tests (Dodge + existing)
npx mocha --timeout 10000 'test/unit/test/**/*.js'
```

### Functional Tests (86 tests)

Browser-based tests using the existing Karma + Mocha + Chai infrastructure. These play real video content from CDNs through the Dodge module in a headless browser and verify end-to-end behavior. Test content (10 extended manifests with real CDN-hosted video) is in `test/functional/content/dodge/`. Stream configuration is in `test/functional/config/test-configurations/streams/dodge.json`.

Primary tests:

- **`play-defended.js`** (12 tests) -- Basic playback with three extended manifests (undefended, constant-size, mimicry). Verifies playing state, defense activation, playback progression, and no critical errors.
- **`defense-verification.js`** (30 tests) -- The core traffic verification tests. Fetches the extended manifest JSON, collects `FRAGMENT_LOADING_STARTED` events during playback, and compares the request stream cycle-by-cycle against the manifest for both video and audio:
  - Init cycles match the extended manifest
  - Segment index, byte range, buffer directive, and padding flag match the extended manifest
  - `full` flag matches precomputed value (last non-padding occurrence of each segment index)
  - URL and request padding are applied: query parameter specified in settings is present
  - Random walk scheduling delay is enforced between consecutive requests
  - Buffer level is positive during defended playback
- **`strict-mode-rejects-mpd.js`** (2 tests) -- Verifies that `strictMode: 'manifest'` blocks playback when a regular MPD (not extended manifest) is loaded.
- **`strict-mode-allows-exmfst.js`** (4 tests) -- Verifies that `strictMode: 'manifest'` allows normal defended playback when an extended manifest is loaded.
- **`graceful-degradation.js`** (4 tests) -- Verifies that Dodge does not interfere with vanilla DASH playback when a regular MPD is used outside strict mode.
- **`trailing.js`** (5 tests) -- Uses a short manifest (3 playable segments + padding) to verify that trailing activates and the mock buffer remains non-negative.

Edge case and fail-safe tests:

- **`representation-strict-mode.js`** (3 tests) -- Extended manifest with only video defended (no audio stream entry). Verifies video defense is active, no audio segment requests are made (blocked by representation-level strict mode), and video segments are fetched normally.
- **`drm-detection.js`** (5 tests) -- Extended manifest embedding an MPD with `<ContentProtection>`. Verifies the manifest is rejected in strict modes `'manifest'` and `'representation'` (no playback), and accepted with a warning when `strictMode: false`.
- **`thumbnail-detection.js`** (5 tests) -- Extended manifest embedding an MPD with a `thumbnail_tile` AdaptationSet. Same reject/warn pattern as DRM detection.
- **`text-track-blocking.js`** (3 tests) -- Extended manifest with an undefended TTML subtitle track. Verifies video and audio play normally while zero text segment requests are made (blocked by strict mode).
- **`quality-override.js`** (3 tests) -- Extended manifest where cycles 1 and 3 of each video representation fetch from an alternate representation via the `quality` field. Verifies the override cycles fetch the alternate representation's byte range and URL.
- **`multiperiod.js`** (4 tests) -- Two-period MPD with period-scoped defended stream entries. Verifies defense activation, period transition occurs, and segments are fetched from both periods.
- **`seek.js`** (6 tests) -- Seeks forward to 60s during defended playback. Verifies playback resumes near the target, defense remains active, and playback progresses.

```bash
# Run Dodge functional tests, Firefox (recommended for local testing)
npx karma start test/functional/config/karma.functional.conf.cjs \
  --configfile=local --streamsfile=dodge --single-run --browsers=FirefoxHeadless

# Run Dodge functional tests, Chrome
# Note: requires Google Chrome (not Chromium) for H.264/AAC codec support.
# Headless Chromium on most Linux distros is built without proprietary codecs,
# causing MEDIA_ERR_DECODE on BBB test content.
npx karma start test/functional/config/karma.functional.conf.cjs \
  --configfile=local --streamsfile=dodge --single-run --browsers=ChromeHeadless
```

## Build and Usage

```bash
npm run build
# Outputs:
#   dist/modern/umd/dash.all.min.js     -- base player
#   dist/modern/umd/dash.dodge.min.js   -- Dodge module (new)
```

```html
<script src="dash.all.min.js"></script>
<script src="dash.dodge.min.js"></script>
<script>
  var player = dashjs.MediaPlayer().create();
  player.initialize(document.querySelector("#videoPlayer"), "content.exmfst.json", true);
</script>
```

The Dodge module is auto-detected at `attachView()` time. Pass an `.exmfst.json` URL as the source; no other API changes are needed.
