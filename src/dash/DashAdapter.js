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

import TrackInfo from '../streaming/vo/TrackInfo.js';
import MediaInfo from '../streaming/vo/MediaInfo.js';
import StreamInfo from '../streaming/vo/StreamInfo.js';
import ManifestInfo from '../streaming/vo/ManifestInfo.js';
import Event from './vo/Event.js';
import FactoryMaker from '../core/FactoryMaker.js';

const METRIC_LIST = {
    //TODO need to refactor all that reference to be able to export like all other const on factory object.
    TCP_CONNECTION: "TcpConnection",
    HTTP_REQUEST: "HttpRequest",
    HTTP_REQUEST_TRACE: "HttpRequestTrace",
    TRACK_SWITCH: "RepresentationSwitch",
    BUFFER_LEVEL: "BufferLevel",
    BUFFER_STATE: "BufferState",
    DVR_INFO: "DVRInfo",
    DROPPED_FRAMES: "DroppedFrames",
    SCHEDULING_INFO: "SchedulingInfo",
    REQUESTS_QUEUE: "RequestsQueue",
    MANIFEST_UPDATE: "ManifestUpdate",
    MANIFEST_UPDATE_STREAM_INFO: "ManifestUpdatePeriodInfo",
    MANIFEST_UPDATE_TRACK_INFO: "ManifestUpdateRepresentationInfo",
    PLAY_LIST: "PlayList",
    PLAY_LIST_TRACE: "PlayListTrace"
};

function DashAdapter() {

    //let context = this.context;

    let instance,
        manifestExt,
        periods,
        adaptations;

    function setConfig(config) {
        if(!config) return;

        if(config.manifestExt){
            manifestExt = config.manifestExt;
        }
    }

    function initialize() {
        periods = [];
        adaptations = {};
    }


    function getRepresentationForTrackInfo(trackInfo, representationController) {
        return representationController.getRepresentationForQuality(trackInfo.quality);
    }

    function getAdaptationForMediaInfo(mediaInfo) {
        return adaptations[mediaInfo.streamInfo.id][mediaInfo.index];
    }

    function getPeriodForStreamInfo(streamInfo) {
        var ln = periods.length;
        var period,
            i = 0;

        for (i; i < ln; i += 1) {
            period = periods[i];

            if (streamInfo.id === period.id) return period;
        }

        return null;
    }

    function convertRepresentationToTrackInfo(manifest, representation) {
        var trackInfo = new TrackInfo();
        var a = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index];
        var r = manifestExt.getRepresentationFor(representation.index, a);

        trackInfo.id = representation.id;
        trackInfo.quality = representation.index;
        trackInfo.bandwidth = manifestExt.getBandwidth(r);
        trackInfo.DVRWindow = representation.segmentAvailabilityRange;
        trackInfo.fragmentDuration = representation.segmentDuration || (representation.segments && representation.segments.length > 0 ? representation.segments[0].duration : NaN);
        trackInfo.MSETimeOffset = representation.MSETimeOffset;
        trackInfo.useCalculatedLiveEdgeTime = representation.useCalculatedLiveEdgeTime;
        trackInfo.mediaInfo = convertAdaptationToMediaInfo(manifest, representation.adaptation);

        return trackInfo;
    }

    function convertAdaptationToMediaInfo(manifest, adaptation) {
        var mediaInfo = new MediaInfo();
        var a = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        var viewpoint;

        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo(manifest, adaptation.period);
        mediaInfo.representationCount = manifestExt.getRepresentationCount(a);
        mediaInfo.lang = manifestExt.getLanguageForAdaptation(a);
        viewpoint = manifestExt.getViewpointForAdaptation(a);
        mediaInfo.viewpoint = viewpoint ? viewpoint.value : undefined;
        mediaInfo.accessibility = manifestExt.getAccessibilityForAdaptation(a).map(function(accessibility){
            return accessibility.value;
        });
        mediaInfo.audioChannelConfiguration =  manifestExt.getAudioChannelConfigurationForAdaptation(a).map(function(audioChannelConfiguration){
            return audioChannelConfiguration.value;
        });
        mediaInfo.roles = manifestExt.getRolesForAdaptation(a).map(function(role){
            return role.value;
        });
        mediaInfo.codec = manifestExt.getCodec(a);
        mediaInfo.mimeType = manifestExt.getMimeType(a);
        mediaInfo.contentProtection = manifestExt.getContentProtectionData(a);
        mediaInfo.bitrateList = manifestExt.getBitrateListForAdaptation(a);

        if (mediaInfo.contentProtection) {
            mediaInfo.contentProtection.forEach(function(item){
                item.KID = manifestExt.getKID(item);
            });
        }

        mediaInfo.isText = manifestExt.getIsTextTrack(mediaInfo.mimeType);

        return mediaInfo;
    }

    function convertPeriodToStreamInfo(manifest, period) {
        var streamInfo = new StreamInfo();
        var THRESHOLD = 1;

        streamInfo.id = period.id;
        streamInfo.index = period.index;
        streamInfo.start = period.start;
        streamInfo.duration = period.duration;
        streamInfo.manifestInfo = convertMpdToManifestInfo(manifest, period.mpd);
        streamInfo.isLast = (manifest.Period_asArray.length === 1) || (Math.abs((streamInfo.start + streamInfo.duration) - streamInfo.manifestInfo.duration) < THRESHOLD);

        return streamInfo;
    }

    function convertMpdToManifestInfo(manifest, mpd) {
        var manifestInfo = new ManifestInfo();

        manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth;
        manifestInfo.loadedTime = mpd.manifest.loadedTime;
        manifestInfo.availableFrom = mpd.availabilityStartTime;
        manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
        manifestInfo.duration = manifestExt.getDuration(manifest);
        manifestInfo.isDynamic = manifestExt.getIsDynamic(manifest);

        return manifestInfo;
    }

    function getMediaInfoForType(manifest, streamInfo, type) {
        var periodInfo = getPeriodForStreamInfo(streamInfo);
        var periodId = periodInfo.id;
        var data = manifestExt.getAdaptationForType(manifest, streamInfo.index, type);
        var idx;

        if (!data) return null;

        idx = manifestExt.getIndexForAdaptation(data, manifest, streamInfo.index);

        adaptations[periodId] = adaptations[periodId] || manifestExt.getAdaptationsForPeriod(manifest, periodInfo);

        return convertAdaptationToMediaInfo(manifest, adaptations[periodId][idx]);
    }

    function getAllMediaInfoForType(manifest, streamInfo, type) {
        var periodInfo = getPeriodForStreamInfo(streamInfo);
        var periodId = periodInfo.id;
        var adaptationsForType = manifestExt.getAdaptationsForType(manifest, streamInfo.index, type);

        var data,
            mediaArr = [],
            media,
            idx;

        if (!adaptationsForType) return mediaArr;

        adaptations[periodId] = adaptations[periodId] || manifestExt.getAdaptationsForPeriod(manifest, periodInfo);

        for (var i = 0, ln = adaptationsForType.length; i < ln; i += 1) {
            data = adaptationsForType[i];
            idx = manifestExt.getIndexForAdaptation(data, manifest, streamInfo.index);
            media = convertAdaptationToMediaInfo(manifest, adaptations[periodId][idx]);

            if (media) {
                mediaArr.push(media);
            }
        }

        return mediaArr;
    }

    function getStreamsInfo(manifest) {
        var mpd,
            streams = [],
            ln,
            i;

        if (!manifest) return null;

        mpd = manifestExt.getMpd(manifest);
        periods = manifestExt.getRegularPeriods(manifest, mpd);
        mpd.checkTime = manifestExt.getCheckTime(manifest, periods[0]);
        adaptations = {};
        ln = periods.length;

        for(i = 0; i < ln; i += 1) {
            streams.push(convertPeriodToStreamInfo(manifest, periods[i]));
        }

        return streams;
    }

    function getManifestInfo(manifest) {
        var mpd = manifestExt.getMpd(manifest);

        return convertMpdToManifestInfo(manifest, mpd);
    }

    function getInitRequest(streamProcessor, quality) {
        var representation = streamProcessor.getRepresentationController().getRepresentationForQuality(quality);
        return streamProcessor.getIndexHandler().getInitRequest(representation);
    }

    function getNextFragmentRequest(streamProcessor, trackInfo) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().getNextSegmentRequest(representation);
    }

    function getFragmentRequestForTime(streamProcessor, trackInfo, time, options) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().getSegmentRequestForTime(representation, time, options);
    }

    function generateFragmentRequestForTime(streamProcessor, trackInfo, time) {
        var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.getRepresentationController());
        return streamProcessor.getIndexHandler().generateSegmentRequestForTime(representation, time);
    }

    function getIndexHandlerTime(streamProcessor) {
        return streamProcessor.getIndexHandler().getCurrentTime();
    }

    function setIndexHandlerTime(streamProcessor, value) {
        return streamProcessor.getIndexHandler().setCurrentTime(value);
    }

    function updateData(manifest, streamProcessor) {
        var periodInfo = getPeriodForStreamInfo(streamProcessor.getStreamInfo());
        var mediaInfo = streamProcessor.getMediaInfo();
        var adaptation = getAdaptationForMediaInfo(mediaInfo);
        var type = streamProcessor.getType();

        var id,
            data;

        id = mediaInfo.id;
        data = id ? manifestExt.getAdaptationForId(id, manifest, periodInfo.index) : manifestExt.getAdaptationForIndex(mediaInfo.index, manifest, periodInfo.index);
        streamProcessor.getRepresentationController().updateData(data, adaptation, type);
    }

    function getRepresentationInfoForQuality(manifest, representationController, quality) {
        var representation = representationController.getRepresentationForQuality(quality);
        return representation ? convertRepresentationToTrackInfo(manifest, representation) : null;
    }

    function getCurrentRepresentationInfo(manifest, representationController) {
        var representation = representationController.getCurrentRepresentation();
        return representation ? convertRepresentationToTrackInfo(manifest, representation): null;
    }

    function getEvent(eventBox, eventStreams, startTime) {
        var event = new Event();
        var schemeIdUri = eventBox.scheme_id_uri;
        var value = eventBox.value;
        var timescale = eventBox.timescale;
        var presentationTimeDelta = eventBox.presentation_time_delta;
        var duration = eventBox.event_duration;
        var id = eventBox.id;
        var messageData = eventBox.message_data;
        var presentationTime = startTime * timescale + presentationTimeDelta;

        if (!eventStreams[schemeIdUri]) return null;

        event.eventStream = eventStreams[schemeIdUri];
        event.eventStream.value = value;
        event.eventStream.timescale = timescale;
        event.duration = duration;
        event.id = id;
        event.presentationTime = presentationTime;
        event.messageData = messageData;
        event.presentationTimeDelta = presentationTimeDelta;

        return event;
    }

    function getEventsFor(manifest, info, streamProcessor) {
        var events = [];

        if (info instanceof StreamInfo) {
            events = manifestExt.getEventsForPeriod(manifest, getPeriodForStreamInfo(info));
        } else if (info instanceof MediaInfo) {
            events = manifestExt.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
        } else if (info instanceof TrackInfo) {
            events = manifestExt.getEventStreamForRepresentation(manifest, getRepresentationForTrackInfo(info, streamProcessor.getRepresentationController()));
        }

        return events;
    }

    function reset() {
        periods = [];
        adaptations = {};
    }

    instance = {
        initialize: initialize,
        convertDataToTrack: convertRepresentationToTrackInfo,
        convertDataToMedia: convertAdaptationToMediaInfo,
        convertDataToStream: convertPeriodToStreamInfo,
        getDataForTrack: getRepresentationForTrackInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getDataForStream: getPeriodForStreamInfo,
        getStreamsInfo: getStreamsInfo,
        getManifestInfo: getManifestInfo,
        getMediaInfoForType: getMediaInfoForType,
        getAllMediaInfoForType: getAllMediaInfoForType,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getRepresentationInfoForQuality: getRepresentationInfoForQuality,
        updateData: updateData,
        getInitRequest: getInitRequest,
        getNextFragmentRequest: getNextFragmentRequest,
        getFragmentRequestForTime: getFragmentRequestForTime,
        generateFragmentRequestForTime: generateFragmentRequestForTime,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,
        getEventsFor: getEventsFor,
        getEvent: getEvent,
        setConfig: setConfig,
        reset: reset,
        metricsList: METRIC_LIST
    };

    return instance;
}

export default FactoryMaker.getSingletonFactory(DashAdapter);