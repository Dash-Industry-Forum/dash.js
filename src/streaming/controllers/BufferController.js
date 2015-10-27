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
import RepresentationController from '../../dash/controllers/RepresentationController.js';
import FragmentModel from '../models/FragmentModel.js';
import FragmentController from './FragmentController.js';
import HTTPRequest from '../vo/metrics/HTTPRequest.js';
import SourceBufferExtensions from '../extensions/SourceBufferExtensions.js';
import AbrController from './AbrController.js';
import PlaybackController from './PlaybackController.js';
import VirtualBuffer from '../utils/VirtualBuffer.js';
import MediaPlayer from '../MediaPlayer.js';
import MediaController from './MediaController.js';
import CustomTimeRanges from '../utils/CustomTimeRanges.js';
import EventBus from '../utils/EventBus.js';
import Events from "../Events.js";

let BufferController = function () {
    "use strict";
    var STALL_THRESHOLD = 0.5,
        requiredQuality = -1,
        currentQuality = -1,
        isBufferingCompleted = false,
        bufferLevel = 0,
        bufferTarget= 0,
        criticalBufferLevel = Number.POSITIVE_INFINITY,
        mediaSource,
        maxAppendedIndex = -1,
        lastIndex = -1,
        type,
        buffer = null,
        minBufferTime,
        bufferState = BufferController.BUFFER_EMPTY,
        appendedBytesInfo,
        wallclockTicked = 0,
        appendingMediaChunk = false, // false or chunk
        isAppendingInProgress = false,
        isPruningInProgress = false,
        inbandEventFound = false,

        createBuffer = function(mediaInfo) {
            if (!mediaInfo || !mediaSource || !this.streamProcessor) return null;

            var sourceBuffer = null;

            try {
                sourceBuffer = this.sourceBufferExt.createSourceBuffer(mediaSource, mediaInfo);

                if (sourceBuffer && sourceBuffer.hasOwnProperty("initialize")) {
                    sourceBuffer.initialize(type, this);
                }
            } catch (e) {
                this.errHandler.mediaSourceError("Error creating " + type +" source buffer.");
            }

            this.setBuffer(sourceBuffer);
            updateBufferTimestampOffset.call(this, this.streamProcessor.getRepresentationInfoForQuality(requiredQuality).MSETimeOffset);
			// We may already have some segments in a virtual buffer by this moment. Let's try to append them to the real one.
			appendNext.call(this);

            return sourceBuffer;
        },

        isActive = function() {
            var thisStreamId = this.streamProcessor.getStreamInfo().id,
                activeStreamId = this.streamController.getActiveStreamInfo().id;

            return thisStreamId === activeStreamId;
        },

        //******************************************************************************************
        //  Start
        //******************************************************************************************

        onInitFragmentLoaded = function(e) {
            // We received a new init chunk.
            // We just want to cache it in the virtual buffer here.
            // Then pass control to appendNext() to handle any other logic.

            var self = this,
                chunk;

            if (e.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            self.log("Initialization finished loading");
            chunk = e.chunk;
            // cache the initialization data to use it next time the quality has changed
            this.virtualBuffer.append(chunk);
            switchInitData.call(this, getStreamId.call(this),  requiredQuality);
        },

		onMediaFragmentLoaded = function (e) {
            if (e.fragmentModel !== this.streamProcessor.getFragmentModel()) return;

            var events,
                chunk = e.chunk,
                bytes = chunk.bytes,
                quality = chunk.quality,
                index = chunk.index,
                request = this.streamProcessor.getFragmentModel().getRequests({state: FragmentModel.states.EXECUTED, quality: quality, index: index})[0],
                currentRepresentation = this.streamProcessor.getRepresentationInfoForQuality(quality),
                manifest = this.manifestModel.getValue(),
                eventStreamMedia = this.adapter.getEventsFor(manifest, currentRepresentation.mediaInfo, this.streamProcessor),
                eventStreamTrack = this.adapter.getEventsFor(manifest, currentRepresentation, this.streamProcessor);

            if(eventStreamMedia.length > 0 || eventStreamTrack.length > 0) {
                events = handleInbandEvents.call(this, bytes, request, eventStreamMedia, eventStreamTrack);
                this.streamProcessor.getEventController().addInbandEvents(events);
            }

            chunk.bytes = deleteInbandEvents.call(this, bytes);

            this.virtualBuffer.append(chunk);
            appendNext.call(this);
		},

        appendNext = function() {
            // If we have an appendingMediaChunk in progress, process it.
            // Otherwise, try to get a media chunk from the virtual buffer.
            // If we have no media chunk available, do nothing - return.
            // If the media chunk we have matches currentQuality, append the media chunk to the source buffer.
            // Otherwise, leave the media chunk in appendingMediaChunk and check the init chunk corresponding to the media chunk.
            // If we have the corresponding init chunk, append the init chunk to the source buffer; appendingMediaChunk will be processed shortly through onAppended().
            // Otherwise, fire the ENAME_INIT_REQUESTED event.
			if (!buffer || isAppendingInProgress || !hasEnoughSpaceToAppend.call(this)) return;

            var self = this,
                streamId = getStreamId.call(self),
                chunk;

            if (appendingMediaChunk) {
                chunk = appendingMediaChunk;
            } else {

                chunk = this.virtualBuffer.extract({streamId: streamId, mediaType: type, segmentType: HTTPRequest.MEDIA_SEGMENT_TYPE, limit: 1})[0];
                if (!chunk) {
                    return;
                }

                appendingMediaChunk = chunk;
            }

            if (chunk.quality === currentQuality) {

                //TODO May need this for MP buffer switch as buffer will be null while new SB established.  But returning here and blocking progression may require validate to be called.
                //if (!buffer || isAppendingInProgress || !hasEnoughSpaceToAppend.call(this)) return;

                appendingMediaChunk = false;
                appendToBuffer.call(this, chunk);
            }
            else {
                // we need to change currentQuality by init data
                switchInitData.call(this, streamId, appendingMediaChunk.quality);
            }
        },

        switchInitData = function(streamId, quality) {

            var self = this,
                filter = {streamId: streamId, mediaType: type, segmentType: HTTPRequest.INIT_SEGMENT_TYPE,
                    quality: quality},
                chunk = self.virtualBuffer.getChunks(filter)[0];

            if (chunk) {
				if (!buffer) return;

                appendToBuffer.call(self, chunk);
            } else {
                // if we have not loaded the init fragment for the current quality, do it
                self.notify(BufferController.eventList.ENAME_INIT_REQUESTED, {requiredQuality: quality});
            }
        },

        appendToBuffer = function(chunk) {
            isAppendingInProgress = true;
            appendedBytesInfo = chunk;
            this.sourceBufferExt.append(buffer, chunk);
        },

        onAppended = function(e) {
            if (buffer !== e.data.buffer) return;

            onPlaybackProgression.call(this);

            if (this.isBufferingCompleted() && this.streamProcessor.getStreamInfo().isLast) {
                this.mediaSourceExt.signalEndOfStream(mediaSource);
            }

            var self = this,
                ranges;

            if (e.error) {
                // if the append has failed because the buffer is full we should store the data
                // that has not been appended and stop request scheduling. We also need to store
                // the promise for this append because the next data can be appended only after
                // this promise is resolved.
                if (e.error.code === SourceBufferExtensions.QUOTA_EXCEEDED_ERROR_CODE) {
                    self.virtualBuffer.append(appendedBytesInfo);
                    criticalBufferLevel = self.sourceBufferExt.getTotalBufferedTime(buffer) * 0.8;
                    self.notify(BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
                    clearBuffer.call(self, getClearRange.call(self));
                }
                isAppendingInProgress = false;
                return;
            }

            if (!hasEnoughSpaceToAppend.call(self)) {
                self.notify(BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
                clearBuffer.call(self, getClearRange.call(self));
            }

            ranges = self.sourceBufferExt.getAllRanges(buffer);

            if (ranges) {
                //self.log("Append complete: " + ranges.length);
                if (ranges.length > 0) {
                    var i,
                        len;

                    //self.log("Number of buffered ranges: " + ranges.length);
                    for (i = 0, len = ranges.length; i < len; i += 1) {
                        self.log("Buffered Range: " + ranges.start(i) + " - " + ranges.end(i));
                    }
                }
            }
            //finish appending
            isAppendingInProgress = false;
            if (!isNaN(appendedBytesInfo.index)) {
                this.virtualBuffer.storeAppendedChunk(appendedBytesInfo, buffer);
                removeOldTrackData.call(this);
                maxAppendedIndex = Math.max(appendedBytesInfo.index, maxAppendedIndex);
                checkIfBufferingCompleted.call(this);
            } else {
                currentQuality = appendedBytesInfo.quality;
                if(!this.streamProcessor.isDynamic()) {
                    appendNext.call(this);
                }
            }

            self.notify(BufferController.eventList.ENAME_BYTES_APPENDED, {quality: appendedBytesInfo.quality, startTime: appendedBytesInfo.start, index: appendedBytesInfo.index, bufferedRanges: ranges});
        },

        onQualityChanged = function(e) {
            var newQuality = e.newQuality;
            if (requiredQuality === newQuality || type !== e.mediaType || this.streamProcessor.getStreamInfo().id !== e.streamInfo.id) return;

            updateBufferTimestampOffset.call(this, this.streamProcessor.getRepresentationInfoForQuality(newQuality).MSETimeOffset);
            requiredQuality = newQuality;
        },

        //**********************************************************************
        // START Buffer Level, State & Sufficiency Handling.
        //**********************************************************************
        onPlaybackSeeking = function() {
            isAppendingInProgress = false;
            onPlaybackProgression.call(this);

        },

        onPlaybackProgression = function() {
            updateBufferLevel.call(this);
            addBufferMetrics.call(this);
        },

        updateBufferLevel = function() {
            var self = this,
                currentTime = self.playbackController.getTime();

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
            self.notify(BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, {bufferLevel: bufferLevel});
            checkIfSufficientBuffer.call(self);
        },

        addBufferMetrics = function() {
            if (!isActive.call(this)) return;

            //TODO will need to fix how we get bufferTarget... since we ony load one at a time. but do it in the addBufferMetrics call not here
            //bufferTarget = fragmentsToLoad > 0 ? (fragmentsToLoad * fragmentDuration) + bufferLevel : bufferTarget;
            this.metricsModel.addBufferState(type, bufferState, bufferTarget);

            //TODO may be needed for MULTIPERIOD PLEASE CHECK Turning this off for now... not really needed since we load sync...
            //var level = bufferLevel,
            //    virtualLevel;
            //virtualLevel = this.virtualBuffer.getTotalBufferLevel(this.streamProcessor.getMediaInfo());
            //if (virtualLevel) {
            //    level += virtualLevel;
            //}

            this.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
        },

        checkIfBufferingCompleted = function() {
            var isLastIdxAppended = maxAppendedIndex === (lastIndex - 1);

            if (!isLastIdxAppended || isBufferingCompleted) return;

            isBufferingCompleted = true;
            this.notify(BufferController.eventList.ENAME_BUFFERING_COMPLETED);
        },

        checkIfSufficientBuffer = function () {
            if (bufferLevel < STALL_THRESHOLD && !isBufferingCompleted) {
                notifyBufferStateChanged.call(this, BufferController.BUFFER_EMPTY);
            } else {
                notifyBufferStateChanged.call(this,  BufferController.BUFFER_LOADED);
            }
        },

        notifyBufferStateChanged = function(state) {
            if (bufferState === state || (type === "fragmentedText" && this.textSourceBuffer.getAllTracksAreDisabled())) return;

            bufferState = state;
            addBufferMetrics.call(this);
            EventBus.trigger(Events.BUFFER_LEVEL_STATE_CHANGED, {state:state, mediaType:type, streamInfo:this.streamProcessor.getStreamInfo()});
            this.log(state === BufferController.BUFFER_LOADED ? ("Got enough buffer to start.") : ("Waiting for more buffer before starting playback."));
        },

        //**********************************************************************
        // END Buffer Level, State & Sufficiency Handling.
        //**********************************************************************

        handleInbandEvents = function(data,request,mediaInbandEvents,trackInbandEvents) {
            var events = [],
                eventBoxes,
                fragmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime,0),
                eventStreams = [],
                event,
                isoFile,
                inbandEvents;

            inbandEventFound = false;
            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
            for(var loop = 0; loop < inbandEvents.length; loop++) {
                eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
            }

            isoFile = this.boxParser.parse(data);
            eventBoxes = isoFile.getBoxes("emsg");

            for (var i = 0, ln = eventBoxes.length; i < ln; i += 1) {
                event = this.adapter.getEvent(eventBoxes[i], eventStreams, fragmentStarttime);

                if (event) {
                    events.push(event);
                }
            }

            return events;
        },

        deleteInbandEvents = function(data) {

            if(!inbandEventFound) {
                return data;
            }

            var length = data.length,
                i = 0,
                j = 0,
                identifier,
                size,
                expTwo = Math.pow(256,2),
                expThree = Math.pow(256,3),
                modData = new Uint8Array(data.length);

            while(i<length) {

                identifier = String.fromCharCode(data[i+4],data[i+5],data[i+6],data[i+7]);
                size = data[i]*expThree + data[i+1]*expTwo + data[i+2]*256 + data[i+3]*1;

                if(identifier != "emsg" ) {
                    for(var l = i ; l < i + size; l++) {
                        modData[j] = data[l];
                        j += 1;
                    }
                }
                i += size;

            }

            return modData.subarray(0,j);
        },

        hasEnoughSpaceToAppend = function() {
            var self = this,
                totalBufferedTime = self.sourceBufferExt.getTotalBufferedTime(buffer);

            return (totalBufferedTime < criticalBufferLevel);
        },

        /* prune buffer on our own in background to avoid browsers pruning buffer silently */
        pruneBuffer = function() {
            if (type === "fragmentedText") return;

            var bufferToPrune = 0,
                currentTime = this.playbackController.getTime(),
                currentRange = this.sourceBufferExt.getBufferRange(buffer, currentTime);

            // we want to get rid off buffer that is more than x seconds behind current time
            if (currentRange !== null) {
                bufferToPrune = currentTime - currentRange.start - BufferController.BUFFER_TO_KEEP;
                if (bufferToPrune > 0) {
                    isPruningInProgress = true;
                    this.sourceBufferExt.remove(buffer, 0, Math.round(currentRange.start + bufferToPrune), mediaSource);
                }
            }
        },


        getClearRange = function() {
            var self = this,
                currentTime,
                removeStart,
                removeEnd,
                range,
                req;

            if (!buffer) return null;

            currentTime = self.playbackController.getTime();
            // we need to remove data that is more than one fragment before the video currentTime
            req = self.streamProcessor.getFragmentModel().getRequests({state: FragmentModel.states.EXECUTED, time: currentTime})[0];
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);

            range = self.sourceBufferExt.getBufferRange(buffer, currentTime);

            if ((range === null) && (buffer.buffered.length > 0)) {
                removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
            }

            removeStart = buffer.buffered.start(0);

            return {start: removeStart, end: removeEnd};
        },

        clearBuffer = function(range) {
            if (!range || !buffer) return;

            var self = this,
                removeStart = range.start,
                removeEnd = range.end;

            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, mediaSource);
        },

        onRemoved = function(e) {
            if (buffer !== e.data.buffer) return;

            // After the buffer has been cleared we need to update the virtual range that reflects the actual ranges
            // of SourceBuffer. We also need to update the list of appended chunks
            if (isPruningInProgress) {
                isPruningInProgress = false;
            }
            this.virtualBuffer.updateBufferedRanges({streamId: getStreamId.call(this), mediaType: type}, this.sourceBufferExt.getAllRanges(buffer));
            updateBufferLevel.call(this);
            this.notify(BufferController.eventList.ENAME_BUFFER_CLEARED, {from: e.data.from, to: e.data.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend.call(this)});
            if (hasEnoughSpaceToAppend.call(this)) return;

            setTimeout(clearBuffer.bind(this, getClearRange.call(this)), minBufferTime * 1000);
        },

        updateBufferTimestampOffset = function(MSETimeOffset) {
            // each track can have its own @presentationTimeOffset, so we should set the offset
            // if it has changed after switching the quality or updating an mpd
            if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
                buffer.timestampOffset = MSETimeOffset;
            }
        },

        getStreamId = function() {
            return this.streamProcessor.getStreamInfo().id;
        },

        removeOldTrackData = function() {
            var self = this,
                allAppendedChunks = this.virtualBuffer.getChunks({streamId: getStreamId.call(this), mediaType: type, segmentType: HTTPRequest.MEDIA_SEGMENT_TYPE, appended: true}),
                rangesToClear = new CustomTimeRanges(),
                rangesToLeave = new CustomTimeRanges(),
                currentTime = this.playbackController.getTime(),
                safeBufferLength = this.streamProcessor.getCurrentRepresentationInfo().fragmentDuration * 2,
                currentTrackBufferLength,
                ranges,
                range;

            allAppendedChunks.forEach(function(chunk) {
                ranges = self.mediaController.isCurrentTrack(chunk.mediaInfo) ? rangesToLeave : rangesToClear;
                ranges.add(chunk.bufferedRange.start, chunk.bufferedRange.end);
            });

            if ((rangesToClear.length === 0) || (rangesToLeave.length === 0)) return;

            currentTrackBufferLength = this.sourceBufferExt.getBufferLength({buffered: rangesToLeave}, currentTime);

            if (currentTrackBufferLength < safeBufferLength) return;

            for (var i = 0, ln = rangesToClear.length; i < ln; i +=1) {
                range = {start: rangesToClear.start(i), end: rangesToClear.end(i)};
                if (self.mediaController.getSwitchMode(type) === MediaController.trackSwitchModes.ALWAYS_REPLACE || range.start > currentTime) {
                    clearBuffer.call(self, range);
                }
            }
        },


        onDataUpdateCompleted = function(e) {
            if (e.error) return;

            var self = this,
                bufferLength;

            updateBufferTimestampOffset.call(self, e.currentRepresentation.MSETimeOffset);

            bufferLength = self.streamProcessor.getStreamInfo().manifestInfo.minBufferTime;
            //self.log("Min Buffer time: " + bufferLength);
            if (minBufferTime !== bufferLength) {
                self.setMinBufferTime(bufferLength);
                self.notify(BufferController.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, {minBufferTime: bufferLength});
            }
        },

        onStreamCompleted = function (e) {
            var self = this;

            if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            lastIndex = e.data.request.index;
            checkIfBufferingCompleted.call(self);
        },

        onChunkAppended = function(/*e*/) {
            addBufferMetrics.call(this);
        },



        onCurrentTrackChanged = function(e) {
            if (!buffer) return;

            var self = this,
                newMediaInfo = e.data.newMediaInfo,
                mediaType = newMediaInfo.type,
                switchMode = e.data.switchMode,
                currentTime = this.playbackController.getTime(),
                range = {start: 0, end: currentTime};

            if (type !== mediaType) return;

            switch (switchMode) {
                case MediaController.trackSwitchModes.ALWAYS_REPLACE:
                    clearBuffer.call(self, range);
                    break;
                case MediaController.trackSwitchModes.NEVER_REPLACE:
                    break;
                default:
                    this.log("track switch mode is not supported: " + switchMode);
            }
        },

        onWallclockTimeUpdated = function(/*e*/) {

             //constantly prune buffer every x seconds
            wallclockTicked += 1;
            if ((wallclockTicked % BufferController.BUFFER_PRUNING_INTERVAL) === 0 && !isAppendingInProgress) {
                pruneBuffer.call(this);
            }

        },

        onPlaybackRateChanged = function(/*e*/) {
            checkIfSufficientBuffer.call(this);
        };

    return {
        sourceBufferExt: undefined,
        bufferMax: undefined,
        manifestModel: undefined,
        errHandler: undefined,
        mediaSourceExt: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        streamController: undefined,
        playbackController: undefined,
        mediaController: undefined,
        adapter: undefined,
        log: undefined,
        abrController: undefined,
        boxParser: undefined,
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        virtualBuffer: undefined,
        textSourceBuffer:undefined,

        setup: function() {
            EventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            EventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
            EventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);
            EventBus.on(Events.QUALITY_CHANGED, onQualityChanged, this);

            this[FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;

            this[PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS] = onPlaybackProgression;
            this[PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED] = onPlaybackProgression;
            this[PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
            this[PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED] = onPlaybackRateChanged;
            this[PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated;

            this[MediaController.eventList.CURRENT_TRACK_CHANGED] = onCurrentTrackChanged;

            onAppended = onAppended.bind(this);
            onRemoved = onRemoved.bind(this);
            onChunkAppended = onChunkAppended.bind(this);
            this.sourceBufferExt.subscribe(SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, this, onAppended);
            this.sourceBufferExt.subscribe(SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, this, onRemoved);

            this.virtualBuffer.subscribe(VirtualBuffer.eventList.CHUNK_APPENDED, this, onChunkAppended);
        },

        initialize: function (typeValue, source, streamProcessor) {
            var self = this;

            type = typeValue;
           // self.setMediaType(type);
            self.setMediaSource(source);
            self.streamProcessor = streamProcessor;
            self.fragmentController = streamProcessor.fragmentController;
            self.scheduleController = streamProcessor.scheduleController;
            requiredQuality = self.abrController.getQualityFor(type, streamProcessor.getStreamInfo());
        },

        /**
         * @param mediaInfo object
         * @returns SourceBuffer object
         * @memberof BufferController#
         */
        createBuffer: createBuffer,

        getStreamProcessor: function() {
            return this.streamProcessor;
        },

        setStreamProcessor: function(value) {
            this.streamProcessor = value;
        },

        getBuffer: function () {
            return buffer;
        },

        setBuffer: function (value) {
            buffer = value;
        },

        getBufferLevel: function() {
            return bufferLevel;
        },

        getMinBufferTime: function () {
            return minBufferTime;
        },

        setMinBufferTime: function (value) {
            minBufferTime = value;
        },

        getCriticalBufferLevel: function(){
            return criticalBufferLevel;
        },

        setMediaSource: function(value) {
            mediaSource = value;
        },

        getMediaSource: function() {
            return mediaSource;
        },

        isBufferingCompleted : function() {
            return isBufferingCompleted;
        },

        getIsAppendingInProgress : function(){
            return isAppendingInProgress;
        },

        reset: function(errored) {

            EventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
            EventBus.off(Events.QUALITY_CHANGED, onQualityChanged, this);
            EventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
            EventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, this);

            criticalBufferLevel = Number.POSITIVE_INFINITY;
            bufferState = BufferController.BUFFER_EMPTY;
            minBufferTime = null;
            currentQuality = -1;
            lastIndex = -1;
            maxAppendedIndex = -1;
            requiredQuality = 0;
            this.sourceBufferExt.unsubscribe(SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, this, onAppended);
            this.sourceBufferExt.unsubscribe(SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, this, onRemoved);
            appendedBytesInfo = null;
            this.virtualBuffer.unsubscribe(VirtualBuffer.eventList.CHUNK_APPENDED, this, onChunkAppended);
            appendingMediaChunk = false;
            isBufferingCompleted = false;
            isAppendingInProgress = false;
            isPruningInProgress = false;

            if (!errored) {
                this.sourceBufferExt.abort(mediaSource, buffer);
                this.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }

            buffer = null;
        }
    };
};

//BufferController.BUFFER_SIZE_REQUIRED = "required";
//BufferController.BUFFER_SIZE_MIN = "min";
//BufferController.BUFFER_SIZE_INFINITY = "infinity";

BufferController.LOW_BUFFER_THRESHOLD = 4;
BufferController.DEFAULT_MIN_BUFFER_TIME = 12;
BufferController.BUFFER_TIME_AT_TOP_QUALITY = 30;
BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 60;
BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;

BufferController.RICH_BUFFER_THRESHOLD = 20;
BufferController.BUFFER_LOADED = "bufferLoaded";
BufferController.BUFFER_EMPTY = "bufferStalled";
BufferController.BUFFER_TO_KEEP = 30;
BufferController.BUFFER_PRUNING_INTERVAL = 30;




BufferController.prototype = {
    constructor: BufferController
};

BufferController.eventList = {
    ENAME_BUFFER_LEVEL_UPDATED: "bufferLevelUpdated",
    ENAME_QUOTA_EXCEEDED: "quotaExceeded",
    ENAME_BYTES_APPENDED: "bytesAppended",
    ENAME_BYTES_REJECTED: "bytesRejected",
    ENAME_BUFFERING_COMPLETED: "bufferingCompleted",
    ENAME_BUFFER_CLEARED: "bufferCleared",
    ENAME_INIT_REQUESTED: "initRequested",
    ENAME_BUFFER_LEVEL_OUTRUN: "bufferLevelOutrun",
    ENAME_BUFFER_LEVEL_BALANCED: "bufferLevelBalanced",
    ENAME_MIN_BUFFER_TIME_UPDATED: "minBufferTimeUpdated"
};

export default BufferController;