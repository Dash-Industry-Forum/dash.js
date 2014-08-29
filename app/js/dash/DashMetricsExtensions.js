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

        findRepresentionInPeriodArray = function (periodArray, representationId) {
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
            var found = false;

            // TODO : HACK ATTACK
            // Below we call getIsVideo and getIsAudio and then check the adaptation set for a 'type' property.
            // getIsVideo and getIsAudio are adding this 'type' property and SHOULD NOT BE.
            // This method expects getIsVideo and getIsAudio to be sync, but they are async (returns a promise).
            // This is a bad workaround!
            // The metrics extensions should have every method use promises.

            if (bufferType === "video") {
                //found = this.manifestExt.getIsVideo(adaptation);
                this.manifestExt.getIsVideo(adaptation);
                if (adaptation.type === "video") {
                    found = true;
                }
            }
            else if (bufferType === "audio") {
                //found = this.manifestExt.getIsAudio(adaptation); // TODO : Have to be sure it's the *active* audio track.
                this.manifestExt.getIsAudio(adaptation);
                if (adaptation.type === "audio") {
                    found = true;
                }
            }
            else {
                found = false;
            }

            return found;
        },

        findMaxBufferIndex = function (periodArray, bufferType) {
            var period,
                adaptationSet,
                adaptationSetArray,
                representationArray,
                periodArrayIndex,
                adaptationSetArrayIndex;

            for (periodArrayIndex = 0; periodArrayIndex < periodArray.length; periodArrayIndex = periodArrayIndex + 1) {
                period = periodArray[periodArrayIndex];
                adaptationSetArray = period.AdaptationSet_asArray;
                for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                    adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                    representationArray = adaptationSet.Representation_asArray;
                    if (adaptationIsType.call(this, adaptationSet, bufferType)) {
                        return representationArray.length;
                    }
                }
            }

            return -1;
        },

        getBandwidthForRepresentation = function (representationId) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                representation,
                periodArray = manifest.Period_asArray;

            representation = findRepresentionInPeriodArray.call(self, periodArray, representationId);

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

        getMaxIndexForBufferType = function (bufferType) {
            var self = this,
                manifest = self.manifestModel.getValue(),
                maxIndex,
                periodArray = manifest.Period_asArray;

            maxIndex = findMaxBufferIndex.call(this, periodArray, bufferType);
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

            while (httpListLastIndex > 0) {
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

        getCurrentDVRInfo = function (metrics) {

            if (metrics === null) {
                return null;
            }

            var dvrInfo = metrics.DVRInfo,
                dvrInfoLastIndex,
                curentDVRInfo =  null;

            if (dvrInfo === null || dvrInfo.length <= 0) {
                return null;
            }

            dvrInfoLastIndex = dvrInfo.length - 1;
            curentDVRInfo = dvrInfo[dvrInfoLastIndex];

            return curentDVRInfo;
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
        };

    return {
        manifestModel: undefined,
        manifestExt: undefined,
        getBandwidthForRepresentation : getBandwidthForRepresentation,
        getIndexForRepresentation : getIndexForRepresentation,
        getMaxIndexForBufferType : getMaxIndexForBufferType,
        getCurrentRepresentationSwitch : getCurrentRepresentationSwitch,
        getCurrentBufferLevel : getCurrentBufferLevel,
        getCurrentHttpRequest : getCurrentHttpRequest,
        getHttpRequests : getHttpRequests,
        getCurrentDroppedFrames : getCurrentDroppedFrames,
        getCurrentDVRInfo : getCurrentDVRInfo,
        getCurrentManifestUpdate: getCurrentManifestUpdate
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};
