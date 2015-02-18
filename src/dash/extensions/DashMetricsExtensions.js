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
Dash.dependencies.DashMetricsExtensions = function () {
    "use strict";
    var findRepresentationIndexInPeriodArray = function (periodArray, representationId) {
            var period,
                adaptationSet,
                adaptationSetArray,
                representation,
                representationArray,
                periodArrayIndex,
                adaptationSetArrayIndex,
                representationArrayIndex;

            for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
                period = periodArray[periodArrayIndex];
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
            }

            return -1;
        },

        findRepresentationInPeriodArray = function (periodArray, representationId) {
            var period,
                adaptationSet,
                adaptationSetArray,
                representation,
                representationArray,
                periodArrayIndex,
                adaptationSetArrayIndex,
                representationArrayIndex;

            for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
                period = periodArray[periodArrayIndex];
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

        getBandwidthForRepresentation = function (representationId) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                representation,
                periodArray = manifest.Period_asArray;

            representation = findRepresentationInPeriodArray.call(self, periodArray, representationId);

            if (representation === null) {
                return null;
            }

            return representation.bandwidth;
        },

        getIndexForRepresentation = function (representationId) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                representationIndex,
                periodArray = manifest.Period_asArray;

            representationIndex = findRepresentationIndexInPeriodArray.call(self, periodArray, representationId);
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
                return null;
            }

            var bufferLevel = metrics.BufferLevel,
                bufferLevelLength,
                bufferLevelLastIndex,
                currentBufferLevel;

            if (bufferLevel === null || bufferLevel.length <= 0) {
                return null;
            }

            bufferLevelLength = bufferLevel.length;
            bufferLevelLastIndex = bufferLevelLength - 1;

            currentBufferLevel = bufferLevel[bufferLevelLastIndex];
            return currentBufferLevel;
        },

        getCurrentPlaybackRate = function (metrics) {
            if (metrics === null) {
                return null;
            }

            var playList = metrics.PlayList,
                trace,
                currentRate;

            if (playList === null || playList.length <= 0) {
                return null;
            }

            trace = playList[playList.length - 1].trace;

            if (trace === null || trace.length <= 0) {
                return null;
            }

            currentRate = trace[trace.length - 1].playbackspeed;
            return currentRate;
        },

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

        getLatestMPDRequestHeaderValueByID = function(metrics, id) {

            if (metrics === null) return null;
            var httpRequestList = getHttpRequests(metrics),
                httpRequest = httpRequestList[httpRequestList.length-1],
                headers;

            if (httpRequest.type === 'MPD')
            {
                headers = parseResponseHeaders(httpRequest.responseHeaders);

            }

            return headers[id] === undefined ? null :  headers[id];
        },

        getLatestFragmentRequestHeaderValueByID = function(metrics, id) {

            if (metrics === null) return null;

            var httpRequest = getCurrentHttpRequest(metrics),
                headers;

            if (httpRequest === null || httpRequest.responseHeaders === null) return null;

            headers = parseResponseHeaders(httpRequest.responseHeaders);
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
        manifestModel: undefined,
        manifestExt: undefined,
        getBandwidthForRepresentation : getBandwidthForRepresentation,
        getIndexForRepresentation : getIndexForRepresentation,
        getMaxIndexForBufferType : getMaxIndexForBufferType,
        getCurrentRepresentationSwitch : getCurrentRepresentationSwitch,
        getCurrentBufferLevel : getCurrentBufferLevel,
        getCurrentPlaybackRate: getCurrentPlaybackRate,
        getCurrentHttpRequest : getCurrentHttpRequest,
        getHttpRequests : getHttpRequests,
        getCurrentDroppedFrames : getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo : getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID:getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID:getLatestMPDRequestHeaderValueByID
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};
