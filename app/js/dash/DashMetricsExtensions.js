/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
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
            var contentType,
                contentComponent,
                found = false;

            if (adaptation.hasOwnProperty("mimeType")) {
                contentType = adaptation.mimeType;
            } else if (adaptation.hasOwnProperty("ContentComponent")) {
                contentComponent = adaptation.ContentComponent;
                contentType = contentComponent.contentType;
            }

            contentType = contentType.toLowerCase();
            bufferType = bufferType.toLowerCase();

            if (contentType.indexOf(bufferType) !== -1) {
                found = true;
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
                    if (adaptationIsType(adaptationSet, bufferType)) {
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

            maxIndex = findMaxBufferIndex(periodArray, bufferType);
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
                currentHttpList;

            if (httpList === null || httpList.length <= 0) {
                return null;
            }

            httpListLength = httpList.length;
            httpListLastIndex = httpListLength - 1;

            currentHttpList = httpList[httpListLastIndex];
            return currentHttpList;
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
        };

    return {
        manifestModel: undefined,
        getBandwidthForRepresentation : getBandwidthForRepresentation,
        getIndexForRepresentation : getIndexForRepresentation,
        getMaxIndexForBufferType : getMaxIndexForBufferType,
        getCurrentRepresentationSwitch : getCurrentRepresentationSwitch,
        getCurrentBufferLevel : getCurrentBufferLevel,
        getCurrentHttpRequest : getCurrentHttpRequest,
        getCurrentDroppedFrames : getCurrentDroppedFrames
    };
};

Dash.dependencies.DashMetricsExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsExtensions
};