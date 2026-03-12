## ADDED Requirements

### Requirement: SQLite database initialization
The system SHALL create and initialize a SQLite database file at `test/functional/standalone/data/dashjs-tests.db` on server startup. The database file and its parent directory SHALL be created automatically if they do not exist. The database schema SHALL include tables for test runs (`test_runs`), individual test results (`test_results`), and devices (`devices`).

#### Scenario: First startup creates database
- **WHEN** the standalone server starts and no database file exists
- **THEN** the system creates the `data/` directory and `dashjs-tests.db` file with all required tables

#### Scenario: Subsequent startup reuses existing database
- **WHEN** the standalone server starts and a database file already exists
- **THEN** the system opens the existing database without data loss and applies any pending migrations

### Requirement: Test run persistence
The system SHALL persist a test run record to the `test_runs` table when a test run completes. The record SHALL include: a unique run ID, the session ID, the device ID (if known), the configuration used (as JSON), start timestamp, completion timestamp, pass/fail/pending/total counts, total duration, and run status.

#### Scenario: Completed test run is persisted
- **WHEN** the runner sends a `complete` WebSocket message
- **THEN** the system inserts a row into `test_runs` with the summary data (passes, failures, pending, total, duration) and sets status to `completed`

#### Scenario: Run record includes device association
- **WHEN** a test run completes on a device that registered with a `deviceId`
- **THEN** the `test_runs` record's `device_id` column references that device

### Requirement: Individual test result persistence
The system SHALL persist each individual test result to the `test_results` table as it arrives during a test run. Each result record SHALL include: the parent run ID, the test title, full title, suite name, status (passed/failed/pending), duration, and error message (if failed).

#### Scenario: Each test result is stored
- **WHEN** the runner sends a `result` WebSocket message during a test run
- **THEN** the system inserts a row into `test_results` with all result fields linked to the current run

#### Scenario: Failed test includes error message
- **WHEN** a test result with `status: "failed"` is received
- **THEN** the `test_results` record includes the error message in the `error` column

### Requirement: Backward-compatible file output
The system SHALL continue to write test results to the existing file-based outputs (JSON, JUnit XML, HTML report) in addition to SQLite. Existing file output behavior SHALL NOT change.

#### Scenario: Dual write on completion
- **WHEN** a test run completes
- **THEN** results are written to both SQLite and the `results/json/`, `results/xml/`, `results/html/` directories as before

### Requirement: Run query API
The system SHALL provide an API endpoint `GET /api/dashboard/runs` that returns a paginated list of test runs. The endpoint SHALL support query parameters for filtering by device ID, date range, and status, and for pagination (page, limit).

#### Scenario: List all runs with pagination
- **WHEN** a client sends `GET /api/dashboard/runs?page=1&limit=20`
- **THEN** the system returns the 20 most recent runs sorted by start time descending, along with total count for pagination

#### Scenario: Filter runs by device
- **WHEN** a client sends `GET /api/dashboard/runs?deviceId=abc-123`
- **THEN** the system returns only runs associated with that device

#### Scenario: Filter runs by date range
- **WHEN** a client sends `GET /api/dashboard/runs?from=2026-03-01&to=2026-03-12`
- **THEN** the system returns only runs whose start timestamp falls within the specified range

### Requirement: Run detail API
The system SHALL provide an API endpoint `GET /api/dashboard/runs/:id` that returns a single test run with all its individual test results.

#### Scenario: Fetch run with full results
- **WHEN** a client sends `GET /api/dashboard/runs/42`
- **THEN** the system returns the run summary and an array of all associated test results

#### Scenario: Run not found
- **WHEN** a client sends `GET /api/dashboard/runs/99999` for a non-existent run
- **THEN** the system returns HTTP 404

### Requirement: Run comparison API
The system SHALL provide an API endpoint `GET /api/dashboard/compare?runs=id1,id2` that returns two runs side by side with their results aligned by test full title for comparison.

#### Scenario: Compare two runs
- **WHEN** a client sends `GET /api/dashboard/compare?runs=1,2`
- **THEN** the system returns both runs' summaries and a merged result list where each entry contains the status from both runs for the same test (matched by `fullTitle`)

#### Scenario: Test exists in only one run
- **WHEN** comparing two runs where a test appears in run 1 but not run 2
- **THEN** the merged entry shows the status for run 1 and `null` for run 2

### Requirement: Graceful degradation without SQLite
The system SHALL continue to function if the SQLite database cannot be initialized (e.g., `better-sqlite3` build failure). File-based result storage SHALL work as before. Dashboard API routes SHALL return appropriate error responses indicating the database is unavailable.

#### Scenario: Database initialization failure
- **WHEN** the server starts but `better-sqlite3` fails to load or the database file cannot be created
- **THEN** the server logs a warning, disables dashboard API routes (returning HTTP 503), and continues serving all other functionality normally
