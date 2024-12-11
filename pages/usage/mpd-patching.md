---
layout: default
title: MPD Patching
parent: Usage
---

# MPD Patching

MPF patching is a feature that was introduced in the fifth edition of the MPEG-DASH specification. Updates to the MPD
are provided through MPD patches. MPD patches only contain new information such as signaling an additional media
segment. In general MPD patching allows the addition, removal and update of information in the manifest.

The goal of MPD patching is to provide only mandatory MPD information to the client instead of sending the whole MPD again with each MPD
update. This can significantly reduce the size of the manifest updates and also reduce the parsing time on the client
side.

In the example illustration below the initial request to the MPD contained a reference to segments 1-3. If the client
performs a full MPD update again it will get the missing reference to segment 4 but also the references to segment 1-3
again. This creates overhead in terms of the size of the MPD update and also the parsing time on the client side. An MPD
patch only contains the reference to segment 4 being aware that the client already knows about segment 1-3.

![mpd-patching]({{site.baseurl}}/assets/images/mpd-patching.jpg)

## Example

An example of MPD patching can be found in
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/live-streaming/mpd-patching.html).
