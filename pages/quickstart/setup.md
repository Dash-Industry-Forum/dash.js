---
layout: default
title: Setup
parent: Quickstart
nav_order: 2
---

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# Setup

The standard setup method uses JavaScript to initialize and provide video details to dash.js.

## Examples

Multiple examples showcasing the different ways to initialize the player are available in
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/#Builds).

## UMD

### Standard Setup

Create a video element somewhere in your html. For our purposes, make sure the controls attribute is present.

```html

<video id="videoPlayer" controls></video>
```

Add dash.all.min.js to the end of the body.

```html

<body>
...
<script src="yourPathToDash/dash.all.min.js"></script>
</body>
```

Now comes the good stuff. We need to create a `MediaPlayer` and initialize it.

```javascript
var url = "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd";
var player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector("#videoPlayer"), url, true);
```

When it is all done, it should look similar to this:

```html
<!doctype html>
<html>
<head>
    <title>dash.js Rocks</title>
    <style>
        video {
            width: 640px;
            height: 360px;
        }
    </style>
</head>
<body>
<div>
    <video id="videoPlayer" controls></video>
</div>
<script src="yourPathToDash/dash.all.min.js"></script>
<script>
    (function () {
        var url = "https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd";
        var player = dashjs.MediaPlayer().create();
        player.initialize(document.querySelector("#videoPlayer"), url, true);
    })();
</script>
</body>
</html>
```

### Alternative Setup

An alternative way to setup the dash.js player on your web page is to use the MediaPlayerFactory. The MediaPlayerFactory
will automatically instantiate and initialize the MediaPlayer module on appropriately tagged video elements.

Create a video element somewhere in your html and provide the path to your `mpd` file as src. Also ensure that your
video element has the `data-dashjs-player` attribute on it.

```html

<video data-dashjs-player autoplay src="https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd" controls>
</video>

```

Add dash.all.min.js to the end of the body.

```html

<body>
...
<script src="yourPathToDash/dash.all.min.js"></script>
</body>
```

When it is all done, it should look similar to this:

```html
<!doctype html>
<html>
<head>
    <title>Dash.js Rocks</title>
    <style>
        video {
            width: 640px;
            height: 360px;
        }
    </style>
</head>
<body>
<div>
    <video data-dashjs-player autoplay src="https://dash.akamaized.net/envivio/EnvivioDash3/manifest.mpd" controls>
    </video>
</div>
<script src="yourPathToDash/dash.all.min.js"></script>
</body>
</html>
```

## ESM

You can also import dash.js as an ES module:

```html
<!doctype html>
<html>
<head>
    <title>dash.js Rocks</title>
    <style>
        video {
            width: 640px;
            height: 360px;
        }
    </style>
</head>
<body>
<div>
    <video id="videoPlayer" controls></video>
</div>
<script type="module">
    import {MediaPlayer} from 'https://cdn.dashjs.org/v5.0.0/modern/esm/dash.all.min.js';

    const player = MediaPlayer().create();
    player.initialize(document.querySelector('video'), 'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd', true);
</script>
</body>
</html>
```

## Typescript and Webpack

You can also use dash.js in your Typescript or Webpack based JavaScript project. Multiple examples can be found in the
`samples/modules` directory of the dash.js repository. A simple Typescript example is shown below. It also imports the
Smooth Streaming module that is not exported by default.

```typescript
import * as dashjs from 'dashjs';
import '../node_modules/dashjs/dist/modern/esm/dash.mss.min.js';

let url = "https://playready.directtaps.net/smoothstreaming/SSWSS720H264/SuperSpeedway_720.ism/Manifest";
let player = dashjs.MediaPlayer().create();
player.initialize(document.querySelector('#myMainVideoPlayer'), url, true);
```
