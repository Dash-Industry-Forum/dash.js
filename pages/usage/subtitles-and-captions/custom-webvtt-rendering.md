---
layout: default
title: Custom WebVTT Rendering
parent: Subtitles & Captions
grand_parent: Usage
nav_order: 0
---

# Description

Next to the default WebVTT rendering using the native browser APIs, dash.js also provides a way to use the `vtt.js`
library to render WebVTT subtitles. This allows for more customization and control over the rendering process.

# Setup

To enable custom WebVTT rendering we first need to enable the `customRenderingEnabled` flag in the settings:

```js
player.updateSettings({
    streaming: {
        text: {
            webvtt: {
                customRenderingEnabled: true
            }
        }
    }
})
```

Next we add add an HTML `<div>` element as the target container for rendering the subtitles:

```html

<video preload="auto" muted=""></video>
<div style="position: relative">
    <div id="vtt-rendering-div" style="min-width: 600px; min-height: 100px;"></div>
</div>
```

Now, we can attach the `<div>` element to the dash.js player:

```js
let vttRenderingDiv = document.querySelector("#vtt-rendering-div");
player.attachVttRenderingDiv(vttRenderingDiv) 
```

Finally we need to include the `vtt.js` library in our HTML file. The library is part of the `contrib` folder of
dash.js:

```html

<script src="../../contrib/videojs-vtt.js/vtt.min.js"></script>
```

# Example

A complete working example can be found in
our [sample section](https://reference.dashif.org/dash.js/nightly/samples/captioning/vttjs.html).
