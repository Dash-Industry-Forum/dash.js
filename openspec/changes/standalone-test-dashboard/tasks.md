## 1. Database Foundation

- [x] 1.1 Add `better-sqlite3` as a devDependency in `package.json`
- [x] 1.2 Create `test/functional/standalone/db.js` module with database initialization, schema creation (tables: `devices`, `test_runs`, `test_results`), and graceful fallback if `better-sqlite3` is unavailable
- [x] 1.3 Add `data/` directory to `.gitignore` (database file should not be committed)
- [x] 1.4 Integrate DB initialization into `server.js` startup (call `db.init()` before starting HTTP server, log warning and continue if it fails)

## 2. Result Persistence

- [x] 2.1 Add `db.insertRun(sessionId, deviceId, configJson)` and `db.completeRun(runId, summary)` methods to `db.js`
- [x] 2.2 Add `db.insertResult(runId, resultData)` method to `db.js` for individual test results
- [x] 2.3 Extend the `result` WebSocket handler in `server.js` to call `db.insertResult()` for each incoming test result (in addition to accumulating in the in-memory session)
- [x] 2.4 Extend the `complete` WebSocket handler in `server.js` to call `db.completeRun()` alongside the existing `saveResults()` file-based storage
- [x] 2.5 Create a run record (`db.insertRun()`) when a test session starts (first result received or explicit start), linking to device if `deviceId` is known

## 3. Device Management

- [x] 3.1 Add `db.upsertDevice(deviceId, name, userAgent)` and `db.setDeviceOffline(deviceId)` methods to `db.js`
- [x] 3.2 Add `db.getDevices()` method that returns all devices with computed online/offline status (based on 90-second heartbeat threshold) and run count
- [x] 3.3 Handle `register-device` WebSocket action in `server.js`: call `db.upsertDevice()`, store `deviceId → WebSocket` mapping in a `Map`
- [x] 3.4 Handle `heartbeat` WebSocket action in `server.js`: update device `last_seen` via `db.updateDeviceHeartbeat(deviceId)`
- [x] 3.5 On WebSocket `close` event, call `db.setDeviceOffline(deviceId)` and remove the device from the `deviceId → WebSocket` map
- [x] 3.6 Update `runner-core.js` to generate/persist `deviceId` in `localStorage` (key: `dashjs-device-id`) and send `register-device` on WebSocket connect
- [x] 3.7 Add heartbeat interval (30 seconds) in `runner-core.js` that sends `{ action: "heartbeat", data: { deviceId } }` and clears on page unload
- [x] 3.8 Update `landing.js` to also send `register-device` on WebSocket connect (so devices on the landing page are visible too)

## 4. Dashboard API Routes

- [x] 4.1 Add `GET /api/dashboard/runs` route with pagination (`page`, `limit`), filtering (`deviceId`, `from`, `to`, `status`), and sorting by start time descending
- [x] 4.2 Add `GET /api/dashboard/runs/:id` route returning a single run with all associated test results
- [x] 4.3 Add `GET /api/dashboard/devices` route returning all devices with computed status and run counts
- [x] 4.4 Add `GET /api/dashboard/compare?runs=id1,id2` route returning two runs with results aligned by `fullTitle`
- [x] 4.5 Add `POST /api/dashboard/dispatch` route that validates `deviceId` + `config`, looks up the device WebSocket, sends a `dispatch` message, creates a run record with status `dispatched`, and returns the new session ID
- [x] 4.6 Add `GET /api/dashboard/stream-presets` route that returns available stream config names (reuse logic from existing `/api/streams`)

## 5. Dashboard Overview Page

- [x] 5.1 Create `/dashboard/index.html` with header, navigation (Overview / Runs / Devices / Back to Runner), theme toggle, and DASH-IF footer
- [x] 5.2 Add recent runs summary section: fetch `GET /api/dashboard/runs?limit=10`, render as a table/card list with run ID, device name, timestamp, pass/fail/pending counts, and status badge
- [x] 5.3 Add online devices section: fetch `GET /api/dashboard/devices`, filter to online, render with device name, user agent, and "Dispatch" button
- [x] 5.4 Add quick dispatch form: device dropdown (online only), stream config preset dropdown, and "Dispatch" button that calls `POST /api/dashboard/dispatch`
- [x] 5.5 Add dispatch feedback: success notification with link to monitor the run, error notification on failure
- [x] 5.6 Create `dashboard/js/dashboard-common.js` with shared logic: navigation rendering, theme handling, fetch helpers, empty state rendering

## 6. Runs List Page

- [x] 6.1 Create `/dashboard/runs.html` with filter bar: device dropdown, date range inputs, status dropdown, and search/reset buttons
- [x] 6.2 Implement paginated runs table fetching from `GET /api/dashboard/runs` with current filter values
- [x] 6.3 Add pagination controls (previous/next, page numbers) that update the query and re-fetch
- [x] 6.4 Each row links to `/dashboard/run.html?id=<runId>` on click
- [x] 6.5 Add "Compare" mode: checkboxes on rows, "Compare Selected" button that navigates to `/dashboard/run.html?compare=id1,id2`

## 7. Run Detail Page

- [x] 7.1 Create `/dashboard/run.html` with run metadata header (device, timestamp, duration, config summary)
- [x] 7.2 Add stat cards (Passed, Failed, Skipped, Total) matching the runner page style
- [x] 7.3 Implement 2-level collapsible result grouping (testcase > testvector) reusing `extractTestcase`/`extractTestvectorName`/`extractMpdUrl` logic from `runner-core.js`
- [x] 7.4 Add MPD URL display in testvector headers (small monospace text)
- [x] 7.5 Add result filter bar (All / Passed / Failed / Skipped) that hides empty groups
- [x] 7.6 Implement comparison mode: detect `?compare=id1,id2`, fetch both runs via `/api/dashboard/compare`, render side-by-side table with status columns per run and regression highlighting

## 8. Devices Page

- [x] 8.1 Create `/dashboard/devices.html` with devices table: status indicator (green dot / gray dot), device name, user agent, last seen (relative time), run count
- [x] 8.2 Device rows link to `/dashboard/runs.html?deviceId=<deviceId>` on click
- [x] 8.3 Add auto-refresh (poll devices every 30 seconds to update online/offline status)

## 9. Dispatch Handling on Device Side

- [x] 9.1 Add `dispatch` WebSocket message handler in `runner-core.js` (and `landing.js`): receive config, POST to `/api/custom-config/<sessionId>`, navigate to runner page with `mode=custom&session=<sessionId>`
- [x] 9.2 Handle dispatch while already on runner page: navigate to new runner URL (fresh run)
- [x] 9.3 Extend the `complete` handler to update the run status to `completed` in the database (already handled by task 2.4, verify integration)

## 10. Dashboard Styles and Polish

- [x] 10.1 Add dashboard-specific CSS component classes to `styles.css`: `dashboard-nav`, `dashboard-card`, `device-status-indicator`, `runs-table`, `compare-table`, `dispatch-form`, `empty-state`
- [x] 10.2 Ensure all dashboard components work correctly in both light and dark themes
- [x] 10.3 Add responsive breakpoints for dashboard pages (table → card layout on mobile)
- [x] 10.4 Add the `/dashboard` static route and navigation link from the existing landing page to the dashboard

## 11. Integration and Verification

- [x] 11.1 Test end-to-end: start server, run a test suite, verify results appear in SQLite and on dashboard
- [ ] 11.2 Test device registration: open runner on two different browsers, verify both appear on devices page with correct status
- [ ] 11.3 Test dispatch: dispatch a test config from dashboard to a connected device, verify it auto-starts and results flow back
- [ ] 11.4 Test graceful degradation: simulate `better-sqlite3` unavailability, verify server starts and file-based output works
- [ ] 11.5 Test comparison view: complete two runs, compare them on the dashboard
- [x] 11.6 Update `AGENTS.md` with dashboard documentation (new routes, new pages, new CLI flags if any)
