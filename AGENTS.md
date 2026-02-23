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

**Frameworks:** Karma (runner) + Mocha (describe/it) + Chai (expect/assert) + Sinon (spy/stub/mock)

```bash
# Run all unit tests (ChromeHeadless + FirefoxHeadless)
npm test

# Run a single test or subset by grep pattern (matches describe/it names)
npx karma start test/unit/config/karma.unit.conf.cjs --grep="EventBus"
npx karma start test/unit/config/karma.unit.conf.cjs --grep="getOptimalRepresentationForBitrate"

# Run functional tests
npm run test-functional
```

There is no per-file test runner. All unit tests are bundled by Karma/webpack and run
together in a headless browser. Use `--grep` to filter by test name.

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

## Project Structure

```
src/
├── core/          # EventBus, FactoryMaker, Settings, Debug, Utils, errors
├── dash/          # DASH-specific: parser, adapter, manifest model, segment handling
├── mss/           # Microsoft Smooth Streaming support
├── offline/       # Offline playback / download support
└── streaming/     # Core player: controllers, models, rules, protection (DRM), text, net
test/
├── unit/          # Unit tests (Karma + Mocha + Chai)
│   ├── config/    # karma.unit.conf.cjs
│   ├── data/      # Test fixtures (MPDs, subtitles)
│   ├── helpers/   # ObjectsHelper, VOHelper, etc.
│   ├── mocks/     # Hand-written mock classes
│   └── test/      # Test files (mirrors src/ structure)
└── functional/    # Functional/integration tests (real playback)
build/webpack/     # Webpack configs (modern/legacy, dev/prod, UMD/ESM)
```

## CI and Contributing

- PRs target the `development` branch (not `main`/`master`)
- CI runs `npm run build` which executes: clean -> typecheck -> unit tests -> lint -> webpack
- A pre-commit git hook runs `npm run lint` automatically
- Functional tests run on LambdaTest/BrowserStack in CI for cross-browser validation
- Always run `npm run build` before committing to catch test failures and lint errors
- Include BSD-3-Clause header in new files; add/update unit tests for changes
