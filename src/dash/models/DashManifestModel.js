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
import ObjectUtils from '../../streaming/utils/ObjectUtils';
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

        let i,
            len,
            representation;
            col,
            mimeTypeRegEx,
            codecs;
        let result = false;
        let found = false;

        if (!adaptation) {
            return result;
        }

        if (adaptation.hasOwnProperty('ContentComponent_asArray')) {
            col = adaptation.ContentComponent_asArray;
        }

        mimeTypeRegEx = (type && type !== 'text') ? new RegExp(type) : new RegExp('(vtt|ttml)');

        if ((adaptation.Representation_asArray && adaptation.Representation_asArray.length && adaptation.Representation_asArray.length > 0) &&
            (adaptation.Representation_asArray[0].hasOwnProperty('codecs'))) {
            // Just check the start of the codecs string
            codecs = adaptation.Representation_asArray[0].codecs;
            if (codecs.search('stpp') === 0 || codecs.search('wvtt') === 0) {
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
            len = adaptation.Representation_asArray && adaptation.Representation_asArray.length ? adaptation.Representation_asArray.length : 0;
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
        let lang = '';

        if (adaptation && adaptation.hasOwnProperty('lang')) {
            //Filter out any other characters not allowed according to RFC5646
            lang = adaptation.lang.replace(/[^A-Za-z0-9-]/g,'');
        }

        return lang;
    }

    function getViewpointForAdaptation(adaptation) {
        return adaptation && adaptation.hasOwnProperty('Viewpoint') ? adaptation.Viewpoint : null;
    }

    function getRolesForAdaptation(adaptation) {
        return adaptation && adaptation.hasOwnProperty('Role_asArray') ? adaptation.Role_asArray : [];
    }

    function getAccessibilityForAdaptation(adaptation) {
        return adaptation && adaptation.hasOwnProperty('Accessibility_asArray') ? adaptation.Accessibility_asArray : [];
    }

    function getAudioChannelConfigurationForAdaptation(adaptation) {
        return adaptation && adaptation.hasOwnProperty('AudioChannelConfiguration_asArray') ? adaptation.AudioChannelConfiguration_asArray : [];
    }

    function getIsMain(adaptation) {
        return getRolesForAdaptation(adaptation).filter(function (role) {
            return role.value === 'main';
        })[0];
    }

    function getRepresentationSortFunction() {
        return (a, b) => a.bandwidth - b.bandwidth;
    }

    function processAdaptation(realAdaptation) {
        if (realAdaptation && realAdaptation.Representation_asArray !== undefined && realAdaptation.Representation_asArray !== null) {
            realAdaptation.Representation_asArray.sort(getRepresentationSortFunction());
        }

        return realAdaptation;
    }

    function getAdaptationForId(id, manifest, periodIndex) {
        let realAdaptations = manifest && manifest.Period_asArray && Number.isInteger(periodIndex) ? manifest.Period_asArray[periodIndex] ? manifest.Period_asArray[periodIndex].AdaptationSet_asArray : [] : [];
        let i,
            len;

        for (i = 0, len = realAdaptations.length; i < len; i++) {
            if (realAdaptations[i].hasOwnProperty('id') && realAdaptations[i].id === id) {
                return realAdaptations[i];
            }
        }

        return null;
    }

    function getAdaptationForIndex(index, manifest, periodIndex) {
        let realAdaptations = manifest && manifest.Period_asArray && Number.isInteger(periodIndex) ? manifest.Period_asArray[periodIndex] ? manifest.Period_asArray[periodIndex].AdaptationSet_asArray : null : null;
        if (realAdaptations && Number.isInteger(index)) {
            return realAdaptations[index];
        }else {
            return null;
        }
    }

    function getIndexForAdaptation(realAdaptation, manifest, periodIndex) {
        let realAdaptations = manifest && manifest.Period_asArray && Number.isInteger(periodIndex) ? manifest.Period_asArray[periodIndex] ? manifest.Period_asArray[periodIndex].AdaptationSet_asArray : [] : [];
        let len = realAdaptations.length;

        if (realAdaptation) {
            for (let i = 0; i < len; i++) {
                let objectUtils = ObjectUtils(context).getInstance();
                if (objectUtils.areEqual(realAdaptations[i], realAdaptation)) {
                    return i;
                }
            }
        }

        return -1;
    }

    function getAdaptationsForType(manifest, periodIndex, type) {
        let realAdaptationSet = manifest && manifest.Period_asArray && Number.isInteger(periodIndex) ? manifest.Period_asArray[periodIndex] ? manifest.Period_asArray[periodIndex].AdaptationSet_asArray : [] : [];
        let i,
            len;
        let adaptations = [];

        for (i = 0, len = realAdaptationSet.length; i < len; i++) {
            if (getIsTypeOf(realAdaptationSet[i], type)) {
                adaptations.push(processAdaptation(realAdaptationSet[i]));
            }
        }

        return adaptations;
    }

    function getAdaptationForType(manifest, periodIndex, type, streamInfo) {

        let adaptations = getAdaptationsForType(manifest, periodIndex, type);

        if (!adaptations || adaptations.length === 0) return null;

        if (adaptations.length > 1 && streamInfo) {
            let currentTrack = mediaController.getCurrentTrackFor(type, streamInfo);
            let allMediaInfoForType = adaptor.getAllMediaInfoForType(streamInfo, type);
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
        if (adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length > 0) {
            let representation = adaptation.Representation_asArray[0];
            return (representation.mimeType + ';codecs="' + representation.codecs + '"');
        }

        return null;
    }

    function getMimeType(adaptation) {
        return adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length > 0 ? adaptation.Representation_asArray[0].mimeType : null;
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
        let isDynamic = false;
        if (manifest && manifest.hasOwnProperty('type')) {
            isDynamic = (manifest.type === 'dynamic');
        }
        return isDynamic;
    }

    function hasProfile(manifest, profile) {
        var has = false;

        if (manifest && manifest.profiles && manifest.profiles.length > 0) {
            has = (manifest.profiles.indexOf(profile) !== -1);
        }

        return has;
    }

    function getIsDVB(manifest) {
        return hasProfile(manifest, 'urn:dvb:dash:profile:dvb-dash:2014');
    }

    function getDuration(manifest) {
        let mpdDuration;
        //@mediaPresentationDuration specifies the duration of the entire Media Presentation.
        //If the attribute is not present, the duration of the Media Presentation is unknown.
        if (manifest && manifest.hasOwnProperty('mediaPresentationDuration')) {
            mpdDuration = manifest.mediaPresentationDuration;
        } else {
            mpdDuration = Number.MAX_VALUE;
        }

        return mpdDuration;
    }

    function getBandwidth(representation) {
        return representation && representation.bandwidth ? representation.bandwidth : NaN;
    }

    function getManifestUpdatePeriod(manifest, latencyOfLastUpdate = 0) {
        let delay = NaN;
        if (manifest && manifest.hasOwnProperty('minimumUpdatePeriod')) {
            delay = manifest.minimumUpdatePeriod;
        }
        return isNaN(delay) ? delay : Math.max(delay - latencyOfLastUpdate, 1);
    }

    function getRepresentationCount(adaptation) {
        return adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length ? adaptation.Representation_asArray.length : 0;
    }

    function getBitrateListForAdaptation(realAdaptation) {
        if (!realAdaptation || !realAdaptation.Representation_asArray || !realAdaptation.Representation_asArray.length) return null;

        let processedRealAdaptation = processAdaptation(realAdaptation);
        let realRepresentations = processedRealAdaptation.Representation_asArray;
        let ln = realRepresentations.length;
        let bitrateList = [];
        let i = 0;

        for (i = 0; i < ln; i++) {
            bitrateList.push({
                bandwidth: realRepresentations[i].bandwidth,
                width: realRepresentations[i].width || 0,
                height: realRepresentations[i].height || 0,
                scanType: realRepresentations[i].scanType || null
            });
        }

        return bitrateList;
    }

    function getRepresentationFor(index, adaptation) {
        return adaptation && adaptation.Representation_asArray && adaptation.Representation_asArray.length > 0 && Number.isInteger(index) ? adaptation.Representation_asArray[index] : null;
    }

    function getRepresentationsForAdaptation(voAdaptation) {
        let voRepresentations = [];
        let voRepresentation,
            initialization,
            segmentInfo,
            processedRealAdaptation,
            realRepresentation,
            i,
            s;

        if (voAdaptation && voAdaptation.period && Number.isInteger(voAdaptation.period.index)) {
            var periodArray = voAdaptation.period.mpd.manifest.Period_asArray[voAdaptation.period.index];
            if (periodArray && periodArray.AdaptationSet_asArray && Number.isInteger(voAdaptation.index)) {
                processedRealAdaptation = processAdaptation(periodArray.AdaptationSet_asArray[voAdaptation.index]);
            }
        }

        for (i = 0; processedRealAdaptation && i < processedRealAdaptation.Representation_asArray.length; i++) {
            realRepresentation = processedRealAdaptation.Representation_asArray[i];
            voRepresentation = new Representation();
            voRepresentation.index = i;
            voRepresentation.adaptation = voAdaptation;

            if (realRepresentation.hasOwnProperty('id')) {
                voRepresentation.id = realRepresentation.id;
            }

            if (realRepresentation.hasOwnProperty('codecs')) {
                voRepresentation.codecs = realRepresentation.codecs;
            }
            if (realRepresentation.hasOwnProperty('codecPrivateData')) {
                voRepresentation.codecPrivateData = realRepresentation.codecPrivateData;
            }

            if (realRepresentation.hasOwnProperty('bandwidth')) {
                voRepresentation.bandwidth = realRepresentation.bandwidth;
            }
            if (realRepresentation.hasOwnProperty('width')) {
                voRepresentation.width = realRepresentation.width;
            }
            if (realRepresentation.hasOwnProperty('height')) {
                voRepresentation.height = realRepresentation.height;
            }
            if (realRepresentation.hasOwnProperty('scanType')) {
                voRepresentation.scanType = realRepresentation.scanType;
            }
            if (realRepresentation.hasOwnProperty('maxPlayoutRate')) {
                voRepresentation.maxPlayoutRate = realRepresentation.maxPlayoutRate;
            }
            if (realRepresentation.hasOwnProperty('SegmentBase')) {
                segmentInfo = realRepresentation.SegmentBase;
                voRepresentation.segmentInfoType = 'SegmentBase';
            }
            else if (realRepresentation.hasOwnProperty('SegmentList')) {
                segmentInfo = realRepresentation.SegmentList;

                if (segmentInfo.hasOwnProperty('SegmentTimeline')) {
                    voRepresentation.segmentInfoType = 'SegmentTimeline';
                    s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length - 1];
                    if (!s.hasOwnProperty('r') || s.r >= 0) {
                        voRepresentation.useCalculatedLiveEdgeTime = true;
                    }
                } else {
                    voRepresentation.segmentInfoType = 'SegmentList';
                    voRepresentation.useCalculatedLiveEdgeTime = true;
                }
            }
            else if (realRepresentation.hasOwnProperty('SegmentTemplate')) {
                segmentInfo = realRepresentation.SegmentTemplate;

                if (segmentInfo.hasOwnProperty('SegmentTimeline')) {
                    voRepresentation.segmentInfoType = 'SegmentTimeline';
                    s = segmentInfo.SegmentTimeline.S_asArray[segmentInfo.SegmentTimeline.S_asArray.length - 1];
                    if (!s.hasOwnProperty('r') || s.r >= 0) {
                        voRepresentation.useCalculatedLiveEdgeTime = true;
                    }
                } else {
                    voRepresentation.segmentInfoType = 'SegmentTemplate';
                }

                if (segmentInfo.hasOwnProperty('initialization')) {
                    voRepresentation.initialization = segmentInfo.initialization.split('$Bandwidth$')
                        .join(realRepresentation.bandwidth).split('$RepresentationID$').join(realRepresentation.id);
                }
            } else {
                voRepresentation.segmentInfoType = 'BaseURL';
            }

            if (segmentInfo) {
                if (segmentInfo.hasOwnProperty('Initialization')) {
                    initialization = segmentInfo.Initialization;
                    if (initialization.hasOwnProperty('sourceURL')) {
                        voRepresentation.initialization = initialization.sourceURL;
                    } else if (initialization.hasOwnProperty('range')) {
                        voRepresentation.range = initialization.range;
                        // initialization source url will be determined from
                        // BaseURL when resolved at load time.
                    }
                } else if (realRepresentation.hasOwnProperty('mimeType') && getIsTextTrack(realRepresentation.mimeType)) {
                    voRepresentation.range = 0;
                }

                if (segmentInfo.hasOwnProperty('timescale')) {
                    voRepresentation.timescale = segmentInfo.timescale;
                }
                if (segmentInfo.hasOwnProperty('duration')) {
                    // TODO according to the spec @maxSegmentDuration specifies the maximum duration of any Segment in any Representation in the Media Presentation
                    // It is also said that for a SegmentTimeline any @d value shall not exceed the value of MPD@maxSegmentDuration, but nothing is said about
                    // SegmentTemplate @duration attribute. We need to find out if @maxSegmentDuration should be used instead of calculated duration if the the duration
                    // exceeds @maxSegmentDuration
                    //representation.segmentDuration = Math.min(segmentInfo.duration / representation.timescale, adaptation.period.mpd.maxSegmentDuration);
                    voRepresentation.segmentDuration = segmentInfo.duration / voRepresentation.timescale;
                }
                if (segmentInfo.hasOwnProperty('startNumber')) {
                    voRepresentation.startNumber = segmentInfo.startNumber;
                }
                if (segmentInfo.hasOwnProperty('indexRange')) {
                    voRepresentation.indexRange = segmentInfo.indexRange;
                }
                if (segmentInfo.hasOwnProperty('presentationTimeOffset')) {
                    voRepresentation.presentationTimeOffset = segmentInfo.presentationTimeOffset / voRepresentation.timescale;
                }
            }

            voRepresentation.MSETimeOffset = timelineConverter.calcMSETimeOffset(voRepresentation);

            voRepresentation.path = [voAdaptation.period.index, voAdaptation.index, i];

            voRepresentations.push(voRepresentation);
        }

        return voRepresentations;
    }

    function getAdaptationsForPeriod(voPeriod) {
        let realPeriod = voPeriod && Number.isInteger(voPeriod.index) ? voPeriod.mpd.manifest.Period_asArray[voPeriod.index] : null;
        let voAdaptations = [];
        let voAdaptationSet,
            realAdaptationSet,
            i;

        if (realPeriod && realPeriod.AdaptationSet_asArray) {
            for (i = 0; i < realPeriod.AdaptationSet_asArray.length; i++) {
                realAdaptationSet = realPeriod.AdaptationSet_asArray[i];
                voAdaptationSet = new AdaptationSet();

                if (realAdaptationSet.hasOwnProperty('id')) {
                    voAdaptationSet.id = realAdaptationSet.id;
                }

                voAdaptationSet.index = i;
                voAdaptationSet.period = period;

                if (getIsMuxed(realAdaptationSet)) {
                    voAdaptationSet.type = 'muxed';
                } else if (getIsAudio(realAdaptationSet)) {
                    voAdaptationSet.type = 'audio';
                }else if (getIsVideo(realAdaptationSet)) {
                    voAdaptationSet.type = 'video';
                }else if (getIsFragmentedText(realAdaptationSet)) {
                    voAdaptationSet.type = 'fragmentedText';
                }else {
                    voAdaptationSet.type = 'text';
                }
                voAdaptations.push(voAdaptationSet);
            }
        }

        return voAdaptations;
    }

    function getRegularPeriods(mpd) {
        let isDynamic = getIsDynamic(mpd.manifest);
        let voPeriods = [];
        let realPeriod1 = null;
        let realPeriod = null;
        let voPeriod1 = null;
        let voPeriod = null;
        let len,
            i;


        for (i = 0, len = mpd.manifest.Period_asArray.length; i < len; i++) {
            realPeriod = mpd.manifest.Period_asArray[i];

            // If the attribute @start is present in the Period, then the
            // Period is a regular Period and the PeriodStart is equal
            // to the value of this attribute.
            if (realPeriod.hasOwnProperty('start')) {
                voPeriod = new Period();
                voPeriod.start = realPeriod.start;
            }
            // If the @start attribute is absent, but the previous Period
            // element contains a @duration attribute then then this new
            // Period is also a regular Period. The start time of the new
            // Period PeriodStart is the sum of the start time of the previous
            // Period PeriodStart and the value of the attribute @duration
            // of the previous Period.
            else if (realPeriod1 !== null && realPeriod.hasOwnProperty('duration') && voPeriod1 !== null) {
                voPeriod = new Period();
                voPeriod.start = voPeriod1.start + voPeriod1.duration;
                voPeriod.duration = realPeriod.duration;
            }
            // If (i) @start attribute is absent, and (ii) the Period element
            // is the first in the MPD, and (iii) the MPD@type is 'static',
            // then the PeriodStart time shall be set to zero.
            else if (i === 0 && !isDynamic) {
                voPeriod = new Period();
                voPeriod.start = 0;
            }

            // The Period extends until the PeriodStart of the next Period.
            // The difference between the PeriodStart time of a Period and
            // the PeriodStart time of the following Period.
            if (voPeriod1 !== null && isNaN(voPeriod1.duration)) {
                voPeriod1.duration = voPeriod.start - voPeriod1.start;
            }

            if (voPeriod !== null) {
                voPeriod.id = getPeriodId(realPeriod, i);
            }

            if (voPeriod !== null && realPeriod.hasOwnProperty('duration')) {
                voPeriod.duration = realPeriod.duration;
            }

            if (voPeriod !== null) {
                voPeriod.index = i;
                voPeriod.mpd = mpd;
                voPeriods.push(voPeriod);
                realPeriod1 = realPeriod;
                voPeriod1 = voPeriod;
            }

            realPeriod = null;
            voPeriod = null;
        }

        if (voPeriods.length === 0) {
            return voPeriods;
        }

        // The last Period extends until the end of the Media Presentation.
        // The difference between the PeriodStart time of the last Period
        // and the mpd duration
        if (voPeriod1 !== null && isNaN(voPeriod1.duration)) {
            voPeriod1.duration = getEndTimeForLastPeriod(voPeriod1) - voPeriod1.start;
        }

        return voPeriods;
    }

    function getPeriodId(realPeriod, i) {
        if (!realPeriod) {
            throw new Error('Period cannot be null or undefined');
        }

        let id = Period.DEFAULT_ID + '_' + i;

        if (realPeriod.hasOwnProperty('id') && realPeriod.id !== '__proto__') {
            id = realPeriod.id;
        }

        return id;
    }

    function getMpd(manifest) {
        let mpd = new Mpd();

        if (manifest) {
            mpd.manifest = manifest;

            if (manifest.hasOwnProperty('availabilityStartTime')) {
                mpd.availabilityStartTime = new Date(manifest.availabilityStartTime.getTime());
            } else {
                mpd.availabilityStartTime = new Date(manifest.loadedTime.getTime());
            }

            if (manifest.hasOwnProperty('availabilityEndTime')) {
                mpd.availabilityEndTime = new Date(manifest.availabilityEndTime.getTime());
            }

            if (manifest.hasOwnProperty('minimumUpdatePeriod')) {
                mpd.minimumUpdatePeriod = manifest.minimumUpdatePeriod;
            }

            if (manifest.hasOwnProperty('mediaPresentationDuration')) {
                mpd.mediaPresentationDuration = manifest.mediaPresentationDuration;
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
        }

        return mpd;
    }


    function getEndTimeForLastPeriod(voPeriod) {
        const isDynamic = getIsDynamic(voPeriod.mpd.manifest);

        let periodEnd;
        if (voPeriod.mpd.manifest.mediaPresentationDuration) {
            periodEnd = voPeriod.mpd.manifest.mediaPresentationDuration;
        } else if (voPeriod.duration) {
            periodEnd = voPeriod.duration;
        } else if (isDynamic) {
            periodEnd = Number.POSITIVE_INFINITY;
        } else {
            throw new Error('Must have @mediaPresentationDuratio on MPD or an explicit @duration on the last period.');
        }

        return periodEnd;
    }

    function getEventsForPeriod(period) {
        let manifest = period.mpd.manifest;
        let periodArray = manifest ? manifest.Period_asArray : null;
        let eventStreams = periodArray && period && Number.isInteger(period.index) ? periodArray[period.index].EventStream_asArray : null;
        let events = [];
        let i,
            j;

        if (eventStreams) {
            for (i = 0; i < eventStreams.length; i++) {
                let eventStream = new EventStream();
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
                for (j = 0; j < eventStreams[i].Event_asArray.length; j++) {
                    let event = new Event();
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
        let eventStreams = [];
        let i;

        if (!inbandStreams) return eventStreams;

        for (i = 0; i < inbandStreams.length ; i++ ) {
            let eventStream = new EventStream();
            eventStream.timescale = 1;
            eventStream.representation = representation;

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
        let inbandStreams,
            periodArray,
            adaptationArray;

        if (manifest && manifest.Period_asArray && adaptation && adaptation.period && Number.isInteger(adaptation.period.index)) {
            periodArray = manifest.Period_asArray[adaptation.period.index];
            if (periodArray && periodArray.AdaptationSet_asArray && Number.isInteger(adaptation.index)) {
                adaptationArray = periodArray.AdaptationSet_asArray[adaptation.index];
                if (adaptationArray) {
                    inbandStreams = adaptationArray.InbandEventStream_asArray;
                }
            }
        }

        return getEventStreams(inbandStreams, null);
    }

    function getEventStreamForRepresentation(manifest, representation) {
        let inbandStreams,
            periodArray,
            adaptationArray,
            representationArray;

        if (manifest && manifest.Period_asArray && representation && representation.adaptation && representation.adaptation.period && Number.isInteger(representation.adaptation.period.index)) {
            periodArray = manifest.Period_asArray[representation.adaptation.period.index];
            if (periodArray && periodArray.AdaptationSet_asArray && Number.isInteger(representation.adaptation.index)) {
                adaptationArray = periodArray.AdaptationSet_asArray[representation.adaptation.index];
                if (adaptationArray && adaptationArray.Representation_asArray && Number.isInteger(representation.index)) {
                    representationArray =  adaptationArray.Representation_asArray[representation.index];
                    if (representationArray) {
                        inbandStreams = representationArray.InbandEventStream_asArray;
                    }
                }
            }
        }

        return getEventStreams(inbandStreams, representation);
    }

    function getUTCTimingSources(manifest) {
        let isDynamic = getIsDynamic(manifest);
        let hasAST = manifest ? manifest.hasOwnProperty('availabilityStartTime') : false;
        let utcTimingsArray = manifest ? manifest.UTCTiming_asArray : null;
        let utcTimingEntries = [];

        // do not bother synchronizing the clock unless MPD is live,
        // or it is static and has availabilityStartTime attribute
        if ((isDynamic || hasAST)) {
            if (utcTimingsArray) {
                // the order is important here - 23009-1 states that the order
                // in the manifest "indicates relative preference, first having
                // the highest, and the last the lowest priority".
                utcTimingsArray.forEach(function (utcTiming) {
                    let entry = new UTCTiming();

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
        if (manifest && manifest.hasOwnProperty('Location')) {
            // for now, do not support multiple Locations -
            // just set Location to the first Location.
            manifest.Location = manifest.Location_asArray[0];

            return manifest.Location;
        }

        // may well be undefined
        return undefined;
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
        getIsDVB: getIsDVB,
        getDuration: getDuration,
        getBandwidth: getBandwidth,
        getManifestUpdatePeriod: getManifestUpdatePeriod,
        getRepresentationCount: getRepresentationCount,
        getBitrateListForAdaptation: getBitrateListForAdaptation,
        getRepresentationFor: getRepresentationFor,
        getRepresentationsForAdaptation: getRepresentationsForAdaptation,
        getAdaptationsForPeriod: getAdaptationsForPeriod,
        getRegularPeriods: getRegularPeriods,
        getMpd: getMpd,
        getEventsForPeriod: getEventsForPeriod,
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
