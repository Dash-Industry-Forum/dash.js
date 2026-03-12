## ADDED Requirements

### Requirement: Device self-registration
The system SHALL allow devices to register themselves via a `register-device` WebSocket message containing a `deviceId`, `name`, and `userAgent`. The server SHALL upsert the device record in the `devices` table, updating `last_seen` and `status` to `online`.

#### Scenario: New device registers
- **WHEN** a device sends `{ "action": "register-device", "data": { "deviceId": "tv-uuid-1", "name": "Living Room TV", "userAgent": "Mozilla/5.0 ..." } }`
- **THEN** the server creates a new row in `devices` with `status: "online"` and `last_seen` set to the current timestamp

#### Scenario: Known device reconnects
- **WHEN** a device with an existing `deviceId` sends a `register-device` message
- **THEN** the server updates the existing row's `last_seen`, `status` to `online`, and refreshes `name` and `userAgent` if they changed

### Requirement: Client-side persistent device identity
The runner page SHALL generate a unique `deviceId` (UUID v4 format) on first load and store it in `localStorage` under the key `dashjs-device-id`. On subsequent loads, it SHALL reuse the stored `deviceId`. If `localStorage` is unavailable, a session-scoped random ID SHALL be generated.

#### Scenario: First visit generates and stores deviceId
- **WHEN** the runner page loads and `localStorage` has no `dashjs-device-id` entry
- **THEN** the page generates a UUID v4, stores it in `localStorage`, and uses it for WebSocket registration

#### Scenario: Return visit reuses deviceId
- **WHEN** the runner page loads and `localStorage` contains a `dashjs-device-id` value
- **THEN** the page uses the stored value for WebSocket registration

#### Scenario: localStorage unavailable
- **WHEN** `localStorage` is not accessible (e.g., private browsing mode)
- **THEN** the page generates a random session-scoped ID and uses it for registration

### Requirement: Device heartbeat
Devices SHALL send a `heartbeat` WebSocket message every 30 seconds while connected. The server SHALL update the device's `last_seen` timestamp on each heartbeat.

#### Scenario: Heartbeat updates last_seen
- **WHEN** the server receives `{ "action": "heartbeat", "data": { "deviceId": "tv-uuid-1" } }`
- **THEN** the server updates the device's `last_seen` to the current timestamp

#### Scenario: Heartbeat from unregistered device
- **WHEN** the server receives a heartbeat with a `deviceId` not in the `devices` table
- **THEN** the server ignores the heartbeat (no error, no row created)

### Requirement: Device offline detection
The system SHALL consider a device `offline` if it has not sent a heartbeat within 90 seconds (3x the heartbeat interval). Device status SHALL be evaluated on-demand when querying the devices API.

#### Scenario: Device goes offline
- **WHEN** a device's `last_seen` is more than 90 seconds ago
- **THEN** the devices API reports this device's status as `offline`

#### Scenario: Device comes back online
- **WHEN** a previously offline device sends a `register-device` or `heartbeat` message
- **THEN** the device's status is updated to `online` and `last_seen` is refreshed

### Requirement: WebSocket disconnect handling
The system SHALL update a device's status to `offline` when its WebSocket connection closes, in addition to heartbeat-based detection.

#### Scenario: WebSocket close event
- **WHEN** a device's WebSocket connection emits a `close` event and the device had registered with a `deviceId`
- **THEN** the server updates the device's `status` to `offline` in the database

### Requirement: Device listing API
The system SHALL provide an API endpoint `GET /api/dashboard/devices` that returns all known devices with their current status, name, user agent, last seen timestamp, and total number of test runs.

#### Scenario: List all devices
- **WHEN** a client sends `GET /api/dashboard/devices`
- **THEN** the system returns an array of device records including `deviceId`, `name`, `userAgent`, `status` (online/offline), `lastSeen`, and `runCount`

#### Scenario: Online status is computed
- **WHEN** a device's `last_seen` is within 90 seconds
- **THEN** its status in the response is `online`; otherwise `offline`
