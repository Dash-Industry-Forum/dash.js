# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

dash.js is the DASH Industry Forum reference client for MPEG-DASH playback via MSE/EME. Pure JavaScript (ES2020), ESM, Node >= 20. Also see `AGENTS.md`.

## Commands

```bash
npm run dev              # tsc + webpack dev build in watch mode
npm start                # webpack-dev-server (serves samples, e.g. /samples/dash-if-reference-player/)
npm test                 # unit tests (Karma + Mocha/Chai/Sinon, headless Chrome)
npm run lint             # eslint on src/ and test/unit/
npm run build            # webpack prod bundles only — skips tsc/tests/lint
npm run build:dist       # clean + tsc + full modern & legacy bundles (what CI deploys)
npm run ci:verify        # clean + tsc + test + lint (full verification)
npm run test-functional  # functional tests (needs built dist/, uses test/functional/config/test-configurations/local.json)
```

- **No per-file unit test runner.** Karma bundles all tests via webpack. Filter with grep:
  ```bash
  npx karma start test/unit/config/karma.unit.conf.cjs --grep="EventBus"
  ```
- **Functional tests run against `dist/`, not source.** Build first.

## Architecture

### FactoryMaker + context: the DI system

Every module follows the same closure-factory pattern — no classes:

```js
function GapController() {
    const context = this.context;          // injected DI scope
    let instance, logger;
    // private state as closure vars, public API via `instance = {...}`
    return instance;
}
GapController.__dashjs_factory_name = 'GapController';
export default FactoryMaker.getSingletonFactory(GapController);
```

- Each `MediaPlayer().create()` creates its own `context` object; all "singletons" are scoped to it (`EventBus(context).getInstance()`). This allows multiple independent players per page.
- `FactoryMaker` (src/core/FactoryMaker.js) provides `getSingletonFactory` and `getClassFactory` and powers `player.extend()`, which replaces/overrides any named factory — but only if called **before** `initialize()`.
- Modules communicate via `EventBus` (src/core/EventBus.js) using events defined in `src/core/events/` and `src/streaming/MediaPlayerEvents.js`, plus explicit wiring through `setConfig({...})` calls.

### Layers under src/

- `core/` — DI (FactoryMaker), EventBus, Settings, Debug/Logger, error definitions (`core/errors/Errors.js`).
- `dash/` — MPD world: manifest parsing (`parser/`), `DashAdapter` (the facade the streaming layer uses to query the manifest — streaming code should not touch the parsed MPD directly), `DashHandler` (segment request generation), `DashMetrics`.
- `streaming/` — playback engine and public API:
  - `MediaPlayer.js` — the entire public API surface.
  - `StreamController` → `Stream` (one per DASH period) → `StreamProcessor` (one per media type: video/audio/text) → `ScheduleController`/`BufferController`/`FragmentController` pipeline that decides, loads, and appends segments into `SourceBufferSink`.
  - `controllers/` — PlaybackController, AbrController, GapController, CatchupController (low-latency), MediaSourceController, etc.
  - `rules/abr/` — ABR algorithms (ThroughputRule, BolaRule, L2A, LoL+), aggregated by `ABRRulesCollection`; custom rules are pluggable.
  - `protection/` — EME/DRM, opt-in via `player.setProtectionData()`.
  - `net/` — HTTP loading stack (interceptors, CMCD via `@svta/cml-*` packages).
- `mss/` — Microsoft Smooth Streaming support (separate bundle `dash.mss.min.js`).
- `offline/` — offline download/playback.

### Error model

Playback/runtime errors are **events** (`DashJSError` dispatched via `Events.ERROR`); API misuse (calling MediaPlayer methods before `initialize()`/`attachSource()`, bad arguments) **throws synchronously**.

### Tests

`test/unit/test/` mirrors `src/` with dot-separated filenames: `core.EventBus.js` tests `src/core/EventBus.js`. Mocks in `test/unit/mocks/`, fixtures in `test/unit/data/`.

## Conventions

- **PRs target `development`**, not master.
- **BSD-3-Clause license header required** in every new source file (copy from any existing file).
- **Two entry points:** `index.js` (full) and `index_mediaplayerOnly.js` (lightweight, no DRM/text/offline). Public export changes may need both.
- **New settings** go in `src/core/Settings.js` (value + JSDoc) **and** `index.d.ts`.
- **New samples** must be registered in `samples/samples.json`.
- **v5 API — don't use deprecated v4 methods:** `getBitrateInfoListFor()` → `getRepresentationsByType(type)`, `setQualityFor()` → `setRepresentationForTypeByIndex(type, index, forceReplace)`, `getQualityFor()` → `getCurrentRepresentationForType(type)`.
