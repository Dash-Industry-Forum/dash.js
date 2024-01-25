---
layout: default
title: Adaptive Bitrate Streaming
parent: Advanced Features
has_children: true
---

# Adaptive Bitrate Streaming

Encoding and packaging the media content with multiple bitrates and resolutions enables adaptive media streaming.
Mediaplayers such as dash.js can dynamically switch between different bitrates and resolutions based on factors such as
the current throughput, the current buffer level and the resolution on the end device.

![ABR]({{site.baseurl}}/assets/images/abr.png)

dash.js has a flexible ABR decision logic in place that can be dynamically adjusted and extended. On the following pages
you can find information about the various settings that dash.js offers and how to plug in your own ABR algorithm.
