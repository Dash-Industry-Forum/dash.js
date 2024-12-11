---
layout: default
title: Basic Subtitle Handling
parent: Subtitles & Captions
grand_parent: Usage
nav_order: 0
---

<details  markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# Basic Subtitle Handling

Many examples can be found in
our [samples section](https://reference.dashif.org/dash.js/latest/samples/index.html#SubtitlesandCaptions).

## Enabling / Disabling by default

Subtitles can be enabled and disabled by default by changing the `defaultEnabled` property:

````js
player.updateSettings({
    streaming: {
        text: {
            defaultEnabled: true
        }
    }
});
````

## Initial track selection

The initial language or role can be set using the `setInitialMediaSettingsFor` method. Please refer to
the [track selection](../track-selection.html#initial-track-selection) documentation for details.

A working sample can be
found [here](https://reference.dashif.org/dash.js/nightly/samples/captioning/multi-track-captions.html).

## Track selection at runtime

To select a specific text track during playback use the `setTextTrack` method. You need to provide a valid index of a
track. To disable the texttrack rendering pass `-1` to the `setTextTrack` method.

```` js
var textTrackList = {};
var streamId = null;
var _onTracksAdded = function (e) {
    if (!textTrackList[e.streamId]) {
        textTrackList[e.streamId] = [];
    }
    
    streamId = e.streamId;

    textTrackList[e.streamId] = textTrackList[e.streamId].concat(e.tracks);
};

player.on(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, _onTracksAdded, this);
var item = textTrackList[streamId][0];
player.setTextTrack(item.index);
````

Another way to change the texttrack is to use the `setCurrentTrack` method. For details refer to
the [track selection](../track-selection.html#track-selection-at-runtime) documentation.
