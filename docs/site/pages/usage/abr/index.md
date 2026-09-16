---
title: Adaptive Bitrate Streaming
---

# Adaptive Bitrate Streaming

Encoding and packaging the media content with multiple bitrates and resolutions enables adaptive media streaming.
Mediaplayers such as dash.js can dynamically switch between different bitrates and resolutions based on factors such as
the current throughput, the current buffer level and the resolution on the end device.

![ABR](/assets/images/abr.png)

dash.js has a flexible ABR decision logic in place that can be dynamically adjusted and extended. On the following pages
you can find information about the various settings that dash.js offers and how to plug in your own ABR algorithm:

* [ABR Settings](settings.html) - configure the ABR behavior and select the active algorithm
* [Manual quality selection](manual-quality-selection.html) - disable ABR and select qualities manually
* [Throughput Calculation](throughput-calculation.html) - how dash.js estimates the available bandwidth

## ABR Rules

The ABR decision logic is composed of individual rules. Each rule casts a switch request, the results are aggregated
into the final quality decision. The following pages describe the built-in rules in detail:

* [ThroughputRule](throughput-rule.html) - selects the quality based on the estimated throughput
* [BolaRule](bola-rule.html) - buffer based quality selection using the BOLA algorithm
* [InsufficientBufferRule](insufficient-buffer-rule.html) - avoids rebuffering by reacting to critical buffer levels
* [AbandonRequestRule](abandon-request-rule.html) - abandons segment downloads that take too long
* [DroppedFramesRule](dropped-frames-rule.html) - avoids qualities that cause dropped frames
* [SwitchHistoryRule](switch-history-rule.html) - penalizes qualities that were recently abandoned
* [L2A Rule](l2a.html) - learn2adapt rule for low latency streaming
* [LoL+ Rule](lol_plus.html) - low-on-latency rule set for low latency streaming
