---
layout: default 
title: Player Events 
parent: Usage
---

# Player Events

dash.js dispatches various events during playback to inform the application about changes of the playback state and
metrics being added or updated. A complete list of the available events can be
found [here](https://cdn.dashjs.org/latest/jsdoc/MediaPlayerEvents.html).

## Example

An example is available as part of
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/getting-started/listening-to-events.html).

## dash.js usage

To register for a specific event use the `on` method of the media player instance:

````js
player.on(dashjs.MediaPlayer.events.BUFFER_LOADED, showEvent);
````

The payload of the event is passed as an object to the callback function

````js
function showEvent(e) {
    log("Event received: " + e.type);
}
````

To remove the listener for an event use the `off` method:

````js
player.off(dashjs.MediaPlayer.events.BUFFER_LOADED, showEvent);
````

