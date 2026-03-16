# dash.js Test Runner — Samsung Tizen TV App

A minimal Tizen web app that connects a Samsung TV to the dash.js standalone
functional test runner as a device agent. Once installed, the TV registers
itself with the test server and waits for dispatched test runs.

## Prerequisites

- **Tizen Studio** with the Samsung TV Extension installed
- A Samsung TV in **Developer Mode** on the same network as the test server
- A **Samsung certificate profile** created in Tizen Studio (required for signing)
- The standalone test server running with HTTPS and a **publicly trusted certificate**
  (self-signed / mkcert certs are not supported on Tizen — the TV's system trust
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

1. Open **Smart Hub > Apps**
2. Open **App Settings**
3. Enter `12345` on the remote
4. Enable **Developer mode** and enter your PC's IP address
5. Reboot the TV

### Connect the TV in Tizen Studio

1. Open **Tools > Device Manager**
2. Click **Remote Device Manager > +**
3. Enter the TV's IP address (port: 26101)
4. Toggle **Connection** to **On**

### Package and install via CLI

```bash
# Package the app (.wgt file)
tizen package -t wgt -s <certificate-profile> -- /path/to/apps/tizen

# Install on the TV
tizen install -n DashJSTestRunner.wgt -t <device-serial>

# Launch the app
tizen run -p DashIF0001.DashJSTestRunner -t <device-serial>
```

### Alternative: using sdb

```bash
sdb connect <TV-IP>
sdb -s <device-serial> install DashJSTestRunner.wgt
```

## How It Works

1. The app launches and redirects to the Device Agent page on your test server
2. The agent page establishes a WebSocket connection and registers the TV as a device
3. The TV appears in the dashboard's Devices page as online
4. When you dispatch a test from the dashboard, the agent page navigates to the
   test runner, executes the tests, and reports results back via WebSocket
5. After completion, the TV is ready for the next dispatched test

## Remote Control

- **Back button** (keyCode 10009): Shows an exit confirmation dialog
- **Arrow keys + Enter**: Standard navigation within the web pages
- Media keys are not registered (not needed for test execution)

## Platform Support

- Minimum: Tizen 4.0 (Samsung 2018 TVs)
- EME (Encrypted Media Extensions) works out of the box — no special privileges needed
- Widevine and PlayReady DRM are supported natively

## Troubleshooting

**App shows "Server URL not configured":**
Edit `index.html` and set the `SERVER_URL` variable.

**Certificate error / page won't load:**
The test server must use a certificate from a publicly trusted CA. Samsung TVs
cannot trust self-signed or mkcert certificates. Use Let's Encrypt or serve the
test server behind nginx with a trusted certificate.

**TV doesn't appear in the dashboard:**
Ensure the TV and test server are on the same network. Check that the server URL
is correct and the server is running. Open the TV's web inspector via Tizen Studio
to check for console errors.

## Files

```
tizen/
├── config.xml    # Tizen widget configuration (app ID, privileges, CSP)
├── index.html    # Entry point — redirects to the server's agent page
└── icon.png      # 115x115 app launcher icon (placeholder)
```
