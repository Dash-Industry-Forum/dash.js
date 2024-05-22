---
layout: default
title: Timing APIs
parent: Advanced Features
---

## Playback Time

dash.js exposes multiple API endpoints in the `MediaPlayer` class to query the current playback position and information
about the DVR window. Examples for VoD and live playback are illustrated in the sections below.

All methods available via the `player` instance, as an example:

````js
var video = document.querySelector('video');
var player = dashjs.MediaPlayer().create();
player.initialize(video, url, false);
var time = player.time();
````

### VoD

![playback-time-vod]({{site.baseurl}}/assets/images/time-api-vod.jpg)

| API call         | Description                                                                                                                                                                                    |
|:-----------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| 
| `time()`         | Returns the current playback time relative to playback start (usually 0).                                                                                                                      | 
| `time(periodId)` | Returns the current playback time relative to the period specified in `periodId`.                                                                                                              | 
| `duration()`     | Returns the total duration of the content.                                                                                                                                                     | 
| `getDvrWindow()` | Returns the `start`, the `end` and the `size` of the DVR window. For VoD content all media segments are available. Consequently, the DVR windows spans over the whole duration of the content. | 

### Live

![playback-time-live]({{site.baseurl}}/assets/images/time-api-live.jpg)

| API call            | Description                                                                                                                                            |
|:--------------------|:-------------------------------------------------------------------------------------------------------------------------------------------------------| 
| `time()`            | Returns the current playback time relative to playback start (availability start time).                                                                | 
| `time(periodId)`    | Returns the current playback time relative to the period specified in `periodId`.                                                                      | 
| `timeAsUtc()`       | Returns the current playback time relative to midnight UTC, Jan 1 1970                                                                                 | 
| `timeInDvrWindow()` | Returns the current playback time relative to the start of the DVR window.                                                                             | 
| `duration()`        | Returns the size of the DVR window: `DVRWindow.end - DVRWindow.start`.                                                                                 | 
| `getDvrWindow()`    | Returns the `start`, `startAsUtc`, the `end`, `endAsUtc` and the `size` of the DVR window. For live content media segments become available over time. | 

## Seeking

dash.js provides two API endpoints to change the current playback position, namely `seek()`
and `seekToPresentationTime()`. Both methods are available via the `MediaPlayer` class. As an example:

````js
var video = document.querySelector('video');
var player = dashjs.MediaPlayer().create();
player.initialize(video, url, false);
player.seek(10)
````

While the `seek()` method expects values relative to `DVRWindow.start` the `seekToPresentationTime()` works with
absolute presentation timestamps. Two examples to illustrate this behavior are depicted in the sections below.

### VoD

For VoD playback both `seek()` and `seekToPresentationTime()` work in the same way and can be used interchangeable. This
is due to the fact the DVR window for VoD spans over the whole duration of the content.

![playback-time-vod]({{site.baseurl}}/assets/images/seek-api-vod.jpg)

### Live

For live playback the `seek()` method expects values relative to the start of the DVR window.
Internally `DVRWindow.start` is added to the provided value. The `seekToPresentationTime()` method uses absolute presentation timestamps.

![playback-time-vod]({{site.baseurl}}/assets/images/seek-api-live.jpg)

As an example, the following two code snippets each trigger a seek 20 seconds behind the live edge.

##### seek()
````js
var video = document.querySelector('video');
var player = dashjs.MediaPlayer().create();
player.initialize(video, url, false);
var duration = player.duration()
player.seek(duration - 20);
````

##### seekToPresentationTime()
````js
var video = document.querySelector('video');
var player = dashjs.MediaPlayer().create();
player.initialize(video, url, false);
var dvrWindowEnd = player.getDvrWindow().end
player.seekToPresentationTime(dvrWindowEnd - 20);
````
