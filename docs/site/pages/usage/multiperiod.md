---
title: Multiperiod Streams
---

# Multiperiod Streams

A DASH MPD can contain multiple `Period` elements. Each period defines its own set of Adaptation Sets and
Representations and can differ from the previous period, for instance in codecs, available tracks or content
protection. Multiperiod streams are commonly used for ad insertion and for concatenating different pieces of content
into a single presentation.

## How dash.js handles periods

dash.js supports multiperiod streams for both VoD and live content out of the box, no additional configuration is
required:

```js
const player = dashjs.MediaPlayer().create();
player.initialize(videoElement, mpdUrl, true);
```

Internally, dash.js creates one `Stream` object per period. When playback approaches a period boundary, the player
prepares the next period ahead of time and performs a seamless transition. The current track and quality settings are
re-applied after each transition: dash.js tries to continue with the same language, role and quality settings that were
active in the previous period.

## Period switch events

To get notified about period transitions, subscribe to the corresponding player events:

```js
player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_STARTED, (e) => {
    console.log('Switching from period', e.fromStreamInfo ? e.fromStreamInfo.index : null,
        'to period', e.toStreamInfo.index);
});

player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, (e) => {
    console.log('Now playing period', e.toStreamInfo.index);
});
```

- `PERIOD_SWITCH_STARTED` is triggered when the player starts the transition to a new period. The payload contains
  `fromStreamInfo` (`null` at playback start) and `toStreamInfo`.
- `PERIOD_SWITCH_COMPLETED` is triggered once the new period is active. The payload contains `toStreamInfo`.

The `streamInfo` objects expose useful information such as `id`, `index`, `start` and `duration` of the corresponding
period.

## Sample

- [Multiperiod VoD](https://reference.dashif.org/dash.js/nightly/samples/multiperiod/vod.html) - VoD stream with two
  periods.
- [Multiperiod live](https://reference.dashif.org/dash.js/nightly/samples/multiperiod/live.html) - Live stream with
  multiple periods.
