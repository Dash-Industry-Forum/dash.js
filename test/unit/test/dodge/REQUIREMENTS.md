# Dodge Unit Test Requirements

This document maps critical defense requirements to the unit tests that verify them.

---

## 1. ABR Rule Management

### R1.1 - Unsupported ABR rules are disabled at module load time

`registerExtensions()` calls `mediaPlayer.updateSettings()` once, disabling every built-in rule that is not in the `SUPPORTED_QUALITY_SWITCH_RULES` set (`l2ARule`, `loLPRule`) and every abandon fragment rule (`abandonRequestsRule`). Supported rules (`bolaRule`, `throughputRule`, `insufficientBufferRule`, `switchHistoryRule`, `droppedFramesRule`) are left untouched.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | ABR rule disabling in registerExtensions | calls updateSettings once |
| `dodge.DodgeHandler.js` | ABR rule disabling in registerExtensions | disables l2ARule, loLPRule, and abandonRequestsRule |
| `dodge.DodgeHandler.js` | ABR rule disabling in registerExtensions | does not disable supported rules |

### R1.2 - ABR quality check is enabled only at buffer events; it is disabled during all other downloads

After each partial segment download (init or data), `_scheduleAll(false, delay)` is called - quality check disabled. After a padding cycle, `_onPaddingLoaded` uses `e.bufferFlag` (not `e.buffer`) to control quality checks: `_scheduleAll(e.bufferFlag, delay)`. `bufferFlag` is true whenever the cycle's buffer field is active (boolean `true` or non-empty array), regardless of whether secondary events were flushed. This ensures quality checks run whenever anything is buffered, including with selective buffering. When a full segment with buffer results in INIT/MEDIA_FRAGMENT_LOADED, `_setQualityCheckAll(true)` is called before firing the event to enable quality checks; scheduling is left to the vanilla `_onBytesAppended` path (with random delay enforced by the ScheduleController override). Vanilla fragment loads bypass `_scheduleAll` entirely.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | INIT_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED with buffer flag: startScheduleTimer called, quality check enabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED without buffer flag: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | INIT_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, but quality check enabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, but quality check enabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | vanilla request: startScheduleTimer is never called |

---

## 2. Cycle-Based Downloading

### R2.1 - Init cycles are downloaded in sequence with correct flags

Each call to `getInitRequest()` advances `lastInitIndex` and sets `full = false, buffer = false` until the last init cycle, which sets `full = true, buffer = true`. Returns `null` without calling the parent for data-only (self-initialized) streams.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getInitRequest() does not call parent, returns a request object |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getInitRequest() sets full = false and buffer = false when more init cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getInitRequest() sets full = true and buffer = true on the last init cycle |
| `dodge.DodgeDashHandlerOverride.js` | Init-only streams (non-fragmented text) | getInitRequest() advances through init cycles normally |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | getInitRequest() returns null without calling parent |

### R2.2 - Data cycles are downloaded in sequence with correct flags

Each call to `getNextSegmentRequest()` advances `lastCycleIndex` and reflects the cycle's `buffer`, `padding`, and `trail` fields on the returned request. When `buffer` is a boolean, `request.buffer` is coerced to boolean. When `buffer` is an array of segment indices (selective buffer), `request.buffer` preserves the array value. `getSegmentRequestForTime()` also returns cycle requests for the matching segment.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() does not call parent, returns a request for cycle 0 segment |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() at a cycle without buffer, sets buffer = false on the request |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() at a cycle with buffer flag, sets buffer = true on the request |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() at a cycle with padding flag, sets padding = true on the request |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() at a trailing padding cycle sets trail = true |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getSegmentRequestForTime() in normal (non-trailing) state returns cycle request |
| `dodge.DodgeDashHandlerOverride.js` | Selective buffer (array buffer on data cycles) | getNextSegmentRequest() at a cycle with buffer = [0], sets buffer = [0] on the request |
| `dodge.DodgeDashHandlerOverride.js` | Selective buffer (array buffer on data cycles) | getNextSegmentRequest() at a cycle with buffer = [], sets buffer = [] on the request |

### R2.3 - Init-only (non-fragmented text) streams work correctly

Streams with no data array: `getNextSegmentRequest()` returns `null` without calling the parent and sets `mediaHasFinished = true`; `isLastSegmentRequested()` reflects that.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Init-only streams (non-fragmented text) | getNextSegmentRequest() returns null without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Init-only streams (non-fragmented text) | isLastSegmentRequested() returns false before getNextSegmentRequest() is called |
| `dodge.DodgeDashHandlerOverride.js` | Init-only streams (non-fragmented text) | isLastSegmentRequested() returns true after getNextSegmentRequest() sets mediaHasFinished |

### R2.4 - Data-only (self-initialized) streams work correctly

Streams with no init array: `getRemainingInitCycles()` returns 0 so the scheduler skips init; `getNextSegmentRequest()` and `isLastSegmentRequested()` behave normally.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | getRemainingInitCycles() returns 0 (scheduler skips init entirely) |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | getNextSegmentRequest() returns a request object normally |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | isLastSegmentRequested() returns false while cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | isLastSegmentRequested() returns true after all cycles consumed |

### R2.5 - All request methods delegate to the parent when no defense is active

When no extended manifest is loaded and strict mode does not apply, every request-generation method calls through to the parent DashHandler and returns its result. `getIsTrailing()` returns `false`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | getInitRequest() with null representation, delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | getInitRequest() with representation but no defended stream info, calls parent and returns its result |
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | getNextSegmentRequest() with no defended stream info, calls parent and returns its result |
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | getSegmentRequestForTime() with no defended stream info, calls parent and returns its result |
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | isLastSegmentRequested() with no defended stream info, calls parent and returns its result |
| `dodge.DodgeDashHandlerOverride.js` | Fallback with no extended manifest | getIsTrailing() with no defended stream info, returns false |

### R2.6 - `getNextSegmentRequestIdempotent` suppresses CMCD `nor`/`nrr` during defended playback

`DodgeDashHandlerOverride` overrides `getNextSegmentRequestIdempotent` to return `null` during defended playback. This function is called by `StreamProcessor.probeNextRequest()` -> `CmcdModel._probeNextRequest()` to populate the CMCD `nor` (Next Object Request) and `nrr` (Next Range Request) fields. Advertising the next cycle's URL or byte range is not desirable during defended playback. Returning `null` causes `CmcdModel` to omit both fields. Falls back to the parent when no extended manifest is active.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | with no defended stream info, delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | with defended stream info, returns null to suppress CMCD nor/nrr leak |

### R2.7 - `getLastSegment()` returns the override's segment during defended playback

The parent DashHandler's `lastSegment` is never updated during defended playback (the override's `getNextSegmentRequest` updates only the override's closure variable). Without this override, callers like `AbrController` and `StreamProcessor._handleDifferentSwitchTypes` receive `null`. The override's `getLastSegment()` returns the most recent non-padding segment from the cycle sequence.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | before any cycles consumed, returns null |
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | after non-padding cycle, returns that cycle's segment |
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | after padding cycle, returns the last non-padding segment |

### R2.8 - Defense state management

`updateDefendedStreamInfo()` looks up the representation's ID in the defense registry. Returns `true` when found. `resetInitialSettings()` clears override state and delegates to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | updateDefendedStreamInfo() returns true when stream is found |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | resetInitialSettings() clears state; with strictMode = false, subsequent getInitRequest() falls back to parent |

### R2.9 - Selective buffer: array buffer on data cycles flushes only matching pending segments

When `buffer` on a data cycle is an array of segment indices, only pending media events whose segment index is in the array are flushed as secondary events. Non-matching pending media events remain queued. The current segment itself is only buffered (fires `MEDIA_FRAGMENT_LOADED`) if its index is in the array; otherwise, it is queued and fires `MEDIA_FRAGMENT_PARTIAL`. Pending init events are never flushed by selective buffer (no index to match). An empty array behaves as `buffer: false` (no flush, full segment queued). Boolean `buffer: true` continues to flush all pending segments as before. On padding events, two separate fields are set: `bufferFlag` is `_isBufferActive(request.buffer)` (true for boolean `true` or non-empty array - used for quality check control), while `buffer` is `request.buffer === true && secondaryEvents.length == 0` (only true for boolean `true` with no secondary events flushed - used for mock buffer increment). With selective buffering (array), `buffer` is always `false` on padding events since the strict `=== true` check fails.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0]: flushes only pending index 0, leaves index 1 queued; current segment (not in array) also queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [1]: flushes only pending index 1, leaves index 0 queued; current segment (not in array) also queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0, 1]: flushes both pending segments; current segment index 2 (not in array) queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0, 2]: current segment index 2 is in array, so it is buffered |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [99]: no pending segments match, current segment not in array, queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer []: empty array behaves as buffer = false |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: padding event has bufferFlag true but buffer false (array buffer is not boolean true) |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: padding event has bufferFlag true but buffer false when secondary events flushed |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: pending init events are not flushed |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | boolean buffer true still flushes all pending segments |

### R2.10 - Per-cycle quality override on data cycles

When a data cycle carries an optional `quality` field, `DodgeDashHandlerOverride._resolveCycleRepresentation(currentRep, cycle)` resolves an alternate sibling representation via `adapter.getVoRepresentations(currentRep.mediaInfo)` - by ID for strings, or by array index for numbers. Both `getNextSegmentRequest` and `getSegmentRequestForTime` then re-query `segmentsController.getSegmentByIndex(effectiveRep, ...)` so that URL template expansion (`$Bandwidth$`, `$RepresentationID$`) and the request's `representation` / `bandwidth` fields reflect the alternate quality. This lets a defense conceal a large segment's size by fetching it at a lower quality. The `lastSegment` cache reuse guard requires both the absence of `cycle.quality` and `lastSegment.representation === representation`, so a stale segment from a previous override cycle cannot poison a subsequent non-override cycle at the same segment index.

On any resolution failure - no sibling representations available, string id not found, integer index out of range, or the alternate representation has no segment for `cycle.index` - the override logs at error level and **stalls** by returning `null` from `getNextSegmentRequest` / `getSegmentRequestForTime`. `lastCycleIndex` and `lastSegment` are not advanced, mirroring the existing "no segment found" behavior for non-override cycles. The override MUST NOT fall back to the current representation, which would silently corrupt the defense shape (wrong wire size, wrong range semantics, wrong URL template expansion). This stall behavior is independent of `dodge.strictMode` - a failed quality override is always a defense design bug and always fatal.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle without quality uses the current representation |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with string quality resolves to the matching sibling representation |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with integer quality resolves to the representation at that index |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with out-of-range integer quality stalls (returns null, does not fall back) |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with unknown string quality stalls (returns null, does not fall back) |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with quality override whose alt rep has no segment for the index stalls |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | failed quality override does not advance lastCycleIndex |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | quality override does not poison lastSegment cache for a subsequent same-index cycle |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime with unresolvable quality override stalls (returns null) |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime honors quality override via re-lookup |

---

## 3. Media Type Coverage

### R3.1 - Video streams

All core cycle tests use video representations, implicitly covering the video media type throughout the test suite. No additional tests here.

### R3.2 - Audio streams

Defended audio streams behave identically to video across all request generation functions. When no extended manifest is loaded, they fall back to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | defended audio stream: getNextSegmentRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | defended audio stream: isLastSegmentRequested() returns false while cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | defended audio stream: isLastSegmentRequested() returns true after all cycles consumed |
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | defended audio stream: getInitRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | audio stream with no defended stream info (no extended manifest loaded): getNextSegmentRequest() delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | audio stream with no defended stream info (no extended manifest loaded): getInitRequest() delegates to parent |

### R3.3 - Fragmented text streams

Defended fragmented text streams (with both init and data cycles) behave identically to video.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | defended fragmented text stream: getNextSegmentRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | defended fragmented text stream: isLastSegmentRequested() returns false while cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | defended fragmented text stream: isLastSegmentRequested() returns true after all cycles consumed |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | defended fragmented text stream: getInitRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | fragmented text stream with no defended stream info (no extended manifest): getNextSegmentRequest() delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | fragmented text stream with no defended stream info (no extended manifest): getInitRequest() delegates to parent |

### R3.4 - Non-fragmented text streams (init-only)

Covered by R2.3 above.

### R3.5 - Self-initialized streams (data-only, no init segment)

Covered by R2.4 above.

### R3.6 - Undefended text tracks in strict mode

`isTextTrackBlockedByDodge()` returns `true` only when strict mode is active, an extended manifest is loaded, and the representation is a text track with no defended stream info. When a text track is blocked, `isLastSegmentRequested()` returns `false` (stall), consistent with the behavior for undefended audio and video tracks.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isTextTrackBlockedByDodge() returns false when no extended manifest loaded |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isTextTrackBlockedByDodge() returns false for video rep with no defense in strict mode |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isTextTrackBlockedByDodge() returns true for text rep with no defense in strict mode |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isTextTrackBlockedByDodge() returns false for text rep that is defended |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isTextTrackBlockedByDodge() returns false when strictMode is false |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isLastSegmentRequested() returns false for undefended text track in strict mode (stall) |
| `dodge.DodgeDashHandlerOverride.js` | Text track disabling | isLastSegmentRequested() returns false for undefended video track in strict mode (stall behavior unchanged) |

### R3.8 - Muxed audio/video streams

Muxed representations (audio and video in the same segments) are defended by their single representation ID, identically to separate audio or video streams. No special handling is needed + the extended manifest references the muxed representation's label.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Muxed audio/video streams | defended muxed stream: getNextSegmentRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Muxed audio/video streams | defended muxed stream: getInitRequest() returns cycle request without calling parent |

### R3.7 - SegmentBase (byte-range) content

SegmentBase representations (used by WebM and single-file MP4 content) store all segments in a single monolithic file, differentiated by byte range. Unlike SegmentTemplate, `segment.media` is `null` and the URL is resolved entirely from BaseURL. The override explicitly handles this: when `segment.media` is null, template expansion is skipped and the URL resolves to the base URL with the padding query parameter. Byte ranges from `cycle.range` override `segment.mediaRange` (partial request) or fall back to the full segment range. Init segments similarly resolve from BaseURL when `representation.initialization` is null, using `representation.range` as the byte range.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getInitRequest() resolves URL from BaseURL when initialization is null |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getInitRequest() full init cycle uses representation.range when no explicit range |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getNextSegmentRequest() produces correct URL and byte range for SegmentBase |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getNextSegmentRequest() with cycle.range overrides segment.mediaRange |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getNextSegmentRequest() URL has padding query parameter |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getSegmentRequestForTime() works with SegmentBase segments |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | getNextSegmentRequest() sets full/buffer/trail flags correctly for SegmentBase |
| `dodge.DodgeDashHandlerOverride.js` | SegmentBase (byte-range) content | fallback to parent when no defense is active on SegmentBase representation |

---

## 4. Trailing Phase

### R4.1 - No spurious seeks during trailing

Two complementary mechanisms prevent spurious seeks during the trailing phase:

1. **`DodgeGapControllerOverride.shouldJumpGap`** returns `false` when trailing is active, preventing GapController from seeking to stream end. This is the primary prevention mechanism.
2. **`DodgeDashHandlerOverride.getSegmentRequestForTime`** intercepts any seek that does reach it (time within one segment duration of stream end, with `getTimeSinceStreamEnd() > 0`) and routes to `getNextSegmentRequest()` instead. This is a defense-in-depth fallback.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeGapControllerOverride.js` | _shouldJumpGap | during trailing: returns false (suppresses gap jump to avoid spurious seek) |
| `dodge.DodgeGapControllerOverride.js` | _shouldJumpGap | not trailing: returns true (gap jump proceeds normally) |
| `dodge.DodgeGapControllerOverride.js` | _shouldJumpGap | dodgeHandler absent: returns true (jumping unaffected) |
| `dodge.DodgeDashHandlerOverride.js` | getSegmentRequestForTime during trailing phase | seek near stream end during trailing returns next padding cycle |

### R4.2 - Segment downloading is not marked complete during trailing

`isLastSegmentRequested()` returns `false` while padding cycles remain, preventing the player from declaring the stream finished prematurely.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | isLastSegmentRequested() returns false when cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | isLastSegmentRequested() returns true when lastCycleIndex reaches the last cycle |

### R4.3 - Schedule timer continues during trailing; player appears to be buffering

`_shouldClearScheduleTimer()` returns `false` when the parent would clear the timer but `dashHandler.getIsTrailing()` is true, keeping the schedule loop alive so padding cycles continue to be requested.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns true (clear timer), during trailing: returns false (keeps timer for padding downloads) |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns true (clear timer), not trailing: returns true (clears normally) |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns false (keep timer), not trailing: returns false without checking trailing state |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns false (keep timer), during trailing: still returns false |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | dashHandler absent: falls back to parent result |

### R4.4 - `getIsTrailing()` correctly reflects the trailing phase

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsTrailing() returns false before any cycles are consumed |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsTrailing() returns true when lastCycleIndex == maxNoPad and trailing cycles remain |

---

## 5. Mock Buffer

### R5.1 - Mock buffer accumulates duration variance for each non-trailing cycle

`onBufferCycleLoaded()` adds `segmentDuration - actualDuration` to `mockBuffer` after each non-trailing cycle, accounting for the difference between MPD segment duration and actual content duration (significant for the last segment).

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | increments mockBuffer by (segmentDuration - actualDuration) and syncs to parent |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | can produce a negative mockBuffer when actualDuration exceeds segmentDuration |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | accumulates across multiple calls |

### R5.2 - Mock buffer is incremented only when the trailing padding cycle itself contributes simulated time

`onPaddingLoaded()` increments `currentMockBuffer` by `segmentDuration` when `e.buffer = true`. DodgeHandler sets `e.buffer = request.buffer && secondaryEvents.length == 0`: if the trailing padding cycle with the buffer flag caused pending segments to be flushed (secondary events), `e.buffer` is set to `false` and the mock buffer is not incremented, since the real buffer received content. Only trailing cycles with no secondary events (pure padding) cause the mock buffer to grow. Non-trailing padding events (`e.trail = false`) do not affect mock buffer state.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = true, e.buffer = true, increments mockBuffer by segmentDuration and syncs to parent |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = true, e.buffer = false, does not increment mockBuffer |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | trailing padding cycle where pending real segments were flushed (e.buffer = false due to secondary events): mock buffer is not incremented |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | accumulates mockBuffer across calls |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = false, does not call parent.setMockBuffer() |

### R5.3 - Mock buffer drains during trailing to simulate buffer state

`updateBufferLevel()` decrements `mockBuffer` by elapsed time since stream end when trailing is active, clamping to zero. This causes the reported buffer level to shrink toward the real buffer level.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | when not trailing, delegates to parent.updateBufferLevel() |
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | when trailing, decrements mockBuffer by elapsed time and syncs to parent |
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | when trailing, clamps mockBuffer to 0 when elapsed time exceeds accumulated value |

### R5.4 - Mock buffer resets when exiting trailing

Cycles that are not trailing padding with non-zero `lastTimeSinceStreamEnd` reset `mockBuffer` to zero, clearing stale trailing state.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = false with non-zero lastTimeSinceStreamEnd, resets mockBuffer to 0 |

### R5.5 - `resetInitialSettings` clears buffer override state

Resets `currentMockBuffer` and `lastTimeSinceStreamEnd` to zero and delegates to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | resetInitialSettings | resets internal state and delegates to parent.resetInitialSettings() |

### R5.6 - Init segment sandwich for quality override media segments

When a media chunk carries a `homeRepresentationId` (set by `DodgeDashHandlerOverride` when a data cycle uses a `quality` override), `DodgeBufferControllerOverride._onMediaFragmentLoaded` sandwiches the media append between init segment switches: it appends the alternate representation's cached init segment, then the media chunk, then restores the home representation's cached init segment. This ensures the MSE SourceBuffer has the correct init segment for decoding the alternate quality bytes. If either init segment is not in the cache, the override stalls (does not append) to preserve the defense. Non-override chunks delegate directly to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | delegates to parent for non-override chunks |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | sandwiches quality override chunk with init segments when both inits are cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when alternate init is not cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when home init is not cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when both inits are not cached |

### R5.7 - `homeRepresentationId` tagging on quality override requests

`DodgeDashHandlerOverride` sets `request.homeRepresentationId` to the current (home) representation's ID when a data cycle's `quality` field resolves to a different representation. This tag propagates through `DodgeHandler._createDataChunk` to the `DataChunk`, enabling `DodgeBufferControllerOverride` to detect quality override segments. Cycles without a quality override do not set this field.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getNextSegmentRequest sets homeRepresentationId when quality override resolves to a different representation |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getNextSegmentRequest does not set homeRepresentationId when no quality override |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime sets homeRepresentationId when quality override is active |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime does not set homeRepresentationId when no quality override |

---

## 6. Random Walk Scheduling

### R6.1 - Schedule delay is bounded to `[scheduleWaitBase, scheduleWaitBase + scheduleWaitRandom]`

`_getScheduleWait()` returns `scheduleWaitBase + Math.round(Math.random() * scheduleWaitRandom)`. With `scheduleWaitRandom = 0`, the delay is deterministically equal to `scheduleWaitBase`. A negative `scheduleWaitRandom` or `scheduleWaitBase` is clamped to 0 and logged once per DodgeHandler / DodgeScheduleControllerOverride instance.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | delay passed to startScheduleTimer is within [scheduleWaitBase, scheduleWaitBase + scheduleWaitRandom] |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitRandom = 0, delay is always exactly scheduleWaitBase |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitRandom < 0, delay is clamped to scheduleWaitBase and warns exactly once |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitBase < 0, delay is clamped to 0 + random and warns exactly once |

### R6.2 - Scheduling is scoped to the event's media type

`_schedule()` finds the stream processor matching the event's `mediaType` and calls `startScheduleTimer` and `setShouldCheckPlaybackQuality` only on that processor. A video event does not affect the audio stream processor's schedule or quality check state.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | _schedule only targets the stream processor matching the event mediaType |

### R6.3 - Suppressed events skip scheduling

Suppressed partial segments and padding cycles do not trigger `startScheduleTimer`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_PARTIAL (suppressed): startScheduleTimer not called |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED (suppressed): startScheduleTimer not called |

### R6.4 - `_onPaddingLoaded` routes the event to the buffer controller

After scheduling, `_onPaddingLoaded` calls `onPaddingLoaded()` on the stream processor's buffer controller so the mock buffer state is updated.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED: routes event to buffer controller onPaddingLoaded |

### R6.5 - Random walk delay is enforced on all scheduling paths during defended playback

`DodgeScheduleControllerOverride.startScheduleTimer(value)` enforces a minimum delay of `_getScheduleWait()` whenever `dashHandler.getIsDefended()` returns true. This ensures that buffered segment loads - which go through the normal dash.js `_onBytesAppended → startScheduleTimer(0)` path rather than Dodge's `_scheduleAll` - still receive a random walk delay. When the requested delay already exceeds the minimum, the larger value is preserved. When no defense is active, the value passes through unchanged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | not defended: passes value through to parent unchanged |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with value = 0: enforces minimum random delay |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with value larger than max delay: keeps the larger value |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitRandom = 0: delay is exactly scheduleWaitBase |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitRandom < 0: clamps to scheduleWaitBase and warns exactly once |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitBase < 0: clamps to 0 and warns exactly once |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with undefined value: treats as 0 and enforces minimum delay |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | dashHandler absent: passes value through to parent unchanged |

---

## 7. URL and Request Padding

### R7.1 - URL padding normalizes template URL lengths across representations

`_setRequestUrlWithPadding()` adds a `queryParams.padding` value sized to equalize URL lengths across all numeric token values (e.g., single-digit vs multi-digit segment numbers) and across `$RepresentationID$` values up to `dodge.maxIdLength` (default 32). Absolute URLs are not padded (no template expansion, so `queryParams.padding` is not set). Invalid values of `dodge.maxIdLength` (non-positive or non-numeric) fall back to the largest stream label length across all currently loaded extended manifests (0 if none are loaded) and are logged once per override instance.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | URL padding | relative template URL, queryParams.padding is set on the request |
| `dodge.DodgeDashHandlerOverride.js` | URL padding | Number padding is longer for a 1-digit index than for a 2-digit index |
| `dodge.DodgeDashHandlerOverride.js` | URL padding | absolute URL (no template expansion), queryParams has no padding key |
| `dodge.DodgeDashHandlerOverride.js` | URL padding | maxIdLength invalid (negative): falls back to max loaded label length and warns exactly once across requests |

### R7.2 - Request padding normalizes HTTP wire size to `[paddingLengthBase, paddingLengthBase + paddingLengthRandom]`

`applyRequestPadding()` measures the URL + headers wire size and extends a query parameter (configurable via `dodge.queryParam`, default `'padding'`) so that the total equals `paddingLengthBase + Math.round(Math.random() * paddingLengthRandom)`. Disabled when `paddingLengthBase ≤ 0`. When the padding query param doesn't already exist in the URL, it is added and the overhead of `?key=` / `&key=` is accounted for. Invalid URLs are handled gracefully with a warning. A negative `paddingLengthRandom` is clamped to 0 and logged once per module load (misconfiguration is visible but not fatal).

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | applyRequestPadding | paddingLengthBase = 0: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | paddingLengthBase < 0: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | request with pad > 0: URL is extended by exactly pad bytes |
| `dodge.RequestPadding.js` | applyRequestPadding | after padding, wire size equals paddingLengthBase (when paddingLengthRandom = 0) |
| `dodge.RequestPadding.js` | applyRequestPadding | headers contribute to the measured size |
| `dodge.RequestPadding.js` | applyRequestPadding | existing padding value is preserved as prefix of the extended value |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom > 0, wire size is in [paddingLengthBase, paddingLengthBase + paddingLengthRandom] |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom < 0, clamps to 0 and warns exactly once across calls |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom = 0, wire size is deterministically paddingLengthBase |
| `dodge.RequestPadding.js` | applyRequestPadding | pad = 0 (already at paddingLengthBase): URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | request already exceeds padding length: warns and does not modify URL |
| `dodge.RequestPadding.js` | applyRequestPadding | custom queryParam name: padding applied to the correct parameter |
| `dodge.RequestPadding.js` | applyRequestPadding | custom queryParam: padding uses the configured param name, not the default |
| `dodge.RequestPadding.js` | applyRequestPadding | invalid URL: warns and does not throw |

### R7.3 - FetchLoader applies request padding before dispatching the request

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | delegates to parent.load() |
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | extends URL before calling parent.load() when paddingLengthBase is set |

### R7.4 - XHRLoader applies request padding before dispatching the request

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | delegates to parent.load() |
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | extends URL before calling parent.load() when paddingLengthBase is set |

---

## 8. Extended Manifest Validation and Registry

### R8.1 - Structural validation rejects malformed manifests

`isValidExtendedManifest()` validates the top-level structure of extended manifest files: `start.mpd` and `start.base_uri` must be present and strings, `streams` must be a non-empty array where each entry has a `label` and at least one of `init` or `data`. Dynamic MPDs (containing `type="dynamic"`) are rejected. Data cycle fields are validated: `index` must parse to a non-negative integer, `range` must be a well-formed string, `padding` must be a boolean (or a string parseable to boolean) or absent, `buffer` must be a boolean (or a string parseable to boolean), an array of non-negative integers (selective buffer), or absent, and `quality` is optional - when present, it must be either a non-empty string (representation ID, resolved lazily in the override against `adapter.getVoRepresentations(mediaInfo)`) or a non-negative JSON number (index into the same array). Numeric strings are kept as strings and treated as representation IDs; a warning is logged to flag the ambiguity. Use a JSON number if an index is intended.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | null, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start.mpd, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start.base_uri, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | dynamic MPD, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing streams, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream missing label, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream missing init (data-only stream), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream missing data (init-only stream), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with both init and data absent, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with empty init and empty data, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with empty init array (self-initializing stream), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with empty data array (init-only stream), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-integer index, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with string integer index, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-numeric string index, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-string range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with range start > end, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with valid range, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with padding = true, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with padding = false, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with padding string "true", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with padding string "false", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-boolean padding, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-parseable string padding, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [0, 2] (array of non-negative integers), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [] (empty array), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [1, -1] (negative index in array), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [1.5] (non-integer in array), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = ["abc"] (non-numeric in array), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer string "true", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer string "false", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with non-parseable string buffer, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = 1 (number), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = string (representation id), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = 0 (non-negative integer), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = 2 (positive integer), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = "3" (numeric string), true and kept as string (treated as representation ID), warning emitted |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = -1 (negative integer), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = 1.5 (non-integer number), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = "" (empty string), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = true (boolean), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with quality = [] (array), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | valid manifest, true |

### R8.2 - Init cycle validation enforces range and buffer flag rules

`checkInitCycles()` validates that each init cycle has a valid range string (`"start-end"` where start ≤ end) or absent, that `padding` is a boolean (or a string parseable to boolean) or absent, that `buffer` is a boolean (or a string parseable to boolean) or absent (array buffer is never valid on init cycles), and that the `buffer` flag only appears on the last init cycle.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-string range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with range start > end, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-string range (number), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle buffer flag on non-last cycle, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle buffer flag on last cycle only, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycles with no buffer flags at all, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with array buffer, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with buffer string "true", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with buffer string "false", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-parseable string buffer, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-boolean buffer (number), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with padding = true, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with padding string "true", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with padding string "false", true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-parseable string padding, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-boolean padding (number), false |

### R8.3 - Data cycle validation enforces index validity, computes `maxNoPad` and precomputes `cycle.full`

`checkDataCycles()` validates that data cycle indices are non-negative integers, computes `stream.maxNoPad` as the index of the last non-padding cycle, and precomputes `cycle.full` for each data cycle via a right-to-left scan (the last non-padding occurrence of each segment index is `full = true`).

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with negative index, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | sets stream.maxNoPad to the last non-padding cycle index |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | sets stream.maxNoPad excluding trailing padding cycles |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: last non-padding occurrence of each index is full |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full correctly with interleaved indices |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: padding cycles are never full |

### R8.4 - Cycle index lookup

`getCycleIndexBySegmentIndex()` returns the index of the first non-padding cycle matching a given segment index, or `-1` if not found. `getCycleIndexByPlaybackTime()` converts time to a segment index and delegates.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns the first cycle index for segment 0 |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns the first cycle index for segment 1 (skipping earlier cycles for segment 0) |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns -1 when segment index is not in the stream |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | skips padding cycles when searching by index |
| `dodge.DefenseRegistry.js` | getCycleIndexByPlaybackTime | time 0 with segmentDuration 4, segment index 0, first cycle at position 0 |
| `dodge.DefenseRegistry.js` | getCycleIndexByPlaybackTime | time 5 with segmentDuration 4, segment index 1, first cycle at position 2 |

### R8.5 - Registry stores and retrieves extended manifests by label

`addExtendedManifest()` validates and stores manifests. `getDefendedStreamInfo()` retrieves a stream entry by label. `hasContent()` reflects whether any manifests are stored. `getMaxLabelLength()` returns the longest stream label across all loaded manifests (0 if none) and is used as a fallback for a misconfigured `dodge.maxIdLength`. `reset()` clears all state.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | instance | addExtendedManifest with a valid manifest, returns true |
| `dodge.DefenseRegistry.js` | instance | addExtendedManifest with null, returns false |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo finds a registered stream by label |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo returns null for an unknown label |
| `dodge.DefenseRegistry.js` | instance | reset clears all manifests, getDefendedStreamInfo returns null after reset |
| `dodge.DefenseRegistry.js` | instance | getMaxLabelLength returns 0 when no manifests are loaded |
| `dodge.DefenseRegistry.js` | instance | getMaxLabelLength returns the longest stream label across multiple streams and manifests |

### R8.6 - Period field validation

The optional `period` field on stream entries must be a non-negative integer when present. Null or absent values are accepted (backward compatible). Strings that parse to non-negative integers are coerced in place (following the same `Number()` pattern as `data[i].index`). Floats, negative numbers, and non-numeric strings are rejected.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with valid period (non-negative integer), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with period = null (absent), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with negative period, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with non-integer period, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with numeric string period, coerced to integer, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with non-numeric string period, false |

### R8.7 - Period-scoped stream lookup for multi-period MPDs

`getDefendedStreamInfo(label, periodIndex)` matches streams by label and, when the stream has a `period` field, also by period index. Streams without a `period` field match any period (backward compatible). When no stream matches the given period, returns null. When `periodIndex` is not passed, the first label match is returned regardless of period (backward compatible).

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, matches stream with matching period field |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, returns null when no period matches |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, stream without period field matches any period |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo without periodIndex, matches stream with period field |

### R8.8 - Override passes period index to defense registry lookup

`updateDefendedStreamInfo(representation)` passes `representation.adaptation.period.index` to `getDefendedStreamInfo()`, enabling correct per-period defense data resolution in multi-period MPDs. When two periods share the same representation ID, each period's override instance receives its own defense data.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | updateDefendedStreamInfo resolves correct stream for each period |
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | updateDefendedStreamInfo returns false for unmatched period |
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | stream without period field matches any period |

---

## 9. Extended Manifest Processing

### R9.1 - `tryProcessExtendedManifest` parses JSON and returns MPD data or gracefully degrades

Without strict mode, invalid JSON or invalid extended manifests return `null` (graceful degradation). Valid extended manifests return `{ mpd, baseUri }`. Successive calls are independent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | input that is not valid JSON returns null |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | valid JSON with invalid extended manifest returns null |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | valid extended manifest JSON returns { mpd, baseUri } matching embedded values |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | two successive valid manifests: each returns its own mpd and baseUri independently |

### R9.2 - `tryProcessExtendedManifest` with `strictMode = manifest` fires an error for non-extended manifest sources

When `strictMode` is `'manifest'`, non-JSON or invalid extended manifest input causes `tryProcessExtendedManifest` to return `false` and fire `INTERNAL_MANIFEST_LOADED` with `DODGE_STRICT_MODE_ERROR_CODE`. The error message includes the source URL. Valid extended manifests still succeed normally.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | non-JSON input: returns false and fires INTERNAL_MANIFEST_LOADED with error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | invalid extended manifest JSON: returns false and fires INTERNAL_MANIFEST_LOADED with error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | error message includes the URL |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | valid extended manifest: returns { mpd, baseUri } and does not fire error |

### R9.3 - `tryProcessExtendedManifest` without `strictMode = manifest` does not fire errors

When strict mode is not `'manifest'`, non-JSON input returns `null` without firing any error event.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest without strictMode = manifest | non-JSON input: returns null (no error) |

### R9.4 - `_onFragmentLoadingCompleted` routes events based on cycle type

The handler intercepts all `FRAGMENT_LOADING_COMPLETED` events. Vanilla requests (both successful and errored) pass through unchanged (sender stays non-null). Errored Dodge requests are intercepted (sender set to null) to prevent `StreamProcessor._handleFragmentLoadingError` from generating a corrupted retry that would advance or reset `lastCycleIndex`/`lastInitIndex`; playback stalls to preserve the defense pattern. For successful Dodge cycles: full segments with `buffer` fire `MEDIA_FRAGMENT_LOADED`; full segments without `buffer` fire `MEDIA_FRAGMENT_PARTIAL` and queue `MEDIA_FRAGMENT_LOADED`; partial segments fire `MEDIA_FRAGMENT_PARTIAL` and queue data for buffering; padding cycles fire `PADDING_LOADED`. When a buffer cycle has pending full segments, they are flushed as secondary events before the primary event fires.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | vanilla request: sender stays non-null, no Dodge events fired |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | errored Dodge request: sender set to null to prevent corrupted retry, no Dodge events fired |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | errored vanilla request: sender stays non-null |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | full segment with buffer flag: MEDIA_FRAGMENT_LOADED fires |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | full segment without buffer flag: MEDIA_FRAGMENT_PARTIAL fires, MEDIA_FRAGMENT_LOADED queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | partial segment: MEDIA_FRAGMENT_PARTIAL fires, segment data queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | padding cycle: PADDING_LOADED fires |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | buffer with two full segments: flushes pending as secondary, then fires primary |

### R9.5 - `isDodgeActive` and `isDodgeTrailing` report defense status

`isDodgeActive()` returns `true` when at least one active stream processor's DashHandler reports `getIsDefended() === true`. `isDodgeTrailing()` returns `true` when at least one reports `getIsTrailing() === true`. Both return `false` when `streamController` is null or has no active processors, and when no processor is defended/trailing.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeActive returns false when no stream processors are active |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeTrailing returns false when no stream processors are active |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeActive returns false when no SP is defended |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeActive returns true when any SP is defended |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeTrailing returns false when no SP is trailing |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeTrailing returns true when any SP is trailing |
| `dodge.DodgeHandler.js` | isDodgeActive and isDodgeTrailing | isDodgeActive returns false when streamController is null |

### R9.6 - Thumbnail track detection in extended manifests

Thumbnail tracks bypass DashHandler entirely (ThumbnailTracks fetches via its own XHRLoader). They could thus leak content-identifying information. `tryProcessExtendedManifest` scans the embedded MPD for thumbnail tile scheme IDs (`http://dashif.org/thumbnail_tile`, `http://dashif.org/guidelines/thumbnail_tile`). Only in `'max'` mode are manifests containing thumbnail tracks rejected. In `'representation'` and `'manifest'` modes, a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Thumbnail track detection in tryProcessExtendedManifest | strict mode representation: accepts manifest containing thumbnail tracks with warning |
| `dodge.DodgeHandler.js` | Thumbnail track detection in tryProcessExtendedManifest | strict mode manifest: accepts manifest containing thumbnail tracks with warning |
| `dodge.DodgeHandler.js` | Thumbnail track detection in tryProcessExtendedManifest | strict mode max: rejects manifest containing thumbnail tracks |
| `dodge.DodgeHandler.js` | Thumbnail track detection in tryProcessExtendedManifest | strict mode off: accepts manifest containing thumbnail tracks without warning |
| `dodge.DodgeHandler.js` | Thumbnail track detection in tryProcessExtendedManifest | manifest without thumbnails: accepted in all modes |

### R9.7 - Non-fragmented text detection in extended manifests

Non-fragmented text tracks (e.g. `mimeType="application/ttml+xml"` or `mimeType="text/vtt"`) are fetched outside DashHandler and could leak content-identifying information. `tryProcessExtendedManifest` scans the embedded MPD via `_mpdContainsNonFragmentedText()`. Only in `'max'` mode are manifests containing non-fragmented text rejected. In `'representation'` and `'manifest'` modes, a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Non-fragmented text detection in tryProcessExtendedManifest | strict mode max: rejects manifest containing non-fragmented text |
| `dodge.DodgeHandler.js` | Non-fragmented text detection in tryProcessExtendedManifest | strict mode representation: accepts manifest containing non-fragmented text with warning |
| `dodge.DodgeHandler.js` | Non-fragmented text detection in tryProcessExtendedManifest | strict mode manifest: accepts manifest containing non-fragmented text with warning |
| `dodge.DodgeHandler.js` | Non-fragmented text detection in tryProcessExtendedManifest | strict mode off: accepts manifest containing non-fragmented text without warning |
| `dodge.DodgeHandler.js` | Non-fragmented text detection in tryProcessExtendedManifest | manifest without non-fragmented text: accepted in all modes |

### R9.8 - XLink detection in extended manifests

XLink expansion fetches external XML from referenced URLs, which could reveal content-identifying information to network observers. `tryProcessExtendedManifest` scans for `xlink:href` in the MPD. Only in `'max'` mode are manifests containing XLink references rejected. In `'representation'` and `'manifest'` modes, a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | XLink detection in tryProcessExtendedManifest | strict mode representation: accepts manifest containing XLink with warning |
| `dodge.DodgeHandler.js` | XLink detection in tryProcessExtendedManifest | strict mode manifest: accepts manifest containing XLink with warning |
| `dodge.DodgeHandler.js` | XLink detection in tryProcessExtendedManifest | strict mode max: rejects manifest containing XLink |
| `dodge.DodgeHandler.js` | XLink detection in tryProcessExtendedManifest | strict mode off: accepts manifest containing XLink without warning |
| `dodge.DodgeHandler.js` | XLink detection in tryProcessExtendedManifest | manifest without XLink: accepted in all modes |

### R9.9 - DRM content detection in extended manifests

`tryProcessExtendedManifest` scans the embedded MPD string for DRM indicators (`<ContentProtection`, `cenc:`, `urn:mpeg:dash:mp4protection`, `urn:uuid:` PSSH system ID URNs). DRM license requests may leak content-identifying information through a channel Dodge cannot intercept, but this is unlikely to be a useful attack vector and DRM is important in the streaming ecosystem. In all strict modes (including `'max'`), a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged. Manifests without DRM are unaffected.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DRM content detection in tryProcessExtendedManifest | accepts manifest containing DRM in all strict modes |
| `dodge.DodgeHandler.js` | DRM content detection in tryProcessExtendedManifest | strict mode off: no DRM warning |
| `dodge.DodgeHandler.js` | DRM content detection in tryProcessExtendedManifest | manifest without DRM: accepted in all modes |

### R9.10 - Content Steering detection in extended manifests

Content steering sends CDN pathway and throughput data to a steering server - this is unlikely to be an issue for passive traffic analysis protection. `tryProcessExtendedManifest` scans for `<ContentSteering` in the MPD. In all strict modes (including `'max'`), a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Content Steering detection in tryProcessExtendedManifest | accepts manifest containing ContentSteering in all strict modes |
| `dodge.DodgeHandler.js` | Content Steering detection in tryProcessExtendedManifest | strict mode off: no ContentSteering warning |
| `dodge.DodgeHandler.js` | Content Steering detection in tryProcessExtendedManifest | manifest without ContentSteering: accepted in all modes |

### R9.11 - DVB Reporting detection in extended manifests

DVB Reporting sends playback metrics to external servers - this is unlikely to be an issue for passive traffic analysis protection. `tryProcessExtendedManifest` scans for `<Reporting` in the MPD. In all strict modes (including `'max'`), a warning is logged but the manifest is accepted. When strict mode is off, no warning is logged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DVB Reporting detection in tryProcessExtendedManifest | accepts manifest containing DVB Reporting in all strict modes |
| `dodge.DodgeHandler.js` | DVB Reporting detection in tryProcessExtendedManifest | strict mode off: no DVB Reporting warning |
| `dodge.DodgeHandler.js` | DVB Reporting detection in tryProcessExtendedManifest | manifest without DVB Reporting: accepted in all modes |

### R9.12 - CMCD warning during defended playback

When CMCD is enabled during Dodge playback, a warning is logged because client telemetry may leak content-identifying information. The warning serves as a diagnostic signal for the defense designer.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD enabled with strict mode off: no CMCD warning |
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD enabled with strict mode representation: warns about CMCD |
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD disabled: no warning |

### R9.13 - Warning when strictMode is disabled

When `strictMode` is set to `false`, `tryProcessExtendedManifest` logs a warning that undefended representations will fall back to vanilla dash.js without any defense.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | strictMode false: warns that strict mode is disabled |

---

## 10. Strict Mode Enforcement

### R10.1 - `strictMode = representation` blocks undefended representations when an extended manifest is active

When `strictMode` is `'representation'` and `defenseRegistry.hasContent()` is true, request-generation methods return `null` and `isLastSegmentRequested` returns `false` for representations without a matching defended stream info entry. When no extended manifest is loaded (`hasContent() = false`), all methods fall back to the parent. When the label is known, defense works normally.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with no extended manifest loaded, falls back to parent (hasContent() = false) |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with no extended manifest loaded, getNextSegmentRequestIdempotent falls back to parent (hasContent() = false) |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded but unknown label, getSegmentRequestForTime returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded but unknown label, getNextSegmentRequestIdempotent returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = representation | with extended manifest loaded and known label, defense still works normally |

### R10.2 - `strictMode = manifest` blocks undefended representations identically

`strictMode = manifest` behaves the same as `representation` at the per-representation level (the manifest-level check is in `tryProcessExtendedManifest`, see R9.2). All request-generation methods return `null` for unknown labels, and defense works normally for known labels.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getSegmentRequestForTime returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getNextSegmentRequestIdempotent returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded and known label, defense still works normally |

### R10.5 - `strictMode = max` blocks undefended representations identically

`strictMode = max` behaves the same as `representation` and `manifest` at the per-representation level, and it blocks undefended representations when an extended manifest is active. When no extended manifest is loaded, methods fall back to the parent. The `'max'` level additionally enforces manifest-level policies (see R9.6, R9.7, R9.8) and warns about side-channel settings.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with no extended manifest loaded, falls back to parent (hasContent() = false) |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded and known label, defense still works normally |

### R10.3 - DRM key session detection warns during defended playback

DRM license requests may leak content-identifying information through a channel Dodge cannot intercept. When a DRM key session is created during defended playback (`defenseRegistry.hasContent()` is true), DodgeHandler logs a warning. This is a diagnostic signal only - the actual blocking happens at manifest load time (R9.6). Key session error events (failed sessions) and events without an active defense are ignored.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DRM key session detection | does not fire ERROR when key session created during defended playback (warn only) |
| `dodge.DodgeHandler.js` | DRM key session detection | no extended manifest loaded: ignores key session event |
| `dodge.DodgeHandler.js` | DRM key session detection | key session error events are ignored |

### R10.4 - NEED_KEY warns but does not block DRM in any mode

DodgeHandler listens for the internal `NEED_KEY` event at high priority (before `ProtectionController._onNeedKey`). In all strict modes (including `'max'`), when a defense is active, a warning is logged but DRM is not blocked. When strict mode is off or no defense is active, the event is ignored. `_onNeedKey` never fires an error or sets `ignoreEmeEncryptedEvent`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DRM NEED_KEY interception | does not fire ERROR on NEED_KEY during defended playback |
| `dodge.DodgeHandler.js` | DRM NEED_KEY interception | no extended manifest loaded: ignores NEED_KEY |

---

## Summary

| Requirement | Tests |
|---|---|
| R1.1 Unsupported ABR rules disabled at load | 3 |
| R1.2 ABR quality check only at buffer events | 7 |
| R2.1 Init cycle sequence and flags | 5 |
| R2.2 Data cycle sequence and flags | 8 |
| R2.3 Init-only (non-fragmented text) streams | 3 |
| R2.4 Data-only (self-initialized) streams | 4 |
| R2.5 Fallback to parent | 6 |
| R2.6 CMCD nor/nrr suppressed during defense | 2 |
| R2.7 getLastSegment returns override's segment | 3 |
| R2.8 Defense state management | 2 |
| R2.9 Selective buffer | 10 |
| R2.10 Per-cycle quality override on data cycles | 14 |
| R3.1 Video streams | (implicit) |
| R3.2 Audio streams | 6 |
| R3.3 Fragmented text streams | 6 |
| R3.4 Non-fragmented text streams | (see R2.3) |
| R3.5 Self-initialized streams | (see R2.4) |
| R3.6 Undefended text tracks in strict mode | 7 |
| R3.7 SegmentBase (byte-range) content | 8 |
| R3.8 Muxed audio/video streams | 2 |
| R4.1 No spurious seeks during trailing | 4 |
| R4.2 Segment downloading not complete early | 2 |
| R4.3 Schedule timer continues (buffering icon) | 5 |
| R4.4 getIsTrailing correct | 2 |
| R5.1 Mock buffer accumulates duration variance | 3 |
| R5.2 Mock buffer incremented only for trailing padding | 5 |
| R5.3 Mock buffer drains during trailing | 3 |
| R5.4 Mock buffer resets on trailing exit | 1 |
| R5.5 Buffer controller state reset | 1 |
| R5.6 Init segment sandwich for quality overrides | 5 |
| R5.7 homeRepresentationId tagging | 4 |
| R6.1 Random walk delay bounded | 4 |
| R6.2 Scheduling is scoped to correct stream processor | 1 |
| R6.3 Suppressed events skip scheduling | 2 |
| R6.4 Padding event routing | 1 |
| R6.5 Random walk delay on all scheduling paths | 8 |
| R7.1 URL padding normalizes template lengths | 4 |
| R7.2 Request padding normalizes wire size | 14 |
| R7.3 FetchLoader applies padding | 2 |
| R7.4 XHRLoader applies padding | 2 |
| R8.1 Structural validation rejects malformed manifests | 44 |
| R8.2 Init cycle validation | 16 |
| R8.3 Data cycle validation, maxNoPad, and cycle.full precomputation | 6 |
| R8.4 Cycle index lookup | 6 |
| R8.5 Registry stores and retrieves manifests | 7 |
| R8.6 Period field validation | 6 |
| R8.7 Period-scoped stream lookup | 4 |
| R8.8 Override passes period index to registry | 3 |
| R9.1 Manifest parsing and graceful degradation | 4 |
| R9.2 Strict mode manifest error firing | 4 |
| R9.3 Non-strict mode no error | 1 |
| R9.4 Partial segment combination event routing | 8 |
| R9.5 isDodgeActive and isDodgeTrailing status | 7 |
| R9.6 Thumbnail track detection | 5 |
| R9.7 Non-fragmented text detection | 5 |
| R9.8 XLink detection | 5 |
| R9.9 DRM content detection | 3 |
| R9.10 Content Steering detection | 3 |
| R9.11 DVB Reporting detection | 3 |
| R9.12 CMCD warning during defended playback | 3 |
| R9.13 Warning when strictMode is disabled | 1 |
| R10.1 strictMode = representation enforcement | 8 |
| R10.2 strictMode = manifest enforcement | 6 |
| R10.3 DRM key session detection (warn only) | 3 |
| R10.4 NEED_KEY event handling (warn only) | 2 |
| R10.5 strictMode = max enforcement | 5 |
| **Total** | **333** |
