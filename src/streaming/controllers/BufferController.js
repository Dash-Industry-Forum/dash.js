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
import Constants from '../constants/Constants.js';
import MetricsConstants from '../constants/MetricsConstants.js';
import FragmentModel from '../models/FragmentModel.js';
import SourceBufferSink from '../SourceBufferSink.js';
import PreBufferSink from '../PreBufferSink.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import InitCache from '../utils/InitCache.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents.js';

const BUFFER_END_THRESHOLD = 0.5;
const BUFFER_RANGE_CALCULATION_THRESHOLD = 0.01;
const QUOTA_EXCEEDED_ERROR_CODE = 22;

const BUFFER_CONTROLLER_TYPE = 'BufferController';

function BufferController(config) {

    config = config || {};
    const capabilities = config.capabilities;
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const fragmentModel = config.fragmentModel;
    const playbackController = config.playbackController;
    const representationController = config.representationController;
    const settings = config.settings;
    const streamInfo = config.streamInfo;
    const textController = config.textController;
    const type = config.type;

    let instance,
        logger,
        isBufferingCompleted,
        bufferLevel,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        maximumIndex,
        sourceBufferSink,
        dischargeBuffer,
        isPrebuffering,
        dischargeFragments,
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
     * @param {object} mediaInfo
     */
    function setMediaSource(value, mediaInfo = null) {
        return new Promise((resolve, reject) => {
            mediaSource = value;
            // if we have a prebuffer, we should prepare to discharge it, and make a new sourceBuffer ready
            if (sourceBufferSink && mediaInfo && typeof sourceBufferSink.discharge === 'function') {
                dischargeBuffer = sourceBufferSink;
                createBufferSink(mediaInfo)
                    .then(() => {
                        resolve();
                    })
                    .catch((e) => {
                        reject(e);
                    })
            } else {
                resolve();
            }
        })

    }

    /**
     * Creates a SourceBufferSink object
     * @param {object} mediaInfo
     * @param {array} oldBufferSinks
     * @return {Promise<Object>} SourceBufferSink
     */
    function createBufferSink(mediaInfo, oldBufferSinks = [], oldRepresentation) {
        return new Promise((resolve, reject) => {
            if (!initCache || !mediaInfo) {
                resolve(null);
                return;
            }
            if (mediaSource) {
                isPrebuffering = false;
                _initializeSinkForMseBuffering(mediaInfo, oldBufferSinks, oldRepresentation)
                    .then((sink) => {
                        resolve(sink);
                    })
                    .catch((e) => {
                        reject(e);
                    })
            } else {
                isPrebuffering = true;
                _initializeSinkForPrebuffering()
                    .then((sink) => {
                        resolve(sink);
                    })
                    .catch((e) => {
                        reject(e);
                    })
            }
        });
    }

    function _initializeSinkForPrebuffering() {
        return new Promise((resolve, reject) => {
            sourceBufferSink = PreBufferSink(context).create(_onAppended.bind(this));
            updateBufferTimestampOffset(representationController.getCurrentRepresentation())
                .then(() => {
                    resolve(sourceBufferSink);
                })
                .catch(() => {
                    reject();
                })
        })
    }

    function _initializeSinkForMseBuffering(mediaInfo, oldBufferSinks, oldRepresentation) {
        return new Promise((resolve) => {
            sourceBufferSink = SourceBufferSink(context).create({
                mediaSource,
                textController,
                eventBus
            });
            _initializeSink(mediaInfo, oldBufferSinks, oldRepresentation)
                .then(() => {
                    return updateBufferTimestampOffset(representationController.getCurrentRepresentation());
                })
                .then(() => {
                    resolve(sourceBufferSink);
                })
                .catch((e) => {
                    logger.warn('Caught error on create SourceBuffer: ' + e);
                    resolve(sourceBufferSink);
                });
        })
    }

    function _initializeSink(mediaInfo, oldBufferSinks, oldRepresentation) {
        const newRepresentation = representationController.getCurrentRepresentation();

        if (oldBufferSinks && oldBufferSinks[type] && (type === Constants.VIDEO || type === Constants.AUDIO)) {
            return _initializeSinkForStreamSwitch(mediaInfo, newRepresentation, oldBufferSinks, oldRepresentation)
        } else {
            return _initializeSinkForFirstUse(mediaInfo, newRepresentation);
        }
    }

    function _initializeSinkForStreamSwitch(mediaInfo, newRepresentation, oldBufferSinks, oldRepresentation) {
        sourceBufferSink.initializeForStreamSwitch(mediaInfo, newRepresentation, oldBufferSinks[type]);

        const promises = [];
        promises.push(sourceBufferSink.abortBeforeAppend());
        promises.push(updateAppendWindow());
        promises.push(_changeCodec(newRepresentation, oldRepresentation))

        if (newRepresentation && newRepresentation.mseTimeOffset !== undefined) {
            promises.push(updateBufferTimestampOffset(newRepresentation));
        }

        return Promise.allSettled(promises);
    }

    function _initializeSinkForFirstUse(mediaInfo, newRepresentation) {
        return sourceBufferSink.initializeForFirstUse(mediaInfo, newRepresentation);
    }

    function dischargePreBuffer() {
        if (sourceBufferSink && dischargeBuffer && typeof dischargeBuffer.discharge === 'function') {
            const ranges = dischargeBuffer.getAllBufferRanges();

            if (ranges.length > 0) {
                let rangeStr = 'Beginning ' + type + 'PreBuffer discharge, adding buffer for:';
                for (let i = 0; i < ranges.length; i++) {
                    rangeStr += ' start: ' + ranges.start(i) + ', end: ' + ranges.end(i) + ';';
                }
                logger.debug(rangeStr);
            } else {
                logger.debug('PreBuffer discharge requested, but there were no media segments in the PreBuffer.');
            }

            //A list of fragments to supress bytesAppended events for. This makes transferring from a prebuffer to a sourcebuffer silent.
            dischargeFragments = [];
            let chunks = dischargeBuffer.discharge();
            let lastInit = null;
            for (let j = 0; j < chunks.length; j++) {
                const chunk = chunks[j];
                if (chunk.segmentType !== HTTPRequest.INIT_SEGMENT_TYPE) {
                    const initChunk = initCache.extract(chunk.streamId, chunk.representation.id);
                    if (initChunk) {
                        if (lastInit !== initChunk) {
                            dischargeFragments.push(initChunk);
                            sourceBufferSink.append(initChunk);
                            lastInit = initChunk;
                        }
                    }
                }
                dischargeFragments.push(chunk);
                sourceBufferSink.append(chunk);
            }

            dischargeBuffer.reset();
            dischargeBuffer = null;
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
        logger.debug(`Appending init fragment for type ${type}, representationId ${e.chunk.representation.id} and bandwidth ${e.chunk.representation.bandwidth}`);
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
        logger.debug(`Appending init fragment for type ${type}, representationId ${chunk.representation.id} and bandwidth ${chunk.representation.bandwidth}`);

        _appendToBuffer(chunk);

        return true;
    }

    /**
     * Calls the _appendToBuffer function to append the segment to the buffer. In case of a track switch the buffer might be cleared.
     * @param {object} e
     */
    function _onMediaFragmentLoaded(e) {
        _appendToBuffer(e.chunk, e.request);
    }

    /**
     * Append data to the MSE buffer using the SourceBufferSink
     * @param {object} chunk
     * @param {object} request
     * @private
     */
    function _appendToBuffer(chunk, request = null) {
        if (!sourceBufferSink) {
            return;
        }
        sourceBufferSink.append(chunk, request)
            .then((e) => {
                _onAppended(e);
            })
            .catch((e) => {
                _onAppended(e);
            });

        if (chunk.representation.mediaInfo.type === Constants.VIDEO) {
            _triggerEvent(Events.VIDEO_CHUNK_RECEIVED, { chunk: chunk });
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
                _triggerEvent(Events.QUOTA_EXCEEDED, {
                    criticalBufferLevel: criticalBufferLevel,
                    quotaExceededTime: e.chunk.start
                });
                clearBuffers(getClearRanges());
            }
            return;
        }

        // Check if session has not been stopped in the meantime (while last segment was being appended)
        if (!sourceBufferSink) {
            return;
        }

        _updateBufferLevel();

        isQuotaExceeded = false;
        appendedBytesInfo = e.chunk;

        if (!appendedBytesInfo || !appendedBytesInfo.endFragment) {
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

        let suppressAppendedEvent = false;
        if (dischargeFragments) {
            if (dischargeFragments.indexOf(appendedBytesInfo) > 0) {
                suppressAppendedEvent = true;
            }
            dischargeFragments = null;
        }

        if (appendedBytesInfo && !suppressAppendedEvent) {
            _triggerEvent(Events.BYTES_APPENDED_END_FRAGMENT, {
                startTime: appendedBytesInfo.start,
                index: appendedBytesInfo.index,
                bufferedRanges: ranges,
                segmentType: appendedBytesInfo.segmentType,
                mediaType: type,
                representationId: appendedBytesInfo.representation.id
            });
        }
    }

    /**
     * In some cases the segment we requested might start at a different time than we initially aimed for. segments timeline/template tolerance.
     * We might need to do an internal seek if there is drift.
     * @private
     */
    function _adjustSeekTarget() {
        if (isNaN(seekTarget) || isPrebuffering) {
            return;
        }
        // Check buffered data only for audio and video
        if (type !== Constants.AUDIO && type !== Constants.VIDEO) {
            seekTarget = NaN;
            return;
        }

        // Check if current buffered range already contains seek target (and current video element time)
        const currentTime = playbackController.getTime();
        const rangeAtCurrenTime = getRangeAt(currentTime, 0);
        const rangeAtSeekTarget = getRangeAt(seekTarget, 0);
        if (rangeAtCurrenTime && rangeAtSeekTarget && rangeAtCurrenTime.start === rangeAtSeekTarget.start) {
            seekTarget = NaN;
            return;
        }

        // Get buffered range corresponding to the seek target
        const segmentDuration = representationController.getCurrentRepresentation().segmentDuration;
        const range = getRangeAt(seekTarget, segmentDuration);
        if (!range) {
            return;
        }

        if (settings.get().streaming.buffer.enableSeekDecorrelationFix && Math.abs(currentTime - seekTarget) > segmentDuration) {
            // If current video model time is decorrelated from seek target (and appended buffer) then seek video element
            // (in case of live streams on some browsers/devices for which we can't set video element time at unavalaible range)

            // Check if appended segment is not anterior from seek target (segments timeline/template tolerance)
            if (seekTarget <= range.end) {
                // Seek video element to seek target or range start if appended buffer starts after seek target (segments timeline/template tolerance)
                playbackController.seek(Math.max(seekTarget, range.start), false, true);
            }
        } else if (currentTime < range.start) {
            // If appended buffer starts after seek target (segments timeline/template tolerance) then seek to range start
            playbackController.seek(range.start, false, true);
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

    function prepareForPlaybackSeek() {
        if (isBufferingCompleted) {
            setIsBufferingCompleted(false);
        }

        // Abort the current request and empty all possible segments to be appended
        return sourceBufferSink.abort();
    }

    function prepareForForceReplacementQualitySwitch(newRepresentation, oldRepresentation) {
        return new Promise((resolve) => {
            const promises = [];
            promises.push(sourceBufferSink.abort())
            promises.push(updateAppendWindow())
            promises.push(pruneAllSafely())
            promises.push(updateBufferTimestampOffset(newRepresentation))
            promises.push(_changeCodec(newRepresentation, oldRepresentation))

            Promise.allSettled(promises)
                .then(() => {
                    setIsBufferingCompleted(false);
                    resolve();
                })

        });
    }

    function prepareForAbandonQualitySwitch(newRepresentation, oldRepresentation) {
        return _defaultQualitySwitchPreparation(newRepresentation, oldRepresentation);
    }

    function prepareForFastQualitySwitch(newRepresentation, oldRepresentation) {
        return _defaultQualitySwitchPreparation(newRepresentation, oldRepresentation);
    }

    function prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation) {
        return _defaultQualitySwitchPreparation(newRepresentation, oldRepresentation);
    }

    function _defaultQualitySwitchPreparation(newRepresentation, oldRepresentation) {
        const promises = [];
        promises.push(updateBufferTimestampOffset(newRepresentation));
        promises.push(abort());
        promises.push(_changeCodec(newRepresentation, oldRepresentation));

        return Promise.allSettled(promises);
    }

    function prepareForReplacementTrackSwitch(newRepresentation, oldRepresentation) {
        return new Promise((resolve) => {
            const promises = [];
            promises.push(sourceBufferSink.abort());
            promises.push(updateAppendWindow());
            promises.push(_changeCodec(newRepresentation, oldRepresentation));
            promises.push(pruneAllSafely());
            promises.push(updateBufferTimestampOffset(newRepresentation));

            Promise.allSettled(promises)
                .then(() => {
                    setIsBufferingCompleted(false);
                    resolve();
                })
        })
    }

    function prepareForNonReplacementTrackSwitch(newRepresentation, oldRepresentation) {
        return new Promise((resolve) => {
            const promises = [];

            promises.push(updateAppendWindow());
            promises.push(_changeCodec(newRepresentation, oldRepresentation))

            Promise.allSettled(promises)
                .then(() => {
                    resolve();
                })
        });
    }

    function _changeCodec(newRepresentation, oldRepresentation) {

        if (!newRepresentation || !oldRepresentation) {
            logger.warn(`BufferController._changeCodec() is missing the information about the Representations. Doing nothing`);
            return Promise.resolve();
        }

        // we dont need change type for the codec change if we have the same mime type and codec family
        if (newRepresentation && oldRepresentation && newRepresentation.mimeType === oldRepresentation.mimeType && newRepresentation.codecFamily === oldRepresentation.codecFamily) {
            logger.debug(`Switching to new codec ${newRepresentation.codecs} without changeType as previous codec ${oldRepresentation.codecs} is compatible.`);
            return Promise.resolve();
        }

        // change type should not be used or is not supported
        if (!settings.get().streaming.buffer.useChangeType || !capabilities.supportsChangeType()) {
            logger.debug(`changeType() not available`);
            return Promise.resolve()
        }

        logger.debug(`Using changeType() to switch from codec ${oldRepresentation.codecs} to ${newRepresentation.codecs}`);
        return sourceBufferSink.changeType(newRepresentation);
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

        // if no target time is provided we clear everything
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
        // we keep everything that is within bufferToKeepAhead but only if the buffer is continuous.
        // Otherwise we have gaps once the seek is done which might trigger an unintentional gap jump
        const endOfBuffer = ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD;
        const continuousBufferTime = getContinuousBufferTimeForTargetTime(targetTime);

        // This is the maximum range we keep ahead
        const isLongFormContent = streamInfo.manifestInfo.duration >= settings.get().streaming.buffer.longFormContentDurationThreshold;
        const bufferToKeepAhead = isLongFormContent ? settings.get().streaming.buffer.bufferTimeAtTopQualityLongForm : settings.get().streaming.buffer.bufferTimeAtTopQuality;

        // Define the start time from which we will prune. If there is no continuous range from the targettime we start immediately at the target time
        // Otherwise we set the start point to the end of the continuous range taking the maximum buffer to keep ahead into account
        let rangeStart = !isNaN(continuousBufferTime) ? Math.min(continuousBufferTime, targetTime + bufferToKeepAhead) : targetTime;

        // Check if we are done buffering, no need to prune then
        if (rangeStart >= ranges.end(ranges.length - 1)) {
            return null
        }

        // Ensure we keep full range of current fragment
        const currentTimeRequest = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: targetTime,
            threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
        })[0];

        if (currentTimeRequest) {
            rangeStart = Math.max(currentTimeRequest.startTime + currentTimeRequest.duration, rangeStart);
        }

        // Never remove the contiguous range of targetTime in order to avoid flushes & reenqueues when the user doesn't want it
        const avoidCurrentTimeRangePruning = settings.get().streaming.buffer.avoidCurrentTimeRangePruning;
        if (avoidCurrentTimeRangePruning) {
            for (let i = 0; i < ranges.length; i++) {
                if (ranges.start(i) <= targetTime && targetTime <= ranges.end(i)
                    && ranges.start(i) <= rangeStart && rangeStart <= ranges.end(i)) {
                    let oldRangeStart = rangeStart;
                    if (i + 1 < ranges.length) {
                        rangeStart = ranges.start(i + 1);
                    } else {
                        rangeStart = ranges.end(i) + 1;
                    }
                    logger.debug('Buffered range [' + ranges.start(i) + ', ' + ranges.end(i) + '] overlaps with targetTime ' + targetTime + ' and range to be pruned [' + oldRangeStart + ', ' + endOfBuffer + '], using [' + rangeStart + ', ' + endOfBuffer + '] instead' + ((rangeStart < endOfBuffer) ? '' : ' (no actual pruning)'));
                    break;
                }
            }
        }

        if (rangeStart < ranges.end(ranges.length - 1)) {
            return {
                start: rangeStart,
                end: endOfBuffer
            };
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

    function hasBufferAtTime(time) {
        try {
            const ranges = sourceBufferSink.getAllBufferRanges();

            if (!ranges || ranges.length === 0) {
                return false;
            }

            let i = 0;

            while (i < ranges.length) {
                const start = ranges.start(i);
                const end = ranges.end(i);

                if (time >= start && time <= end) {
                    return true;
                }

                i += 1;
            }

            return false

        } catch (e) {
            logger.error(e);
            return false;
        }
    }

    function getRangeAt(time, tolerance) {
        if (!sourceBufferSink) {
            return null;
        }
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
            let referenceTime = playbackController.getTime() || 0;
            // In case we are prebuffering we dont have a current time yet
            if (isPrebuffering) {
                referenceTime = !isNaN(seekTarget) ? seekTarget : 0;
            }
            const tolerance = settings.get().streaming.gaps.jumpGaps && !isNaN(settings.get().streaming.gaps.smallGapLimit) ? settings.get().streaming.gaps.smallGapLimit : NaN;
            bufferLevel = Math.max(getBufferLength(referenceTime, tolerance), 0);
            _triggerEvent(Events.BUFFER_LEVEL_UPDATED, { mediaType: type, bufferLevel: bufferLevel });
            checkIfSufficientBuffer();
        }
    }

    function _checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex >= maximumIndex - 1; // Handles 0 and non 0 based request index
        // To avoid rounding error when comparing, the stream time and buffer level only must be within 5 decimal places
        const periodBuffered = playbackController.getTimeToStreamEnd(streamInfo) - bufferLevel < 0.00001;
        if ((isLastIdxAppended || periodBuffered) && !isBufferingCompleted) {
            setIsBufferingCompleted(true);
            logger.debug(`checkIfBufferingCompleted trigger BUFFERING_COMPLETED for stream id ${streamInfo.id} and type ${type}`);
        }
    }

    function checkIfSufficientBuffer() {
        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== Constants.AUDIO && type !== Constants.VIDEO) {
            return;
        }

        //Set stall threshold based on player mode
        const stallThreshold = playbackController.getLowLatencyModeEnabled() ? settings.get().streaming.buffer.lowLatencyStallThreshold : settings.get().streaming.buffer.stallThreshold;

        if ((bufferLevel <= stallThreshold) && !isBufferingCompleted) {
            _notifyBufferStateChanged(MetricsConstants.BUFFER_EMPTY);
        } else if (isBufferingCompleted || bufferLevel > stallThreshold) {
            _notifyBufferStateChanged(MetricsConstants.BUFFER_LOADED);
        }
    }

    function _notifyBufferStateChanged(state) {
        if (bufferState === state ||
            (state === MetricsConstants.BUFFER_EMPTY && playbackController.getTime() === 0) || // Don't trigger BUFFER_EMPTY if it's initial loading
            (type === Constants.TEXT && !textController.isTextEnabled())) {
            return;
        }

        bufferState = state;

        _triggerEvent(Events.BUFFER_LEVEL_STATE_CHANGED, { state: state });
        _triggerEvent(state === MetricsConstants.BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY);
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
                _updateBufferLevel();
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

        if (!sourceBufferSink) {
            return;
        }

        const ranges = sourceBufferSink.getAllBufferRanges();
        _showBufferRanges(ranges);

        if (pendingPruningRanges.length === 0) {
            isPruningInProgress = false;
            _updateBufferLevel();
        }

        if (e.unintended) {
            logger.warn('Detected unintended removal from:', e.from, 'to', e.to, 'setting streamprocessor time to', e.from);
            _triggerEvent(Events.SEEK_TARGET, { time: e.from });
        }

        if (isPruningInProgress) {
            clearNextRange();
        } else {
            if (!replacingBuffer) {
                _updateBufferLevel();
            } else {
                replacingBuffer = false;
            }
            _triggerEvent(Events.BUFFER_CLEARED, {
                from: e.from,
                to: e.to,
                unintended: e.unintended,
                hasEnoughSpaceToAppend: hasEnoughSpaceToAppend(),
                quotaExceeded: isQuotaExceeded
            });
        }
    }

    function updateBufferTimestampOffset(voRepresentation) {
        return new Promise((resolve) => {
            if (!voRepresentation || voRepresentation.mseTimeOffset === undefined || !sourceBufferSink || !sourceBufferSink.updateTimestampOffset) {
                resolve();
                return;
            }
            // Each track can have its own @presentationTimeOffset, so we should set the offset
            // if it has changed after switching the quality or updating an MPD
            sourceBufferSink.updateTimestampOffset(voRepresentation.mseTimeOffset)
                .then(() => {
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });

    }

    function abort() {
        if (sourceBufferSink) {
            return sourceBufferSink.abort();
        }
        return Promise.resolve();
    }

    function updateAppendWindow() {
        if (sourceBufferSink && !isBufferingCompleted) {
            return sourceBufferSink.updateAppendWindow(streamInfo);
        }
        return Promise.resolve();
    }

    function segmentRequestingCompleted(segmentIndex) {
        if (!isNaN(segmentIndex)) {
            maximumIndex = segmentIndex;
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
        isBufferingCompleted = value;

        if (isBufferingCompleted) {
            _triggerEvent(Events.BUFFERING_COMPLETED);
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

            if (!ranges) {
                return totalBufferedTime;
            }

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
                return NaN;
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

            return adjustedTime === targetTime ? NaN : adjustedTime;

        } catch (e) {
            return NaN
        }
    }

    function hasEnoughSpaceToAppend() {
        const totalBufferedTime = getTotalBufferedTime();
        return (isNaN(totalBufferedTime) || totalBufferedTime < criticalBufferLevel);
    }

    function setSeekTarget(value) {
        seekTarget = value;
    }

    function _triggerEvent(eventType, data) {
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
        isPrebuffering = false;

        if (sourceBufferSink) {
            let tmpSourceBufferSinkToReset = sourceBufferSink;
            sourceBufferSink = null;
            if (!errored) {
                if (!keepBuffers) {
                    tmpSourceBufferSinkToReset.abort()
                        .then(() => {
                            tmpSourceBufferSinkToReset.reset(keepBuffers);
                            tmpSourceBufferSinkToReset = null;
                        });
                } else {
                    tmpSourceBufferSinkToReset.removeEventListeners();
                }
            }
        }

        replacingBuffer = false;
    }

    function reset(errored, keepBuffers) {
        eventBus.off(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, this);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, this);

        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, _onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STALLED, _onPlaybackStalled, this);


        resetInitialSettings(errored, keepBuffers);
    }

    instance = {
        appendInitSegmentFromCache,
        clearBuffers,
        createBufferSink,
        dischargePreBuffer,
        getAllRangesWithSafetyFactor,
        getBuffer,
        getBufferControllerType,
        getBufferLevel,
        getContinuousBufferTimeForTargetTime,
        getIsBufferingCompleted,
        getIsPruningInProgress,
        getMediaSource,
        getRangeAt,
        getStreamId,
        getType,
        hasBufferAtTime,
        initialize,
        prepareForAbandonQualitySwitch,
        prepareForDefaultQualitySwitch,
        prepareForFastQualitySwitch,
        prepareForForceReplacementQualitySwitch,
        prepareForNonReplacementTrackSwitch,
        prepareForPlaybackSeek,
        prepareForReplacementTrackSwitch,
        pruneAllSafely,
        pruneBuffer,
        reset,
        segmentRequestingCompleted,
        setIsBufferingCompleted,
        setMediaSource,
        setSeekTarget,
        updateAppendWindow,
        updateBufferTimestampOffset,
    };

    setup();
    return instance;
}

BufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(BufferController);
