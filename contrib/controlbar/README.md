## dash.js ControlBar

A self-contained, reusable video control bar for [dash.js](https://github.com/Dash-Industry-Forum/dash.js).

The controlbar generates its own DOM structure, so you only need to provide a wrapper element.
It is used by the [DASH-IF Reference Player](../../samples/dash-if-reference-player/) and can be
integrated into any page that uses dash.js.

### Prerequisites

- **dash.js** loaded (the global `dashjs` object must be available)
- **Bootstrap Icons** CSS for icon display:
  ```html
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css" rel="stylesheet">
  ```

### Quick Start

1. **Include the CSS**

   ```html
   <link rel="stylesheet" href="path/to/contrib/controlbar/controlbar.css">
   ```

2. **Provide a wrapper element** in your HTML (must have `position: relative`):

   ```html
   <div id="video-wrapper" style="position: relative;">
       <video id="video-element"></video>
   </div>
   ```

3. **Import and initialize** (ES module):

   ```js
   import { ControlBar } from 'path/to/contrib/controlbar/ControlBar.js';

   const player = dashjs.MediaPlayer().create();
   const video = document.getElementById('video-element');
   player.initialize(video, url, autoPlay);

   const controlbar = new ControlBar(player, video);
   controlbar.init(document.getElementById('video-wrapper'));
   controlbar.enable();
   ```

### Constructor

```js
new ControlBar(player, videoElement)
```

| Parameter | Type | Description |
|---|---|---|
| `player` | `dashjs.MediaPlayerClass` | A dash.js MediaPlayer instance |
| `videoElement` | `HTMLVideoElement` | The `<video>` element managed by the player |

### API

| Method | Description |
|---|---|
| `init(wrapper)` | Build the DOM and inject it into the given wrapper element (or CSS selector string). The wrapper should have `position: relative`. |
| `enable()` | Enable the control bar (interactive). |
| `disable()` | Disable the control bar (non-interactive, dimmed). |
| `reset()` | Reset state (call before loading a new stream). |
| `setMuted(muted)` | Set the muted visual state (`true` / `false`). Does **not** touch the player — use `syncMuteState()` for that. |
| `syncMuteState()` | Re-apply the control bar's current volume/mute state to the player. Call after attaching a new source. |
| `destroy()` | Remove all event listeners and remove the controlbar DOM from the page. |

### Typical Lifecycle

```js
// Create
const cb = new ControlBar(player, video);
cb.init('#video-wrapper');
cb.disable();

// On stream initialized
cb.enable();

// Before loading a new stream
cb.reset();
cb.disable();

// After loading
cb.syncMuteState();

// On stream initialized again
cb.enable();

// Cleanup
cb.destroy();
```

### Theming

The controlbar defines two CSS custom properties with sensible defaults:

| Variable | Default | Description |
|---|---|---|
| `--cb-accent` | `#5b8def` | Accent colour (seekbar played, menu highlights) |
| `--cb-danger` | `#e74c3c` | Danger colour (live-edge indicator) |

Override them on the `.cb-controlbar` selector or any ancestor:

```css
/* Example: use the reference player's theme variables */
.cb-controlbar {
    --cb-accent: var(--rp-accent);
    --cb-danger: var(--rp-danger);
}
```

### Legacy Controlbar

The older Akamai controlbar is still available at
[`contrib/akamai/controlbar/`](../akamai/controlbar/) for legacy sample pages
that use `<script>` tags instead of ES modules.
