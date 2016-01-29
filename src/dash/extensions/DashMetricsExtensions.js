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
import HTTPRequest from '../../streaming/vo/metrics/HTTPRequest.js';
import AbrController from '../../streaming/controllers/AbrController.js';
import ManifestModel from '../../streaming/models/ManifestModel.js';
import DashManifestExtensions from '../../dash/extensions/DashManifestExtensions.js';
import FactoryMaker from '../../core/FactoryMaker.js';

function DashMetricsExtensions() {

    let instance;
    let context = this.context;
    let manifestModel = ManifestModel(context).getInstance();//TODO Need to pass this in not bake in

    function getBandwidthForRepresentation(representationId, periodId) {
        var representation;
        var manifest = manifestModel.getValue();
        var period = manifest.Period_asArray[periodId];

        representation = findRepresentation(period, representationId);

        if (representation === null) {
            return null;
        }

        return representation.bandwidth;
    }

    function getIndexForRepresentation(representationId, periodIdx) {
        var representationIndex;
        var manifest = manifestModel.getValue();
        var period = manifest.Period_asArray[periodIdx];

        representationIndex = findRepresentationIndex(period, representationId);
        return representationIndex;
    }

    /**
     * This method returns the current max index based on what is defined in the MPD.
     *
     * @param bufferType - String 'audio' or 'video',
     * @param periodIdx - Make sure this is the period index not id
     * @return int
     * @memberof DashMetricsExtensions#
     * @method
     */
    function getMaxIndexForBufferType(bufferType, periodIdx) {
        var maxIndex;
        var manifest = manifestModel.getValue();
        var period = manifest.Period_asArray[periodIdx];

        maxIndex = findMaxBufferIndex(period, bufferType);
        return maxIndex;
    }

    /**
     * This method returns the current max index correlated to the max allowed bitrate
     * explicitly set via the MediaPlayer's API setMaxAllowedBitrateFor.
     *
     * @param bufferType - String 'audio' or 'video',
     * @param periodId - Make sure this is the period id not index.
     * @return int
     * @see {@link module:MediaPlayer#setMaxAllowedBitrateFor setMaxAllowedBitrateFor()}
     * @see {@link DashMetricsExtensions#getMaxIndexForBufferType getMaxIndexForBufferType()}
     * @memberof DashMetricsExtensions#
     * @method
     */
    function getMaxAllowedIndexForBufferType(bufferType, periodId) {
        var idx = 0;
        var abrController = AbrController(context).getInstance();

        if (abrController) {
            idx = abrController.getTopQualityIndexFor(bufferType, periodId);
        }

        return idx;
    }

    function getCurrentRepresentationSwitch(metrics) {
        if (metrics === null) {
            return null;
        }

        var repSwitch = metrics.RepSwitchList;
        var repSwitchLength,
            repSwitchLastIndex,
            currentRepSwitch;

        if (repSwitch === null || repSwitch.length <= 0) {
            return null;
        }

        repSwitchLength = repSwitch.length;
        repSwitchLastIndex = repSwitchLength - 1;

        currentRepSwitch = repSwitch[repSwitchLastIndex];
        return currentRepSwitch;
    }

    function getLatestBufferLevelVO(metrics) {
        if (metrics === null) {
            return null;
        }

        var bufferLevel = metrics.BufferLevel;
        if (bufferLevel === null || bufferLevel.length <= 0) {
            return null;
        }

        return bufferLevel[bufferLevel.length - 1];
    }

    function getCurrentBufferLevel(metrics) {
        if (metrics === null) {
            return 0;
        }

        var bufferLevel = metrics.BufferLevel;
        if (bufferLevel === null || bufferLevel.length <= 0) {
            return 0;
        }

        return bufferLevel[bufferLevel.length - 1].level / 1000;
    }

    function getRequestsQueue(metrics) {
        return metrics.RequestsQueue;
    }

    function getCurrentHttpRequest(metrics) {
        if (metrics === null) {
            return null;
        }

        var httpList = metrics.HttpList;
        var currentHttpList = null;

        var httpListLength,
            httpListLastIndex;

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
            httpListLastIndex--;
        }
        return currentHttpList;
    }

    function getHttpRequests(metrics) {
        if (metrics === null) {
            return [];
        }

        return !!metrics.HttpList ? metrics.HttpList : [];
    }

    function getCurrentDroppedFrames(metrics) {
        if (metrics === null) { return null; }

        var droppedFrames = metrics.DroppedFrames;
        var droppedFramesLength,
            droppedFramesLastIndex,
            currentDroppedFrames;

        if (droppedFrames === null || droppedFrames.length <= 0) {
            return null;
        }

        droppedFramesLength = droppedFrames.length;
        droppedFramesLastIndex = droppedFramesLength - 1;
        currentDroppedFrames = droppedFrames[droppedFramesLastIndex];

        return currentDroppedFrames;
    }

    function getCurrentSchedulingInfo(metrics) {
        if (metrics === null) return null;

        var schedulingInfo = metrics.SchedulingInfo;
        var ln,
            lastIdx,
            currentSchedulingInfo;

        if (schedulingInfo === null || schedulingInfo.length <= 0) {
            return null;
        }

        ln = schedulingInfo.length;
        lastIdx = ln - 1;

        currentSchedulingInfo = schedulingInfo[lastIdx];

        return currentSchedulingInfo;
    }

    function getCurrentManifestUpdate(metrics) {
        if (metrics === null) return null;

        var manifestUpdate = metrics.ManifestUpdate;
        var ln,
            lastIdx,
            currentManifestUpdate;

        if (manifestUpdate === null || manifestUpdate.length <= 0) {
            return null;
        }

        ln = manifestUpdate.length;
        lastIdx = ln - 1;

        currentManifestUpdate = manifestUpdate[lastIdx];

        return currentManifestUpdate;
    }

    function getCurrentDVRInfo(metrics) {

        if (metrics === null) {
            return null;
        }

        var dvrInfo = metrics.DVRInfo;
        var dvrInfoLastIndex,
            curentDVRInfo;

        if (dvrInfo === null || dvrInfo.length <= 0) {
            return null;
        }

        dvrInfoLastIndex = dvrInfo.length - 1;
        curentDVRInfo = dvrInfo[dvrInfoLastIndex];

        return curentDVRInfo;
    }

    function getLatestMPDRequestHeaderValueByID(metrics, id) {
        var headers = {};
        var httpRequestList,
            httpRequest,
            i;

        if (metrics === null) {
            return null;
        }

        httpRequestList = getHttpRequests(metrics);

        for (i = httpRequestList.length - 1; i >= 0; i--) {
            httpRequest = httpRequestList[i];

            if (httpRequest.type === HTTPRequest.MPD_TYPE) {
                headers = parseResponseHeaders(httpRequest._responseHeaders);
                break;
            }
        }

        return headers[id] === undefined ? null :  headers[id];
    }

    function getLatestFragmentRequestHeaderValueByID(metrics, id) {

        if (metrics === null) return null;

        var httpRequest = getCurrentHttpRequest(metrics);
        var headers;

        if (httpRequest === null || httpRequest._responseHeaders === null) return null;

        headers = parseResponseHeaders(httpRequest._responseHeaders);
        return headers[id] === undefined ? null :  headers[id];
    }

    function parseResponseHeaders(headerStr) {
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
    }

    function findRepresentationIndex(period, representationId) {
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
    }

    function findRepresentation(period, representationId) {
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
    }

    function adaptationIsType(adaptation, bufferType) {
        return DashManifestExtensions(context).getInstance().getIsTypeOf(adaptation, bufferType);
    }

    function findMaxBufferIndex(period, bufferType) {
        var adaptationSet,
            adaptationSetArray,
            representationArray,
            adaptationSetArrayIndex;

        if (!period || !bufferType) return -1;

        adaptationSetArray = period.AdaptationSet_asArray;
        for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
            adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
            representationArray = adaptationSet.Representation_asArray;
            if (adaptationIsType(adaptationSet, bufferType)) {
                return representationArray.length;
            }
        }

        return -1;
    }

    instance = {
        getBandwidthForRepresentation: getBandwidthForRepresentation,
        getIndexForRepresentation: getIndexForRepresentation,
        getMaxIndexForBufferType: getMaxIndexForBufferType,
        getMaxAllowedIndexForBufferType: getMaxAllowedIndexForBufferType,
        getCurrentRepresentationSwitch: getCurrentRepresentationSwitch,
        getLatestBufferLevelVO: getLatestBufferLevelVO,
        getCurrentBufferLevel: getCurrentBufferLevel,
        getCurrentHttpRequest: getCurrentHttpRequest,
        getHttpRequests: getHttpRequests,
        getCurrentDroppedFrames: getCurrentDroppedFrames,
        getCurrentSchedulingInfo: getCurrentSchedulingInfo,
        getCurrentDVRInfo: getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate,
        getLatestFragmentRequestHeaderValueByID: getLatestFragmentRequestHeaderValueByID,
        getLatestMPDRequestHeaderValueByID: getLatestMPDRequestHeaderValueByID,
        getRequestsQueue: getRequestsQueue
    };

    return instance;
}

DashMetricsExtensions.__dashjs_factory_name = 'DashMetricsExtensions';
export default FactoryMaker.getSingletonFactory(DashMetricsExtensions);
