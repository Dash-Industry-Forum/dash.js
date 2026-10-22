---
title: Error Model
---

# Error Model

dash.js distinguishes strictly between runtime errors and API misuse.

## Runtime errors are events

Anything that goes wrong during playback — manifest download failures, segment timeouts, DRM key errors, capability
mismatches — is dispatched as a `DashJSError` object via the public `ERROR` event. The player never throws for
runtime problems:

```js
player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
    console.error('code', e.error.code, 'message', e.error.message, e.error.data);
});
```

A `DashJSError` carries a numeric `code`, a human-readable `message` and an optional `data` payload with context.

### Error code families

| Family | Defined in | Examples |
|:-------|:-----------|:---------|
| Core/download errors | `src/core/errors/Errors.js` | manifest parsing/loading failures, xlink failures, segment index errors |
| Protection errors | `src/streaming/protection/errors/ProtectionErrors.js` | key session, license request and server certificate errors (codes 100+) |
| MSS errors | `src/mss/errors/MssErrors.js` | Smooth Streaming specific failures |
| Offline errors | `src/offline/errors/OfflineErrors.js` | download/storage failures for offline playback |

All error classes extend `ErrorsBase`; the constants are exported on `dashjs.MediaPlayer.errors`, so applications can
compare codes symbolically:

```js
player.on(dashjs.MediaPlayer.events.ERROR, (e) => {
    if (e.error.code === dashjs.MediaPlayer.errors.MANIFEST_LOADER_LOADING_FAILURE_ERROR_CODE) {
        // manifest could not be loaded — maybe retry with a backup URL
    }
});
```

## API misuse throws synchronously

Calling MediaPlayer methods in an invalid state — for example before `initialize()`, or `preload()` before
`attachSource()` — throws immediately with a descriptive error such as `MEDIA_PLAYER_NOT_INITIALIZED_ERROR` or
`SOURCE_NOT_ATTACHED_ERROR`. The same applies to invalid argument types: setters validate their input and throw
`Constants.BAD_ARGUMENT_ERROR` style errors synchronously.

**Rule of thumb:** if the problem is *your code*, dash.js throws; if the problem is *the stream, the network or the
platform*, dash.js dispatches an `ERROR` event.
