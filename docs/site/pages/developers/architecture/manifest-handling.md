---
title: Manifest Handling
---

# Manifest Handling

Everything MPD-related lives in the `dash/` layer. The rest of the player never touches the parsed manifest directly.

## Loading and parsing

`ManifestLoader` downloads the MPD (applying request interceptors and retry logic from the `net/` stack) and hands it
to the parser (`dash/parser/`), which converts the XML into a JavaScript object tree, resolving inheritance
(Period → AdaptationSet → Representation), `xlink` references and SegmentTemplate/SegmentTimeline structures.

## The DashAdapter facade

`DashAdapter` is the single point of access to the parsed manifest for the streaming layer:

- The streaming layer asks `DashAdapter` for `StreamInfo` (periods), `MediaInfo` (tracks) and `Representation`
  objects — plain value objects that are independent of the MPD structure.
- **Rule:** streaming code must not reach into the raw parsed MPD. If a new piece of manifest data is needed, it is
  exposed through `DashAdapter` and the value objects. This keeps the manifest format encapsulated in one layer (and
  is what allows the `mss/` module to feed Smooth Streaming manifests into the same pipeline).

## Live updates

For dynamic MPDs, `ManifestUpdater` refreshes the manifest periodically — the refresh interval comes from
`MPD@minimumUpdatePeriod` and can be tuned via settings. Instead of full reloads, servers can also publish incremental
updates via [MPD Patching](../../usage/mpd-patching.html). When the manifest changes, updated `StreamInfo`/`MediaInfo`
objects propagate through `DashAdapter` and the [pipeline](playback-pipeline.html) adjusts — new periods are added,
finished ones removed, and a dynamic-to-static transition ends the live session
(see [Live Streaming](../../usage/live-streaming.html)).

## Segment request generation

`DashHandler` translates "give me the next segment for this Representation" into a concrete URL and byte range —
resolving `SegmentTemplate` placeholders, walking `SegmentTimeline` entries, or using `SegmentBase` index ranges. It
is the only place where segment addressing schemes are implemented.
