/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

import Debug from '../../core/Debug.js';
import EventBus from '../../core/EventBus.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';

/**
 * Dodge override, adds mock buffer support to BufferController.
 *
 * `currentMockBuffer` accumulates over time and is synced to the vanilla
 * BufferController via _parentSetMockBuffer.call(parent,). The parent's updateBufferLevel()
 * adds mockBuffer to the reported buffer level.
 *
 * Two separate mechanisms update it:
 *  - onBufferCycleLoaded: increments by (segmentDuration - actualDuration) after
 *    each non-trailing buffer cycle, absorbing variance in segment durations.
 *    This value can be negative if a segment is longer than expected.
 *  - onPaddingLoaded: increments by segmentDuration for each trailing buffer
 *    cycle, covering the virtual buffer time after all playable content.
 *
 * During the trailing phase, updateBufferLevel drains mockBuffer over time so
 * the reported buffer level falls naturally to zero as playback finishes.
 */
function DodgeBufferControllerOverride(config) {

    config = config || {};
    const context = this.context;
    const parent = this.parent;
    const _parentResetInitialSettings = parent.resetInitialSettings;
    const _parentSetMockBuffer = parent.setMockBuffer;
    const _parentUpdateBufferLevel = parent.updateBufferLevel;
    const _parentOnInitFragmentLoaded = parent._onInitFragmentLoaded;
    const _parentOnMediaFragmentLoaded = parent._onMediaFragmentLoaded;

    const dashHandler = config.dashHandler;
    const playbackController = config.playbackController;

    const debug = Debug(context).getInstance();
    const eventBus = EventBus(context).getInstance();
    const mediaType = parent.getType ? parent.getType() : null;

    const listenerScope = {};

    let logger,
        currentMockBuffer,
        lastTimeSinceStreamEnd,
        altInitCache;

    function setup() {
        logger = debug.getLogger({ __dashjs_factory_name: 'DodgeBufferControllerOverride' });
        currentMockBuffer = 0;
        lastTimeSinceStreamEnd = 0;
        altInitCache = new Map();
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChangeRequested, listenerScope);
    }

    function resetInitialSettings(errored, keepBuffers) {
        currentMockBuffer = 0;
        lastTimeSinceStreamEnd = 0;
        altInitCache.clear();
        // parent.resetInitialSettings resets mockBuffer
        _parentResetInitialSettings.call(parent, errored, keepBuffers);
    }

    /**
     * Clear the Dodge-owned alternate init cache when the home representation
     * changes. Scoped to this override's mediaType so a quality change on a
     * different track doesn't wipe our entries. Next media fragment load will
     * either use freshly cached alternates (from the new home's synthesized
     * init cycles) or stall to preserve the defense.
     */
    function _onQualityChangeRequested(e) {
        if (!mediaType || !e || e.mediaType === mediaType) {
            altInitCache.clear();
        }
    }

    /**
     * Called after a non-trailing buffer cycle completes. Increments the mock
     * buffer by the difference between the nominal and actual segment duration,
     * absorbing variance. The value can be negative when a segment is slightly
     * longer than segmentDuration.
     * @param {Object} e
     * @param {Object} e.representation
     * @param {number} e.actualDuration - Actual segment duration from the timeline.
     */
    function onBufferCycleLoaded(e) {
        if (lastTimeSinceStreamEnd != 0) {
            logger.debug('trailing reset');
            currentMockBuffer = 0;
            lastTimeSinceStreamEnd = 0;
            _parentSetMockBuffer.call(parent,0);
        }
        
        currentMockBuffer += e.representation.segmentDuration - e.actualDuration;
        _parentSetMockBuffer.call(parent,currentMockBuffer);
    }

    /**
     * Called when a padding cycle is finished. Increment the mock buffer for
     * trailing cycles; reset it if trailing ended unexpectedly.
     */
    function onPaddingLoaded(e) {
        if (!e.trail) {
            if (lastTimeSinceStreamEnd != 0) {
                logger.debug('trailing reset');
                currentMockBuffer = 0;
                lastTimeSinceStreamEnd = 0;
                _parentSetMockBuffer.call(parent,0);
            }
            return;
        }

        if (e.buffer) {
            currentMockBuffer += e.representation.segmentDuration;
            _parentSetMockBuffer.call(parent,currentMockBuffer);
        }
    }

    /**
     * Override init fragment loading for alternate representation init cycles.
     * Dodge synthesizes (or the defense provides) init cycles that fetch an
     * alternate representation's init segment so it can later be used in
     * quality overrides. Those inits must be cached under the alternate
     * representation's ID but not appended to the home SourceBuffer.
     *
     * We detect the alternate case by chunk.homeRepresentationId: the override
     * in DodgeDashHandlerOverride sets it when cycle.quality resolves to a
     * different representation than the home representation. For alternate
     * inits we save to Dodge's cache; for normal inits we delegate.
     */
    function _onInitFragmentLoaded(e) {
        const chunk = e.chunk;
        if (chunk && chunk.homeRepresentationId) {
            // Alternate representation init segment. Store in the Dodge-owned
            // cache so init loading logic can retrieve it regardless of the
            // streaming.cacheInitSegments setting, and so its lifetime is
            // scoped to the current home representation (invalidated on
            // quality change).
            altInitCache.set(chunk.representation.id, chunk);
            return;
        }
        _parentOnInitFragmentLoaded.call(parent, e);
    }

    /**
     * Override media fragment loading to handle quality override cycles.
     * When a chunk carries a homeRepresentationId, the media bytes come from
     * an alternate representation and require the matching init segment.
     * Sandwich the media append between init segment switches:
     *   alternate init -> media data -> restore home init
     * If either init segment is not cached, stall to preserve the defense.
     */
    function _onMediaFragmentLoaded(e) {
        const chunk = e.chunk;

        if (chunk.homeRepresentationId) {
            const alternateRepId = chunk.representation.id;
            const homeRepId = chunk.homeRepresentationId;

            // Alternate init from the Dodge-owned cache, home init from the
            // parent's InitCache (normal path). Fall back to the parent cache
            // for the alternate lookup only if the local cache missed to
            // cover unusual cases.
            const alternateInit = altInitCache.get(alternateRepId)
                || parent.getInitChunkFromCache(alternateRepId);
            const homeInit = parent.getInitChunkFromCache(homeRepId);

            if (!alternateInit || !homeInit) {
                logger.warn('Init segment not cached for quality override (alternate=' + alternateRepId + ', home=' + homeRepId + '), stalling to preserve defense');
                return;
            }

            parent.appendToBuffer(alternateInit);
            parent.appendToBuffer(chunk, e.request);
            parent.appendToBuffer(homeInit);
            return;
        }

        _parentOnMediaFragmentLoaded.call(parent, e);
    }

    /**
     * Update the buffer level. During the trailing phase, drain mockBuffer by
     * time elapsed since stream end so the reported buffer level falls naturally
     * to zero. Outside the trailing phase, mockBuffer is not drained here; it
     * only changes via onBufferCycleLoaded and onPaddingLoaded.
     */
    function updateBufferLevel() {
        if (playbackController && dashHandler) {
            if (dashHandler.getIsTrailing()) {
                const timeSinceStreamEnd = playbackController.getTimeSinceStreamEnd();
                const diffInTime = Math.max(0, timeSinceStreamEnd - lastTimeSinceStreamEnd);

                currentMockBuffer -= diffInTime;
                lastTimeSinceStreamEnd += diffInTime;

                // Sync the decremented mockBuffer to parent before it computes buffer level.
                _parentSetMockBuffer.call(parent,Math.max(currentMockBuffer, 0));
            } else if (lastTimeSinceStreamEnd != 0) {
                logger.debug('trailing reset');
                currentMockBuffer = 0;
                lastTimeSinceStreamEnd = 0;
                _parentSetMockBuffer.call(parent,0);
            }
        }

        // Delegate to parent: it will compute buffer level.
        _parentUpdateBufferLevel.call(parent);
    }

    setup();

    return {
        _onInitFragmentLoaded,
        _onMediaFragmentLoaded,
        resetInitialSettings,
        onBufferCycleLoaded,
        onPaddingLoaded,
        updateBufferLevel,
    };
}

export default DodgeBufferControllerOverride;
