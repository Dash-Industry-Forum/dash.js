# Unit tests

Unit tests run with [Vitest](https://vitest.dev/) in browser mode, started through Vite+ (`vp test`), in Chromium and
Firefox. The configuration is in `vite.config.js` in the repository root, the background is in
[ADR 0001](../../docs/adr/0001-adopt-vite-plus-incrementally.md).

```sh
npx playwright install chromium firefox             # once
npm test                                             # all tests, both browsers
npx vp test --run test/unit/test/core/core.EventBus.js
npx vp test --run --project chromium -t "EventBus"   # filter by test name
npm run test:coverage                                # Chromium, report in test/unit/results/coverage/
```

## Layout

- `test/` mirrors `src/` with dot-separated file names: `core.EventBus.js` tests `src/core/EventBus.js`.
- `mocks/` holds hand-written mocks for collaborators that keep state. `data/` holds fixtures (manifests, segments).
  `helpers/` holds shared test utilities.

## Writing tests

These rules apply to new tests and to every test file an area pull request touches. Older files are converted area by
area (#5210).

### Structure

```js
import { describe, it, beforeEach, afterEach, expect, vi } from 'vite-plus/test';
import BlacklistController from '../../../../src/streaming/controllers/BlacklistController.js';
import EventBus from '../../../../src/core/EventBus.js';
import Settings from '../../../../src/core/Settings.js';

describe('BlacklistController', () => {
    const UPDATE_EVENT = 'blacklistUpdated';
    let context;

    function createUnderTest(overrides = {}) {
        const blacklistController = BlacklistController(context).create({ updateEventName: UPDATE_EVENT, ...overrides });
        blacklistController.initialize();
        return blacklistController;
    }

    beforeEach(() => {
        context = {};
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('add', () => {
        it('dispatches the update event with the added entry', () => {
            const onUpdate = vi.fn();
            EventBus(context).getInstance().on(UPDATE_EVENT, onUpdate);
            const blacklistController = createUnderTest();

            blacklistController.add('https://cdn-a.example.com/');

            expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ entry: 'https://cdn-a.example.com/' }));
        });

        it('removes the entry when the expiry time has passed', () => {
            Settings(context).getInstance().update({ streaming: { blacklistExpiryTime: 10 } });
            const blacklistController = createUnderTest({ enableExpiry: true });

            blacklistController.add('https://cdn-a.example.com/');
            vi.advanceTimersByTime(10000);

            expect(blacklistController.contains('https://cdn-a.example.com/')).toBe(false);
        });
    });
});
```

- `describe('<Module>')`, then `describe('<method or behaviour>')`, then `it('<does X> when <Y>')`. The title says
  what happens, not "should work".
- Build the module under test in a local `createUnderTest(overrides)` function, with a fresh `context` object so no
  singleton leaks from one test into the next.
- No state shared between tests except what `beforeEach` sets up again. Do not use the Mocha `this` context.
- Keep arrange, act and assert visibly apart (blank lines).
- When cases differ only in their data, write a table-driven test instead of copies:

  ```js
  [
      { url: 'http://dash.akamaized.net', host: 'dash.akamaized.net' },
      { url: 'https://dash.akamaized.net', host: 'dash.akamaized.net' }
  ].forEach(({ url, host }) => {
      it(`returns ${host} for ${url}`, () => {
          expect(Utils.getHostFromUrl(url)).toBe(host);
      });
  });
  ```

### Assertions

- Use `expect` from `vite-plus/test` with the Jest-style matchers: `toBe`, `toEqual`, `toThrow`,
  `toHaveBeenCalledWith`, `toHaveBeenCalledOnce`, ...
- Every test asserts behaviour: a return value, a dispatched event, or a call on a collaborator. A test that only runs
  code to raise coverage is not accepted.
- Do not use chai `assert` or `should`; the lint rules reject them.

### Mocks, timers and async code

- Use `vi.fn()` and `vi.spyOn()`. Mocks are restored after each test (`restoreMocks`).
- Keep a hand-written mock in `mocks/` only when the collaborator holds real state (for example `VideoModelMock`).
  Otherwise pass an object with `vi.fn()` members.
- Use `vi.useFakeTimers()` instead of waiting for real time, and `async`/`await` instead of `done` callbacks.
- Unit tests never use real MSE or EME; mock `MediaSource`, `SourceBuffer` and `MediaKeys`.
- Events that `MediaPlayer` adds to `Events` (`Events.extend(MediaPlayerEvents)`) are available in every test file;
  the setup file applies that wiring.

### Skipping

Do not commit `it.only`, `it.skip` or commented-out tests. When a test needs a browser feature, use
`it.skipIf(!feature)`.

## Lint rules

`npm run lint` checks the test files with `@vitest/eslint-plugin` (see `eslint.config.mjs`). Files that still use
`done` callbacks or contain tests without an assertion are listed in `DONE_CALLBACK_FILES` and `NO_EXPECT_FILES`.
Converting a file means removing it from these lists; nothing is added to them.

## Coverage

- Coverage counts every file in `src/`, also the ones no test loads.
- `npm run test:coverage` fails when total coverage drops below the floor in `vite.config.js`
  (`coverage.thresholds`). A pull request that raises coverage also raises the floor.
- On pull requests, CI also requires that at least 80% of the changed executable lines in `src/` are covered.
- No source file is excluded from coverage. If one has to be, list it in `vite.config.js` (`coverage.exclude`) with
  the reason. Use `/* istanbul ignore next */` only with a comment that explains why.
- Tests must not start real network requests: they finish at a random time and make coverage differ between runs.
  Fake XHR (`fakeXhr` from `nise`) or mock the loader.
