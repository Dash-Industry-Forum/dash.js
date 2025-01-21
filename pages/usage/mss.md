---
layout: default 
title: Microsoft Smooth Streaming 
parent: Usage
---

# Microsoft Smooth Streaming

## Description

In adition to playback of MPEG-DASH content, dash.js supports playback of the legacy Smooth Streaming format. For that reason,
a conversion of the Smooth Streaming manifest files and media segments is performed directly in dash.js on the client side.

## Example
An example is available as part of
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/smooth-streaming/mss.html).

## dash.js usage
The Smooth Streaming layer in dash.js is implemented as a separate module. To enable Smooth Streaming support in dash.js
import `dash.mss.min.js` or `dash.mss.debug.js` right after the main build files:

```xml
<script src="../../dist/umd/dash.all.debug.js"></script>
<!-- add mss package which is required to play Smooth Streaming streams -->
<script class="code" src="../../dist/umd/dash.mss.debug.js"></script>
```

Initialization of dash.js for Smooth Streaming is similar to initialization for DASH content:

```js
let video, player;

player = dashjs.MediaPlayer().create();
video = document.querySelector('video');
player.initialize(); /* initialize the MediaPlayer instance */
player.attachView(video); /* tell the player which videoElement it should use */
player.setProtectionData(protData); /* set protection data (sets license server when required) */
player.attachSource(streamUrl); /* provide the manifest source */
```

