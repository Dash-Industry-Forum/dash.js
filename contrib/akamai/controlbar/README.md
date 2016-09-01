## Steps for using ControlBar.js with Dash.js
##### PLEASE NOTE: If you are having layout issues please make sure you have css class .control-icon-layout added to the correct buttons or copy the HTML snippet below.

1. **Import CSS and JS**
```html
<link rel="stylesheet" href="../../contrib/akamai/controlbar/controlbar.css">
<script src="../../contrib/akamai/controlbar/ControlBar.js"></script>
```

2. **Add HTML Snippit**
```html
<div id="videoController" class="video-controller unselectable">
    <div id="playPauseBtn" class="btn-play-pause" title="Play/Pause">
        <span id="iconPlayPause" class="icon-play"></span>
    </div>
    <span id="videoTime" class="time-display">00:00:00</span>
    <div id="fullscreenBtn" class="btn-fullscreen control-icon-layout" title="Fullscreen">
        <span class="icon-fullscreen-enter"></span>
    </div>
    <div id="bitrateListBtn" class="control-icon-layout" title="Bitrate List">
        <span class="icon-bitrate"></span>
    </div>
    <input type="range" id="volumebar" class="volumebar" value="1" min="0" max="1" step=".01"/>
    <div id="muteBtn" class="btn-mute control-icon-layout" title="Mute">
        <span id="iconMute" class="icon-mute-off"></span>
    </div>
    <div id="trackSwitchBtn" class="control-icon-layout" title="A/V Tracks">
        <span class="icon-tracks"></span>
    </div>
    <div id="captionBtn" class="btn-caption control-icon-layout" title="Closed Caption">
        <span class="icon-caption"></span>
    </div>
    <span id="videoDuration" class="duration-display">00:00:00</span>
    <div class="seekContainer">
        <input type="range" id="seekbar" value="0" class="seekbar" min="0" step="0.01"/>
    </div>
</div>
```
3. **Create ControlBar.js** 

```js
player.attachView(video);
var controlbar = new ControlBar(player); //Player is instance of Dash.js MediaPlayer;
controlbar.initialize();
```
4. **Helpful API Call**
```js
controlbar.reset();
controlbar.show();
controlbar.hide();
controlbar.disable();
controlbar.enable();
```