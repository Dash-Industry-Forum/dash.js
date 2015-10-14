## Steps for using ControlBar.js with Dash.js

1. **Import CSS and JS**
```
<link rel="stylesheet" href="../../contrib/akamai/controlbar/controlbar.css">
<script src="../../contrib/akamai/controlbar/ControlBar.js"></script>
```

2. **Add HTML Snippit** 
  * Copy html from snippet.html and paste below the video element. (Note you may have to play a bit with element layout and/or css depending on your player)**
3. **Create ControlBar.js** 

```
player.attachView(video);
var controlbar = new ControlBar(player); //Player is instance of Dash.js MediaPlayer;
controlbar.initialize();
```
4. **Helpful API Call**
```
controlbar.reset();
controlbar.show();
controlbar.hide();
controlbar.disable();
controlbar.enable();
```
5. **Common CSS**
```
.caption-menu,
.video-controller {
    background-color: black;
}

.icon-play,
.icon-pause,
.icon-caption,
.icon-mute-off,
.icon-mute-on,
.icon-fullscreen-enter,
.icon-fullscreen-exit{
    font-size: 20px;
    color: white;
    text-shadow: none;
}
```