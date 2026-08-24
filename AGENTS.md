# AGENTS.md

dash.js — DASH Industry Forum reference client. Pure JS (ES2020), ESM, Node >= 20.

## Gotchas

### Build & Test
- **`npm run build` skips tests/lint.** Use `npm run build-modern` for the full pipeline (clean + tsc + test + lint + webpack).
- **Unit tests run via Web Test Runner** (Mocha + Chai + Sinon, Chromium/Firefox via Playwright). Each test file runs in its own isolated browser page. Filter:
  ```bash
  GREP="EventBus" npm test    # grep filters it blocks across ALL files; non-matching report as failures
  npx web-test-runner --config test/unit/config/web-test-runner.config.mjs --files 'test/unit/test/core/core.EventBus.js'   # preferred for targeted runs
  ```
- **Test isolation:** singletons/globals are NOT shared across test files. If production code uses `MediaPlayerEvents` properties, the test file must call `Events.extend(MediaPlayerEvents)` at top level; `chai-spies` must be imported and registered per file.
- **Functional tests** run via the standalone runner: `npm run test-standalone` (Express + WebSocket + Rollup, works on any browser incl. Smart TVs). Options: `-- --streams=single`, `-- --port=8080`, `-- --skip-bundle`; `npm run test-standalone-https` for HTTPS. Tests load dash.js from `dist/`, not source — build first.
- **Two entry points:** `index.js` (full) and `index_mediaplayerOnly.js` (lightweight). Public API changes may need both updated.
- **Dev builds fewer webpack bundles than prod.** See `build/webpack/common/webpack.common.base.cjs`.

### Architecture
- **Context = DI container.** Each `MediaPlayer` creates its own `context` object. All singletons are scoped to it: `EventBus(context).getInstance()`. This enables multiple independent players on one page.
- **Playback errors are events, API misuse throws.** Runtime/media errors use `DashJSError` + `EventBus` (`Events.ERROR`). Calling `MediaPlayer` methods before `initialize()`/`attachSource()` or with bad arguments throws synchronously. Codes in `src/core/errors/Errors.js`.
- **Protection/DRM is opt-in.** Call `player.setProtectionData()` explicitly.
- **`player.extend()` must be called BEFORE `initialize()`.**

### Code changes
- **PRs target `development`**, not `main`/`master`.
- **BSD-3-Clause header required** in every new source file.
- **v5 API — don't use deprecated v4 methods:**
  - `getBitrateInfoListFor()` → `getRepresentationsByType(type)`
  - `setQualityFor()` → `setRepresentationForTypeByIndex(type, index, forceReplace)`
  - `getQualityFor()` → `getCurrentRepresentationForType(type)`
- **New settings** need both `Settings.js` (value + JSDoc) and `index.d.ts`.
- **New samples** must update `samples/samples.json`.

## Where to look

| What | Where |
|---|---|
| Build scripts | `package.json` → `scripts` |
| Lint rules | `eslint.config.mjs` + `.editorconfig` |
| Architecture pattern | Any `src/` file — look for `FactoryMaker` |
| Test patterns | Any file in `test/unit/test/` |
| Test naming | `test/unit/test/` mirrors `src/` with dot-separated paths: `core.EventBus.js` → `src/core/EventBus.js` |
| Mocks | `test/unit/mocks/` |
| Test fixtures | `test/unit/data/` |
| API surface | `src/streaming/MediaPlayer.js` |
| Public exports | `index.js` + `index_mediaplayerOnly.js` |
| TypeScript defs | `index.d.ts` |
| Webpack entries | `build/webpack/common/webpack.common.base.cjs` |
| Sample registry | `samples/samples.json` |
| CI pipelines | `.github/workflows/` |
