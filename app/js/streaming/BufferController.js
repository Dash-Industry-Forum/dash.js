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
        QUOTA_EXCEEDED_ERROR_CODE = 22,
        initializationData = [],
        seekTarget = -1,
        necessaryQuality = 0,
        currentQuality = 0,
        isBufferingCompleted = false,
        bufferLevel = 0,
        criticalBufferLevel = Number.POSITIVE_INFINITY,
        mediaSource,
        maxAppendedIndex = -1,
        lastIndex = -1,
        type,
        buffer = null,
        minBufferTime,
        hasSufficientBuffer = null,

        isBufferLevelOutrun = false,
        isAppendingInProgress = false,
        requiredInitQuality = 0,
        pendingMedia = [],

        waitingForInit = function() {
            return (requiredInitQuality !== null);
        },

        isCriticalBufferLevelExceeded = function() {
            return bufferLevel > criticalBufferLevel;
        },

        sortArrayByProperty = function(array, sortProp) {
            var compare = function (obj1, obj2){
                if (obj1[sortProp] < obj2[sortProp]) return -1;
                if (obj1[sortProp] > obj2[sortProp]) return 1;
                return 0;
            };

            array.sort(compare);
        },

        onInitializationLoaded = function(sender, model, bytes, quality) {
            var self = this;

            if (model !== self.streamProcessor.getFragmentModel()) return;

            self.debug.log("Initialization finished loading: " + type);

            // cache the initialization data to use it next time the quality has changed
            initializationData[quality] = bytes;

            // if this is the initialization data for current quality we need to push it to the buffer

            if (quality !== necessaryQuality || !waitingForInit()) return;

            switchInitData.call(self);
        },

		onMediaLoaded = function (sender, model, bytes, quality, index) {
            if (model !== this.streamProcessor.getFragmentModel()) return;

            pendingMedia.push({bytes: bytes, quality: quality, index: index});
            sortArrayByProperty(pendingMedia, "index");
            appendNextMedia.call(this);
		},

        appendToBuffer = function(data, quality, index) {
            isAppendingInProgress = true;

            var self = this,
                ranges,
                appendHandler = function(sender, data, error) {
                    if (error) {
                        // if the append has failed because the buffer is full we should store the data
                        // that has not been appended and stop request scheduling. We also need to store
                        // the promise for this append because the next data can be appended only after
                        // this promise is resolved.
                        if (error.code === QUOTA_EXCEEDED_ERROR_CODE) {
                            pendingMedia.unshift({bytes: data, quality: quality, index: index});
                            criticalBufferLevel = bufferLevel * 0.8;
                            self.bufferExt.setCriticalBufferLevel(criticalBufferLevel);
                            self.notify(self.eventList.ENAME_QUOTA_EXCEEDED, criticalBufferLevel);
                            clearBuffer.call(self);
                        }
                        isAppendingInProgress = false;
                        return;
                    }

                    if (!hasData.call(self)) return;

                    updateBufferLevel.call(self);

                    ranges = self.sourceBufferExt.getAllRanges(buffer);

                    if (ranges) {
                        //self.debug.log("Append " + type + " complete: " + ranges.length);
                        if (ranges.length > 0) {
                            var i,
                                len;

                            //self.debug.log("Number of buffered " + type + " ranges: " + ranges.length);
                            for (i = 0, len = ranges.length; i < len; i += 1) {
                                self.debug.log("Buffered " + type + " Range: " + ranges.start(i) + " - " + ranges.end(i));
                            }
                        }
                    }

                    onAppended.call(self, quality, index);
                    self.notify(self.eventList.ENAME_BYTES_APPENDED, index);
                };

            //self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (!hasData.call(self)) return;

            hasEnoughSpaceToAppend.call(self, function() {
                if (quality !== currentQuality && (index !== undefined)) {
                    onMediaRejected.call(self, quality, index);
                    return;
                }

                if (!hasData.call(self)) return;
                self.sourceBufferExt.subscribe(self.sourceBufferExt.eventList.ENAME_SOURCEBUFFER_APPEND_COMPLETED, self, appendHandler, true);
                self.sourceBufferExt.append(buffer, data);
            });
        },

        updateBufferLevel = function() {
            if (!hasData.call(this)) return false;

            var self = this,
                currentTime = self.playbackController.getTime();

            bufferLevel = self.sourceBufferExt.getBufferLength(buffer, currentTime);

            if (!hasData.call(self)) {
                return false;
            }

            self.notify(self.eventList.ENAME_BUFFER_LEVEL_UPDATED, bufferLevel);
            checkGapBetweenBuffers.call(self);
            checkIfSufficientBuffer.call(self);

            if (bufferLevel < STALL_THRESHOLD) {
                notifyIfSufficientBufferStateChanged.call(self, false);
            }

            return true;
        },

        checkGapBetweenBuffers= function() {
            var leastLevel = this.bufferExt.getLeastBufferLevel(),
                acceptableGap = minBufferTime * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new segments until the gap will be reduced to the suitable size.
            if (actualGap >= acceptableGap && !isBufferLevelOutrun) {
                isBufferLevelOutrun = true;
                this.notify(this.eventList.ENAME_BUFFER_LEVEL_OUTRUN);
            } else if ((actualGap < acceptableGap && isBufferLevelOutrun)) {
                this.notify(this.eventList.ENAME_BUFFER_LEVEL_BALANCED);
                isBufferLevelOutrun = false;
                appendNextMedia.call(this);
            }
        },

        hasEnoughSpaceToAppend = function(callback) {
            var self = this,
                totalBufferedTime = getTotalBufferedTime.call(self),
                startClearing;

            // do not remove any data until the quota is exceeded
            if (totalBufferedTime < criticalBufferLevel) {
                callback.call(self);
                return;
            }

            startClearing = function() {
                clearBuffer.call(self, function() {
                    totalBufferedTime = getTotalBufferedTime.call(self);

                    if (totalBufferedTime < criticalBufferLevel) {
                        callback.call(self);
                    } else {
                        setTimeout(startClearing, minBufferTime * 1000);
                    }
                });
            };

            startClearing.call(self);
        },

        clearBuffer = function(callback) {
            var self = this,
                currentTime = self.playbackController.getTime(),
                removeStart = 0,
                removeEnd,
                range,
                req,
                removeHandler = function(sender, removeStart, removeEnd) {
                    self.notify(self.eventList.ENAME_BUFFER_CLEARED, removeStart, removeEnd);
                    if (!callback) return;
                    callback.call(self, removeEnd - removeStart);
                };

            // we need to remove data that is more than one segment before the video currentTime
            req = self.fragmentController.getExecutedRequestForTime(self.streamProcessor.getFragmentModel(), currentTime);
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);

            range = self.sourceBufferExt.getBufferRange(buffer, currentTime);

            if ((range === null) && (seekTarget === currentTime) && (buffer.buffered.length > 0)) {
                removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
            }
            removeStart = buffer.buffered.start(0);
            self.sourceBufferExt.subscribe(self.sourceBufferExt.eventList.ENAME_SOURCEBUFFER_REMOVE_COMPLETED, self, removeHandler, true);
            self.sourceBufferExt.remove(buffer, removeStart, removeEnd, mediaSource);
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
            this.notify(this.eventList.ENAME_BUFFERING_COMPLETED);
        },

        checkIfSufficientBuffer = function () {
            var timeToEnd = this.playbackController.getTimeToPeriodEnd();

            if ((bufferLevel < minBufferTime) && ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted))) {
                notifyIfSufficientBufferStateChanged.call(this, false);
            } else {
                notifyIfSufficientBufferStateChanged.call(this, true);
            }
        },

        notifyIfSufficientBufferStateChanged = function(state) {
            if (hasSufficientBuffer === state) return;

            hasSufficientBuffer = state;

            this.debug.log(hasSufficientBuffer ? ("Got enough " + type + " buffer to start.") : ("Waiting for more " + type + " buffer before starting playback."));
            this.notify(this.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, state);
        },

        hasData = function() {
            return !!this.representationController && !!this.representationController.getData() && !!buffer;
        },

        updateBufferTimestampOffset = function(MSETimeOffset) {
            // each representation can have its own @presentationTimeOffset, so we should set the offset
            // if it has changed after switching the quality or updating an mpd
            if (buffer.timestampOffset !== MSETimeOffset) {
                buffer.timestampOffset = MSETimeOffset;
            }
        },

        updateBufferState = function() {
            var self = this;

            updateBufferLevel.call(self);
            appendNextMedia.call(self);
        },

        onAppended = function(quality, index) {
            isAppendingInProgress = false;

            if (index !== undefined) {
                onMediaAppended.call(this, index);
            } else {
                onInitAppended.call(this, quality);
            }
        },

        onMediaRejected = function(quality, index) {
            isAppendingInProgress = false;
            this.notify(this.eventList.ENAME_BYTES_REJECTED, quality, index);

            if (waitingForInit()) {
                switchInitData.call(this);
            } else {
                appendNextMedia.call(this);
            }
        },

        onInitAppended = function(quality) {
            currentQuality = quality;

            if (currentQuality === requiredInitQuality) {
                requiredInitQuality = null;
            } else {
                switchInitData.call(this);
            }
        },

        onMediaAppended = function(index) {
            maxAppendedIndex = Math.max(index,maxAppendedIndex);
            checkIfBufferingCompleted.call(this);

            if (waitingForInit()) {
                switchInitData.call(this);
            } else {
                appendNextMedia.call(this);
            }
        },

        appendNextMedia = function() {
            var data;

            if (pendingMedia.length === 0 || isBufferLevelOutrun || isAppendingInProgress || waitingForInit() || isCriticalBufferLevelExceeded()) return;

            data = pendingMedia.shift();
            appendToBuffer.call(this, data.bytes, data.quality, data.index);
        },

        onDataUpdateCompleted = function(sender, data, newRepresentation) {
            var self = this,
                bufferLength;

            updateBufferTimestampOffset.call(self, newRepresentation.MSETimeOffset);

            bufferLength = self.bufferExt.decideBufferLength(self.manifestModel.getValue().minBufferTime, self.playbackController.getPeriodDuration());
            //self.debug.log("Min Buffer time: " + bufferLength);
            if (minBufferTime !== bufferLength) {
                self.setMinBufferTime(bufferLength);
                self.notify(self.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, bufferLength);
            }
        },

        onStreamCompleted = function (sender, model, request) {
            var self = this;

            if (model !== self.streamProcessor.getFragmentModel()) return;

            lastIndex = request.index;
            checkIfBufferingCompleted.call(self);
        },

        onQualityChanged = function(sender, typeValue, oldQuality, newQuality) {
            if (type !== typeValue) return;

            var self = this;

            // if the quality has changed we should append the initialization data again. We get it
            // from the cached array instead of sending a new request
            if (necessaryQuality === newQuality) return;

            updateBufferTimestampOffset.call(self, self.representationController.getRepresentationForQuality(newQuality).MSETimeOffset);

            necessaryQuality = newQuality;
            requiredInitQuality = newQuality;
            switchInitData.call(self);
        },

        switchInitData = function() {
            var self = this;

            if (initializationData[necessaryQuality]) {
                if (isAppendingInProgress) return;

                appendToBuffer.call(self, initializationData[necessaryQuality], necessaryQuality);
            } else {
                // if we have not loaded the init segment for the current quality, do it
                self.notify(self.eventList.ENAME_INIT_REQUESTED, necessaryQuality);
            }
        },

        onPlaybackRateChanged = function(/*sender*/) {
            checkIfSufficientBuffer.call(this);
        };

    return {
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        debug: undefined,
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_CLOSED_CAPTIONING_REQUESTED: "closedCaptioningRequested",
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
        },

        setup: function() {
            this.dataUpdateCompleted = onDataUpdateCompleted;

            this.initSegmentLoaded = onInitializationLoaded;
            this.mediaSegmentLoaded =  onMediaLoaded;
            this.streamCompleted = onStreamCompleted;

            this.qualityChanged = onQualityChanged;

            this.playbackProgress = updateBufferState;
            this.playbackSeeking = updateBufferState;
            this.playbackTimeUpdated = updateBufferState;
            this.playbackRateChanged = onPlaybackRateChanged;
        },

        initialize: function (typeValue, buffer, source, streamProcessor) {
            var self = this;

            type = typeValue;
            self.setMediaSource(source);
            self.setBuffer(buffer);
            self.streamProcessor = streamProcessor;
            self.fragmentController = streamProcessor.fragmentController;
            self.scheduleController = streamProcessor.scheduleController;
            self.representationController = streamProcessor.representationController;
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
            self.bufferExt.setCriticalBufferLevel(criticalBufferLevel);
            hasSufficientBuffer = null;

            isBufferLevelOutrun = false;
            isAppendingInProgress = false;
            requiredInitQuality = 0;
            pendingMedia = [];

            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }

            buffer = null;
        }
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
