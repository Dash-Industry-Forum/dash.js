---
title: Event Bus & Wiring
---

# Event Bus & Wiring

Modules in dash.js communicate through two channels: the **EventBus** for anything event-shaped, and explicit
**`setConfig({...})`** wiring for hard dependencies.

## EventBus

The event bus (`src/core/EventBus.js`) is a context-scoped singleton — each player instance has its own:

```js
const eventBus = EventBus(context).getInstance();

eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, { mediaType, bufferLevel });
```

Subscriptions support priorities. A listener registered with `EVENT_PRIORITY_HIGH` (5000) runs before the default
`EVENT_PRIORITY_LOW` (0) listeners — internal controllers use this when ordering matters:

```js
eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, instance, { priority: EventBus.EVENT_PRIORITY_HIGH });
```

`once()` registers a self-removing listener, and `trigger()` accepts filters (e.g. `streamId`, `mediaType`) so
listeners only receive events for their own stream or media type.

## Three event surfaces

| Surface | Defined in | Audience |
|:--------|:-----------|:---------|
| Core events | `src/core/events/` (`Events.js`, `CoreEvents.js`) | Internal module-to-module communication. Not part of the public API — may change without notice. |
| MediaPlayer events | `src/streaming/MediaPlayerEvents.js` | Public API. Applications subscribe via `player.on(dashjs.MediaPlayer.events.X, ...)`. See [Player Events](../../usage/player-events.html). |
| Protection events | `src/streaming/protection/ProtectionEvents.js` | Public DRM-related events (license requests, key statuses). |

Applications should only rely on `MediaPlayerEvents` and `ProtectionEvents`.

## Explicit wiring via setConfig

Hard dependencies are passed explicitly. During initialization, the creating module injects the collaborators a module
needs:

```js
gapController.setConfig({
    settings,
    playbackController,
    streamController,
    videoModel,
    timelineConverter,
    adapter
});
```

This keeps the dependency graph visible and testable — unit tests replace collaborators with mocks
(`test/unit/mocks/`) by calling `setConfig()` with test doubles.

**Rule of thumb:** state changes and notifications go over the EventBus; direct queries and commands go through
injected references.
