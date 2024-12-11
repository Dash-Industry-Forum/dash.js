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

To select an initial track prior to playback start use the `setInitialMediaSettingsFor()` function. The function takes
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


