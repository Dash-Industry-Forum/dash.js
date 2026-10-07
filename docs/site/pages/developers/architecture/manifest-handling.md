---
title: Manifest Handling
---

# Manifest Handling

MPD parsing, models, and segment addressing live mainly in `dash/`. Manifest loading, refresh, capability filtering,
and BaseURL handling cross into `streaming/` and may operate on the parsed tree directly.

## Loading and parsing

`ManifestLoader` downloads the MPD (applying request interceptors and retry logic from the `net/` stack) and hands it
to the parser (`dash/parser/`), which converts the XML into a JavaScript object tree and resolves inherited values
(Period → AdaptationSet → Representation). `ManifestLoader` then delegates on-load XLink resolution to
`XlinkController`.

## The DashAdapter facade

`DashAdapter` is the main translation boundary between parsed MPD nodes and playback-facing value objects:

- The streaming layer asks `DashAdapter` for `StreamInfo` (periods), `MediaInfo` (tracks) and `Representation`
  objects — plain value objects that are independent of the MPD structure.
- Prefer `DashAdapter` when translating manifest data for the playback pipeline. Keep unavoidable raw-tree work in the
  dedicated loading, update, filtering, XLink, and BaseURL modules rather than adding ad hoc traversal to unrelated
  controllers.

## Live updates

For dynamic MPDs, `ManifestUpdater` derives the next refresh delay from `MPD@minimumUpdatePeriod` and the latency of
the previous update. `streaming.manifestUpdateRetryInterval` only controls how soon to retry when an update is still
in progress. Instead of full reloads, servers can also publish incremental updates via
[MPD Patching](../../usage/mpd-patching.html). When the manifest changes, updated `StreamInfo`/`MediaInfo` objects
propagate through `DashAdapter` and the [pipeline](playback-pipeline.html) adjusts — new periods are added, finished
ones removed, and a dynamic-to-static transition ends the live session
(see [Live Streaming](../../usage/live-streaming.html)).

## Segment request generation

`DashHandler` coordinates segment request generation for a Representation. The concrete addressing schemes are
implemented by the getters and loaders under `dash/utils/` and `dash/` for `SegmentTemplate`, `SegmentTimeline`,
`SegmentList`, and `SegmentBase`.
