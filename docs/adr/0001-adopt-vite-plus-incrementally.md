# 1. Adopt Vite+ incrementally, starting with the unit tests

- Status: accepted
- Date: 2026-11-23
- Tracking: #5210 (unit test coverage), #5211, #5212, #5213 (later steps)

## Context

The unit tests ran on Karma with Mocha, chai, chai-spies and sinon, bundled by webpack. Karma has been deprecated
since 2023 and only receives security fixes. We are about to rework most unit tests to raise coverage (#5210),
and the test runner decides which mocking and assertion APIs the reworked tests use. Changing the runner later
would mean touching the same tests twice.

The SVTA Common Media Library, which dash.js depends on for CMCD, CMSD, request types and more, uses
[Vite+](https://viteplus.dev/) (`vite-plus`): one toolchain for testing (Vitest), linting (oxlint), formatting
(oxfmt) and building. Using the same toolchain makes it easier to move code and contributors between the two
projects.

dash.js unit tests need real browser APIs (DOM parsing, `VTTCue`, XHR, the video element), so they cannot run in
Node like the Common Media Library tests do. Vitest browser mode runs them in real browsers through Playwright.

Each Vite+ tool is a separate command (`vp test`, `vp lint`, `vp fmt`, `vp build`), so the toolchain can be
adopted one tool at a time while the others stay as they are.

## Decision

Adopt Vite+ incrementally. The first step moves only the unit tests:

- `npm test` runs `vp test` (Vitest browser mode, Playwright, Chromium and Firefox). The configuration is in
  `vite.config.js`.
- Coverage uses the istanbul provider, so the report format stays the same as with the previous Karma setup.
  The totals start from a new baseline, because coverage now counts every file in `src/`, including files no
  test loads. Coverage is measured in Chromium.
- New and reworked tests use Vitest's built-in APIs: `vi.fn`, `vi.spyOn`, `vi.useFakeTimers` and Vitest's
  `expect`. Existing sinon and chai code is converted area by area as part of #5210.
- Developing dash.js requires Node.js 24.11 or newer (`devEngines`), as Vite+ needs it. The published package
  keeps supporting Node.js 20 (`engines`).
- The webpack build, eslint and the functional tests (Karma, including BrowserStack) stay unchanged.

Later steps, each a separate decision and change:

1. Lint and formatting with `vp lint` and `vp fmt` (#5211)
2. Functional tests on Vitest browser mode, which removes Karma completely (#5212)
3. The build with `vp build` / `vp pack`, replacing webpack (#5213)

## Consequences

- Unit tests run in about 20 seconds for both browsers, and single files can be run directly
  (`npx vp test --run <file>`).
- Every test file runs in isolation. Under Karma all tests shared one webpack bundle, which hid dependencies
  between test files: some tests only passed because another test had created a MediaPlayer before. The
  setup file (`test/unit/config/vitest.setup.js`) applies that wiring explicitly.
- Until the conversion in #5210 is finished, the setup file keeps Mocha compatibility shims (`before`/`after`
  and `done` callbacks), and chai 4 stays as a dependency through a resolve alias.
- Until #5212 is done, the project has two test runners: Vitest for unit tests and Karma for functional tests.
- Contributors need Node.js 24.11+ and the Playwright browsers (`npx playwright install chromium firefox`).
