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
        WAITING = "WAITING",
        READY = "READY",
        VALIDATING = "VALIDATING",
        LOADING = "LOADING",
        state = WAITING,
        ready = false,
        started = false,
        waitingForBuffer = false,
        initialPlayback = true,
        initializationData = [],
        seeking = false,
        //mseSetTime = false,
        seekTarget = -1,
        dataChanged = true,
        availableRepresentations,
        currentRepresentation,
        playingTime,
        requiredQuality = -1,
        currentQuality = -1,
        stalled = false,
        isDynamic = false,
        isBufferingCompleted = false,
        deferredAppends = [],
        deferredInitAppend = null,
        deferredStreamComplete = Q.defer(),
        deferredRejectedDataAppend = null,
        deferredBuffersFlatten = null,
        periodInfo = null,
        fragmentsToLoad = 0,
        fragmentModel = null,
        bufferLevel = 0,
        isQuotaExceeded = false,
        rejectedBytes = null,
        fragmentDuration = 0,
        appendingRejectedData = false,
        mediaSource,
        timeoutId = null,

        liveEdgeSearchRange = null,
        liveEdgeInitialSearchPosition = null,
        liveEdgeSearchStep = null,
        deferredLiveEdge,
        useBinarySearch = false,

        type,
        data = null,
        buffer = null,
        minBufferTime,

        playListMetrics = null,
        playListTraceMetrics = null,
        playListTraceMetricsClosed = true,

        setState = function (value) {
            var self = this;
            //self.debug.log("BufferController " + type + " setState to:" + value);
            state = value;
            // Notify the FragmentController about any state change to track the loading process of each active BufferController
            if (fragmentModel !== null) {
                self.fragmentController.onBufferControllerStateChange();
            }
        },

        clearPlayListTraceMetrics = function (endTime, stopreason) {
            var duration = 0,
                startTime = null;

            if (playListTraceMetricsClosed === false) {
                startTime = playListTraceMetrics.start;
                duration = endTime.getTime() - startTime.getTime();

                playListTraceMetrics.duration = duration;
                playListTraceMetrics.stopreason = stopreason;

                playListTraceMetricsClosed = true;
            }
        },
/*
        setCurrentTimeOnVideo = function (time) {
            var ct = this.videoModel.getCurrentTime();
            if (ct === time) {
                return;
            }

            this.debug.log("Set current time on video: " + time);
            this.system.notify("setCurrentTime");
            this.videoModel.setCurrentTime(time);
        },
*/
        startPlayback = function () {
            if (!ready || !started) {
                return;
            }

            //this.debug.log("BufferController begin " + type + " validation");
            setState.call(this, READY);

            this.requestScheduler.startScheduling(this, validate);
            fragmentModel = this.fragmentController.attachBufferController(this);
        },

        doStart = function () {
            var currentTime;

            if(this.requestScheduler.isScheduled(this)) {
                return;
            }

            if (seeking === false) {
                currentTime = new Date();
                clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
                playListMetrics = this.metricsModel.addPlayList(type, currentTime, 0, MediaPlayer.vo.metrics.PlayList.INITIAL_PLAY_START_REASON);
                //mseSetTime = true;
            }

            this.debug.log("BufferController " + type + " start.");

            started = true;
            waitingForBuffer = true;
            startPlayback.call(this);
        },

        doSeek = function (time) {
            var currentTime;

            this.debug.log("BufferController " + type + " seek: " + time);
            seeking = true;
            seekTarget = time;
            currentTime = new Date();
            clearPlayListTraceMetrics(currentTime, MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
            playListMetrics = this.metricsModel.addPlayList(type, currentTime, seekTarget, MediaPlayer.vo.metrics.PlayList.SEEK_START_REASON);

            doStart.call(this);
        },

        doStop = function () {
            if (state === WAITING) return;

            this.debug.log("BufferController " + type + " stop.");
            setState.call(this, isBufferingCompleted ? READY : WAITING);
            this.requestScheduler.stopScheduling(this);
            // cancel the requests that have already been created, but not loaded yet.
            this.fragmentController.cancelPendingRequestsForModel(fragmentModel);
            started = false;
            waitingForBuffer = false;

            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.USER_REQUEST_STOP_REASON);
        },

        updateRepresentations = function (data, periodInfo) {
            var self = this,
                deferred = Q.defer(),
                manifest = self.manifestModel.getValue();
            self.manifestExt.getDataIndex(data, manifest, periodInfo.index).then(
                function(idx) {
                    self.manifestExt.getAdaptationsForPeriod(manifest, periodInfo).then(
                        function(adaptations) {
                            self.manifestExt.getRepresentationsForAdaptation(manifest, adaptations[idx]).then(
                                function(representations) {
                                    deferred.resolve(representations);
                                }
                            );
                        }
                    );
            }
            );

            return deferred.promise;
        },

        getRepresentationForQuality = function (quality) {
            return availableRepresentations[quality];
        },

        finishValidation = function () {
            var self = this;
            if (state === LOADING) {
                if (stalled) {
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
                setState.call(self, READY);
            }
        },

        onBytesLoadingStart = function(request) {
			if (this.fragmentController.isInitializationRequest(request)) {
				setState.call(this, READY);
			} else {
				setState.call(this, LOADING);
                var self = this,
                    time = self.fragmentController.getLoadingTime(self);
                if (timeoutId !== null) return;
                timeoutId =  setTimeout(function(){
                    if (!hasData()) return;

                    setState.call(self, READY);
                    requestNewFragment.call(self);
                    timeoutId = null;
                }, time);
			}
        },

        onBytesLoaded = function (request, response) {
			if (this.fragmentController.isInitializationRequest(request)) {
				onInitializationLoaded.call(this, request, response);
			} else {
				onMediaLoaded.call(this, request, response);
			}
        },

		onMediaLoaded = function (request, response) {
			var self = this,
                currentRepresentation = getRepresentationForQuality.call(self, request.quality),
                eventStreamAdaption = this.manifestExt.getEventStreamForAdaptationSet(self.getData()),
                eventStreamRepresentation = this.manifestExt.getEventStreamForRepresentation(self.getData(),currentRepresentation);

			//self.debug.log(type + " Bytes finished loading: " + request.streamType + ":" + request.startTime);

            if (!fragmentDuration && !isNaN(request.duration)) {
                fragmentDuration = request.duration;
            }

			self.fragmentController.process(response.data).then(
				function (data) {
					if (data !== null && deferredInitAppend !== null) {
                        if(eventStreamAdaption.length > 0 || eventStreamRepresentation.length > 0) {
                            handleInbandEvents.call(self,data,request,eventStreamAdaption,eventStreamRepresentation).then(
                                function(events) {
                                    self.eventController.addInbandEvents(events);
                                }
                            );
                        }

                        Q.when(deferredInitAppend.promise).then(
                            function() {
                                deleteInbandEvents.call(self,data).then(
                                    function(data) {
                                        appendToBuffer.call(self, data, request.quality, request.index).then(
                                            function() {
                                                deferredStreamComplete.promise.then(
                                                    function(lastRequest) {
                                                        if ((lastRequest.index - 1) === request.index && !isBufferingCompleted) {
                                                            isBufferingCompleted = true;
                                                            if (stalled) {
                                                                stalled = false;
                                                                self.videoModel.stallStream(type, stalled);
                                                            }
                                                            setState.call(self, READY);
                                                            self.system.notify("bufferingCompleted");
                                                        }
                                                    }
                                                );
                                            }
                                        );
                                    }
                                );}
                        );
					} else {
						self.debug.log("No " + type + " bytes to push.");
					}
				}
			);
		},

        appendToBuffer = function(data, quality, index) {
            var self = this,
                req,
                isInit = index === undefined,
                isAppendingRejectedData = rejectedBytes && (data == rejectedBytes.data),
                // if we append the rejected data we should use the stored promise instead of creating a new one
                deferred = isAppendingRejectedData ? deferredRejectedDataAppend : Q.defer(),
                ln = isAppendingRejectedData ? deferredAppends.length : deferredAppends.push(deferred),
                currentVideoTime = self.videoModel.getCurrentTime(),
                currentTime = new Date();

            //self.debug.log("Push (" + type + ") bytes: " + data.byteLength);

            if (playListTraceMetricsClosed === true && state !== WAITING && requiredQuality !== -1) {
                playListTraceMetricsClosed = false;
                playListTraceMetrics = self.metricsModel.appendPlayListTrace(playListMetrics, currentRepresentation.id, null, currentTime, currentVideoTime, null, 1.0, null);
            }

            Q.when((isAppendingRejectedData) || ln < 2 || deferredAppends[ln - 2].promise).then(
                function() {
                    if (!hasData()) return;
                    hasEnoughSpaceToAppend.call(self).then(
                        function() {
                            // The segment should be rejected if this an init segment and its quality does not match
                            // the required quality or if this a media segment and its quality does not match the
                            // quality of the last appended init segment. This means that media segment of the old
                            // quality can be appended providing init segment for a new required quality has not been
                            // appended yet.
                            if ((quality !== requiredQuality && isInit) || (quality !== currentQuality && !isInit)) {
                                req = fragmentModel.getExecutedRequestForQualityAndIndex(quality, index);
                                // if request for an unappropriate quality has not been removed yet, do it now
                                if (req) {
                                    window.removed = req;
                                    fragmentModel.removeExecutedRequest(req);
                                    // if index is not undefined it means that this is a media segment, so we should
                                    // request the segment for the same time but with an appropriate quality
                                    // If this is init segment do nothing, because it will be requested in loadInitialization method
                                    if (!isInit) {
                                        self.indexHandler.getSegmentRequestForTime(currentRepresentation, req.startTime).then(onFragmentRequest.bind(self));
                                    }
                                }

                                deferred.resolve();
                                if (isAppendingRejectedData) {
                                    deferredRejectedDataAppend = null;
                                    rejectedBytes = null;
                                }
                                return;
                            }

                            Q.when(deferredBuffersFlatten ? deferredBuffersFlatten.promise : true).then(
                                function() {
                                    if (!hasData()) return;
                                    self.sourceBufferExt.append(buffer, data, self.videoModel).then(
                                        function (/*appended*/) {
                                            if (isAppendingRejectedData) {
                                                deferredRejectedDataAppend = null;
                                                rejectedBytes = null;
                                            }

                                            // index can be undefined only for init segments. In this case
                                            // change currentQuality to a quality of a new appended init segment.
                                            if (isInit) {
                                                currentQuality = quality;
                                            }

                                            if (!self.requestScheduler.isScheduled(self) && isSchedulingRequired.call(self)) {
                                                doStart.call(self);
                                            }

                                            isQuotaExceeded = false;

                                            updateBufferLevel.call(self).then(
                                                function() {
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
                                                rejectedBytes = {data: data, quality: quality, index: index};
                                                deferredRejectedDataAppend = deferred;
                                                isQuotaExceeded = true;
                                                fragmentsToLoad = 0;
                                                // stop scheduling new requests
                                                doStop.call(self);
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
            if (!hasData()) return Q.when(false);

            var self = this,
                deferred = Q.defer(),
                currentTime = getWorkingTime.call(self);



            self.manifestExt.getMpd(self.manifestModel.getValue()).then(
                function(mpd) {
                    var range = self.timelineConverter.calcSegmentAvailabilityRange(currentRepresentation, isDynamic);
                    self.metricsModel.addDVRInfo(type, currentTime, mpd, range);
                }
            );

            self.sourceBufferExt.getBufferLength(buffer, currentTime).then(
                function(bufferLength) {
                    if (!hasData()) {
                        deferred.reject();
                        return;
                    }

                    bufferLevel = bufferLength;
                    self.metricsModel.addBufferLevel(type, new Date(), bufferLevel);
                    checkGapBetweenBuffers.call(self);
                    checkIfSufficientBuffer.call(self);
                    deferred.resolve();
                }
            );

            return deferred.promise;
        },

        handleInbandEvents = function(data,request,adaptionSetInbandEvents,representationInbandEvents) {
            var events = [],
                i = 0,
                identifier,
                size,
                expTwo = Math.pow(256,2),
                expThree = Math.pow(256,3),
                segmentStarttime = Math.max(isNaN(request.startTime) ? 0 : request.startTime,0),
                eventStreams = [],
                inbandEvents;

            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            inbandEvents = adaptionSetInbandEvents.concat(representationInbandEvents);
            for(var loop = 0; loop < inbandEvents.length; loop++) {
                eventStreams[inbandEvents[loop].schemeIdUri] = inbandEvents[loop];
            }
            while(i<data.length) {
                identifier = String.fromCharCode(data[i+4],data[i+5],data[i+6],data[i+7]); // box identifier
                size = data[i]*expThree + data[i+1]*expTwo + data[i+2]*256 + data[i+3]*1; // size of the box
                if( identifier == "moov" || identifier == "moof") {
                    break;
                } else if(identifier == "emsg") {
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
                    var schemeIdUri = eventBox[0],
                        value = eventBox[1],
                        timescale = eventBox[2],
                        presentationTimeDelta = eventBox[3],
                        duration = eventBox[4],
                        id = eventBox[5],
                        messageData = eventBox[6],
                        presentationTime = segmentStarttime*timescale+presentationTimeDelta;

                    if(eventStreams[schemeIdUri]) {
                        var event = new Dash.vo.Event();
                        event.eventStream = eventStreams[schemeIdUri];
                        event.eventStream.value = value;
                        event.eventStream.timescale = timescale;
                        event.duration = duration;
                        event.id = id;
                        event.presentationTime = presentationTime;
                        event.messageData = messageData;
                        event.presentationTimeDelta = presentationTimeDelta;
                        events.push(event);
                    }
                }
                i += size;
            }
            return Q.when(events);
        },

        deleteInbandEvents = function(data) {

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

            return Q.when(modData.subarray(0,j));

        },

        checkGapBetweenBuffers= function() {
            var leastLevel = this.bufferExt.getLeastBufferLevel(),
                acceptableGap = fragmentDuration * 2,
                actualGap = bufferLevel - leastLevel;

            // if the gap betweeen buffers is too big we should create a promise that prevents appending data to the current
            // buffer and requesting new segments until the gap will be reduced to the suitable size.
            if (actualGap > acceptableGap && !deferredBuffersFlatten) {
                fragmentsToLoad = 0;
                deferredBuffersFlatten = Q.defer();
            } else if ((actualGap < acceptableGap) && deferredBuffersFlatten) {
                deferredBuffersFlatten.resolve();
                deferredBuffersFlatten = null;
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
                        if (removedTime >= fragmentDuration) {
                            deferred.resolve();
                        } else {
                            setTimeout(startClearing, fragmentDuration * 1000);
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
            req = self.fragmentController.getExecutedRequestForTime(fragmentModel, currentTime);
            removeEnd = (req && !isNaN(req.startTime)) ? req.startTime : Math.floor(currentTime);
            fragmentDuration = (req && !isNaN(req.duration)) ? req.duration : 1;

            self.sourceBufferExt.getBufferRange(buffer, currentTime).then(
                function(range) {
                    if ((range === null) && (seekTarget === currentTime) && (buffer.buffered.length > 0)) {
                        removeEnd = buffer.buffered.end(buffer.buffered.length -1 );
                    }
                    removeStart = buffer.buffered.start(0);
                    self.sourceBufferExt.remove(buffer, removeStart, removeEnd, periodInfo.duration, mediaSource).then(
                        function() {
                            // after the data has been removed from the buffer we should remove the requests from the list of
                            // the executed requests for which playback time is inside the time interval that has been removed from the buffer
                            self.fragmentController.removeExecutedRequestsBeforeTime(fragmentModel, removeEnd);
                            deferred.resolve(removeEnd - removeStart);
                        }
                    );
                }
            );

            return deferred.promise;
        },

        onInitializationLoaded = function(request, response) {
            var self = this,
                initData = response.data,
                quality = request.quality;

            self.debug.log("Initialization finished loading: " + request.streamType);

            self.fragmentController.process(initData).then(
                function (data) {
                    if (data !== null) {
                        // cache the initialization data to use it next time the quality has changed
                        initializationData[quality] = data;

                        // if this is the initialization data for current quality we need to push it to the buffer
                        if (quality === requiredQuality) {
                            appendToBuffer.call(self, data, request.quality).then(
                                function() {
                                    deferredInitAppend.resolve();
                                }
                            );
                        }
                    } else {
                        self.debug.log("No " + type + " bytes to push.");
                    }
                }
            );
        },

        onBytesError = function () {
            // remove the failed request from the list
            /*
            for (var i = fragmentRequests.length - 1; i >= 0 ; --i) {
                if (fragmentRequests[i].startTime === request.startTime) {
                    if (fragmentRequests[i].url === request.url) {
                        fragmentRequests.splice(i, 1);
                    }
                    break;
                }
            }
            */

            if (state === LOADING) {
                setState.call(this, READY);
            }

            this.system.notify("segmentLoadingFailed");
        },

        searchForLiveEdge = function() {
            var self = this,
                availabilityRange = currentRepresentation.segmentAvailabilityRange, // all segments are supposed to be available in this interval
                searchTimeSpan = 12 * 60 * 60; // set the time span that limits our search range to a 12 hours in seconds

            // start position of the search, it is supposed to be a live edge - the last available segment for the current mpd
            liveEdgeInitialSearchPosition = availabilityRange.end;
            // we should search for a live edge in a time range which is limited by searchTimeSpan.
            liveEdgeSearchRange = {start: Math.max(0, (liveEdgeInitialSearchPosition - searchTimeSpan)), end: liveEdgeInitialSearchPosition + searchTimeSpan};
            // we have to use half of the availability interval (window) as a search step to ensure that we find a segment in the window
            liveEdgeSearchStep = Math.floor((availabilityRange.end - availabilityRange.start) / 2);
            // start search from finding a request for the initial search time

            deferredLiveEdge = Q.defer();

            if (currentRepresentation.useCalculatedLiveEdgeTime) {
                deferredLiveEdge.resolve(liveEdgeInitialSearchPosition);
            } else {
                self.indexHandler.getSegmentRequestForTime(currentRepresentation, liveEdgeInitialSearchPosition).then(findLiveEdge.bind(self, liveEdgeInitialSearchPosition, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
            }

            return deferredLiveEdge.promise;
        },

        findLiveEdge = function (searchTime, onSuccess, onError, request) {
            var self = this;
            if (request === null) {
                // request can be null because it is out of the generated list of request. In this case we need to
                // update the list and the segmentAvailabilityRange
                currentRepresentation.segments = null;
                currentRepresentation.segmentAvailabilityRange = {start: searchTime - liveEdgeSearchStep, end: searchTime + liveEdgeSearchStep};
                // try to get request object again
                self.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, onSuccess, onError));
            } else {
                self.fragmentController.isFragmentExists(request).then(
                    function(isExist) {
                        if (isExist) {
                            onSuccess.call(self, request, searchTime);
                        } else {
                            onError.call(self, request, searchTime);
                        }
                    }
                );
            }
        },

        onSearchForSegmentFailed = function(request, lastSearchTime) {
            var searchTime,
                searchInterval;

            if (useBinarySearch) {
                binarySearch.call(this, false, lastSearchTime);
                return;
            }

            // we have not found any available segments yet, update the search interval
            searchInterval = lastSearchTime - liveEdgeInitialSearchPosition;
            // we search forward and backward from the start position, increasing the search interval by the value of the half of the availability interavl - liveEdgeSearchStep
            searchTime = searchInterval > 0 ? (liveEdgeInitialSearchPosition - searchInterval) : (liveEdgeInitialSearchPosition + Math.abs(searchInterval) + liveEdgeSearchStep);

            // if the search time is out of the range bounds we have not be able to find live edge, stop trying
            if (searchTime < liveEdgeSearchRange.start && searchTime > liveEdgeSearchRange.end) {
                this.system.notify("segmentLoadingFailed");
            } else {
                // continue searching for a first available segment
                setState.call(this, READY);
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
            }
        },

        onSearchForSegmentSucceeded = function (request, lastSearchTime) {
            var startTime = request.startTime,
                self = this,
                searchTime;

            if (!useBinarySearch) {
                // if the fragment duration is unknown we cannot use binary search because we will not be able to
                // decide when to stop the search, so let the start time of the current segment be a liveEdge
                if (fragmentDuration === 0) {
                    deferredLiveEdge.resolve(startTime);
                    return;
                }
                useBinarySearch = true;
                liveEdgeSearchRange.end = startTime + (2 * liveEdgeSearchStep);

                //if the first request has succeeded we should check next segment - if it does not exist we have found live edge,
                // otherwise start binary search to find live edge
                if (lastSearchTime === liveEdgeInitialSearchPosition) {
                    searchTime = lastSearchTime + fragmentDuration;
                    this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(self, searchTime, function() {
                        binarySearch.call(self, true, searchTime);
                    }, function(){
                        deferredLiveEdge.resolve(searchTime);
                    }));

                    return;
                }
            }

            binarySearch.call(this, true, lastSearchTime);
        },

        binarySearch = function(lastSearchSucceeded, lastSearchTime) {
            var isSearchCompleted,
                searchTime;

            if (lastSearchSucceeded) {
                liveEdgeSearchRange.start = lastSearchTime;
            } else {
                liveEdgeSearchRange.end = lastSearchTime;
            }

            isSearchCompleted = (Math.floor(liveEdgeSearchRange.end - liveEdgeSearchRange.start)) <= fragmentDuration;

            if (isSearchCompleted) {
                // search completed, we should take the time of the last found segment. If the last search succeded we
                // take this time. Otherwise, we should subtract the time of the search step which is equal to fragment duaration
                deferredLiveEdge.resolve(lastSearchSucceeded ? lastSearchTime : (lastSearchTime - fragmentDuration));
            } else {
                // update the search time and continue searching
                searchTime = ((liveEdgeSearchRange.start + liveEdgeSearchRange.end) / 2);
                this.indexHandler.getSegmentRequestForTime(currentRepresentation, searchTime).then(findLiveEdge.bind(this, searchTime, onSearchForSegmentSucceeded, onSearchForSegmentFailed));
            }
        },

        signalStreamComplete = function (request) {
            this.debug.log(type + " Stream is complete.");
            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.END_OF_CONTENT_STOP_REASON);
            doStop.call(this);
            deferredStreamComplete.resolve(request);
        },

        loadInitialization = function () {
            var initializationPromise = null;

            if (initialPlayback) {
                this.debug.log("Marking a special seek for initial " + type + " playback.");

                // If we weren't already seeking, 'seek' to the beginning of the stream.
                if (!seeking) {
                    seeking = true;
                    seekTarget = 0;
                }

                initialPlayback = false;
            }

            if (dataChanged) {
                if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) {
                    deferredInitAppend.resolve();
                }

                deferredInitAppend = Q.defer();
                initializationData = [];
                initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
            } else {
                initializationPromise = Q.when(null);
                // if the quality has changed we should append the initialization data again. We get it
                // from the cached array instead of sending a new request
                if ((currentQuality !== requiredQuality) || (currentQuality === -1)) {
                    if (deferredInitAppend && Q.isPending(deferredInitAppend.promise)) return Q.when(null);

                    deferredInitAppend = Q.defer();
                    if (initializationData[requiredQuality]) {
                        appendToBuffer.call(this, initializationData[requiredQuality], requiredQuality).then(
                            function() {
                                deferredInitAppend.resolve();
                            }
                        );
                    } else {
                        // if we have not loaded the init segment for the current quality, do it
                        initializationPromise = this.indexHandler.getInitRequest(availableRepresentations[requiredQuality]);
                    }
                }
            }
            return initializationPromise;
        },

        loadNextFragment = function () {
            var promise,
                self = this;

            if (dataChanged && !seeking) {
                //time = self.videoModel.getCurrentTime();
                self.debug.log("Data changed - loading the " + type + " fragment for time: " + playingTime);
                promise = self.indexHandler.getSegmentRequestForTime(currentRepresentation, playingTime);
            } else {
                var deferred = Q.defer(),
                    segmentTime;
                promise = deferred.promise;

                Q.when(seeking ? seekTarget : self.indexHandler.getCurrentTime(currentRepresentation)).then(
                    function (time) {
                        self.sourceBufferExt.getBufferRange(buffer, time).then(
                            function (range) {
                                if (seeking) currentRepresentation.segments = null;

                                seeking = false;
                                segmentTime = range ? range.end : time;

                                //self.debug.log("Loading the " + type + " fragment for time: " + segmentTime);
                                self.indexHandler.getSegmentRequestForTime(currentRepresentation, segmentTime).then(
                                    function (request) {
                                        deferred.resolve(request);
                                    },
                                    function () {
                                        deferred.reject();
                                    }
                                );
                            },
                            function () {
                                deferred.reject();
                            }
                        );
                    },
                    function () {
                        deferred.reject();
                    }
                );
            }

            return promise;
        },

        onFragmentRequest = function (request) {
            var self = this;

            if (request !== null) {
                // If we have already loaded the given fragment ask for the next one. Otherwise prepare it to get loaded
                if (self.fragmentController.isFragmentLoadedOrPending(self, request)) {
                    if (request.action !== "complete") {
                        self.indexHandler.getNextSegmentRequest(currentRepresentation).then(onFragmentRequest.bind(self));
                    } else {
                        doStop.call(self);
                        setState.call(self, READY);
                    }
                } else {
                    //self.debug.log("Loading fragment: " + request.streamType + ":" + request.startTime);
                    Q.when(deferredBuffersFlatten? deferredBuffersFlatten.promise : true).then(
                        function() {
                            self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                                function() {
                                    setState.call(self, READY);
                                }
                            );
                        }
                    );
                }
            } else {
                setState.call(self, READY);
            }
        },

        checkIfSufficientBuffer = function () {
            if (waitingForBuffer) {
                var timeToEnd = getTimeToEnd.call(this);

                if ((bufferLevel < minBufferTime) && ((minBufferTime < timeToEnd) || (minBufferTime >= timeToEnd && !isBufferingCompleted))) {
                    if (!stalled) {
                        this.debug.log("Waiting for more " + type + " buffer before starting playback.");
                        stalled = true;
                        this.videoModel.stallStream(type, stalled);
                    }
                } else {
                    this.debug.log("Got enough " + type + " buffer to start.");
                    waitingForBuffer = false;
                    stalled = false;
                    this.videoModel.stallStream(type, stalled);
                }
            }
        },

        isSchedulingRequired = function() {
            var isPaused = this.videoModel.isPaused();

            return (!isPaused || (isPaused && this.scheduleWhilePaused));
        },

        hasData = function() {
           return !!data && !!buffer;
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

        getRequiredFragmentCount = function() {
            var self =this,
                playbackRate = self.videoModel.getPlaybackRate(),
                actualBufferedDuration = bufferLevel / Math.max(playbackRate, 1),
                deferred = Q.defer();

            self.bufferExt.getRequiredBufferLength(waitingForBuffer, self.requestScheduler.getExecuteInterval(self)/1000, isDynamic, periodInfo.duration).then(
                function (requiredBufferLength) {
                    self.indexHandler.getSegmentCountForDuration(currentRepresentation, requiredBufferLength, actualBufferedDuration).then(
                        function(count) {
                            deferred.resolve(count);
                        }
                    );
                }
            );

            return deferred.promise;
        },

        requestNewFragment = function() {
            var self = this,
                pendingRequests = self.fragmentController.getPendingRequests(self),
                loadingRequests = self.fragmentController.getLoadingRequests(self),
                ln = (pendingRequests ? pendingRequests.length : 0) + (loadingRequests ? loadingRequests.length : 0);

            if ((fragmentsToLoad - ln) > 0) {
                fragmentsToLoad--;
                loadNextFragment.call(self).then(onFragmentRequest.bind(self));
            } else {

                if (state === VALIDATING) {
                    setState.call(self, READY);
                }

                finishValidation.call(self);
            }
        },

        validate = function () {
            var self = this,
                newQuality,
                qualityChanged = false,
                now = new Date(),
                currentVideoTime = self.videoModel.getCurrentTime();

            //self.debug.log("BufferController.validate() " + type + " | state: " + state);
            //self.debug.log(type + " Playback rate: " + self.videoModel.getElement().playbackRate);
            //self.debug.log(type + " Working time: " + currentTime);
            //self.debug.log(type + " Video time: " + currentVideoTime);
            //self.debug.log("Current " + type + " buffer length: " + bufferLevel);

            checkIfSufficientBuffer.call(self);
            //mseSetTimeIfPossible.call(self);

            if (!isSchedulingRequired.call(self) && !initialPlayback && !dataChanged) {
                doStop.call(self);
                return;
            }

            if (bufferLevel < STALL_THRESHOLD && !stalled) {
                self.debug.log("Stalling " + type + " Buffer: " + type);
                clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REBUFFERING_REASON);
                stalled = true;
                waitingForBuffer = true;
                self.videoModel.stallStream(type, stalled);
            }

            if (state === READY) {
                setState.call(self, VALIDATING);
                var manifestMinBufferTime = self.manifestModel.getValue().minBufferTime;
                self.bufferExt.decideBufferLength(manifestMinBufferTime, periodInfo.duration, waitingForBuffer).then(
                    function (time) {
                        //self.debug.log("Min Buffer time: " + time);
                        self.setMinBufferTime(time);
                        self.requestScheduler.adjustExecuteInterval();
                    }
                );
                self.abrController.getPlaybackQuality(type, data).then(
                    function (result) {
                        var quality = result.quality;
                        //self.debug.log(type + " Playback quality: " + quality);
                        //self.debug.log("Populate " + type + " buffers.");

                        if (quality !== undefined) {
                            newQuality = quality;
                        }

                        qualityChanged = (quality !== requiredQuality);

                        if (qualityChanged === true) {
                            requiredQuality = newQuality;
                            // The quality has beeen changed so we should abort the requests that has not been loaded yet
                            self.fragmentController.cancelPendingRequestsForModel(fragmentModel);
                            currentRepresentation = getRepresentationForQuality.call(self, newQuality);
                            if (currentRepresentation === null || currentRepresentation === undefined) {
                                throw "Unexpected error!";
                            }

                            // each representation can have its own @presentationTimeOffset, so we should set the offset
                            // if it has changed after switching the quality
                            if (buffer.timestampOffset !== currentRepresentation.MSETimeOffset) {
                                buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                            }

                            clearPlayListTraceMetrics(new Date(), MediaPlayer.vo.metrics.PlayList.Trace.REPRESENTATION_SWITCH_STOP_REASON);
                            self.metricsModel.addRepresentationSwitch(type, now, currentVideoTime, currentRepresentation.id);
                        }

                        //self.debug.log(qualityChanged ? (type + " Quality changed to: " + quality) : "Quality didn't change.");
                        return getRequiredFragmentCount.call(self, quality);
                    }
                ).then(
                    function (count) {
                        fragmentsToLoad = count;
                        loadInitialization.call(self).then(
                            function (request) {
                                if (request !== null) {
                                    //self.debug.log("Loading initialization: " + request.streamType + ":" + request.startTime);
                                    //self.debug.log(request);
                                    self.fragmentController.prepareFragmentForLoading(self, request, onBytesLoadingStart, onBytesLoaded, onBytesError, signalStreamComplete).then(
                                        function() {
                                            setState.call(self, READY);
                                        }
                                    );

                                    dataChanged = false;
                                }
                            }
                        );
                        // We should request the media fragment w/o waiting for the next validate call
                        // or until the initialization fragment has been loaded
                        requestNewFragment.call(self);
                    }
                );
            } else if (state === VALIDATING) {
                setState.call(self, READY);
            }
        };

    return {
        videoModel: undefined,
        metricsModel: undefined,
        manifestExt: undefined,
        manifestModel: undefined,
        bufferExt: undefined,
        sourceBufferExt: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        indexHandler: undefined,
        debug: undefined,
        system: undefined,
        errHandler: undefined,
        scheduleWhilePaused: undefined,
        eventController : undefined,
        timelineConverter:undefined,
        initialize: function (type, periodInfo, data, buffer, videoModel, scheduler, fragmentController, source, eventController) {
            var self = this,
                manifest = self.manifestModel.getValue();

            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.setMediaSource(source);
            self.setVideoModel(videoModel);
            self.setType(type);
            self.setBuffer(buffer);
            self.setScheduler(scheduler);
            self.setFragmentController(fragmentController);
            self.setEventController(eventController);

            self.updateData(data, periodInfo).then(
                function(){
                    if (!isDynamic) {
                        ready = true;
                        startPlayback.call(self);
                        return;
                    }

                    searchForLiveEdge.call(self).then(
                        function(liveEdgeTime) {
                            // step back from a found live edge time to be able to buffer some data
                            var startTime = Math.max((liveEdgeTime - minBufferTime), currentRepresentation.segmentAvailabilityRange.start),
                                segmentStart;
                            // get a request for a start time
                            self.indexHandler.getSegmentRequestForTime(currentRepresentation, startTime).then(function(request) {
                                self.system.notify("liveEdgeFound", periodInfo.liveEdge, liveEdgeTime, periodInfo);
                                segmentStart = request.startTime;
                                // set liveEdge to be in the middle of the segment time to avoid a possible gap between
                                // currentTime and buffered.start(0)
                                periodInfo.liveEdge = segmentStart + (fragmentDuration / 2);
                                ready = true;
                                startPlayback.call(self);
                                doSeek.call(self, segmentStart);
                            });
                        }
                    );
                }
            );

            self.indexHandler.setIsDynamic(isDynamic);
            self.bufferExt.decideBufferLength(manifest.minBufferTime, periodInfo, waitingForBuffer).then(
                function (time) {
                    self.setMinBufferTime(time);
                }
            );
        },

        getType: function () {
            return type;
        },

        setType: function (value) {
            type = value;

            if (this.indexHandler !== undefined) {
                this.indexHandler.setType(value);
            }
        },

        getPeriodInfo: function () {
            return periodInfo;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        getScheduler: function () {
            return this.requestScheduler;
        },

        setScheduler: function (value) {
            this.requestScheduler = value;
        },

        getFragmentController: function () {
            return this.fragmentController;
        },

        setFragmentController: function (value) {
            this.fragmentController = value;
        },

        setEventController: function(value) {
            this.eventController = value;
        },

        getAutoSwitchBitrate : function () {
            var self = this;
            return self.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchBitrate : function (value) {
            var self = this;
            self.abrController.setAutoSwitchBitrate(value);
        },

        getData: function () {
            return data;
        },

        updateData: function(dataValue, periodInfoValue) {
            var self = this,
                deferred = Q.defer(),
                from = data;

            if (!from) {
                from = dataValue;
            }
            doStop.call(self);

            updateRepresentations.call(self, dataValue, periodInfoValue).then(
                function(representations) {
                    availableRepresentations = representations;
                    periodInfo = periodInfoValue;
                    self.abrController.getPlaybackQuality(type, from).then(
                        function (result) {
                            if (!currentRepresentation) {
                                currentRepresentation = getRepresentationForQuality.call(self, result.quality);
                            }
                            self.indexHandler.getCurrentTime(currentRepresentation).then(
                                function (time) {
                                    dataChanged = true;
                                    playingTime = time;
                                    requiredQuality = result.quality;
                                    currentRepresentation = getRepresentationForQuality.call(self, result.quality);
                                    buffer.timestampOffset = currentRepresentation.MSETimeOffset;
                                    if (currentRepresentation.segmentDuration) {
                                        fragmentDuration = currentRepresentation.segmentDuration;
                                    }
                                    data = dataValue;
                                    self.bufferExt.updateData(data, type);
                                    self.seek(time);

                                    self.indexHandler.updateSegmentList(currentRepresentation).then(
                                        function() {
                                            deferred.resolve();
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

        getCurrentRepresentation: function() {
            return currentRepresentation;
        },

        getBuffer: function () {
            return buffer;
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

        isReady: function() {
            return state === READY;
        },

        isBufferingCompleted : function() {
            return isBufferingCompleted;
        },

        clearMetrics: function () {
            var self = this;

            if (type === null || type === "") {
                return;
            }

            self.metricsModel.clearCurrentMetricsForType(type);
        },

        updateBufferState: function() {
            var self = this;

            // if the buffer controller is stopped and the buffer is full we should try to clear the buffer
            // before that we should make sure that we will have enough space to append the data, so we wait
            // until the video time moves forward for a value greater than rejected data duration since the last reject event or since the last seek.
            if (isQuotaExceeded && rejectedBytes && !appendingRejectedData) {
                appendingRejectedData = true;
                //try to append the data that was previosly rejected
                appendToBuffer.call(self, rejectedBytes.data, rejectedBytes.quality, rejectedBytes.index).then(
                    function(){
                        appendingRejectedData = false;
                    }
                );
            } else {
                updateBufferLevel.call(self);
            }
        },

        updateStalledState: function() {
            stalled = this.videoModel.isStalled();
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

            doStop.call(self);

            cancel(deferredLiveEdge);
            cancel(deferredInitAppend);
            cancel(deferredRejectedDataAppend);
            cancel(deferredBuffersFlatten);
            deferredAppends.forEach(cancel);
            deferredAppends = [];
            cancel(deferredStreamComplete);
            deferredStreamComplete = Q.defer();

            self.clearMetrics();
            self.fragmentController.abortRequestsForModel(fragmentModel);
            self.fragmentController.detachBufferController(fragmentModel);
            fragmentModel = null;
            initializationData = [];
            initialPlayback = true;
            liveEdgeSearchRange = null;
            liveEdgeInitialSearchPosition = null;
            useBinarySearch = false;
            liveEdgeSearchStep = null;
            isQuotaExceeded = false;
            rejectedBytes = null;
            appendingRejectedData = false;

            if (!errored) {
                self.sourceBufferExt.abort(mediaSource, buffer);
                self.sourceBufferExt.removeSourceBuffer(mediaSource, buffer);
            }
            data = null;
            buffer = null;
        },

        start: doStart,
        seek: doSeek,
        stop: doStop
    };
};

MediaPlayer.dependencies.BufferController.prototype = {
    constructor: MediaPlayer.dependencies.BufferController
};
