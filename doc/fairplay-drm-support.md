# FairPlay DRM Support for dash.js

## Overview

This document describes the Apple FairPlay Streaming (FPS) DRM support in
dash.js, enabling encrypted DASH playback on Safari (macOS/iOS).

FairPlay differs fundamentally from Widevine and PlayReady in its EME flow:
it uses `sinf` init data (not PSSH/`cenc`), requires a server certificate
before license acquisition, and works only with `cbcs` encryption.

The feature has been successfully tested with Safari on macOS using the
livesim2 EZDRM test stream:
`https://livesim2.dashif.org/livesim2/drm_EZDRM-1-key-cbcs/testpic_2s/Manifest.mpd`

---

## Key FairPlay Parameters

| Parameter | Value |
|-----------|-------|
| UUID | `94ce86fb-07ff-4f43-adb8-93d2fa968ca2` |
| Key system string | `com.apple.fps` |
| Scheme ID URI | `urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2` |
| Init data type | `sinf` (not `cenc`) |
| Encryption scheme | `cbcs` |
| License request | Binary SPC POST, `Content-Type: application/octet-stream` |
| License response | Binary CKC (passed directly to `session.update()`) |
| Server certificate | **Required** before `generateRequest()` |
| PSSH in manifest | **None** -- init data comes from `encrypted` event |

## How FairPlay Differs from Widevine/PlayReady in the EME Flow

1. No PSSH in manifest or init segment -- `getInitData()` returns null
2. `requestMediaKeySystemAccess` must use `initDataTypes: ['sinf']` (not `['cenc']`)
3. Server certificate MUST be set before `generateRequest()` can succeed
4. The `encrypted` event fires with `initDataType='sinf'` and the sinf box as initData
5. The sinf initData is passed directly to `generateRequest()` -- no PSSH parsing
6. License request body is raw binary SPC (Content-Type: application/octet-stream)
7. License response is raw binary CKC
8. Safari wraps sinf initData in JSON: `{"sinf": ["<base64-encoded sinf box>"]}`
9. Session deduplication is by key ID (extracted from the `tenc` box inside sinf),
   not by initData bytes -- video and audio sinf boxes differ but may share a key ID

---

## Files Created

### `src/streaming/protection/drm/KeySystemFairPlay.js`
FairPlay key system implementation following the `KeySystemWidevine.js` pattern.

- `uuid`: `ProtectionConstants.FAIRPLAY_UUID`
- `systemString`: `ProtectionConstants.FAIRPLAY_KEYSTEM_STRING`
- `schemeIdURI`: `'urn:uuid:' + uuid`
- `getInitData()`: Returns `null` (no PSSH in manifest)
- `getLicenseRequestFromMessage(message)`: Returns `new Uint8Array(message)` (binary SPC)
- `getRequestHeadersFromMessage()`: Returns `{ 'Content-Type': 'application/octet-stream' }`
- `getLicenseServerURLFromInitData()`: Returns `null`
- `getCDMData()`: Returns `null`

### `src/streaming/protection/servers/FairPlay.js`
FairPlay license server handler following the `Widevine.js` pattern.

- `getHTTPMethod()`: `'POST'`
- `getResponseType()`: `'arraybuffer'`
- `getLicenseMessage(serverResponse)`: Detects and decodes multiple CKC response
  formats -- raw binary passthrough, base64, `<ckc>` XML wrapper, and JSON wrapper
  (`ckc`, `CkcMessage`, `License` keys). Matches Shaka Player's
  `commonFairPlayResponse` logic.
- `getServerURLFromMessage(url)`: Returns `url` unchanged
- `getErrorResponse(serverResponse)`: Converts to string via `String.fromCharCode`

---

## Files Modified

### `src/streaming/constants/ProtectionConstants.js`
Added constants:
- `FAIRPLAY_KEYSTEM_STRING: 'com.apple.fps'`
- `FAIRPLAY_UUID: '94ce86fb-07ff-4f43-adb8-93d2fa968ca2'`
- `INITIALIZATION_DATA_TYPE_SINF: 'sinf'`

### `src/streaming/protection/controllers/ProtectionKeyController.js`
- Imported `KeySystemFairPlay` and `FairPlay` server
- Added FairPlay key system registration in `initialize()` (after Widevine, before ClearKey)
- Added `else if` for `FAIRPLAY_KEYSTEM_STRING` in `getLicenseServerModelInstance()`

### `src/streaming/protection/models/DefaultProtectionModel.js`
- Added `SYSTEM_STRING_PRIORITY` entry for FairPlay (after Widevine, before ClearKey)
- Modified `createKeySession()` to use `'sinf'` as the `initDataType` when calling
  `generateRequest()` for FairPlay (analogous to the existing `'keyids'` branch for
  ClearKey)

### `src/streaming/protection/vo/MediaCapability.js`
- Added optional `encryptionScheme` parameter to the constructor. When set (e.g.
  `'cbcs'` for FairPlay), it is included in the capability object passed to
  `requestMediaKeySystemAccess()`.

### `src/streaming/protection/controllers/ProtectionController.js`
Five distinct changes:

1. **`_onNeedKey()` -- accept sinf initData**: Changed the guard from rejecting all
   non-`cenc` to accepting both `cenc` and `sinf`.

2. **`_onNeedKey()` -- sinf key system matching**: For `sinf` initData, calls
   `_getSupportedKeySystemMetadataForSinf()` instead of the PSSH-based
   `getSupportedKeySystemMetadataFromSegmentPssh()`. The helper looks up the
   FairPlay key system directly (since sinf data is FairPlay-specific), extracts
   the key ID from the sinf's `tenc` box for session deduplication, and builds
   the metadata object.

3. **`_getKeySystemConfiguration()` -- sinf initDataTypes and cbcs encryption
   scheme**: For FairPlay, uses `initDataTypes: ['sinf']` (instead of `['cenc']`)
   and sets `encryptionScheme: 'cbcs'` on all media capabilities.

4. **`_onMediaKeysCreated()` -- certificate before session creation**: For FairPlay,
   the certificate acquisition promise is stored in `pendingCertificatePromise` and
   awaited before creating key sessions. For other key systems, behavior is unchanged
   (fire-and-forget). To support this, `_acquireCertificateFromManifest()` and
   `_fetchAndApplyCertificateSequentially()` were refactored to return Promises.

5. **`_selectKeySystemOrUpdateKeySessions()` -- certificate wait on encrypted
   event**: When `pendingCertificatePromise` exists (FairPlay certificate still
   downloading), waits for it before calling `_handlePendingMediaTypes()`. This
   prevents `generateRequest()` from being called before the certificate is set.

#### Helper functions added to ProtectionController

- **`_getSupportedKeySystemMetadataForSinf(initData)`**: Builds key system metadata
  for sinf initData by looking up the FairPlay key system directly and extracting
  the key ID for session deduplication.

- **`_extractKeyIdFromSinf(initData)`**: Parses Safari's JSON sinf wrapper,
  base64-decodes the sinf box, searches for the `tenc` fourcc, and extracts the
  16-byte `defaultKID` formatted as a UUID string.

---

## Test Files Created

### `test/unit/test/streaming/streaming.protection.drm.KeySystemFairPlay.js`
9 test cases covering: factory existence, `uuid`, `systemString`, `schemeIdURI`,
`getInitData()`, `getLicenseRequestFromMessage()`, `getRequestHeadersFromMessage()`,
`getLicenseServerURLFromInitData()`, `getCDMData()`.

### `test/unit/test/streaming/streaming.protection.servers.FairPlay.js`
8 test cases covering: factory existence, HTTP method, response type, raw binary CKC
passthrough, base64 CKC decoding, `<ckc>` XML wrapper decoding, JSON wrapper
decoding, URL passthrough, error response conversion.

---

## Integration Testing

### Test Setup

- **Test URL**: `https://livesim2.dashif.org/livesim2/drm_EZDRM-1-key-cbcs/testpic_2s/Manifest.mpd`
- **Browser**: Safari on macOS
- **Dev server**: `npm start` then open `http://localhost:3000/samples/dash-if-reference-player/index.html`

### Expected EME Flow

1. dash.js parses FairPlay ContentProtection (`urn:uuid:94ce86fb-07ff-4f43-adb8-93d2fa968ca2`) from manifest
2. `com.apple.fps` key system selected with `initDataTypes: ['sinf']` and `encryptionScheme: 'cbcs'`
3. Certificate downloaded from `dashif:Certurl` and applied via `setServerCertificate()`
4. `encrypted` event fires with sinf initData (JSON-wrapped) when init segment is appended
5. Key ID extracted from sinf's `tenc` box; duplicate sessions skipped for same key ID
6. `generateRequest('sinf', initData)` produces SPC
7. License request POST sent to FairPlay license server with binary SPC body
8. CKC response applied via `session.update()`
9. Encrypted CBCS content decrypts and plays
