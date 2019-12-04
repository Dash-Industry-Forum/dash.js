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
import MediaController from './MediaController';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import BoxParser from '../utils/BoxParser';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';
import { HTTPRequest } from '../vo/metrics/HTTPRequest';

const STALL_THRESHOLD = 0.5;
const BUFFER_END_THRESHOLD = 0.5;
const BUFFER_RANGE_CALCULATION_THRESHOLD = 0.01;
const QUOTA_EXCEEDED_ERROR_CODE = 22;

const BUFFER_CONTROLLER_TYPE = 'BufferController';

function BufferController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const dashMetrics = config.dashMetrics;
    const errHandler = config.errHandler;
    const streamController = config.streamController;
    const mediaController = config.mediaController;
    const adapter = config.adapter;
    const textController = config.textController;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const type = config.type;
    const streamProcessor = config.streamProcessor;
    const settings = config.settings;

    let instance,
        logger,
        requiredQuality,
        isBufferingCompleted,
        bufferLevel,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        lastIndex,
        buffer,
        dischargeBuffer,
        bufferState,
        appendedBytesInfo,
        wallclockTicked,
        isPruningInProgress,
        initCache,
        seekStartTime,
        seekClearedBufferingCompleted,
        pendingPruningRanges,
        bufferResetInProgress,
        mediaChunk;


    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        initCache = InitCache(context).getInstance();

        resetInitialSettings();
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(Source) {
        setMediaSource(Source);

        requiredQuality = abrController.getQualityFor(type);

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.PLAYBACK_PLAYING, onPlaybackPlaying, this);
        eventBus.on(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_SEEKED, onPlaybackSeeked, this);
        eventBus.on(Events.PLAYBACK_STALLED, onPlaybackStalled, this);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this, EventBus.EVENT_PRIORITY_HIGH);
        eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
    }

    function createBuffer(mediaInfo, oldBuffers) {
        if (!initCache || !mediaInfo || !streamProcessor) return null;
        if (mediaSource) {
            try {
                if (oldBuffers && oldBuffers[type]) {
                    buffer = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppended.bind(this), oldBuffers[type]);
                } else {
                    buffer = SourceBufferSink(context).create(mediaSource, mediaInfo, onAppended.bind(this));
                }
                if (typeof buffer.getBuffer().initialize === 'function') {
                    buffer.getBuffer().initialize(type, streamProcessor);
                }
            } catch (e) {
                logger.fatal('Caught error on create SourceBuffer: ' + e);
                errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type));
            }
        } else {
            buffer = PreBufferSink(context).create(onAppended.bind(this));
        }
        updateBufferTimestampOffset(streamProcessor.getRepresentationInfo(requiredQuality).MSETimeOffset);
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

            let chunks = dischargeBuffer.discharge();
            let lastInit = null;
            for (let j = 0; j < chunks.length; j++) {
                const chunk = chunks[j];
                const initChunk = initCache.extract(chunk.streamId, chunk.representationId);
                if (initChunk) {
                    if (lastInit !== initChunk) {
                        buffer.append(initChunk);
                        lastInit = initChunk;
                    }
                    buffer.append(chunk); //TODO Think about supressing buffer events the second time round after a discharge?
                }
            }

            dischargeBuffer.reset();
            dischargeBuffer = null;
        }
    }

    function isActive() {
        return streamProcessor && streamController && streamProcessor.getStreamInfo();
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        logger.info('Init fragment finished loading saving to', type + '\'s init cache');
        initCache.save(e.chunk);
        logger.debug('Append Init fragment', type, ' with representationId:', e.chunk.representationId, ' and quality:', e.chunk.quality,  ', data size:', e.chunk.bytes.byteLength);
        appendToBuffer(e.chunk);
    }

    function switchInitData(streamId, representationId, bufferResetEnabled) {
        const chunk = initCache.extract(streamId, representationId);
        bufferResetInProgress = bufferResetEnabled === true ? bufferResetEnabled : false;
        if (chunk) {
            logger.info('Append Init fragment', type, ' with representationId:', chunk.representationId, ' and quality:', chunk.quality, ', data size:', chunk.bytes.byteLength);
            appendToBuffer(chunk);
        } else {
            eventBus.trigger(Events.INIT_REQUESTED, { sender: instance });
        }
    }

    function onMediaFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;

        const chunk = e.chunk;
        const bytes = chunk.bytes;
        const quality = chunk.quality;
        const currentRepresentation = streamProcessor.getRepresentationInfo(quality);
        const representationController = streamProcessor.getRepresentationController();
        const voRepresentation = representationController && currentRepresentation ? representationController.getRepresentationForQuality(currentRepresentation.quality) : null;
        const eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo);
        const eventStreamTrack = adapter.getEventsFor(currentRepresentation, voRepresentation);

        if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
            const request = streamProcessor.getFragmentModel().getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                quality: quality,
                index: chunk.index
            })[0];

            const events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            streamProcessor.addInbandEvents(events);
        }

        if (bufferResetInProgress) {
            mediaChunk = chunk;
            const ranges = buffer && buffer.getAllBufferRanges();
            if (ranges && ranges.length > 0 && playbackController.getTimeToStreamEnd() > STALL_THRESHOLD) {
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
            eventBus.trigger(Events.VIDEO_CHUNK_RECEIVED, { chunk: chunk });
        }
    }

    function showBufferRanges(ranges) {
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                logger.debug('Buffered Range', ranges.start(i), ' - ', ranges.end(i), ' currentTime = ', playbackController.getTime());
            }
        }
    }

    function onAppended(e) {
        if (e.error) {
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE) {
                criticalBufferLevel = getTotalBufferedTime() * 0.8;
                logger.warn('Quota exceeded, Critical Buffer: ' + criticalBufferLevel);

                if (criticalBufferLevel > 0) {
                    // recalculate buffer lengths to keep (bufferToKeep, bufferAheadToKeep, bufferTimeAtTopQuality) according to criticalBufferLevel
                    const bufferToKeep = Math.max(0.2 * criticalBufferLevel, 1);
                    const bufferAhead = criticalBufferLevel - bufferToKeep;
                    const s = { streaming: { bufferToKeep: parseFloat(bufferToKeep.toFixed(5)),
                                           bufferAheadToKeep: parseFloat(bufferAhead.toFixed(5))}};
                    settings.update(s);
                }
            }
            if (e.error.code === QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                logger.warn('Clearing playback buffer to overcome quota exceed situation');
                eventBus.trigger(Events.QUOTA_EXCEEDED, { sender: instance, criticalBufferLevel: criticalBufferLevel }); //Tells ScheduleController to stop scheduling.
                pruneAllSafely(); // Then we clear the buffer and onCleared event will tell ScheduleController to start scheduling again.
            }
            return;
        }

        appendedBytesInfo = e.chunk;
        if (appendedBytesInfo && !isNaN(appendedBytesInfo.index)) {
            maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
            checkIfBufferingCompleted();
        }

        const ranges = buffer.getAllBufferRanges();
        if (appendedBytesInfo.segmentType === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            showBufferRanges(ranges);
            onPlaybackProgression();
        } else {
            if (bufferResetInProgress) {
                const currentTime = playbackController.getTime();
                logger.debug('AppendToBuffer seek target should be ' + currentTime);
                streamProcessor.getScheduleController().setSeekTarget(currentTime);
                streamProcessor.setIndexHandlerTime(currentTime);
            }
        }

        const dataEvent = {
            sender: instance,
            quality: appendedBytesInfo.quality,
            startTime: appendedBytesInfo.start,
            index: appendedBytesInfo.index,
            bufferedRanges: ranges
        };
        if (appendedBytesInfo && !appendedBytesInfo.endFragment) {
            eventBus.trigger(Events.BYTES_APPENDED, dataEvent);
        } else if (appendedBytesInfo) {
            eventBus.trigger(Events.BYTES_APPENDED_END_FRAGMENT, dataEvent);
        }
    }

    function onQualityChanged(e) {
        if (requiredQuality === e.newQuality || type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        updateBufferTimestampOffset(streamProcessor.getRepresentationInfo(e.newQuality).MSETimeOffset);
        requiredQuality = e.newQuality;
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function onPlaybackSeeking(/*e*/) {
        if (isBufferingCompleted) {
            seekClearedBufferingCompleted = true;
            isBufferingCompleted = false;
            //a seek command has occured, reset lastIndex value, it will be set next time that onStreamCompleted will be called.
            lastIndex = Number.POSITIVE_INFINITY;
        }
        if (type !== Constants.FRAGMENTED_TEXT) {
            // remove buffer after seeking operations
            pruneAllSafely();
        } else {
            onPlaybackProgression();
        }
    }

    function onPlaybackSeeked() {
        seekStartTime = undefined;
    }

    // Prune full buffer but what is around current time position
    function pruneAllSafely() {
        buffer.waitForUpdateEnd(() => {
            const ranges = getAllRangesWithSafetyFactor();
            if (!ranges || ranges.length === 0) {
                onPlaybackProgression();
            }
            clearBuffers(ranges);
        });
    }

    // Get all buffer ranges but a range around current time position
    function getAllRangesWithSafetyFactor() {
        const clearRanges = [];
        const ranges = buffer.getAllBufferRanges();
        if (!ranges || ranges.length === 0) {
            return clearRanges;
        }

        const currentTime = playbackController.getTime();
        const endOfBuffer = ranges.end(ranges.length - 1) + BUFFER_END_THRESHOLD;

        const currentTimeRequest = streamProcessor.getFragmentModel().getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: currentTime,
            threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
        })[0];

        // There is no request in current time position yet. Let's remove everything
        if (!currentTimeRequest) {
            logger.debug('getAllRangesWithSafetyFactor - No request found in current time position, removing full buffer 0 -', endOfBuffer);
            clearRanges.push({
                start: 0,
                end: endOfBuffer
            });
        } else {
            // Build buffer behind range. To avoid pruning time around current time position,
            // we include fragment right behind the one in current time position
            const behindRange = {
                start: 0,
                end: currentTimeRequest.startTime - STALL_THRESHOLD
            };
            const prevReq = streamProcessor.getFragmentModel().getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: currentTimeRequest.startTime - (currentTimeRequest.duration / 2),
                threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
            })[0];
            if (prevReq && prevReq.startTime != currentTimeRequest.startTime) {
                behindRange.end = prevReq.startTime;
            }
            if (behindRange.start < behindRange.end && behindRange.end > ranges.start(0)) {
                clearRanges.push(behindRange);
            }

            // Build buffer ahead range. To avoid pruning time around current time position,
            // we include fragment right after the one in current time position
            const aheadRange = {
                start: currentTimeRequest.startTime + currentTimeRequest.duration + STALL_THRESHOLD,
                end: endOfBuffer
            };
            const nextReq = streamProcessor.getFragmentModel().getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: currentTimeRequest.startTime + currentTimeRequest.duration + STALL_THRESHOLD,
                threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
            })[0];
            if (nextReq && nextReq.startTime !== currentTimeRequest.startTime) {
                aheadRange.start = nextReq.startTime + nextReq.duration + STALL_THRESHOLD;
            }
            if (aheadRange.start < aheadRange.end && aheadRange.start < endOfBuffer) {
                clearRanges.push(aheadRange);
            }
        }

        return clearRanges;
    }

    function getWorkingTime() {
        // This function returns current working time for buffer (either start time or current time if playback has started)
        let ret = playbackController.getTime();

        if (seekStartTime) {
            // if there is a seek start time, the first buffer data will be available on maximum value between first buffer range value and seek start time.
            let ranges = buffer.getAllBufferRanges();
            if (ranges && ranges.length) {
                ret = Math.max(ranges.start(0), seekStartTime);
            }
        }
        return ret;
    }

    function onPlaybackProgression() {
        if (!bufferResetInProgress || (type === Constants.FRAGMENTED_TEXT && textController.isTextEnabled())) {
            updateBufferLevel();
            addBufferMetrics();
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

        const toler = (tolerance || 0.15);

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

        range = getRangeAt(time, tolerance);

        if (range === null) {
            length = 0;
        } else {
            length = range.end - time;
        }

        return length;
    }

    function updateBufferLevel() {
        if (playbackController) {
            bufferLevel = getBufferLength(getWorkingTime() || 0);
            eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, { sender: instance, bufferLevel: bufferLevel });
            checkIfSufficientBuffer();
        }
    }

    function addBufferMetrics() {
        if (!isActive()) return;
        dashMetrics.addBufferState(type, bufferState, streamProcessor.getScheduleController().getBufferTarget());
        dashMetrics.addBufferLevel(type, new Date(), bufferLevel * 1000);
    }

    function checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex >= lastIndex - 1; // Handles 0 and non 0 based request index
        if (isLastIdxAppended && !isBufferingCompleted && buffer.discharge === undefined) {
            isBufferingCompleted = true;
            logger.debug('checkIfBufferingCompleted trigger BUFFERING_COMPLETED');
            eventBus.trigger(Events.BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }
    }

    function checkIfSufficientBuffer() {
        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== 'audio' && type !== 'video') return;

        if (seekClearedBufferingCompleted && !isBufferingCompleted && bufferLevel > 0 && playbackController && playbackController.getTimeToStreamEnd() - bufferLevel < STALL_THRESHOLD) {
            seekClearedBufferingCompleted = false;
            isBufferingCompleted = true;
            logger.debug('checkIfSufficientBuffer trigger BUFFERING_COMPLETED');
            eventBus.trigger(Events.BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }

        // When the player is working in low latency mode, the buffer is often below STALL_THRESHOLD.
        // So, when in low latency mode, change dash.js behavior so it notifies a stall just when
        // buffer reach 0 seconds
        if (((!settings.get().streaming.lowLatencyEnabled && bufferLevel < STALL_THRESHOLD) || bufferLevel === 0) && !isBufferingCompleted) {
            notifyBufferStateChanged(MetricsConstants.BUFFER_EMPTY);
        } else {
            if (isBufferingCompleted || bufferLevel >= streamProcessor.getStreamInfo().manifestInfo.minBufferTime) {
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
        addBufferMetrics();

        eventBus.trigger(Events.BUFFER_LEVEL_STATE_CHANGED, { sender: instance, state: state, mediaType: type, streamInfo: streamProcessor.getStreamInfo() });
        eventBus.trigger(state === MetricsConstants.BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY, { mediaType: type });
        logger.debug(state === MetricsConstants.BUFFER_LOADED ? 'Got enough buffer to start' : 'Waiting for more buffer before starting playback');
    }

    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
        const fragmentStartTime = Math.max(!request || isNaN(request.startTime) ? 0 : request.startTime, 0);
        const eventStreams = [];
        const events = [];

        /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
        const inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (let i = 0, ln = inbandEvents.length; i < ln; i++) {
            eventStreams[inbandEvents[i].schemeIdUri + '/' + inbandEvents[i].value] = inbandEvents[i];
        }

        const isoFile = BoxParser(context).getInstance().parse(data);
        const eventBoxes = isoFile.getBoxes('emsg');

        for (let i = 0, ln = eventBoxes.length; i < ln; i++) {
            const event = adapter.getEvent(eventBoxes[i], eventStreams, fragmentStartTime);

            if (event) {
                events.push(event);
            }
        }

        return events;
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
        const rangeToKeep = {
            start: Math.max(0, currentTime - settings.get().streaming.bufferToKeep),
            end: currentTime + settings.get().streaming.bufferAheadToKeep
        };

        const currentTimeRequest = streamProcessor.getFragmentModel().getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: currentTime,
            threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
        })[0];

        // Ensure we keep full range of current fragment
        if (currentTimeRequest) {
            rangeToKeep.start = Math.min(currentTimeRequest.startTime, rangeToKeep.start);
            rangeToKeep.end = Math.max(currentTimeRequest.startTime + currentTimeRequest.duration, rangeToKeep.end);
        } else if (currentTime === 0 && playbackController.getIsDynamic()) {
            // Don't prune before the live stream starts, it messes with low latency
            return [];
        }

        if (ranges.start(0) <= rangeToKeep.start) {
            const behindRange = {
                start: 0,
                end: rangeToKeep.start
            };
            for (let i = 0; i < ranges.length && ranges.end(i) <= rangeToKeep.start; i++) {
                behindRange.end = ranges.end(i);
            }
            if (behindRange.start < behindRange.end) {
                clearRanges.push(behindRange);
            }
        }

        if (ranges.end(ranges.length - 1) >= rangeToKeep.end) {
            const aheadRange = {
                start: rangeToKeep.end,
                end: ranges.end(ranges.length - 1) + BUFFER_RANGE_CALCULATION_THRESHOLD
            };

            if (aheadRange.start < aheadRange.end) {
                clearRanges.push(aheadRange);
            }
        }

        return clearRanges;
    }

    function clearBuffers(ranges) {
        if (!ranges || !buffer || ranges.length === 0) return;

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
            isPruningInProgress = false;
            return;
        }

        const sourceBuffer = buffer.getBuffer();
        // If there's nothing buffered any pruning is invalid, so reset our state
        if (!sourceBuffer || !sourceBuffer.buffered || sourceBuffer.buffered.length === 0) {
            logger.debug('SourceBuffer is empty (or does not exist), halt pruning');
            pendingPruningRanges = [];
            isPruningInProgress = false;
            return;
        }

        const range = pendingPruningRanges.shift();
        logger.debug('Removing buffer from:', range.start, 'to', range.end);
        isPruningInProgress = true;

        // If removing buffer ahead current playback position, update maxAppendedIndex
        const currentTime = playbackController.getTime();
        if (currentTime < range.end) {
            isBufferingCompleted = false;
            maxAppendedIndex = 0;
            if (!bufferResetInProgress) {
                streamProcessor.getScheduleController().setSeekTarget(currentTime);
                streamProcessor.setIndexHandlerTime(currentTime);
            }
        }

        buffer.remove(range.start, range.end, range.force);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        logger.debug('onRemoved buffer from:', e.from, 'to', e.to);

        const ranges = buffer.getAllBufferRanges();
        showBufferRanges(ranges);

        if (pendingPruningRanges.length === 0) {
            isPruningInProgress = false;
        }

        if (e.unintended) {
            logger.warn('Detected unintended removal from:', e.from, 'to', e.to, 'setting index handler time to', e.from);
            streamProcessor.setIndexHandlerTime(e.from);
        }

        if (isPruningInProgress) {
            clearNextRange();
        } else {
            if (!bufferResetInProgress) {
                logger.debug('onRemoved : call updateBufferLevel');
                updateBufferLevel();
            } else {
                bufferResetInProgress = false;
                if (mediaChunk) {
                    appendToBuffer(mediaChunk);
                }
            }
            eventBus.trigger(Events.BUFFER_CLEARED, { sender: instance, from: e.from, to: e.to, unintended: e.unintended,  hasEnoughSpaceToAppend: hasEnoughSpaceToAppend() });
        }
        //TODO - REMEMBER removed a timerout hack calling clearBuffer after manifestInfo.minBufferTime * 1000 if !hasEnoughSpaceToAppend() Aug 04 2016
    }

    function updateBufferTimestampOffset(MSETimeOffset) {
        // Each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.updateTimestampOffset) {
            buffer.updateTimestampOffset(MSETimeOffset);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getType() !== streamProcessor.getType() || e.sender.getStreamId() !== streamProcessor.getStreamInfo().id || e.error) return;
        updateBufferTimestampOffset(e.currentRepresentation.MSETimeOffset);
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        lastIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onCurrentTrackChanged(e) {
        const ranges = buffer && buffer.getAllBufferRanges();
        if (!ranges || (e.newMediaInfo.type !== type) || (e.newMediaInfo.streamInfo.id !== streamProcessor.getStreamInfo().id)) return;

        logger.info('Track change asked');
        if (mediaController.getSwitchMode(type) === MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE) {
            if (ranges && ranges.length > 0 && playbackController.getTimeToStreamEnd() > STALL_THRESHOLD) {
                isBufferingCompleted = false;
                lastIndex = Number.POSITIVE_INFINITY;
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

    function getType() {
        return type;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function setSeekStartTime(value) {
        seekStartTime = value;
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

    function setMediaSource(value, mediaInfo) {
        mediaSource = value;
        if (buffer && mediaInfo) { //if we have a prebuffer, we should prepare to discharge it, and make a new sourceBuffer ready
            if (typeof buffer.discharge === 'function') {
                dischargeBuffer = buffer;
                createBuffer(mediaInfo);
            }
        }
    }

    function getMediaSource() {
        return mediaSource;
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

    function hasEnoughSpaceToAppend() {
        const totalBufferedTime = getTotalBufferedTime();
        return (totalBufferedTime < criticalBufferLevel);
    }

    function resetInitialSettings(errored, keepBuffers) {
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = undefined;
        requiredQuality = AbrController.QUALITY_DEFAULT;
        lastIndex = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        isBufferingCompleted = false;
        isPruningInProgress = false;
        seekClearedBufferingCompleted = false;
        bufferLevel = 0;
        wallclockTicked = 0;
        pendingPruningRanges = [];

        if (buffer) {
            if (!errored) {
                buffer.abort();
            }
            buffer.reset(keepBuffers);
            buffer = null;
        }

        bufferResetInProgress = false;
    }

    function reset(errored, keepBuffers) {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.off(Events.PLAYBACK_PLAYING, onPlaybackPlaying, this);
        eventBus.off(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.PLAYBACK_SEEKED, onPlaybackSeeked, this);
        eventBus.off(Events.PLAYBACK_STALLED, onPlaybackStalled, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);

        resetInitialSettings(errored, keepBuffers);
    }

    instance = {
        getBufferControllerType: getBufferControllerType,
        initialize: initialize,
        createBuffer: createBuffer,
        dischargePreBuffer: dischargePreBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setSeekStartTime: setSeekStartTime,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
        getRangeAt: getRangeAt,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        switchInitData: switchInitData,
        getIsPruningInProgress: getIsPruningInProgress,
        reset: reset
    };

    setup();
    return instance;
}

BufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(BufferController);
