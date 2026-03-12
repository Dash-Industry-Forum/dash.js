## Context

The standalone functional test runner (`test/functional/standalone/`) is an Express + WebSocket server that runs dash.js functional tests in any browser, including Smart TVs. Currently, test results are stored as flat files (JSON, JUnit XML, self-contained HTML reports) in `results/` subdirectories. Sessions are tracked in an in-memory `Map` and lost on restart. Devices (TVs, phones) connect via WebSocket but have no persistent identity -- they are anonymous sockets tied to ephemeral session IDs.

The server already has the right foundation: Express for HTTP APIs, WebSocket (`ws`) for real-time communication, and a modular page structure (landing, runner, remote). The design system (`--rp-*` CSS variables, Bootstrap 5) is established and consistent across all pages.

## Goals / Non-Goals

**Goals:**
- Persist all test run results in SQLite so they survive server restarts and accumulate over time
- Track devices with persistent identities, online/offline status, and metadata (name, user agent)
- Provide a dashboard UI for browsing historical runs, viewing detailed results, and monitoring connected devices
- Enable dispatching test configurations from the dashboard to a specific connected device
- Maintain full backward compatibility with existing file-based result output and all existing pages

**Non-Goals:**
- Recurring/cron-style scheduled test runs (manual dispatch only for now)
- Multi-server federation or distributed architecture (single server instance)
- User authentication or access control
- Modifying existing functional test files or the test bundling pipeline
- Replacing the existing landing/runner/remote pages (dashboard is additive)
- Supporting databases other than SQLite

## Decisions

### 1. SQLite via `better-sqlite3`

**Choice:** `better-sqlite3` as the database driver.

**Rationale:** Synchronous API eliminates callback complexity, making it trivial to integrate into the existing Express route handlers. Zero external infrastructure -- the database is a single file. Performance is excellent for this use case (hundreds of test runs, thousands of individual results). The native addon compiles cleanly on all platforms with Node.js >= 20.

**Alternatives considered:**
- `sql.js` (SQLite compiled to WASM): No native addon needed, but significantly slower for writes and larger memory footprint. Not worth the trade-off since the server already requires a native Node.js environment.
- PostgreSQL/MongoDB: Requires separate server process, complicates setup. Overkill for a development/testing tool.
- LevelDB/LokiJS: Less mature query capabilities, no SQL.

### 2. Extend the existing server rather than a separate service

**Choice:** Add dashboard routes, DB initialization, and device tracking directly to `server.js`.

**Rationale:** Keeps the tool as a single `npm run test-standalone` command. The server is already an Express app with well-organized routes. Adding new route groups (`/api/dashboard/*`, `/dashboard/*`) is straightforward. A separate service would require coordinating two processes, shared database access, and a more complex startup sequence -- all unnecessary complexity for a dev tool.

### 3. Database module (`db.js`) as a clean abstraction layer

**Choice:** Encapsulate all database operations in a dedicated `db.js` module that exports query functions. `server.js` never writes raw SQL.

**Rationale:** Keeps `server.js` focused on HTTP/WebSocket routing. Makes the data layer testable in isolation. Allows schema migrations to be managed in one place. The module initializes the database (creating tables if they don't exist) and returns an object with methods like `insertRun()`, `insertResult()`, `getRuns()`, `getRunById()`, `upsertDevice()`, etc.

### 4. Device identification via client-generated persistent ID

**Choice:** Each device generates a unique `deviceId` (UUID v4) on first connection and stores it in `localStorage`. On subsequent connections, the device sends the same `deviceId`, allowing the server to recognize it across sessions.

**Rationale:** No server-side device provisioning needed. Smart TVs and browsers all support `localStorage`. The device ID persists across page reloads and server restarts. The server's `devices` table uses `deviceId` as the primary key, upserting on each connection.

**Alternative considered:** Server-assigned IDs: Would require a registration flow and wouldn't survive server restarts without the client storing the assigned ID anyway.

### 5. Dashboard pages as server-rendered vanilla JS

**Choice:** New dashboard pages follow the same pattern as existing pages: static HTML + vanilla JS + Bootstrap 5 + `fetch()` for API calls.

**Rationale:** Consistency with existing landing/runner/remote pages. No build step. No framework dependency. The dashboard's needs (tables, filters, detail views) are well-served by vanilla JS + Bootstrap components.

### 6. Heartbeat-based device status tracking

**Choice:** Devices send a `heartbeat` WebSocket message every 30 seconds. The server updates `last_seen` on each heartbeat. A device is considered "offline" if it hasn't sent a heartbeat in 90 seconds (3x the interval).

**Rationale:** WebSocket `close` events are unreliable on Smart TVs and mobile browsers (tab backgrounding, network switches). A periodic heartbeat provides reliable presence detection. The 30s/90s intervals balance responsiveness with overhead.

### 7. Result storage: SQLite AND files (dual write)

**Choice:** When a test run completes, results are written to both SQLite and the existing file-based outputs (JSON, XML, HTML report).

**Rationale:** Full backward compatibility. Existing workflows that depend on file-based reports (e.g., CI pipelines consuming JUnit XML) continue to work. The SQLite store provides the queryable, persistent layer for the dashboard. The file outputs are a bonus/fallback.

### 8. Dashboard page structure

**Choice:** Four dashboard pages under `/dashboard/`:
- `index.html` -- Overview (recent runs summary, online devices, quick dispatch)
- `runs.html` -- Full runs list with filtering and pagination
- `run.html?id=<runId>` -- Single run detail with 2-level grouped results
- `devices.html` -- Device registry

**Rationale:** Matches the granularity of the data model. Each page has a focused purpose. The overview page provides a starting point; users drill into specific runs or devices as needed.

## Risks / Trade-offs

**[Risk] `better-sqlite3` native addon build failures on exotic platforms** → Mitigation: The server gracefully degrades if SQLite fails to initialize -- file-based storage continues to work, dashboard features show an appropriate error. Document the Node.js build toolchain requirement (python3, make, g++/clang) in the README.

**[Risk] Database file grows unboundedly over time** → Mitigation: Add a configurable retention policy (e.g., `--max-runs=500` CLI flag) that prunes old runs on startup. Default: no limit. The database file can also be deleted at any time to start fresh.

**[Risk] `localStorage`-based `deviceId` can be cleared by the user or unavailable in private browsing** → Mitigation: If `localStorage` is unavailable, fall back to generating a session-scoped ID (survives only the current page session). The device will appear as a new device on each visit but functionality is unaffected.

**[Risk] WebSocket heartbeat overhead on constrained devices** → Mitigation: 30-second intervals produce minimal traffic (~50 bytes per message). This is negligible compared to the test execution traffic.

**[Trade-off] Dual-write (SQLite + files) means data can drift** → Accepted: The SQLite store is the source of truth for the dashboard. File-based outputs are a convenience/compatibility layer. They don't need to be perfectly in sync.

**[Trade-off] No authentication means anyone on the network can dispatch tests** → Accepted: This is a development/testing tool running on a local network. Authentication can be added later if needed.
