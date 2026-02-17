# DASH.js Core Architecture Documentation

This document describes the architecture and relationships between the most important classes in the DASH.js streaming stack: **StreamController**, **StreamProcessor**, **RepresentationController**, **ScheduleController**, **BufferController**, and **PlaybackController**. It is intended to help new developers understand the high-level design and dependencies in the streaming pipeline.

---

## 1. StreamController

**Role:**
The `StreamController` is the central orchestrator for managing media streams. It is responsible for initializing, switching, and updating streams (periods) during playback. It coordinates the creation and lifecycle of `StreamProcessor` instances for each media type (audio, video, text, etc.) and handles stream events such as period transitions and manifest updates.

**Key Dependencies:**
- Manages multiple `StreamProcessor` instances (one per media type per period).
- Listens to and dispatches events to/from `PlaybackController`.
- Coordinates with `ScheduleController` for segment scheduling.
- Interacts with `BufferController` for buffer management.

**Main Responsibilities:**
- Stream (period) initialization and switching
- Orchestrating the start/stop of processors
- Handling manifest updates and period transitions
- Managing event flow between controllers

---

## 2. StreamProcessor

**Role:**
The `StreamProcessor` handles all logic for a single media type (e.g., video, audio, text) within a stream (period). It is responsible for segment selection, adaptation, and communication with lower-level controllers.

**Key Dependencies:**
- Owns a `RepresentationController` for managing available representations (qualities).
- Owns a `ScheduleController` for scheduling segment downloads.
- Owns a `BufferController` for managing the media buffer.
- Communicates with `PlaybackController` for playback state.

**Main Responsibilities:**
- Managing adaptation logic for a media type
- Handling segment requests and responses
- Buffering and error handling for its media type

---

## 3. RepresentationController

**Role:**
The `RepresentationController` manages the set of available representations (qualities/bitrates) for a media type. It is responsible for switching between representations based on ABR (Adaptive Bitrate) logic and playback conditions.

**Key Dependencies:**
- Used by `StreamProcessor` to select and switch representations
- May interact with ABR logic and metrics modules

**Main Responsibilities:**
- Tracking available representations
- Handling representation switches
- Providing segment information for the selected representation

---

## 4. ScheduleController

**Role:**
The `ScheduleController` is responsible for scheduling the download of media segments. It ensures that the buffer is filled appropriately, taking into account playback rate, buffer state, and adaptation logic.

**Key Dependencies:**
- Used by `StreamProcessor` to manage segment download timing
- Interacts with `BufferController` to monitor buffer levels
- May use metrics and ABR logic for scheduling decisions

**Main Responsibilities:**
- Scheduling segment requests
- Avoiding buffer underflow/overflow
- Reacting to playback and buffer events

---

## 5. BufferController

**Role:**
The `BufferController` manages the media buffer for a specific media type. It handles appending segments to the buffer, monitoring buffer levels, and responding to buffer-related events (e.g., underflow, quota exceeded).

**Key Dependencies:**
- Used by `StreamProcessor` and `ScheduleController` for buffer management
- Communicates with `PlaybackController` for buffer state and playback position

**Main Responsibilities:**
- Appending and removing media segments
- Monitoring buffer health
- Handling buffer errors and recovery

---

## 6. PlaybackController

**Role:**
The `PlaybackController` manages the playback state of the media element. It tracks the current time, handles play/pause/seek operations, and dispatches playback events to other controllers.

**Key Dependencies:**
- Receives events from `StreamController` and `BufferController`
- Notifies `ScheduleController` and `StreamProcessor` of playback state changes

**Main Responsibilities:**
- Managing playback state (play, pause, seek)
- Tracking playback position and rate
- Dispatching playback events

---

## Class Dependency Overview

- **StreamController** is the top-level orchestrator, managing multiple **StreamProcessor** instances.
- Each **StreamProcessor** owns a **RepresentationController**, **ScheduleController**, and **BufferController** for its media type.
- **ScheduleController** and **BufferController** work closely to ensure smooth playback and buffer health.
- **PlaybackController** interacts with all controllers to propagate playback state and events.

```
StreamController
  └─ StreamProcessor (per media type)
       ├─ RepresentationController
       ├─ ScheduleController
       └─ BufferController
PlaybackController (communicates with all above)
```

---

This architecture enables modular, adaptive, and robust DASH streaming, allowing for efficient handling of multiple periods, media types, and dynamic adaptation to network and playback conditions.

