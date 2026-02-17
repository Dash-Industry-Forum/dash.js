# AGENTS.md - dash.js

Reference DASH player implementation by Dash Industry Forum. JavaScript codebase (no TypeScript source), ES modules, custom factory/DI pattern.

## Build / Lint / Test Commands

```bash
# Install dependencies (requires Node >= 20)
npm install

# Full build (runs: clean, tsc type-check, tests, lint, then webpack)
npm run build

# Development server with hot reload
npm run dev        # build + watch
npm start          # webpack dev server

# Lint
npm run lint       # ESLint on src/**/*.js and test files

# Run all unit tests (Karma + Mocha + Chai, ChromeHeadless + FirefoxHeadless)
npm test

# Run a single test file by grep pattern (matches describe/it text)
npx karma start test/unit/config/karma.unit.conf.cjs --grep="BufferController"

# Run functional tests
npm run test-functional

# Type-check the index.d.ts declarations only
npx tsc

# Generate documentation
npm run doc
```

### Test structure

- Unit tests: `test/unit/test/{core,dash,streaming,mss}/`
- Test file naming: `{module}.{submodule}.{ClassName}.js` (e.g., `streaming.controllers.BufferController.js`)
- Mocks: `test/unit/mocks/` (one file per mocked component, constructor functions with `this` properties)
- Framework: Mocha + Chai (`expect` style) + Sinon for stubs/spies
- Tests run in Karma with ChromeHeadless and FirefoxHeadless
- Coverage output: `test/unit/results/coverage/`

## Code Style

### Formatting (enforced by ESLint, no Prettier)

- **Indentation**: 4 spaces (SwitchCase indented 1 level)
- **Quotes**: Single quotes (template literals allowed)
- **Curly braces**: Always required (`curly: 'all'`)
- **Keyword spacing**: Space before and after keywords
- **Operator spacing**: Spaces around infix operators
- **No multi-spaces**
- **Line endings**: LF
- **Charset**: UTF-8
- **Final newline**: Required in `.js` files
- **Trailing whitespace**: Trimmed in `.js` files

### Imports

- ES module imports (`import ... from '...'`)
- **Always include `.js` file extension** in import paths
- Relative paths for internal modules
- Package names for external dependencies (e.g., `import codemIsoboxer from 'codem-isoboxer'`)
- Order: external packages first, then internal modules, then mocks (in tests)

### Module / Factory Pattern

Most source modules use the dash.js **factory pattern**, not ES6 classes:

```js
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

function MyController(config) {
    config = config || {};
    const context = this.context;

    let instance, logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function publicMethod() { /* ... */ }
    function _privateMethod() { /* ... */ }  // underscore prefix

    instance = {
        publicMethod,
    };

    setup();
    return instance;
}

MyController.__dashjs_factory_name = 'MyController';
export default FactoryMaker.getClassFactory(MyController);
// or: FactoryMaker.getSingletonFactory(MyController) for singletons
```

**Usage:**
```js
// Class factory - multiple instances
const ctrl = MyController(context).create(config);
// Singleton factory - single instance per context
const settings = Settings(context).getInstance();
```

### Value Objects (VOs)

VOs use ES6 classes with simple constructors initializing all properties to null/NaN:

```js
class BitrateInfo {
    constructor() {
        this.mediaType = null;
        this.bitrate = null;
        this.qualityIndex = NaN;
    }
}
export default BitrateInfo;
```

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | PascalCase | `BufferController.js`, `MediaPlayer.js` |
| Functions | camelCase | `getBufferLength()` |
| Private functions | `_` prefix | `_onInitFragmentLoaded()` |
| Constants | UPPER_SNAKE_CASE | `BUFFER_END_THRESHOLD` |
| Factory name | `__dashjs_factory_name` | `'BufferController'` |
| Test files | dot-separated path | `streaming.controllers.BufferController.js` |
| Mock files | PascalCase + Mock | `AbrControllerMock.js` |

### Error Handling

- Error codes: numeric constants in `src/core/errors/Errors.js`
- Wrap errors in `DashJSError(code, message, data)` VO
- Dispatch via EventBus or pass to ErrorHandler utility
- Use try/catch with `logger.error(e)` as fallback in rules/handlers

### Logging

```js
// Obtain logger via Debug singleton
logger = Debug(context).getInstance().getLogger(instance);
logger.debug('message');
logger.info('message');
logger.warn('message');
logger.error('message');
logger.fatal('message');
```

### Event System

Custom EventBus (not DOM events):

```js
const eventBus = EventBus(context).getInstance();
eventBus.on(Events.BUFFER_CLEARED, _onBufferCleared, instance);
eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
eventBus.trigger(Events.SOME_EVENT, { data });
```

- Internal events: `src/core/events/CoreEvents.js`
- Public events: `src/streaming/MediaPlayerEvents.js`

### License Header

Every source file must include the BSD-3-Clause license header at the top (approximately 30 lines). Copy from any existing source file.

## Architecture Overview

```
MediaPlayer (public API)
  └─ StreamController
       └─ Stream
            └─ StreamProcessor (per media type: video, audio, text)
                 ├─ RepresentationController
                 ├─ ScheduleController
                 └─ BufferController
PlaybackController (coordinates playback across components)
```

- **Context object**: Scopes singleton instances, enabling multiple independent MediaPlayer instances per page.
- **FactoryMaker**: Core DI system providing `getClassFactory` (multi-instance) and `getSingletonFactory` (singleton per context).

## CI / Pre-commit

- **Pre-commit hook**: Automatically runs `npm run lint` (installed via `npm install` / `prepare` script)
- **GitHub Actions**: PRs to `development` branch run `npm install && npm run build` (which includes tests + lint)
- **Branching**: Git flow with `development` as integration branch; PRs target `development`

## Writing Tests

```js
import ModuleUnderTest from '../../../../src/streaming/controllers/MyController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';
import SomeMock from '../../mocks/SomeMock.js';

const context = {};

describe('MyController', function () {
    let instance;

    beforeEach(function () {
        const settings = Settings(context).getInstance();
        instance = ModuleUnderTest(context).create({ /* config with mocks */ });
    });

    afterEach(function () {
        instance.reset();
    });

    it('should do something expected', function () {
        const result = instance.someMethod();
        expect(result).to.be.true;
    });
});
```

- Use `expect` (Chai BDD) assertions
- Create mocks as constructor functions in `test/unit/mocks/`
- Always reset/cleanup in `afterEach`
- Add/modify unit tests for any new or modified functionality
