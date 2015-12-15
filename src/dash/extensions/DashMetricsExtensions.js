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
Dash.dependencies.DashMetricsExtensions = function () {
    "use strict";

    var PROBABLY_IN_CACHE_MS = 200;

    var findRepresentationIndex = function (period, representationId) {
            var adaptationSet,
                adaptationSetArray,
                representation,
                representationArray,
                adaptationSetArrayIndex,
                representationArrayIndex;

            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representationArrayIndex;
                    }
                }
            }

            return -1;
        },

        findRepresentation = function (period, representationId) {
            var adaptationSet,
                adaptationSetArray,
                representation,
                representationArray,
                adaptationSetArrayIndex,
                representationArrayIndex;

            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        return representation;
                    }
                }
            }

            return null;
        },

        adaptationIsType = function (adaptation, bufferType) {
            return this.manifestExt.getIsTypeOf(adaptation, bufferType);
        },

        findMaxBufferIndex = function (period, bufferType) {
            var adaptationSet,
                adaptationSetArray,
                representationArray,
                adaptationSetArrayIndex;

            if (!period || !bufferType) return -1;

            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                if (adaptationIsType.call(this, adaptationSet, bufferType)) {
                    return representationArray.length;
                }
            }

            return -1;
        },

        getBandwidthForRepresentation = function (representationId, periodId) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                representation,
                period = manifest.Period_asArray[periodId];

            representation = findRepresentation.call(self, period, representationId);

            if (representation === null) {
                return null;
            }

            return representation.bandwidth;
        },

        getIndexForRepresentation = function (representationId, periodIdx) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                representationIndex,
                period = manifest.Period_asArray[periodIdx];

            representationIndex = findRepresentationIndex.call(self, period, representationId);
            return representationIndex;
        },

        getMaxIndexForBufferType = function (bufferType, periodIdx) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                maxIndex,
                period = manifest.Period_asArray[periodIdx];

            maxIndex = findMaxBufferIndex.call(this, period, bufferType);
            return maxIndex;
        },

        getMaxAllowedIndexForBufferType = function (bufferType, periodId) {
            var abrController = this.system.getObject("abrController"),
                idx=0;

            if (abrController) {
                idx = abrController.getTopQualityIndexFor(bufferType, periodId);
            }

            return idx;
        },

        getCurrentRepresentationSwitch = function (metrics) {
            if (metrics === null) {
                return null;
            }

            var repSwitch = metrics.RepSwitchList,
                repSwitchLength,
                repSwitchLastIndex,
                currentRepSwitch;

            if (repSwitch === null || repSwitch.length <= 0) {
                return null;
            }

            repSwitchLength = repSwitch.length;
            repSwitchLastIndex = repSwitchLength - 1;

            currentRepSwitch = repSwitch[repSwitchLastIndex];
            return currentRepSwitch;
        },

        getCurrentBufferLevel = function (metrics) {
            if (metrics === null) {
                return 0;
            }

            var bufferLevel = metrics.BufferLevel;
            if (bufferLevel === null || bufferLevel.length <= 0) {
                return 0;
            }
            return bufferLevel[bufferLevel.length-1].level / 1000;
        },

        getRequestsQueue = function (metrics) {
            return metrics.RequestsQueue;
        },

        getLatestPlayList = function (metrics) {
            if (metrics === null) {
                return null;
            }

            var playList = metrics.PlayList;

            if (playList === null || playList.length <= 0) {
                return null;
            }

            return playList[playList.length - 1];
        },
/*
        getLatestPlayListTrace = function (metrics) {
            var playList = getLatestPlayList(metrics),
                trace;

            if (playList === null) {
                return null;
            }

            trace = playList.trace;

            if (trace === null || trace.length <= 0) {
                return null;
            }

            return trace[trace.length - 1];
        },
*/
        getCurrentHttpRequest = function (metrics) {
            if (metrics === null) {
                return null;
            }

            var httpList = metrics.HttpList,
                httpListLength,
                httpListLastIndex,
                currentHttpList = null;

            if (httpList === null || httpList.length <= 0) {
                return null;
            }

            httpListLength = httpList.length;
            httpListLastIndex = httpListLength - 1;

            while (httpListLastIndex >= 0) {
                if (httpList[httpListLastIndex].responsecode) {
                    currentHttpList = httpList[httpListLastIndex];
                    break;
                }
                httpListLastIndex -= 1;
            }
            return currentHttpList;
        },

        getRecentLatency = function(metrics,length) {
            // Should be merged with hte getRecentThroughput code as
            // it's a copy really, also possibly could be calculated
            // when new things arrive, rather than on request, could
            // also then discard old requests, deal with known network
            // changes etc.
            var httpList = metrics.HttpList,
                interested = [],
                i;

            if (httpList === null) {
                return -1;
            }
            var segmentCount = 0;

            for (i=httpList.length-1;(i>=0 && interested.length<length);i--)
            {
                var response = httpList[i];
                // only care about MediaSegments
                if (response.responsecode && response.type==MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE) {
                    segmentCount++;
                    var downloadTime = response.interval;
                    var latency = (response.tresponse - response.trequest);
                    var probalyFromCache = latency<PROBABLY_IN_CACHE_MS &&  downloadTime<PROBABLY_IN_CACHE_MS;
                    if (!probalyFromCache) {
                        interested.push(latency);
                    }
                }
            }

            if (interested.length === 0 ) {
                if (segmentCount>5) {
                    // this implies all were thought of as in the cache,
                    // just return the considered from cache time
                    return PROBABLY_IN_CACHE_MS;
                }
                return -1;
            }
            var total = 0;
            for (i=0;i<interested.length;i++) {
                total+=interested[i];
            }
            return total/interested.length;
        },
        getRecentThroughput = function(metrics,length) {

            var httpList = metrics.HttpList,
                throughput,
                interested = [],
                i;

            if (httpList === null) {
                return -1;
            }
            var segmentCount = 0;

            for (i=httpList.length-1;(i>=0 && interested.length<length);i--)
            {
                var response = httpList[i];
                // only care about MediaSegments
                if (response.responsecode && response.type==MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE) {
                    segmentCount++;
                    var downloadTime = response.interval;
                    var latency = (response.tresponse - response.trequest);
                    // Without a rule specific to latency we should
                    // include both as that is what is actually
                    // important.
                    throughput = (response._bytes * 8) / (downloadTime+latency);
                    // probably from cache simplified to just low
                    // latency and low download for now, should be
                    // more generalised into radically different
                    // latency and download time from the average,
                    // could also use logic about the progress events,
                    // on chrome for example first progress event is
                    // after exactly 32768 bytes
                    var probalyFromCache = downloadTime<200 && latency<200;
                    if (!probalyFromCache) {
                        interested.push(throughput);
                    }
                }
            }

            if (interested.length === 0 ) {
                if (segmentCount>5) {
                    // this implies all were thought of as in the cache,
                    // just return the last throughput, it's likely to be
                    // higher than any of our manifests
                    return throughput*1000;
                }
                return -1;
            }
            var total = 0;
            for (i=0;i<interested.length;i++) {
                total+=interested[i];
            }
            return (total*1000)/interested.length;
        },
        getHttpRequests = function (metrics) {
            if (metrics === null) {
                return [];
            }

            return !!metrics.HttpList ? metrics.HttpList : [];
        },

        getCurrentDroppedFrames = function (metrics) {
            if (metrics === null) { return null; }

            var droppedFrames = metrics.DroppedFrames,
                droppedFramesLength,
                droppedFramesLastIndex,
                currentDroppedFrames;

            if (droppedFrames === null || droppedFrames.length <= 0) {
                return null;
            }

            droppedFramesLength = droppedFrames.length;
            droppedFramesLastIndex = droppedFramesLength - 1;
            currentDroppedFrames = droppedFrames[droppedFramesLastIndex];

            return currentDroppedFrames;
        },

        getCurrentSchedulingInfo = function(metrics) {
            if (metrics === null) return null;

            var schedulingInfo = metrics.SchedulingInfo,
                ln,
                lastIdx,
                currentSchedulingInfo;

            if (schedulingInfo === null || schedulingInfo.length <= 0) {
                return null;
            }

            ln = schedulingInfo.length;
            lastIdx = ln - 1;

            currentSchedulingInfo = schedulingInfo[lastIdx];

            return currentSchedulingInfo;
        },

        getCurrentManifestUpdate = function(metrics) {
            if (metrics === null) return null;

            var manifestUpdate = metrics.ManifestUpdate,
                ln,
                lastIdx,
                currentManifestUpdate;

            if (manifestUpdate === null || manifestUpdate.length <= 0) {
                return null;
            }

            ln = manifestUpdate.length;
            lastIdx = ln - 1;

            currentManifestUpdate = manifestUpdate[lastIdx];

            return currentManifestUpdate;
        },

        getCurrentDVRInfo = function (metrics) {

            if (metrics === null) {
                return null;
            }

            var dvrInfo = metrics.DVRInfo,
                dvrInfoLastIndex,
                curentDVRInfo;

            if (dvrInfo === null || dvrInfo.length <= 0) {
                return null;
            }

            dvrInfoLastIndex = dvrInfo.length - 1;
            curentDVRInfo = dvrInfo[dvrInfoLastIndex];

            return curentDVRInfo;
        },

        getLatestMPDRequestHeaderValueByID = function (metrics, id) {

            var httpRequestList,
                httpRequest,
                headers = {},
                i;

            if (metrics === null) {
                return null;
            }

            httpRequestList = getHttpRequests(metrics);

            for (i = httpRequestList.length - 1; i >= 0; i -= 1) {
                httpRequest = httpRequestList[i];

                if (httpRequest.type === MediaPlayer.vo.metrics.HTTPRequest.MPD_TYPE) {
                    headers = parseResponseHeaders(httpRequest._responseHeaders);
                    break;
                }
            }

            return headers[id] === undefined ? null :  headers[id];
        },

        getLatestFragmentRequestHeaderValueByID = function(metrics, id) {

            if (metrics === null) return null;

            var httpRequest = getCurrentHttpRequest(metrics),
                headers;

            if (httpRequest === null || httpRequest._responseHeaders === null) {
                return null;
            }

            headers = parseResponseHeaders(httpRequest._responseHeaders);

            return headers[id] === undefined ? null :  headers[id];
        },

        parseResponseHeaders = function (headerStr) {
            var headers = {};
            if (!headerStr) {
                return headers;
            }
            var headerPairs = headerStr.split('\u000d\u000a');
            for (var i = 0, ilen = headerPairs.length; i < ilen; i++) {
                var headerPair = headerPairs[i];
                var index = headerPair.indexOf('\u003a\u0020');
                if (index > 0) {
                    headers[headerPair.substring(0, index)] = headerPair.substring(index + 2);
                }
            }
            return headers;
        };



    return {
        log: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        system:undefined,
        getBandwidthForRepresentation : getBandwidthForRepresentation,
        getIndexForRepresentation : getIndexForRepresentation,
        /**
         * This method returns the current max index based on what is defined in the MPD.
         *
         * @param bufferType - String 'audio' or 'video',
         * @param periodIdx - Make sure this is the period index not id
         * @return int
         * @memberof DashMetricsExtensions#
         * @method
         */
        getMaxIndexForBufferType : getMaxIndexForBufferType,
        /**
         * This method returns the current max index correlated to the max allowed bitrate
         * explicitly set via the MediaPlayer's API setMaxAllowedBitrateFor.
         *
         * @param bufferType - String 'audio' or 'video',
         * @param periodId - Make sure this is the period id not index.
         * @return int
         * @see {@link MediaPlayer#setMaxAllowedBitrateFor setMaxAllowedBitrateFor()}
         * @see {@link DashMetricsExtensions#getMaxIndexForBufferType getMaxIndexForBufferType()}
         * @memberof DashMetricsExtensions#
         * @method
         */
        getMaxAllowedIndexForBufferType : getMaxAllowedIndexForBufferType,
        getCurrentRepresentationSwitch : getCurrentRepresentationSwitch,
        getCurrentBufferLevel : getCurrentBufferLevel,
        getCurrentHttpRequest : getCurrentHttpRequest,
        getRecentThroughput : getRecentThroughput,
        getRecentLatency : getRecentLatency,
        getHttpRequests : getHttpRequests,
        getCurrentDroppedFrames : getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo : getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID:getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID:getLatestMPDRequestHeaderValueByID,
        getRequestsQueue: getRequestsQueue,
        getLatestPlayList: getLatestPlayList
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};
