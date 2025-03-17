---
layout: default
title: Track Selection
parent: Usage
---

# Track Selection

Some media streams offer multiple audio or video tracks. In MPEG-DASH this is done by placing the different tracks in
separate Adaptation Sets. dash.js allows the application to define an initial track at startup and switch between tracks
at runtime.

## Initial track selection
dash.js offers multiple ways to control the initial track selection as described below.

### Initial media settings

To select an initial track prior to the start of the playback based on specific media settings use the
`setInitialMediaSettingsFor()` function. The function takes
an object as input allowing you to define initial values such as the target language. For a detailed description of this
method checkout
our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html#setInitialMediaSettingsFor).

### Example

An example how to set the initial audio track by specifying the target language is shown below:

````js
player.initialize(videoElement, url, true);
player.setInitialMediaSettingsFor('audio', {
    lang: 'et-ET'
});
````

A working example can be found in
our [sample section](https://reference.dashif.org/dash.js/nightly/samples/multi-audio/multi-audio.html).

### Custom track selection function

You can also define your own custom track selection function. This function will be called by the player to determine
which track to select.

### Example

````js
 var getTrackWithLowestBitrate = function (trackArr) {
    let min = Infinity;
    let result = [];
    let tmp;

    trackArr.forEach(function (track) {
        tmp = Math.min.apply(Math, track.bitrateList.map(function (obj) {
            return obj.bandwidth;
        }));

        if (tmp < min) {
            min = tmp;
            result = [track];
        }
    });

    return result;
}

player.setCustomInitialTrackSelectionFunction(getTrackWithLowestBitrate);
````

A working example can be found in
our [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/custom-initial-track-selection.html)

### Changing the default track selection logic

dash.js offers various predefined approaches to select the initial track. By default, the `selectionPriority` attribute
from the MPD is used to determine which track to select. This logic can be disabled by adjusting the corresponding
settings
flag:

````js
player.updateSettings({
    streaming: {
        ignoreSelectionPriority: true
    }
})
````

The default track selection mode can be changed using the `selectionModeForInitialTrack` setting. The following modes
are supported:

| Mode                          | Description                                                                            |
|:------------------------------|:---------------------------------------------------------------------------------------|
| `highestBitrate`              | This mode makes the player select the track with a highest bitrate.                    |
| `firstTrack`                  | This mode makes the player select the first track found in the manifest                |
| `highestEfficiency` (default) | This mode makes the player select the track with the lowest bitrate per pixel average. |
| `widestRange`                 | This mode makes the player select the track with a widest range of bitrates.           |

### Example

````js
player.updateSettings({
    streaming: {
        selectionModeForInitialTrack: 'highestBitrate'
    }
})
````

## Track selection at runtime

To switch to a different track at runtime use the `setCurrentTrack(track)` method. You need to provide a valid track as
the input to this function. A list of all available tracks can be obtained by calling `getTracksFor()`.

### Example

````js
const targetIndex = 1;
const availableTracks = player.getTracksFor('audio');
const targetTrack = availableTracks[targetIndex];
player.setCurrentTrack(targetTrack);
````


