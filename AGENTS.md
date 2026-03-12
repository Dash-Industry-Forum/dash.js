# AGENTS.md

## Project Overview

dash.js is the DASH Industry Forum reference client for MPEG-DASH playback in browsers.
Pure JavaScript (ES2020), ESM modules (`"type": "module"`), no TypeScript in source code
(TypeScript is only used to validate `index.d.ts`). Node >= 20 required.

## Build Commands

```bash
npm run build              # Full build: clean, typecheck, test, lint, then webpack (modern + legacy)
npm run build-modern       # Clean + typecheck + test + lint + webpack modern only
npm run build-legacy       # Clean + typecheck + test + lint + webpack 
npm run dev                # Typecheck + webpack modern dev (watch mode)
npm start                  # webpack-dev-server on port 3000 (opens samples/index.html)
npm run lint               # ESLint on src/**/*.js and test/unit/{mocks,test}/**/*.js
npm run doc                # Generate JSDoc documentation
```

## Testing

**Unit tests:** Web Test Runner (runner) + Mocha (describe/it) + Chai (expect/assert) + Sinon (spy/stub/mock)
**Functional tests:** Web Test Runner (runner) + Mocha + Chai + Playwright (local) / WebDriver (LambdaTest CI)

```bash
# Run all unit tests (Chromium + Firefox via Playwright)
npm test

# Run a single test or subset by grep pattern (matches describe/it names)
GREP="EventBus" npm test
GREP="getOptimalRepresentationForBitrate" npm test

# Run a specific test file
npx web-test-runner --config test/unit/config/web-test-runner.config.mjs --files 'test/unit/test/core/core.EventBus.js'

# Run functional tests (local: Playwright auto-launches Chromium + Firefox + WebKit)
npm run test-functional

# Run functional tests with specific config and streams
CONFIGFILE=local STREAMSFILE=smoke npm run test-functional
CONFIGFILE=lambdatest STREAMSFILE=single npx web-test-runner --config test/functional/config/web-test-runner.functional.mjs

# Run functional tests with visible browser windows (set "headless": false in local.json)
# Edit test/functional/config/test-configurations/local.json to toggle headless mode

# Run standalone functional test runner (works on any device including Smart TVs)
npm run test-standalone                          # Default: smoke streams, port 3001
npm run test-standalone -- --streams=single      # Use a specific stream config
npm run test-standalone -- --port=8080           # Custom port
npm run test-standalone -- --skip-bundle         # Skip rebundling (use previously bundled files)
```

Each unit test file runs in its own isolated browser page (unlike Karma which bundled
all files into one page). Use the `GREP` environment variable to filter by test name.

**Note:** `GREP` passes a pattern to Mocha's grep, which filters `it` blocks across
**all** 118 test files. Non-matching tests are reported as failures (exit code 1).
For CI or targeted runs, prefer `--files` to load only the specific test file(s).

Unit test files live in `test/unit/test/` and mirror the `src/` directory structure.
Test file naming convention uses dot-separated module paths:
- `core.EventBus.js` tests `src/core/EventBus.js`
- `streaming.controllers.AbrController.js` tests `src/streaming/controllers/AbrController.js`
- `dash.models.DashManifestModel.js` tests `src/dash/models/DashManifestModel.js`

## Code Style

### Formatting (enforced by ESLint flat config in `eslint.config.mjs`)

- **Indentation:** 4 spaces (including switch case bodies)
- **Quotes:** Single quotes, template literals allowed
- **Semicolons:** Required
- **Curly braces:** Always required, even for single-line blocks (`curly: 'all'`)
- **Line endings:** LF (see `.editorconfig`)
- **Trailing whitespace:** Trimmed in `.js` files
- **Final newline:** Required in `.js` and `.md` files
- **Keyword spacing:** Space before and after keywords (`if`, `else`, `for`, etc.)
- **Infix operators:** Spaces around operators (`a + b`, not `a+b`)
- **No multi-spaces:** Only single spaces between tokens
- **No Prettier:** Formatting is handled by ESLint rules only

### Imports

- ES module `import`/`export` syntax exclusively
- Always include `.js` extension in import paths: `import Foo from './Foo.js'`
- Relative paths for internal imports
- Group order: external dependencies first, then internal modules
- Default exports are the norm; named exports are rare

### Architecture Pattern — FactoryMaker

Most modules use the **factory function pattern**, not ES classes:

```js
function MyController() {
    const context = this.context;
    let instance, logger, someState;

    function setup() { /* init logic, called at bottom of factory */ }
    function _privateMethod() { /* underscore prefix */ }
    function publicMethod() { /* no prefix */ }
    function reset() { /* cleanup on teardown */ }

    instance = { publicMethod, reset };
    setup();
    return instance;
}
MyController.__dashjs_factory_name = 'MyController';
export default FactoryMaker.getSingletonFactory(MyController);
```

Key conventions:
- **Singletons** (`getSingletonFactory`): one instance per context (controllers, models)
- **Class factories** (`getClassFactory`): new instance each call (value objects, processors)
- **`__dashjs_factory_name`**: required static property for registration, matches the function name
- **`setup()`**: called at the bottom of the factory function for initialization
- **`reset()`**: cleanup method, should restore initial state
- **`setConfig(config)`**: dependency injection method, receives an object with dependencies
- **`instance` object**: the public API; only methods listed here are public

### Value Objects

Simple data classes in `src/*/vo/` use ES class syntax with constructor assignments
and `export default ClassName`. See `src/streaming/vo/DashJSError.js` for an example.

### Naming Conventions

- **Files:** PascalCase for classes/factories (`AbrController.js`, `MediaPlayer.js`)
- **Private methods:** `_underscore` prefix (`_onQualityChangeRendered`, `_commonOn`)
- **Public methods:** camelCase, no prefix
- **Constants:** UPPER_SNAKE_CASE for module-level constants; constant objects use PascalCase keys
- **Events:** Class-based hierarchy extending `EventsBase`, string constant properties
- **Loggers:** `logger = debug.getLogger(instance)` — use `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`

### Error Handling

- Errors are dispatched via `EventBus` as error events, not thrown
- Use `DashJSError` value objects (code + message + data)
- Error codes are defined as constants in `src/core/errors/Errors.js` and `src/streaming/vo/metrics/PlayList.js`
- Critical errors trigger `Events.ERROR`; check `error.code` to distinguish types

### License Header

Every source file must include the BSD-3-Clause license header (approximately 30 lines)
at the top of the file. See any existing source file for the exact text.

## Test Conventions

Tests follow this general pattern: import module + mocks, create `const context = {}`,
instantiate singletons with `Module(context).getInstance()`, inject mocks via `setConfig()`,
call `initialize()` in `beforeEach`, and call `reset()` in `afterEach`. Tests use nested
`describe` blocks (one per method) and `it('Should ...', function () { ... })` blocks.

- **Mocks:** Hand-written in `test/unit/mocks/`, each mirrors the real class API
- **Helpers:** `test/unit/helpers/` — `ObjectsHelper`, `VOHelper`, `SpecHelper` create dummy objects
- **Assertions:** Chai `expect` style preferred; `assert` also used
- **Spying/stubbing:** Sinon (`sinon.spy()`, `sinon.stub()`)
- **Context:** Each test suite creates `const context = {}` and instantiates singletons against it
- **Cleanup:** Always call `reset()` on instances, settings, and eventBus in `afterEach`
- **Test data:** Fixtures in `test/unit/data/` (XML manifests, subtitle files, etc.)

### Test Isolation (important for new tests)

Each unit test file runs in its **own isolated browser page**. This means:
- **Events.extend():** If production code uses `MediaPlayerEvents` properties (like
  `PLAYBACK_SEEKING`, `CAN_PLAY`, `METRIC_ADDED`, etc.), the test file must call
  `Events.extend(MediaPlayerEvents)` at the top level. The `Events` singleton only has
  `CoreEvents` by default; `MediaPlayerEvents` are added at runtime by `MediaPlayer.js`.
- **chai-spies:** If using `chai.spy()`, each test file must import and register
  `chai-spies` itself: `import spies from 'chai-spies'; chai.use(spies);`
- **No cross-file shared state:** Unlike the previous Karma setup, singletons and globals
  are not shared across test files.

## Project Structure

```
src/
├── core/          # EventBus, FactoryMaker, Settings, Debug, Utils, errors
├── dash/          # DASH-specific: parser, adapter, manifest model, segment handling
├── mss/           # Microsoft Smooth Streaming support
├── offline/       # Offline playback / download support
└── streaming/     # Core player: controllers, models, rules, protection (DRM), text, net
test/
├── unit/          # Unit tests (Web Test Runner + Mocha + Chai)
│   ├── config/    # web-test-runner.config.mjs
│   ├── data/      # Test fixtures (MPDs, subtitles)
│   ├── helpers/   # ObjectsHelper, VOHelper, etc.
│   ├── mocks/     # Hand-written mock classes
│   └── test/      # Test files (mirrors src/ structure)
└── functional/    # Functional/integration tests
    ├── config/    # web-test-runner.functional.mjs + test-configurations/
    ├── adapter/   # DashJsAdapter.js, GoogleAdManagerAdapter.js
    ├── src/       # Constants.js, Utils.js
    ├── test/      # Test files organized by category (shared by WTR + standalone)
    ├── content/   # Local MPD fixtures
    ├── lib/       # External libraries (ima3_dai.js)
    └── standalone/# Standalone test runner (browser-only, no Selenium/WebDriver needed)
        ├── server.js    # Express server + WebSocket + Rollup bundler + dashboard APIs
        ├── bundler.js   # Rollup bundling logic for test files
        ├── db.js        # SQLite database module (better-sqlite3) for persistent results
        ├── pages/       # Landing page, runner page, remote control page
        │   └── dashboard/ # Test dashboard (overview, runs, run detail, devices)
        ├── data/        # SQLite database file (gitignored, auto-created)
        └── results/     # Test result output (JSON + JUnit XML + HTML)
build/webpack/     # Webpack configs (modern/legacy, dev/prod, UMD/ESM)
```

## CI and Contributing

- PRs target the `development` branch (not `main`/`master`)
- CI runs `npm run build` which executes: clean -> typecheck -> unit tests -> lint -> webpack
- A pre-commit git hook runs `npm run lint` automatically
- Functional tests run on LambdaTest in CI for cross-browser validation
- Always run `npm run build` before committing to catch test failures and lint errors
- Include BSD-3-Clause header in new files; add/update unit tests for changes
