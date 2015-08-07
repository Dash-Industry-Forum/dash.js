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
MediaPlayer.dependencies.BufferController = function () {
    "use strict";
    var STALL_THRESHOLD = 0.5,
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

            return sourceBuffer;
        },

        isActive = function() {
            var thisStreamId = this.streamProcessor.getStreamInfo().id,
                activeStreamId = this.streamController.getActiveStreamInfo().id;

            return thisStreamId === activeStreamId;
        },

        waitingForInit = function() {
            var loadingReqs = this.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING}),
                streamId = getStreamId.call(this),
                mediaData = this.virtualBuffer.getChunks({streamId: streamId, mediaType: type, segmentType: MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE, quality: currentQuality});

            if ((currentQuality > requiredQuality) && (hasDataForQuality(mediaData, currentQuality) || hasDataForQuality(loadingReqs, currentQuality))) {
                return false;
            }

            return (currentQuality !== requiredQuality);
        },

        hasDataForQuality = function(arr, quality){
            var i = 0,
                ln = arr.length;

            for (i; i < ln; i +=1) {
                if (arr[i].quality === quality) return true;
            }

            return false;
        },

        onInitializationLoaded = function(e) {
            var self = this,
                chunk;

            if (e.data.fragmentModel !== self.streamProcessor.getFragmentModel()) return;

            self.log("Initialization finished loading");

            chunk = e.data.chunk;

            // cache the initialization data to use it next time the quality has changed
            this.virtualBuffer.append(chunk);

            // if this is the initialization data for current quality we need to push it to the buffer

            if (chunk.quality !== requiredQuality || !waitingForInit.call(self)) return;

            switchInitData.call(self);
        },

		onMediaLoaded = function (e) {
            if (e.data.fragmentModel !== this.streamProcessor.getFragmentModel()) return;

            var events,
                chunk = e.data.chunk,
                bytes = chunk.bytes,
                quality = chunk.quality,
                index = chunk.index,
                request = this.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, quality: quality, index: index})[0],
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

        appendToBuffer = function(chunk) {
            isAppendingInProgress = true;
            appendedBytesInfo = chunk;

            var self = this,
                quality = chunk.quality,
                isInit = isNaN(chunk.index);

            // The fragment should be rejected if this an init fragment and its quality does not match
            // the required quality or if this a media fragment and its quality does not match the
            // quality of the last appended init fragment. This means that media fragment of the old
            // quality can be appended providing init fragment for a new required quality has not been
            // appended yet.
            if ((quality !== requiredQuality && isInit) || (quality !== currentQuality && !isInit)) {
                onMediaRejected.call(self, quality, chunk.index);
                return;
            }
            //self.log("Push bytes: " + data.byteLength);
            self.sourceBufferExt.append(buffer, chunk);
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
                    self.virtualBuffer.append(appendedBytesInfo);
                    criticalBufferLevel = self.sourceBufferExt.getTotalBufferedTime(buffer) * 0.8;
                    self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
                    clearBuffer.call(self, getClearRange.call(self));
                }
                isAppendingInProgress = false;
                return;
            }

            updateBufferLevel.call(self);

            if (!hasEnoughSpaceToAppend.call(self)) {
                self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, {criticalBufferLevel: criticalBufferLevel});
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

            self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, {quality: appendedBytesInfo.quality, index: appendedBytesInfo.index, bufferedRanges: ranges});
            onAppendToBufferCompleted.call(self, appendedBytesInfo.quality, appendedBytesInfo.index);
        },

        updateBufferLevel = function() {
            var self = this,
                currentTime = self.playbackController.getTime(),
                fragmentsToLoad = this.streamProcessor.getScheduleController().getFragmentToLoadCount(),
                fragmentDuration = this.streamProcessor.getCurrentRepresentationInfo().fragmentDuration;

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);
            bufferTarget = fragmentsToLoad > 0 ? (fragmentsToLoad * fragmentDuration) + bufferLevel : bufferTarget;
            addBufferMetrics.call(this);
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
                totalBufferedTime = self.sourceBufferExt.getTotalBufferedTime(buffer);

            return (totalBufferedTime < criticalBufferLevel);
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
            req = self.streamProcessor.getFragmentModel().getRequests({state: MediaPlayer.dependencies.FragmentModel.states.EXECUTED, time: currentTime})[0];
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
            this.virtualBuffer.updateBufferedRanges({streamId: getStreamId.call(this), mediaType: type}, this.sourceBufferExt.getAllRanges(buffer));
            updateBufferLevel.call(this);
            this.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, {from: e.data.from, to: e.data.to, hasEnoughSpaceToAppend: hasEnoughSpaceToAppend.call(this)});
            if (hasEnoughSpaceToAppend.call(this)) return;

            setTimeout(clearBuffer.bind(this, getClearRange.call(this)), minBufferTime * 1000);
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
            addBufferMetrics.call(this);

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
            if (buffer && buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
                buffer.timestampOffset = MSETimeOffset;
            }
        },

        updateBufferState = function() {
            if (!buffer) return;

            var self = this;
            updateBufferLevel.call(self);
            appendNext.call(self);
        },

        appendNext = function() {
            if (waitingForInit.call(this)) {
                switchInitData.call(this);
            } else {
                appendNextMedia.call(this);
            }
        },

        addBufferMetrics = function() {
            if (!isActive.call(this)) return;

            this.metricsModel.addBufferState(type, getBufferState(), bufferTarget);

            var level = bufferLevel,
                virtualLevel;

            virtualLevel = this.virtualBuffer.getTotalBufferLevel(this.streamProcessor.getMediaInfo());

            if (virtualLevel) {
                level += virtualLevel;
            }

            this.metricsModel.addBufferLevel(type, new Date(), level);
        },

        getStreamId = function() {
            return this.streamProcessor.getStreamInfo().id;
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
            this.virtualBuffer.storeAppendedChunk(appendedBytesInfo, buffer);

            removeOldTrackData.call(this);

            maxAppendedIndex = Math.max(index,maxAppendedIndex);
            checkIfBufferingCompleted.call(this);
        },

        removeOldTrackData = function() {
            var self = this,
                allAppendedChunks = this.virtualBuffer.getChunks({streamId: getStreamId.call(this), mediaType: type, segmentType: MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE, appended: true}),
                rangesToClear = new MediaPlayer.utils.CustomTimeRanges(),
                rangesToLeave = new MediaPlayer.utils.CustomTimeRanges(),
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
                if (self.mediaController.getSwitchMode(type) === MediaPlayer.dependencies.MediaController.trackSwitchModes.ALWAYS_REPLACE || range.start > currentTime) {
                    clearBuffer.call(self, range);
                }
            }
        },

        appendNextMedia = function() {
            var streamId = getStreamId.call(this),
                chunk;

            if (!buffer || isBufferLevelOutrun || isAppendingInProgress || waitingForInit.call(this) || !hasEnoughSpaceToAppend.call(this)) return;

            chunk = this.virtualBuffer.extract({streamId: streamId, mediaType: type, segmentType: MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE, limit: 1})[0];

            if (!chunk) return;

            appendToBuffer.call(this, chunk);
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

            updateBufferTimestampOffset.call(self, self.streamProcessor.getRepresentationInfoForQuality(newQuality).MSETimeOffset);

            requiredQuality = newQuality;
            if (!waitingForInit.call(self)) return;

            switchInitData.call(self);
        },

        onChunkAppended = function(/*e*/) {
            addBufferMetrics.call(this);
        },

        switchInitData = function() {
            var self = this,
                streamId = getStreamId.call(self),
                filter = {streamId: streamId, mediaType: type, segmentType: MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE,
                    quality: requiredQuality},
                chunk = self.virtualBuffer.getChunks(filter)[0];

            if (chunk) {
                if (isAppendingInProgress || !buffer) return;

                appendToBuffer.call(self, chunk);
            } else {
                // if we have not loaded the init fragment for the current quality, do it
                self.notify(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, {requiredQuality: requiredQuality});
            }
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
                case MediaPlayer.dependencies.MediaController.trackSwitchModes.ALWAYS_REPLACE:
                    clearBuffer.call(self, range);
                    break;
                case MediaPlayer.dependencies.MediaController.trackSwitchModes.NEVER_REPLACE:
                    break;
                default:
                    this.log("track switch mode is not supported: " + switchMode);
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

            this[MediaPlayer.dependencies.MediaController.eventList.CURRENT_TRACK_CHANGED] = onCurrentTrackChanged;

            onAppended = onAppended.bind(this);
            onRemoved = onRemoved.bind(this);
            onChunkAppended = onChunkAppended.bind(this);
            this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, this, onAppended);
            this.sourceBufferExt.subscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, this, onRemoved);

            this.virtualBuffer.subscribe(MediaPlayer.utils.VirtualBuffer.eventList.CHUNK_APPENDED, this, onChunkAppended);
        },

        initialize: function (typeValue, source, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setMediaType(type);
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

        reset: function(errored) {
            var self = this;

            criticalBufferLevel = Number.POSITIVE_INFINITY;
            hasSufficientBuffer = null;
            minBufferTime = null;
            currentQuality = -1;
            lastIndex = -1;
            maxAppendedIndex = -1;
            requiredQuality = 0;
            self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, self, onAppended);
            self.sourceBufferExt.unsubscribe(MediaPlayer.dependencies.SourceBufferExtensions.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, self, onRemoved);
            appendedBytesInfo = null;

            this.virtualBuffer.unsubscribe(MediaPlayer.utils.VirtualBuffer.eventList.CHUNK_APPENDED, self, onChunkAppended);

            isBufferLevelOutrun = false;
            isAppendingInProgress = false;

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
