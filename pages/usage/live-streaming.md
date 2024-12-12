---
layout: default
title: Live Streaming
parent: Usage
---

# Live Streaming

## Setting the live delay

In addition to the [buffer settings](buffer-management.html) the live delay plays a significant role in live
streaming. The live delay is the time difference between the live edge and the playback position. The live delay can be
set by the application in two ways: by setting the `liveDelay` or by setting the `liveDelayFragmentCount`.

The `liveDelay` is the time in seconds that the player should be behind the live edge. The `liveDelayFragmentCount` is
the number of fragments that the
player should be behind the live edge. The `liveDelay` has precedence over the `liveDelayFragmentCount`.

The`useSuggestedPresentationDelay` is a boolean that indicates whether the player should use the suggested presentation
delay from the MPD if defined. The suggested presentation delay is the time in seconds that the player should be behind
the live
edge. Explicit live delay settings by the appilication using the `liveDelay` and the `liveDelayFragmentCount` take
precedence over the `useSuggestedPresentationDelay`.

### Configuration Options

````js
player.updateSettings({
    streaming: {
        delay: {
            liveDelayFragmentCount: NaN,
            liveDelay: NaN,
            useSuggestedPresentationDelay: true
        }
    },
})
````

### Examples

Multiple examples demonstrating the live delay settings can be found in
the [live section](https://reference.dashif.org/dash.js/nightly/samples/index.html#Live) of the dash.js sample page.

## Synchronizing multiple players

In some scenarios it makes sense to synchronize multiple players. This can be achieved by defining the same live delay
for all instances and enabling catchup mode. In the example configuration below the live delay is set to 10 seconds and
the live catchup mode is enabled. As a result both player instances will play roughly at the same position.

````js
player.updateSettings({
    streaming: {
        delay: {
            liveDelay: 10
        },
        liveCatchup: {
            enabled: true
        }
    },
})
````

An example illustrating how to synchronize multiple players is available in
the [live section](https://reference.dashif.org/dash.js/nightly/samples/live-streaming/synchronized-live-playback.html)
of the dash.js sample page.
