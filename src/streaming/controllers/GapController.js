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
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Events from '../../core/events/Events';
import EventBus from '../../core/EventBus';

const GAP_HANDLER_INTERVAL = 100;
const THRESHOLD_TO_STALLS = 30;
const GAP_THRESHOLD = 0.1;

function GapController() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        lastPlaybackTime,
        settings,
        wallclockTicked,
        gapHandlerInterval,
        lastGapJumpPosition,
        playbackController,
        streamController,
        videoModel,
        timelineConverter,
        adapter,
        jumpTimeoutHandler,
        logger;

    function initialize() {
        registerEvents();
    }

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        reset();
    }

    function reset() {
        stopGapHandler();
        unregisterEvents();
        resetInitialSettings();
    }

    function resetInitialSettings() {
        gapHandlerInterval = null;
        lastGapJumpPosition = NaN;
        wallclockTicked = 0;
        jumpTimeoutHandler = null;
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.settings) {
            settings = config.settings;
        }
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
    }

    function registerEvents() {
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);
        eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, this);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, instance);
    }

    function unregisterEvents() {
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);
        eventBus.off(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, this);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, onBytesAppended, instance);
    }

    function onBytesAppended() {
        if (!gapHandlerInterval) {
            startGapHandler();
        }
    }

    function _onPlaybackSeeking() {
        if (jumpTimeoutHandler) {
            clearTimeout(jumpTimeoutHandler);
            jumpTimeoutHandler = null;
        }
    }

    function _onWallclockTimeUpdated(/*e*/) {
        if (!_shouldCheckForGaps()) {
            return;
        }

        wallclockTicked++;
        if (wallclockTicked >= THRESHOLD_TO_STALLS) {
            const currentTime = playbackController.getTime();
            if (lastPlaybackTime === currentTime) {
                jumpGap(currentTime, true);
            } else {
                lastPlaybackTime = currentTime;
                lastGapJumpPosition = NaN;
            }
            wallclockTicked = 0;
        }
    }

    function _shouldCheckForGaps() {
        return settings.get().streaming.jumpGaps && streamController.getActiveStreamProcessors().length > 0 &&
            (!playbackController.isSeeking() || streamController.hasStreamFinishedBuffering(streamController.getActiveStream())) && !playbackController.isPaused() && !streamController.getIsStreamSwitchInProgress() &&
            !streamController.getHasMediaOrIntialisationError();
    }

    function getNextRangeIndex(ranges, currentTime) {
        try {

            if (!ranges || (ranges.length <= 1 && currentTime > 0)) {
                return NaN;
            }
            let nextRangeIndex = NaN;
            let j = 0;

            while (isNaN(nextRangeIndex) && j < ranges.length) {
                const rangeEnd = j > 0 ? ranges.end(j - 1) : 0;
                if (currentTime < ranges.start(j) && rangeEnd - currentTime < GAP_THRESHOLD) {
                    nextRangeIndex = j;
                }
                j += 1;
            }
            return nextRangeIndex;

        } catch (e) {
            return null;
        }
    }


    function startGapHandler() {
        try {
            if (!gapHandlerInterval) {
                logger.debug('Starting the gap controller');
                gapHandlerInterval = setInterval(() => {
                    if (!_shouldCheckForGaps()) {
                        return;
                    }
                    const currentTime = playbackController.getTime();
                    jumpGap(currentTime);

                }, GAP_HANDLER_INTERVAL);
            }
        } catch (e) {
        }
    }

    function stopGapHandler() {
        logger.debug('Stopping the gap controller');
        if (gapHandlerInterval) {
            clearInterval(gapHandlerInterval);
            gapHandlerInterval = null;
        }
    }

    function jumpGap(currentTime, playbackStalled = false) {
        const smallGapLimit = settings.get().streaming.smallGapLimit;
        const jumpLargeGaps = settings.get().streaming.jumpLargeGaps;
        const ranges = videoModel.getBufferRange();
        let nextRangeIndex;
        let seekToPosition = NaN;
        let jumpToStreamEnd = false;


        // Get the range just after current time position
        nextRangeIndex = getNextRangeIndex(ranges, currentTime);

        if (!isNaN(nextRangeIndex)) {
            const start = ranges.start(nextRangeIndex);
            const gap = start - currentTime;
            if (gap > 0 && (gap <= smallGapLimit || jumpLargeGaps)) {
                seekToPosition = start;
            }
        }

        // Playback has stalled before period end. We seek to the end of the period
        const timeToStreamEnd = playbackController.getTimeToStreamEnd();
        if (isNaN(seekToPosition) && playbackStalled && isFinite(timeToStreamEnd) && !isNaN(timeToStreamEnd) && timeToStreamEnd < smallGapLimit) {
            seekToPosition = parseFloat(playbackController.getStreamEndTime().toFixed(5));
            jumpToStreamEnd = true;
        }

        if (seekToPosition > 0 && lastGapJumpPosition !== seekToPosition && seekToPosition > currentTime && !jumpTimeoutHandler) {
            const timeUntilGapEnd = seekToPosition - currentTime;

            if (jumpToStreamEnd) {
                logger.warn(`Jumping to end of stream because of gap from ${currentTime} to ${seekToPosition}. Gap duration: ${timeUntilGapEnd}`);
                eventBus.trigger(Events.GAP_CAUSED_SEEK_TO_PERIOD_END, {
                    seekTime: seekToPosition,
                    duration: timeUntilGapEnd
                });
            } else {
                const isDynamic = playbackController.getIsDynamic();
                const start = nextRangeIndex > 0 ? ranges.end(nextRangeIndex - 1) : currentTime;
                const timeToWait = !isDynamic ? 0 : timeUntilGapEnd * 1000;

                jumpTimeoutHandler = window.setTimeout(() => {
                    playbackController.seek(seekToPosition, true, true);
                    logger.warn(`Jumping gap starting at ${start} and ending at ${seekToPosition}. Jumping by: ${timeUntilGapEnd}`);
                    eventBus.trigger(Events.GAP_CAUSED_INTERNAL_SEEK, {
                        seekTime: seekToPosition,
                        duration: timeUntilGapEnd
                    });
                    jumpTimeoutHandler = null;
                }, timeToWait);
            }
            lastGapJumpPosition = seekToPosition;
        }
    }

    instance = {
        reset,
        setConfig,
        initialize
    };

    setup();

    return instance;
}

GapController.__dashjs_factory_name = 'GapController';
export default FactoryMaker.getSingletonFactory(GapController);
