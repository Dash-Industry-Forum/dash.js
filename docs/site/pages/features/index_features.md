---
title: Feature Overview
---

# Feature Overview

The work in dash.js is closely aligned with the work on
the [DASH Interoperability Points](https://dashif.org/guidelines/iop-v5/) and
the [DASH Live Simulator 2](https://github.com/Dash-Industry-Forum/livesim2)
in [DASH-IF](https://www.svta.org/working-group/dash-if/).

## DASH-IF IOP Alignment

| IOP Documentation                                                                                                                           | dash.js                                                                                                              | LiveSim 2                                                                                              |
|---------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| [Live2VoD](http://dashif.org/DASH-IF-IOP/live2vod)                                                                                          | Supported                                                                                                            | Supported                                                                                              |
| [L3D](http://dashif.org/DASH-IF-IOP/l3d)                                                                                                    | Supported, see also [here](../usage/low-latency.html)                                                                | Supported via chunked delivery (`chunkdur`) and `availabilityTimeOffset`                               |
| [Content Steering](http://dashif.org/DASH-IF-IOP/content-steering)                                                                          | Supported but needs some updates to be compliant with version 1.0.0. See also [here](../usage/content-steering.html) | Supported: multiple service locations, trigger and rotate modes, `queryBeforeStart`                    |
| [MPD Patch](http://dashif.org/DASH-IF-IOP/mpd-patch)                                                                                        | Supported, see also [here](../usage/mpd-patching.html)                                                               | Supported via configurable Patch TTL                                                                   |
| [CMCD](http://dashif.org/DASH-IF-IOP/cmcd)                                                                                                  | Version 1 fully supported, version 2 including event and response mode reporting, see also [here](../usage/cmcd.html) | Not supported                                                                                          |
| [CMSD](https://docs.google.com/document/d/1CB1QJd_gz9km1lCr1HOdo1s_JZuACVtoy6yi6bE9Dfw/edit?usp=drive_link)                                 | Implementation completed for two attributes `etp` and `mb`, see also [here](../usage/cmsd.html)                     | Not supported                                                                                          |
| [Variable Substitution / DASH Annex I](https://docs.google.com/document/d/1rFvEMFsqz6FZk4ldSFRpnnIfxRkgWE7q1pqvJMJcjD0/edit?usp=drive_link) | Basic support, no support for templating mechanism. See also [here](../usage/flexible-insertion-url-parameters.html) | Supported: query parameters are propagated to segment requests                                         |
| [Server Guided Ad Insertion](https://docs.google.com/document/d/1JY6BXFj2YR9yNqqI6hyDq9_hc2BQ0E8LsDHhHhurWdw/edit?usp=sharing)              | Not supported                                                                                                        | Supported: DASH 6th edition Alternative-MPD Replace events, break schedules, skippability signaling    |
| DRM / CPIX                                                                                                                                  | Supported, see also [here](../usage/drm.html)                                                                        | Supports on-the-fly encryption (ECCP `cbcs`/`cenc`) and EZDRM (Widevine, PlayReady, FairPlay)          |
| LC-EVC                                                                                                                                      | Basic support, see also [here](../usage/lcevc.html)                                                                  | Not supported                                                                                          |

## dash.js Features

### Core Playback

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| VoD and live playback              | MPEG-DASH playback via the Media Source Extensions (MSE)                                       |
| Multi-period streams               | Seamless transitions between periods, see [Multiperiod Streams](../usage/multiperiod.html)     |
| Track selection                    | Initial and runtime selection by language, role, codec and custom filters, see [Track Selection](../usage/track-selection.html) |
| Gap handling                       | Automatic detection and handling of buffer gaps and missing segments                          |
| Microsoft Smooth Streaming         | Playback of Smooth Streaming assets via a separate bundle, see [MSS](../usage/mss.html)        |
| Multiple players per page          | Each `MediaPlayer` instance runs in its own scope                                              |

### Live & Low Latency

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| Low latency streaming              | CMAF chunked transfer playback with configurable target latency, see [Low Latency](../usage/low-latency.html) |
| Catchup mechanisms                 | Playback rate adjustment to reach and hold the live edge                                       |
| Clock synchronization              | `UTCTiming` support to align client and server clocks, see [Clock Synchronization](../usage/clock-sync.html) |
| MPD patching                       | Delta manifest updates instead of full MPD reloads, see [MPD Patching](../usage/mpd-patching.html) |
| Live streaming settings            | Time-shift buffer, live delay and update handling, see [Live Streaming](../usage/live-streaming.html) |

### Adaptive Bitrate (ABR)

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| Default ABR rules                  | ThroughputRule, BolaRule, InsufficientBufferRule, SwitchHistoryRule, DroppedFramesRule, AbandonRequestRule, see [ABR](../usage/abr/index.html) |
| Low latency ABR rules              | L2A and LoL+ for chunked low latency streams                                                   |
| Custom rules                       | Own ABR rules are pluggable via the rules API                                                  |
| Manual quality selection           | Explicit representation selection per media type, see [Manual Quality Selection](../usage/abr/manual-quality-selection.html) |
| Buffer management                  | Configurable buffer targets and pruning, see [Buffer Management](../usage/buffer-management.html) |

### DRM & Content Protection

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| Key systems                        | Widevine, PlayReady, FairPlay and ClearKey via the Encrypted Media Extensions (EME), see [DRM](../usage/drm.html) |
| Encryption schemes                 | CENC (`cenc`) and CBCS (`cbcs`)                                                                |
| License configuration              | Custom license server URLs, request/response filters, priority per key system                  |
| Robustness levels                  | Configurable audio/video robustness                                                            |

### Subtitles & Captions

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| Segmented TTML / IMSC1             | Fragmented and non-fragmented TTML, see [Subtitles & Captions](../usage/subtitles-and-captions/index.html) |
| WebVTT                             | Including custom rendering, see [Custom WebVTT Rendering](../usage/subtitles-and-captions/custom-webvtt-rendering.html) |
| CEA-608/708                        | In-band closed captions embedded in the video stream                                           |
| External subtitles                 | Attaching external subtitle files at runtime                                                   |
| DVB font downloading               | Downloadable fonts signaled in the MPD, see [DVB Font Downloading](../usage/subtitles-and-captions/dvb-font-downloading.html) |

### Data, Events & Reporting

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| CMCD                               | Common Media Client Data version 1 and 2, see [CMCD](../usage/cmcd.html)                       |
| CMSD                               | Common Media Server Data (`etp`, `mb`), see [CMSD](../usage/cmsd.html)                         |
| MPD and inband events              | `EventStream` and `emsg` handling with application callbacks, see [Event Handling](../usage/event-handling.html) |
| Metrics and player events          | Extensive playback metrics and event API, see [Player Events](../usage/player-events.html)     |

### Advanced

| Feature                            | Notes                                                                                          |
|------------------------------------|------------------------------------------------------------------------------------------------|
| Content steering                   | Multi-CDN switching driven by a steering server, see [Content Steering](../usage/content-steering.html) |
| Network interceptors               | Custom request/response interceptors in the loading stack, see [Network Interceptor](../usage/network-interceptor.html) |
| URL parameter insertion            | DASH Annex I flexible insertion of URL parameters, see [Flexible Insertion of URL Parameters](../usage/flexible-insertion-url-parameters.html) |
| Preloading                         | Buffering content before a video element is attached, see [Preloading](../usage/preloading.html) |
| Thumbnails                         | Thumbnail tracks based on image adaptation sets, see [Thumbnails](../usage/thumbnails.html)    |
| LC-EVC                             | Basic support for LC-EVC enhanced streams, see [LCEVC](../usage/lcevc.html)                    |
| Offline playback                   | Downloading streams for offline playback                                                       |

## Testing with LiveSim2

[LiveSim2](https://github.com/Dash-Industry-Forum/livesim2) is the DASH-IF live source simulator. It turns VoD assets
into wall-clock synchronized, infinite live streams and is publicly hosted
at [livesim2.dashif.org](https://livesim2.dashif.org). The [URL generator](https://livesim2.dashif.org/urlgen/) allows
interactive configuration of test streams, which makes it a good companion for testing dash.js:

- **Segment addressing**: `SegmentTemplate` with `$Number$` or `$Time$`, and `SegmentTimeline` variants
- **Low latency**: chunked delivery with configurable chunk duration and `availabilityTimeOffset`
- **Multi-period**: configurable number of periods per hour, period continuity signaling
- **Timing**: all common `UTCTiming` methods (direct, HTTP head, xsdate, iso, NTP, SNTP)
- **Ad insertion**: SCTE-35 `emsg` events and Server-Guided Ad Insertion with Alternative-MPD Replace events
- **Subtitles**: generated `stpp` and `wvtt` subtitles for any number of languages, CEA-608 in-band captions
- **Encryption**: on-the-fly ECCP (`cbcs`/`cenc`) encryption and EZDRM integration (Widevine, PlayReady, FairPlay)
- **Content steering**: multiple service locations with trigger or rotate mode
- **MPD Patch**: delta manifest updates with configurable Patch TTL
- **Negative testing**: cyclic segment error codes (404/403) and traffic patterns (down, slow, hang) for robustness testing
- **CMAF ingest**: acts as a CMAF ingest source (version 1.1) pushing segments to a configurable destination
