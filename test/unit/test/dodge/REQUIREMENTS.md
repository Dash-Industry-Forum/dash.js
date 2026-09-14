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

Quality check rules for primary events: data fragment loaded with an active buffer directive (`true` or non-empty array) enables quality checks; padding with an active buffer directive and at least one data secondary event enables quality checks; init fragment loaded and partials never enable quality checks. The `enableQualityCheck` flag is computed once before firing events and propagated as `bufferFlag` on padding/partial events. `_onPaddingLoaded` uses `e.bufferFlag` for quality check control. Scheduling for buffered segment loads is left to the vanilla `_onBytesAppended` path (with random delay enforced by the ScheduleController override). Vanilla fragment loads bypass `_schedule` entirely.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | INIT_FRAGMENT_PARTIAL: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED with bufferFlag = true (data secondary flushed): quality check enabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED with bufferFlag = false: startScheduleTimer called, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | INIT_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, quality check disabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_LOADED: startScheduleTimer not called by Dodge, quality check enabled |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | full = true, buffer = false: fires MEDIA_FRAGMENT_PARTIAL |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | vanilla request: startScheduleTimer is never called |

---

## 2. Cycle-Based Downloading

### R2.1 - Init cycles are downloaded in sequence with correct flags

Each call to `getInitRequest()` advances `lastInitIndex` and sets `full = false, buffer = false` until the last init cycle, which sets `full = true, buffer = true`. Returns `null` without calling the parent for data-only (self-initialized) streams. This applies to the case where only one init segment is downloaded.

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
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getSegmentRequestForTime() in non-trailing state returns cycle request |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getSegmentRequestForTime() returns null when no segment exists for the requested time |
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
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | getRemainingInitCycles() returns 0 |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | getNextSegmentRequest() returns a request object normally |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | isLastSegmentRequested() returns false while cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Data-only streams (self-initialized) | isLastSegmentRequested() returns true after all cycles consumed |

### R2.5 - All request methods delegate to the parent when no defense is active

When no extended manifest is loaded and strict mode does not apply, every request generation function calls through to the parent DashHandler and returns its result. `getIsTrailing()` returns `false`.

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
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | with no defended stream, delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | with defended stream, returns null to suppress CMCD nor/nrr leak |
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | with defended stream, returns null consistently across multiple calls |
| `dodge.DodgeDashHandlerOverride.js` | getNextSegmentRequestIdempotent during defended playback | transitions from defended to undefended after reset restore parent delegation |

### R2.7 - `getLastSegment()` returns the override's segment during defended playback

The parent DashHandler's `lastSegment` is never updated during defended playback (the override's `getNextSegmentRequest` updates only the override's closure variable). Without this override, callers like `AbrController` and `StreamProcessor._handleDifferentSwitchTypes` receive `null`. The override's `getLastSegment()` returns the most recent non-padding segment from the cycle sequence.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | before any cycles consumed, returns null |
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | after non-padding cycle, returns that cycle's segment |
| `dodge.DodgeDashHandlerOverride.js` | getLastSegment during defended playback | after padding cycle, returns the last non-padding segment |

### R2.8 - Defense state management

`updateDefendedStreamInfo()` looks up the representation's ID in the defense registry. Returns `true` when found. `reset()` clears override state and delegates to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | updateDefendedStreamInfo() returns true when stream is found |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | reset() clears state; with strictMode = false, subsequent getInitRequest() falls back to parent |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | updateDefendedStreamInfo() returns false for unknown label |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | updateDefendedStreamInfo() with same label across multiple calls preserves defense |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsDefended() returns true when defended stream info is set |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsDefended() returns false after reset with strictMode false |

### R2.9 - Selective buffer: array buffer on data cycles flushes only matching pending segments

When `buffer` on a data cycle is an array of segment indices, only pending media events whose segment index is in the array are flushed as secondary events. Non-matching pending media events remain queued. The current segment itself is only buffered (fires `MEDIA_FRAGMENT_LOADED`) if its index is in the array; otherwise, it is queued and fires `MEDIA_FRAGMENT_PARTIAL`. Pending init events are never flushed by selective buffer (no index to match). An empty array behaves as `buffer: false` (no flush, full segment queued). Boolean `buffer: true` flushes all pending segments. On padding events, two separate fields are set: `bufferFlag` reflects `enableQualityCheck` (true when the buffer directive is active and at least one data secondary is flushed), while `buffer` is `request.buffer === true && !hasDataSecondary` (only true for boolean `true` with no secondary events flushed - used for mock buffer increment). With selective buffering (array) and no data secondaries, `bufferFlag` is `false`; with data secondaries flushed, `bufferFlag` is `true`. Pending media event flush uses `homeRepresentationId` (falling back to `representationId`) for matching, so quality override cycles with different representation IDs are correctly flushed together.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0]: flushes only pending index 0, leaves index 1 queued; current segment (not in array) also queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [1]: flushes only pending index 1, leaves index 0 queued; current segment (not in array) also queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0, 1]: flushes both pending segments; current segment index 2 (not in array) queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [0, 2]: current segment index 2 is in array, so it is buffered |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer [99]: no pending segments match, current segment not in array, queued |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer []: empty array behaves as buffer = false |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: padding event has bufferFlag false and buffer false (array buffer is not boolean true) |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: padding event has bufferFlag true when data secondary flushed, buffer false |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | selective buffer: pending init events are not flushed |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | boolean buffer true flushes all pending segments |

### R2.10 - Per-cycle quality override on data cycles

When a data cycle carries an optional `quality` field, `DodgeDashHandlerOverride._resolveCycleRepresentation(currentRep, cycle)` resolves an alternate sibling representation via `adapter.getVoRepresentations(currentRep.mediaInfo)` - by ID for strings, or by array index for numbers. Both `getNextSegmentRequest` and `getSegmentRequestForTime` then re-query `segmentsController.getSegmentByIndex(effectiveRep, ...)` so that URL template expansion (`$Bandwidth$`, `$RepresentationID$`) and the request's `representation` / `bandwidth` fields reflect the alternate quality. This lets a defense conceal a large segment's size by fetching it at a lower quality. The `lastSegment` cache reuse guard requires both the absence of `cycle.quality` and `lastSegment.representation.id === representation.id`, so a stale segment from a previous override cannot poison a subsequent non-override cycle at the same segment index.

On any resolution failure - no sibling representations available, string ID not found, integer index out of range, or the alternate representation has no segment for `cycle.index` - the override logs at error level and **stalls** by returning `null` from `getNextSegmentRequest` / `getSegmentRequestForTime`. `lastCycleIndex` and `lastSegment` are not advanced, mirroring the existing "no segment found" behavior for non-override cycles. The override MUST NOT fall back to the current representation, which would silently corrupt the defense (wrong wire size, wrong range semantics, wrong URL template expansion). This stall behavior is independent of `dodge.strictMode` - a failed quality override is always a defense design bug and always fatal.

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
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle quality override with no siblings available stalls (returns null) |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | cycle with quality: null uses the current representation (no override) |

### R2.11 - Request generation stalls without advancing when URL resolution fails

The index/`lastSegment` invariants are advanced only *after* a request is successfully built. When the final request builder fails to produce a request - `_generateInitRequest` / `_getRequestForSegment` return `undefined` because `_setRequestUrlWithCacheBuster` could not resolve an absolute URL - the override returns `null` (stall) **without** advancing `lastInitIndex` / `lastCycleIndex` or mutating `lastSegment`. This ensures the scheduler retries the *same* cycle rather than skipping it, preserving the defense traffic pattern (mirroring the "no segment found" stall). Applies to all three request generation methods.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getNextSegmentRequest() stalls without advancing the cycle when URL resolution fails |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getInitRequest() stalls without advancing the init cycle when URL resolution fails |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getSegmentRequestForTime() stalls without advancing the cycle when URL resolution fails |

### R2.12 - Segments are released to the buffer in segment order, not download order

A defense may schedule cycles so that a segment downloads before one with a lower index. Download order is a defense lever; release order is not. At a flush, the pending events and the flushing cycle's own segment form one release set, which is sorted by segment index before any event is fired: init events carry index `NaN` and always lead, and media events follow in ascending index order. Sorting is stable, so entries that tie keep completion order.

Every event in the set carries the request that fetched its own segment, because
`BufferController._onAppended` gates the mock buffer correction on `e.request` and every released
segment enters the playback buffer (R5.1). The request must be the segment's own: `SourceBufferSink`
records it as `lastRequestAppended`, which is what a `SOURCE_BUFFER_ERROR` reports and what the
append log names.

The `buffer` and `trail` flags on each of those requests are overwritten from the flushing request
before the event fires. They describe the flush, not the fetch. The last event after sorting is
fired unsuppressed and the rest suppressed.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | out-of-order download: releases in segment order, not completion order |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | out-of-order download: several pending segments are sorted by index |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | release order: every released event carries its own segment request |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | release: the buffer and trail flags of the flush are applied to every request |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | release: a trailing flush marks every released request as trailing |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | release: a padding-driven flush still delivers a request per segment |
| `dodge.DodgeHandler.js` | Partial segment combination, _onFragmentLoadingCompleted | release order: pending init segments still lead the media segments |

### R2.13 - A home representation switch restarts the init sequence and resumes the data sequence

When ABR or the application changes the home representation, the counters cannot carry over: each
stream entry owns its cycle array, so cycle N of the new one is an unrelated part of the defense.
`updateDefendedStreamInfo()` restarts the init sequence, because the new representation needs its
own init segment, and drops the cached `lastSegment`, which would otherwise generate the previous
representation's URL.

The data sequence does not restart. It resumes at the first non-padding cycle for the segment index
last requested, located with `getCycleIndexBySegmentIndex()`. That index is re-fetched under the new
representation rather than skipped: a switch can land between two cycles of the same segment, in
which case the segment was never assembled, and continuing past it would leave a hole in the buffer.
When the new representation has no cycle for that index, the switch falls back to the beginning of
its cycle array, which restarts the video, and says so in a warning.

`getRemainingInitCycles(representation)` answers for the representation named rather than for the
one in use. `ScheduleController` picks the init path over the media path with this count, and it asks
before `StreamProcessor` has called `updateDefendedStreamInfo()` for the switch it is about to make,
so the state still describes the representation being left behind, which has no init cycles
remaining. Answering with that count sends the scheduler down the media path, and the new
representation's first media segment goes out before its init segment. Callers that mean
the stream in use pass no argument.

The functional test `dodge/quality-switch` covers the ordering end to end: it plays pinned to the
lowest representation, hands ABR back the wheel, and requires the first request for the representation
ABR moves to be its init segment. That assertion is what fails against the unfixed scheduler, with the
first request arriving as a media segment. The resume point is pinned by the unit tests below rather
than by that test, because dash.js sets an explicit buffering time on the switch paths it exercises,
which resolves the segment index before the resume logic is consulted.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | preserves cycle counters across same-label re-queries |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | resumes the data sequence at the cycle for the last segment index requested |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | resumes at the first non-padding cycle for that segment index |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | starts over when the new representation has no cycle for that segment index |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | restarts the init sequence for the new representation |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | reports the incoming representation init cycles before the switch is applied |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | reports the remaining init cycles of the representation in use when it is unchanged |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | reports -1 for a representation the extended manifest does not cover |
| `dodge.DodgeDashHandlerOverride.js` | ABR home representation switch | still reports 0 for a covered representation that needs no init cycles |

### R2.14 - A re-requested init segment replays the defense's init cycles

A seek aborts the SourceBuffer, and `StreamProcessor` then calls `setInitSegmentRequired(true)` so the init segment is appended again. On a defended representation, the cycle sequence is how an init segment reaches the buffer, so `DodgeDashHandlerOverride.restartInitCycles()` rewinds `lastInitIndex` and reports the full init cycle count, and `getInitRequest()` serves the sequence again from the start.

`ScheduleController._getNextFragment` calls it only when the player asks for an init segment (`initSegmentRequired`, a representation that is not the last initialized one, or a track switch) *and* the representation reports 0 remaining cycles. A sequence that has not finished still reports `> 0` and is not rewound. Without the rewind the request is never made, the SourceBuffer is left without an init segment, and `initSegmentRequired` stays latched, since only `_initFragmentNeeded` clears it.

Only the init counter moves. `lastCycleIndex` and `lastSegment` describe where playback sits in the data cycles, which a re-init does not change. The vanilla `DashHandler` stub reports -1, so nothing here changes non-Dodge playback. A covered self-initialized stream reports 0 and stays on the media path, because it has no init cycles to replay.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | reports the full init cycle count again |
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | serves the first init cycle again |
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | serves the whole sequence again, ending on the flushing cycle |
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | leaves the data cycle position alone |
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | reports -1 when no defense covers the stream |
| `dodge.DodgeDashHandlerOverride.js` | Init cycle replay | reports 0 for a covered self-initialized stream |
| `dodge.ScheduleControllerInitPath.js` | a defended representation that has used up its init cycles | replays its init cycles when the player asks for the init segment again |
| `dodge.ScheduleControllerInitPath.js` | a defended representation that has used up its init cycles | rewinds the cycle sequence exactly once for one such request |
| `dodge.ScheduleControllerInitPath.js` | a defended representation that has used up its init cycles | takes the media path while no init segment has been asked for |
| `dodge.ScheduleControllerInitPath.js` | a defended representation that has used up its init cycles | stays on the media path when rewinding yields no cycles |
| `dodge.ScheduleControllerInitPath.js` | a defended representation with init cycles still to send | takes the init path without being asked for an init segment |
| `dodge.ScheduleControllerInitPath.js` | a defended representation with init cycles still to send | does not rewind a sequence that has not finished |
| `dodge.ScheduleControllerInitPath.js` | vanilla playback, where the DashHandler stub reports -1 | takes the init path when an init segment is required |
| `dodge.ScheduleControllerInitPath.js` | vanilla playback, where the DashHandler stub reports -1 | takes the init path when the representation is not the initialized one |
| `dodge.ScheduleControllerInitPath.js` | vanilla playback, where the DashHandler stub reports -1 | takes the media path once the representation has been initialized |
| `dodge.ScheduleControllerInitPath.js` | vanilla playback, where the DashHandler stub reports -1 | never rewinds, since there are no cycles to rewind |

### R2.15 - A home representation switch releases what the outgoing representation queued

A buffer window spanning several segment indices, or selective buffering deferring an index past a flush point, can still be open when ABR, a manual switch, or a track switch moves the home representation. Those queued segments are downloaded and assembled but belong to the representation being left, whose init segment is what the SourceBuffer needs in order to parse them. Dropping them leaves a hole no later cycle refetches, since `updateDefendedStreamInfo` resumes the incoming representation at the last segment index *requested*, not the lowest one still queued.

`DodgeDashHandlerOverride.updateDefendedStreamInfo()` announces the switch on `REPRESENTATION_SWITCHED`, scoped to its stream and media type and naming the representation being left. `DodgeHandler._onRepresentationSwitched()` releases the queued init and media chunks for that stream and media type, init first and media in segment index order (`_releaseOrder`), with ties keeping completion order.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Representation switch announcement | announces a change of home representation |
| `dodge.DodgeDashHandlerOverride.js` | Representation switch announcement | names the representation being left |
| `dodge.DodgeDashHandlerOverride.js` | Representation switch announcement | scopes the announcement to its stream and media type |
| `dodge.DodgeDashHandlerOverride.js` | Representation switch announcement | announces only once its own state is settled |
| `dodge.DodgeDashHandlerOverride.js` | Representation switch announcement | stays quiet while the home representation is unchanged |
| `dodge.DodgeHandler.js` | home representation switch | releases a segment the previous representation queued |
| `dodge.DodgeHandler.js` | home representation switch | releases several queued segments in segment index order |
| `dodge.DodgeHandler.js` | home representation switch | releases a queued init segment ahead of the media |
| `dodge.DodgeHandler.js` | home representation switch | marks a released request buffered so its duration variance is absorbed |
| `dodge.DodgeHandler.js` | home representation switch | leaves another media type alone |
| `dodge.DodgeHandler.js` | home representation switch | leaves another stream alone |
| `dodge.DodgeHandler.js` | home representation switch | is a no-op when the queue is empty |

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
| `dodge.DodgeDashHandlerOverride.js` | Audio streams | defended audio stream: getSegmentRequestForTime() returns cycle request without calling parent |
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
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | defended fragmented text stream: getSegmentRequestForTime() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | fragmented text stream with no defended stream info (no extended manifest): getNextSegmentRequest() delegates to parent |
| `dodge.DodgeDashHandlerOverride.js` | Fragmented text streams | fragmented text stream with no defended stream info (no extended manifest): getInitRequest() delegates to parent |

### R3.4 - Non-fragmented text streams (init-only)

Covered by R2.3 above.

### R3.5 - Self-initialized streams (data-only, no init segment)

Covered by R2.4 above.

### R3.6 - SegmentBase (byte range) content

SegmentBase representations (used by WebM and single-file MP4 content) store all segments in a single monolithic file, differentiated by byte range. Unlike SegmentTemplate, `segment.media` is `null` and the URL is resolved entirely from BaseURL. The override explicitly handles this: when `segment.media` is null, template expansion is skipped and the URL resolves to the base URL, carrying the cache-busting query parameter like any other request. Byte ranges from `cycle.range` override `segment.mediaRange` (partial request) or fall back to the full segment range. Init segments similarly resolve from BaseURL when `representation.initialization` is null, using `representation.range` as the byte range.

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

### R3.7 - Muxed audio/video streams

Muxed representations (audio and video in the same segments) are defended by their single representation ID, identically to separate audio or video streams. No special handling is needed + the extended manifest references the muxed representation's label.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Muxed audio/video streams | defended muxed stream: getNextSegmentRequest() returns cycle request without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | Muxed audio/video streams | defended muxed stream: getInitRequest() returns cycle request without calling parent |

### R3.8 - `_generateInitRequest` constructs init requests correctly

The internal `_generateInitRequest` function builds a `FragmentRequest` for init segments. `DashManifestModel` substitutes `$Bandwidth$` and `$RepresentationID$` into `representation.initialization` at parse time, so in practice this pass only resolves the `$$` escape, but it runs the same `processUriTemplate` call vanilla `DashHandler` makes rather than assuming that (see R3.11). For SegmentBase representations (`representation.initialization = null`) there is no init URL to expand at all. Range overrides set `request.range` and `request.partial = true`; without a range override, `representation.range` is used with `partial = false`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | _generateInitRequest construction | SegmentTemplate init: request has correct type, mediaType, and representation |
| `dodge.DodgeDashHandlerOverride.js` | _generateInitRequest construction | init cycle with range override: sets request.range and partial = true |
| `dodge.DodgeDashHandlerOverride.js` | _generateInitRequest construction | init cycle without range: uses representation.range and partial = false |
| `dodge.DodgeDashHandlerOverride.js` | _generateInitRequest construction | SegmentBase init (initialization = null): still returns a valid request |
| `dodge.DodgeDashHandlerOverride.js` | _generateInitRequest construction | init cycle with padding flag: sets request.padding = true |

### R3.9 - `_getRequestForSegment` constructs data requests correctly

The internal `_getRequestForSegment` function builds a `FragmentRequest` for media segments. Returns `null` for null segments. Token expansion is covered by R3.11. For SegmentBase (`segment.media = null`), `segment.media` is null so expansion is a no-op. When `homeRepresentation` is provided, sets `homeRepresentationId` on the request.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | data request has correct type and mediaType |
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | null segment returns null |
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | SegmentBase data request (segment.media = null): still returns valid request |
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | homeRepresentation provided: sets homeRepresentationId on request |
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | no homeRepresentation: homeRepresentationId not set |
| `dodge.DodgeDashHandlerOverride.js` | _getRequestForSegment construction | data request with range override: sets range and partial = true |

### R3.10 - SegmentTimeline content is addressed by index

`SegmentsController.getSegmentByIndex()` routes SegmentTimeline to a getter that takes no index: `TimelineSegmentsGetter.getSegmentByIndex()` reads the fourth argument (`lastSegment`) and returns the segment after it, falling back to the segment at time 0 when there is none. An index-based call therefore resolves to segment 0 for every cycle. Cycles address arbitrary indices and padding cycles repeat them, so a forward cursor is not a substitute, and `<S>` entries carry per-entry `@d`, so no arithmetic converts an index to a time.

`_getSegmentByIndex()` passes through to `segmentsController.getSegmentByIndex()` unchanged for every other addressing mode. For SegmentTimeline, it steps the getter's own cursor until the requested index is reached, returning `null` when the walk runs past the end of the timeline, and memoizes what the getter returns in a `WeakMap` keyed on the representation object (not its ID, which a multi-period MPD can reuse across periods with different timelines). Extended manifests reject dynamic MPDs, so a resolved timeline never changes underneath the cache.

The getter writes `representation.segmentDuration` on every match, so a cache hit restores it from the resolved segment. `DodgeBufferControllerOverride` does mock buffer arithmetic with that value and the trailing seek guard compares against it, and timeline segment durations are not uniform.

These tests drive a real `SegmentsController` and a real `TimelineSegmentsGetter` over a non-uniform `<S>` list, since a stubbed segments controller cannot reproduce the argument dispatch.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | a cycle that jumps forward resolves to that segment index |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | a cycle that jumps backward resolves to the earlier segment index |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | a padding cycle repeating an earlier index resolves to that segment |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | representation.segmentDuration tracks the resolved segment, including on repeat lookups |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | representation.segmentDuration tracks the resolved segment when a cycle repeats the last index |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline content | an index past the end of the timeline stalls without advancing |

### R3.11 - Media URL tokens are expanded by the upstream template processor

Both request paths call `processUriTemplate` from `src/dash/utils/SegmentsUtils.js`, the same
function vanilla `DashHandler` uses, which since dash.js 5.2.0 delegates to `@svta/cml-dash`.

The second pass is load-bearing rather than defensive. `ListSegmentsGetter` overwrites
`segment.media` with the raw `SegmentURL@media` after `getIndexBasedSegment()` has run, and never
passes `mediaUrl`, so a SegmentList segment reaches the handler with its tokens unexpanded. For
time-based getters the template is already resolved and this pass is a no-op, which is also why
vanilla makes the same call twice.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | SegmentList media carrying $RepresentationID$ is expanded |
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | $Bandwidth$ is expanded from the representation |
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | $SubNumber$ is expanded from segment.replacementSubNumber |
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | $$ is a literal dollar, not the start of a token |
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | a format tag zero-pads the substituted value |
| `dodge.DodgeDashHandlerOverride.js` | Media URL token expansion | a token with no corresponding value is left intact |

### R3.12 - Index lookups never request partial segments

`SegmentsController.getSegmentByIndex()` forwards its `subNumberOfPartialSegmentToRequest`
argument only on the SegmentTemplate branch. Vanilla `DashHandler` passes `NaN` there to mean
"not a partial segment request", and `TemplateSegmentsGetter` turns that into subNumber 0.

Dodge addresses segments by index for every cycle and never requests DASH partial segments, so
it passes `NaN` for the same reason. Passing `-1` instead is not equivalent: the getter keeps any
value below `SegmentTemplate@k` as given, so `-1` selects partial segment −1, which places the
segment one partial duration before the period start and substitutes a literal `-1` into
`$SubNumber$`. This needs only `@k` on a representation, not a dynamic MPD, so the extended
manifest's rejection of dynamic MPDs does not prevent it.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | SegmentTemplate with @k (partial segments) | @k present: $SubNumber$ resolves to the first partial segment |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTemplate with @k (partial segments) | @k present: the request starts at the segment start, not before it |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTemplate with @k (partial segments) | @k = 1: still resolves to partial segment 0 |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTemplate with @k (partial segments) | @k absent: the full-segment path is used and start time is unchanged |

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
| `dodge.DodgeGapControllerOverride.js` | _shouldJumpGap | dodgeHandler absent: returns true (no crash, gap jumping unaffected) |
| `dodge.DodgeDashHandlerOverride.js` | getSegmentRequestForTime during trailing phase | seek near stream end during trailing returns next padding cycle, not vanilla parent request |

### R4.2 - Segment downloading is not marked complete during trailing

`isLastSegmentRequested()` returns `false` while padding cycles remain, preventing the player from declaring the stream finished prematurely.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | isLastSegmentRequested() returns false when cycles remain |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | isLastSegmentRequested() returns true when lastCycleIndex reaches the last cycle |

### R4.3 - Schedule timer continues during trailing; player appears to be buffering

`_shouldClearScheduleTimer()` returns `false` when the parent would clear the timer but `dashHandler.getIsTrailing()` is true, keeping the schedule loop alive so padding cycles continue to be requested. R12.8 outranks this: a stream stalled by a download failure stops scheduling, padding included.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns true (clear timer), during trailing: returns false (keeps timer for padding downloads) |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns true (clear timer), not trailing: returns true (clears normally) |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns false (keep timer), not trailing: returns false |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | parent returns false (keep timer), during trailing: still returns false |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | dashHandler absent: falls back to parent result without crashing |

### R4.4 - `getIsTrailing()` correctly reflects the trailing phase

The phase begins one cycle earlier than `request.trail` does: as soon as the last content cycle has
been requested, because every cycle after it is padding. A progressive stream is excepted, see R9.15.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsTrailing() returns false before any cycles are consumed |
| `dodge.DodgeDashHandlerOverride.js` | Defended behavior with extended manifest | getIsTrailing() returns true when lastCycleIndex == maxNoPad and trailing cycles remain |

### R4.5 - Buffering completion is deferred until the trailing cycles are done

`BufferController` concludes that the period is fully buffered as soon as the buffered range reaches
the period end, which happens when the last content segment is appended. On a defense whose data
cycles cover the whole presentation that is *before* any trailing padding has gone out, and
`ScheduleController.startScheduleTimer()` refuses to arm a timer on a completed buffer, so the phase
would never start. `getIsBufferingCompleted()` therefore answers `false` for the length of the phase.
`Stream` reads the same getter, so `mediaSource.endOfStream()` is held back with it.

The deferral outlives `getIsTrailing()`, which goes false when the *last* trailing cycle is
requested rather than when its response lands, and a seek out of the phase does not lift it. Only
the release in R4.6 does. `reset()` clears it. R4.3 keeps the timer alive once it is armed; this
requirement is what lets it be armed at all.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | reports the parent answer verbatim when the defense never trails |
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | hides the parent completion while the trailing phase is running |
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | keeps hiding it after the last trailing cycle is requested, while its response is in flight |
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | a seek out of the trailing phase does not lift the deferral |
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | reset() clears the deferral a finished trailing phase left behind |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | defers again when a second trailing phase begins after the first one finished |

### R4.6 - The final trailing padding response hands buffering completion back

`BufferController._checkIfBufferingCompleted` fires `BUFFERING_COMPLETED` only on the transition of
its own private flag, and that transition already happened while R4.5 was hiding it. Nothing fires it
a second time, so `Stream` would never re-evaluate and the stream would never end. A trailing padding
response arriving after the handler has left the trailing phase is the last one, and it re-asserts
the value the parent already holds so the event fires again. It re-asserts once per phase, only when
the parent had in fact completed, and never for a defense that did not trail. A phase entered after a
seek is released the same way. A release that only fired once per session would leave the stream
alive forever after a seek: the padding goes out, the cycles run out, and nothing ends the media
source.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | getIsBufferingCompleted | reports the parent answer once the final trailing padding has landed |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | re-asserts the parent completion on the final trailing padding so the stream can end |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | does not re-assert on a trailing padding that is not the last one |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | does not re-assert when the parent never completed buffering |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | re-asserts only once even if further trailing padding lands |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | does not re-assert when the defense never trailed at all |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded releasing the deferred completion | releases again at the end of a second trailing phase so the stream can still end |

---

## 5. Mock Buffer

### R5.1 - Mock buffer accumulates duration variance for every buffered segment

`onBufferCycleLoaded()` adds `segmentDuration - actualDuration` to `mockBuffer`, accounting for the
difference between the MPD's nominal segment duration and the actual content duration (significant
for the last segment). The reported buffer level is `realBuffer + mockBuffer`, and
`_shouldScheduleNextRequest` gates on it, so any content-dependent residue left in
it becomes a content-dependent term in when the plan advances.

The correction fires once per *buffered segment*, not once per cycle. A buffer directive can flush
more than one segment - a selective array, or a directive that releases queued segments alongside
its own - and each of them enters the playback buffer with its own duration, so each needs its own
correction. R2.12 is what makes that possible: every released event carries a request, and the
flags the gate reads describe the flush.

The duration comes from `SourceBufferSink`'s measurement trace, which is stamped when a chunk is
*enqueued*, not when it is appended. Segments enqueued before any of their appends complete
therefore share one window, and `_onAppended` reads the same first positive delta for each of them,
crediting every segment in the flush with the first one's increment. R6.4 is what keeps that from
happening: releases are appended one at a time, so each segment gets a window of its own.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | increments mockBuffer by (segmentDuration - actualDuration) and syncs to parent |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | can produce a negative mockBuffer when actualDuration exceeds segmentDuration |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | accumulates across multiple calls |

### R5.2 - Mock buffer is incremented only when the trailing padding cycle itself contributes simulated time

`onPaddingLoaded()` increments `currentMockBuffer` by `segmentDuration` when `e.buffer = true`. DodgeHandler sets `e.buffer = request.buffer === true && !hasDataSecondary`: if the trailing padding cycle with the buffer flag caused pending segments to be flushed (secondary events), `e.buffer` is set to `false` and the mock buffer is not incremented, since the real buffer received content. Only trailing cycles with no secondary events (pure padding) cause the mock buffer to grow. Non-trailing padding events (`e.trail = false`) do not affect mock buffer state.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = true, e.buffer = true, increments mockBuffer by segmentDuration and syncs to parent |
| `dodge.DodgeBufferControllerOverride.js` | onPaddingLoaded | e.trail = true, e.buffer = false, does not increment mockBuffer |
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

### R5.5 - `reset` clears buffer override state

Resets `currentMockBuffer` and `lastTimeSinceStreamEnd` to zero and delegates to the parent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | reset | resets internal state and delegates to parent.reset() |
| `dodge.DodgeBufferControllerOverride.js` | reset | resets mockBuffer to zero after accumulation |

### R5.6 - `onBufferCycleLoaded` handles negative variance and trailing reset

`onBufferCycleLoaded` increments `currentMockBuffer` by `segmentDuration - actualDuration`. When `actualDuration > segmentDuration`, the variance is negative (accepted). When trailing was previously active (`lastTimeSinceStreamEnd != 0`), the mock buffer is reset to 0 before the new variance is accumulated.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | zero variance when actualDuration equals segmentDuration |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | resets mockBuffer before accumulating when trailing was active |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | large negative variance is accepted |
| `dodge.DodgeBufferControllerOverride.js` | onBufferCycleLoaded | large positive variance accumulates correctly |

### R5.7 - `updateBufferLevel` guards against missing dashHandler

`updateBufferLevel` guards on `playbackController && dashHandler` before managing mock buffer state. When either is undefined, mock buffer logic is skipped but the parent's `updateBufferLevel` is still called. When exiting the trailing phase (`getIsTrailing()` returns false with `lastTimeSinceStreamEnd != 0`), mock buffer is reset to 0. Time decreases (`timeSinceStreamEnd < lastTimeSinceStreamEnd`) are clamped to a zero delta.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | skips mock buffer logic when dashHandler is undefined, still calls parent |
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | skips mock buffer logic when playbackController is undefined, still calls parent |
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | resets mockBuffer when exiting trailing phase |
| `dodge.DodgeBufferControllerOverride.js` | updateBufferLevel | clamps delta to zero when timeSinceStreamEnd decreases |

### R5.8 - The reported buffer level is never negative

The mock buffer is a *signed* correction: `onBufferCycleLoaded` adds `segmentDuration - actualDuration` per buffered cycle, which is negative whenever a segment runs longer than the MPD says (R5.6 pins that). It stays signed so it accumulates correctly across cycles.

The level `BufferController._updateBufferLevel()` reports is a duration, and dash.js already clamps the real part of it. Adding a signed correction to a clamped real part is not enough: when a negative correction outweighs the real buffer the reported level goes negative, which is the state right after a seek prunes the buffer while a negative correction is still outstanding. The sum is therefore clamped as well, and `BUFFER_LEVEL_UPDATED` carries the clamped value.

Only what is reported is clamped. `DodgeBufferControllerOverride` keeps its own `currentMockBuffer` signed, so a segment that overran is still paid back by the next one that underran.

| File | Description | Test |
|---|---|---|
| `dodge.MockBufferLevel.js` | Dodge mock buffer reporting | never reports a negative level for a negative correction |
| `dodge.MockBufferLevel.js` | Dodge mock buffer reporting | never reports a negative level for a large negative correction |
| `dodge.MockBufferLevel.js` | Dodge mock buffer reporting | still adds a positive correction to the reported level |
| `dodge.MockBufferLevel.js` | Dodge mock buffer reporting | reports zero when no correction is set |
| `dodge.MockBufferLevel.js` | Dodge mock buffer reporting | announces the same non-negative level on BUFFER_LEVEL_UPDATED |

---

## 6. Quality Override Buffer Management

### R6.1 - Init segment sandwich for quality override media segments

When a media chunk carries a `homeRepresentationId` (set by `DodgeDashHandlerOverride` when a data cycle uses a `quality` override), `DodgeBufferControllerOverride._onMediaFragmentLoaded` sandwiches the media append between init segment switches: it appends the alternate representation's cached init segment, appends the media chunk, then appends the home representation's cached init segment. When `changeType()` is available (both `capabilities.supportsChangeType()` and `streaming.buffer.useChangeType` are true), each init append is preceded by a `changeType()` call to reset the MSE parser state. When `changeType()` is not available, the init-media-init sequence is still appended but without `changeType()` calls. If either init segment is missing from the cache, the override stalls (does not append) to preserve the defense. Non-override chunks are appended directly through the parent's `appendToBuffer`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | appends non-override chunks through the parent appendToBuffer |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | sandwiches quality override chunk with changeType() + init segments when both inits are cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | skips changeType calls when useChangeType is disabled in settings |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | skips changeType calls when capability is not supported |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when alternate init is not cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when home init is not cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | stalls when both inits are not cached |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | handles consecutive quality overrides correctly |

### R6.2 - `homeRepresentationId` tagging on quality override requests

`DodgeDashHandlerOverride` sets `request.homeRepresentationId` to the current (home) representation's ID when a data cycle's `quality` field resolves to a different representation. This tag propagates through `DodgeHandler._createDataChunk` to the `DataChunk`, enabling `DodgeBufferControllerOverride` to detect quality override segments. Cycles without a quality override do not set this field.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getNextSegmentRequest sets homeRepresentationId when quality override resolves to a different representation |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getNextSegmentRequest does not set homeRepresentationId when no quality override |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getNextSegmentRequest does not set homeRepresentationId when quality matches home rep |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime sets homeRepresentationId when quality override is active |
| `dodge.DodgeDashHandlerOverride.js` | Per-cycle quality override | getSegmentRequestForTime does not set homeRepresentationId when no quality override |

### R6.3 - Dodge-owned alternate init cache, cleared only by `reset`

`DodgeBufferControllerOverride` maintains a local `Map<representationId, chunk>` for alternate-representation init segments (identified by `chunk.homeRepresentationId` being set). These are stored unconditionally - not subject to `streaming.cacheInitSegments` - and are cleared only by `reset`. The sandwich looks up the alternate init from this local cache (with parent `InitCache` as a fallback) and the home init from the parent `InitCache`.

A home representation switch does **not** clear it. The cache is keyed by `Representation@id`, which DASH
requires to be unique within a Period, and one override is built per period and per media type, so an
entry's init bytes stay correct for the life of the cache and no switch can make one wrong. It is read
only when a segment is appended, never when one is requested, so its contents cannot affect the wire
pattern: the init cycles are replayed on every home switch regardless, because `updateDefendedStreamInfo`
resets the init counter and `ScheduleController` then takes the init path (R2.13, R2.14).

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | delegates to parent for home init (no homeRepresentationId) |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | alternate init is cached locally and does not delegate to parent |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | home init is both cached locally and delegated to parent |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | sandwich retrieves alternate init from the local cache (parent cache never consulted for alt) |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | local cache does not depend on streaming.cacheInitSegments - sandwich succeeds regardless |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | a quality override segment queued before a home representation switch is still appended |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | a cached alternate init stays usable across repeated home representation switches |
| `dodge.DodgeBufferControllerOverride.js` | _onInitFragmentLoaded | reset clears the local cache |

### R6.4 - Fragment releases are serialized

The event bus does not await its handlers, so a flush that releases several segments (R2.12) starts every `_onMediaFragmentLoaded` back to back. Because the quality override sandwich (R6.1) is asynchronous, unserialized handlers interleave: both `changeType` calls run before either append, media lands under the alternate codec rather than its own, and an ordinary segment released alongside an override is appended *inside* that override's sandwich and ahead of it in the buffer, defeating R2.12.

`DodgeBufferControllerOverride` therefore chains releases on a module-level promise, so each release - override sandwich or ordinary segment - completes before the next begins, and the append order is the order the events were fired in. A release that throws is caught and logged so it cannot poison the chain for subsequent segments. The chain is reset in `setup()` and `reset`.

An ordinary segment is appended with the parent's `appendToBuffer` rather than its `_onMediaFragmentLoaded`. The two make the same append, but the handler discards the promise, so a chain built on it waits only for the append to be *enqueued*. That is enough to order the appends, since the sink drains its queue in order, but not enough for R5.1: a segment's duration is measured against a trace index stamped at enqueue time, so segments enqueued together are all credited with the first one's buffer increment. Waiting for the append to land gives each segment its own measurement window.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | two overrides released together: each sandwich completes before the next begins |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | override plus ordinary segment: the ordinary segment does not land inside the sandwich |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | a failed sandwich does not stop the next release from being appended |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | two ordinary segments released together: the second is not appended until the first settles |
| `dodge.DodgeBufferControllerOverride.js` | init append serialization | an init released while a media append is in flight lands after it |
| `dodge.DodgeBufferControllerOverride.js` | init append serialization | an init released mid-sandwich does not land inside it |
| `dodge.DodgeBufferControllerOverride.js` | init append serialization | an init released on an idle chain still appends |
| `dodge.DodgeBufferControllerOverride.js` | init append serialization | an alternate init is cached without appending, and does not stall the chain |


### R6.5 - The sandwich re-records the home representation as soon as the alternate init is appended

The sandwich (R6.1) appends a sibling representation's init segment to the real SourceBuffer.
`StreamProcessor._onBytesAppended` reacts to every init append by recording that init's
representation as the one the buffer is initialized for and starting the schedule timer. Between
that append and the home init going back in at the end of the sandwich, `ScheduleController` holds
the *alternate* representation, so `_getNextFragment` reads the home representation as still needing
an init segment, finds its init cycles used up, and calls `restartInitCycles()` (R2.14). The whole
init sequence is then replayed on the wire. With `dodge.scheduleWaitBase` and `scheduleWaitRandom`
at 0, the timer fires before the append completes and the replay is reliable.

`DodgeBufferControllerOverride` therefore records the home representation immediately after the
alternate init append, through `DodgeHandler.setLastInitializedRepresentation`, reached off the
context the way the schedule and gap overrides reach the handler. That call runs in the microtask
following the append, so it lands ahead of any timer the append started.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | records the home representation as last initialized before appending the override media |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | does not record a representation for a plain append that is not a quality override |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | does not record a representation when the sandwich stalls on a missing init |
| `dodge.DodgeBufferControllerOverride.js` | _onMediaFragmentLoaded | completes the sandwich when no Dodge handler is registered on the context |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | setLastInitializedRepresentation routes to the ScheduleController of the named media type |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | setLastInitializedRepresentation is a no-op for a media type with no stream processor |

---

## 7. Random Walk Scheduling

### R7.1 - Schedule delay is bounded to `[scheduleWaitBase, scheduleWaitBase + scheduleWaitRandom]`

`_getScheduleWait()` returns `scheduleWaitBase + Math.round(Math.random() * scheduleWaitRandom)`. With `scheduleWaitRandom = 0`, the delay is deterministically equal to `scheduleWaitBase`. Both settings are read through `resolveNumericSetting()` (R11.8), so an unusable value - negative, NaN, or a quoted number - resolves to 0 and is logged once per `DodgeScheduleControllerOverride` instance.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | delay passed to startScheduleTimer is within [scheduleWaitBase, scheduleWaitBase + scheduleWaitRandom] |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitRandom = 0, delay is always exactly scheduleWaitBase |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitRandom < 0, delay is clamped to scheduleWaitBase and warns exactly once |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with scheduleWaitBase < 0, delay is clamped to 0 + random and warns exactly once |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with a non-numeric scheduleWaitBase, delay is a finite number and warns exactly once |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | with a non-numeric scheduleWaitRandom, delay is exactly scheduleWaitBase |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | a scheduled Dodge event consumes exactly one random draw |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | the delay is the draw itself, not the larger of two draws |

### R7.2 - Scheduling is scoped to the event's media type

`_schedule()` finds the stream processor matching the event's `mediaType` and calls `startScheduleTimer` and `setShouldCheckPlaybackQuality` only on that processor. A video event does not affect the audio stream processor's schedule or quality check state.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | _schedule only targets the stream processor matching the event mediaType |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | audio event targets audio SP, does not affect video SP |
| `dodge.DodgeHandler.js` | Random walk scheduling, _getScheduleWait and _scheduleAll | padding event for video does not route to audio buffer controller |

### R7.3 - Suppressed events skip scheduling

Suppressed partial segments and padding cycles do not trigger `startScheduleTimer`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | MEDIA_FRAGMENT_PARTIAL (suppressed): startScheduleTimer not called |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED (suppressed): startScheduleTimer not called |

### R7.4 - `_onPaddingLoaded` routes the event to the buffer controller

After scheduling, `_onPaddingLoaded` calls `onPaddingLoaded()` on the stream processor's buffer controller so the mock buffer state is updated.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED: routes event to buffer controller onPaddingLoaded |
| `dodge.DodgeHandler.js` | Scheduling logic, _onPartialSegment and _onPaddingLoaded | PADDING_LOADED: routes event with all expected fields to buffer controller |

### R7.5 - Random walk delay is enforced on all scheduling paths during defended playback

`DodgeScheduleControllerOverride.startScheduleTimer(value)` enforces a minimum delay of `_getScheduleWait()` whenever `dashHandler.getIsDefended()` returns true. This ensures that buffered segment loads - which go through the normal dash.js `_onBytesAppended -> startScheduleTimer(0)` path rather than Dodge's `_scheduleAll` - still receive a random walk delay. When the requested delay already exceeds the minimum, the larger value is preserved. When no defense is active, the value passes through unchanged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | not defended: passes value through to parent unchanged |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with value = 0: enforces minimum random delay |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with value larger than max delay: keeps the larger value |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with value between base and max: keeps the original value |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitRandom = 0: delay is exactly scheduleWaitBase |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitRandom < 0: clamps to scheduleWaitBase and warns exactly once |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with scheduleWaitBase < 0: clamps to 0 and warns exactly once |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with a non-numeric scheduleWaitBase: treats as 0 and warns exactly once |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with a non-numeric scheduleWaitRandom: clamps to scheduleWaitBase |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | defended with undefined value: treats as 0 and enforces minimum delay |
| `dodge.DodgeScheduleControllerOverride.js` | startScheduleTimer | dashHandler absent: passes value through to parent unchanged |

### R7.6 - The reported buffer level is refreshed on every schedule tick of the trailing phase

The mock buffer only reaches the scheduler through `BUFFER_LEVEL_UPDATED`, which `BufferController`
fires from its own `_updateBufferLevel`. The callers of that are appends and the media element's
`timeupdate`, and both stop once the real content has been consumed. During the trailing phase,
the level the scheduler compares against its target would therefore be whatever was recorded before
playback ended, which is near zero, so every tick would decide to fetch and the padding cycles would
go out back to back at the random walk floor instead of at content pace. `_shouldClearScheduleTimer`
runs at the top of every tick, which is where the decision is made, so it refreshes the level there.

Only during the phase. Outside it `timeupdate` is still firing several times a second, so there is
nothing stale to correct, and each extra call is another opportunity to read a `SourceBuffer` that is
being torn down: `SourceBufferSink.getAllBufferRanges` catches that and reports it at error level,
which a functional run asserts against. A stalled stream is finished and is not refreshed either.

Consulting the phase here means `_shouldClearScheduleTimer` reads `getIsTrailing()` before it asks
the parent, where it used to short-circuit. R4.3 covers the verdicts, which are unchanged.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeScheduleControllerOverride.js` | refreshing the buffer level during the trailing phase | refreshes the buffer level during the trailing phase |
| `dodge.DodgeScheduleControllerOverride.js` | refreshing the buffer level during the trailing phase | refreshes on every tick of the phase, not only the first |
| `dodge.DodgeScheduleControllerOverride.js` | refreshing the buffer level during the trailing phase | leaves the buffer level alone during ordinary defended playback |
| `dodge.DodgeScheduleControllerOverride.js` | refreshing the buffer level during the trailing phase | leaves the buffer level alone when no defense is active |
| `dodge.DodgeScheduleControllerOverride.js` | refreshing the buffer level during the trailing phase | does not refresh a stalled stream, which is finished |

---

## 8. Request URL and Request Padding

### R8.1 - Every request URL carries a cache-busting query value

`_setRequestUrlWithCacheBuster()` resolves the request URL against the BaseURL the way vanilla `DashHandler._setRequestUrl()` does, then sets `queryParams[dodge.queryParam]` (default `padding`) to a short random string. `HTTPLoader` merges `queryParams` into the URL, and `applyRequestPadding()` later extends that same parameter to normalize wire size (R8.2).

The value is attached for **every** URL shape, including an absolute `SegmentTemplate@media` or `SegmentURL@media` and the single-file case where the resolved media URL is the BaseURL itself. Those two shapes skip the BaseURL resolution branch, and previously skipped the query value with it. Dodge re-requests the same segment across cycles, so without a value that differs per request the browser cache can satisfy a padding cycle and it never reaches the wire.

Each request owns its `queryParams` object: the BaseURL's is cloned, never aliased, because `HTTPLoader`'s retry path appends `request.queryParams` to `request.url` and a shared object would produce duplicate parameters on the wire.

No URL length equalization is performed. Wire size is normalized in full by R8.2, which also covers the `Range` header and CMCD.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | relative template URL, queryParams.padding is set on the request |
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | absolute media URL: request carries the cache-busting query parameter |
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | media URL identical to the BaseURL: request carries the cache-busting query parameter |
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | request.queryParams is not the BaseURL.queryParams object (cloned, not aliased) |
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | baseURL.queryParams is not mutated by request generation |
| `dodge.DodgeDashHandlerOverride.js` | Request URL query parameter | request.queryParams.padding is stable across subsequent generated requests against the same BaseURL |

### R8.2 - Request padding normalizes HTTP wire size to `[paddingLengthBase, paddingLengthBase + paddingLengthRandom]`

`applyRequestPadding()` measures the URL + headers wire size and extends a query parameter (configurable via `dodge.queryParam`, default `'padding'`) so that the total equals `paddingLengthBase + Math.round(Math.random() * paddingLengthRandom)`. Disabled when `paddingLengthBase ≤ 0`. When the padding query param doesn't already exist in the URL, it is added and the overhead of `?key=` / `&key=` is accounted for. URLs are resolved before they are measured, and one that cannot be resolved at all is reported at error level (R8.3). Both length settings are read through `resolveNumericSetting()` (R11.8), so an unusable value - negative, NaN, or a quoted number - resolves to 0 and is logged once per module load (misconfiguration is visible but not fatal). An unusable `paddingLengthBase` therefore disables padding through the same `<= 0` branch as an explicit 0, instead of falling through every guard as NaN and leaving the request unpadded but unreported.

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | applyRequestPadding | paddingLengthBase = 0: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | non-numeric paddingLengthBase: URL is not modified and warns exactly once |
| `dodge.RequestPadding.js` | applyRequestPadding | NaN paddingLengthBase: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | numeric string paddingLengthBase: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | paddingLengthBase < 0: URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | request with pad > 0: URL is extended by exactly pad bytes |
| `dodge.RequestPadding.js` | applyRequestPadding | after padding, wire size equals paddingLengthBase (paddingLengthRandom = 0) |
| `dodge.RequestPadding.js` | applyRequestPadding | headers contribute to the measured size |
| `dodge.RequestPadding.js` | applyRequestPadding | existing padding value is preserved as prefix of the extended value |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom > 0, wire size is in [paddingLengthBase, paddingLengthBase + paddingLengthRandom] |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom < 0, clamps to 0 and warns exactly once across calls |
| `dodge.RequestPadding.js` | applyRequestPadding | with a non-numeric paddingLengthRandom, wire size is deterministically paddingLengthBase |
| `dodge.RequestPadding.js` | applyRequestPadding | with paddingLengthRandom = 0, wire size is deterministically paddingLengthBase |
| `dodge.RequestPadding.js` | applyRequestPadding | pad = 0 (already at paddingLengthBase): URL is not modified |
| `dodge.RequestPadding.js` | applyRequestPadding | request already exceeds paddingLengthBase: warns and does not modify URL |
| `dodge.RequestPadding.js` | applyRequestPadding | custom queryParam name: padding applied to the correct parameter |

### R8.3 - A relative request URL is resolved before it is measured and padded

A page may hand `attachSource` a relative manifest URL, and that request reaches the loader written
the way the page wrote it. `applyRequestPadding` resolves every URL against `window.location.href`
before measuring it, and puts the resolved URL back on the request.

A URL that cannot be resolved even against the document is reported at error level and names the
request. An unpadded request is a defense failure.

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | applyRequestPadding | relative URL: padded to the target size |
| `dodge.RequestPadding.js` | applyRequestPadding | a relative URL and its absolute equivalent reach the same wire size |
| `dodge.RequestPadding.js` | applyRequestPadding | a URL that cannot be parsed at all is reported as an error naming it |
| `dodge.RequestPadding.js` | applyRequestPadding | a path with no scheme is resolved and padded, not treated as invalid |

### R8.4 - FetchLoader applies request padding before dispatching the request

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | delegates to parent.load() |
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | extends URL before calling parent.load() when paddingLengthBase is set |
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | preserves original request headers after padding |
| `dodge.RequestPadding.js` | DodgeFetchLoaderOverride | passes through config argument to parent.load() |

### R8.5 - XHRLoader applies request padding before dispatching the request

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | delegates to parent.load() |
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | extends URL before calling parent.load() when paddingLengthBase is set |
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | preserves original request headers after padding |
| `dodge.RequestPadding.js` | DodgeXHRLoaderOverride | passes through config argument to parent.load() |

---

### R8.6 - An unset `dodge.paddingLengthBase` is reported

Wire size normalization is the only request-side defense Dodge performs, so `paddingLengthBase ≤ 0` leaves URL, `Range` header and CMCD lengths varying with the content being requested. `tryProcessExtendedManifest()` reports it alongside the side-channel scans: a warning under `'representation'` and `'manifest'`, rejection under `'max'`, and silence when `strictMode` is `false`. The default is 1024, so this fires only on a deliberate override.

The gate reads the setting through `resolveNumericSetting()` (R11.8) rather than comparing the raw value. Every value that disables padding has to trip it, and a raw `<= 0` comparison catches only the literal 0 and negatives: `'abc' <= 0` and `NaN <= 0` are both false, so an unusable value would pass the one check that exists to catch "padding is off" and be accepted even under `'max'`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | paddingLengthBase 0 under representation: warns and still accepts |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | paddingLengthBase 0 under manifest: warns and still accepts |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | paddingLengthBase 0 under max: rejects the manifest |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | negative paddingLengthBase is treated as disabled: warns |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | non-numeric paddingLengthBase under max: rejects the manifest |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | NaN paddingLengthBase under max: rejects the manifest |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | numeric string paddingLengthBase under max: rejects the manifest |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | non-numeric paddingLengthBase under representation: warns and still accepts |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | paddingLengthBase set under max: accepted without warning |
| `dodge.DodgeHandler.js` | paddingLengthBase warning in tryProcessExtendedManifest | strictMode off: no warning even with paddingLengthBase 0 |

### R8.7 - A retried request is measured after its duplicate query parameters are collapsed

`HTTPLoader._updateRequestUrlAndHeaders()` guards `_addExtUrlQueryParameters()` with
`request.retryAttempts === 0` but does not guard `_addPathwayCloningParameters()`, which appends
`request.queryParams` to `request.url` in place. Dodge attaches its cache-busting value through
exactly that field (R8.1), so a retried request arrives at the loader carrying one copy of the
parameter per attempt: four copies at the default of three retries.

`applyRequestPadding()` collapses them with `searchParams.set()` before it measures, so the
measured size is the size of one copy and the padded result is identical to the first attempt's.
Collapsing after the measurement instead is not merely untidy. The copies inflate the size that
the `pad < 0` branch tests, and past `paddingLength` that branch returns having applied no padding
at all, so the retry goes out at its natural length while the first attempt went out normalized.
That is the one outcome `paddingLengthBase` exists to prevent, it gets likelier with each retry,
and it is invisible from the wire size of a healthy request.

The final `searchParams.set()` that appends the zeros is what adds the parameter when it is absent,
so a request that never carried one is unaffected by the collapse.

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | Retried requests | duplicate copies of the query parameter left by a retry are collapsed to one |
| `dodge.RequestPadding.js` | Retried requests | a retried request is padded to the same wire size as its first attempt |
| `dodge.RequestPadding.js` | Retried requests | duplicates do not push a request under paddingLengthBase past the oversize branch |
| `dodge.RequestPadding.js` | Retried requests | the cache-busting value survives the collapse as the prefix |

### R8.8 - A `blob:` or `data:` source is never padded

An application that builds the extended manifest in the page hands it to `initialize()` as an
object URL. That request is a local read: there is no HTTP wire size to normalize, so padding it
adds nothing to the defense. It also cannot be padded. Browsers resolve a `blob:` URL by exact
lookup and refuse one that carries a query string, so extending the `padding` parameter turns
the manifest load into a network error (dash.js error 25, `MANIFEST_LOADER_LOADING_FAILURE`)
and playback never starts. A `data:` URL is treated the same way: its query would be parsed
as part of the payload.

`applyRequestPadding()` returns before measuring when the resolved URL's scheme is `blob:` or
`data:`, without warning: this is the expected shape of an in-page manifest, not a
misconfiguration. Every network scheme is still padded as before (R8.2, R8.3).

| File | Description | Test |
|---|---|---|
| `dodge.RequestPadding.js` | Non-network sources | a blob: URL is not padded: it never reaches the wire and cannot carry a query string |
| `dodge.RequestPadding.js` | Non-network sources | a data: URL is not padded |

---

## 9. Extended Manifest Validation and Registry

### R9.1 - Structural validation rejects malformed manifests

`isValidExtendedManifest()` validates the top-level structure of extended manifest files: `start.mpd` and `start.base_uri` must be present and strings, and `start.base_uri` must additionally be an **absolute http(s) URL whose path ends in `/`**, `streams` must be a non-empty array where each entry has a `label` and at least one of `init` or `data`. It does **not** gate on the embedded MPD's `@type`; that check lives in R10.11, which reads the parsed value. Data cycle fields are validated: `index` must parse to a non-negative integer, `range` must be a well-formed string, `padding` must be a boolean (or a string parseable to boolean) or absent, `buffer` must be a boolean (or a string parseable to boolean), an array of non-negative integers (selective buffer), or absent, and `quality` is optional - when present, it must be either a non-empty string (representation ID, resolved lazily in the override against `adapter.getVoRepresentations(mediaInfo)`) or a non-negative JSON number (index into the same array). Numeric strings are kept as strings and treated as representation IDs; a warning is logged to flag the ambiguity. Use a JSON number if an index is intended.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | null, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start.mpd, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing start.base_uri, false |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | empty string is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | a bare word is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | a phrase that is not a URL is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | no trailing slash is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | path absolute, no scheme or host is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | scheme relative is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | a non-HTTP scheme is rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, rejected | a non-string is still rejected |
| `dodge.DefenseRegistry.js` | base_uri validation, accepted | https with a path is accepted |
| `dodge.DefenseRegistry.js` | base_uri validation, accepted | https at the root is accepted |
| `dodge.DefenseRegistry.js` | base_uri validation, accepted | plain http is accepted |
| `dodge.DefenseRegistry.js` | base_uri validation, accepted | a port is accepted |
| `dodge.DefenseRegistry.js` | base_uri validation, accepted | a query string is accepted |
| `dodge.DefenseRegistry.js` | base_uri validation, diagnostics | a missing trailing slash says so, and does not blame the URL syntax |
| `dodge.DefenseRegistry.js` | base_uri validation, diagnostics | a relative value is reported as not absolute |
| `dodge.DefenseRegistry.js` | base_uri validation, diagnostics | the offending value is quoted |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | dynamic MPD is not gated by structural validation |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | missing streams, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | empty streams array with valid start, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | non-array streams with valid start, false |
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
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with an omitted range start, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with an omitted range end, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with an empty range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with a zero range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with an absent range is still unranged, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | the rejection names the suffix range semantics |
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
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [5] referencing unseen index, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with buffer = [0, 3] where index 3 has not appeared, false |
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

### R9.2 - Init cycle validation enforces range, padding, and buffer flag rules

`checkInitCycles()` validates that each init cycle has a valid range string (`"start-end"` where start ≤ end) or absent, with an **explicit start**, that `padding` is a boolean (or a string parseable to boolean) or absent, that `buffer` is a boolean (or a string parseable to boolean) or absent (array buffer is never valid on init cycles). Buffer flags are allowed on non-last init cycles (per-run termination semantics).

Both bounds must be **plain decimal digits**, the end optionally empty.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-string range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with range start > end, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with an omitted range start, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with an omitted range end, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with non-string range (number), false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle buffer flag on non-last cycle is allowed (per-run termination) |
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
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle with an empty range, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | hexadecimal is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | exponent notation is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | a fractional bound is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | a leading space is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | an explicit plus sign is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | Infinity is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | binary notation is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | a fractional backwards range is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | an exponent backwards range is rejected |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | plain digits are still accepted |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest, a range must be plain decimal digits | an omitted end is still accepted |

### R9.3 - Init cycle quality validation and explicit buffer requirement

Init cycles may carry a `quality` field with the same semantics as on data cycles (non-empty string matched against representation ID, or non-negative integer index into the adaptation set). Numeric strings are accepted as representation IDs with a warning. `buffer` is designer-owned; as a backward-compatible default, if no cycle carries a `quality` override and no cycle has `buffer: true`, the last init cycle is auto-buffered.

`full` is derived per quality group via a backward scan: the last cycle of each group is `full`, **unless that group contains no non-padding cycle**, in which case no cycle in it is `full`.

Padding cycles are deliberately *not* excluded from the scan, which is where the init side departs from `computeDataCycleFull` (R9.4). A trailing padding init cycle carrying `full` is the intended shape: it holds the init segment's release until after the padding, and `_onFragmentLoadingCompleted` never accumulates a padding response, so only the earlier real pieces of that group are assembled. Excluding padding outright would move the release earlier and change the buffer timing.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | rejects init cycle with empty string quality |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | rejects init cycle with negative integer quality |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | rejects init cycle with non-integer number quality |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | rejects init cycle with non-string, non-number quality |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | accepts init cycle with valid string quality (with explicit buffer flags) |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | accepts init cycle with valid numeric quality (with explicit buffer flags) |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | multi-representation init without buffer flags: no default (designer-owned) |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | single primary init group without buffer: defaults buffer: true on last cycle |
| `dodge.DefenseRegistry.js` | init cycle quality validation and explicit buffer requirement | explicit multi-representation init: each buffer-flagged cycle is full |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | a trailing padding cycle carries full for its group |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | only the last of several trailing padding cycles is full |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | each quality group ends at its own last cycle |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | an all-padding init list marks no cycle full |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | a home padding cycle is not full when only an override cycle is real |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | an override padding cycle with no real cycle of its own is not full |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | the same holds for a numeric quality key |
| `dodge.DefenseRegistry.js` | init cycle full computation with padding cycles | a padding cycle that is not full still keeps its default buffer flag |

### R9.4 - Data cycle validation enforces index validity, computes `maxNoPad` and precomputes `cycle.full`

`checkDataCycles()` validates that data cycle indices are non-negative integers, computes `stream.maxNoPad` as the index of the last non-padding cycle, and precomputes `cycle.full` for each data cycle via a right-to-left scan.

A valid index is **normalized to a number in place**, alongside `padding`, `buffer` and each element of a selective buffer array. `checkDataCycleFields` is shared by the full-manifest, `appendDataCycles` and `finalizeStream` paths, so all three normalize.

The scan marks one cycle per **assembly group**, not per segment index. `DodgeHandler._concatPartialSegments` matches accumulated pieces by segment index *and* by representation, so a cycle carrying a `quality` override forms its own group; `markAssemblyGroups()` keys on `_initQualityKey(cycle) + '|' + index`, the same way `checkRangeContiguity` (R9.5) and `checkInitCycles` (R9.3) already do. Marking one cycle per index instead leaves the other group's responses accumulated in `partialSegments` and never assembled, where they stay for the life of the stream. A buffer directive still names segment indices, not qualities; what the grouping changes is only which cycles it marks for those indices.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle with negative index, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | sets stream.maxNoPad to the last non-padding cycle index |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | sets stream.maxNoPad excluding trailing padding cycles |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: last non-padding occurrence of each index is full |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full correctly with interleaved indices |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: buffer = true forces full even when same index appears later |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: selective buffer array forces full even when same index appears later |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: a quality override forms its own assembly group |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: the last cycle of each quality group is the full one |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: a numeric and a string quality are separate groups |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: an override group flushed by a later directive |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | rejects an override group fetched after its index was flushed |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: multiple buffer windows each get independent full marks |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: selective buffer only marks target indices, remainder marked at next flush |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: empty buffer array does not force full |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | precomputes cycle.full: padding cycles are never full |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a string index is stored as a number |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a string index with a selective buffer array is accepted |
| `dodge.DefenseRegistry.js` | data cycle index normalization | full flags with string indices match the numeric equivalent |
| `dodge.DefenseRegistry.js` | data cycle index normalization | getCycleIndexBySegmentIndex finds a cycle authored with a string index |
| `dodge.DefenseRegistry.js` | data cycle index normalization, progressive runtime paths | appendDataCycles normalizes a string index |
| `dodge.DefenseRegistry.js` | data cycle index normalization, progressive runtime paths | finalizeStream normalizes a string index on a trailing padding cycle |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a numeric index is unchanged |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a non-numeric string index is still rejected |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a fractional index is still rejected |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a negative index is still rejected |
| `dodge.DefenseRegistry.js` | data cycle index normalization | a numeric-string quality is still stored as a string |

### R9.5 - Assembled byte ranges must leave no gap

`DodgeHandler._concatPartialSegments` sizes the assembled segment from the lowest range start to the
highest range end and writes each piece at its own offset. A span no cycle covers is therefore
appended to the SourceBuffer as zeros, with nothing reported. `checkRangeContiguity()` rejects a
manifest whose cycle ranges leave such a hole, in both init and data cycles, and in a progressive
batch appended through `appendDataCycles`.

**Overlap is accepted.** Pieces are written over each other, and redundant coverage is a legitimate
defense lever, so only a hole is an error.

**What this cannot check** is whether the ranges cover the *whole* segment. Segment sizes come from
measurement, not from the MPD (R10.15), so under-coverage at the end is indistinguishable from a
segment that is exactly that long. Only interior holes are detectable.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle ranges that tile the segment, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle ranges with a gap, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle ranges that overlap, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | data cycle ranges given out of order that still tile, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | a padding cycle does not close a gap, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | a single ranged cycle, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | a cycle without a range, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | an empty range does not switch off the contiguity check |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | an open-ended range covers everything after it, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | each segment index is checked separately, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | ranges are grouped per assembly, not per stream, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | quality override cycles form their own group, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle ranges with a gap, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | init cycle ranges that tile, true |

### R9.6 - Cycle index lookup

`getCycleIndexBySegmentIndex()` returns the index of the first non-padding cycle matching a given segment index, or `-1` if not found. Callers resolve a playback time to a segment index through `segmentsController.getSegmentByTime()` first, since segment durations are not uniform under SegmentTimeline.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns the first cycle index for segment 0 |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns the first cycle index for segment 1 (skipping earlier cycles for segment 0) |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | returns -1 when segment index is not in the stream |
| `dodge.DefenseRegistry.js` | getCycleIndexBySegmentIndex | skips padding cycles when searching by index |

### R9.7 - Registry stores and retrieves extended manifests by label

`addExtendedManifest()` validates and stores manifests. `getDefendedStreamInfo()` retrieves a stream entry by label. `hasContent()` reflects whether any manifests are stored. `reset()` clears all state.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | instance | addExtendedManifest with a valid manifest, returns true |
| `dodge.DefenseRegistry.js` | instance | addExtendedManifest with null, returns false |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo finds a registered stream by label |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo returns null for an unknown label |
| `dodge.DefenseRegistry.js` | instance | reset clears all manifests, getDefendedStreamInfo returns null after reset |

### R9.8 - Period field validation

The optional `period` field on stream entries must be a non-negative integer when present. Null or absent values are accepted. Strings that parse to non-negative integers are coerced in place (following the same `Number()` pattern as `data[i].index`). Floats, negative numbers, and non-numeric strings are rejected.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with valid period (non-negative integer), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with period = null (absent), true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with negative period, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with non-integer period, false |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with numeric string period, coerced to integer, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | stream with non-numeric string period, false |

### R9.9 - Period-scoped stream lookup for multi-period MPDs

`getDefendedStreamInfo(label, periodIndex)` matches streams by label and, when the stream has a `period` field, also by period index. Streams without a `period` field match any period. When no stream matches the given period, returns null. When `periodIndex` is not passed, the first label match is returned regardless of period.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, matches stream with matching period field |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, returns null when no period matches |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo with periodIndex, stream without period field matches any period |
| `dodge.DefenseRegistry.js` | instance | getDefendedStreamInfo without periodIndex, matches stream with period field |

### R9.10 - Override passes period index to defense registry lookup

`updateDefendedStreamInfo(representation)` passes `representation.adaptation.period.index` to `getDefendedStreamInfo()`, enabling correct per-period defense data resolution in multi-period MPDs. When two periods share the same representation ID, each period's override instance receives its own defense data.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | updateDefendedStreamInfo resolves correct stream for each period |
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | updateDefendedStreamInfo returns false for unmatched period |
| `dodge.DodgeDashHandlerOverride.js` | Multi-period support | stream without period field matches any period |

### R9.11 - Progressive flag validation and self-contained seed requirement

A stream entry may carry an optional `progressive` boolean (string `'true'`/`'false'` accepted and coerced; other values rejected). When `progressive` is true, the stream's data cycles are incomplete and will be extended at runtime (progressive defense generation). The initial data (seed) in a progressive stream, in the original extended manifest, MUST be self-contained: every non-padding segment index the seed introduces must be flushed within the seed, because later appended batches cannot flush an earlier batch's indices. R9.16 holds a complete manifest to the same rule for its own reason, so what `progressive` changes here is only how a leftover index is described in the rejection.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with progressive = true, true |
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with progressive = false, true |
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with progressive string "true", coerced to boolean, true |
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with progressive string "false", coerced to boolean, true |
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with non-boolean progressive (number), false |
| `dodge.DefenseRegistry.js` | progressive flag validation | stream with non-parseable string progressive, false |
| `dodge.DefenseRegistry.js` | progressive flag validation | progressive stream with self-contained data (all introduced indices flushed), true |
| `dodge.DefenseRegistry.js` | progressive flag validation | progressive stream leaving an introduced index unflushed, false |
| `dodge.DefenseRegistry.js` | progressive flag validation | progressive stream with empty data (init-only seed), true |
| `dodge.DefenseRegistry.js` | progressive flag validation | a complete manifest is held to the same rule as a progressive batch |

### R9.12 - Runtime append and finalize of progressive manifests

`appendDataCycles(label, period, cycles)` extends a progressive stream at runtime. The append is atomic and self-contained: the stream must exist and be progressive; every cycle is structurally validated on a clone (a failure changes nothing); `full` flags are computed over the batch alone, and every non-padding index the batch introduces must be flushed within the batch (a selective buffer array may only reference indices introduced by the batch, so a batch is a complete buffer window). On success, the cycles are appended with correct `full` flags, `maxNoPad` is recomputed, and the already-consumed prefix is never touched. Because `getDefendedStreamInfo` returns the stored stream by reference, appended cycles are visible to the override immediately. `finalizeStream(label, period, paddingCycles)` requires the stream to exist and still be progressive (a non-progressive or already-finalized stream is rejected, so a double finalize changes nothing); it appends optional trailing padding (which must be padding cycles), clears the `progressive` flag, and recomputes `maxNoPad`; after finalize, both `appendDataCycles` and a further `finalizeStream` fail.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles returns false when no stream matches the label |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles returns false when the stream is not progressive |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles returns false for an empty batch |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles appends a self-contained batch and returns true |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles makes new cycles visible via the live stream reference |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles computes full flags over the batch alone |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles updates maxNoPad |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles rejects a batch that leaves an introduced index unflushed, changing nothing |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles rejects a batch whose buffer array references an index outside the batch, changing nothing |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles rejects a structurally invalid batch, changing nothing |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles does not mutate the caller batch buffer array |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream returns false when no stream matches the label |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream clears the progressive flag and returns true |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream appends trailing padding and excludes it from maxNoPad |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream rejects a non-padding trailing cycle, changing nothing |
| `dodge.DefenseRegistry.js` | progressive append and finalize | appendDataCycles returns false after finalizeStream |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream returns false on a second (double) finalize, changing nothing |
| `dodge.DefenseRegistry.js` | progressive append and finalize | finalizeStream returns false for a non-progressive (complete) stream |

### R9.13 - Override stalls (does not finish) while a manifest is progressive

When `defendedStreamInfo.progressive` is true, `getNextSegmentRequest` stalls (returns `null` without setting `mediaHasFinished`, not advancing `lastCycleIndex`) when playback runs off the end of the cycles generated so far - including the empty-data case - rather than declaring the stream finished. `isLastSegmentRequested` returns `false` while progressive. This reuses the existing missing-segment stall path, so the scheduler retries once the next batch is appended. After `finalizeStream` clears the flag, the override resumes normal finish behavior (serving any trailing padding, then ending).

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | getNextSegmentRequest stalls (returns null, no parent call) when running off the end while progressive |
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | isLastSegmentRequested returns false while progressive, even at the last generated cycle |
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | getNextSegmentRequest with empty progressive data stalls instead of finishing |
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | appended cycles become available to getNextSegmentRequest via the stream reference |
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | after finalizeStream, getNextSegmentRequest finishes when running off the end |
| `dodge.DodgeDashHandlerOverride.js` | Progressive manifests | after finalizeStream with trailing padding, the padding cycles are downloaded then the stream finishes |

### R9.14 - `DodgeHandler` exposes progressive append/finalize via delegation

`DodgeHandler.appendDataCycles(label, period, cycles)` and `DodgeHandler.finalizeStream(label, period, paddingCycles)` are thin pass-throughs to the corresponding `DefenseRegistry` methods, returning the registry's result unchanged. They are the in-module surface for progressive defense generation; `MediaPlayer.appendDodgeDataCycles` / `MediaPlayer.finalizeDodgeStream` expose them publicly (guarded by `playbackInitialized`, returning `false` when the Dodge module is not loaded). Because the registry stores the stream by reference, an accepted append is visible to the override on the next request with no further modifications.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | appendDataCycles appends a self-contained batch and returns true |
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | appendDataCycles returns false for an unknown label |
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | appendDataCycles returns false for a non-progressive stream |
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | finalizeStream clears the progressive flag and returns true |
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | finalizeStream appends trailing padding cycles |
| `dodge.DodgeHandler.js` | progressive append and finalize delegation | appendDataCycles returns false after finalizeStream |

### R9.15 - A progressive stream is never in the trailing phase

`request.trail` and `getIsTrailing()` both ask whether a cycle sits past all playable content, and
both answer it from `maxNoPad` and the length of `data`. On a progressive stream those describe the
cycles generated so far, not the cycles the defense will end up with, so neither can answer the
question until `finalizeStream` runs. Both therefore report false while `progressive` is set,
the same guard `getNextSegmentRequest` and `isLastSegmentRequested` already apply (R9.13).

What `finalizeStream` moves is the flag, not `maxNoPad`. It appends padding cycles only, and
`computeMaxNoPad` advances on non-padding cycles alone. Padding sitting at the end of the
generated data is therefore trailing or not according to when it is fetched: `trail` is false while
the stream is progressive and true for that same cycle once it has been finalized. Both are right,
because finalizing is what decides where the content ends.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | a padding cycle at the end of the generated data does not set trail |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | getIsTrailing() is false at the end of the generated data |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | an appended batch that ends in padding still does not set trail |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | finalizeStream turns the trailing phase back on |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | padding left over from a batch becomes trailing once the stream is finalized |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | padding already fetched before finalizeStream keeps trail false |
| `dodge.DodgeDashHandlerOverride.js` | a batch ending in padding is not the trailing phase | a seek onto the last generated content cycle does not enter the trailing phase |

### R9.16 - Every segment index is flushed by a buffer directive

`cycle.full` assembles the pieces accumulated for an assembly group. What releases the assembled
chunk to the SourceBuffer is the buffer directive, and there is no end-of-stream flush anywhere in
`DodgeHandler`: the only two things that drain `pendingInit` and `pendingMedia` are a later cycle
whose buffer directive is active (R2.9) and a home representation switch (R2.15). A segment index
still pending when a stream's data cycles run out is therefore downloaded, assembled, and parked
in `pendingMedia` for the life of the stream, holding its bytes and reaching no buffer.

`computeDataCycleFull` rejects the manifest instead. This covers both shapes it can take, which fail
differently but fail the same way:

- The index is the stream's own content and no directive ever names it. Playback stops short of the
  end with nothing logged, which is the worse of the two because it looks like a stall.
- The index was flushed earlier and a later cycle fetches it again at another quality. Nothing is
  missing from playback, but the sibling's bytes are assembled and then held for nothing.

The second shape is the one a defense might actually want, and the way to express it is a padding
cycle, whose response is never accumulated (R2.2). `padding` and `quality` compose, so a decoy fetch
of a sibling's segment costs no accumulation, no assembly, and no queue entry.

| File | Description | Test |
|---|---|---|
| `dodge.DefenseRegistry.js` | every segment index is flushed | a stream whose last content index is never flushed, false |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a stream that flushes nothing at all, false |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a selective buffer that never names an index it introduced, false |
| `dodge.DefenseRegistry.js` | every segment index is flushed | names every unflushed index in the rejection message |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a stream whose last content cycle carries the buffer flag, true |
| `dodge.DefenseRegistry.js` | every segment index is flushed | trailing padding after the last flush does not leave an index pending, true |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a padding cycle carrying the buffer flag closes the window, true |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a post-flush decoy expressed as a padding cycle, true |
| `dodge.DefenseRegistry.js` | every segment index is flushed | a stream with no data cycles at all, true |
| `dodge.DefenseRegistry.js` | every segment index is flushed | an index refetched and reflushed in a later window, true |
| `dodge.DefenseRegistry.js` | isValidExtendedManifest | rejects an override group fetched after its index was flushed |
| `dodge.DefenseRegistry.js` | progressive flag validation | a complete manifest is held to the same rule as a progressive batch |

---

## 10. Extended Manifest Processing

### R10.1 - `tryProcessExtendedManifest` parses JSON and returns MPD data or gracefully degrades

Without strict mode, invalid JSON or invalid extended manifests return `null` (graceful degradation). Valid extended manifests return `{ mpd, baseUri }`. Successive calls are independent.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | input that is not valid JSON returns null |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | valid JSON with invalid extended manifest returns null |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | valid extended manifest JSON returns { mpd, baseUri } matching embedded values |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | two successive valid manifests: each returns its own mpd and baseUri independently |

### R10.2 - `tryProcessExtendedManifest` with `strictMode = manifest` or `'max'` fires an error for non-extended manifest sources

When `strictMode` is `'manifest'` or `'max'`, non-JSON or invalid extended manifest input causes `tryProcessExtendedManifest` to return `false` and fire `INTERNAL_MANIFEST_LOADED` with `DODGE_STRICT_MODE_ERROR_CODE`. The error message includes the source URL. Valid extended manifests still succeed normally. `'max'` inherits `'manifest'`'s abort behavior — it must not silently degrade to vanilla DASH on an undefendable source.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | non-JSON input: returns false and fires INTERNAL_MANIFEST_LOADED with error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | invalid extended manifest JSON: returns false and fires INTERNAL_MANIFEST_LOADED with error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | error message includes the URL |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = manifest | valid extended manifest: returns { mpd, baseUri } and does not fire error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = max | non-JSON input: returns false and fires INTERNAL_MANIFEST_LOADED with error |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest with strictMode = max | invalid extended manifest JSON: returns false and fires INTERNAL_MANIFEST_LOADED with error |

### R10.3 - `tryProcessExtendedManifest` without `strictMode = manifest` does not fire errors

When strict mode is not `'manifest'`, non-JSON input returns `null` without firing any error event.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest without strictMode = manifest | non-JSON input: returns null (no error) |

### R10.4 - `_onFragmentLoadingCompleted` routes events based on cycle type

The handler intercepts all `FRAGMENT_LOADING_COMPLETED` events. Vanilla requests (both successful and errored) pass through unchanged (sender stays non-null). Errored Dodge requests are intercepted (sender set to null) to prevent `StreamProcessor._handleFragmentLoadingError` from generating a corrupted retry that would advance or reset `lastCycleIndex`/`lastInitIndex`; playback stalls to preserve the defense. For successful Dodge cycles: full segments with `buffer` fire `MEDIA_FRAGMENT_LOADED`; full segments without `buffer` fire `MEDIA_FRAGMENT_PARTIAL` and queue `MEDIA_FRAGMENT_LOADED`; partial segments fire `MEDIA_FRAGMENT_PARTIAL` and queue data locally; padding cycles fire `PADDING_LOADED`. When a buffer cycle has pending full segments, they are flushed as secondary events before the primary event fires.

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

### R10.5 - `isDodgeActive` and `isDodgeTrailing` report defense status

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

### R10.6 - Unshaped tracks and references are detected after parsing

Thumbnail tracks, sidecar text tracks, XLink references, and event streams with network side effects
all fetch bytes without passing through `DashHandler`, so no cycle describes them:
`ThumbnailTracks` uses its own loader, a sidecar subtitle is one unshaped request for a whole file,
XLink resolution fetches external XML before playback starts, and the callback and reload event
schemes fire a request at a content-relative time chosen by the manifest author.
`rejectIfUnshapedTracks()` reports all four from the manifest `DashParser` produced, rejecting
under `'max'`, warning under `'representation'` and `'manifest'`, and doing nothing when strict
mode is off. Every finding is reported in a single message naming the periods and
representations involved.


| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | text tracks | a fragmented text track is not flagged |
| `dodge.DodgeHandler.js` | text tracks | a sidecar text track is flagged |
| `dodge.DodgeHandler.js` | text tracks | a sidecar text track warns rather than rejects below max |
| `dodge.DodgeHandler.js` | thumbnail tracks | a thumbnail track is flagged |
| `dodge.DodgeHandler.js` | thumbnail tracks | a plain video track is not flagged |
| `dodge.DodgeHandler.js` | XLink | an xlink:href on a Period is flagged |
| `dodge.DodgeHandler.js` | XLink | the literal text "xlink:href" inside an element is not flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | a callback EventStream is flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | a reload EventStream is flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | a callback InbandEventStream is flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | an InbandEventStream on a Representation is flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | an SCTE-35 EventStream is not flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | an ID3 metadata InbandEventStream is not flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | the reload scheme with a value other than 1 is not flagged |
| `dodge.DodgeHandler.js` | event streams with network side effects | an event stream warns rather than rejecting below max |
| `dodge.DodgeHandler.js` | warn rather than reject below max | thumbnails warn under representation |
| `dodge.DodgeHandler.js` | warn rather than reject below max | thumbnails warn under manifest |
| `dodge.DodgeHandler.js` | warn rather than reject below max | XLink warns under representation |
| `dodge.DodgeHandler.js` | warn rather than reject below max | several findings are reported in one message |
| `dodge.DodgeHandler.js` | strict mode gradation | max rejects and fires the strict mode error |
| `dodge.DodgeHandler.js` | strict mode gradation | strictMode false neither warns nor rejects |
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest leaves MPD structure to the post-parse gate | a thumbnail manifest is accepted under max and judged after parsing |

### R10.7 - Side channels are reported but never rejected

DRM license traffic, content steering, and DVB reporting each emit their own requests, but they go to
platform-wide endpoints and are unlikely to identify the content on their own. `_warnAboutSideChannels()`
warns about all three in every mode except `false`, and never rejects, in any mode including `'max'`.
It runs before the rejecting gates in `rejectParsedManifest` so its findings are reported even
when a gate below rejects the manifest.

Detection reads the parsed manifest: `ContentProtection` elements at period, adaptation or
representation level; a `ContentSteering` element on the MPD; and any `Metrics` entry carrying a
`Reporting` child.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | side channels warn but never reject | ContentProtection warns about DRM |
| `dodge.DodgeHandler.js` | side channels warn but never reject | a urn:uuid: value outside ContentProtection does not warn about DRM |
| `dodge.DodgeHandler.js` | side channels warn but never reject | ContentSteering warns |
| `dodge.DodgeHandler.js` | side channels warn but never reject | nothing warns when strictMode is false |
| `dodge.DodgeHandler.js` | side channels warn but never reject | DVB Reporting warns |

### R10.8 - CMCD warning during defended playback

When CMCD is enabled during Dodge playback, a warning is logged because client telemetry may leak content-identifying information. The warning serves as a diagnostic signal for the defense designer.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD enabled with strict mode off: no CMCD warning |
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD enabled with strict mode representation: warns about CMCD |
| `dodge.DodgeHandler.js` | CMCD warning in tryProcessExtendedManifest | CMCD disabled: no warning |

### R10.9 - Warning when strictMode is disabled

When `strictMode` is set to `false`, `tryProcessExtendedManifest` logs a warning that undefended representations will fall back to vanilla dash.js without any defense.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | tryProcessExtendedManifest | strictMode false: warns that strict mode is disabled |

### R10.10 - `cacheInitSegments` warning for anonymity set asymmetry

When `streaming.cacheInitSegments` is enabled during defended playback, `tryProcessExtendedManifest` logs a warning. ABR-driven init refetches on quality switches are not controlled by the extended manifest; if two videos in an anonymity set have differing init segment structures, init caching produces different wire patterns across the set. The warning surfaces this concern to the defense designer. With strict mode disabled, the warning is suppressed.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | cacheInitSegments warning in tryProcessExtendedManifest | cacheInitSegments enabled, multiple representations, strict: warns |
| `dodge.DodgeHandler.js` | cacheInitSegments warning in tryProcessExtendedManifest | cacheInitSegments enabled, single representation, strict: still warns |
| `dodge.DodgeHandler.js` | cacheInitSegments warning in tryProcessExtendedManifest | cacheInitSegments disabled, multiple representations: no warning |
| `dodge.DodgeHandler.js` | cacheInitSegments warning in tryProcessExtendedManifest | strictMode off: no warning even with cache enabled |

### R10.11 - A dynamic (live) MPD is rejected after parsing, in every strict mode

Extended manifests describe a fixed cycle array. Live content keeps adding segments that
have no cycle in it, so there is no defense to run and no partial defense to degrade to.

The check reads `manifest.type` after `DashParser` has run, via
`DodgeHandler.rejectIfDynamic()`, reached through `rejectParsedManifest()` (R10.13) and
only when Dodge processed the source.

On rejection the handler clears the registry, so a defense registered before the parse
cannot survive into a later load, and fires `INTERNAL_MANIFEST_LOADED` with
`DODGE_DYNAMIC_MANIFEST_ERROR` (301).

An absent `@type` means static, per the DASH spec, and is not rejected.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | a dynamic manifest is rejected |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | a static manifest passes |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | a manifest with no type passes |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | a null manifest passes |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | rejection fires INTERNAL_MANIFEST_LOADED with the dynamic manifest error code |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | the error is distinct from the strict mode error |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | the error message includes the URL |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | is fatal under strictMode false |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | is fatal under strictMode "representation" |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | is fatal under strictMode "manifest" |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | is fatal under strictMode "max" |
| `dodge.DodgeHandler.js` | rejectIfDynamic, post-parse dynamic MPD gate | registry content is cleared so no stale defense survives the rejection |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | double quotes is rejected |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | single quotes is rejected |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | spaces around the equals sign is rejected |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | type as the last attribute is rejected |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | an equivalent static MPD is not rejected |
| `dodge.DodgeHandler.js` | every legal spelling is caught once dash.js has parsed it | an MPD with no type attribute is not rejected |

### R10.12 - Representations needing byte-range discovery are reported

When an MPD does not pin `Initialization@range`, `SegmentBaseLoader` fetches bytes 0-1500,
then 0-3000, then 0-4500, and so on until it finds `moov`. When it does not pin
`SegmentBase@indexRange`, a comparable walk runs for `sidx`, with start offsets taken from
the file's own box layout. Either way, the request sequence is a function of where those
boxes sit in that particular file.

The requests themselves *are* padded: `SegmentBaseLoader` builds its loader through
`FactoryMaker` (`URLLoader`), so it inherits the Dodge loader overrides. What leaks is
their number, and for the `sidx` walk their byte ranges. None of it is under cycle control;
it comes from `SegmentsController` at representation setup, not from `DashHandler`, so
the extended manifest cannot shape it.

`DodgeHandler.rejectIfRangeDiscovery()` walks the parsed manifest and reports every
representation that would trigger either probe.

The fix on the manifest side is to publish explicit ranges, which reduces this to one `sidx`
fetch per representation with a range that is already part of the anonymity set. That
residual fetch is not shaped, and its response size scales with the segment count.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | detection | SegmentBase with neither index range nor initialization range |
| `dodge.DodgeHandler.js` | detection | SegmentBase with an index range but no initialization range |
| `dodge.DodgeHandler.js` | detection | SegmentBase with an initialization range but no index range |
| `dodge.DodgeHandler.js` | detection | a BaseURL-only representation |
| `dodge.DodgeHandler.js` | detection | SegmentBase inherited from the AdaptationSet |
| `dodge.DodgeHandler.js` | detection | one unranged representation among several ranged ones |
| `dodge.DodgeHandler.js` | representations that need no discovery | SegmentBase with both an index range and an initialization range |
| `dodge.DodgeHandler.js` | representations that need no discovery | SegmentTemplate with an initialization attribute |
| `dodge.DodgeHandler.js` | representations that need no discovery | SegmentList with an Initialization sourceURL |
| `dodge.DodgeHandler.js` | representations that need no discovery | no error is fired and nothing is warned |
| `dodge.DodgeHandler.js` | strict mode gradation | max blocks and fires the strict mode error |
| `dodge.DodgeHandler.js` | strict mode gradation | manifest warns and does not block |
| `dodge.DodgeHandler.js` | strict mode gradation | representation warns and does not block |
| `dodge.DodgeHandler.js` | strict mode gradation | strictMode false is silent |
| `dodge.DodgeHandler.js` | strict mode gradation | the diagnostic names the affected representation |
| `dodge.DodgeHandler.js` | strict mode gradation | the diagnostic names every affected representation |

### R10.13 - One post-parse gate is exposed to the dash.js core

`ManifestLoader` calls a single function, `DodgeHandler.rejectParsedManifest()`, immediately
after `parser.parse(data)`, and aborts the load when it returns true. The composition of
the individual gates (R10.11, R10.12) lives in `DodgeHandler`, so a new check that needs
the parsed manifest is added inside Dodge with no further edits to the dash.js core.

Gates run in order and stop at the first rejection. A manifest that is already refused will
not be played, so the remaining gates have nothing to report on and must not add a second
diagnostic for the same source.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | rejectParsedManifest, the single post-parse gate | runs the dynamic gate |
| `dodge.DodgeHandler.js` | rejectParsedManifest, the single post-parse gate | runs the range discovery gate |
| `dodge.DodgeHandler.js` | rejectParsedManifest, the single post-parse gate | a static manifest with explicit ranges passes both gates |
| `dodge.DodgeHandler.js` | rejectParsedManifest, the single post-parse gate | stops at the first rejection |
| `dodge.DodgeHandler.js` | rejectParsedManifest, the single post-parse gate | a non-blocking warning still lets the manifest through |

### R10.14 - A new source replaces the defense set

`MediaPlayer.attachSource()` on an already-initialized player calls
`_resetPlaybackControllers()`, which resets fifteen controllers and not this module.
`DefenseRegistry.reset()` otherwise runs only from `MediaPlayer.reset()`.

`tryProcessExtendedManifest` resets the registry and clears `streamState` once the payload has
parsed as JSON, before the manifest is stored. *After* the parse, so it only fires for something
that is actually an extended manifest. That deliberately leaves a payload which is **not** an
extended manifest alone, because a manifest refresh re-enters this same path and must not be
mistaken for a new source.

A source whose manifest is a plain MPD never parses as JSON, so it never
reaches the reset, and the previous source's registry outlives it. `hasContent()` stays true, so
under any strict mode every representation of the new source is blocked - none of them has an entry
- and the scheduler retries forever with nothing reported to the application. Under `strictMode: false`
it is worse: a representation id that happens to match an entry from the previous source is shaped by
that entry's byte ranges, which describe different content.

`_onStreamTeardownComplete` closes that half. `STREAM_TEARDOWN_COMPLETE` means the player has torn
the current source down and nothing else: `StreamController.reset()` is the only thing that fires
it, and `MediaPlayer._resetPlaybackControllers()` is that method's only caller, reached from
`attachSource()`, `attachView()` and `MediaPlayer.reset()`. A manifest refresh does not go
through it, so the refresh case above is untouched. `Events.extend(MediaPlayerEvents)` runs in
`MediaPlayer.setup()`, long before `_detectDodge()`, so the constant is always defined and the
listener is never registered against `undefined`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | a new source replaces the defense set | a label from the previous source no longer resolves |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | a colliding label resolves to the new source, not the old one |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | the new source's own streams still resolve |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | an invalid extended manifest does not leave the previous defense in place |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | a payload that is not an extended manifest leaves the defense intact |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | tearing down the source drops the defense set |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | tearing down the source drops what the partial segment queues hold |
| `dodge.DodgeHandler.js` | a new source replaces the defense set | a refresh-shaped reload without a teardown keeps the defense |

### R10.15 - The extended manifest's references into the MPD are verified at load

1. Every `label` names a Representation, scoped by period exactly as the runtime scopes it: an entry
   with a `period` is looked up only in that period, one without matches any.
2. Every Representation that reaches `DashHandler` has a stream entry, checked through
   `getDefendedStreamInfo()` itself so the check cannot drift from the lookup it mirrors. Thumbnail
   and sidecar text adaptations are excluded: they bypass `DashHandler` and carry no cycles by design.
3. `stream.period` is within the MPD's period count.
4. Every init and data cycle `quality` resolves against the siblings of the representation its stream
   names - a string against their ids, an integer against their count.

**Only references are checkable.** Cycle byte ranges are built from measured segment sizes, which
the MPD does not carry, so nothing here can confirm them. They remain the defense designer's
responsibility.

Unlike the side-channel gates this is fatal in every mode that enforces anything, because a mismatch
is a playback failure rather than a leak. Under `strictMode: false` the module is inert by design and
the check does not run at all. All findings are reported in one message.

The representation lists read here are the ones `DashParser` produced. `CapabilitiesFilter` later
removes representations the device cannot decode, mutating the same manifest, but it runs from
`StreamController` well after this gate. Checking before it is deliberate: the verdict is a property
of the manifest rather than of the device it was opened on.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a manifest whose labels and coverage match is accepted |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a label naming no representation is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a representation with no stream entry is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a period index beyond the manifest is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | an entry scoped to the wrong period is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | an entry without a period matches any period |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a string quality naming no sibling is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a string quality naming a sibling is accepted |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | an integer quality beyond the sibling count is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | an integer quality within the sibling count is accepted |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | an init cycle quality is checked too |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a thumbnail representation needs no stream entry |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | a sidecar text representation needs no stream entry |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | manifest and max reject it as well |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch, extended manifest against the MPD | strictMode false performs no check at all |


---

### R10.16 - A refusal is reported to the application, not only to the log

Every strict mode refusal, from the source-level gates and from the ones that run on the parsed
manifest, funnels through `_triggerStrictModeError`, which raises two events. `INTERNAL_MANIFEST_LOADED`
carries the error and stops the load. `Events.ERROR` carries the same `DashJSError` to the
application, because dash.js reports an error to the application only when something calls
`errHandler.error`, and `ManifestUpdater` does that for `MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE`
alone. A Dodge refusal is not one, so without the second event a refused source is indistinguishable
from a player that hung. `ErrorHandler.error` is a trigger of `Events.ERROR`, and Dodge has no
errHandler of its own, so it raises the event directly. The order follows `ManifestUpdater`,
which reports after the internal event. A source that is accepted raises neither.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | strict mode error reporting | a refusal fires the public ERROR event, not only the internal one |
| `dodge.DodgeHandler.js` | strict mode error reporting | the public error carries the same message as the internal one |
| `dodge.DodgeHandler.js` | strict mode error reporting | a manifest that is refused after parsing also reports |
| `dodge.DodgeHandler.js` | strict mode error reporting | a source that is accepted reports nothing |

---

## 11. Strict Mode Enforcement

### R11.1 - `strictMode = representation` blocks undefended representations when an extended manifest is active

When `strictMode` is `'representation'` and `defenseRegistry.hasContent()` is true, request generation functions return `null` and `isLastSegmentRequested` returns `false` for representations without a matching defended stream info entry. When no extended manifest is loaded (`hasContent() = false`), all functions fall back to the parent. When the label is known, defense works normally.

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

### R11.2 - `strictMode = manifest` blocks undefended representations identically

`strictMode = manifest` behaves the same as `representation` at the per-representation level (the manifest-level check is in `tryProcessExtendedManifest`, see R9.2). All request generation functions return `null` for unknown labels, and defense works normally for known labels.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getSegmentRequestForTime returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded but unknown label, getNextSegmentRequestIdempotent returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = manifest | with extended manifest loaded and known label, defense still works normally |

### R11.3 - `strictMode = max` blocks undefended representations identically

`strictMode = max` behaves the same as `representation` and `manifest` at the per-representation level, and it blocks undefended representations when an extended manifest is active. When no extended manifest is loaded, methods fall back to the parent. The `'max'` level additionally enforces manifest-level policies (see R10.6) and warns about side-channel settings.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with no extended manifest loaded, falls back to parent (hasContent() = false) |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded but unknown label, isLastSegmentRequested returns false without calling parent |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = max | with extended manifest loaded and known label, defense still works normally |

### R11.4 - DRM key session detection warns during defended playback

DRM license requests may leak content-identifying information through a channel Dodge cannot intercept. When a DRM key session is created during defended playback (`defenseRegistry.hasContent()` is true) and strict mode is enabled, DodgeHandler logs a warning. This is a diagnostic signal only - DRM is unlikely to be a useful vector for passive traffic analysis anyway. Key session error events (failed sessions) are ignored.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DRM key session detection | does not fire ERROR when key session created during defended playback (warn only) |
| `dodge.DodgeHandler.js` | DRM key session detection | no extended manifest loaded: ignores key session event |
| `dodge.DodgeHandler.js` | DRM key session detection | key session error events are ignored |

### R11.5 - NEED_KEY warns but does not block DRM in any mode

DodgeHandler listens for the internal `NEED_KEY` event. In all strict modes (including `'max'`), when a defense is active, a warning is logged but DRM is not blocked. When strict mode is off or no defense is active, the event is ignored. `_onNeedKey` never fires an error or sets `ignoreEmeEncryptedEvent`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | DRM NEED_KEY interception | does not fire ERROR on NEED_KEY during defended playback |
| `dodge.DodgeHandler.js` | DRM NEED_KEY interception | no extended manifest loaded: ignores NEED_KEY |

### R11.6 - `dodge.strictMode` is validated and fails closed

`dodge.strictMode` is the module's master enforcement switch, and `Settings` performs no
value validation of any kind. Every consumer compares it against exact tokens, so an
unrecognized value - `'Manifest'`, `'strict'`, `'representation '`, `true` - previously
compared unequal to every strict token and silently disabled enforcement, with no
diagnostic at all: the "strictMode is disabled" warning fires only on the exact value
`false`.

`createStrictModeReader(settings, logger)` in `src/dodge/utils/StrictMode.js` resolves the
setting to one of the four values named in `src/dodge/constants/DodgeConstants.js`
(`STRICT_MODE.NONE`, which is the boolean `false`, `REPRESENTATION`, `MANIFEST`, `MAX`).
Accepted values pass through unchanged; anything else, including a missing `dodge` block,
becomes `MAX`. The value is rendered with `JSON.stringify` in the warning, because the typo
most worth catching is a stray space, which bare interpolation renders identically to the
correct value.

The warn-once flag lives in the reader's closure, not at module scope, so each consumer
warns independently and tests do not depend on which file ran first.

| File | Description | Test |
|---|---|---|
| `dodge.StrictMode.js` | accepted values pass through unchanged | false is returned as the boolean, not coerced |
| `dodge.StrictMode.js` | accepted values pass through unchanged | representation is returned unchanged |
| `dodge.StrictMode.js` | accepted values pass through unchanged | manifest is returned unchanged |
| `dodge.StrictMode.js` | accepted values pass through unchanged | max is returned unchanged |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | wrong case becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | unknown token becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | trailing whitespace becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | boolean true becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | empty string becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | zero becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | null becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | undefined becomes max |
| `dodge.StrictMode.js` | unrecognized values fail closed to max | a missing dodge settings block becomes max |
| `dodge.StrictMode.js` | diagnostic | names the setting, quotes the value, and states the fallback |
| `dodge.StrictMode.js` | diagnostic | warns once per reader, however many times it is read |
| `dodge.StrictMode.js` | diagnostic | each reader warns independently |

### R11.7 - An invalid `strictMode` enforces as `'max'` at both levels

Failing closed has to hold at the manifest level and the representation level, since they
are separate consumers. At the manifest level an unrecognized value aborts on a source that
is not a valid extended manifest, and also rejects side channels, which is what
distinguishes `'max'` from `'manifest'`. At the representation level it blocks undefended
representations rather than delegating to the vanilla `DashHandler`.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | strictMode value validation | a wrong-case value is rejected and treated as max |
| `dodge.DodgeHandler.js` | strictMode value validation | a boolean true is rejected and treated as max |
| `dodge.DodgeHandler.js` | strictMode value validation | a value with trailing whitespace is rejected and treated as max |
| `dodge.DodgeHandler.js` | strictMode value validation | an invalid value gets max side-channel rejection, not just manifest abort |
| `dodge.DodgeHandler.js` | strictMode value validation | an invalid value warns, naming the setting and the fallback |
| `dodge.DodgeHandler.js` | strictMode value validation | an invalid value warns only once across repeated calls |
| `dodge.DodgeHandler.js` | strictMode value validation | each accepted value is honored and warns nothing about validity |
| `dodge.DodgeHandler.js` | strictMode value validation | a valid non-strict value still degrades a plain MPD rather than aborting |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = invalid value (fails closed) | with extended manifest loaded but unknown label, getInitRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = invalid value (fails closed) | with extended manifest loaded but unknown label, getNextSegmentRequest returns null |
| `dodge.DodgeDashHandlerOverride.js` | strictMode = invalid value (fails closed) | with a known label, defended requests are still generated normally |

### R11.8 - The numeric `dodge` settings are validated and fail closed

`resolveNumericSetting()` accepts a non-negative finite number and rejects everything else,
resolving the rejected value to 0 and returning the warning its caller logs. It covers
`scheduleWaitBase`, `scheduleWaitRandom`, `paddingLengthBase` and `paddingLengthRandom`. It
lives alongside `createStrictModeReader()` in `src/dodge/utils/StrictMode.js`, since both are
readers for the same settings block and both fail closed.

Rejected values resolve to 0, not to the documented default, because 0 is already the
"this defense is off" value for each of these settings and `paddingLengthBase = 0` is
already reported by strict mode (R8.6). Falling back to the default would paper over the
misconfiguration and leave the operator believing their value took effect.

The warn-once flag belongs to the caller, not to the resolver, so that one consumer's
warning cannot mask another's. `DodgeHandler` and `DodgeScheduleControllerOverride` each
hold per-instance flags; `applyRequestPadding` is a plain function and holds its flags at
module scope.

| File | Description | Test |
|---|---|---|
| `dodge.StrictMode.js` | non-negative finite numbers pass through unchanged | 0 is returned unchanged with no message |
| `dodge.StrictMode.js` | non-negative finite numbers pass through unchanged | 1 is returned unchanged with no message |
| `dodge.StrictMode.js` | non-negative finite numbers pass through unchanged | 32 is returned unchanged with no message |
| `dodge.StrictMode.js` | non-negative finite numbers pass through unchanged | 1024 is returned unchanged with no message |
| `dodge.StrictMode.js` | non-negative finite numbers pass through unchanged | 0.5 is returned unchanged with no message |
| `dodge.StrictMode.js` | unusable values resolve to 0 | negative resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | NaN resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | Infinity resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | -Infinity resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | numeric string resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | non-numeric string resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | empty string resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | null resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | undefined resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | boolean true resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | object resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | empty array resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | single-element array resolves to 0 and is reported as invalid |
| `dodge.StrictMode.js` | unusable values resolve to 0 | a missing dodge settings block resolves to 0 |
| `dodge.StrictMode.js` | diagnostic message | names the setting and states the fallback |
| `dodge.StrictMode.js` | diagnostic message | quotes a string value so it is distinguishable from the number |
| `dodge.StrictMode.js` | diagnostic message | shows NaN as NaN rather than as null |
| `dodge.StrictMode.js` | diagnostic message | reads the setting named in the call, not a fixed one |

---

## 12. Internal Helpers

### R12.1 - `_concatPartialSegments` assembles byte ranges correctly

The internal `_concatPartialSegments` function combines accumulated partial responses into a single buffer. It matches pieces by `index` (with `NaN` for init segments), `mediaType`, and `representation.id`.

It assembles through a `Uint8Array` view but returns that view's `ArrayBuffer`, because `chunk.bytes`
has to hold the same type the vanilla path puts there: `FragmentController.createDataChunk()` is
handed the loader's response, which is an `ArrayBuffer`. Returning the view instead is invisible on
the audio and video paths, since `SourceBuffer.appendBuffer()` accepts any `BufferSource`, so the
deviation only surfaces where something reads the bytes directly. `TextSourceBuffer` does, passing
`chunk.bytes` into `new DataView(bytes, ...)` and into ISOBoxer, and both reject a typed array.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | single piece without range info: assembles using 0 to byteLength - 1 |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | assembled bytes are an ArrayBuffer, the type the vanilla path produces |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | assembled bytes can back a DataView, which is what the text path builds |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | multiple pieces with contiguous ranges: merged correctly |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | multiple pieces with non-contiguous ranges: gap filled with zeros |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | pieces placed by range offset regardless of insertion order |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | NaN index matching for init segments |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | unmatched pieces are not consumed: different mediaType is not assembled |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | originalRange is used when available, range overrides it |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | matched pieces are removed from partialSegments array |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | a padding cycle carrying full assembles the earlier real pieces and not its own bytes |
| `dodge.DodgeHandler.js` | _concatPartialSegments via _onFragmentLoadingCompleted | a padding cycle response is not accumulated as a partial |

### R12.2 - `_createDataChunk` populates DataChunk correctly

The internal `_createDataChunk` function constructs a `DataChunk` from the assembled bytes and request metadata. All fields are copied directly from the request; `end` is computed as `start + duration`. `homeRepresentationId` defaults to `null` when undefined on the request.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | _createDataChunk via _onFragmentLoadingCompleted | populates chunk fields from request properties |
| `dodge.DodgeHandler.js` | _createDataChunk via _onFragmentLoadingCompleted | homeRepresentationId defaults to null when not set on request |
| `dodge.DodgeHandler.js` | _createDataChunk via _onFragmentLoadingCompleted | homeRepresentationId is set when present on request |
| `dodge.DodgeHandler.js` | _createDataChunk via _onFragmentLoadingCompleted | endFragment is true for full buffered segments |

### R12.3 - `getStreamStats` returns correct counts

The public `getStreamStats(streamId)` method returns `{ partialSegments, pendingInit, pendingMedia }` counts for a given stream. For unknown stream IDs, a new empty state is created and zeros are returned. Each stream ID is tracked independently.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | getStreamStats | returns zeros for unknown streamId |
| `dodge.DodgeHandler.js` | getStreamStats | returns correct counts after partials and pending segments accumulate |
| `dodge.DodgeHandler.js` | getStreamStats | tracks streams independently by streamId |

### R12.4 - Error fragments stall without corrupting state

When `_onFragmentLoadingCompleted` receives an errored Dodge request (`e.error` truthy with `full`
or `padding` defined), the download stalls permanently. `HTTPLoader` has already exhausted its
retries, so the segment is genuinely unavailable and rescheduling would only fail again. No Dodge
events are fired and no partial segments are accumulated. Vanilla errored requests (no
Dodge-specific fields) pass through unchanged.

`e.error` is deliberately left intact. `FRAGMENT_LOADING_COMPLETED` is a public event and an
application listening for download failures must still see them.

Nulling those two fields is not on its own enough to make the stall permanent; R12.8 covers what
restarts the schedule timer without reading either.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge request does not fire any Dodge events |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge request does not accumulate partial segments |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored vanilla request passes through without sender nulling |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge media request: StreamProcessor's error handler guard cannot fire |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge init request: StreamProcessor's error handler guard cannot fire |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge request leaves e.error intact for application listeners |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored vanilla request keeps its service location |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | successful Dodge request keeps its service location |

### R12.5 - A response longer than its declared range stalls the stream

An origin that ignores the `Range` header answers a ranged request with the whole resource
and a 200. `HTTPLoader` accepts it: it tests for 2xx, never for 206, and reads no
`Content-Range`. Two things then go wrong, and the second is the serious one.

`_concatPartialSegments` sizes its output buffer from the declared range, so writing a
longer body into it throws a `RangeError` out of `_onFragmentLoadingCompleted`.
`EventBus.trigger` has no try/catch around handler invocation, so the throw skips every
remaining listener and wedges the player. More importantly, if ranges are not being served
then every cycle is fetching the whole segment: the range-based defense is not running and
the wire pattern is the undefended one, while playback looks healthy.

`_onFragmentLoadingCompleted` therefore compares the response length against the declared
range as soon as the response arrives, before any state is touched, and stalls on a
mismatch: it logs at error level and returns with `e.sender` already nulled, firing no
events and accumulating no partial. This mirrors R2.10, where an unresolvable quality
override stalls rather than falling back.

Returning stops this response but not the next request, so the stall is also recorded
against the stream and media type, exactly as a download failure records it (R12.4, R12.8).
Without that, `StreamProcessor._onFragmentLoadingCompleted` would restart the schedule timer
for a fragmented text stream on the way out, and a seek or `PLAYBACK_STARTED` would restart
it for any media type. An origin that ignores `Range` ignores it for every cycle, so a
stream that carried on would fetch whole segments for the rest of playback.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a full request whose response exceeds its range does not throw |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a partial request whose response exceeds its range does not throw |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an over-length response fires no fragment loaded event |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an over-length response logs an error naming the URL and both sizes |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an over-length response stalls by nulling e.sender |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an over-length response is not accumulated as a partial |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a response exactly matching the declared range is accepted |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a response shorter than the declared range is accepted |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an open-ended range pins no length and is not checked |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a request with no range at all is not checked |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an explicit start of 0 is checked from 0 |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | originalRange is checked when range is absent |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | range overrides originalRange for the check |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an over-length response records the stall for its stream and media type |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | the stall from an over-length response is scoped to the media type that failed |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a text response that exceeds its range records the stall like any other media type |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a response within its declared range records no stall |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | an init segment whose response exceeds its range is rejected |
| `dodge.DodgeHandler.js` | Range-ignoring origin detection, _onFragmentLoadingCompleted | a vanilla request is not checked and keeps its sender |

### R12.6 - Dodge logs through the player's own `Debug` instance

`dash.dodge` is built from its own webpack entry with no externals, so it carries private copies of
the dash.js core modules, `FactoryMaker` among them. A `Debug(context)` call made from inside the
bundle therefore searches a singleton registry the player never wrote to, finds nothing, and builds a
fresh `Debug` with no `settings`. Both guards in `doLog` then fail: nothing reaches the console and no
LOG event is dispatched, so every Dodge warning and error is discarded in the build a deployer
actually loads.

`DodgeHandler` takes the player's `Debug` from `mediaPlayer.getDebug()` and records it in
`utils/DodgeDebug.js`, keyed by context so two players on a page keep their own log levels. The
registry and the overrides read it back from there. Anything constructed before `DodgeHandler` runs,
and the unit tests, fall back to this bundle's own instance.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | logger wiring | logs through the player's Debug instance, not the copy in the Dodge bundle |
| `dodge.DodgeHandler.js` | logger wiring | the defense registry logs through that same instance |
| `dodge.DodgeHandler.js` | logger wiring | falls back to the context Debug when the player exposes none |

### R12.7 - Every Dodge module reads the player's own `Settings` instance

The bundle split described in R12.6 applies to `Settings` too. A `Settings(context).getInstance()`
call made from inside `dash.dodge` builds a fresh instance holding nothing but defaults, so every
`dodge.*` value a deployer configures is discarded. A deployer who raises `paddingLengthBase` because
their URLs are long keeps the default 1024, and every request above that then goes out with no padding
at all, announcing its real size, with only a warning to say so. `strictMode: false` is likewise
ignored by the request generator, which keeps blocking undefended representations.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | reads the Settings it is given, not one it resolves itself | honours strictMode from the given Settings |
| `dodge.DodgeDashHandlerOverride.js` | reads the Settings it is given, not one it resolves itself | honours queryParam from the given Settings |
| `dodge.RequestPadding.js` | Loader overrides read the injected Settings | DodgeXHRLoaderOverride pads to the injected paddingLengthBase, not the one it would resolve |
| `dodge.RequestPadding.js` | Loader overrides read the injected Settings | DodgeFetchLoaderOverride pads to the injected paddingLengthBase, not the one it would resolve |
| `dodge.DodgeHandler.js` | logger wiring | records the player's Settings for the loader overrides |

### R12.8 - A stalled stream is never scheduled again

R12.4 stalls an errored Dodge request by nulling `e.sender` and `e.request.serviceLocation`, which
stops everything that reads either. `StreamProcessor._onFragmentLoadingCompleted` reads neither
before it restarts the schedule timer for `currentMediaInfo.isText`.

The failure is therefore recorded against the stream and media type, and enforced in
`DodgeScheduleControllerOverride._shouldClearScheduleTimer()`, which `_schedule()` consults before it
generates anything. It outranks both the parent's verdict and the trailing keep-alive of R4.3: a
stream that gave up is finished, padding included. The override reaches the flag through the
`DodgeHandler` on the context, as `DodgeGapControllerOverride` does, so nothing outside `src/dodge`
changes. The flag lives with the rest of the per-stream state, so a teardown, a `reset()`, or a new
extended manifest clears it; nothing else does, matching the permanence R12.4 specifies.

A download failure is not the only thing that records it. R12.5 records the same flag when an
origin answers a ranged request with the whole resource, which is a stall for the same reason
and needs the same enforcement.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | errored Dodge request records the stall for its stream and media type |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | the stall is scoped to the media type that failed |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | the stall is scoped to the stream that failed |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | a text download failure records the stall like any other media type |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | a successful Dodge request records no stall |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | an errored vanilla request records no stall |
| `dodge.DodgeHandler.js` | Error fragment stalling, _onFragmentLoadingCompleted | reset clears the recorded stalls |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | a stalled stream clears the timer even when the parent would keep it |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | a stalled stream clears the timer even during trailing |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | an unstalled stream is unaffected, trailing still keeps the timer |
| `dodge.DodgeScheduleControllerOverride.js` | _shouldClearScheduleTimer | no DodgeHandler on the context: falls back to parent result without crashing |

### R12.9 - A cycle that names a segment the presentation does not contain stalls the stream

`_getSegmentByIndex` returns null for an index outside the period, because dash.js's segment getters
refuse a segment whose presentation time falls outside it. `getNextSegmentRequest` returns null in
that case, which retries the cycle rather than skipping it (R2.11 relies on that for URL resolution
failures). For an index the presentation does not contain, retrying is both useless and harmful, so
the override records the stall through `DodgeHandler.recordStall()` on the first failure, and R12.8
enforces it from there.

This is defense-in-depth. R10.17 refuses such a manifest at load, before playback; this catches what
that gate cannot see, such as a representation the device dropped after the check ran.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline index lookup | an index that does not resolve stalls the stream at once |
| `dodge.DodgeDashHandlerOverride.js` | SegmentTimeline index lookup | an index past the end of the timeline stalls without advancing |

---

### R10.17 - Cycle segment indices must be ones the MPD can supply

`rejectIfManifestMismatch` verifies the extended manifest's references into the MPD. A cycle's
segment index is one of those references: an index past the end of a representation resolves to no
segment, so no request is ever built for it and R12.9 stalls the stream. Refusing at load turns
that into a diagnosable failure before playback starts.

The count is the one dash.js computes for itself: `SegmentURL` entries for a SegmentList, the
sum over `<S>` entries for a SegmentTimeline, and `ceil(periodDuration / segmentDuration)` for a
SegmentTemplate with `@duration`, with period durations taken from `getRegularPeriods` so they match
what the segment getters will use. Segment elements are resolved with the Representation over
AdaptationSet over Period inheritance the spec defines.

Where the MPD does not settle a count the check does not run: a SegmentBase representation whose
indices come from a `sidx` the client has not fetched, a timeline with a negative `@r` running to
the period end, or a template with neither a duration nor a timeline. Guessing there would refuse
manifests that are correct, so the gate stays silent instead.

| File | Description | Test |
|---|---|---|
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | cycles within the declared segment count are accepted |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | a cycle naming a segment index past the end of the presentation is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | the refusal names the index and the count |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | trailing padding past the end is rejected like any other cycle |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | a SegmentList count comes from its SegmentURL entries |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | a cycle past the end of a SegmentList is rejected |
| `dodge.DodgeHandler.js` | rejectIfManifestMismatch | a template that declares no segment count is not checked |

---

## Summary

| Requirement | Tests |
|---|---|
| R1.1 Unsupported ABR rules disabled at load | 3 |
| R1.2 ABR quality check only at buffer events | 8 |
| R2.1 Init cycle sequence and flags | 5 |
| R2.2 Data cycle sequence and flags | 9 |
| R2.3 Init-only (non-fragmented text) streams | 3 |
| R2.4 Data-only (self-initialized) streams | 4 |
| R2.5 Fallback to parent | 6 |
| R2.6 CMCD nor/nrr suppressed during defense | 4 |
| R2.7 getLastSegment returns override's segment | 3 |
| R2.8 Defense state management | 6 |
| R2.9 Selective buffer | 10 |
| R2.10 Per-cycle quality override on data cycles | 12 |
| R2.11 Request generation stalls without advancing on URL failure | 3 |
| R2.12 Release in segment order | 7 |
| R2.13 Home representation switch restarts init, resumes data | 9 |
| R2.14 Re-requested init segment replays init cycles | 16 |
| R2.15 Representation switch releases queued segments | 12 |
| R3.1 Video streams | (implicit) |
| R3.2 Audio streams | 7 |
| R3.3 Fragmented text streams | 7 |
| R3.4 Non-fragmented text streams | (see R2.3) |
| R3.5 Self-initialized streams | (see R2.4) |
| R3.6 SegmentBase (byte-range) content | 8 |
| R3.7 Muxed audio/video streams | 2 |
| R3.8 _generateInitRequest construction | 5 |
| R3.9 _getRequestForSegment construction | 6 |
| R3.10 SegmentTimeline content is addressed by index | 6 |
| R3.11 Media URL tokens use the upstream template processor | 6 |
| R3.12 Index lookups never request partial segments | 4 |
| R4.1 No spurious seeks during trailing | 4 |
| R4.2 Segment downloading not complete early | 2 |
| R4.3 Schedule timer continues (buffering icon) | 5 |
| R4.4 getIsTrailing correct | 2 |
| R4.5 Buffering completion deferred through trailing | 6 |
| R4.6 Final trailing padding hands completion back | 7 |
| R5.1 Mock buffer accumulates duration variance | 3 |
| R5.2 Mock buffer incremented only for trailing padding | 4 |
| R5.3 Mock buffer drains during trailing | 3 |
| R5.4 Mock buffer resets on trailing exit | 1 |
| R5.5 Buffer controller state reset | 2 |
| R5.6 onBufferCycleLoaded boundary conditions | 4 |
| R5.7 updateBufferLevel guards against missing dashHandler | 4 |
| R5.8 Reported buffer level is never negative | 5 |
| R6.1 Init segment sandwich for quality overrides | 8 |
| R6.2 homeRepresentationId tagging | 5 |
| R6.3 Dodge-owned alternate init cache, cleared only by reset | 8 |
| R6.4 Fragment releases are serialized | 8 |
| R6.5 Sandwich re-records the home representation | 6 |
| R7.1 Random walk delay bounded | 8 |
| R7.2 Scheduling is scoped to correct stream processor | 3 |
| R7.3 Suppressed events skip scheduling | 2 |
| R7.4 Padding event routing | 2 |
| R7.5 Random walk delay on all scheduling paths | 11 |
| R7.6 Buffer level refreshed on every schedule tick | 5 |
| R8.1 Every request URL carries a cache-busting query value | 6 |
| R8.2 Request padding normalizes wire size | 16 |
| R8.3 A relative URL is resolved before measuring | 4 |
| R8.4 FetchLoader applies padding | 4 |
| R8.5 XHRLoader applies padding | 4 |
| R8.6 Unset paddingLengthBase is reported | 10 |
| R8.7 Retried requests measured after collapsing duplicates | 4 |
| R8.8 A blob: or data: source is never padded | 2 |
| R9.1 Structural validation rejects malformed manifests | 70 |
| R9.2 Init cycle validation | 30 |
| R9.3 Init cycle quality validation and explicit buffer requirement | 17 |
| R9.4 Data cycle validation, maxNoPad, and cycle.full precomputation | 27 |
| R9.5 Assembled ranges leave no gap | 14 |
| R9.6 Cycle index lookup | 4 |
| R9.7 Registry stores and retrieves manifests | 5 |
| R9.8 Period field validation | 6 |
| R9.9 Period-scoped stream lookup | 4 |
| R9.10 Override passes period index to registry | 3 |
| R9.11 Progressive flag validation and self-contained seed | 10 |
| R9.12 Runtime append and finalize of progressive manifests | 18 |
| R9.13 Override stalls (does not finish) while progressive | 6 |
| R9.14 DodgeHandler progressive append/finalize delegation | 6 |
| R9.15 A progressive stream is never in the trailing phase | 7 |
| R9.16 Every segment index is flushed by a buffer directive | 12 |
| R10.1 Manifest parsing and graceful degradation | 4 |
| R10.2 Strict mode manifest/max error firing | 6 |
| R10.3 Non-strict mode no error | 1 |
| R10.4 Partial segment combination event routing | 8 |
| R10.5 isDodgeActive and isDodgeTrailing status | 7 |
| R10.6 Unshaped tracks detected after parsing | 22 |
| R10.7 Side channels reported, never rejected | 5 |
| R10.8 CMCD warning during defended playback | 3 |
| R10.9 Warning when strictMode is disabled | 1 |
| R10.10 cacheInitSegments warning for anonymity set asymmetry | 4 |
| R10.11 Dynamic MPD rejected after parsing, every strict mode | 18 |
| R10.12 Byte-range discovery representations reported | 16 |
| R10.13 Single post-parse gate exposed to the core | 5 |
| R10.14 A new source replaces the defense set | 8 |
| R10.15 Extended manifest verified against the MPD | 15 |
| R10.16 A refusal is reported to the application | 4 |
| R10.17 Cycle segment indices must be ones the MPD can supply | 7 |
| R11.1 strictMode = representation enforcement | 8 |
| R11.2 strictMode = manifest enforcement | 6 |
| R11.3 strictMode = max enforcement | 5 |
| R11.4 DRM key session detection (warn only) | 3 |
| R11.5 NEED_KEY event handling (warn only) | 2 |
| R11.6 strictMode validation and fail-closed normalization | 16 |
| R11.7 Invalid strictMode enforces as max at both levels | 11 |
| R11.8 Numeric dodge settings validated and fail closed | 23 |
| R12.1 _concatPartialSegments assembly | 12 |
| R12.2 _createDataChunk population | 4 |
| R12.3 getStreamStats counts | 3 |
| R12.4 Error fragment stalling | 8 |
| R12.5 Range-ignoring origin detection | 19 |
| R12.6 Dodge logs through the player's Debug | 3 |
| R12.7 Every Dodge module reads the player's Settings | 5 |
| R12.8 A stalled stream is never scheduled again | 11 |
| R12.9 A cycle naming a segment the presentation lacks stalls the stream | 2 |
| **Total** | **850** |

The column above sums to 853 rather than 850 because three tests each pin two requirements and
are listed under both: `an index past the end of the timeline stalls without advancing` under R3.10
and R12.9, `rejects an override group fetched after its index was flushed` under R9.4 and R9.16, and
`a complete manifest is held to the same rule as a progressive batch` under R9.11 and R9.16. The
total is the number of tests the suite runs, which is what `npx karma start
test/unit/config/karma.unit.conf.cjs --grep="Dodge|DefenseRegistry|applyRequestPadding"` reports.