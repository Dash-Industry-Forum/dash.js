## Why

Test results from the standalone functional test runner are ephemeral -- stored as flat files in `results/` and lost context across server restarts. There is no way to browse historical test runs, compare results between devices or time periods, see which devices are currently connected, or remotely trigger a test run on a specific device from a central UI. As the standalone runner is designed to support Smart TVs and other non-WebDriver devices, a persistent result store and management dashboard are essential to make it useful for ongoing CI-like workflows.

## What Changes

- Add a **SQLite database** (`better-sqlite3`) for persistent storage of test runs, individual test results, and device metadata
- Add a **database module** (`db.js`) that handles schema creation, migrations, and all query operations
- Extend the existing **Express server** (`server.js`) to initialize the database on startup, persist results to SQLite alongside existing file output, and track device registrations/heartbeats
- Add **dashboard API routes** for querying runs (with pagination, filtering by device/date/status), run details, device listing, run comparison, and test dispatch
- Add **dashboard pages** (vanilla JS + Bootstrap 5, matching the `--rp-*` design system) for:
  - Overview: recent runs, connected devices, quick dispatch
  - Runs list: filterable/sortable table of all historical test runs
  - Run detail: full 2-level grouped results (reuses testcase > testvector pattern from HTML reports)
  - Devices: device registry with online/offline status and last-seen timestamps
- Add **device registration and heartbeat** via WebSocket -- devices self-register with name/user-agent metadata, heartbeat keeps track of online/offline status
- Add **remote test dispatch** -- from the dashboard, select a connected device, pick a test configuration, and push a test run. The device receives the config via WebSocket and auto-starts.
- Optionally **import existing file-based results** into the database on first startup

## Capabilities

### New Capabilities

- `result-persistence`: SQLite-backed persistent storage for test runs and individual test results, with migration support and query layer
- `device-management`: Device self-registration via WebSocket, heartbeat-based online/offline tracking, device metadata storage
- `test-dashboard`: Server-rendered dashboard pages for browsing historical runs, viewing run details with 2-level grouping, filtering/sorting, and comparing runs
- `test-dispatch`: Remote triggering of test runs on connected devices from the dashboard UI, with configuration selection and status tracking

### Modified Capabilities

_None -- no existing specs are being modified._

## Impact

- **Dependencies**: Adds `better-sqlite3` as a new devDependency (native module, requires Node.js build toolchain)
- **Server (`server.js`)**: Extended with DB initialization, new API routes, new WebSocket message types (`register-device`, `heartbeat`, `dispatch`), and modified `saveResults()` to write to both files and SQLite
- **New files**: `db.js` (database module), `dashboard/` pages directory with HTML/JS files, updated `styles.css` with dashboard component styles
- **Existing behavior**: Fully backward-compatible. Existing file-based result storage (JSON/XML/HTML) continues to work unchanged. Existing landing/runner/remote pages are not modified.
- **Disk**: SQLite database file at `test/functional/standalone/data/dashjs-tests.db` (gitignored)
