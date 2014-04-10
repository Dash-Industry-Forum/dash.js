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
        ready = false,
        initializationData = [],
        seekTarget = -1,
        lastQuality = -1,
        isBufferingCompleted = false,
        deferredAppends = [],
        deferredInitAppend = null,
        deferredStreamComplete = Q.defer(),
        deferredRejectedDataAppend = null,
        deferredBuffersFlatten = null,
        periodInfo = null,
        bufferLevel = 0,
        isQuotaExceeded = false,
        rejectedBytes = null,
        appendingRejectedData = false,
        mediaSource,
        maxAppendedIndex = -1,
        lastIndex = -1,
        type,
        buffer = null,
        minBufferTime,

        onInitializationLoaded = function(sender, bytes, quality) {
            var self = this;

            if (sender !== self.streamProcessor.getFragmentModel()) return;

            self.debug.log("Initialization finished loading: " + type);

            // cache the initialization data to use it next time the quality has changed
            initializationData[quality] = bytes;

            // if this is the initialization data for current quality we need to push it to the buffer
            if (quality === lastQuality) {
                appendToBuffer.call(self, bytes, quality).then(
                    function() {
                        deferredInitAppend.resolve();
                    }
                );
            }
        },

		onMediaLoaded = function (sender, bytes, quality, index) {
			var self = this;

            if ((sender !== self.streamProcessor.getFragmentModel()) || (deferredInitAppend === null)) return;

			//self.debug.log(type + " Bytes finished loading: " + request.streamType + ":" + request.startTime);

            Q.when(deferredInitAppend.promise).then(
                function() {
                    appendToBuffer.call(self, bytes, quality, index).then(
                        function() {
                            maxAppendedIndex = (index > maxAppendedIndex) ? index : maxAppendedIndex;
                            checkIfBufferingCompleted.call(self);
                        }
                    );
                }
            );
		},

        appendToBuffer = function(data, quality, index) {
            var self = this,
                isAppendingRejectedData = (data == rejectedBytes),
                // if we append the rejected data we should use the stored promise instead of creating a new one
                deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(),
                ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred);

            //self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            Q.when((isAppendingRejectedData) || ln < 2 || deferredAppends[ln - 2].promise).then(
                function() {
                    if (!hasData.call(self)) return;
                    hasEnoughSpaceToAppend.call(self).then(
                        function() {
                            if (quality !== lastQuality) {
                                deferred.resolve();
                                if (isAppendingRejectedData) {
                                    deferredRejectedDataAppend = null;
                                    rejectedBytes = null;
                                }
                                return;
                            }

                            Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(
                                function() {
                                    if (!hasData.call(self)) return;
                                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(
                                        function (/*appended*/) {
                                            if (isAppendingRejectedData) {
                                                deferredRejectedDataAppend = null;
                                                rejectedBytes = null;
                                            }

                                            isQuotaExceeded = false;

                                            if (!hasData.call(self)) return;

                                            updateBufferLevel.call(self).then(
                                                function() {
                                                    notifyDataAppended.call(self, index);
                                                    deferred.resolve();
                                                }
                                            );

                                            self.sourceBufferExt.getAllRanges(buffer).then(
                                                function(ranges) {
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
                                                }
                                            );
                                        },
                                        function(result) {
                                            // if the append has failed because the buffer is full we should store the data
                                            // that has not been appended and stop request scheduling. We also need to store
                                            // the promise for this append because the next data can be appended only after
                                            // this promise is resolved.
                                            if (result.err.code === QUOTA_EXCEEDED_ERROR_CODE) {
                                                rejectedBytes = data;
                                                deferredRejectedDataAppend = deferred;
                                                isQuotaExceeded = true;
                                                notifyQuotaExceeded.call(self, index);
                                            }
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );

            return deferred.promise;
        },

        updateBufferLevel = function() {
            if (!hasData.call(this)) return Q.when(false);

            var self = this,
                deferred = Q.defer(),
                currentTime = getWorkingTime.call(self);

            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function(bufferLength) {
                    if (!hasData.call(self)) {
                        deferred.reject();
                        return;
                    }

                    bufferLevel = bufferLength;
                    notifyBufferLevelUpdated.call(self, bufferLevel);
                    checkGapBetweenBuffers.call(self);
                    checkIfSufficientBuffer.call(self);
                    deferred.resolve();
                }
            );

            return deferred.promise;
        },

        checkGapBetweenBuffers= function() {
            var leastLevel = this.bufferExt.getLeastBufferLevel(),
                acceptableGap = minBufferTime * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new segments until the gap will be reduced to the suitable size.
            if (actualGap > acceptableGap && !deferredBuffersFlatten) {
                deferredBuffersFlatten = Q.defer();
                notifyOutrun.call(this);
            } else if ((actualGap < acceptableGap) && deferredBuffersFlatten) {
                deferredBuffersFlatten.resolve();
                deferredBuffersFlatten = null;
                notifyBalance.call(this);
            }
        },

        hasEnoughSpaceToAppend = function() {
            var self = this,
                deferred = Q.defer(),
                removedTime = 0,
                startClearing;

            // do not remove any data until the quota is exceeded
            if (!isQuotaExceeded) {
                return Q.when(true);
            }

            startClearing = function() {
                clearBuffer.call(self).then(
                    function(removedTimeValue) {
                        removedTime += removedTimeValue;
                        if (removedTime >= minBufferTime) {
                            deferred.resolve();
                        } else {
                            setTimeout(startClearing, minBufferTime * 1000);
                        }
                    }
                );
            };

            startClearing.call(self);

            return deferred.promise;
        },

        clearBuffer = function() {
            var self = this,
                deferred = Q.defer(),
                currentTime = self.videoModel.getCurrentTime(),
                removeStart = 0,
                removeEnd,
                req;

            // we need to remove data that is more than one segment before the video currentTime
            req = self.fragmentController.getExecutedRequestForTime(self.streamProcessor.getFragmentModel(), currentTime);
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);

            self.sourceBufferExt.getBufferRange(buffer, currentTime).then(
                function(range) {
                    if ((range === null) && (seekTarget === currentTime) && (buffer.buffered.length > 0)) {
                        removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
                    }
                    removeStart = buffer.buffered.start(0);
                    self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(
                        function() {
                            notifyBufferCleared.call(self, removeStart, removeEnd);
                            deferred.resolve(removeEnd - removeStart);
                        }
                    );
                }
            );

            return deferred.promise;
        },

        checkIfBufferingCompleted = function() {
            var isLastIdxAppended = maxAppendedIndex === (lastIndex - 1);

            if (!isLastIdxAppended || isBufferingCompleted) return;

            isBufferingCompleted = true;
            notifyBufferingCompleted.call(this);
        },

        checkIfSufficientBuffer = function () {
            var timeToEnd = getTimeToEnd.call(this);

            if ((bufferLevel < minBufferTime) && ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted))) {
                this.debug.log("Waiting for more " + type + " buffer before starting playback.");
                notifyBufferLevelChange.call(this, false);
            } else {
                this.debug.log("Got enough " + type + " buffer to start.");
                notifyBufferLevelChange.call(this, true);
            }
        },

        hasData = function() {
            return !!this.representationController && !!this.representationController.getData() && !!buffer;
        },

        getTimeToEnd = function() {
            var currentTime = this.videoModel.getCurrentTime();

            return ((periodInfo.start + periodInfo.duration) - currentTime);
        },

        getWorkingTime = function () {
            var time = -1;

            time = this.videoModel.getCurrentTime();
            //this.debug.log("Working time is video time: " + time);

            return time;
        },

        notifyBufferLevelChange = function(hasSufficientBuffer) {
            this.system.notify("bufferLevelStateChanged", this, hasSufficientBuffer);
        },

        notifyBufferLevelUpdated = function(level) {
            this.system.notify("bufferLevelUpdated", this, level);
        },

        notifyDataAppended = function(index) {
            this.system.notify("bytesAppended", this, bufferLevel, index);
        },

        notifyQuotaExceeded = function(index) {
            this.system.notify("quotaExceeded", this, bufferLevel, index);
        },

        notifyBufferingCompleted = function() {
            this.system.notify("bufferingCompleted");
        },

        notifyBufferCleared = function(startTime, endTime) {
            this.system.notify("bufferCleared", this, startTime, endTime);
        },

        notifyBufferControllerInitialized = function() {
            this.system.notify("bufferControllerInitialized", this);
        },

        notifyInitRequested = function(quality) {
            this.system.notify("initRequested", this, quality);
        },

        notifyOutrun = function() {
            this.system.notify("bufferLevelOutrun", this);
        },

        notifyBalance = function() {
            this.system.notify("bufferLevelBalanced", this);
        },

        onLiveEdgeFound = function(sender/*, liveEdgeTime, periodInfo*/) {
            var self = this;

            if (sender !== self.liveEdgeFinder) return;

            ready = true;
        },

        onDataUpdateCompleted = function(sender, newRepresentation) {
            var self = this;

            if (sender !== self.representationController) return;

            periodInfo = newRepresentation.adaptation.period;

            if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) {
                deferredInitAppend.resolve();
            }

            deferredInitAppend = Q.defer();
            initializationData = [];

            if (!ready) {
                finishInitialization.call(self);
            }
        },

        onStreamCompleted = function (sender, request) {
            var self = this;

            if (sender !== self.streamProcessor.getFragmentModel()) return;

            lastIndex = request.index;
            checkIfBufferingCompleted.call(self);
        },

        onQualityChanged = function(sender, oldQuality, newQuality, dataChanged) {
            var self = this;

            if (sender !== self.scheduleController) return;

            // if the quality has changed we should append the initialization data again. We get it
            // from the cached array instead of sending a new request
            if (oldQuality !== newQuality || dataChanged) {
                deferredInitAppend = Q.defer();
                lastQuality = newQuality;
                if (initializationData[newQuality]) {
                    appendToBuffer.call(this, initializationData[newQuality], newQuality).then(
                        function() {
                            deferredInitAppend.resolve();
                        }
                    );
                } else {
                    // if we have not loaded the init segment for the current quality, do it
                    notifyInitRequested.call(self, newQuality);
                }
            }
        },

        onValidate = function(sender) {
            var self = this,
                manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;

            if (sender !== self.scheduleController) return;

            checkIfSufficientBuffer.call(self);

            if (bufferLevel < STALL_THRESHOLD && !self.videoModel.isStreamStalled(type)) {
                notifyBufferLevelChange.call(self, false);
            }

            self.bufferExt.decideBufferLength(manifestMinBufferTime, periodInfo.duration).then(
                function (time) {
                    //self.debug.log("Min Buffer time: " + time);
                    self.setMinBufferTime(time);
                    self.requestScheduler.adjustExecuteInterval();
                }
            );
        },

        finishInitialization = function(){
            var self = this;

            if (!self.streamProcessor.isDynamic()) {
                ready = true;
            } else {
                self.liveEdgeFinder.searchForLiveEdge();
            }

            self.bufferExt.decideBufferLength(self.manifestModel.getValue().minBufferTime, periodInfo).then(
                function (time) {
                    self.setMinBufferTime(time);
                    notifyBufferControllerInitialized.call(self);
                }
            );
        };

    return {
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,

        setup: function() {
            this.system.mapHandler("liveEdgeFound", undefined, onLiveEdgeFound.bind(this));

            this.system.mapHandler("dataUpdateCompleted", undefined, onDataUpdateCompleted.bind(this));

            this.system.mapHandler("onInitSegmentLoaded", undefined, onInitializationLoaded.bind(this));
            this.system.mapHandler("onMediaSegmentLoaded", undefined, onMediaLoaded.bind(this));
            this.system.mapHandler("streamCompleted", undefined, onStreamCompleted.bind(this));

            this.system.mapHandler("scheduledTimeOccurred", undefined, onValidate.bind(this));
            this.system.mapHandler("qualityChanged", undefined, onQualityChanged.bind(this));
        },

        initialize: function (type, buffer, source, streamProcessor) {
            var self = this;

            self.setMediaSource(source);
            self.setType(type);
            self.setBuffer(buffer);
            self.streamProcessor = streamProcessor;
            self.videoModel = streamProcessor.videoModel;
            self.fragmentController = streamProcessor.fragmentController;
            self.scheduleController = streamProcessor.scheduleController;
            self.representationController = streamProcessor.representationController;
            self.liveEdgeFinder = streamProcessor.liveEdgeFinder;
            self.requestScheduler = streamProcessor.requestScheduler;
        },

        getType: function () {
            return type;
        },

        setType: function (value) {
            type = value;
        },

        getPeriodInfo: function () {
            return periodInfo;
        },

        getStreamProcessor: function() {
            return this.streamProcessor;
        },

        setStreamProcessor: function(value) {
            this.streamProcessor = value;
        },

        getAutoSwitchBitrate : function () {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchBitrate : function (value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },

        getBuffer: function () {
            return buffer;
        },

        getBufferLevel: function() {
            return bufferLevel;
        },

        setBuffer: function (value) {
            buffer = value;
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

        updateBufferState: function() {
            var self = this;

            // if the buffer controller is stopped and the buffer is full we should try to clear the buffer
            // before that we should make sure that we will have enough space to append the data, so we wait
            // until the video time moves forward for a value greater than rejected data duration since the last reject event or since the last seek.
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                //try to append the data that was previosly rejected
                appendToBuffer.call(self, rejectedBytes, lastQuality).then(
                    function(){
                        appendingRejectedData = false;
                    }
                );
            } else {
                updateBufferLevel.call(self);
            }
        },

        updateStalledState: function() {
            if (!ready) return;

            checkIfSufficientBuffer.call(this);
        },

        reset: function(errored) {
            var self = this,
                cancel = function cancelDeferred(d) {
                    if (d) {
                        d.reject();
                        d = null;
                    }
                };

            cancel(deferredInitAppend);
            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            deferredAppends.forEach(cancel);
            deferredAppends = [];
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();

            initializationData = [];
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;

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
