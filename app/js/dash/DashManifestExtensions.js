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
Dash.dependencies.DashManifestExtensions = function () {
    "use strict";
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,

    getIsAudio: function (adaptation) {
        "use strict";
        var i,
            len,
            col = adaptation.ContentComponent_asArray,
            representation,
            result = false,
            found = false;

        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "audio") {
                    result = true;
                    found = true;
                }
            }
        }

        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("audio") !== -1;
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];

                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("audio") !== -1;
                    found = true;
                }

                i += 1;
            }
        }

        return Q.when(result);
    },

    getIsVideo: function (adaptation) {
        "use strict";
        var i,
            len,
            col = adaptation.ContentComponent_asArray,
            representation,
            result = false,
            found = false;

        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "video") {
                    result = true;
                    found = true;
                }
            }
        }

        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("video") !== -1;
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];

                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("video") !== -1;
                    found = true;
                }

                i += 1;
            }
        }

        return Q.when(result);
    },

    getIsMain: function (/*adaptation*/) {
        "use strict";
        // TODO : Check "Role" node.
        // TODO : Use this somewhere.
        return Q.when(false);
    },

    processAdaptation: function (adaptation) {
        "use strict";
        if (adaptation.Representation_asArray !== undefined && adaptation.Representation_asArray !== null) {
            adaptation.Representation_asArray.sort(function(a, b) {
                return a.bandwidth - b.bandwidth;
            });
        }

        return adaptation;
    },

    getDataForId: function (id, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) {
                return Q.when(adaptations[i]);
            }
        }

        return Q.when(null);
    },

    getDataForIndex: function (index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

        return Q.when(adaptations[index]);
    },

    getDataIndex: function (data, manifest, periodIndex) {
        "use strict";

        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i] === data) {
                return Q.when(i);
            }
        }

        return Q.when(-1);
    },

    getVideoData: function (manifest, periodIndex) {
        "use strict";
        //return Q.when(null);
        //------------------------------------
        var self = this,
            adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len,
            deferred = Q.defer(),
            funcs = [];

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsVideo(adaptations[i]));
        }
        Q.all(funcs).then(
            function (results) {
                var found = false;
                for (i = 0, len = results.length; i < len; i += 1) {
                    if (results[i] === true) {
                        found = true;
                        deferred.resolve(self.processAdaptation(adaptations[i]));
                    }
                }
                if (!found) {
                    deferred.resolve(null);
                }
            }
        );

        return deferred.promise;
    },

    getAudioDatas: function (manifest, periodIndex) {
        "use strict";
        //return Q.when(null);
        //------------------------------------
        var self = this,
            adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len,
            deferred = Q.defer(),
            funcs = [];

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            funcs.push(this.getIsAudio(adaptations[i]));
        }

        Q.all(funcs).then(
            function (results) {
                var datas = [];
                for (i = 0, len = results.length; i < len; i += 1) {
                    if (results[i] === true) {
                        datas.push(self.processAdaptation(adaptations[i]));
                    }
                }
                deferred.resolve(datas);
            }
        );

        return deferred.promise;
    },

    getPrimaryAudioData: function (manifest, periodIndex) {
        "use strict";
        var i,
            len,
            deferred = Q.defer(),
            funcs = [],
            self = this;

        this.getAudioDatas(manifest, periodIndex).then(
            function (datas) {
                if (!datas || datas.length === 0) {
                    deferred.resolve(null);
                }

                for (i = 0, len = datas.length; i < len; i += 1) {
                    funcs.push(self.getIsMain(datas[i]));
                }

                Q.all(funcs).then(
                    function (results) {
                        var found = false;
                        for (i = 0, len = results.length; i < len; i += 1) {
                            if (results[i] === true) {
                                found = true;
                                deferred.resolve(self.processAdaptation(datas[i]));
                            }
                        }
                        if (!found) {
                            deferred.resolve(datas[0]);
                        }
                    }
                );
            }
        );

        return deferred.promise;
    },

    getCodec: function (data) {
        "use strict";
        var representation = data.Representation_asArray[0],
            codec = (representation.mimeType + ';codecs="' + representation.codecs + '"');
        return Q.when(codec);
    },

    getKID: function (data) {
        "use strict";

        if (!data || !data.hasOwnProperty("cenc:default_KID")) {
            return null;
        }
        return data["cenc:default_KID"];
    },

    getContentProtectionData: function (data) {
        "use strict";
        if (!data || !data.hasOwnProperty("ContentProtection_asArray") || data.ContentProtection_asArray.length === 0) {
            return Q.when(null);
        }
        return Q.when(data.ContentProtection_asArray);
    },

    getSegmentInfoFor: function (representation) {
        if (representation.hasOwnProperty("SegmentBase")) {
            return representation.SegmentBase;
        }
        else if (representation.hasOwnProperty("SegmentList")) {
            return representation.SegmentList;
        }
        else if (representation.hasOwnProperty("SegmentTemplate")) {
            return representation.SegmentTemplate;
        }
        else {
            return null;
        }
    },

    getLiveOffset: function (manifest) {
        "use strict";
        var delay = 15;

        if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
            delay = manifest.suggestedPresentationDelay;
        }

        return Q.when(delay);
    },

    getLiveStart: function (manifest, periodIndex) {
        var time = 0,
            fStart = 1,
            fDuration,
            fTimescale = 1,
            representation,
            list = null,
            template = null;

        // We don't really care what representation we use; they should all start at the same time.
        // Just grab the first representation; if this isn't there, we have bigger problems.
        representation = manifest.Period_asArray[periodIndex].AdaptationSet_asArray[1].Representation_asArray[0];

        if (representation.hasOwnProperty("SegmentList")) {
            list = representation.SegmentList;

            if (list.hasOwnProperty("startNumber")) {
                fStart = Math.max(list.startNumber, 1);
            }
            if (list.hasOwnProperty("timescale")) {
                fTimescale = list.timescale;
            }
            fDuration = list.duration;

            time = (((fStart - 1) * fDuration) / fTimescale);
        }
        else if (representation.hasOwnProperty("SegmentTemplate")) {
            template = representation.SegmentTemplate;

            if (template.hasOwnProperty("startNumber")) {
                fStart = Math.max(template.startNumber, 1);
            }
            if (template.hasOwnProperty("timescale")) {
                fTimescale = template.timescale;
            }
            fDuration = template.duration;

            if (template.hasOwnProperty("SegmentTimeline")) {
                // This had better exist, or there's bigger problems.
                // First one must have a time value!
                time = (template.SegmentTimeline.S_asArray[0].t / fTimescale);
            }
            else {
                time = (((fStart - 1) * fDuration) / fTimescale);
            }
        }

        return Q.when(time);
    },

    getLiveEdge: function (manifest, periodIndex) {
        "use strict";
        var self = this,
            deferred = Q.defer(),
            liveOffset = 0,
            now = new Date(),
            start = manifest.availabilityStartTime,
            end;

        self.getLiveOffset(manifest).then(
            function (delay) {
                // Figure out the time between now and available start time.

                if (manifest.hasOwnProperty("availabilityEndTime")) {
                    end = manifest.availabilityEndTime;
                    liveOffset = ((end.getTime() - start.getTime()) / 1000);
                } else {
                    liveOffset = ((now.getTime() - start.getTime()) / 1000);
                }

                // Find out the between stream start and available start time.
                self.getLiveStart(manifest, periodIndex).then(
                    function (start) {
                        // get the full time, relative to stream start
                        liveOffset += start;

                        // peel off our reserved time
                        liveOffset -= delay;

                        deferred.resolve(liveOffset);
                    }
                );
            }
        );

        return deferred.promise;
    },

    getPresentationOffset: function (manifest, periodIndex) {
        var time = 0,
            offset,
            timescale = 1,
            representation,
            segmentInfo;

        // We don't really care what representation we use; they should all start at the same time.
        // Just grab the first representation; if this isn't there, we have bigger problems.
        // TODO : The presentationTimeOffset can be described in each representation...
        // Can it vary (be different times) between audio/video streams in the same Period?
        // If it can we're probably ok, there just won't be any content for the difference in time.
        // THIS WON'T WORK IN THE CURRENT PLAYER THOUGH!
        // The stream without content will force the player to stall because it thinks it's waiting
        // for data.  This will have to be fixed on the BufferController.
        // For now let's assume that the presentationTimeOffset is the same between all representations.
        representation = manifest.Period_asArray[periodIndex].AdaptationSet_asArray[0].Representation_asArray[0];
        segmentInfo = this.getSegmentInfoFor(representation);

        if (segmentInfo !== null && segmentInfo !== undefined && segmentInfo.hasOwnProperty("presentationTimeOffset")) {
            offset = segmentInfo.presentationTimeOffset;

            if (segmentInfo.hasOwnProperty("timescale")) {
                timescale = segmentInfo.timescale;
            }

            time = offset / timescale;
        }

        return Q.when(time);
    },

    getIsDVR: function (manifest, isLive) {
        "use strict";
        var containsDVR,
            isDVR;

        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = (isLive && containsDVR);

        return Q.when(isDVR);
    },

    getIsOnDemand: function (manifest) {
        "use strict";
        var isOnDemand = false;

        if (manifest.profiles && manifest.profiles.length > 0) {
            isOnDemand = (manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011") !== -1);
        }

        return Q.when(isOnDemand);
    },

    getDuration: function (manifest, isLive) {
        "use strict";
        var dur = NaN;

        if (isLive) {
            dur = Number.POSITIVE_INFINITY;
        } else {
            if (manifest.mediaPresentationDuration) {
                dur = manifest.mediaPresentationDuration;
            } else if (manifest.availabilityEndTime && manifest.availabilityStartTime) {
                dur = (manifest.availabilityEndTime.getTime() - manifest.availabilityStartTime.getTime());
            }
        }

        return Q.when(dur);
    },

    getDurationForPeriod: function (periodIndex, manifest, isLive) {
        "use strict";
        var dur = NaN;

        if (isLive) {
            dur = Number.POSITIVE_INFINITY;
        } else {

            if(manifest.Period_asArray.length > 1 && manifest.Period_asArray[periodIndex].duration !== undefined)
            {
                dur = manifest.Period_asArray[periodIndex].duration;
            } else if (manifest.mediaPresentationDuration) {
                dur = manifest.mediaPresentationDuration;
            } else if (manifest.availabilityEndTime && manifest.availabilityStartTime) {
                dur = (manifest.availabilityEndTime.getTime() - manifest.availabilityStartTime.getTime());
            }
        }

        return Q.when(dur);
    },

    getBandwidth: function (representation) {
        "use strict";
        return Q.when(representation.bandwidth);
    },

    getRefreshDelay: function (manifest) {
        "use strict";
        var delay = NaN;

        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            delay = parseFloat(manifest.minimumUpdatePeriod);
        }

        return Q.when(delay);
    },

    getRepresentationCount: function (adaptation) {
        "use strict";
        return Q.when(adaptation.Representation_asArray.length);
    },

    getRepresentationFor: function (index, data) {
        "use strict";
        return Q.when(data.Representation_asArray[index]);
    },

    getPeriodCount: function (manifest) {
        "use strict";
        return Q.when(manifest.Period_asArray.length);
    },

    getTimestampOffsetForPeriod: function (periodIndex, manifest, isLive) {
        var self = this;
        return self.getStartOffsetForPeriod(manifest, periodIndex).then(
            function (time) {
                var startTime = manifest.Period_asArray[periodIndex].start;
                if (typeof(startTime) !== "undefined") {
                    return Q.when(manifest.Period_asArray[periodIndex].start - time);
                } else {
                    var deferredDurations = [],
                        defferedOffset = Q.defer();

                    for(var i = 0; i < periodIndex; i++) {
                        deferredDurations.push(self.getDurationForPeriod(i, manifest, isLive));
                    }

                    Q.all(deferredDurations).then(
                        function(durationResult) {
                            if(durationResult) {
                                var offset = 0;
                                for (var j = 0, ln = durationResult.length; j < ln; j++) {
                                    offset += durationResult[j];
                                }
                                defferedOffset.resolve(offset - time);
                            } else {
                                defferedOffset.reject("Error calculating timestamp offset for period");
                            }
                        }
                    );

                    return defferedOffset.promise;
                }
            }
        );
    },

    getStartOffsetForPeriod: function (manifest, periodIndex) {
        var self = this,
            periodArray = manifest.Period_asArray,
            period = periodArray[periodIndex],
            time = 0,
            defer,
            idx;

        for (idx = 0; idx < periodIndex; idx++) {
            if (period.hasOwnProperty("BaseURL") && (periodArray[idx].BaseURL == period.BaseURL)) {
                defer = Q.defer();
                Q.all([self.getLiveStart(manifest, idx), self.getLiveStart(manifest, periodIndex)]).then(
                    function (liveStartResults) {
                        if (typeof(liveStartResults) !== "undefined" && !isNaN(liveStartResults[0] && !isNaN(liveStartResults[0]))) {
                            time = Math.abs(liveStartResults[0] - liveStartResults[1]);
                        }

                        defer.resolve(time);
                    }
                );
                break;
            }
        }

        return Q.when(defer ? defer.promise : time);
    }
};