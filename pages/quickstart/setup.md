---
layout: default
title: Setup
parent: Quickstart
nav_order: 2
---

# Setup

The standard setup method uses JavaScript to initialize and provide video details to dash.js. 

## Examples
Multiple examples showcasing the different ways to initialize the player are available in
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/).

## Standard Setup

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

## Alternative Setup

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
