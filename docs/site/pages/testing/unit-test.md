---
title: Unit Tests
---

# Unit Tests

dash.js ships with various unit tests for validating the correct behavior of the functions in different classes.

## Structure

The unit tests are located in `test/unit` and divided into different folders:

- `config`: Contains the setup file and helper scripts for the unit tests. dash.js uses
  [Vitest](https://vitest.dev/) in browser mode, started through [Vite+](https://viteplus.dev/) (`vp test`), to execute
  the unit tests directly in the browsers. The configuration lives in `vite.config.js` in the root folder.
- `data`: Contains additional files like manifests, license responses and subtitle files to be used in the unit tests.
- `helpers`: Contains helper classes that contain common functionality used by the testfiles.
- `mocks`: Contains mock implementations of specific classes. When instantiating a class for a test, mock dependencies
  are injected to trigger a certain behavior.
- `results`: Contains the final results of the tests in JUnit format.
- `test`: Contains the concrete implementation of the testcases. The tests are divided into different folders based on
  the location of the source file to be tested.

## Execution

To execute the unit tests simply run `npm run test` in the root folder of dash.js. The tests are then executed in
Chromium and Firefox (headless, through Playwright). The result for each test file is printed in the terminal.

Install the browsers once with `npx playwright install chromium firefox`. Developing dash.js requires Node.js 24.11 or
newer.

To run a single test file or filter tests by name:

```sh
npx vp test --run test/unit/test/core/core.EventBus.js
npx vp test --run --project chromium -t "EventBus"
```

`npm run test:coverage` runs the tests in Chromium with coverage instrumentation and writes the report to
`test/unit/results/coverage/`.


