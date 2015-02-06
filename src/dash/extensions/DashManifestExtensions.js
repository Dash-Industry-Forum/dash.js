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
    this.timelineConverter = undefined;
};

Dash.dependencies.DashManifestExtensions.prototype = {
    constructor: Dash.dependencies.DashManifestExtensions,

    getIsTypeOf: function(adaptation, type) {
        "use strict";
        var i,
            len,
            col = adaptation.ContentComponent_asArray,
            mimeTypeRegEx = (type !== "text") ? new RegExp(type) : new RegExp("(vtt|ttml)"),
            representation,
            result = false,
            found = false;

        if (col) {
            for (i = 0, len = col.length; i < len; i += 1) {
                if (col[i].contentType === type) {
                    result = true;
                    found = true;
                }
            }
        }

        if (adaptation.hasOwnProperty("mimeType")) {
            result = mimeTypeRegEx.test(adaptation.mimeType);
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];

                if (representation.hasOwnProperty("mimeType")) {
                    result = mimeTypeRegEx.test(representation.mimeType);
                    found = true;
                }

                i += 1;
            }
        }

        return result;
    },

    getIsAudio: function (adaptation) {
        "use strict";

        return this.getIsTypeOf(adaptation, "audio");
    },

    getIsVideo: function (adaptation) {
        "use strict";

        return this.getIsTypeOf(adaptation, "video");
    },

    getIsText: function (adaptation) {
        "use strict";

        return this.getIsTypeOf(adaptation, "text");
    },

    getIsTextTrack: function(type) {
        return (type === "text/vtt" || type === "application/ttml+xml");
    },

    getLanguageForAdaptation: function(adaptation) {
        var lang = "";

        if (adaptation.hasOwnProperty("lang")) {
            lang = adaptation.lang;
        }

        return lang;
    },

    getIsMain: function (/*adaptation*/) {
        "use strict";
        // TODO : Check "Role" node.
        // TODO : Use this somewhere.
        return false;
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

    getAdaptationForId: function (id, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i].hasOwnProperty("id") && adaptations[i].id === id) {
                return adaptations[i];
            }
        }

        return null;
    },

    getAdaptationForIndex: function (index, manifest, periodIndex) {
        "use strict";
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;

        return adaptations[index];
    },

    getIndexForAdaptation: function (adaptation, manifest, periodIndex) {
        "use strict";

        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (adaptations[i] === adaptation) {
                return i;
            }
        }

        return -1;
    },

    getAdaptationsForType: function (manifest, periodIndex, type) {
        "use strict";

        var self = this,
            adaptationSet = manifest.Period_asArray[periodIndex].AdaptationSet_asArray,
            i,
            len,
            adaptations = [];

        for (i = 0, len = adaptationSet.length; i < len; i += 1) {
            if (this.getIsTypeOf(adaptationSet[i], type)) {
                adaptations.push(self.processAdaptation(adaptationSet[i]));
            }
        }

        return adaptations;
    },

    getAdaptationForType: function (manifest, periodIndex, type) {
        "use strict";
        var i,
            len,
            adaptations,
            self = this;

        adaptations = this.getAdaptationsForType(manifest, periodIndex, type);

        if (!adaptations || adaptations.length === 0) return null;

        for (i = 0, len = adaptations.length; i < len; i += 1) {
            if (self.getIsMain(adaptations[i])) return adaptations[i];
        }

        return adaptations[0];
    },

    getCodec: function (adaptation) {
        "use strict";
        var representation = adaptation.Representation_asArray[0];

        return (representation.mimeType + ';codecs="' + representation.codecs + '"');
    },

    getMimeType: function (adaptation) {
        "use strict";
        return adaptation.Representation_asArray[0].mimeType;
    },

    getKID: function (adaptation) {
        "use strict";

        if (!adaptation || !adaptation.hasOwnProperty("cenc:default_KID")) {
            return null;
        }
        return adaptation["cenc:default_KID"];
    },

    getContentProtectionData: function (adaptation) {
        "use strict";
        if (!adaptation || !adaptation.hasOwnProperty("ContentProtection_asArray") || adaptation.ContentProtection_asArray.length === 0) {
            return null;
        }
        return adaptation.ContentProtection_asArray;
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

        return isDVR;
    },

    getIsOnDemand: function (manifest) {
        "use strict";
        var isOnDemand = false;

        if (manifest.profiles && manifest.profiles.length > 0) {
            isOnDemand = (manifest.profiles.indexOf("urn:mpeg:dash:profile:isoff-on-demand:2011") !== -1);
        }

        return isOnDemand;
    },

    getDuration: function (manifest) {
        var mpdDuration;

        //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
        //If the attribute is not present, the duration of the Media Presentation is unknown.
        if (manifest.hasOwnProperty("mediaPresentationDuration")) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.POSITIVE_INFINITY;
        }

        return mpdDuration;
    },

    getBandwidth: function (representation) {
        "use strict";
        return representation.bandwidth;
    },

    getRefreshDelay: function (manifest) {
        "use strict";
        var delay = NaN,
            minDelay = 2;

        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay);
        }

        return delay;
    },

    getRepresentationCount: function (adaptation) {
        "use strict";
        return adaptation.Representation_asArray.length;
    },

    /**
     * @param adaptation
     * @returns {Array}
     * @memberof DashManifestExtensions#
     */
    getBitrateListForAdaptation: function(adaptation) {
        if (!adaptation || !adaptation.Representation_asArray || !adaptation.Representation_asArray.length) return null;

        var a = this.processAdaptation(adaptation),
            reps = a.Representation_asArray,
            ln = reps.length,
            bitrateList = [];

        for (var i = 0; i < ln; i += 1) {
            bitrateList.push(reps[i].bandwidth);
        }

        return bitrateList;
    },

    getRepresentationFor: function (index, adaptation) {
        "use strict";
        return adaptation.Representation_asArray[index];
    },

    getRepresentationsForAdaptation: function(manifest, adaptation) {
        var self = this,
            a = self.processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]),
            representations = [],
            representation,
            initialization,
            segmentInfo,
            r,
            s;

        for (var i = 0; i < a.Representation_asArray.length; i += 1) {
            r = a.Representation_asArray[i];
            representation = new Dash.vo.Representation();
            representation.index = i;
            representation.adaptation = adaptation;

            if (r.hasOwnProperty("id")) {
                representation.id = r.id;
            }

            if (r.hasOwnProperty("SegmentBase")) {
                segmentInfo = r.SegmentBase;
                representation.segmentInfoType = "SegmentBase";
            }
            else if (r.hasOwnProperty("SegmentList")) {
                segmentInfo = r.SegmentList;
                representation.segmentInfoType = "SegmentList";
                representation.useCalculatedLiveEdgeTime = true;
            }
            else if (r.hasOwnProperty("SegmentTemplate")) {
                segmentInfo = r.SegmentTemplate;

                if (segmentInfo.hasOwnProperty("SegmentTimeline")) {
                    representation.segmentInfoType = "SegmentTimeline";
                    s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length -1];
                    if (!s.hasOwnProperty("r") || s.r >= 0) {
                        representation.useCalculatedLiveEdgeTime = true;
                    }
                } else {
                    representation.segmentInfoType = "SegmentTemplate";
                }

                if (segmentInfo.hasOwnProperty("initialization")) {
                    representation.initialization = segmentInfo.initialization.split("$Bandwidth$")
                        .join(r.bandwidth).split("$RepresentationID$").join(r.id);
                }
            } else {
                segmentInfo = r.BaseURL;
                representation.segmentInfoType = "BaseURL";
            }

            if (segmentInfo.hasOwnProperty("Initialization")) {
                initialization = segmentInfo.Initialization;
                if (initialization.hasOwnProperty("sourceURL")) {
                    representation.initialization = initialization.sourceURL;
                } else if (initialization.hasOwnProperty("range")) {
                    representation.initialization = r.BaseURL;
                    representation.range = initialization.range;
                }
            } else if (r.hasOwnProperty("mimeType") && self.getIsTextTrack(r.mimeType)) {
                representation.initialization = r.BaseURL;
                representation.range = 0;
            }

            if (segmentInfo.hasOwnProperty("timescale")) {
                representation.timescale = segmentInfo.timescale;
            }
            if (segmentInfo.hasOwnProperty("duration")) {
                // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
                // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
                // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
                // exceeds @maxSegmentDuration
                //representation.segmentDuration = Math.min(segmentInfo.duration / representation.timescale, adaptation.period.mpd.maxSegmentDuration);
                representation.segmentDuration = segmentInfo.duration / representation.timescale;
            }
            if (segmentInfo.hasOwnProperty("startNumber")) {
                representation.startNumber = segmentInfo.startNumber;
            }
            if (segmentInfo.hasOwnProperty("indexRange")) {
                representation.indexRange = segmentInfo.indexRange;
            }
            if (segmentInfo.hasOwnProperty("presentationTimeOffset")) {
                representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale;
            }

            representation.MSETimeOffset = self.timelineConverter.calcMSETimeOffset(representation);
            representations.push(representation);
        }

        return representations;
    },

    getAdaptationsForPeriod: function(manifest, period) {
        var p = manifest.Period_asArray[period.index],
            adaptations = [],
            adaptationSet,
            a;

        for (var i = 0; i < p.AdaptationSet_asArray.length; i += 1) {
            a = p.AdaptationSet_asArray[i];
            adaptationSet = new Dash.vo.AdaptationSet();

            if (a.hasOwnProperty("id")) {
                adaptationSet.id = a.id;
            }

            adaptationSet.index = i;
            adaptationSet.period = period;
            adaptationSet.type = this.getIsAudio(a) ? "audio" : (this.getIsVideo(a) ? "video" : "text");
            adaptations.push(adaptationSet);
        }

        return adaptations;
    },

    getRegularPeriods: function (manifest, mpd) {
        var self = this,
            periods = [],
            isDynamic = self.getIsDynamic(manifest),
            i,
            len,
            p1 = null,
            p = null,
            vo1 = null,
            vo = null;

        for (i = 0, len = manifest.Period_asArray.length; i < len; i += 1) {
            p = manifest.Period_asArray[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (p.hasOwnProperty("start")){
                vo = new Dash.vo.Period();
                vo.start = p.start;
            }
            // If the @start attribute is absent, but the previous Period
            // element contains a @duration attribute then then this new
            // Period is also a regular Period. The start time of the new
            // Period PeriodStart is the sum of the start time of the previous
            // Period PeriodStart and the value of the attribute @duration
            // of the previous Period.
            else if (p1 !== null && p.hasOwnProperty("duration") && vo1 !== null){
                vo = new Dash.vo.Period();
                vo.start = vo1.start + vo1.duration;
                vo.duration = p.duration;
            }
            // If (i) @start attribute is absent, and (ii) the Period element
            // is the first in the MPD, and (iii) the MPD@type is 'static',
            // then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                vo = new Dash.vo.Period();
                vo.start = 0;
            }

            // The Period extends until the PeriodStart of the next Period.
            // The difference between the PeriodStart time of a Period and
            // the PeriodStart time of the following Period.
            if (vo1 !== null && isNaN(vo1.duration))
            {
                vo1.duration = vo.start - vo1.start;
            }

            if (vo !== null && p.hasOwnProperty("id")){
                vo.id = p.id;
            }

            if (vo !== null && p.hasOwnProperty("duration")){
                vo.duration = p.duration;
            }

            if (vo !== null){
                vo.index = i;
                vo.mpd = mpd;
                periods.push(vo);
                p1 = p;
                vo1 = vo;
            }

            p = null;
            vo = null;
        }

        if (periods.length === 0) {
            return periods;
        }

        mpd.checkTime = self.getCheckTime(manifest, periods[0]);
        // The last Period extends until the end of the Media Presentation.
        // The difference between the PeriodStart time of the last Period
        // and the mpd duration
        if (vo1 !== null && isNaN(vo1.duration)) {
            vo1.duration = self.getEndTimeForLastPeriod(mpd) - vo1.start;
        }

        return periods;
    },

    getMpd: function(manifest) {
        var mpd = new Dash.vo.Mpd();

        mpd.manifest = manifest;

        if (manifest.hasOwnProperty("availabilityStartTime")) {
            mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
        } else {
            mpd.availabilityStartTime = new Date(manifest.loadedTime.getTime());
        }

        if (manifest.hasOwnProperty("availabilityEndTime")) {
            mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
        }

        if (manifest.hasOwnProperty("suggestedPresentationDelay")) {
            mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
        }

        if (manifest.hasOwnProperty("timeShiftBufferDepth")) {
            mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
        }

        if (manifest.hasOwnProperty("maxSegmentDuration")) {
            mpd.maxSegmentDuration = manifest.maxSegmentDuration;
        }

        return mpd;
    },

    getFetchTime: function(manifest, period) {
        // FetchTime is defined as the time at which the server processes the request for the MPD from the client.
        // TODO The client typically should not use the time at which it actually successfully received the MPD, but should
        // take into account delay due to MPD delivery and processing. The fetch is considered successful fetching
        // either if the client obtains an updated MPD or the client verifies that the MPD has not been updated since the previous fetching.

        return this.timelineConverter.calcPresentationTimeFromWallTime(manifest.loadedTime, period);
    },

    getCheckTime: function(manifest, period) {
        var self = this,
            checkTime = NaN,
            fetchTime;

        // If the MPD@minimumUpdatePeriod attribute in the client is provided, then the check time is defined as the
        // sum of the fetch time of this operating MPD and the value of this attribute,
        // i.e. CheckTime = FetchTime + MPD@minimumUpdatePeriod.
        if (manifest.hasOwnProperty("minimumUpdatePeriod")) {
            fetchTime = self.getFetchTime(manifest, period);
            checkTime = fetchTime + manifest.minimumUpdatePeriod;
        }
        // TODO If the MPD@minimumUpdatePeriod attribute in the client is not provided, external means are used to
        // determine CheckTime, such as a priori knowledge, or HTTP cache headers, etc.

        return checkTime;
    },

    getEndTimeForLastPeriod: function(mpd) {
        var periodEnd;

        // if the MPD@mediaPresentationDuration attribute is present, then PeriodEndTime is defined as the end time of the Media Presentation.
        // if the MPD@mediaPresentationDuration attribute is not present, then PeriodEndTime is defined as FetchTime + MPD@minimumUpdatePeriod

        if (mpd.manifest.mediaPresentationDuration) {
            periodEnd = mpd.manifest.mediaPresentationDuration;
        } else if (!isNaN(mpd.checkTime)) {
            // in this case the Period End Time should match CheckTime
            periodEnd = mpd.checkTime;
        } else {
            throw new Error("Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period.");
        }

        return periodEnd;
    },

    getEventsForPeriod: function(manifest,period) {

        var periodArray = manifest.Period_asArray,
            eventStreams = periodArray[period.index].EventStream_asArray,
            events = [];

        if(eventStreams) {
            for(var i = 0; i < eventStreams.length; i += 1) {
                var eventStream = new Dash.vo.EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;

                if(eventStreams[i].hasOwnProperty("schemeIdUri")) {
                    eventStream.schemeIdUri = eventStreams[i].schemeIdUri;
                } else {
                    throw "Invalid EventStream. SchemeIdUri has to be set";
                }
                if(eventStreams[i].hasOwnProperty("timescale")) {
                    eventStream.timescale = eventStreams[i].timescale;
                }
                if(eventStreams[i].hasOwnProperty("value")) {
                    eventStream.value = eventStreams[i].value;
                }
                for(var j = 0; j < eventStreams[i].Event_asArray.length; j += 1) {
                    var event = new Dash.vo.Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;

                    if(eventStreams[i].Event_asArray[j].hasOwnProperty("presentationTime")) {
                        event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime;
                    }
                    if(eventStreams[i].Event_asArray[j].hasOwnProperty("duration")) {
                        event.duration = eventStreams[i].Event_asArray[j].duration;
                    }
                    if(eventStreams[i].Event_asArray[j].hasOwnProperty("id")) {
                        event.id = eventStreams[i].Event_asArray[j].id;
                    }
                    events.push(event);
                }
            }
        }

        return events;
    },

    getEventStreams: function(inbandStreams, representation) {
        var eventStreams = [];

        if(!inbandStreams) return eventStreams;

        for(var i = 0; i < inbandStreams.length ; i++ ) {
            var eventStream = new Dash.vo.EventStream();
            eventStream.timescale = 1;
            eventStream.representation =  representation;

            if(inbandStreams[i].hasOwnProperty("schemeIdUri")) {
                eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
            } else {
                throw "Invalid EventStream. SchemeIdUri has to be set";
            }
            if(inbandStreams[i].hasOwnProperty("timescale")) {
                eventStream.timescale = inbandStreams[i].timescale;
            }
            if(inbandStreams[i].hasOwnProperty("value")) {
                eventStream.value = inbandStreams[i].value;
            }
            eventStreams.push(eventStream);
        }

        return eventStreams;
    },

    getEventStreamForAdaptationSet : function (manifest, adaptation) {
        var inbandStreams = manifest.Period_asArray[adaptation.period.index].
                AdaptationSet_asArray[adaptation.index].InbandEventStream_asArray;

        return this.getEventStreams(inbandStreams, null);
    },

    getEventStreamForRepresentation : function (manifest, representation) {
        var inbandStreams = manifest.Period_asArray[representation.adaptation.period.index].
                AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].InbandEventStream_asArray;

        return this.getEventStreams(inbandStreams, representation);
    },

    getUTCTimingSources : function (manifest) {
        "use strict";

        var self = this,
            isDynamic = self.getIsDynamic(manifest),
            hasAST = manifest.hasOwnProperty("availabilityStartTime"),
            utcTimingsArray = manifest.UTCTiming_asArray,
            utcTimingEntries = [];

        // do not bother synchronizing the clock unless MPD is live,
        // or it is static and has availabilityStartTime attribute
        if ((isDynamic || hasAST)) {
            if (utcTimingsArray) {
                // the order is important here - 23009-1 states that the order
                // in the manifest "indicates relative preference, first having
                // the highest, and the last the lowest priority".
                utcTimingsArray.forEach(function (utcTiming) {
                    var entry = new Dash.vo.UTCTiming();

                    if (utcTiming.hasOwnProperty("schemeIdUri")) {
                        entry.schemeIdUri = utcTiming.schemeIdUri;
                    } else {
                        // entries of type DescriptorType with no schemeIdUri
                        // are meaningless. let's just ignore this entry and
                        // move on.
                        return;
                    }

                    // this is (incorrectly) interpreted as a number - schema
                    // defines it as a string
                    if (utcTiming.hasOwnProperty("value")) {
                        entry.value = utcTiming.value.toString();
                    } else {
                        // without a value, there's not a lot we can do with
                        // this entry. let's just ignore this one and move on
                        return;
                    }

                    // we're not interested in the optional id or any other
                    // attributes which might be attached to the entry

                    utcTimingEntries.push(entry);
                });
            }
        }

        return utcTimingEntries;
    }
};
