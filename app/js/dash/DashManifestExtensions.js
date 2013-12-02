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

        // TODO : Add the type here so that somebody who has access to the adapatation set can check it.
        // THIS IS A HACK for a bug in DashMetricsExtensions.
        // See the note in DashMetricsExtensions.adaptationIsType().
        if (result) {
            adaptation.type = "audio";
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

        // TODO : Add the type here so that somebody who has access to the adapatation set can check it.
        // THIS IS A HACK for a bug in DashMetricsExtensions.
        // See the note in DashMetricsExtensions.adaptationIsType().
        if (result) {
            adaptation.type = "video";
        }

        return Q.when(result);
    },

    getIsText: function (adaptation) {
        "use strict";
        var i,
            len,
            col = adaptation.ContentComponent_asArray,
            representation,
            result = false,
            found = false;

        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === "text") {
                    result = true;
                    found = true;
                }
            }
        }

        if (adaptation.hasOwnProperty("mimeType")) {
            result = adaptation.mimeType.indexOf("text") !== -1;
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];

                if (representation.hasOwnProperty("mimeType")) {
                    result = representation.mimeType.indexOf("text") !== -1;
                    found = true;
                }

                i += 1;
            }
        }

        return Q.when(result);
    },

    getIsTextTrack: function(type) {
        return (type === "text/vtt" || type === "application/ttml+xml");
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

    getTextData: function (manifest, periodIndex) {
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
            funcs.push(this.getIsText(adaptations[i]));
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

    getMimeType: function (data) {
        "use strict";
        return Q.when(data.Representation_asArray[0].mimeType);
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

    getPresentationOffset: function (quality, data) {
        var self = this,
            deferred = Q.defer(),
            time = 0,
            offset,
            timescale = 1,
            segmentInfo;

        self.getRepresentationFor(quality, data).then(
            function(representation) {
                segmentInfo = self.getSegmentInfoFor(representation);

                if (segmentInfo !== null && segmentInfo !== undefined && segmentInfo.hasOwnProperty("presentationTimeOffset")) {
                    offset = segmentInfo.presentationTimeOffset;

                    if (segmentInfo.hasOwnProperty("timescale")) {
                        timescale = segmentInfo.timescale;
                    }

                    time = offset / timescale;
                }

                deferred.resolve(time);
            }
        );

        return deferred.promise;
    },

    getIsDynamic: function (manifest) {
        "use strict";
        var isDynamic = false,
            LIVE_TYPE = "dynamic";

        if (manifest.hasOwnProperty("type")) {
            isDynamic = (manifest.type === LIVE_TYPE);
        }

        return isDynamic;
    },

    getIsDVR: function (manifest) {
        "use strict";
        var isDynamic = this.getIsDynamic(manifest),
            containsDVR,
            isDVR;

        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = (isDynamic && containsDVR);

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

    getDuration: function (manifest) {
        "use strict";
        var dur = NaN,
            isDynamic = this.getIsDynamic(manifest);

        if (isDynamic) {
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

    getDurationForPeriod: function (periodIndex, manifest) {
        "use strict";
        var dur = NaN,
            isDynamic = this.getIsDynamic(manifest);

        if (isDynamic) {
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

    getTimestampOffsetForPeriod: function (periodIndex, manifest, quality, data) {
        var self = this,
            timestampOffset,
            deferred = Q.defer();

        self.getPresentationOffset(quality, data).then(
            function(presentationOffset) {
                self.getPeriodStart(manifest, periodIndex).then(
                    function(periodStart) {
                        timestampOffset = periodStart - presentationOffset;
                        deferred.resolve(timestampOffset);
                    }
                );
            }
        );

        return deferred.promise;
    },

    getPeriodStart: function (manifest, periodIndex) {
        var self = this,
            isDynamic = self.getIsDynamic(manifest),
            i,
            p = null,
            prevStart = null,
            prevDuration = null,
            periodStart;

        for (i = 0; i <= periodIndex; i += 1) {
            p = manifest.Period_asArray[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (p.hasOwnProperty("start")) {
                periodStart = p.start;
            }

            // If the @start attribute is absent, but the previous Period
            // element contains a @duration attribute then then this new
            // Period is also a regular Period. The start time of the new
            // Period PeriodStart is the sum of the start time of the previous
            // Period PeriodStart and the value of the attribute @duration
            // of the previous Period.
            else if (prevStart !== null && prevDuration !== null) {
                periodStart = prevStart + prevDuration;
            }
            // If (i) @start attribute is absent, and (ii) the Period element
            // is the first in the MPD, and (iii) the MPD@type is 'static',
            // then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                periodStart = 0;
            }

            if (p.hasOwnProperty("duration")) {
                prevDuration = p.duration;
            }

            prevStart = periodStart;
        }

        return Q.when(periodStart);
    }
};
