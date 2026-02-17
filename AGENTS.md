# AGENTS.md

Guidance for agentic coding assistants working in this repo. Keep changes consistent
with existing project conventions and tooling.

## Project overview

- **Repository:** dash.js — MPEG-DASH reference player by the Dash Industry Forum
- **Language:** JavaScript (ES modules); TypeScript for type declarations only (`index.d.ts`)
- **Node version:** >= 20 (see `package.json` engines)
- **Package type:** `"type": "module"` — the project uses native ES modules
- **Build tool:** Webpack (separate modern and legacy bundles)
- **Source layout:** `src/core/`, `src/dash/`, `src/streaming/`, `src/mss/`, `src/offline/`

## Build, lint, test

Run all commands from the repo root.

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

`npm run build` produces both modern and legacy bundles. The `prebuild` step
(run by `build-modern` / `build-legacy`) does: `rimraf dist && tsc && npm test && npm lint`.

Other build scripts:
- `npm run build-modern` / `npm run build-legacy` — prebuild + single bundle
- `npm run dev` — tsc + webpack watch (modern, development mode)
- `npm run start` — webpack dev server

### Lint

```bash
npm run lint
```

Lints `src/**/*.js`, `test/unit/mocks/*.js`, and `test/unit/test/**/*.js`.
Config is in `eslint.config.mjs` (flat config format).

### Unit tests

```bash
npm test
```

Tests use **Karma + Mocha + Chai** and run in ChromeHeadless and FirefoxHeadless.
Test files live under `test/unit/test/` mirroring the `src/` structure.
Mock files live under `test/unit/mocks/`.

#### Run a single unit test

Pass `--grep` to filter by Mocha test/suite name:

```bash
npm test -- --grep "BufferController"
npm test -- --grep "should return the correct value"
```

The Karma config (`test/unit/config/karma.unit.conf.cjs`) forwards `config.grep`
to Mocha's `client.mocha.grep`.

### Functional tests

```bash
npm run test-functional
npm run test-functional -- --configfile=local --streamsfile=smoke
```

## Code style & conventions

### Formatting (enforced by ESLint + .editorconfig)

- **4-space indentation** (`indent: ['error', 4, { SwitchCase: 1 }]`)
- **Single quotes** for strings; template literals allowed
- **Curly braces required** for all blocks (`curly: ['error', 'all']`)
- **Keyword spacing** before and after (`keyword-spacing`)
- **No multi-spaces** (`no-multi-spaces`)
- **Space around operators** (`space-infix-ops`)
- JS files: trim trailing whitespace, insert final newline (`.editorconfig`)

### Imports and modules

- ES modules only: `import Foo from './Foo.js'` — always use explicit `.js` extensions
- Group imports at the top: core/library imports first, then relative imports
- No `require()` in source (only in build/test config `.cjs` files)

### Naming conventions

- Functions and variables: `camelCase`
- Constructors / module factory functions: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Factory names: set `MyModule.__dashjs_factory_name = 'MyModule'` (must match export name)

### Factory pattern (FactoryMaker)

Most modules follow the FactoryMaker pattern (`src/core/FactoryMaker.js`):

```js
function MyModule(config) {
    const context = this.context;
    let instance;
    // ... private functions ...
    instance = { publicMethod };
    return instance;
}
MyModule.__dashjs_factory_name = 'MyModule';
export default FactoryMaker.getSingletonFactory(MyModule);   // singleton
// or: FactoryMaker.getClassFactory(MyModule);                // class (multiple instances)
```

When adding new modules, follow the pattern in nearby files. The `__dashjs_factory_name`
string must match the exported symbol name exactly.

### Error handling and logging

- Use `Debug` logger, never `console.*`:
  ```js
  const logger = Debug(context).getInstance().getLogger(instance);
  logger.warn('Something went wrong');  // .fatal, .error, .warn, .info, .debug
  ```
- Use `ErrorHandler` (`src/streaming/utils/ErrorHandler.js`) to dispatch errors via
  the EventBus when appropriate.
- Catch blocks should log warnings/errors — never swallow exceptions silently.

### Types

- Runtime code is JavaScript. TypeScript is used **only** for `index.d.ts` declarations.
- `tsconfig.json` enables `strict` + `noImplicitAny`. Keep type declarations aligned
  with runtime behavior when modifying `index.d.ts`.

### Tests

- Unit test files: `test/unit/test/<module-path>/<dotted.name>.js`
  (e.g. `streaming.controllers.BufferController.js`)
- Tests import source directly from `src/` and mocks from `test/unit/mocks/`
- Use `chai.expect` for assertions; `sinon` for stubs/spies
- Functional tests: `test/functional/test/` with JSON configs in
  `test/functional/config/test-configurations/`

## Licensing and headers

New source files **must** include the BSD-3 license header. Copy from any existing
`src/` file — it starts with `The copyright in this software is being made available
under the BSD License...` and ends with `POSSIBILITY OF SUCH DAMAGE.`

Replace `YOUR_COMPANY_NAME_HERE` with the appropriate name per `CONTRIBUTING.md`.

## Repo rules and agent guidelines

- No Cursor rules (`.cursor/rules/` or `.cursorrules`) found.
- No Copilot instructions (`.github/copilot-instructions.md`) found.

### Practical workflow

1. **Before committing:** run `npm run build` — it runs tests + lint as part of prebuild.
2. **When changing runtime code:** add or update unit tests under `test/unit/test/`.
3. **Quick validation:** run `npm test` then `npm run lint` separately for faster feedback.
4. **Match existing style:** 4-space indent, single quotes, explicit `.js` imports,
   FactoryMaker pattern, Debug logger.
