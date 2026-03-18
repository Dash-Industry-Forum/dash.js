# Description

The functional test suite implements integration tests that validate player functionality such as
play, pause, seek, DRM, text tracks, and more against real media streams. Tests run in any browser
via the standalone test runner — a self-contained Express server with WebSocket communication,
Rollup bundling, and a dashboard for device management and result tracking.

# Structure

The source files are placed in multiple folders:

* `adapter`: Adapter classes that implement additional logic to run a test. For instance the `DashJsAdapter.js` serves
  as a wrapper around dash.js functionality.
* `config/test-configurations/streams`: Stream preset JSON files that define which testvectors to run.
* `content`: Contains static MPDs that serve as input for testcases.
* `lib`: External libraries (e.g. `ima3_dai.js` for Google Ad Manager tests).
* `src`: Helper classes (`Constants.js`, `Utils.js`) that define constant values and filter testvectors.
* `test`: The implementation of the testcases, organized by category.
* `standalone`: The standalone test runner server, dashboard, bundler, and Smart TV sample apps.

# Test Execution

## Standalone Test Runner

The standalone runner hosts a landing page for configuring and running tests directly in any browser,
including Smart TVs, game consoles, and mobile devices.

```bash
# Start the standalone test runner
npm run test-standalone

# With specific stream configuration
npm run test-standalone -- --streams=single

# With HTTPS (auto-generates self-signed certificate)
npm run test-standalone-https

# With a custom trusted certificate
npm run test-standalone-https -- --cert=./cert.pem --key=./key.pem

# Skip rebundling (use previously bundled test files)
npm run test-standalone -- --skip-bundle

# Custom port and host
npm run test-standalone -- --port=8080 --host=0.0.0.0
```

Open the printed URL in any browser to configure and run tests. Results are stored as
JSON, JUnit XML, and HTML in `standalone/results/`, and in the SQLite dashboard database
at `standalone/data/dashjs-tests.db`.

## Dashboard

The standalone runner includes a test dashboard at `/dashboard/` for:

* Browsing historical test runs with filtering and pagination
* Viewing run details with 2-level collapsible result grouping
* Managing registered devices (Smart TVs, phones, desktops)
* Dispatching tests to connected devices
* Comparing two test runs side-by-side

## Smart TV Apps

Sample apps for Samsung Tizen and LG webOS are provided in `standalone/apps/`.
These apps load the Device Agent page and register the TV as a test device that
can receive dispatched tests from the dashboard. See the README in each app
directory for build and deployment instructions.
