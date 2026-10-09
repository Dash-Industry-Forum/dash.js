---
title: Playback Pipeline
---

# Playback Pipeline

The playback pipeline turns a parsed manifest into appended media segments. It is a hierarchy of controllers, each
with a single responsibility.

```mermaid
flowchart TD
    SC[StreamController] -->|one per period| ST[Stream]
    ST -->|one per media type| SPV[StreamProcessor video]
    ST --> SPA[StreamProcessor audio]
    ST --> SPT[StreamProcessor text]
    subgraph per StreamProcessor
        SCH[ScheduleController] -->|decides WHEN| FC[FragmentController]
        DH[DashHandler] -->|generates request| FC
        FC -->|loads via net stack| FL[FragmentLoader]
        FL --> BC[BufferController]
        BC --> SBS[SourceBufferSink]
    end
    SPV --> SCH
    SBS -->|append| MSE[(MediaSource Buffers)]
    BC -->|buffer level| ABR[AbrController + Rules]
    ABR -->|selected Representation| SCH
```

## The hierarchy

- **`StreamController`** — owns the set of `Stream` objects (one per DASH period), performs period transitions and
  stream switching, decides which stream is active. See [Multiperiod Streams](../../usage/multiperiod.html).
- **`Stream`** — represents one period. Creates and manages one `StreamProcessor` per media type present in the
  period (video, audio, text) and coordinates their activation.
- **`StreamProcessor`** — the workhorse for one media type. Owns the schedule/load/append loop and the associated
  controllers.

## The schedule → load → append loop

For each media type the loop runs continuously:

1. **`ScheduleController`** decides *whether and when* the next segment should be requested — based on the buffer
   target levels, the playback state and whether a quality/track switch is pending.
2. **`DashHandler`** (dash layer) generates the concrete `FragmentRequest` for the current Representation — resolving
   templates, timelines and byte ranges.
3. **`FragmentController` / `FragmentLoader`** execute the request through the HTTP loading stack (`streaming/net/`),
   where request interceptors, CMCD reporting and retry handling are applied.
   See [Network Interceptor](../../usage/network-interceptor.html).
4. **`BufferController`** receives the loaded bytes, tracks buffer levels and pruning, and hands the data to
   **`SourceBufferSink`**, which appends it to the Media Source Extensions `SourceBuffer`.
5. Metrics collected along the way (throughput, buffer level, dropped frames) feed **`AbrController`** and its
   [rules](../../usage/abr/index.html), whose decisions flow back into the next scheduling iteration.

## Supporting controllers

- **`PlaybackController`** — wraps the video element: play/pause/seek, live delay, playback rate.
- **`MediaSourceController`** — creates and manages the `MediaSource` object and its lifecycle.
- **`GapController`** — detects and jumps buffer gaps to prevent stalls.
- **`CatchupController`** — low-latency catchup: adjusts playback rate to hold the live delay target.
  See [Low Latency Streaming](../../usage/low-latency.html).
- **`TimeSyncController`** — client/server clock synchronization for live streams.
  See [Clock Synchronization](../../usage/clock-sync.html).
