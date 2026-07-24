---
title: Usage
---

# Usage

dash.js covers a wide set of use cases such as low latency streaming, DRM playback, multi-audio and multi-text playback
and many more.

We suggest to make yourself familiar with the basic concepts of dash.js. This includes understanding how to:

* [Add dash.js to your project](../quickstart/index.html)
* [Change the default Settings](settings.html)

Many samples demonstrating the dash.js features can be found in our
[sample section](https://reference.dashif.org/dash.js/nightly/samples/index.html).

The pages in this section explain the individual features of dash.js in detail, including code examples and links to
the corresponding samples:

## Playback basics

* [Settings](settings.html) - configure the player via `updateSettings()`
* [Player Events](player-events.html) - subscribe to state changes and metrics
* [Logging](logging.html) - configure log levels
* [Controlbar](controlbar.html) - add a UI control bar
* [Timing APIs](timing-apis.html) - playback time, seeking and start times

## Streaming types

* [Live Streaming](live-streaming.html) - live delay, player synchronization, dynamic to static transitions
* [Low Latency Streaming](low-latency.html) - CMAF low latency and catchup mechanisms
* [Multiperiod Streams](multiperiod.html) - period transitions and events
* [MPD Patching](mpd-patching.html) - incremental manifest updates
* [Clock Synchronization](clock-sync.html) - client/server clock sync for live playback
* [Microsoft Smooth Streaming](mss.html) - MSS playback support

## Adaptive streaming and buffering

* [Adaptive Bitrate Streaming](abr/index.html) - ABR rules, settings and custom rules
* [Buffer Management](buffer-management.html) - buffer targets and pruning

## Tracks and media

* [Track Selection](track-selection.html) - initial and runtime track selection, capability filtering
* [Subtitles & Captions](subtitles-and-captions/index.html) - TTML, WebVTT and CEA-608/708 handling
* [Thumbnails](thumbnails.html) - seekbar preview thumbnails
* [LCEVC](lcevc.html) - MPEG-5 Part 2 enhancement decoding

## Content protection

* [Digital Rights Management (DRM)](drm.html) - Widevine, PlayReady, FairPlay and ClearKey playback

## Data and reporting

* [Common Media Client Data (CMCD)](cmcd.html) - client-side metrics reporting
* [Common Media Server Data (CMSD)](cmsd.html) - server-side hints
* [Event handling](event-handling.html) - MPD and inband events

## Advanced

* [Content Steering](content-steering.html) - CDN switching
* [Network Interceptor](network-interceptor.html) - request/response interception
* [Flexible Insertion of URL Parameters](flexible-insertion-url-parameters.html) - CMCD-style query injection
* [Preloading](preloading.html) - buffering before a video element is attached
