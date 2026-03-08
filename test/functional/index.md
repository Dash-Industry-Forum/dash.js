# Description

The functional test suite implements integration tests using Web Test Runner with WebDriver browser launchers.
Functional tests validate player functionality such as play, pause, seek, DRM, text tracks, and more against
real media streams.

# Structure

The source files are placed in multiple folders:

* `adapter`: Adapter classes that implement additional logic to run a test. For instance the `DashJsAdapter.js` serves
  as a wrapper around dash.js functionality.
* `config`: Test runner configuration (`web-test-runner.functional.mjs`) and test configuration files
  (`test-configurations/`) that define browser settings and stream definitions.
* `content`: Contains static MPDs that serve as input for testcases.
* `lib`: External libraries (e.g. `ima3_dai.js` for Google Ad Manager tests).
* `results`: The summary of the test results is placed in this folder.
* `src`: Helper classes (`Constants.js`, `Utils.js`) that define constant values and filter testvectors.
* `test`: The implementation of the testcases, organized by category.

# Configuration

The main configuration for the test execution is defined in `config/web-test-runner.functional.mjs`.
Two environment variables control which configuration is used:

* `CONFIGFILE`: Name of a JSON file in `config/test-configurations/` (default: `local`)
* `STREAMSFILE`: Name of a JSON file in `config/test-configurations/streams/` (default: `smoke`)

Available configurations:
* `local` / `local-windows` / `local-ubuntu`: Local browser testing via WebDriver
* `lambdatest` / `lambdatest-smoke` / `lambdatest-full`: LambdaTest cloud testing

# Test Execution

To execute the functional tests run the following steps:

1. `npm install` to install all dependencies
2. `npm run build` to build the `dist` files of dash.js
3. Start a WebDriver server (e.g. `chromedriver --port=4444` or Selenium Grid)
4. `npm run test-functional` to execute the tests
5. The results will be available after the test execution in `test/functional/results/`

For LambdaTest CI execution:
```bash
CONFIGFILE=lambdatest STREAMSFILE=single npx web-test-runner --config test/functional/config/web-test-runner.functional.mjs
```
