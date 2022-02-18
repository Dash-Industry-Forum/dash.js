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
const THRESHOLD_TO_STALLS = 10;
const GAP_JUMP_WAITING_TIME_OFFSET = 0.1;

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
        jumpTimeoutHandler,
        trackSwitchByMediaType,
        logger;

    function initialize() {
        _registerEvents();
    }

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        reset();
    }

    function reset() {
        _stopGapHandler();
        _unregisterEvents();
        resetInitialSettings();
    }

    function resetInitialSettings() {
        gapHandlerInterval = null;
        lastGapJumpPosition = NaN;
        wallclockTicked = 0;
        jumpTimeoutHandler = null;
        trackSwitchByMediaType = {};
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
    }

    function _registerEvents() {
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);
        eventBus.on(Events.INITIAL_STREAM_SWITCH, _onInitialStreamSwitch, this);
        eventBus.on(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, this);
        eventBus.on(Events.BUFFER_REPLACEMENT_STARTED, _onBufferReplacementStarted, instance);
        eventBus.on(Events.TRACK_CHANGE_RENDERED, _onBufferReplacementEnded, instance);
    }

    function _unregisterEvents() {
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);
        eventBus.off(Events.INITIAL_STREAM_SWITCH, _onInitialStreamSwitch, this);
        eventBus.off(Events.PLAYBACK_SEEKING, _onPlaybackSeeking, this);
        eventBus.off(Events.BUFFER_REPLACEMENT_STARTED, _onBufferReplacementStarted, instance);
        eventBus.off(Events.TRACK_CHANGE_RENDERED, _onBufferReplacementEnded, instance);
    }

    /**
     * Clear scheduled gap jump when seeking
     * @private
     */
    function _onPlaybackSeeking() {
        if (jumpTimeoutHandler) {
            clearTimeout(jumpTimeoutHandler);
            jumpTimeoutHandler = null;
        }
    }

    /**
     *  If the track was changed in the current active period and the player might aggressively replace segments the buffer will be empty for a short period of time. Avoid gap jumping at that time.
     *  We wait until the next media fragment of the target type has been appended before activating again
     * @param {object} e
     * @private
     */
    function _onBufferReplacementStarted(e) {
        try {
            if (e.streamId !== streamController.getActiveStreamInfo().id || !e.mediaType) {
                return;
            }

            if (e.streamId === streamController.getActiveStreamInfo().id) {
                trackSwitchByMediaType[e.mediaType] = true;
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Activate gap jumping again once segment of target type has been appended
     * @param {object} e
     * @private
     */
    function _onBufferReplacementEnded(e) {
        if (!e || !e.mediaType) {
            return;
        }

        trackSwitchByMediaType[e.mediaType] = false;
    }

    /**
     * Activate the gap handler after the first stream switch
     * @private
     */
    function _onInitialStreamSwitch() {
        if (!gapHandlerInterval) {
            _startGapHandler();
        }
    }

    /**
     * Callback handler for when the wallclock time has been updated
     * @private
     */
    function _onWallclockTimeUpdated(/*e*/) {
        if (!_shouldCheckForGaps(settings.get().streaming.gaps.enableSeekFix)) {
            return;
        }

        wallclockTicked++;
        if (wallclockTicked >= THRESHOLD_TO_STALLS) {
            const currentTime = playbackController.getTime();
            if (lastPlaybackTime === currentTime) {
                _jumpGap(currentTime, true);
            } else {
                lastPlaybackTime = currentTime;
                lastGapJumpPosition = NaN;
            }
            wallclockTicked = 0;
        }
    }

    /**
     * Returns if we are supposed to check for gaps
     * @param {boolean} checkSeekingState - Usually we are not checking for gaps in the videolement is in seeking state. If this flag is set to true we check for a potential exceptions of this rule.
     * @return {boolean}
     * @private
     */
    function _shouldCheckForGaps(checkSeekingState = false) {
        if (!streamController.getActiveStream()) {
            return false;
        }
        const trackSwitchInProgress = Object.keys(trackSwitchByMediaType).some((key) => {
            return trackSwitchByMediaType[key];
        });
        const shouldIgnoreSeekingState = checkSeekingState ? _shouldIgnoreSeekingState() : false;

        return !trackSwitchInProgress && settings.get().streaming.gaps.jumpGaps && streamController.getActiveStreamProcessors().length > 0 && (!playbackController.isSeeking() || shouldIgnoreSeekingState) && !playbackController.isPaused() && !streamController.getIsStreamSwitchInProgress() &&
            !streamController.getHasMediaOrInitialisationError();
    }

    /**
     * There are cases in which we never transition out of the seeking state and still need to jump a gap. For instance if the user seeks right before a gap and video element will not transition out of the seeking state.
     * For now limit this to period boundaries. In this case the current period is completely buffered and we are right before the end of the period.
     * @private
     */
    function _shouldIgnoreSeekingState() {
        const activeStream = streamController.getActiveStream();
        const streamEnd = parseFloat((activeStream.getStartTime() + activeStream.getDuration()).toFixed(5))

        return playbackController.getTime() + settings.get().streaming.gaps.threshold >= streamEnd;
    }

    /**
     * Returns the index of the range object that comes after the current time
     * @param {object} ranges
     * @param {number} currentTime
     * @private
     * @return {null|number}
     */
    function _getNextRangeIndex(ranges, currentTime) {
        try {

            if (!ranges || (ranges.length <= 1 && currentTime > 0)) {
                return NaN;
            }
            let nextRangeIndex = NaN;
            let j = 0;

            while (isNaN(nextRangeIndex) && j < ranges.length) {
                const rangeEnd = j > 0 ? ranges.end(j - 1) : 0;
                if (currentTime < ranges.start(j) && rangeEnd - currentTime < settings.get().streaming.gaps.threshold) {
                    nextRangeIndex = j;
                }
                j += 1;
            }
            return nextRangeIndex;

        } catch (e) {
            return null;
        }
    }

    /**
     * Starts the interval that checks for gaps
     * @private
     */
    function _startGapHandler() {
        try {
            if (!gapHandlerInterval) {
                logger.debug('Starting the gap controller');
                gapHandlerInterval = setInterval(() => {
                    if (!_shouldCheckForGaps()) {
                        return;
                    }
                    const currentTime = playbackController.getTime();
                    _jumpGap(currentTime);

                }, GAP_HANDLER_INTERVAL);
            }
        } catch (e) {
        }
    }

    /**
     * Clears the gap interval handler
     * @private
     */
    function _stopGapHandler() {
        logger.debug('Stopping the gap controller');
        if (gapHandlerInterval) {
            clearInterval(gapHandlerInterval);
            gapHandlerInterval = null;
        }
    }

    /**
     * Jump a gap
     * @param {number} currentTime
     * @param {boolean} playbackStalled
     * @private
     */
    function _jumpGap(currentTime, playbackStalled = false) {
        const smallGapLimit = settings.get().streaming.gaps.smallGapLimit;
        const jumpLargeGaps = settings.get().streaming.gaps.jumpLargeGaps;
        const ranges = videoModel.getBufferRange();
        let nextRangeIndex;
        let seekToPosition = NaN;
        let jumpToStreamEnd = false;


        // Get the range just after current time position
        nextRangeIndex = _getNextRangeIndex(ranges, currentTime);

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
                const nextStream = streamController.getStreamForTime(seekToPosition);
                const internalSeek = nextStream && !!nextStream.getPreloaded();

                logger.warn(`Jumping to end of stream because of gap from ${currentTime} to ${seekToPosition}. Gap duration: ${timeUntilGapEnd}`);
                playbackController.seek(seekToPosition, true, internalSeek);
            } else {
                const isDynamic = playbackController.getIsDynamic();
                const start = nextRangeIndex > 0 ? ranges.end(nextRangeIndex - 1) : currentTime;
                const timeToWait = !isDynamic ? 0 : Math.max(0, timeUntilGapEnd - GAP_JUMP_WAITING_TIME_OFFSET) * 1000;

                jumpTimeoutHandler = window.setTimeout(() => {
                    playbackController.seek(seekToPosition, true, true);
                    logger.warn(`Jumping gap occuring in period ${streamController.getActiveStream().getStreamId()} starting at ${start} and ending at ${seekToPosition}. Jumping by: ${seekToPosition - start}`);
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
