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
import Constants from '../constants/Constants';
import MetricsConstants from '../constants/MetricsConstants';
import FragmentModel from '../models/FragmentModel';
import SourceBufferSink from '../SourceBufferSink';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';

const BUFFER_END_THRESHOLD = 0.5;
const BUFFER_RANGE_CALCULATION_THRESHOLD = 0.01;
const QUOTA_EXCEEDED_ERROR_CODE = 22;

const BUFFER_CONTROLLER_TYPE = 'BufferController';

function BufferController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const errHandler = config.errHandler;
    const fragmentModel = config.fragmentModel;
    const representationController = config.representationController;
    const adapter = config.adapter;
    const textController = config.textController;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const streamInfo = config.streamInfo;
    const type = config.type;
    const settings = config.settings;

    let instance,
        logger,
        isBufferingCompleted,
        bufferLevel,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        maximumIndex,
        sourceBufferSink,
        bufferState,
        appendedBytesInfo,
        wallclockTicked,
        isPruningInProgress,
        isQuotaExceeded,
        initCache,
        pendingPruningRanges,
        replacingBuffer,
        seekTarget;


    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        initCache = InitCache(context).getInstance();

        resetInitialSettings();
    }

    /**
     * Initialize the BufferController. Sets the media source and registers the event handlers.
     * @param {object} mediaSource
     */
    function initialize(mediaSource) {
        setMediaSource(mediaSource);

        eventBus.on(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.on(Events.STREAM_REQUESTING_COMPLETED, _onStreamRequestingCompleted, instance);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, instance);

        eventBus.on(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STALLED, _onPlaybackStalled, instance);
    }

    /**
     * Returns the stream id
     * @return {string}
     */
    function getStreamId() {
        return streamInfo.id;
    }

    /**
     * Returns the media type
     * @return {type}
     */
    function getType() {
        return type;
    }

    /**
     * Returns the type of the BufferController. We distinguish between standard buffer controllers and buffer controllers related to texttracks.
     * @return {string}
     */
    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    /**
     * Sets the mediasource.
     * @param {object} value
     */
    function setMediaSource(value) {
        mediaSource = value;
    }

    /**
     * Get the RepresentationInfo for a certain quality.
     * @param {number} quality
     * @return {object}
     * @private
     */
    function _getRepresentationInfo(quality) {
        return adapter.convertRepresentationToRepresentationInfo(representationController.getRepresentationForQuality(quality));
    }

    /**
     * Creates a SourceBufferSink object
     * @param {object} mediaInfo
     * @param {array} oldBufferSinks
     * @return {object|null} SourceBufferSink
     */
    function createBufferSink(mediaInfo, oldBufferSinks = []) {
        return new Promise((resolve, reject) => {
            if (!initCache || !mediaInfo || !mediaSource) {
                resolve(null);
                return;
            }

            const requiredQuality = abrController.getQualityFor(type, streamInfo.id);
            sourceBufferSink = SourceBufferSink(context).create({ mediaSource, textController });
            _initializeSink(mediaInfo, oldBufferSinks, requiredQuality)
                .then(() => {
                    return updateBufferTimestampOffset(_getRepresentationInfo(requiredQuality));
                })
                .then(() => {
                    resolve(sourceBufferSink);
                })
                .catch((e) => {
                    logger.fatal('Caught error on create SourceBuffer: ' + e);
                    errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type));
                    reject(e);
                });
        });
    }

    function _initializeSink(mediaInfo, oldBufferSinks, requiredQuality) {
        const selectedRepresentation = _getRepresentationInfo(requiredQuality);

        if (oldBufferSinks && oldBufferSinks[type] && (type === Constants.VIDEO || type === Constants.AUDIO)) {
            return sourceBufferSink.initializeForStreamSwitch(mediaInfo, selectedRepresentation, oldBufferSinks[type]);
        } else {
            return sourceBufferSink.initializeForFirstUse(streamInfo, mediaInfo, selectedRepresentation);
        }
    }


    /**
     * Callback handler when init segment has been loaded. Based on settings, the init segment is saved to the cache, and appended to the buffer.
     * @param {object} e
     * @private
     */
    function _onInitFragmentLoaded(e) {
        if (settings.get().streaming.cacheInitSegments) {
            logger.info('Init fragment finished loading saving to', type + '\'s init cache');
            initCache.save(e.chunk);
        }
        logger.debug('Append Init fragment', type, ' with representationId:', e.chunk.representationId, ' and quality:', e.chunk.quality, ', data size:', e.chunk.bytes.byteLength);
        _appendToBuffer(e.chunk);
    }

    /**
     * Append the init segment for a certain representation to the buffer. If the init segment is cached we take the one from the cache. Otherwise the function returns false and the segment has to be requested again.
     * @param {string} representationId
     * @return {boolean}
     */
    function appendInitSegmentFromCache(representationId) {
        // Get init segment from cache
        const chunk = initCache.extract(streamInfo.id, representationId);

        if (!chunk) {
            // Init segment not in cache, shall be requested
            return false;
        }

        // Append init segment into buffer
        logger.info('Append Init fragment', type, ' with representationId:', chunk.representationId, ' and quality:', chunk.quality, ', data size:', chunk.bytes.byteLength);
        _appendToBuffer(chunk);

        return true;
    }

    /**
     * Calls the _appendToBuffer function to append the segment to the buffer. In case of a track switch the buffer might be cleared.
     * @param {object} e
     */
    function _onMediaFragmentLoaded(e) {
        _appendToBuffer(e.chunk);
    }

    /**
     * Append data to the MSE buffer using the SourceBufferSink
     * @param {object} chunk
     * @private
     */
    function _appendToBuffer(chunk) {
        sourceBufferSink.append(chunk)
            .then((e) => {
                _onAppended(e);
            })
            .catch((e) => {
                _onAppended(e);
            });

        if (chunk.mediaInfo.type === Constants.VIDEO) {
            triggerEvent(Events.VIDEO_CHUNK_RECEIVED, { chunk: chunk });
        }
    }

    function _showBufferRanges(ranges) {
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                logger.debug('Buffered range: ' + ranges.start(i) + ' - ' + ranges.end(i) + ', currentTime = ', playbackController.getTime());
            }
        }
    }

    function _onAppended(e) {
        if (e.error) {
            // If we receive a QUOTA_EXCEEDED_ERROR_CODE we should adjust the target buffer times to avoid this error in the future.
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE) {
                _handleQuotaExceededError();
            }
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                logger.warn('Clearing playback buffer to overcome quota exceed situation');
                // Notify ScheduleController to stop scheduling until buffer has been pruned
                triggerEvent(Events.QUOTA_EXCEEDED, {
                    criticalBufferLevel: criticalBufferLevel,
                    quotaExceededTime: e.chunk.start
                });
                clearBuffers(getClearRanges());
            }
            return;
        }

        _updateBufferLevel();

        isQuotaExceeded = false;
        appendedBytesInfo = e.chunk;

        if (!appendedBytesInfo.endFragment) {
            return;
        }

        if (appendedBytesInfo && !isNaN(appendedBytesInfo.index)) {
            maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
            _checkIfBufferingCompleted();
        }

        const ranges = sourceBufferSink.getAllBufferRanges();
        if (appendedBytesInfo.segmentType === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            _showBufferRanges(ranges);
            _onPlaybackProgression();
            _adjustSeekTarget();
        }

        if (appendedBytesInfo) {
            triggerEvent(Events.BYTES_APPENDED_END_FRAGMENT, {
                quality: appendedBytesInfo.quality,
                startTime: appendedBytesInfo.start,
                index: appendedBytesInfo.index,
                bufferedRanges: ranges,
                segmentType: appendedBytesInfo.segmentType,
                mediaType: type
            });
        }
    }

    /**
     * In some cases the segment we requested might start at a different time than we initially aimed for. segments timeline/template tolerance.
     * We might need to do an internal seek if there is drift.
     * @private
     */
    function _adjustSeekTarget() {
        if (isNaN(seekTarget)) return;
        // Check buffered data only for audio and video
        if (type !== Constants.AUDIO && type !== Constants.VIDEO) {
            seekTarget = NaN;
            return;
        }

        // Check if current buffered range already contains seek target (and current video element time)
        const currentTime = playbackController.getTime();
        let range = getRangeAt(seekTarget, 0);
        if (currentTime === seekTarget && range) {
            seekTarget = NaN;
            return;
        }

        // Get buffered range corresponding to the seek target
        const segmentDuration = representationController.getCurrentRepresentation().segmentDuration;
        range = getRangeAt(seekTarget, segmentDuration);
        if (!range) return;

        if (currentTime < range.start) {
            // If appended buffer starts after seek target (segments timeline/template tolerance) then seek to range start
            playbackController.seek(range.start, false, true);
            seekTarget = NaN;
        }
    }

    function _handleQuotaExceededError() {
        isQuotaExceeded = true;
        criticalBufferLevel = getTotalBufferedTime() * 0.8;
        logger.warn('Quota exceeded, Critical Buffer: ' + criticalBufferLevel);

        if (criticalBufferLevel > 0) {
            // recalculate buffer lengths according to criticalBufferLevel
            const bufferToKeep = Math.max(0.2 * criticalBufferLevel, 1);
            const bufferAhead = criticalBufferLevel - bufferToKeep;
            const bufferTimeAtTopQuality = Math.min(settings.get().streaming.buffer.bufferTimeAtTopQuality, bufferAhead * 0.9);
            const bufferTimeAtTopQualityLongForm = Math.min(settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm, bufferAhead * 0.9);
            const s = {
                streaming: {
                    buffer: {
                        bufferToKeep: parseFloat(bufferToKeep.toFixed(5)),
                        bufferTimeAtTopQuality: parseFloat(bufferTimeAtTopQuality.toFixed(5)),
                        bufferTimeAtTopQualityLongForm: parseFloat(bufferTimeAtTopQualityLongForm.toFixed(5))
                    }
                }
            };
            settings.update(s);
        }
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function prepareForPlaybackSeek() {
        if (isBufferingCompleted) {
            setIsBufferingCompleted(false);
        }

        // Abort the current request and empty all possible segments to be appended
        return sourceBufferSink.abort();
    }

    function prepareForReplacementTrackSwitch(codec) {
        return new Promise((resolve, reject) => {
            sourceBufferSink.abort()
                .then(() => {
                    return updateAppendWindow();
                })
                .then(() => {
                    return sourceBufferSink.changeType(codec);
                })
                .then(() => {
                    return pruneAllSafely();
                })
                .then(() => {
                    setIsBufferingCompleted(false);
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function prepareForReplacementQualitySwitch() {
        return new Promise((resolve, reject) => {
            sourceBufferSink.abort()
                .then(() => {
                    return updateAppendWindow();
                })
                .then(() => {
                    return pruneAllSafely();
                })
                .then(() => {
                    setIsBufferingCompleted(false);
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function prepareForNonReplacementTrackSwitch(codec) {
        return new Promise((resolve, reject) => {
            updateAppendWindow()
                .then(() => {
                    return sourceBufferSink.changeType(codec);
                })
                .then(() => {
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function pruneAllSafely() {
        return new Promise((resolve, reject) => {
            let ranges = getAllRangesWithSafetyFactor();

            if (!ranges || ranges.length === 0) {
                _onPlaybackProgression();
                resolve();
                return;
            }

            clearBuffers(ranges)
                .then(() => {
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function getAllRangesWithSafetyFactor(seekTime) {
        const clearRanges = [];
        const ranges = sourceBufferSink.getAllBufferRanges();

        // no valid ranges
        if (!ranges || ranges.length === 0) {
            return clearRanges;
        }

        // if no target time is provided we clear everyhing
        if ((!seekTime && seekTime !== 0) || isNaN(seekTime)) {
            clearRanges.push({
                start: ranges.start(0),
                end: ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD
            });
        }

        // otherwise we need to calculate the correct pruning range
        else {

            const behindPruningRange = _getRangeBehindForPruning(seekTime, ranges);
            const aheadPruningRange = _getRangeAheadForPruning(seekTime, ranges);

            if (behindPruningRange) {
                clearRanges.push(behindPruningRange);
            }

            if (aheadPruningRange) {
                clearRanges.push(aheadPruningRange);
            }
        }

        return clearRanges;
    }

    function _getRangeBehindForPruning(targetTime, ranges) {
        const bufferToKeepBehind = settings.get().streaming.buffer.bufferToKeep;
        const startOfBuffer = ranges.start(0);

        // if we do a seek ahead of the current play position we do need to prune behind the new play position
        const behindDiff = targetTime - startOfBuffer;
        if (behindDiff > bufferToKeepBehind) {

            let rangeEnd = Math.max(0, targetTime - bufferToKeepBehind);
            // Ensure we keep full range of current fragment
            const currentTimeRequest = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: targetTime,
                threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
            })[0];

            if (currentTimeRequest) {
                rangeEnd = Math.min(currentTimeRequest.startTime, rangeEnd);
            }
            if (rangeEnd > 0) {
                return {
                    start: startOfBuffer,
                    end: rangeEnd
                };
            }
        }

        return null;
    }

    function _getRangeAheadForPruning(targetTime, ranges) {
        // if we do a seek behind the current play position we do need to prune ahead of the new play position
        const endOfBuffer = ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD;
        const isLongFormContent = streamInfo.manifestInfo.duration >= settings.get().streaming.buffer.longFormContentDurationThreshold;
        const bufferToKeepAhead = isLongFormContent ? settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm : settings.get().streaming.buffer.bufferTimeAtTopQuality;
        const aheadDiff = endOfBuffer - targetTime;

        if (aheadDiff > bufferToKeepAhead) {

            let rangeStart = targetTime + bufferToKeepAhead;
            // Ensure we keep full range of current fragment
            const currentTimeRequest = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: targetTime,
                threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
            })[0];

            if (currentTimeRequest) {
                rangeStart = Math.max(currentTimeRequest.startTime + currentTimeRequest.duration, rangeStart);
            }
            if (rangeStart < endOfBuffer) {
                return {
                    start: rangeStart,
                    end: endOfBuffer
                };
            }
        }

        return null;
    }

    function _onPlaybackProgression() {
        if (!replacingBuffer || (type === Constants.TEXT && textController.isTextEnabled())) {
            _updateBufferLevel();
        }
    }

    function _onPlaybackStalled() {
        checkIfSufficientBuffer();
    }

    function _onPlaybackPlaying() {
        checkIfSufficientBuffer();
        seekTarget = NaN;
    }

    function getRangeAt(time, tolerance) {
        const ranges = sourceBufferSink.getAllBufferRanges();
        let start = 0;
        let end = 0;
        let firstStart = null;
        let lastEnd = null;
        let gap = 0;
        let len,
            i;

        const toler = !isNaN(tolerance) ? tolerance : 0.15;

        if (ranges !== null && ranges !== undefined) {
            for (i = 0, len = ranges.length; i < len; i++) {
                start = ranges.start(i);
                end = ranges.end(i);
                if (firstStart === null) {
                    gap = Math.abs(start - time);
                    if (time >= start && time < end) {
                        // start the range
                        firstStart = start;
                        lastEnd = end;
                    } else if (gap <= toler) {
                        // start the range even though the buffer does not contain time 0
                        firstStart = start;
                        lastEnd = end;
                    }
                } else {
                    gap = start - lastEnd;
                    if (gap <= toler) {
                        // the discontinuity is smaller than the tolerance, combine the ranges
                        lastEnd = end;
                    } else {
                        break;
                    }
                }
            }

            if (firstStart !== null) {
                return {
                    start: firstStart,
                    end: lastEnd
                };
            }
        }

        return null;
    }

    function getBufferLength(time, tolerance) {
        let range,
            length;

        // Consider gap/discontinuity limit as tolerance
        if (settings.get().streaming.gaps.jumpGaps) {
            tolerance = settings.get().streaming.gaps.smallGapLimit;
        }

        range = getRangeAt(time, tolerance);

        if (range === null) {
            length = 0;
        } else {
            length = range.end - time;
        }

        return length;
    }

    function _updateBufferLevel() {
        if (playbackController) {
            const tolerance = settings.get().streaming.gaps.jumpGaps && !isNaN(settings.get().streaming.gaps.smallGapLimit) ? settings.get().streaming.gaps.smallGapLimit : NaN;
            bufferLevel = Math.max(getBufferLength(playbackController.getTime() || 0, tolerance), 0);
            triggerEvent(Events.BUFFER_LEVEL_UPDATED, { mediaType: type, bufferLevel: bufferLevel });
            checkIfSufficientBuffer();
        }
    }

    function _checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex >= maximumIndex - 1; // Handles 0 and non 0 based request index
        const periodBuffered = playbackController.getTimeToStreamEnd(streamInfo) - bufferLevel <= 0;

        if ((isLastIdxAppended || periodBuffered) && !isBufferingCompleted) {
            setIsBufferingCompleted(true);
            logger.debug(`checkIfBufferingCompleted trigger BUFFERING_COMPLETED for stream id ${streamInfo.id} and type ${type}`);
        }
    }

    function checkIfSufficientBuffer() {
        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== Constants.AUDIO && type !== Constants.VIDEO) return;

        // When the player is working in low latency mode, the buffer is often below STALL_THRESHOLD.
        // So, when in low latency mode, change dash.js behavior so it notifies a stall just when
        // buffer reach 0 seconds
        if (((!settings.get().streaming.lowLatencyEnabled && bufferLevel < settings.get().streaming.buffer.stallThreshold) || bufferLevel === 0) && !isBufferingCompleted) {
            _notifyBufferStateChanged(MetricsConstants.BUFFER_EMPTY);
        } else {
            if (isBufferingCompleted || bufferLevel >= settings.get().streaming.buffer.stallThreshold || (settings.get().streaming.lowLatencyEnabled && bufferLevel > 0)) {
                _notifyBufferStateChanged(MetricsConstants.BUFFER_LOADED);
            }
        }
    }

    function _notifyBufferStateChanged(state) {
        if (bufferState === state ||
            (state === MetricsConstants.BUFFER_EMPTY && playbackController.getTime() === 0) || // Don't trigger BUFFER_EMPTY if it's initial loading
            (type === Constants.TEXT && !textController.isTextEnabled())) {
            return;
        }

        bufferState = state;

        triggerEvent(Events.BUFFER_LEVEL_STATE_CHANGED, { state: state });
        triggerEvent(state === MetricsConstants.BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY);
        logger.debug(state === MetricsConstants.BUFFER_LOADED ? 'Got enough buffer to start' : 'Waiting for more buffer before starting playback');
    }

    /* prune buffer on our own in background to avoid browsers pruning buffer silently */
    function pruneBuffer() {
        if (!sourceBufferSink || type === Constants.TEXT) {
            return;
        }

        if (!isBufferingCompleted) {
            clearBuffers(getClearRanges());
        }
    }

    function getClearRanges() {
        const clearRanges = [];
        const ranges = sourceBufferSink.getAllBufferRanges();
        if (!ranges || ranges.length === 0) {
            return clearRanges;
        }

        const currentTime = playbackController.getTime();
        let startRangeToKeep = Math.max(0, currentTime - settings.get().streaming.buffer.bufferToKeep);

        const currentTimeRequest = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: currentTime,
            threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
        })[0];

        // Ensure we keep full range of current fragment
        if (currentTimeRequest) {
            startRangeToKeep = Math.min(currentTimeRequest.startTime, startRangeToKeep);
        } else if (currentTime === 0 && playbackController.getIsDynamic()) {
            // Don't prune before the live stream starts, it messes with low latency
            return [];
        }

        if (ranges.start(0) <= startRangeToKeep) {
            const behindRange = {
                start: 0,
                end: startRangeToKeep
            };
            for (let i = 0; i < ranges.length && ranges.end(i) <= startRangeToKeep; i++) {
                behindRange.end = ranges.end(i);
            }
            if (behindRange.start < behindRange.end) {
                clearRanges.push(behindRange);
            }
        }

        return clearRanges;
    }

    function clearBuffers(ranges) {
        return new Promise((resolve, reject) => {
            if (!ranges || !sourceBufferSink || ranges.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            ranges.forEach((range) => {
                promises.push(_addClearRangeWithPromise(range));
            });


            if (!isPruningInProgress) {
                clearNextRange();
            }

            Promise.all(promises)
                .then(() => {
                    resolve();
                })
                .catch((e) => {
                    reject(e);
                });
        });
    }

    function _addClearRangeWithPromise(range) {
        return new Promise((resolve, reject) => {
            range.resolve = resolve;
            range.reject = reject;
            pendingPruningRanges.push(range);
        });
    }

    function clearNextRange() {
        try {
            // If there's nothing to prune reset state
            if (pendingPruningRanges.length === 0 || !sourceBufferSink) {
                logger.debug('Nothing to prune, halt pruning');
                pendingPruningRanges = [];
                isPruningInProgress = false;
                return;
            }

            const sourceBuffer = sourceBufferSink.getBuffer();
            // If there's nothing buffered any pruning is invalid, so reset our state
            if (!sourceBuffer || !sourceBuffer.buffered || sourceBuffer.buffered.length === 0) {
                logger.debug('SourceBuffer is empty (or does not exist), halt pruning');
                pendingPruningRanges = [];
                isPruningInProgress = false;
                return;
            }

            const range = pendingPruningRanges.shift();
            logger.debug(`${type}: Removing buffer from: ${range.start} to ${range.end}`);
            isPruningInProgress = true;

            // If removing buffer ahead current playback position, update maxAppendedIndex
            const currentTime = playbackController.getTime();
            if (currentTime < range.end) {
                setIsBufferingCompleted(false);
            }

            sourceBufferSink.remove(range)
                .then((e) => {
                    _onRemoved(e);
                })
                .catch((e) => {
                    _onRemoved(e);
                });
        } catch (e) {
            isPruningInProgress = false;
        }
    }

    function _onRemoved(e) {
        logger.debug('onRemoved buffer from:', e.from, 'to', e.to);

        const ranges = sourceBufferSink.getAllBufferRanges();
        _showBufferRanges(ranges);

        if (pendingPruningRanges.length === 0) {
            isPruningInProgress = false;
            _updateBufferLevel();
        }

        if (e.unintended) {
            logger.warn('Detected unintended removal from:', e.from, 'to', e.to, 'setting streamprocessor time to', e.from);
            triggerEvent(Events.SEEK_TARGET, { time: e.from });
        }

        if (isPruningInProgress) {
            clearNextRange();
        } else {
            if (!replacingBuffer) {
                _updateBufferLevel();
            } else {
                replacingBuffer = false;
            }
            triggerEvent(Events.BUFFER_CLEARED, {
                from: e.from,
                to: e.to,
                unintended: e.unintended,
                hasEnoughSpaceToAppend: hasEnoughSpaceToAppend(),
                quotaExceeded: isQuotaExceeded
            });
        }
    }

    function updateBufferTimestampOffset(representationInfo) {
        return new Promise((resolve) => {
            if (!representationInfo || representationInfo.MSETimeOffset === undefined || !sourceBufferSink || !sourceBufferSink.updateTimestampOffset) {
                resolve();
                return;
            }
            // Each track can have its own @presentationTimeOffset, so we should set the offset
            // if it has changed after switching the quality or updating an mpd
            sourceBufferSink.updateTimestampOffset(representationInfo.MSETimeOffset)
                .then(() => {
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });

    }

    function updateAppendWindow() {
        if (sourceBufferSink && !isBufferingCompleted) {
            return sourceBufferSink.updateAppendWindow(streamInfo);
        }
        return Promise.resolve();
    }

    function _onStreamRequestingCompleted(e) {
        if (!isNaN(e.segmentIndex)) {
            maximumIndex = e.segmentIndex;
            _checkIfBufferingCompleted();
        }
    }

    function _onWallclockTimeUpdated() {
        wallclockTicked++;
        const secondsElapsed = (wallclockTicked * (settings.get().streaming.wallclockTimeUpdateInterval / 1000));
        if ((secondsElapsed >= settings.get().streaming.buffer.bufferPruningInterval)) {
            wallclockTicked = 0;
            pruneBuffer();
        }
    }

    function _onPlaybackRateChanged() {
        checkIfSufficientBuffer();
    }

    function getBuffer() {
        return sourceBufferSink;
    }

    function getBufferLevel() {
        return bufferLevel;
    }

    function getMediaSource() {
        return mediaSource;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function setIsBufferingCompleted(value) {
        if (isBufferingCompleted === value) {
            return;
        }

        isBufferingCompleted = value;

        if (isBufferingCompleted) {
            triggerEvent(Events.BUFFERING_COMPLETED);
        } else {
            maximumIndex = Number.POSITIVE_INFINITY;
        }
    }

    function getIsPruningInProgress() {
        return isPruningInProgress;
    }

    function getTotalBufferedTime() {
        try {
            const ranges = sourceBufferSink.getAllBufferRanges();
            let totalBufferedTime = 0;
            let ln,
                i;

            if (!ranges) return totalBufferedTime;

            for (i = 0, ln = ranges.length; i < ln; i++) {
                totalBufferedTime += ranges.end(i) - ranges.start(i);
            }

            return totalBufferedTime;
        } catch (e) {
            return 0;
        }
    }

    /**
     * This function returns the maximum time for which the buffer is continuous starting from a target time.
     * As soon as there is a gap we return the time before the gap starts
     * @param {number} targetTime
     */
    function getContinuousBufferTimeForTargetTime(targetTime) {
        try {
            let adjustedTime = targetTime;
            const ranges = sourceBufferSink.getAllBufferRanges();

            if (!ranges || ranges.length === 0) {
                return targetTime;
            }

            let i = 0;

            while (adjustedTime === targetTime && i < ranges.length) {
                const start = ranges.start(i);
                const end = ranges.end(i);

                if (adjustedTime >= start && adjustedTime <= end) {
                    adjustedTime = end;
                }

                i += 1;
            }

            return adjustedTime;

        } catch (e) {

        }
    }

    function hasEnoughSpaceToAppend() {
        const totalBufferedTime = getTotalBufferedTime();
        return (isNaN(totalBufferedTime) || totalBufferedTime < criticalBufferLevel);
    }

    function setSeekTarget(value) {
        seekTarget = value;
    }

    function triggerEvent(eventType, data) {
        let payload = data || {};
        eventBus.trigger(eventType, payload, { streamId: streamInfo.id, mediaType: type });
    }

    function resetInitialSettings(errored, keepBuffers) {
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = undefined;
        maximumIndex = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        isBufferingCompleted = false;
        isPruningInProgress = false;
        isQuotaExceeded = false;
        bufferLevel = 0;
        wallclockTicked = 0;
        pendingPruningRanges = [];
        seekTarget = NaN;

        if (sourceBufferSink) {
            if (!errored && !keepBuffers) {
                sourceBufferSink.abort()
                    .then(() => {
                        sourceBufferSink.reset(keepBuffers);
                        sourceBufferSink = null;
                    });
            } else {
                sourceBufferSink = null;
            }
        }

        replacingBuffer = false;
    }

    function reset(errored, keepBuffers) {
        eventBus.off(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, this);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);
        eventBus.off(Events.STREAM_REQUESTING_COMPLETED, _onStreamRequestingCompleted, this);

        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STALLED, _onPlaybackStalled, this);


        resetInitialSettings(errored, keepBuffers);
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        getBufferControllerType,
        createBufferSink,
        getBuffer,
        getBufferLevel,
        getRangeAt,
        setMediaSource,
        getMediaSource,
        appendInitSegmentFromCache,
        getIsBufferingCompleted,
        setIsBufferingCompleted,
        getIsPruningInProgress,
        reset,
        prepareForPlaybackSeek,
        prepareForReplacementTrackSwitch,
        prepareForNonReplacementTrackSwitch,
        prepareForReplacementQualitySwitch,
        updateAppendWindow,
        getAllRangesWithSafetyFactor,
        getContinuousBufferTimeForTargetTime,
        clearBuffers,
        pruneAllSafely,
        updateBufferTimestampOffset,
        setSeekTarget
    };

    setup();
    return instance;
}

BufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(BufferController);
