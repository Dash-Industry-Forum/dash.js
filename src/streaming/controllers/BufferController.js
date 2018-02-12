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
import FragmentModel from '../models/FragmentModel';
import SourceBufferController from './SourceBufferController';
import AbrController from './AbrController';
import MediaController from './MediaController';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import BoxParser from '../utils/BoxParser';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';

const BUFFER_LOADED = 'bufferLoaded';
const BUFFER_EMPTY = 'bufferStalled';
const STALL_THRESHOLD = 0.5;
const BUFFER_END_THRESHOLD = 0.5;
const BUFFER_RANGE_CALCULATION_THRESHOLD = 0.01;

const BUFFER_CONTROLLER_TYPE = 'BufferController';

function BufferController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const metricsModel = config.metricsModel;
    const mediaPlayerModel = config.mediaPlayerModel;
    const sourceBufferController = config.sourceBufferController;
    const errHandler = config.errHandler;
    const streamController = config.streamController;
    const mediaController = config.mediaController;
    const adapter = config.adapter;
    const textController = config.textController;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const type = config.type;
    const streamProcessor = config.streamProcessor;

    let instance,
        log,
        requiredQuality,
        isBufferingCompleted,
        bufferLevel,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        lastIndex,
        buffer,
        bufferState,
        appendedBytesInfo,
        wallclockTicked,
        appendingMediaChunk,
        isAppendingInProgress,
        isPruningInProgress,
        initCache,
        seekStartTime,
        seekClearedBufferingCompleted,
        pendingPruningRanges;

    function setup() {
        log = Debug(context).getInstance().log.bind(instance);
        initCache = InitCache(context).getInstance();

        resetInitialSettings();
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(Source) {
        setMediaSource(Source);

        requiredQuality = abrController.getQualityFor(type, streamProcessor.getStreamInfo());

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this, EventBus.EVENT_PRIORITY_HIGH);
        eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
    }

    function createBuffer(mediaInfo) {
        if (!mediaInfo || !mediaSource || !streamProcessor) return null;

        let sourceBuffer = null;

        try {
            sourceBuffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);

            if (sourceBuffer && sourceBuffer.hasOwnProperty(Constants.INITIALIZE)) {
                sourceBuffer.initialize(type, streamProcessor);
            }
        } catch (e) {
            errHandler.mediaSourceError('Error creating ' + type + ' source buffer.');
        }
        setBuffer(sourceBuffer);
        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(requiredQuality).MSETimeOffset);
        return sourceBuffer;
    }

    function isActive() {
        return streamProcessor && streamController ? streamProcessor.getStreamInfo().id === streamController.getActiveStreamInfo().id : false;
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        log('Init fragment finished loading saving to', type + '\'s init cache');
        initCache.save(e.chunk);
        log('Append Init fragment', type, ' with representationId:', e.chunk.representationId, ' and quality:', e.chunk.quality);
        appendToBuffer(e.chunk);
    }

    function switchInitData(streamId, representationId) {
        const chunk = initCache.extract(streamId, representationId);
        if (chunk) {
            log('Append Init fragment', type, ' with representationId:', chunk.representationId, ' and quality:', chunk.quality);
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
        const currentRepresentation = streamProcessor.getRepresentationInfoForQuality(quality);
        const eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo, streamProcessor);
        const eventStreamTrack = adapter.getEventsFor(currentRepresentation, streamProcessor);

        if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
            const request = streamProcessor.getFragmentModel().getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                quality: quality,
                index: chunk.index
            })[0];

            const events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            streamProcessor.getEventController().addInbandEvents(events);
        }

        appendToBuffer(chunk);
    }


    function appendToBuffer(chunk) {
        isAppendingInProgress = true;
        appendedBytesInfo = chunk;
        sourceBufferController.append(buffer, chunk);

        if (chunk.mediaInfo.type === Constants.VIDEO) {
            eventBus.trigger(Events.VIDEO_CHUNK_RECEIVED, { chunk: chunk });
        }
    }

    function showBufferRanges(ranges) {
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                log('Buffered Range for type:', type, ':', ranges.start(i), ' - ', ranges.end(i));
            }
        }
    }

    function onAppended(e) {
        if (buffer === e.buffer) {
            if (e.error) {
                if (e.error.code === SourceBufferController.QUOTA_EXCEEDED_ERROR_CODE) {
                    criticalBufferLevel = sourceBufferController.getTotalBufferedTime(buffer) * 0.8;
                    log('Quota exceeded for type: ' + type + ', Critical Buffer: ' + criticalBufferLevel);

                    if (criticalBufferLevel > 0) {
                        // recalculate buffer lengths to keep (bufferToKeep, bufferAheadToKeep, bufferTimeAtTopQuality) according to criticalBufferLevel
                        const bufferToKeep = Math.max(0.2 * criticalBufferLevel, 1);
                        const bufferAhead = criticalBufferLevel - bufferToKeep;
                        mediaPlayerModel.setBufferToKeep(parseFloat(bufferToKeep).toFixed(5));
                        mediaPlayerModel.setBufferAheadToKeep(parseFloat(bufferAhead).toFixed(5));
                    }
                }
                if (e.error.code === SourceBufferController.QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                    log('Clearing playback buffer to overcome quota exceed situation for type: ' + type);
                    eventBus.trigger(Events.QUOTA_EXCEEDED, { sender: instance, criticalBufferLevel: criticalBufferLevel }); //Tells ScheduleController to stop scheduling.
                    pruneAllSafely(); // Then we clear the buffer and onCleared event will tell ScheduleController to start scheduling again.
                }
                return;
            }

            if (appendedBytesInfo && !isNaN(appendedBytesInfo.index)) {
                maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
                checkIfBufferingCompleted();
            }

            const ranges = sourceBufferController.getAllRanges(buffer);
            showBufferRanges(ranges);

            onPlaybackProgression();
            isAppendingInProgress = false;
            if (appendedBytesInfo) {
                eventBus.trigger(Events.BYTES_APPENDED, {
                    sender: instance,
                    quality: appendedBytesInfo.quality,
                    startTime: appendedBytesInfo.start,
                    index: appendedBytesInfo.index,
                    bufferedRanges: ranges
                });
            }
        }
    }

    function onQualityChanged(e) {
        if (requiredQuality === e.newQuality || type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(e.newQuality).MSETimeOffset);
        requiredQuality = e.newQuality;
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function onPlaybackSeeking() {
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
        seekStartTime = undefined;
    }

    // Prune full buffer but what is around current time position
    function pruneAllSafely() {
        const ranges = getAllRangesWithSafetyFactor();
        if (!ranges || ranges.length === 0) {
            onPlaybackProgression();
        }
        clearBuffers(ranges);
    }

    // Get all buffer ranges but a range around current time position
    function getAllRangesWithSafetyFactor() {
        const clearRanges = [];
        if (!buffer || !buffer.buffered || buffer.buffered.length === 0) {
            return clearRanges;
        }

        const currentTime = playbackController.getTime();
        const endOfBuffer = buffer.buffered.end(buffer.buffered.length - 1) + BUFFER_END_THRESHOLD;

        const currentTimeRequest = streamProcessor.getFragmentModel().getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: currentTime,
            threshold: BUFFER_RANGE_CALCULATION_THRESHOLD
        })[0];

        // There is no request in current time position yet. Let's remove everything
        if (!currentTimeRequest) {
            log('getAllRangesWithSafetyFactor for', type, '- No request found in current time position, removing full buffer 0 -', endOfBuffer);
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
            if (behindRange.start < behindRange.end && behindRange.end > buffer.buffered.start(0)) {
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
            const ranges = sourceBufferController.getAllRanges(buffer);
            if (ranges && ranges.length) {
                ret = Math.max(ranges.start(0), seekStartTime);
            }
        }
        return ret;
    }

    function onPlaybackProgression() {
        updateBufferLevel();
        addBufferMetrics();
    }

    function updateBufferLevel() {
        if (playbackController) {
            bufferLevel = sourceBufferController.getBufferLength(buffer, getWorkingTime());
            eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, { sender: instance, bufferLevel: bufferLevel });
            checkIfSufficientBuffer();
        }
    }

    function addBufferMetrics() {
        if (!isActive()) return;
        metricsModel.addBufferState(type, bufferState, streamProcessor.getScheduleController().getBufferTarget());
        metricsModel.addBufferLevel(type, new Date(), bufferLevel * 1000);
    }

    function checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex >= lastIndex - 1; // Handles 0 and non 0 based request index
        if (isLastIdxAppended && !isBufferingCompleted) {
            isBufferingCompleted = true;
            log('[BufferController][' + type + '] checkIfBufferingCompleted trigger BUFFERING_COMPLETED');
            eventBus.trigger(Events.BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }
    }

    function checkIfSufficientBuffer() {
        // No need to check buffer if type is not audio or video (for example if several errors occur during text parsing, so that the buffer cannot be filled, no error must occur on video playback)
        if (type !== 'audio' && type !== 'video') return;

        if (seekClearedBufferingCompleted && !isBufferingCompleted && playbackController && playbackController.getTimeToStreamEnd() - bufferLevel < STALL_THRESHOLD) {
            seekClearedBufferingCompleted = false;
            isBufferingCompleted = true;
            log('[BufferController][' + type + '] checkIfSufficientBuffer trigger BUFFERING_COMPLETED');
            eventBus.trigger(Events.BUFFERING_COMPLETED, { sender: instance, streamInfo: streamProcessor.getStreamInfo() });
        }

        if (bufferLevel < STALL_THRESHOLD && !isBufferingCompleted) {
            notifyBufferStateChanged(BUFFER_EMPTY);
        } else {
            if (isBufferingCompleted || bufferLevel >= mediaPlayerModel.getStableBufferTime()) {
                notifyBufferStateChanged(BUFFER_LOADED);
            }
        }
    }

    function notifyBufferStateChanged(state) {
        if (bufferState === state || (type === Constants.FRAGMENTED_TEXT && textController.getAllTracksAreDisabled())) return;
        bufferState = state;
        addBufferMetrics();

        eventBus.trigger(Events.BUFFER_LEVEL_STATE_CHANGED, { sender: instance, state: state, mediaType: type, streamInfo: streamProcessor.getStreamInfo() });
        eventBus.trigger(state === BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY, { mediaType: type });
        log(state === BUFFER_LOADED ? 'Got enough buffer to start for ' + type : 'Waiting for more buffer before starting playback for ' + type);
    }


    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
        const fragmentStartTime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0);
        const eventStreams = [];
        const events = [];

        /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
        const inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (let i = 0, ln = inbandEvents.length; i < ln; i++) {
            eventStreams[inbandEvents[i].schemeIdUri] = inbandEvents[i];
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

    function hasEnoughSpaceToAppend() {
        const totalBufferedTime = sourceBufferController.getTotalBufferedTime(buffer);
        return (totalBufferedTime < criticalBufferLevel);
    }

    /* prune buffer on our own in background to avoid browsers pruning buffer silently */
    function pruneBuffer() {
        if (!buffer) return;
        if (type === Constants.FRAGMENTED_TEXT) return;
        if (!isBufferingCompleted) {
            clearBuffers(getClearRanges());
        }
    }

    function getClearRanges() {
        const clearRanges = [];

        if (!buffer || !buffer.buffered || buffer.buffered.length === 0) {
            return clearRanges;
        }

        const currentTime = playbackController.getTime();
        const ranges = buffer.buffered;
        const rangeToKeep = {
            start: Math.max(0, currentTime - mediaPlayerModel.getBufferToKeep()),
            end: currentTime + mediaPlayerModel.getBufferAheadToKeep()
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
        }

        log('getClearRanges for', type, '- Remove buffer out of ', rangeToKeep.start, ' - ', rangeToKeep.end);

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
        if (pendingPruningRanges.length === 0) return;

        const range = pendingPruningRanges.shift();
        log('Removing', type, 'buffer from:', range.start, 'to', range.end);
        isPruningInProgress = true;

        // If removing buffer ahead current playback position, update maxAppendedIndex
        const currentTime = playbackController.getTime();
        if (currentTime < range.end) {
            isBufferingCompleted = false;
            maxAppendedIndex = 0;
            streamProcessor.getScheduleController().setSeekTarget(currentTime);
            adapter.setIndexHandlerTime(streamProcessor, currentTime);
        }
        sourceBufferController.remove(buffer, range.start, range.end, mediaSource);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        log('Removed', type, 'buffer from:', e.from, 'to', e.to);

        const ranges = sourceBufferController.getAllRanges(buffer);
        showBufferRanges(ranges);

        if (pendingPruningRanges.length === 0) {
            isPruningInProgress = false;
        }

        if (isPruningInProgress) {
            clearNextRange();
        } else {
            updateBufferLevel();
            eventBus.trigger(Events.BUFFER_CLEARED, { sender: instance, from: e.from, to: e.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend() });
        }
        //TODO - REMEMBER removed a timerout hack calling clearBuffer after manifestInfo.minBufferTime * 1000 if !hasEnoughSpaceToAppend() Aug 04 2016
    }

    function updateBufferTimestampOffset(MSETimeOffset) {
        // Each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
            buffer.timestampOffset = MSETimeOffset;
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor || e.error) return;
        updateBufferTimestampOffset(e.currentRepresentation.MSETimeOffset);
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        lastIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onCurrentTrackChanged(e) {
        if (!buffer || (e.newMediaInfo.type !== type) || (e.newMediaInfo.streamInfo.id !== streamProcessor.getStreamInfo().id)) return;
        if (mediaController.getSwitchMode(type) === MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE) {
            if (buffer.buffered && buffer.buffered.length > 0) {
                log('Clearing buffer because track changed - ' + (buffer.buffered.end(buffer.buffered.length - 1) + BUFFER_END_THRESHOLD));
                clearBuffers([{
                    start: 0,
                    end: buffer.buffered.end(buffer.buffered.length - 1) + BUFFER_END_THRESHOLD
                }]);
                lastIndex = Number.POSITIVE_INFINITY;
                streamProcessor.getFragmentModel().abortRequests();
            }
        }
    }

    function onWallclockTimeUpdated() {
        wallclockTicked++;
        const secondsElapsed = (wallclockTicked * (mediaPlayerModel.getWallclockTimeUpdateInterval() / 1000));
        if ((secondsElapsed >= mediaPlayerModel.getBufferPruningInterval()) && !isAppendingInProgress) {
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

    function setBuffer(value) {
        buffer = value;
    }

    function getBufferLevel() {
        return bufferLevel;
    }

    function setMediaSource(value) {
        mediaSource = value;
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

    function resetInitialSettings() {
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = BUFFER_EMPTY;
        requiredQuality = AbrController.QUALITY_DEFAULT;
        lastIndex = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        appendingMediaChunk = false;
        isBufferingCompleted = false;
        isAppendingInProgress = false;
        isPruningInProgress = false;
        seekClearedBufferingCompleted = false;
        bufferLevel = 0;
        wallclockTicked = 0;
        pendingPruningRanges = [];
    }

    function reset(errored) {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, this);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.off(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.off(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.off(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.off(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);

        resetInitialSettings();

        if (!errored) {
            sourceBufferController.abort(mediaSource, buffer);
            sourceBufferController.removeSourceBuffer(mediaSource, buffer);
        }

        buffer = null;
    }

    instance = {
        getBufferControllerType: getBufferControllerType,
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setSeekStartTime: setSeekStartTime,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
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
const factory = FactoryMaker.getClassFactory(BufferController);
factory.BUFFER_LOADED = BUFFER_LOADED;
factory.BUFFER_EMPTY = BUFFER_EMPTY;
FactoryMaker.updateClassFactory(BufferController.__dashjs_factory_name, factory);
export default factory;
