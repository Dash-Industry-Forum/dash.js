# AGENTS.md

Operational context for coding agents. Keep this file limited to repository-specific traps and routes. If it disagrees
with source, configuration, or CI, trust those sources and fix this file in the same change.

dash.js is the DASH Industry Forum browser client for MPEG-DASH. Runtime source is JavaScript (ES modules); TypeScript
is used to validate the public declaration file, `index.d.ts`. Node.js 20 or newer is required.

## Commands that are easy to misuse

| Goal | Command | Actual scope |
|---|---|---|
| Focused unit test | `npm test -- --grep="EventBus"` | Filters Mocha titles, not files. Karma still bundles every unit test and launches headless Chrome and Firefox. |
| Declarations + unit + lint | `npm run ci:verify` | Cleans `dist/`, checks `index.d.ts`, runs unit tests, then lints `src/` and unit tests. It does not build bundles or run compliance/functional tests. |
| Validated production build | `npm run build` | Runs `ci:verify`, then builds all modern and legacy production bundles. |
| Bundle only | `npm run webpack-build-modern` or `npm run webpack-build-legacy` | Skips clean, declarations, tests, and lint; stale files can remain in `dist/`. |
| Deployable distribution | `npm run build:dist` | Cleans, checks declarations, and builds both formats; skips tests and lint. |
| Documentation | `npm run docs:build` | Builds the VitePress site; documentation changes are excluded from PR validation CI. |
| Functional smoke suite | `npm run test-functional` | Requires a modern `dist/` build, external streams, and browsers from the selected local test profile. |

- Installing dependencies runs `prepare`, which rewrites this checkout's pre-commit hooks through `githook.cjs`.
- Functional playback uses `dist/`; its harness still imports a few utilities and event definitions from `src/`. Build
  the modern bundles first.

## Architecture invariants

- Most stateful services, controllers, and models are closure factories registered through `FactoryMaker`; value
  objects, parsers, events, and errors may be ES classes. Match the neighboring module.
- Each normal `MediaPlayer().create()` construction gets its own DI context. A singleton is singleton-per-context, so
  never share one across players accidentally.
- Modules communicate through the context-scoped `EventBus` and explicit `setConfig({...})` wiring. Pair every
  subscription with teardown in `reset()`.
- Runtime/playback failures are `DashJSError` events; invalid API state or arguments throw synchronously.
- `player.extend()` must run before `initialize()`. Its `override` flag is counter-intuitive; verify its semantics in
  `src/core/FactoryMaker.js` before changing extensions.
- The source folders are conceptual subsystems, not strict dependency layers. Start manifest-to-playback translation
  work in `DashAdapter`, but follow existing raw-MPD lifecycle/filter code where appropriate.

## Change impact map

| Change | Keep aligned |
|---|---|
| Player instance API | `src/streaming/MediaPlayer.js`, its unit test, and `index.d.ts` |
| Root exports or bundle composition | `index.js`, `index_mediaplayerOnly.js`, `build/webpack/common/webpack.common.base.cjs`, and package exports when applicable |
| Setting | Default and JSDoc in `src/core/Settings.js`, public type in `index.d.ts`, and unit tests |
| Public event or error | Definition, dispatch site, `index.d.ts`, and unit tests |
| Sample | Implementation plus registry entry in `samples/samples.json` |
| New source file | Copy the repository's BSD-3-Clause header |

`dash.all` includes protection and metrics reporting, but not the separate MSS or offline bundles.
`dash.mediaplayer` still contains the text engine. Production has six webpack entries; package exports and root source
aggregators are different concepts. Check the files above instead of assuming they match.

## Routes

| Need | Source of truth |
|---|---|
| Architecture and data flow | `docs/site/pages/developers/architecture/` |
| Player API | `src/streaming/MediaPlayer.js` |
| Build and task behavior | `package.json` and `.github/workflows/` |
| Lint/format | `eslint.config.mjs` and `.editorconfig` |
| Unit-test patterns | `test/unit/test/`; paths mirror `src/` and filenames encode the path, e.g. `core/core.EventBus.js` |
| Mocks and fixtures | `test/unit/mocks/` and `test/unit/data/` |
| Contribution policy | `CONTRIBUTING.md`; pull requests target `development` |
