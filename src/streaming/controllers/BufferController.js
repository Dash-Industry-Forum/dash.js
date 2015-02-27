/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    var STALL_THRESHOLD = 0.5,
        initializationData = [],
        requiredQuality = 0,
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
        hasSufficientBuffer = null,
        appendedBytesInfo,

        isBufferLevelOutrun = false,
        isAppendingInProgress = false,
        pendingMedia = [],
        inbandEventFound = false,

        waitingForInit = function() {
            var loadingReqs = this.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING});

            if ((currentQuality > requiredQuality) && (hasReqsForQuality(pendingMedia, currentQuality) || hasReqsForQuality(loadingReqs, currentQuality))) {
                return false;
            }

            return (currentQuality !== requiredQuality);
        },

        hasReqsForQuality = function(arr, quality){
            var i = 0,
                ln = arr.length;

            for (i; i < ln; i +=1) {
                if (arr[i].quality === quality) return true;
            }

            return false;
        },

        sortArrayByProperty = function(array, sortProp) {
            var compare = function (obj1, obj2){
                if (obj1[sortProp] < obj2[sortProp]) return -1;
                if (obj1[sortProp] > obj2[sortProp]) return 1;
                return 0;
            };

            array.sort(compare);
        },

        onInitializationLoaded = function(e) {
            var self = this;

            if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            self.log("Initialization finished loading");

            // cache the initialization data to use it next time the quality has changed
            initializationData[e.data.quality] = e.data.bytes;

            // if this is the initialization data for current quality we need to push it to the buffer

            if (e.data.quality !== requiredQuality || !waitingForInit.call(self)) return;

            switchInitData.call(self);
        },

		onMediaLoaded = function (e) {
            if (e.data.fragmentModel !== this.streamProcessor.getFragmentModel()) return;

            var events,
                bytes = e.data.bytes,
                quality = e.data.quality,
                index = e.data.index,
                request = this.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, quality: quality, index: index})[0],
                currentTrack = this.streamProcessor.getTrackForQuality(quality),
                eventStreamMedia = this.adapter.getEventsFor(currentTrack.mediaInfo, this.streamProcessor),
                eventStreamTrack = this.adapter.getEventsFor(currentTrack, this.streamProcessor);

            if(eventStreamMedia.length > 0 || eventStreamTrack.length > 0) {
                events = handleInbandEvents.call(this, bytes, request, eventStreamMedia, eventStreamTrack);
                this.streamProcessor.getEventController().addInbandEvents(events);
            }

            bytes = deleteInbandEvents.call(this, bytes);

            pendingMedia.push({bytes: bytes, quality: quality, index: index});
            sortArrayByProperty(pendingMedia, "index");

            appendNext.call(this);
		},

        appendToBuffer = function(data, quality, index) {
            isAppendingInProgress = true;
            appendedBytesInfo = {quality: quality, index: index};

            var self = this,
                isInit = isNaN(index);

            // The fragment should be rejected if this an init fragment and its quality does not match
            // the required quality or if this a media fragment and its quality does not match the
            // quality of the last appended init fragment. This means that media fragment of the old
            // quality can be appended providing init fragment for a new required quality has not been
            // appended yet.
            if ((quality !== requiredQuality && isInit) || (quality !== currentQuality && !isInit)) {
                onMediaRejected.call(self, quality, index);
                return;
            }
            //self.log("Push bytes: " + data.byteLength);
            self.sourceBufferExt.append(buffer, data);
        },

        onAppended = function(e) {
            if (buffer !== e.data.buffer) return;

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
                if (e.error.code === MediaPlayer.dependencies.SourceBufferExtensions.QUOTA_EXCEEDED_ERROR_CODE) {
                    pendingMedia.unshift({bytes: e.data.bytes, quality: appendedBytesInfo.quality, index: appendedBytesInfo.index});
                    criticalBufferLevel = getTotalBufferedTime.call(self) * 0.8;
                    self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
                    clearBuffer.call(self);
                }
                isAppendingInProgress = false;
                return;
            }

            updateBufferLevel.call(self);

            if (!hasEnoughSpaceToAppend.call(self)) {
                self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
                clearBuffer.call(self);
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

            onAppendToBufferCompleted.call(self, appendedBytesInfo.quality, appendedBytesInfo.index);
            self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, {quality: appendedBytesInfo.quality, index: appendedBytesInfo.index, bufferedRanges: ranges});
        },

        updateBufferLevel = function() {
            var self = this,
                currentTime = self.playbackController.getTime();

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
            self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, {bufferLevel: bufferLevel});
            checkGapBetweenBuffers.call(self);
            checkIfSufficientBuffer.call(self);

            if (bufferLevel < STALL_THRESHOLD) {
                notifyIfSufficientBufferStateChanged.call(self, false);
            }

            return true;
        },

        handleInbandEvents = function(data,request,mediaInbandEvents,trackInbandEvents) {
            var events = [],
                i = 0,
                identifier,
                size,
                expTwo = Math.pow(256,2),
                expThree = Math.pow(256,3),
                fragmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime,0),
                eventStreams = [],
                event,
                inbandEvents;

            inbandEventFound = false;
            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
            for(var loop = 0; loop < inbandEvents.length; loop++) {
                eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
            }
            while(i<data.length) {
                identifier = String.fromCharCode(data[i+4],data[i+5],data[i+6],data[i+7]); // box identifier
                size = data[i]*expThree + data[i+1]*expTwo + data[i+2]*256 + data[i+3]*1; // size of the box
                if( identifier == "moov" || identifier == "moof") {
                    break;
                } else if(identifier == "emsg") {
                    inbandEventFound = true;
                    var eventBox = ["","",0,0,0,0,""],
                        arrIndex = 0,
                        j = i+12; //fullbox header is 12 bytes, thats why we start at 12

                    while(j < size+i) {
                        /* == string terminates with 0, this indicates end of attribute == */
                        if(arrIndex === 0 || arrIndex == 1 || arrIndex == 6) {
                            if(data[j] !== 0) {
                                eventBox[arrIndex] += String.fromCharCode(data[j]);
                            } else {
                                arrIndex += 1;
                            }
                            j += 1;
                        } else {
                            eventBox[arrIndex] = data[j]*expThree + data[j+1]*expTwo + data[j+2]*256 + data[j+3]*1;
                            j += 4;
                            arrIndex += 1;
                        }
                    }

                    event = this.adapter.getEvent(eventBox, eventStreams, fragmentStarttime);

                    if (event) {
                        events.push(event);
                    }
                }
                i += size;
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

        checkGapBetweenBuffers= function() {
            var leastLevel = getLeastBufferLevel.call(this),
                acceptableGap = minBufferTime * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new fragments until the gap will be reduced to the suitable size.
            if (actualGap >= acceptableGap && !isBufferLevelOutrun) {
                isBufferLevelOutrun = true;
                this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN);
            } else if ((actualGap < (acceptableGap / 2) && isBufferLevelOutrun)) {
                this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED);
                isBufferLevelOutrun = false;
                appendNext.call(this);
            }
        },

        getLeastBufferLevel = function() {
            var videoMetrics = this.metricsModel.getReadOnlyMetricsFor("video"),
                videoBufferLevel = this.metricsExt.getCurrentBufferLevel(videoMetrics),
                audioMetrics = this.metricsModel.getReadOnlyMetricsFor("audio"),
                audioBufferLevel = this.metricsExt.getCurrentBufferLevel(audioMetrics),
                leastLevel = null;

            if (videoBufferLevel === null || audioBufferLevel === null) {
                leastLevel = (audioBufferLevel !== null) ? audioBufferLevel.level : ((videoBufferLevel !== null) ? videoBufferLevel.level : null);
            } else {
                leastLevel = Math.min(audioBufferLevel.level, videoBufferLevel.level);
            }

            return leastLevel;
        },

        hasEnoughSpaceToAppend = function() {
            var self = this,
                totalBufferedTime = getTotalBufferedTime.call(self);

            return (totalBufferedTime < criticalBufferLevel);
        },

        clearBuffer = function() {
            var self = this,
                currentTime,
                removeStart,
                removeEnd,
                range,
                req;

            if (!buffer) return;

            currentTime = self.playbackController.getTime();
            // we need to remove data that is more than one fragment before the video currentTime
            req = self.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, time: currentTime})[0];
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);

            range = self.sourceBufferExt.getBufferRange(buffer, currentTime);

            if ((range === null) && (buffer.buffered.length > 0)) {
                removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
            }

            removeStart = buffer.buffered.start(0);
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, mediaSource);
        },

        onRemoved = function(e) {
            if (buffer !== e.data.buffer) return;

            updateBufferLevel.call(this);
            this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, {from: e.data.from, to: e.data.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend.call(this)});
            if (hasEnoughSpaceToAppend.call(this)) return;

            setTimeout(clearBuffer.bind(this), minBufferTime * 1000);
        },

        getTotalBufferedTime = function() {
            var self = this,
                ranges = self.sourceBufferExt.getAllRanges(buffer),
                totalBufferedTime = 0,
                ln,
                i;

            if (!ranges) return totalBufferedTime;

            for (i = 0, ln = ranges.length; i < ln; i += 1) {
                totalBufferedTime += ranges.end(i) - ranges.start(i);
            }

            return totalBufferedTime;
        },

        checkIfBufferingCompleted = function() {
            var isLastIdxAppended = maxAppendedIndex === (lastIndex - 1);

            if (!isLastIdxAppended || isBufferingCompleted) return;

            isBufferingCompleted = true;
            this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED);
        },

        checkIfSufficientBuffer = function () {
            var timeToEnd = this.playbackController.getTimeToStreamEnd();
                //minLevel = this.streamProcessor.isDynamic() ? minBufferTime / 2 : minBufferTime;

            if (bufferLevel < STALL_THRESHOLD && (minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted)) {
                notifyIfSufficientBufferStateChanged.call(this, false);
            } else {
                notifyIfSufficientBufferStateChanged.call(this, true);
            }
        },

        getBufferState = function() {
            return hasSufficientBuffer ? MediaPlayer.dependencies.BufferController.BUFFER_LOADED : MediaPlayer.dependencies.BufferController.BUFFER_EMPTY;
        },

        notifyIfSufficientBufferStateChanged = function(state) {
            if (hasSufficientBuffer === state) return;

            hasSufficientBuffer = state;

            var bufferState = getBufferState(),
                eventName = (bufferState === MediaPlayer.dependencies.BufferController.BUFFER_LOADED) ? MediaPlayer.events.BUFFER_LOADED : MediaPlayer.events.BUFFER_EMPTY;
            this.metricsModel.addBufferState(type, bufferState, bufferTarget);

            this.eventBus.dispatchEvent({
                type: eventName,
                data: {
                    bufferType: type
                }
            });
            this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, {hasSufficientBuffer: state});
            this.log(hasSufficientBuffer ? ("Got enough buffer to start.") : ("Waiting for more buffer before starting playback."));
        },

        updateBufferTimestampOffset = function(MSETimeOffset) {
            // each track can have its own @presentationTimeOffset, so we should set the offset
            // if it has changed after switching the quality or updating an mpd
            if (buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
                buffer.timestampOffset = MSETimeOffset;
            }
        },

        updateBufferState = function() {
            var self = this,
                fragmentsToLoad = this.streamProcessor.getScheduleController().getFragmentToLoadCount(),
                fragmentDuration = this.streamProcessor.getCurrentTrack().fragmentDuration;

            updateBufferLevel.call(self);
            bufferTarget = fragmentsToLoad > 0 ? (fragmentsToLoad * fragmentDuration) + bufferLevel : bufferTarget;
            this.metricsModel.addBufferState(type, getBufferState(), bufferTarget);
            appendNext.call(self);
        },

        appendNext = function() {
            if (waitingForInit.call(this)) {
                switchInitData.call(this);
            } else {
                appendNextMedia.call(this);
            }
        },

        onAppendToBufferCompleted = function(quality, index) {
            isAppendingInProgress = false;

            if (!isNaN(index)) {
                onMediaAppended.call(this, index);
            } else {
                onInitAppended.call(this, quality);
            }

            appendNext.call(this);
        },

        onMediaRejected = function(quality, index) {
            isAppendingInProgress = false;
            this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, {quality: quality, index: index});
            appendNext.call(this);
        },

        onInitAppended = function(quality) {
            currentQuality = quality;
        },

        onMediaAppended = function(index) {
            maxAppendedIndex = Math.max(index,maxAppendedIndex);
            checkIfBufferingCompleted.call(this);
        },

        appendNextMedia = function() {
            var data;

            if (pendingMedia.length === 0 || isBufferLevelOutrun || isAppendingInProgress || waitingForInit.call(this) || !hasEnoughSpaceToAppend.call(this)) return;

            data = pendingMedia.shift();
            appendToBuffer.call(this, data.bytes, data.quality, data.index);
        },

        onDataUpdateCompleted = function(e) {
            if (e.error) return;

            var self = this,
                bufferLength;

            updateBufferTimestampOffset.call(self, e.data.currentRepresentation.MSETimeOffset);

            bufferLength = self.streamProcessor.getStreamInfo().manifestInfo.minBufferTime;
            //self.log("Min Buffer time: " + bufferLength);
            if (minBufferTime !== bufferLength) {
                self.setMinBufferTime(bufferLength);
                self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, {minBufferTime: bufferLength});
            }
        },

        onStreamCompleted = function (e) {
            var self = this;

            if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            lastIndex = e.data.request.index;
            checkIfBufferingCompleted.call(self);
        },

        onQualityChanged = function(e) {
            if (type !== e.data.mediaType || this.streamProcessor.getStreamInfo().id !== e.data.streamInfo.id) return;

            var self = this,
                newQuality = e.data.newQuality;

            // if the quality has changed we should append the initialization data again. We get it
            // from the cached array instead of sending a new request
            if (requiredQuality === newQuality) return;

            updateBufferTimestampOffset.call(self, self.streamProcessor.getTrackForQuality(newQuality).MSETimeOffset);

            requiredQuality = newQuality;
            if (!waitingForInit.call(self)) return;

            switchInitData.call(self);
        },

        switchInitData = function() {
            var self = this;

            if (initializationData[requiredQuality]) {
                if (isAppendingInProgress) return;

                appendToBuffer.call(self, initializationData[requiredQuality], requiredQuality);
            } else {
                // if we have not loaded the init fragment for the current quality, do it
                self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, {requiredQuality: requiredQuality});
            }
        },

        onWallclockTimeUpdated = function(/*e*/) {
            appendNext.call(this);
        },

        onPlaybackRateChanged = function(/*e*/) {
            checkIfSufficientBuffer.call(this);
        };

    return {
        sourceBufferExt: undefined,
        eventBus: undefined,
        bufferMax: undefined,
        mediaSourceExt: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        adapter: undefined,
        log: undefined,
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED] = onDataUpdateCompleted;

            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED] = onInitializationLoaded;
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED] =  onMediaLoaded;
            this[MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;

            this[MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED] = onQualityChanged;

            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS] = updateBufferState;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = updateBufferState;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED] = updateBufferState;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED] = onPlaybackRateChanged;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED] = onWallclockTimeUpdated;

            onAppended = onAppended.bind(this);
            onRemoved = onRemoved.bind(this);
            this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, this, onAppended);
            this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, this, onRemoved);
        },

        initialize: function (typeValue, buffer, source, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setMediaType(type);
            self.setMediaSource(source);
            self.setBuffer(buffer);
            self.streamProcessor = streamProcessor;
            self.fragmentController = streamProcessor.fragmentController;
            self.scheduleController = streamProcessor.scheduleController;
            self.playbackController = streamProcessor.playbackController;
        },

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

        isBufferingCompleted : function() {
            return isBufferingCompleted;
        },

        reset: function(errored) {
            var self = this;

            initializationData = [];
            criticalBufferLevel = Number.POSITIVE_INFINITY;
            hasSufficientBuffer = null;
            minBufferTime = null;
            currentQuality = -1;
            requiredQuality = 0;
            self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, self, onAppended);
            self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, self, onRemoved);
            appendedBytesInfo = null;

            isBufferLevelOutrun = false;
            isAppendingInProgress = false;
            pendingMedia = [];

            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }

            buffer = null;
        }
    };
};

MediaPlayer.dependencies.BufferController.BUFFER_SIZE_REQUIRED = "required";
MediaPlayer.dependencies.BufferController.BUFFER_SIZE_MIN = "min";
MediaPlayer.dependencies.BufferController.BUFFER_SIZE_INFINITY = "infinity";
MediaPlayer.dependencies.BufferController.DEFAULT_MIN_BUFFER_TIME = 12;
MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD = 4;
MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY = 30;
MediaPlayer.dependencies.BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 300;
MediaPlayer.dependencies.BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
MediaPlayer.dependencies.BufferController.RICH_BUFFER_THRESHOLD = 20;
MediaPlayer.dependencies.BufferController.BUFFER_LOADED = "bufferLoaded";
MediaPlayer.dependencies.BufferController.BUFFER_EMPTY = "bufferStalled";




MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};

MediaPlayer.dependencies.BufferController.eventList = {
    ENAME_BUFFER_LEVEL_STATE_CHANGED: "bufferLevelStateChanged",
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
