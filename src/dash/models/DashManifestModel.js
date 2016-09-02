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

import Representation from '../vo/Representation';
import AdaptationSet from '../vo/AdaptationSet';
import Period from '../vo/Period';
import Mpd from '../vo/Mpd';
import UTCTiming from '../vo/UTCTiming';
import TimelineConverter from '../utils/TimelineConverter';
import MediaController from '../../streaming/controllers/MediaController';
import DashAdapter from '../DashAdapter';
import Event from '../vo/Event';
import BaseURL from '../vo/BaseURL';
import EventStream from '../vo/EventStream';
import URLUtils from '../../streaming/utils/URLUtils';
import FactoryMaker from '../../core/FactoryMaker';

function DashManifestModel() {

    let instance;
    let context = this.context;
    let timelineConverter = TimelineConverter(context).getInstance();//TODO Need to pass this in not bake in
    let mediaController = MediaController(context).getInstance();
    let adaptor = DashAdapter(context).getInstance();

    const urlUtils = URLUtils(context).getInstance();

    function getIsTypeOf(adaptation, type) {

        var i,
            len,
            representation;
        var result = false;
        var found = false;

        var col = adaptation.ContentComponent_asArray;
        var mimeTypeRegEx = (type !== 'text') ? new RegExp(type) : new RegExp('(vtt|ttml)');

        if ((adaptation.Representation_asArray.length > 0) &&
            (adaptation.Representation_asArray[0].hasOwnProperty('codecs'))) {
            var codecs = adaptation.Representation_asArray[0].codecs;
            if (codecs === 'stpp' || codecs === 'wvtt') {
                return type === 'fragmentedText';
            }
        }

        if (col) {
            if (col.length > 1) {
                return (type === 'muxed');
            } else if (col[0] && col[0].contentType === type) {
                result = true;
                found = true;
            }
        }

        if (adaptation.hasOwnProperty('mimeType')) {
            result = mimeTypeRegEx.test(adaptation.mimeType);
            found = true;
        }

        // couldn't find on adaptationset, so check a representation
        if (!found) {
            i = 0;
            len = adaptation.Representation_asArray.length;
            while (!found && i < len) {
                representation = adaptation.Representation_asArray[i];

                if (representation.hasOwnProperty('mimeType')) {
                    result = mimeTypeRegEx.test(representation.mimeType);
                    found = true;
                }

                i++;
            }
        }

        return result;
    }

    function getIsAudio(adaptation) {
        return getIsTypeOf(adaptation, 'audio');
    }

    function getIsVideo(adaptation) {
        return getIsTypeOf(adaptation, 'video');
    }

    function getIsFragmentedText(adaptation) {
        return getIsTypeOf(adaptation, 'fragmentedText');
    }

    function getIsText(adaptation) {
        return getIsTypeOf(adaptation, 'text');
    }

    function getIsMuxed(adaptation) {
        return getIsTypeOf(adaptation, 'muxed');
    }

    function getIsTextTrack(type) {
        return (type === 'text/vtt' || type === 'application/ttml+xml');
    }

    function getLanguageForAdaptation(adaptation) {
        var lang = '';

        if (adaptation.hasOwnProperty('lang')) {
            //Filter out any other characters not allowed according to RFC5646
            lang = adaptation.lang.replace(/[^A-Za-z0-9-]/g,'');
        }

        return lang;
    }

    function getViewpointForAdaptation(adaptation) {
        return adaptation.hasOwnProperty('Viewpoint') ? adaptation.Viewpoint : null;
    }

    function getRolesForAdaptation(adaptation) {
        return adaptation.hasOwnProperty('Role_asArray') ? adaptation.Role_asArray : [];
    }

    function getAccessibilityForAdaptation(adaptation) {
        return adaptation.hasOwnProperty('Accessibility_asArray') ? adaptation.Accessibility_asArray : [];
    }

    function getAudioChannelConfigurationForAdaptation(adaptation) {
        return adaptation.hasOwnProperty('AudioChannelConfiguration_asArray') ? adaptation.AudioChannelConfiguration_asArray : [];
    }

    function getIsMain(adaptation) {
        return getRolesForAdaptation(adaptation).filter(function (role) {
            return role.value === 'main';
        })[0];
    }

    function getRepresentationSortFunction() {
        return (a, b) => a.bandwidth - b.bandwidth;
    }

    function processAdaptation(adaptation) {
        if (adaptation.Representation_asArray !== undefined && adaptation.Representation_asArray !== null) {
            adaptation.Representation_asArray.sort(getRepresentationSortFunction());
        }

        return adaptation;
    }

    function getAdaptationForId(id, manifest, periodIndex) {

        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        var i,
            len;

        for (i = 0, len = adaptations.length; i < len; i++) {
            if (adaptations[i].hasOwnProperty('id') && adaptations[i].id === id) {
                return adaptations[i];
            }
        }

        return null;
    }

    function getAdaptationForIndex(index, manifest, periodIndex) {
        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        return adaptations[index];
    }

    function getIndexForAdaptation(adaptation, manifest, periodIndex) {

        var adaptations = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        var i,
            len;

        for (i = 0, len = adaptations.length; i < len; i++) {
            if (adaptations[i] === adaptation) {
                return i;
            }
        }

        return -1;
    }

    function getAdaptationsForType(manifest, periodIndex, type) {

        var adaptationSet = manifest.Period_asArray[periodIndex].AdaptationSet_asArray;
        var i,
            len;
        var adaptations = [];

        for (i = 0, len = adaptationSet.length; i < len; i++) {
            if (getIsTypeOf(adaptationSet[i], type)) {
                adaptations.push(processAdaptation(adaptationSet[i]));
            }
        }

        return adaptations;
    }

    function getAdaptationForType(manifest, periodIndex, type, streamInfo) {

        let adaptations = getAdaptationsForType(manifest, periodIndex, type);

        if (!adaptations || adaptations.length === 0) return null;

        if (adaptations.length > 1 && streamInfo) {
            let currentTrack = mediaController.getCurrentTrackFor(type, streamInfo);
            let allMediaInfoForType = adaptor.getAllMediaInfoForType(manifest, streamInfo, type);
            for (let i = 0, ln = adaptations.length; i < ln; i++) {
                if (currentTrack && mediaController.isTracksEqual(currentTrack, allMediaInfoForType[i])) {
                    return adaptations[i];
                }
                if (getIsMain(adaptations[i])) {
                    return adaptations[i];
                }
            }
        }

        return adaptations[0];
    }

    function getCodec(adaptation) {
        var representation = adaptation.Representation_asArray[0];
        return (representation.mimeType + ';codecs="' + representation.codecs + '"');
    }

    function getMimeType(adaptation) {
        return adaptation.Representation_asArray[0].mimeType;
    }

    function getKID(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty('cenc:default_KID')) {
            return null;
        }
        return adaptation['cenc:default_KID'];
    }

    function getContentProtectionData(adaptation) {
        if (!adaptation || !adaptation.hasOwnProperty('ContentProtection_asArray') || adaptation.ContentProtection_asArray.length === 0) {
            return null;
        }
        return adaptation.ContentProtection_asArray;
    }

    function getIsDynamic(manifest) {
        var isDynamic = false;
        if (manifest.hasOwnProperty('type')) {
            isDynamic = (manifest.type === 'dynamic');
        }
        return isDynamic;
    }

    function getIsDVR(manifest) {
        var isDynamic = getIsDynamic(manifest);
        var containsDVR,
            isDVR;

        containsDVR = !isNaN(manifest.timeShiftBufferDepth);
        isDVR = (isDynamic && containsDVR);

        return isDVR;
    }

    function hasProfile(manifest, profile) {
        var has = false;

        if (manifest.profiles && manifest.profiles.length > 0) {
            has = (manifest.profiles.indexOf(profile) !== -1);
        }

        return has;
    }

    function getIsOnDemand(manifest) {
        return hasProfile(manifest, 'urn:mpeg:dash:profile:isoff-on-demand:2011');
    }

    function getIsDVB(manifest) {
        return hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');
    }

    function getDuration(manifest) {
        var mpdDuration;
        //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
        //If the attribute is not present, the duration of the Media Presentation is unknown.
        if (manifest.hasOwnProperty('mediaPresentationDuration')) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.MAX_VALUE;
        }

        return mpdDuration;
    }

    function getBandwidth(representation) {
        return representation.bandwidth;
    }

    function getRefreshDelay(manifest) {
        var delay = NaN;
        var minDelay = 2;

        if (manifest.hasOwnProperty('minimumUpdatePeriod')) {
            delay = Math.max(parseFloat(manifest.minimumUpdatePeriod), minDelay);
        }

        return delay;
    }

    function getRepresentationCount(adaptation) {
        return adaptation.Representation_asArray.length;
    }

    function getBitrateListForAdaptation(adaptation) {
        if (!adaptation || !adaptation.Representation_asArray || !adaptation.Representation_asArray.length) return null;

        var a = processAdaptation(adaptation);
        var reps = a.Representation_asArray;
        var ln = reps.length;
        var bitrateList = [];

        for (var i = 0; i < ln; i++) {
            bitrateList.push({
                bandwidth: reps[i].bandwidth,
                width: reps[i].width || 0,
                height: reps[i].height || 0
            });
        }

        return bitrateList;
    }

    function getRepresentationFor(index, adaptation) {
        return adaptation.Representation_asArray[index];
    }

    function getRepresentationsForAdaptation(manifest, adaptation) {
        var a = processAdaptation(manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index]);
        var representations = [];
        var representation,
            initialization,
            segmentInfo,
            r,
            s;

        for (var i = 0; i < a.Representation_asArray.length; i++) {
            r = a.Representation_asArray[i];
            representation = new Representation();
            representation.index = i;
            representation.adaptation = adaptation;

            if (r.hasOwnProperty('id')) {
                representation.id = r.id;
            }

            if (r.hasOwnProperty('bandwidth')) {
                representation.bandwidth = r.bandwidth;
            }
            if (r.hasOwnProperty('maxPlayoutRate')) {
                representation.maxPlayoutRate = r.maxPlayoutRate;
            }
            if (r.hasOwnProperty('SegmentBase')) {
                segmentInfo = r.SegmentBase;
                representation.segmentInfoType = 'SegmentBase';
            }
            else if (r.hasOwnProperty('SegmentList')) {
                segmentInfo = r.SegmentList;

                if (segmentInfo.hasOwnProperty('SegmentTimeline')) {
                    representation.segmentInfoType = 'SegmentTimeline';
                    s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length - 1];
                    if (!s.hasOwnProperty('r') || s.r >= 0) {
                        representation.useCalculatedLiveEdgeTime = true;
                    }
                } else {
                    representation.segmentInfoType = 'SegmentList';
                    representation.useCalculatedLiveEdgeTime = true;
                }
            }
            else if (r.hasOwnProperty('SegmentTemplate')) {
                segmentInfo = r.SegmentTemplate;

                if (segmentInfo.hasOwnProperty('SegmentTimeline')) {
                    representation.segmentInfoType = 'SegmentTimeline';
                    s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length - 1];
                    if (!s.hasOwnProperty('r') || s.r >= 0) {
                        representation.useCalculatedLiveEdgeTime = true;
                    }
                } else {
                    representation.segmentInfoType = 'SegmentTemplate';
                }

                if (segmentInfo.hasOwnProperty('initialization')) {
                    representation.initialization = segmentInfo.initialization.split('$Bandwidth$')
                        .join(r.bandwidth).split('$RepresentationID$').join(r.id);
                }
            } else {
                segmentInfo = r.BaseURL;
                representation.segmentInfoType = 'BaseURL';
            }

            if (segmentInfo.hasOwnProperty('Initialization')) {
                initialization = segmentInfo.Initialization;
                if (initialization.hasOwnProperty('sourceURL')) {
                    representation.initialization = initialization.sourceURL;
                } else if (initialization.hasOwnProperty('range')) {
                    representation.range = initialization.range;
                }
            } else if (r.hasOwnProperty('mimeType') && getIsTextTrack(r.mimeType)) {
                representation.range = 0;
            }

            if (segmentInfo.hasOwnProperty('timescale')) {
                representation.timescale = segmentInfo.timescale;
            }
            if (segmentInfo.hasOwnProperty('duration')) {
                // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
                // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
                // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
                // exceeds @maxSegmentDuration
                //representation.segmentDuration = Math.min(segmentInfo.duration / representation.timescale, adaptation.period.mpd.maxSegmentDuration);
                representation.segmentDuration = segmentInfo.duration / representation.timescale;
            }
            if (segmentInfo.hasOwnProperty('startNumber')) {
                representation.startNumber = segmentInfo.startNumber;
            }
            if (segmentInfo.hasOwnProperty('indexRange')) {
                representation.indexRange = segmentInfo.indexRange;
            }
            if (segmentInfo.hasOwnProperty('presentationTimeOffset')) {
                representation.presentationTimeOffset = segmentInfo.presentationTimeOffset / representation.timescale;
            }

            representation.MSETimeOffset = timelineConverter.calcMSETimeOffset(representation);

            representation.path = [adaptation.period.index, adaptation.index, i];

            representations.push(representation);
        }

        return representations;
    }

    function getAdaptationsForPeriod(manifest, period) {
        var p = manifest.Period_asArray[period.index];
        var adaptations = [];
        var adaptationSet,
            a;

        for (var i = 0; i < p.AdaptationSet_asArray.length; i++) {
            a = p.AdaptationSet_asArray[i];
            adaptationSet = new AdaptationSet();

            if (a.hasOwnProperty('id')) {
                adaptationSet.id = a.id;
            }

            adaptationSet.index = i;
            adaptationSet.period = period;

            if (getIsMuxed(a)) {
                adaptationSet.type = 'muxed';
            } else if (getIsAudio(a)) {
                adaptationSet.type = 'audio';
            }else if (getIsVideo(a)) {
                adaptationSet.type = 'video';
            }else if (getIsFragmentedText(a)) {
                adaptationSet.type = 'fragmentedText';
            }else {
                adaptationSet.type = 'text';
            }

            adaptations.push(adaptationSet);
        }

        return adaptations;
    }

    function getRegularPeriods(manifest, mpd) {
        var isDynamic = getIsDynamic(manifest);
        var periods = [];
        var p1 = null;
        var p = null;
        var vo1 = null;
        var vo = null;
        var len,
            i;

        for (i = 0, len = manifest.Period_asArray.length; i < len; i++) {
            p = manifest.Period_asArray[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (p.hasOwnProperty('start')) {
                vo = new Period();
                vo.start = p.start;
            }
            // If the @start attribute is absent, but the previous Period
            // element contains a @duration attribute then then this new
            // Period is also a regular Period. The start time of the new
            // Period PeriodStart is the sum of the start time of the previous
            // Period PeriodStart and the value of the attribute @duration
            // of the previous Period.
            else if (p1 !== null && p.hasOwnProperty('duration') && vo1 !== null) {
                vo = new Period();
                vo.start = vo1.start + vo1.duration;
                vo.duration = p.duration;
            }
            // If (i) @start attribute is absent, and (ii) the Period element
            // is the first in the MPD, and (iii) the MPD@type is 'static',
            // then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                vo = new Period();
                vo.start = 0;
            }

            // The Period extends until the PeriodStart of the next Period.
            // The difference between the PeriodStart time of a Period and
            // the PeriodStart time of the following Period.
            if (vo1 !== null && isNaN(vo1.duration))
            {
                vo1.duration = vo.start - vo1.start;
            }

            if (vo !== null) {
                vo.id = getPeriodId(p);
            }

            if (vo !== null && p.hasOwnProperty('duration')) {
                vo.duration = p.duration;
            }

            if (vo !== null) {
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

        // The last Period extends until the end of the Media Presentation.
        // The difference between the PeriodStart time of the last Period
        // and the mpd duration
        if (vo1 !== null && isNaN(vo1.duration)) {
            vo1.duration = getEndTimeForLastPeriod(manifest, vo1) - vo1.start;
        }

        return periods;
    }

    function getPeriodId(p) {
        if (!p) {
            throw new Error('Period cannot be null or undefined');
        }

        var id = Period.DEFAULT_ID;

        if (p.hasOwnProperty('id') && p.id !== '__proto__') {
            id = p.id;
        }

        return id;
    }

    function getMpd(manifest) {
        var mpd = new Mpd();

        mpd.manifest = manifest;

        if (manifest.hasOwnProperty('availabilityStartTime')) {
            mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
        } else {
            mpd.availabilityStartTime = new Date(manifest.loadedTime.getTime());
        }

        if (manifest.hasOwnProperty('availabilityEndTime')) {
            mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
        }

        if (manifest.hasOwnProperty('suggestedPresentationDelay')) {
            mpd.suggestedPresentationDelay = manifest.suggestedPresentationDelay;
        }

        if (manifest.hasOwnProperty('timeShiftBufferDepth')) {
            mpd.timeShiftBufferDepth = manifest.timeShiftBufferDepth;
        }

        if (manifest.hasOwnProperty('maxSegmentDuration')) {
            mpd.maxSegmentDuration = manifest.maxSegmentDuration;
        }

        return mpd;
    }

    function getFetchTime(manifest, period) {
        // FetchTime is defined as the time at which the server processes the request for the MPD from the client.
        // TODO The client typically should not use the time at which it actually successfully received the MPD, but should
        // take into account delay due to MPD delivery and processing. The fetch is considered successful fetching
        // either if the client obtains an updated MPD or the client verifies that the MPD has not been updated since the previous fetching.

        return timelineConverter.calcPresentationTimeFromWallTime(manifest.loadedTime, period);
    }

    function getCheckTime(manifest, period) {
        var checkTime = NaN;
        var fetchTime;

        // If the MPD@minimumUpdatePeriod attribute in the client is provided, then the check time is defined as the
        // sum of the fetch time of this operating MPD and the value of this attribute,
        // i.e. CheckTime = FetchTime + MPD@minimumUpdatePeriod.
        if (manifest.hasOwnProperty('minimumUpdatePeriod')) {
            fetchTime = getFetchTime(manifest, period);
            checkTime = fetchTime + manifest.minimumUpdatePeriod;
        }
        // TODO If the MPD@minimumUpdatePeriod attribute in the client is not provided, external means are used to
        // determine CheckTime, such as a priori knowledge, or HTTP cache headers, etc.

        return checkTime;
    }

    function getEndTimeForLastPeriod(manifest, period) {
        var periodEnd;
        var checkTime = getCheckTime(manifest, period);

        // if the MPD@mediaPresentationDuration attribute is present, then PeriodEndTime is defined as the end time of the Media Presentation.
        // if the MPD@mediaPresentationDuration attribute is not present, then PeriodEndTime is defined as FetchTime + MPD@minimumUpdatePeriod

        if (manifest.mediaPresentationDuration) {
            periodEnd = manifest.mediaPresentationDuration;
        } else if (!isNaN(checkTime)) {
            // in this case the Period End Time should match CheckTime
            periodEnd = checkTime;
        } else {
            throw new Error('Must have @mediaPresentationDuration or @minimumUpdatePeriod on MPD or an explicit @duration on the last period.');
        }

        return periodEnd;
    }

    function getEventsForPeriod(manifest, period) {

        var periodArray = manifest.Period_asArray;
        var eventStreams = periodArray[period.index].EventStream_asArray;
        var events = [];

        if (eventStreams) {
            for (var i = 0; i < eventStreams.length; i++) {
                var eventStream = new EventStream();
                eventStream.period = period;
                eventStream.timescale = 1;

                if (eventStreams[i].hasOwnProperty('schemeIdUri')) {
                    eventStream.schemeIdUri = eventStreams[i].schemeIdUri;
                } else {
                    throw new Error('Invalid EventStream. SchemeIdUri has to be set');
                }
                if (eventStreams[i].hasOwnProperty('timescale')) {
                    eventStream.timescale = eventStreams[i].timescale;
                }
                if (eventStreams[i].hasOwnProperty('value')) {
                    eventStream.value = eventStreams[i].value;
                }
                for (var j = 0; j < eventStreams[i].Event_asArray.length; j++) {
                    var event = new Event();
                    event.presentationTime = 0;
                    event.eventStream = eventStream;

                    if (eventStreams[i].Event_asArray[j].hasOwnProperty('presentationTime')) {
                        event.presentationTime = eventStreams[i].Event_asArray[j].presentationTime;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty('duration')) {
                        event.duration = eventStreams[i].Event_asArray[j].duration;
                    }
                    if (eventStreams[i].Event_asArray[j].hasOwnProperty('id')) {
                        event.id = eventStreams[i].Event_asArray[j].id;
                    }
                    events.push(event);
                }
            }
        }

        return events;
    }

    function getEventStreams(inbandStreams, representation) {
        var eventStreams = [];

        if (!inbandStreams) return eventStreams;

        for (var i = 0; i < inbandStreams.length ; i++ ) {
            var eventStream = new EventStream();
            eventStream.timescale = 1;
            eventStream.representation =  representation;

            if (inbandStreams[i].hasOwnProperty('schemeIdUri')) {
                eventStream.schemeIdUri = inbandStreams[i].schemeIdUri;
            } else {
                throw new Error('Invalid EventStream. SchemeIdUri has to be set');
            }
            if (inbandStreams[i].hasOwnProperty('timescale')) {
                eventStream.timescale = inbandStreams[i].timescale;
            }
            if (inbandStreams[i].hasOwnProperty('value')) {
                eventStream.value = inbandStreams[i].value;
            }
            eventStreams.push(eventStream);
        }

        return eventStreams;
    }

    function getEventStreamForAdaptationSet(manifest, adaptation) {
        var inbandStreams = manifest.Period_asArray[adaptation.period.index].
            AdaptationSet_asArray[adaptation.index].InbandEventStream_asArray;

        return getEventStreams(inbandStreams, null);
    }

    function getEventStreamForRepresentation(manifest, representation) {
        var inbandStreams = manifest.Period_asArray[representation.adaptation.period.index].
            AdaptationSet_asArray[representation.adaptation.index].Representation_asArray[representation.index].InbandEventStream_asArray;

        return getEventStreams(inbandStreams, representation);
    }

    function getUTCTimingSources(manifest) {

        var isDynamic = getIsDynamic(manifest);
        var hasAST = manifest.hasOwnProperty('availabilityStartTime');
        var utcTimingsArray = manifest.UTCTiming_asArray;
        var utcTimingEntries = [];

        // do not bother synchronizing the clock unless MPD is live,
        // or it is static and has availabilityStartTime attribute
        if ((isDynamic || hasAST)) {
            if (utcTimingsArray) {
                // the order is important here - 23009-1 states that the order
                // in the manifest "indicates relative preference, first having
                // the highest, and the last the lowest priority".
                utcTimingsArray.forEach(function (utcTiming) {
                    var entry = new UTCTiming();

                    if (utcTiming.hasOwnProperty('schemeIdUri')) {
                        entry.schemeIdUri = utcTiming.schemeIdUri;
                    } else {
                        // entries of type DescriptorType with no schemeIdUri
                        // are meaningless. let's just ignore this entry and
                        // move on.
                        return;
                    }

                    // this is (incorrectly) interpreted as a number - schema
                    // defines it as a string
                    if (utcTiming.hasOwnProperty('value')) {
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

    function getBaseURLsFromElement(node) {
        let baseUrls = [];
        // if node.BaseURL_asArray and node.baseUri are undefined entries
        // will be [undefined] which entries.some will just skip
        let entries = node.BaseURL_asArray || [node.baseUri];
        let earlyReturn = false;

        entries.some(entry => {
            if (entry) {
                const baseUrl = new BaseURL();
                let text = entry.__text || entry;

                if (urlUtils.isRelative(text)) {
                    // it doesn't really make sense to have relative and
                    // absolute URLs at the same level, or multiple
                    // relative URLs at the same level, so assume we are
                    // done from this level of the MPD
                    earlyReturn = true;

                    // deal with the specific case where the MPD@BaseURL
                    // is specified and is relative. when no MPD@BaseURL
                    // entries exist, that case is handled by the
                    // [node.baseUri] in the entries definition.
                    if (node.baseUri) {
                        text = node.baseUri + text;
                    }
                }

                baseUrl.url = text;

                // serviceLocation is optional, but we need it in order
                // to blacklist correctly. if it's not available, use
                // anything unique since there's no relationship to any
                // other BaseURL and, in theory, the url should be
                // unique so use this instead.
                if (entry.hasOwnProperty('serviceLocation') &&
                        entry.serviceLocation.length) {
                    baseUrl.serviceLocation = entry.serviceLocation;
                } else {
                    baseUrl.serviceLocation = text;
                }

                if (entry.hasOwnProperty('dvb:priority')) {
                    baseUrl.dvb_priority = entry['dvb:priority'];
                }

                if (entry.hasOwnProperty('dvb:weight')) {
                    baseUrl.dvb_weight = entry['dvb:weight'];
                }

                /* NOTE: byteRange, availabilityTimeOffset,
                 * availabilityTimeComplete currently unused
                 */

                baseUrls.push(baseUrl);

                return earlyReturn;
            }
        });

        return baseUrls;
    }

    function getLocation(manifest) {
        if (manifest.hasOwnProperty('Location')) {
            // for now, do not support multiple Locations -
            // just set Location to the first Location.
            manifest.Location = manifest.Location_asArray[0];
        }

        // may well be undefined
        return manifest.Location;
    }

    instance = {
        getIsTypeOf: getIsTypeOf,
        getIsAudio: getIsAudio,
        getIsVideo: getIsVideo,
        getIsText: getIsText,
        getIsMuxed: getIsMuxed,
        getIsTextTrack: getIsTextTrack,
        getIsFragmentedText: getIsFragmentedText,
        getIsMain: getIsMain,
        getLanguageForAdaptation: getLanguageForAdaptation,
        getViewpointForAdaptation: getViewpointForAdaptation,
        getRolesForAdaptation: getRolesForAdaptation,
        getAccessibilityForAdaptation: getAccessibilityForAdaptation,
        getAudioChannelConfigurationForAdaptation: getAudioChannelConfigurationForAdaptation,
        processAdaptation: processAdaptation,
        getAdaptationForIndex: getAdaptationForIndex,
        getIndexForAdaptation: getIndexForAdaptation,
        getAdaptationForId: getAdaptationForId,
        getAdaptationsForType: getAdaptationsForType,
        getAdaptationForType: getAdaptationForType,
        getCodec: getCodec,
        getMimeType: getMimeType,
        getKID: getKID,
        getContentProtectionData: getContentProtectionData,
        getIsDynamic: getIsDynamic,
        getIsDVR: getIsDVR,
        getIsOnDemand: getIsOnDemand,
        getIsDVB: getIsDVB,
        getDuration: getDuration,
        getBandwidth: getBandwidth,
        getRefreshDelay: getRefreshDelay,
        getRepresentationCount: getRepresentationCount,
        getBitrateListForAdaptation: getBitrateListForAdaptation,
        getRepresentationFor: getRepresentationFor,
        getRepresentationsForAdaptation: getRepresentationsForAdaptation,
        getAdaptationsForPeriod: getAdaptationsForPeriod,
        getRegularPeriods: getRegularPeriods,
        getPeriodId: getPeriodId,
        getMpd: getMpd,
        getFetchTime: getFetchTime,
        getCheckTime: getCheckTime,
        getEndTimeForLastPeriod: getEndTimeForLastPeriod,
        getEventsForPeriod: getEventsForPeriod,
        getEventStreams: getEventStreams,
        getEventStreamForAdaptationSet: getEventStreamForAdaptationSet,
        getEventStreamForRepresentation: getEventStreamForRepresentation,
        getUTCTimingSources: getUTCTimingSources,
        getBaseURLsFromElement: getBaseURLsFromElement,
        getRepresentationSortFunction: getRepresentationSortFunction,
        getLocation: getLocation
    };

    return instance;
}

DashManifestModel.__dashjs_factory_name = 'DashManifestModel';
export default FactoryMaker.getSingletonFactory(DashManifestModel);
