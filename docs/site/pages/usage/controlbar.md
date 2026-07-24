---
title: Controlbar
---

# Controlbar

dash.js ships with a self-contained, reusable control bar located in `contrib/controlbar`. It generates its own DOM
structure, so you only need to provide a wrapper element. The control bar implements the various APIs of the player —
play/pause, seeking, volume, live edge, bitrate and track selection — and is used by the
[DASH-IF Reference Player](https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html).

## Example

An example is available as part of the
[sample section](https://reference.dashif.org/dash.js/nightly/samples/getting-started/controlbar.html).

## Prerequisites

- **dash.js** loaded (the global `dashjs` object must be available)
- **Bootstrap Icons** CSS for icon display:

```html
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1/font/bootstrap-icons.min.css" rel="stylesheet">
```

## Usage

Include the control bar CSS:

```html
<link rel="stylesheet" href="path/to/contrib/controlbar/controlbar.css">
```

Provide a wrapper element in your HTML (must have `position: relative`):

```html
<div id="video-wrapper" style="position: relative;">
    <video id="video-element"></video>
</div>
```

Import and initialize the control bar as an ES module after initializing the player:

```js
import { ControlBar } from 'path/to/contrib/controlbar/ControlBar.js';

const player = dashjs.MediaPlayer().create();
const video = document.getElementById('video-element');
player.initialize(video, url, true);

const controlbar = new ControlBar(player, video);
controlbar.init(document.getElementById('video-wrapper'));
controlbar.enable();
```

## API

```js
new ControlBar(player, videoElement)
```

| Parameter      | Type                      | Description                                    |
|:---------------|:--------------------------|:-----------------------------------------------|
| `player`       | `dashjs.MediaPlayerClass` | A dash.js MediaPlayer instance                 |
| `videoElement` | `HTMLVideoElement`        | The `<video>` element managed by the player    |

| Method            | Description                                                                                                                       |
|:------------------|:----------------------------------------------------------------------------------------------------------------------------------|
| `init(wrapper)`   | Build the DOM and inject it into the given wrapper element (or CSS selector string). The wrapper should have `position: relative`. |
| `enable()`        | Enable the control bar (interactive).                                                                                              |
| `disable()`       | Disable the control bar (non-interactive, dimmed).                                                                                 |
| `reset()`         | Reset state (call before loading a new stream).                                                                                    |
| `setMuted(muted)` | Set the muted visual state (`true` / `false`). Does **not** touch the player — use `syncMuteState()` for that.                     |
| `syncMuteState()` | Re-apply the control bar's current volume/mute state to the player. Call after attaching a new source.                             |
| `destroy()`       | Remove all event listeners and remove the control bar DOM from the page.                                                           |

## Typical lifecycle

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

## Theming

The control bar defines two CSS custom properties with sensible defaults:

| Variable      | Default   | Description                                     |
|:--------------|:----------|:------------------------------------------------|
| `--cb-accent` | `#5b8def` | Accent colour (seekbar played, menu highlights)  |
| `--cb-danger` | `#e74c3c` | Danger colour (live-edge indicator)              |

Override them on the `.cb-controlbar` selector or any ancestor:

```css
.cb-controlbar {
    --cb-accent: #1a73c9;
    --cb-danger: #e74c3c;
}
```

## Legacy controlbar

The older Akamai control bar is still available at `contrib/akamai/controlbar/` for legacy integrations that use
`<script>` tags instead of ES modules. It requires you to provide the full control bar DOM yourself and is initialized
via `new ControlBar(player)` + `controlbar.initialize()`.
