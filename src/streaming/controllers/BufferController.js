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
import PreBufferSink from '../PreBufferSink';
import AbrController from './AbrController';
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
    const mediaController = config.mediaController;
    const adapter = config.adapter;
    const textController = config.textController;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const streamInfo = config.streamInfo;
    const type = config.type;
    const settings = config.settings;

    let instance,
        logger,
        requiredQuality,
        isBufferingCompleted,
        bufferLevel,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        maximumIndex,
        buffer,
        dischargeBuffer,
        dischargeFragments,
        bufferState,
        appendedBytesInfo,
        wallclockTicked,
        isPruningInProgress,
        isQuotaExceeded,
        initCache,
        pendingPruningRanges,
        replacingBuffer,
        mediaChunk;


    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        initCache = InitCache(context).getInstance();

        resetInitialSettings();
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function setMediaSource(value, mediaInfo) {
        mediaSource = value;
        if (buffer && mediaInfo) { //if we have a prebuffer, we should prepare to discharge it, and make a new sourceBuffer ready
            if (typeof buffer.discharge === 'function') {
                dischargeBuffer = buffer;
                createBuffer(mediaInfo);
            }
        }
    }

    function initialize(Source) {
        setMediaSource(Source);

        requiredQuality = abrController.getQualityFor(type, streamInfo.id);

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
        eventBus.on(Events.BYTES_APPENDED_IN_SINK, onAppended, this);

        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PLAYING, onPlaybackPlaying, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(MediaPlayerEvents.OUTER_PERIOD_PLAYBACK_SEEKING, onOuterPeriodPlaybackSeeking, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STALLED, onPlaybackStalled, this);
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }


    function getRepresentationInfo(quality) {
        return adapter.convertDataToRepresentationInfo(representationController.getRepresentationForQuality(quality));
    }

    function createBuffer(mediaInfoArr, oldBuffers) {
        if (!initCache || !mediaInfoArr) return null;
        const mediaInfo = mediaInfoArr[0];
        if (mediaSource) {
            try {
                const selectedRepresentation = this.getRepresentationInfo(requiredQuality);
                if (oldBuffers && oldBuffers[type]) {
                    buffer = oldBuffers[type];
                    buffer.initializeForStreamSwitch(mediaInfo, selectedRepresentation);
                } else {
                    buffer = SourceBufferSink(context).create(mediaSource);
                    buffer.initializeForFirstUse(mediaInfo, selectedRepresentation);
                }

                if (typeof buffer.getBuffer().initialize === 'function') {
                    buffer.getBuffer().initialize(type, streamInfo, mediaInfoArr, fragmentModel);
                }

            } catch (e) {
                logger.fatal('Caught error on create SourceBuffer: ' + e);
                errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type));
            }
        } else {
            buffer = PreBufferSink(context).create(onAppended.bind(this));
        }
        updateBufferTimestampOffset(getRepresentationInfo(requiredQuality));
        return buffer;
    }

    function dischargePreBuffer() {
        if (buffer && dischargeBuffer && typeof dischargeBuffer.discharge === 'function') {
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
                if (chunk.segmentType !== 'InitializationSegment') {
                    const initChunk = initCache.extract(chunk.streamId, chunk.representationId);
                    if (initChunk) {
                        if (lastInit !== initChunk) {
                            dischargeFragments.push(initChunk);
                            buffer.append(initChunk);
                            lastInit = initChunk;
                        }
                    }
                }
                dischargeFragments.push(chunk);
                buffer.append(chunk);
            }

            dischargeBuffer.reset();
            dischargeBuffer = null;
        }
    }

    function onInitFragmentLoaded(e) {
        logger.info('Init fragment finished loading saving to', type + '\'s init cache');
        initCache.save(e.chunk);
        logger.debug('Append Init fragment', type, ' with representationId:', e.chunk.representationId, ' and quality:', e.chunk.quality, ', data size:', e.chunk.bytes.byteLength);
        appendToBuffer(e.chunk);
    }

    function appendInitSegment(representationId) {
        // Get init segment from cache
        const chunk = initCache.extract(streamInfo.id, representationId);

        if (!chunk) {
            // Init segment not in cache, shall be requested
            return false;
        }

        // Append init segment into buffer
        logger.info('Append Init fragment', type, ' with representationId:', chunk.representationId, ' and quality:', chunk.quality, ', data size:', chunk.bytes.byteLength);
        appendToBuffer(chunk);
        return true;
    }

    function onMediaFragmentLoaded(e) {
        const chunk = e.chunk;

        if (replacingBuffer) {
            mediaChunk = chunk;
            const ranges = buffer && buffer.getAllBufferRanges();
            if (ranges && ranges.length > 0 && playbackController.getTimeToStreamEnd() > settings.get().streaming.stallThreshold) {
                logger.debug('Clearing buffer because track changed - ' + (ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD));
                clearBuffers([{
                    start: 0,
                    end: ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD,
                    force: true // Force buffer removal even when buffering is completed and MediaSource is ended
                }]);
            }
        } else {
            appendToBuffer(chunk);
        }
    }

    function appendToBuffer(chunk) {
        buffer.append(chunk);

        if (chunk.mediaInfo.type === Constants.VIDEO) {
            triggerEvent(Events.VIDEO_CHUNK_RECEIVED, { chunk: chunk });
        }
    }

    function showBufferRanges(ranges) {
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                logger.debug('Buffered range: ' + ranges.start(i) + ' - ' + ranges.end(i) + ', currentTime = ', playbackController.getTime());
            }
        }
    }

    function onAppended(e) {

        if (e.streamId !== streamInfo.id || e.mediaType !== type) {
            return;
        }

        if (e.error) {
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE) {
                isQuotaExceeded = true;
                criticalBufferLevel = getTotalBufferedTime() * 0.8;
                logger.warn('Quota exceeded, Critical Buffer: ' + criticalBufferLevel);

                if (criticalBufferLevel > 0) {
                    // recalculate buffer lengths according to criticalBufferLevel
                    const bufferToKeep = Math.max(0.2 * criticalBufferLevel, 1);
                    const bufferAhead = criticalBufferLevel - bufferToKeep;
                    const bufferTimeAtTopQuality = Math.min(settings.get().streaming.bufferTimeAtTopQuality, bufferAhead * 0.9);
                    const bufferTimeAtTopQualityLongForm = Math.min(settings.get().streaming.bufferTimeAtTopQualityLongForm, bufferAhead * 0.9);
                    const s = {
                        streaming: {
                            bufferToKeep: parseFloat(bufferToKeep.toFixed(5)),
                            bufferTimeAtTopQuality: parseFloat(bufferTimeAtTopQuality.toFixed(5)),
                            bufferTimeAtTopQualityLongForm: parseFloat(bufferTimeAtTopQualityLongForm.toFixed(5))
                        }
                    };
                    settings.update(s);
                }
            }
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                logger.warn('Clearing playback buffer to overcome quota exceed situation');
                // Notify Schedulecontroller to stop scheduling until buffer has been pruned
                triggerEvent(Events.QUOTA_EXCEEDED, { criticalBufferLevel: criticalBufferLevel });
                clearBuffers(getClearRanges());
            }
            return;
        }
        isQuotaExceeded = false;

        appendedBytesInfo = e.chunk;
        if (appendedBytesInfo && !isNaN(appendedBytesInfo.index)) {
            maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
            checkIfBufferingCompleted();
        }

        const ranges = buffer.getAllBufferRanges();
        if (appendedBytesInfo.segmentType === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            showBufferRanges(ranges);
            onPlaybackProgression();
        } else if (replacingBuffer) {
            // When replacing buffer due to switch track, and once new initialization segment has been appended
            // (and previous buffered data removed) then seek stream to current time
            const currentTime = playbackController.getTime();
            logger.debug('AppendToBuffer seek target should be ' + currentTime);
            triggerEvent(Events.SEEK_TARGET, { time: currentTime });
        }

        let suppressAppendedEvent = false;
        if (dischargeFragments) {
            if (dischargeFragments.indexOf(appendedBytesInfo) > 0) {
                suppressAppendedEvent = true;
            }
            dischargeFragments = null;
        }
        if (appendedBytesInfo && !suppressAppendedEvent) {
            triggerEvent(appendedBytesInfo.endFragment ? Events.BYTES_APPENDED_END_FRAGMENT : Events.BYTES_APPENDED, {
                quality: appendedBytesInfo.quality,
                startTime: appendedBytesInfo.start,
                index: appendedBytesInfo.index,
                bufferedRanges: ranges
            });
        }
    }

    function onQualityChanged(e) {
        if (requiredQuality === e.newQuality || isBufferingCompleted) return;

        updateBufferTimestampOffset(this.getRepresentationInfo(e.newQuality));
        requiredQuality = e.newQuality;
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function prepareForPlaybackSeek() {
        buffer.abort(); // Abort the current request and empty all possible segments to be appended
        if (isBufferingCompleted) {
            isBufferingCompleted = false;
            //a seek command has occured, reset maximum index value, it will be set next time that onStreamCompleted will be called.
            maximumIndex = Number.POSITIVE_INFINITY;
        }
    }

    function onOuterPeriodPlaybackSeeking(e) {
        if (streamInfo.id !== e.streamId) {
            return;
        }

        if (type !== Constants.FRAGMENTED_TEXT) {
            // remove buffer after seeking operations
            pruneAllSafely(true);
        } else {
            eventBus.trigger(Events.BUFFER_CLEARED_FOR_STREAM_SWITCH, { mediaType: type });
        }
    }

    function pruneAllSafely(seekTime, pruneForStreamSwitch = false) {
        buffer.waitForUpdateEnd(() => {
            const ranges = getAllRangesWithSafetyFactor(seekTime);
            if (!ranges || ranges.length === 0) {
                if (pruneForStreamSwitch) {
                    triggerEvent(Events.BUFFER_CLEARED_FOR_STREAM_SWITCH);
                }
                onPlaybackProgression();
            }
            clearBuffers(ranges);
        });
    }

    function getAllRangesWithSafetyFactor(seekTime) {
        const clearRanges = [];
        const ranges = buffer.getAllBufferRanges();
        if (!ranges || ranges.length === 0) {
            return clearRanges;
        }

        const behindPruningRange = _getRangeBehindForPruning(seekTime, ranges);
        const aheadPruningRange = _getRangeAheadForPruning(seekTime, ranges);

        if (behindPruningRange) {
            clearRanges.push(behindPruningRange);
        }

        if (aheadPruningRange) {
            clearRanges.push(aheadPruningRange);
        }

        return clearRanges;
    }

    function _getRangeBehindForPruning(targetTime, ranges) {
        const bufferToKeepBehind = settings.get().streaming.bufferToKeep;
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
        const bufferToKeepAhead = settings.get().streaming.bufferTimeAtTopQuality;
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

    function onPlaybackProgression(e) {
        if (!replacingBuffer || (type === Constants.FRAGMENTED_TEXT && textController.isTextEnabled())) {
            const streamId = e && e.streamId ? e.streamId : null;
            updateBufferLevel(streamId);
        }
    }

    function onPlaybackStalled() {
        checkIfSufficientBuffer();
    }

    function onPlaybackPlaying() {
        checkIfSufficientBuffer();
    }

    function getRangeAt(time, tolerance) {
        const ranges = buffer.getAllBufferRanges();
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
        if (settings.get().streaming.jumpGaps) {
            tolerance = settings.get().streaming.smallGapLimit;
        }

        range = getRangeAt(time, tolerance);

        if (range === null) {
            length = 0;
        } else {
            length = range.end - time;
        }

        return length;
    }

    function updateBufferLevel(streamId = null) {
        if (playbackController) {
            const tolerance = settings.get().streaming.jumpGaps && !isNaN(settings.get().streaming.smallGapLimit) ? settings.get().streaming.smallGapLimit : NaN;
            bufferLevel = getBufferLength(playbackController.getTime() || 0, tolerance);
            if (!streamId || streamId === streamInfo.id) {
                triggerEvent(Events.BUFFER_LEVEL_UPDATED, { bufferLevel: bufferLevel });
            }
            checkIfSufficientBuffer();
        }
    }

    function checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex >= maximumIndex - 1; // Handles 0 and non 0 based request index
        if (isLastIdxAppended && !isBufferingCompleted && buffer.discharge === undefined) {
            isBufferingCompleted = true;
            logger.debug('checkIfBufferingCompleted trigger BUFFERING_COMPLETED for ' + type);
            triggerEvent(Events.BUFFERING_COMPLETED);
        }
    }

    function checkIfSufficientBuffer() {
        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== Constants.AUDIO && type !== Constants.VIDEO) return;

        // When the player is working in low latency mode, the buffer is often below STALL_THRESHOLD.
        // So, when in low latency mode, change dash.js behavior so it notifies a stall just when
        // buffer reach 0 seconds
        if (((!settings.get().streaming.lowLatencyEnabled && bufferLevel < settings.get().streaming.stallThreshold) || bufferLevel === 0) && !isBufferingCompleted) {
            notifyBufferStateChanged(MetricsConstants.BUFFER_EMPTY);
        } else {
            if (isBufferingCompleted || bufferLevel >= streamInfo.manifestInfo.minBufferTime) {
                notifyBufferStateChanged(MetricsConstants.BUFFER_LOADED);
            }
        }
    }

    function notifyBufferStateChanged(state) {
        if (bufferState === state ||
            (state === MetricsConstants.BUFFER_EMPTY && playbackController.getTime() === 0) || // Don't trigger BUFFER_EMPTY if it's initial loading
            (type === Constants.FRAGMENTED_TEXT && !textController.isTextEnabled())) {
            return;
        }

        bufferState = state;

        triggerEvent(Events.BUFFER_LEVEL_STATE_CHANGED, { state: state });
        triggerEvent(state === MetricsConstants.BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY);
        logger.debug(state === MetricsConstants.BUFFER_LOADED ? 'Got enough buffer to start' : 'Waiting for more buffer before starting playback');
    }

    /* prune buffer on our own in background to avoid browsers pruning buffer silently */
    function pruneBuffer() {
        if (!buffer || type === Constants.FRAGMENTED_TEXT) {
            return;
        }

        if (!isBufferingCompleted) {
            clearBuffers(getClearRanges());
        }
    }

    function getClearRanges() {
        const clearRanges = [];
        const ranges = buffer.getAllBufferRanges();
        if (!ranges || ranges.length === 0) {
            return clearRanges;
        }

        const currentTime = playbackController.getTime();
        let startRangeToKeep = Math.max(0, currentTime - settings.get().streaming.bufferToKeep);

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
        if (!ranges || !buffer || ranges.length === 0) {
            triggerEvent(Events.BUFFER_CLEARED_ALL_RANGES);
            return;
        }

        pendingPruningRanges.push.apply(pendingPruningRanges, ranges);
        if (isPruningInProgress) {
            return;
        }

        clearNextRange();
    }


    function clearNextRange() {
        // If there's nothing to prune reset state
        if (pendingPruningRanges.length === 0 || !buffer) {
            logger.debug('Nothing to prune, halt pruning');
            pendingPruningRanges = [];
            triggerEvent(Events.BUFFER_CLEARED_ALL_RANGES);
            isPruningInProgress = false;
            return;
        }

        const sourceBuffer = buffer.getBuffer();
        // If there's nothing buffered any pruning is invalid, so reset our state
        if (!sourceBuffer || !sourceBuffer.buffered || sourceBuffer.buffered.length === 0) {
            logger.debug('SourceBuffer is empty (or does not exist), halt pruning');
            pendingPruningRanges = [];
            triggerEvent(Events.BUFFER_CLEARED_ALL_RANGES);
            isPruningInProgress = false;
            return;
        }

        const range = pendingPruningRanges.shift();
        logger.debug(`${type}: Removing buffer from: ${range.start} to ${range.end}`);
        isPruningInProgress = true;

        // If removing buffer ahead current playback position, update maxAppendedIndex
        const currentTime = playbackController.getTime();
        if (currentTime < range.end) {
            isBufferingCompleted = false;
            maxAppendedIndex = 0;
        }

        buffer.remove(range.start, range.end, range.force);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        logger.debug('onRemoved buffer from:', e.from, 'to', e.to);

        if (e.streamId === streamInfo.id) {
            const ranges = buffer.getAllBufferRanges();
            showBufferRanges(ranges);
        }

        if (pendingPruningRanges.length === 0) {
            triggerEvent(Events.BUFFER_CLEARED_ALL_RANGES);
            updateBufferLevel(streamInfo.id);
            isPruningInProgress = false;
        }

        if (e.unintended) {
            logger.warn('Detected unintended removal from:', e.from, 'to', e.to, 'setting index handler time to', e.from);
            triggerEvent(Events.SEEK_TARGET, { time: e.from });
        }

        if (isPruningInProgress) {
            clearNextRange();
        } else {
            if (!replacingBuffer) {
                updateBufferLevel(streamInfo.id);
            } else {
                replacingBuffer = false;
                if (mediaChunk) {
                    appendToBuffer(mediaChunk);
                }
            }
            triggerEvent(Events.BUFFER_CLEARED, {
                from: e.from,
                to: e.to,
                unintended: e.unintended,
                hasEnoughSpaceToAppend: hasEnoughSpaceToAppend(),
                quotaExceeded: isQuotaExceeded
            });
            eventBus.trigger(Events.BUFFER_CLEARED_FOR_STREAM_SWITCH, { mediaType: type });
        }
    }

    function updateBufferTimestampOffset(representationInfo) {
        if (!representationInfo || representationInfo.MSETimeOffset === undefined) return;
        // Each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.updateTimestampOffset) {
            buffer.updateTimestampOffset(representationInfo.MSETimeOffset);
        }
    }

    function updateAppendWindow() {
        if (buffer && !isBufferingCompleted) {
            buffer.updateAppendWindow(streamInfo);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.error || isBufferingCompleted) return;
        updateBufferTimestampOffset(e.currentRepresentation);
    }

    function onStreamCompleted(e) {
        maximumIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onCurrentTrackChanged(e) {
        if (e.newMediaInfo.streamInfo.id !== streamInfo.id || e.newMediaInfo.type !== type) {
            return;
        }

        const ranges = buffer && buffer.getAllBufferRanges();
        if (!ranges) return;

        logger.info('Track change asked');
        if (mediaController.getSwitchMode(type) === Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE) {
            if (ranges && ranges.length > 0 && playbackController.getTimeToStreamEnd(streamInfo) > settings.get().streaming.stallThreshold) {

                if (settings.get().streaming.useAppendWindow) {
                    updateAppendWindow();
                }

                isBufferingCompleted = false;
                maximumIndex = Number.POSITIVE_INFINITY;
            }
        }
    }

    function onWallclockTimeUpdated() {
        wallclockTicked++;
        const secondsElapsed = (wallclockTicked * (settings.get().streaming.wallclockTimeUpdateInterval / 1000));
        if ((secondsElapsed >= settings.get().streaming.bufferPruningInterval)) {
            wallclockTicked = 0;
            pruneBuffer();
        }
    }

    function onPlaybackRateChanged() {
        checkIfSufficientBuffer();
    }

    function getBuffer() {
        return buffer;
    }

    function setBuffer(newBuffer) {
        buffer = newBuffer;
    }

    function getBufferLevel() {
        return bufferLevel;
    }

    function getMediaSource() {
        return mediaSource;
    }

    function replaceBuffer() {
        replacingBuffer = true;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function getIsPruningInProgress() {
        return isPruningInProgress;
    }

    function getTotalBufferedTime() {
        const ranges = buffer.getAllBufferRanges();
        let totalBufferedTime = 0;
        let ln,
            i;

        if (!ranges) return totalBufferedTime;

        for (i = 0, ln = ranges.length; i < ln; i++) {
            totalBufferedTime += ranges.end(i) - ranges.start(i);
        }

        return totalBufferedTime;
    }

    /**
     * This function returns the maximum time for which the buffer is continuous starting from a target time.
     * As soon as there is a gap we return the time before the gap starts
     * @param {number} targetTime
     */
    function getContiniousBufferTimeForTargetTime(targetTime) {
        try {
            let adjustedTime = targetTime;
            const ranges = buffer.getAllBufferRanges();

            if (!ranges || ranges.length === 0) {
                return adjustedTime;
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
        return (totalBufferedTime < criticalBufferLevel);
    }

    function triggerEvent(eventType, data) {
        let payload = data || {};
        eventBus.trigger(eventType, payload, { streamId: streamInfo.id, mediaType: type });
    }

    function resetInitialSettings(errored, keepBuffers) {
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = undefined;
        requiredQuality = AbrController.QUALITY_DEFAULT;
        maximumIndex = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        isBufferingCompleted = false;
        isPruningInProgress = false;
        isQuotaExceeded = false;
        bufferLevel = 0;
        wallclockTicked = 0;
        pendingPruningRanges = [];

        if (buffer) {
            if (!errored && !keepBuffers) {
                buffer.abort();
            }
            buffer.reset(keepBuffers);
            buffer = null;
        }

        replacingBuffer = false;
    }

    function reset(errored, keepBuffers) {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
        eventBus.off(Events.BYTES_APPENDED_IN_SINK, onAppended, this);
        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, this);

        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, onPlaybackPlaying, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.OUTER_PERIOD_PLAYBACK_SEEKING, onOuterPeriodPlaybackSeeking, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STALLED, onPlaybackStalled, this);


        resetInitialSettings(errored, keepBuffers);
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        getBufferControllerType,
        getRepresentationInfo,
        createBuffer,
        dischargePreBuffer,
        getBuffer,
        setBuffer,
        getBufferLevel,
        getRangeAt,
        setMediaSource,
        getMediaSource,
        appendInitSegment,
        replaceBuffer,
        getIsBufferingCompleted,
        getIsPruningInProgress,
        reset,
        prepareForPlaybackSeek,
        updateAppendWindow,
        getAllRangesWithSafetyFactor,
        getContiniousBufferTimeForTargetTime,
        clearBuffers,
        updateBufferLevel
    };

    setup();
    return instance;
}

BufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(BufferController);
