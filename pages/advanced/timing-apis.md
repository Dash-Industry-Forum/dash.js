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

### VoD

### Live

