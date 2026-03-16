# dash.js Test Runner — LG webOS TV App

A minimal webOS web app that connects an LG TV to the dash.js standalone
functional test runner as a device agent. Once installed, the TV registers
itself with the test server and waits for dispatched test runs.

## Prerequisites

- **webOS CLI tools** (`ares-*` commands — install via LG's SDK or npm)
- An LG TV with the **Developer Mode** app installed from the LG Content Store
- An **LG Developer account** (sign up at webostv.developer.lge.com)
- TV and development machine on the **same network**
- The standalone test server running with HTTPS and a **publicly trusted certificate**
  (self-signed / mkcert certs are not supported on webOS — the TV's system trust
  store cannot be modified)

## Configuration

Edit `index.html` and replace `__SERVER_URL__` with your test server's base URL:

```javascript
var SERVER_URL = 'https://testrunner.yourdomain.com';
```

The app will navigate to the Device Agent page (`/dashboard/agent.html`) which
handles device registration, heartbeat, and test dispatch automatically.

## Build & Deploy

### Enable Developer Mode on the TV

1. Install the **Developer Mode** app from the LG Content Store
2. Launch it and sign in with your LG Developer account
3. Toggle **Dev Mode Status** to **On**
4. The TV will reboot

> **Note:** Developer Mode has a session timer. Click **Extend** periodically
> to keep it active. If it expires, sideloaded apps are uninstalled.

### Register the TV as a target device

```bash
# Add the TV (default port 9922, user: prisoner)
ares-setup-device --add myTV -i "host=<TV-IP>" -i "port=9922" -i "username=prisoner"

# On the TV's Developer Mode app, enable "Key Server", then:
ares-novacom --device myTV --getkey
# Enter the 6-character passphrase shown on the TV screen

# Verify the connection
ares-device-info --device myTV
```

### Package and install

```bash
# Package the app (.ipk file)
ares-package ./apps/webos

# Install on the TV
ares-install --device myTV ./org.dashif.dashjs.testrunner_1.0.0_all.ipk

# Launch the app
ares-launch --device myTV org.dashif.dashjs.testrunner
```

### Quick iteration (no packaging)

```bash
# Serve directly to the TV with auto-reload
ares-launch -H ./apps/webos -d myTV
```

### Debug with Web Inspector

```bash
ares-inspect --device myTV --app org.dashif.dashjs.testrunner --open
# Opens Chrome DevTools connected to the app
```

## How It Works

1. The app launches and redirects to the Device Agent page on your test server
2. The agent page establishes a WebSocket connection and registers the TV as a device
3. The TV appears in the dashboard's Devices page as online
4. When you dispatch a test from the dashboard, the agent page navigates to the
   test runner, executes the tests, and reports results back via WebSocket
5. After completion, the TV is ready for the next dispatched test

## Remote Control

- **Back button** (keyCode 461): Shows an exit confirmation dialog
- **Arrow keys + OK**: Standard navigation within the web pages
- **Magic Remote**: Pointer mode works for mouse interactions
- `disableBackHistoryAPI` is set to `true` — the app handles back navigation itself

## Platform Support

- Minimum recommended: webOS TV 4.x (LG 2018 TVs, Chromium 53)
- For standard W3C EME: webOS TV 5.x+ (LG 2020 TVs, Chromium 68)
- EME works out of the box — no special app permissions needed
- Widevine and PlayReady DRM are supported natively

### Trusted Root CAs

webOS TVs ship with a fixed set of trusted root CAs. LG publishes the list at:
https://webostv.developer.lge.com/assets/root-certificate/webOS_TV_Root_CAs.zip

Let's Encrypt (ISRG Root X1) is supported from webOS TV 5.0+. For older TVs,
use a certificate from a CA listed in the trusted roots (DigiCert, GlobalSign, etc.).

## Troubleshooting

**App shows "Server URL not configured":**
Edit `index.html` and set the `SERVER_URL` variable.

**Certificate error / page won't load:**
The test server must use a certificate from a publicly trusted CA. LG TVs
cannot trust self-signed or mkcert certificates. Check that your CA is in
LG's trusted root list (see link above).

**TV doesn't appear in the dashboard:**
Ensure the TV and test server are on the same network. Check that the server URL
is correct and the server is running. Use `ares-inspect` to open the web inspector
and check for console errors.

**Developer Mode expired / apps disappeared:**
Re-enable Developer Mode in the Developer Mode app and click Extend. Reinstall
the app with `ares-install`.

## Files

```
webos/
├── appinfo.json    # webOS app manifest (app ID, resolution, settings)
├── index.html      # Entry point — redirects to the server's agent page
├── icon.png        # 80x80 app launcher icon (placeholder)
└── largeIcon.png   # 130x130 large icon for app store (placeholder)
```
