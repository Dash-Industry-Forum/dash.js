---
title: Preloading
---

# Preloading

dash.js can initialize streaming and start downloading media segments *before* the player is attached to an HTML5
video element. The downloaded data is kept in a virtual buffer and appended to the newly created Source Buffers once a
video element is attached. This is useful to optimize content insertion — for example pre-buffering the upcoming
content while an advertisement is still playing — especially on platforms that only provide a single decoder.

## Usage

Initialize the player without a video element, enable `cacheInitSegments` and call `preload()`:

```js
const player = dashjs.MediaPlayer().create();

// no video element yet: pass null as the view
player.initialize(null, mpdUrl, true);

player.updateSettings({
    streaming: {
        cacheInitSegments: true
    }
});

player.preload();
```

dash.js now downloads media segments into a virtual buffer. As soon as the application attaches a video element, the
buffered data is transferred and playback can start immediately:

```js
player.attachView(videoElement);
```

## Notes

- `preload()` throws a `SOURCE_NOT_ATTACHED_ERROR` if it is called before a source was set via `initialize()` or
  `attachSource()`.
- `streaming.cacheInitSegments` must be enabled so the init segments can be re-appended to the real Source Buffers
  after the view is attached.
- Calling `preload()` has no effect if a video element is already attached or streaming was already initialized.

## Sample

- [Preload content](https://reference.dashif.org/dash.js/nightly/samples/advanced/preload.html) - preloads into a
  virtual buffer, playback starts when "Attach View" is clicked.
