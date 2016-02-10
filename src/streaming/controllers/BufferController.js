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

import FragmentModel from '../models/FragmentModel.js';
import MediaPlayerModel from '../models/MediaPlayerModel.js';
import HTTPRequest from '../vo/metrics/HTTPRequest.js';
import SourceBufferController from './SourceBufferController.js';
import AbrController from './AbrController.js';
import PlaybackController from './PlaybackController.js';
import MediaController from './MediaController.js';
import CustomTimeRanges from '../utils/CustomTimeRanges.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import BoxParser from '../utils/BoxParser.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

const BUFFER_LOADED = 'bufferLoaded';
const BUFFER_EMPTY = 'bufferStalled';
const STALL_THRESHOLD = 0.5;

function BufferController(config) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let metricsModel = config.metricsModel;
    let manifestModel = config.manifestModel;
    let sourceBufferController = config.sourceBufferController;
    let errHandler = config.errHandler;
    let mediaSourceController = config.mediaSourceController;
    let streamController = config.streamController;
    let mediaController = config.mediaController;
    let adapter = config.adapter;
    let virtualBuffer = config.virtualBuffer;
    let textSourceBuffer = config.textSourceBuffer;

    let instance,
        requiredQuality,
        currentQuality,
        isBufferingCompleted,
        bufferLevel,
        bufferTarget,
        criticalBufferLevel,
        mediaSource,
        maxAppendedIndex,
        lastIndex,
        type,
        buffer,
        minBufferTime,
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
        mediaPlayerModel;

    function setup() {
        requiredQuality = -1;
        currentQuality = -1;
        isBufferingCompleted = false;
        bufferLevel = 0;
        bufferTarget = 0;
        criticalBufferLevel = Number.POSITIVE_INFINITY;
        maxAppendedIndex = -1;
        lastIndex = -1;
        buffer = null;
        bufferState = BUFFER_EMPTY;
        wallclockTicked = 0;
        appendingMediaChunk = false;
        isAppendingInProgress = false;
        isPruningInProgress = false;
        inbandEventFound = false;
    }

    function initialize(Type, Source, StreamProcessor) {
        type = Type;
        setMediaSource(Source);
        streamProcessor = StreamProcessor;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        abrController = AbrController(context).getInstance();
        fragmentController = streamProcessor.getFragmentController();
        scheduleController = streamProcessor.getScheduleController();
        requiredQuality = abrController.getQualityFor(type, streamProcessor.getStreamInfo());

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
        eventBus.on(Events.QUALITY_CHANGED, onQualityChanged, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
        eventBus.on(Events.PLAYBACK_PROGRESS, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackProgression, this);
        eventBus.on(Events.PLAYBACK_RATE_CHANGED, onPlaybackRateChanged, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, onCurrentTrackChanged, this);
        eventBus.on(Events.SOURCEBUFFER_APPEND_COMPLETED, onAppended, this);
        eventBus.on(Events.SOURCEBUFFER_REMOVE_COMPLETED, onRemoved, this);
        eventBus.on(Events.CHUNK_APPENDED, onChunkAppended, this);
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
        // We may already have some segments in a virtual buffer by this moment. Let's try to append them to the real one.
        appendNext();

        return sourceBuffer;
    }

    function isActive() {
        var thisStreamId = streamProcessor.getStreamInfo().id;
        var activeStreamId = streamController.getActiveStreamInfo().id;

        return thisStreamId === activeStreamId;
    }

    function onInitFragmentLoaded(e) {
        // We received a new init chunk.
        // We just want to cache it in the virtual buffer here.
        // Then pass control to appendNext() to handle any other logic.

        var chunk;

        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;

        log('Initialization finished loading');
        chunk = e.chunk;
        // cache the initialization data to use it next time the quality has changed
        virtualBuffer.append(chunk);
        switchInitData(getStreamId(),  requiredQuality);
    }

    function onMediaFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;

        var events;
        var chunk = e.chunk;
        var bytes = chunk.bytes;
        var quality = chunk.quality;
        var index = chunk.index;
        var request = streamProcessor.getFragmentModel().getRequests({ state: FragmentModel.FRAGMENT_MODEL_EXECUTED, quality: quality, index: index })[0];
        var currentRepresentation = streamProcessor.getRepresentationInfoForQuality(quality);
        var manifest = manifestModel.getValue();
        var eventStreamMedia = adapter.getEventsFor(manifest, currentRepresentation.mediaInfo, streamProcessor);
        var eventStreamTrack = adapter.getEventsFor(manifest, currentRepresentation, streamProcessor);

        if (eventStreamMedia.length > 0 || eventStreamTrack.length > 0) {
            events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            streamProcessor.getEventController().addInbandEvents(events);
        }

        chunk.bytes = deleteInbandEvents(bytes);

        virtualBuffer.append(chunk);
        appendNext();
    }

    function appendNext() {
        // If we have an appendingMediaChunk in progress, process it.
        // Otherwise, try to get a media chunk from the virtual buffer.
        // If we have no media chunk available, do nothing - return.
        // If the media chunk we have matches currentQuality, append the media chunk to the source buffer.
        // Otherwise, leave the media chunk in appendingMediaChunk and check the init chunk corresponding to the media chunk.
        // If we have the corresponding init chunk, append the init chunk to the source buffer; appendingMediaChunk will be processed shortly through onAppended().
        // Otherwise, fire the Events.INIT_REQUESTED event.
        if (!buffer || isAppendingInProgress || !hasEnoughSpaceToAppend()) return;

        var streamId = getStreamId();
        var chunk;

        if (appendingMediaChunk) {
            chunk = appendingMediaChunk;
        } else {

            chunk = virtualBuffer.extract({streamId: streamId, mediaType: type, segmentType: HTTPRequest.MEDIA_SEGMENT_TYPE, limit: 1})[0];
            if (!chunk) {
                return;
            }

            appendingMediaChunk = chunk;
        }

        if (chunk.quality === currentQuality) {

            //TODO May need this for MP buffer switch as buffer will be null while new SB established.  But returning here and blocking progression may require validate to be called.
            //if (!buffer || isAppendingInProgress || !hasEnoughSpaceToAppend()) return;

            appendingMediaChunk = false;
            appendToBuffer(chunk);
        }
        else {
            // we need to change currentQuality by init data
            switchInitData(streamId, appendingMediaChunk.quality);
        }
    }

    function switchInitData(streamId, quality) {

        var filter = { streamId: streamId, mediaType: type, segmentType: HTTPRequest.INIT_SEGMENT_TYPE, quality: quality };
        var chunk = virtualBuffer.getChunks(filter)[0];

        if (chunk) {
            if (!buffer) return;

            appendToBuffer(chunk);
        } else {
            // if we have not loaded the init fragment for the current quality, do it
            eventBus.trigger(Events.INIT_REQUESTED, {sender: instance, requiredQuality: quality});
        }
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

        onPlaybackProgression();

        if (isBufferingCompleted && streamProcessor.getStreamInfo().isLast) {
            mediaSourceController.signalEndOfStream(mediaSource);
        }

        var ranges;

        if (e.error) {
            // if the append has failed because the buffer is full we should store the data
            // that has not been appended and stop request scheduling. We also need to store
            // the promise for this append because the next data can be appended only after
            // this promise is resolved.
            if (e.error.code === SourceBufferController.QUOTA_EXCEEDED_ERROR_CODE) {
                virtualBuffer.append(appendedBytesInfo);
                criticalBufferLevel = sourceBufferController.getTotalBufferedTime(buffer) * 0.8;
                eventBus.trigger(Events.QUOTA_EXCEEDED, {sender: instance, criticalBufferLevel: criticalBufferLevel});
                clearBuffer(getClearRange());
            }
            isAppendingInProgress = false;
            return;
        }

        if (!hasEnoughSpaceToAppend()) {
            eventBus.trigger(Events.QUOTA_EXCEEDED, {sender: instance, criticalBufferLevel: criticalBufferLevel});
            clearBuffer(getClearRange());
        }

        ranges = sourceBufferController.getAllRanges(buffer);

        if (ranges) {
            //log("Append complete: " + ranges.length);
            if (ranges.length > 0) {
                var i,
                    len;

                //log("Number of buffered ranges: " + ranges.length);
                for (i = 0, len = ranges.length; i < len; i++) {
                    log('Buffered Range: ' + ranges.start(i) + ' - ' + ranges.end(i));
                }
            }
        }

        //finish appending
        isAppendingInProgress = false;
        if (!isNaN(appendedBytesInfo.index)) {
            virtualBuffer.storeAppendedChunk(appendedBytesInfo, buffer);
            removeOldTrackData();
            maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
            checkIfBufferingCompleted();
        } else {
            currentQuality = appendedBytesInfo.quality;
            if (!streamProcessor.isDynamic()) {
                appendNext();
            }
        }

        eventBus.trigger(Events.BYTES_APPENDED, {sender: instance, quality: appendedBytesInfo.quality, startTime: appendedBytesInfo.start, index: appendedBytesInfo.index, bufferedRanges: ranges});
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
        isAppendingInProgress = false;
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

        //TODO may be needed for MULTIPERIOD PLEASE CHECK Turning this off for now... not really needed since we load sync...
        //var level = bufferLevel,
        //    virtualLevel;
        //virtualLevel = virtualBuffer.getTotalBufferLevel(streamProcessor.getMediaInfo());
        //if (virtualLevel) {
        //    level += virtualLevel;
        //}

        metricsModel.addBufferLevel(type, new Date(), bufferLevel * 1000);
    }

    function checkIfBufferingCompleted() {
        var isLastIdxAppended = maxAppendedIndex === (lastIndex - 1);

        if (!isLastIdxAppended || isBufferingCompleted) return;

        isBufferingCompleted = true;
        eventBus.trigger(Events.BUFFERING_COMPLETED, {sender: instance, streamInfo: streamProcessor.getStreamInfo()});
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

        log('try to prune buffer');

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
        var currentTime,
            removeStart,
            removeEnd,
            range,
            req;

        if (!buffer) return null;

        currentTime = playbackController.getTime();
        // we need to remove data that is more than one fragment before the video currentTime
        req = streamProcessor.getFragmentModel().getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, time: currentTime})[0];
        removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);

        range = sourceBufferController.getBufferRange(buffer, currentTime);

        if ((range === null) && (buffer.buffered.length > 0)) {
            removeEnd = buffer.buffered.end(buffer.buffered.length - 1 );
        }

        removeStart = buffer.buffered.start(0);

        return {start: removeStart, end: removeEnd};
    }

    function clearBuffer(range) {
        if (!range || !buffer) return;

        var removeStart = range.start;
        var removeEnd = range.end;

        sourceBufferController.remove(buffer, removeStart, removeEnd, mediaSource);
    }

    function onRemoved(e) {
        if (buffer !== e.buffer) return;

        // After the buffer has been cleared we need to update the virtual range that reflects the actual ranges
        // of SourceBuffer. We also need to update the list of appended chunks
        if (isPruningInProgress) {
            isPruningInProgress = false;
        }
        virtualBuffer.updateBufferedRanges({streamId: getStreamId(), mediaType: type}, sourceBufferController.getAllRanges(buffer));
        updateBufferLevel();
        eventBus.trigger(Events.BUFFER_CLEARED, {sender: instance, from: e.from, to: e.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend()});
        if (hasEnoughSpaceToAppend()) return;

        setTimeout(clearBuffer(getClearRange()), minBufferTime * 1000);
    }

    function updateBufferTimestampOffset(MSETimeOffset) {
        // each track can have its own @presentationTimeOffset, so we should set the offset
        // if it has changed after switching the quality or updating an mpd
        if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
            buffer.timestampOffset = MSETimeOffset;
        }
    }

    function getStreamId() {
        return streamProcessor.getStreamInfo().id;
    }

    function removeOldTrackData() {
        var allAppendedChunks = virtualBuffer.getChunks({ streamId: getStreamId(), mediaType: type, segmentType: HTTPRequest.MEDIA_SEGMENT_TYPE, appended: true });

        const customTimeRangesFactory = CustomTimeRanges(context);
        var rangesToClear = customTimeRangesFactory.create();
        var rangesToLeave = customTimeRangesFactory.create();

        var currentTime = playbackController.getTime();
        var safeBufferLength = streamProcessor.getCurrentRepresentationInfo().fragmentDuration * 2;

        var currentTrackBufferLength,
            ranges,
            range;

        allAppendedChunks.forEach(function (chunk) {
            ranges = mediaController.isCurrentTrack(chunk.mediaInfo) ? rangesToLeave : rangesToClear;
            ranges.add(chunk.bufferedRange.start, chunk.bufferedRange.end);
        });

        if ((rangesToClear.length === 0) || (rangesToLeave.length === 0)) return;

        currentTrackBufferLength = sourceBufferController.getBufferLength({buffered: rangesToLeave}, currentTime);

        if (currentTrackBufferLength < safeBufferLength) return;

        for (var i = 0, ln = rangesToClear.length; i < ln; i++) {
            range = {start: rangesToClear.start(i), end: rangesToClear.end(i)};
            if (mediaController.getSwitchMode(type) === MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE || range.start > currentTime) {
                clearBuffer(range);
            }
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) return;
        if (e.error) return;

        var bufferLength;

        updateBufferTimestampOffset(e.currentRepresentation.MSETimeOffset);

        bufferLength = streamProcessor.getStreamInfo().manifestInfo.minBufferTime;
        //log("Min Buffer time: " + bufferLength);
        if (minBufferTime !== bufferLength) {
            setMinBufferTime(bufferLength);
        }
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel()) return;
        lastIndex = e.request.index;
        checkIfBufferingCompleted();
    }

    function onChunkAppended(e) {
        if (e.sender !== virtualBuffer) return;
        addBufferMetrics();
    }

    function onCurrentTrackChanged(e) {
        if (!buffer || (e.newMediaInfo.type !== type) || (e.newMediaInfo.streamInfo.id !== streamProcessor.getStreamInfo().id)) return;

        var newMediaInfo = e.newMediaInfo;
        var mediaType = newMediaInfo.type;
        var switchMode = e.switchMode;
        var currentTime = playbackController.getTime();
        var range = { start: 0, end: currentTime };

        if (type !== mediaType) return;

        switch (switchMode) {
            case MediaController.TRACK_SWITCH_MODE_ALWAYS_REPLACE:
                clearBuffer(range);
                break;
            case MediaController.TRACK_SWITCH_MODE_NEVER_REPLACE:
                break;
            default:
                log('track switch mode is not supported: ' + switchMode);
        }
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

    function getMinBufferTime() {
        return minBufferTime;
    }

    function setMinBufferTime(value) {
        minBufferTime = value;
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

    function getIsAppendingInProgress() {
        return isAppendingInProgress;
    }

    function reset(errored) {

        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.QUALITY_CHANGED, onQualityChanged, this);
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
        eventBus.off(Events.CHUNK_APPENDED, onChunkAppended, this);

        criticalBufferLevel = Number.POSITIVE_INFINITY;
        bufferState = BUFFER_EMPTY;
        minBufferTime = null;
        currentQuality = -1;
        lastIndex = -1;
        maxAppendedIndex = -1;
        requiredQuality = 0;
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
        getMinBufferTime: getMinBufferTime,
        setMinBufferTime: setMinBufferTime,
        getCriticalBufferLevel: getCriticalBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        getIsAppendingInProgress: getIsAppendingInProgress,
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
