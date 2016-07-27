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

import FragmentModel from '../models/FragmentModel';
import MediaPlayerModel from '../models/MediaPlayerModel';
//import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import SourceBufferController from './SourceBufferController';
import AbrController from './AbrController';
import PlaybackController from './PlaybackController';
import MediaController from './MediaController';
//import CustomTimeRanges from '../utils/CustomTimeRanges';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import BoxParser from '../utils/BoxParser';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';

const BUFFER_LOADED = 'bufferLoaded';
const BUFFER_EMPTY = 'bufferStalled';
const STALL_THRESHOLD = 0.5;

function BufferController(config) {

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();
    const metricsModel = config.metricsModel;
    const manifestModel = config.manifestModel;
    const sourceBufferController = config.sourceBufferController;
    const errHandler = config.errHandler;
    const mediaSourceController = config.mediaSourceController;
    const streamController = config.streamController;
    const mediaController = config.mediaController;
    const adapter = config.adapter;
    const textSourceBuffer = config.textSourceBuffer;


    let instance,
        requiredQuality,
        isBufferingCompleted,
        bufferLevel,
        bufferTarget,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        lastIndex,
        type,
        buffer,
        bufferState,
        appendedBytesInfo,
        wallclockTicked,
        appendingMediaChunk,
        isAppendingInProgress,
        isPruningInProgress,
        inbandEventFound,
        playbackController,
        streamProcessor,
        abrController,
        fragmentController,
        scheduleController,
        mediaPlayerModel,
        clearBufferTimeout,
        initCache;

    function setup() {
        requiredQuality = AbrController.QUALITY_DEFAULT;
        isBufferingCompleted = false;
        bufferLevel = 0;
        bufferTarget = 0;
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        maxAppendedIndex = 0;
        lastIndex = 0;
        buffer = null;
        bufferState = BUFFER_EMPTY;
        wallclockTicked = 0;
        appendingMediaChunk = false;
        isAppendingInProgress = false;
        isPruningInProgress = false;
        inbandEventFound = false;
        clearBufferTimeout = null;
    }

    function initialize(Type, Source, StreamProcessor) {
        type = Type;
        setMediaSource(Source);
        streamProcessor = StreamProcessor;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        abrController = AbrController(context).getInstance();
        initCache = InitCache(context).getInstance();
        fragmentController = streamProcessor.getFragmentController();
        scheduleController = streamProcessor.getScheduleController();
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
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this, 0);
        eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
    }

    function createBuffer(mediaInfo) {
        if (!mediaInfo || !mediaSource || !streamProcessor) return null;

        var sourceBuffer = null;

        try {
            sourceBuffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);

            if (sourceBuffer && sourceBuffer.hasOwnProperty('initialize')) {
                sourceBuffer.initialize(type, this);
            }
        } catch (e) {
            errHandler.mediaSourceError('Error creating ' + type + ' source buffer.');
        }

        setBuffer(sourceBuffer);
        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(requiredQuality).MSETimeOffset);

        return sourceBuffer;
    }

    function isActive() {
        return streamProcessor.getStreamInfo().id === streamController.getActiveStreamInfo().id;
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        log('Initialization finished loading adding to the init cache');
        initCache.save(e.chunk);
        appendToBuffer(e.chunk);
    }

    function switchInitData(streamId, quality) {
        const chunk = initCache.extract(streamId, type, quality);
        if (chunk) {
            appendToBuffer(chunk);
        } else {
            eventBus.trigger(Events.INIT_REQUESTED, {sender: instance});
        }
    }

    function onMediaFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;

        const chunk = e.chunk;
        const bytes = chunk.bytes;
        const quality = chunk.quality;
        const currentRepresentation = streamProcessor.getRepresentationInfoForQuality(quality);
        const manifest = manifestModel.getValue();
        const eventStreamMedia = adapter.getEventsFor(manifest, currentRepresentation.mediaInfo, streamProcessor);
        const eventStreamTrack = adapter.getEventsFor(manifest, currentRepresentation, streamProcessor);

        if (eventStreamMedia.length > 0 || eventStreamTrack.length > 0) {
            const request = streamProcessor.getFragmentModel().getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                quality: quality,
                index: chunk.index
            })[0];
            const events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            streamProcessor.getEventController().addInbandEvents(events);
        }

        chunk.bytes = deleteInbandEvents(bytes);
        appendToBuffer(chunk);

    }


    function appendToBuffer(chunk) {
        isAppendingInProgress = true;
        appendedBytesInfo = chunk;
        sourceBufferController.append(buffer, chunk);

        if (chunk.mediaInfo.type === 'video') {
            if (chunk.mediaInfo.embeddedCaptions) {
                textSourceBuffer.append(chunk.bytes, chunk);
            }
        }
    }

    function onAppended(e) {
        if (buffer !== e.buffer) return;

        isAppendingInProgress = false;
        onPlaybackProgression();

        if (e.error || !hasEnoughSpaceToAppend()) {
            if (e.error.code === SourceBufferController.QUOTA_EXCEEDED_ERROR_CODE) {
                criticalBufferLevel = sourceBufferController.getTotalBufferedTime(buffer) * 0.8;
            }
            if (e.error.code === SourceBufferController.QUOTA_EXCEEDED_ERROR_CODE || !hasEnoughSpaceToAppend()) {
                eventBus.trigger(Events.QUOTA_EXCEEDED, {sender: instance, criticalBufferLevel: criticalBufferLevel}); //Tells ScheduleController to stop scheduling.
                clearBuffer(getClearRange()); // Then we clear the buffer and onCleared event will tell ScheduleController to start scheduling again.
            }
            return;
        }

        if (!isNaN(appendedBytesInfo.index)) {
            maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
            checkIfBufferingCompleted();
        }

        const ranges = sourceBufferController.getAllRanges(buffer);
        if (ranges && ranges.length > 0) {
            for (let i = 0, len = ranges.length; i < len; i++) {
                log('Buffered Range: ' + ranges.start(i) + ' - ' + ranges.end(i));
            }
        }

        eventBus.trigger(Events.BYTES_APPENDED, {
            sender: instance,
            quality: appendedBytesInfo.quality,
            startTime: appendedBytesInfo.start,
            index: appendedBytesInfo.index,
            bufferedRanges: ranges
        });
    }

    function onQualityChanged(e) {
        var newQuality = e.newQuality;
        if (requiredQuality === newQuality || type !== e.mediaType || streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

        updateBufferTimestampOffset(streamProcessor.getRepresentationInfoForQuality(newQuality).MSETimeOffset);
        requiredQuality = newQuality;
    }

    //**********************************************************************
    // START Buffer Level, State & Sufficiency Handling.
    //**********************************************************************
    function onPlaybackSeeking() {
        onPlaybackProgression();
    }

    function onPlaybackProgression() {
        updateBufferLevel();
        addBufferMetrics();
    }

    function updateBufferLevel() {
        var currentTime = playbackController.getTime();

        bufferLevel = sourceBufferController.getBufferLength(buffer, currentTime);
        eventBus.trigger(Events.BUFFER_LEVEL_UPDATED, {sender: instance, bufferLevel: bufferLevel});
        checkIfSufficientBuffer();
    }

    function addBufferMetrics() {
        if (!isActive()) return;
        //TODO will need to fix how we get bufferTarget... since we ony load one at a time. but do it in the addBufferMetrics call not here
        //bufferTarget = fragmentsToLoad > 0 ? (fragmentsToLoad * fragmentDuration) + bufferLevel : bufferTarget;
        metricsModel.addBufferState(type, bufferState, bufferTarget);
        metricsModel.addBufferLevel(type, new Date(), bufferLevel * 1000);
    }

    function checkIfBufferingCompleted() {
        const isLastIdxAppended = maxAppendedIndex === (lastIndex - 1);
        if (isLastIdxAppended && !isBufferingCompleted) {
            isBufferingCompleted = true;
            mediaSourceController.signalEndOfStream(mediaSource);
            eventBus.trigger(Events.BUFFERING_COMPLETED, {sender: instance, streamInfo: streamProcessor.getStreamInfo()});
        }
    }

    function checkIfSufficientBuffer() {
        if (bufferLevel < STALL_THRESHOLD && !isBufferingCompleted) {
            notifyBufferStateChanged(BUFFER_EMPTY);
        } else {
            notifyBufferStateChanged(BUFFER_LOADED);
        }
    }

    function notifyBufferStateChanged(state) {
        if (bufferState === state || (type === 'fragmentedText' && textSourceBuffer.getAllTracksAreDisabled())) return;

        bufferState = state;
        addBufferMetrics();
        eventBus.trigger(Events.BUFFER_LEVEL_STATE_CHANGED, {sender: instance, state: state, mediaType: type, streamInfo: streamProcessor.getStreamInfo()});
        let eventType = state === BUFFER_LOADED ? Events.BUFFER_LOADED : Events.BUFFER_EMPTY;
        eventBus.trigger(eventType, {mediaType: type});
        log(state === BUFFER_LOADED ? ('Got enough buffer to start.') : ('Waiting for more buffer before starting playback.'));
    }


    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
        var fragmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime, 0);
        var eventStreams = [];
        var events = [];

        var eventBoxes,
            event,
            isoFile,
            inbandEvents;

        inbandEventFound = false;
        /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
        inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (var loop = 0; loop < inbandEvents.length; loop++) {
            eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
        }

        isoFile = BoxParser(context).getInstance().parse(data);
        eventBoxes = isoFile.getBoxes('emsg');

        for (var i = 0, ln = eventBoxes.length; i < ln; i++) {
            event = adapter.getEvent(eventBoxes[i], eventStreams, fragmentStarttime);

            if (event) {
                events.push(event);
            }
        }

        return events;
    }

    function deleteInbandEvents(data) {

        if (!inbandEventFound) {
            return data;
        }

        var length = data.length;
        var expTwo = Math.pow(256, 2);
        var expThree = Math.pow(256, 3);
        var modData = new Uint8Array(data.length);

        var identifier,
            size;
        var i = 0;
        var j = 0;

        while (i < length) {

            identifier = String.fromCharCode(data[i + 4],data[i + 5],data[i + 6],data[i + 7]);
            size = data[i] * expThree + data[i + 1] * expTwo + data[i + 2] * 256 + data[i + 3] * 1;

            if (identifier != 'emsg' ) {
                for (var l = i ; l < i + size; l++) {
                    modData[j] = data[l];
                    j++;
                }
            }
            i += size;

        }

        return modData.subarray(0,j);
    }

    function hasEnoughSpaceToAppend() {
        var totalBufferedTime = sourceBufferController.getTotalBufferedTime(buffer);
        return (totalBufferedTime < criticalBufferLevel);
    }

    /* prune buffer on our own in background to avoid browsers pruning buffer silently */
    function pruneBuffer() {
        if (type === 'fragmentedText') return;

        var start = buffer.buffered.length ? buffer.buffered.start(0) : 0;
        var currentTime = playbackController.getTime();
        // we want to get rid off buffer that is more than x seconds behind current time
        var bufferToPrune = currentTime - start - mediaPlayerModel.getBufferToKeep();

        if (bufferToPrune > 0) {
            log('pruning buffer: ' + bufferToPrune + ' seconds.');
            isPruningInProgress = true;
            sourceBufferController.remove(buffer, 0, Math.round(start + bufferToPrune), mediaSource);
        }
    }

    function getClearRange() {

        if (!buffer) return null;

        // we need to remove data that is more than one fragment before the video currentTime
        const currentTime = playbackController.getTime();
        const req = streamProcessor.getFragmentModel().getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, time: currentTime, })[0];
        const range = sourceBufferController.getBufferRange(buffer, currentTime);

        let removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);
        if ((range === null) && (buffer.buffered.length > 0)) {
            removeEnd = buffer.buffered.end(buffer.buffered.length - 1 );
        }

        return {start: buffer.buffered.start(0), end: removeEnd};
    }

    function clearBuffer(range) {
        if (!range || !buffer) return;
        sourceBufferController.remove(buffer, range.start, range.end, mediaSource);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        // After the buffer has been cleared we need to update the virtual range that reflects the actual ranges
        // of SourceBuffer. We also need to update the list of appended chunks
        if (isPruningInProgress) {
            isPruningInProgress = false;
        }

        updateBufferLevel();
        eventBus.trigger(Events.BUFFER_CLEARED, {sender: instance, from: e.from, to: e.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend()});
        if (hasEnoughSpaceToAppend()) return;

        if (clearBufferTimeout === null) {
            clearBufferTimeout = setTimeout(function () {
                clearBufferTimeout = null;
                clearBuffer(getClearRange());
            }, streamProcessor.getStreamInfo().manifestInfo.minBufferTime * 1000);
        }
    }

    function updateBufferTimestampOffset(MSETimeOffset) {
        // each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
            buffer.timestampOffset = MSETimeOffset;
        }
    }

    //function getStreamId() {
    //    return streamProcessor.getStreamInfo().id;
    //}

    function removeOldTrackData() {

        if (mediaController.getSwitchMode(type) === MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE) {
            clearBuffer(getClearRange());
        }

        const time = playbackController.getTime() + (streamProcessor.getCurrentRepresentationInfo().fragmentDuration * 2);
        const request = streamProcessor.getFragmentModel().getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, time: time})[0];
        if (request) {
            const range = {start: request.startTime, end: buffer.buffered.end(buffer.buffered.length - 1)};
            clearBuffer(range);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        if (e.error) return;

        updateBufferTimestampOffset(e.currentRepresentation.MSETimeOffset);
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        lastIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onCurrentTrackChanged(e) {
        if (!buffer || (e.newMediaInfo.type !== type) || (e.newMediaInfo.streamInfo.id !== streamProcessor.getStreamInfo().id)) return;
        removeOldTrackData();

    }

    function onWallclockTimeUpdated() {
        var secondsElapsed;
        //constantly prune buffer every x seconds
        wallclockTicked++;
        secondsElapsed = (wallclockTicked * (mediaPlayerModel.getWallclockTimeUpdateInterval() / 1000));
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

    function setStreamProcessor(value) {
        streamProcessor = value;
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

    function getCriticalBufferLevel() {
        return criticalBufferLevel;
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
        //eventBus.off(Events.CHUNK_APPENDED, onChunkAppended, this);

        clearTimeout(clearBufferTimeout);
        clearBufferTimeout = null;

        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = BUFFER_EMPTY;
        requiredQuality = AbrController.QUALITY_DEFAULT;
        lastIndex = 0;
        maxAppendedIndex = 0;
        appendedBytesInfo = null;
        appendingMediaChunk = false;
        isBufferingCompleted = false;
        isAppendingInProgress = false;
        isPruningInProgress = false;
        playbackController = null;
        streamProcessor = null;
        abrController = null;
        fragmentController = null;
        scheduleController = null;

        if (!errored) {
            sourceBufferController.abort(mediaSource, buffer);
            sourceBufferController.removeSourceBuffer(mediaSource, buffer);
        }

        buffer = null;
    }

    instance = {
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setStreamProcessor: setStreamProcessor,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
        getCriticalBufferLevel: getCriticalBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        switchInitData: switchInitData,
        reset: reset

    };

    setup();

    return instance;
}

BufferController.__dashjs_factory_name = 'BufferController';
let factory = FactoryMaker.getClassFactory(BufferController);
factory.BUFFER_LOADED = BUFFER_LOADED;
factory.BUFFER_EMPTY = BUFFER_EMPTY;
export default factory;
