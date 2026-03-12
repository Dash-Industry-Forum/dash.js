## ADDED Requirements

### Requirement: Dispatch API endpoint
The system SHALL provide an API endpoint `POST /api/dashboard/dispatch` that accepts a JSON body with `deviceId` and a test configuration object, and sends the configuration to the specified device via WebSocket.

#### Scenario: Successful dispatch to online device
- **WHEN** a client sends `POST /api/dashboard/dispatch` with `{ "deviceId": "tv-uuid-1", "config": { "testvectors": [...], "categories": [...] } }` and the device is online
- **THEN** the server sends a `dispatch` WebSocket message to the device's socket, creates a new session for the run, and returns `{ "ok": true, "sessionId": "<new-session-id>" }`

#### Scenario: Dispatch to offline device
- **WHEN** a client sends `POST /api/dashboard/dispatch` with a `deviceId` that is not currently connected
- **THEN** the server returns HTTP 409 with `{ "error": "Device is not connected" }`

#### Scenario: Dispatch to unknown device
- **WHEN** a client sends `POST /api/dashboard/dispatch` with a `deviceId` not in the database
- **THEN** the server returns HTTP 404 with `{ "error": "Device not found" }`

### Requirement: Device receives dispatch message
The runner or landing page on a device SHALL handle incoming `dispatch` WebSocket messages by storing the received test configuration and navigating to the runner page to auto-start the test run.

#### Scenario: Device auto-starts on dispatch
- **WHEN** the device receives `{ "action": "dispatch", "data": { "sessionId": "...", "config": { "testvectors": [...], "categories": [...] } } }`
- **THEN** the device stores the config via `POST /api/custom-config/<sessionId>` and navigates to the runner page with `mode=custom&session=<sessionId>`

#### Scenario: Device on runner page receives dispatch
- **WHEN** the device is currently on the runner page (running or completed) and receives a `dispatch` message
- **THEN** the device navigates to the runner page with the new session and configuration, starting a fresh test run

### Requirement: Dashboard dispatch UI
The dashboard overview page SHALL provide a dispatch form that allows selecting an online device, choosing a test configuration (preset or custom), and triggering the test run.

#### Scenario: Select device and preset config
- **WHEN** a user selects an online device from the dropdown, selects a preset stream config (e.g., "smoke"), and clicks "Dispatch"
- **THEN** the dashboard sends `POST /api/dashboard/dispatch` with the device ID and the preset configuration

#### Scenario: No online devices
- **WHEN** no devices are currently online
- **THEN** the device dropdown is empty and the dispatch button is disabled with a tooltip "No devices online"

#### Scenario: Dispatch feedback
- **WHEN** a dispatch is successfully sent
- **THEN** the dashboard shows a success notification with a link to monitor the run (e.g., "Test dispatched. View progress" linking to the session)

#### Scenario: Dispatch failure feedback
- **WHEN** a dispatch fails (device disconnected between selection and send)
- **THEN** the dashboard shows an error notification explaining the failure

### Requirement: Device WebSocket association for dispatch
The server SHALL maintain a mapping from `deviceId` to the active WebSocket connection so that dispatch messages can be routed to the correct device. This mapping SHALL be updated when devices register and cleared when devices disconnect.

#### Scenario: Device registers and becomes dispatchable
- **WHEN** a device sends a `register-device` message with `deviceId: "tv-uuid-1"`
- **THEN** the server stores the association between `"tv-uuid-1"` and the device's WebSocket connection, making it available for dispatch

#### Scenario: Device disconnects and becomes non-dispatchable
- **WHEN** a device's WebSocket connection closes
- **THEN** the server removes the `deviceId` → WebSocket mapping, and subsequent dispatch attempts to that device return an error

### Requirement: Dispatch creates a tracked run
The system SHALL create a `test_runs` database record with status `dispatched` when a dispatch is initiated, before the device starts running tests. The record SHALL be updated to `running` when the device begins execution and `completed` when results are received.

#### Scenario: Run lifecycle through dispatch
- **WHEN** a dispatch is sent to a device
- **THEN** a `test_runs` record is created with `status: "dispatched"`
- **WHEN** the device starts running tests (first result or explicit start message)
- **THEN** the run status is updated to `running`
- **WHEN** the device sends a `complete` message
- **THEN** the run status is updated to `completed` with summary data
