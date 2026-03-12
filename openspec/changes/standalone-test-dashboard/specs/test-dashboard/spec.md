## ADDED Requirements

### Requirement: Dashboard overview page
The system SHALL serve a dashboard overview page at `/dashboard/index.html` that displays a summary of recent test runs, a list of currently connected (online) devices, and a quick dispatch form for triggering new test runs.

#### Scenario: Overview shows recent runs
- **WHEN** a user navigates to `/dashboard/index.html`
- **THEN** the page displays the 10 most recent test runs with run ID, device name, timestamp, pass/fail/pending counts, and overall status (pass/fail)

#### Scenario: Overview shows online devices
- **WHEN** a user navigates to `/dashboard/index.html`
- **THEN** the page displays all devices with `status: online`, showing device name, user agent, and a "Dispatch" action button

#### Scenario: Overview with no data
- **WHEN** no test runs exist and no devices are connected
- **THEN** the page displays appropriate empty-state messages

### Requirement: Runs list page
The system SHALL serve a runs list page at `/dashboard/runs.html` that displays a filterable, sortable, paginated table of all historical test runs.

#### Scenario: Paginated runs table
- **WHEN** a user navigates to `/dashboard/runs.html`
- **THEN** the page loads the first page of runs (20 per page) sorted by start time descending, with pagination controls

#### Scenario: Filter by device
- **WHEN** a user selects a device from the device filter dropdown
- **THEN** the table updates to show only runs from that device

#### Scenario: Filter by date range
- **WHEN** a user sets a start and end date in the date filter
- **THEN** the table updates to show only runs within that date range

#### Scenario: Filter by status
- **WHEN** a user selects "Failed" from the status filter
- **THEN** the table shows only runs that had at least one failure

#### Scenario: Click run navigates to detail
- **WHEN** a user clicks on a run row in the table
- **THEN** the browser navigates to `/dashboard/run.html?id=<runId>`

### Requirement: Run detail page
The system SHALL serve a run detail page at `/dashboard/run.html?id=<runId>` that displays the full test results for a specific run, using 2-level collapsible grouping (testcase > testvector) consistent with the existing runner page and HTML reports.

#### Scenario: Full run detail with 2-level grouping
- **WHEN** a user navigates to `/dashboard/run.html?id=42`
- **THEN** the page displays stat cards (passed, failed, skipped, total), run metadata (device, timestamp, duration), and all test results grouped by testcase then testvector with collapsible sections

#### Scenario: Filter by result status
- **WHEN** a user clicks the "Failed" filter button on the run detail page
- **THEN** only failed tests are shown and empty testcase/testvector groups are hidden

#### Scenario: MPD URL shown in testvector headers
- **WHEN** viewing a run's test results
- **THEN** each testvector group header displays the MPD URL in small monospace text below the testvector name

#### Scenario: Run not found
- **WHEN** a user navigates to `/dashboard/run.html?id=99999` for a non-existent run
- **THEN** the page displays a "Run not found" error message

### Requirement: Devices page
The system SHALL serve a devices page at `/dashboard/devices.html` that displays all known devices with their status, metadata, and test run history summary.

#### Scenario: Device list with status indicators
- **WHEN** a user navigates to `/dashboard/devices.html`
- **THEN** the page displays a table of all devices with visual status indicators (green for online, gray for offline), device name, user agent, last seen timestamp, and total run count

#### Scenario: Click device filters runs
- **WHEN** a user clicks on a device row
- **THEN** the browser navigates to `/dashboard/runs.html?deviceId=<deviceId>` to show that device's run history

### Requirement: Dashboard design system consistency
All dashboard pages SHALL use the same `--rp-*` CSS variable design system, Bootstrap 5 framework, DASH-IF header/footer, and theme toggle (light/dark) as the existing standalone runner pages.

#### Scenario: Dark theme support
- **WHEN** a user toggles the theme to dark mode on a dashboard page
- **THEN** all dashboard components render correctly using the dark theme CSS variables

#### Scenario: Visual consistency with existing pages
- **WHEN** comparing the dashboard pages with the existing landing/runner/remote pages
- **THEN** the visual style (fonts, colors, spacing, card styles, headers, footers) is consistent

### Requirement: Dashboard navigation
All dashboard pages SHALL include a navigation bar or breadcrumb that links between dashboard pages and back to the standalone runner landing page.

#### Scenario: Navigate between dashboard pages
- **WHEN** a user is on any dashboard page
- **THEN** they can navigate to the overview, runs list, devices list, and back to the standalone runner landing page via navigation links

### Requirement: Run comparison view
The dashboard SHALL provide a comparison view at `/dashboard/run.html?compare=id1,id2` that shows two runs side by side with results aligned by test name, highlighting differences in status.

#### Scenario: Side-by-side comparison
- **WHEN** a user navigates to `/dashboard/run.html?compare=1,2`
- **THEN** the page displays both runs' summaries and a table where each row is a test, with columns showing the status in each run

#### Scenario: Status difference highlighting
- **WHEN** a test passed in run 1 but failed in run 2
- **THEN** the row is highlighted to indicate a regression

#### Scenario: Test missing from one run
- **WHEN** a test exists in run 1 but not in run 2
- **THEN** the row shows the status for run 1 and a dash or "N/A" for run 2
