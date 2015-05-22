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
Dash.dependencies.DashAdapter = function () {
    "use strict";
    var periods = [],
        adaptations = {},

        getRepresentationForTrackInfo = function(trackInfo, representationController) {
            return representationController.getRepresentationForQuality(trackInfo.quality);
        },

        getAdaptationForMediaInfo = function(mediaInfo) {
            return adaptations[mediaInfo.streamInfo.id][mediaInfo.index];
        },

        getPeriodForStreamInfo = function(streamInfo) {
            var period,
                ln = periods.length,
                i = 0;

            for (i; i < ln; i += 1) {
                period = periods[i];

                if (streamInfo.id === period.id) return period;
            }

            return null;
        },

        convertRepresentationToTrackInfo = function(manifest, representation) {
            var trackInfo = new MediaPlayer.vo.TrackInfo(),
                a = representation.adaptation.period.mpd.manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index],
                r = this.manifestExt.getRepresentationFor(representation.index, a);

            trackInfo.id = representation.id;
            trackInfo.quality = representation.index;
            trackInfo.bandwidth = this.manifestExt.getBandwidth(r);
            trackInfo.DVRWindow = representation.segmentAvailabilityRange;
            trackInfo.fragmentDuration = representation.segmentDuration || (representation.segments && representation.segments.length > 0 ? representation.segments[0].duration : NaN);
            trackInfo.MSETimeOffset = representation.MSETimeOffset;
            trackInfo.useCalculatedLiveEdgeTime = representation.useCalculatedLiveEdgeTime;
            trackInfo.mediaInfo = convertAdaptationToMediaInfo.call(this, manifest, representation.adaptation);

            return trackInfo;
        },

        convertAdaptationToMediaInfo = function(manifest, adaptation) {
            var mediaInfo = new MediaPlayer.vo.MediaInfo(),
                self = this,
                a = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];

            mediaInfo.id = adaptation.id;
            mediaInfo.index = adaptation.index;
            mediaInfo.type = adaptation.type;
            mediaInfo.streamInfo = convertPeriodToStreamInfo.call(this, manifest, adaptation.period);
            mediaInfo.trackCount = this.manifestExt.getRepresentationCount(a);
            mediaInfo.lang = this.manifestExt.getLanguageForAdaptation(a);
            mediaInfo.codec = this.manifestExt.getCodec(a);
            mediaInfo.mimeType = this.manifestExt.getMimeType(a);
            mediaInfo.contentProtection = this.manifestExt.getContentProtectionData(a);
            mediaInfo.bitrateList = this.manifestExt.getBitrateListForAdaptation(a);

            if (mediaInfo.contentProtection) {
                mediaInfo.contentProtection.forEach(function(item){
                    item.KID = self.manifestExt.getKID(item);
                });
            }

            mediaInfo.isText = this.manifestExt.getIsTextTrack(mediaInfo.mimeType);

            return mediaInfo;
        },

        convertPeriodToStreamInfo = function(manifest, period) {
            var streamInfo = new MediaPlayer.vo.StreamInfo(),
                THRESHOLD = 1;

            streamInfo.id = period.id;
            streamInfo.index = period.index;
            streamInfo.start = period.start;
            streamInfo.duration = period.duration;
            streamInfo.manifestInfo = convertMpdToManifestInfo.call(this, manifest, period.mpd);
            streamInfo.isLast = (manifest.Period_asArray.length === 1) || (Math.abs((streamInfo.start + streamInfo.duration) - streamInfo.manifestInfo.duration) < THRESHOLD);

            return streamInfo;
        },

        convertMpdToManifestInfo = function(manifest, mpd) {
            var manifestInfo = new MediaPlayer.vo.ManifestInfo();

            manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth;
            manifestInfo.loadedTime = mpd.manifest.loadedTime;
            manifestInfo.availableFrom = mpd.availabilityStartTime;
            manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
            manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
            manifestInfo.duration = this.manifestExt.getDuration(manifest);
            manifestInfo.isDynamic = this.manifestExt.getIsDynamic(manifest);

            return manifestInfo;
        },

        getMediaInfoForType = function(manifest, streamInfo, type) {
            var periodInfo = getPeriodForStreamInfo(streamInfo),
                periodId = periodInfo.id,
                data = this.manifestExt.getAdaptationForType(manifest, streamInfo.index, type),
                idx;

            if (!data) return null;

            idx = this.manifestExt.getIndexForAdaptation(data, manifest, streamInfo.index);

            adaptations[periodId] = adaptations[periodId] || this.manifestExt.getAdaptationsForPeriod(manifest, periodInfo);

            return convertAdaptationToMediaInfo.call(this, manifest, adaptations[periodId][idx]);
        },

        getStreamsInfoFromManifest = function(manifest) {
            var mpd,
                streams = [],
                ln,
                i;

            if (!manifest) return null;

            mpd = this.manifestExt.getMpd(manifest);
            periods = this.manifestExt.getRegularPeriods(manifest, mpd);
            mpd.checkTime = this.manifestExt.getCheckTime(manifest, periods[0]);
            adaptations = {};
            ln = periods.length;

            for(i = 0; i < ln; i += 1) {
                streams.push(convertPeriodToStreamInfo.call(this, manifest, periods[i]));
            }

            return streams;
        },

        getMpdInfo = function(manifest) {
            var mpd = this.manifestExt.getMpd(manifest);

            return convertMpdToManifestInfo.call(this, manifest, mpd);
        },

        getInitRequest = function(streamProcessor, quality) {
            var representation = streamProcessor.trackController.getRepresentationForQuality(quality);

            return streamProcessor.indexHandler.getInitRequest(representation);
        },

        getNextFragmentRequest = function(streamProcessor, trackInfo) {
            var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);

            return streamProcessor.indexHandler.getNextSegmentRequest(representation);
        },

        getFragmentRequestForTime = function(streamProcessor, trackInfo, time, options) {
            var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);

            return streamProcessor.indexHandler.getSegmentRequestForTime(representation, time, options);
        },

        generateFragmentRequestForTime = function(streamProcessor, trackInfo, time) {
            var representation = getRepresentationForTrackInfo(trackInfo, streamProcessor.trackController);

            return streamProcessor.indexHandler.generateSegmentRequestForTime(representation, time);
        },

        getIndexHandlerTime = function(streamProcessor) {
            return streamProcessor.indexHandler.getCurrentTime();
        },

        setIndexHandlerTime = function(streamProcessor, value) {
            return streamProcessor.indexHandler.setCurrentTime(value);
        },

        updateData = function(manifest, streamProcessor) {
            var periodInfo = getPeriodForStreamInfo(streamProcessor.getStreamInfo()),
                mediaInfo = streamProcessor.getMediaInfo(),
                adaptation = getAdaptationForMediaInfo(mediaInfo),
                type = streamProcessor.getType(),
                id,
                data;

            id = mediaInfo.id;
            data = id ? this.manifestExt.getAdaptationForId(id, manifest, periodInfo.index) : this.manifestExt.getAdaptationForIndex(mediaInfo.index, manifest, periodInfo.index);
            streamProcessor.trackController.updateData(data, adaptation, type);
        },

        getTrackInfoForQuality = function(manifest, representationController, quality) {
            var representation = representationController.getRepresentationForQuality(quality);

            return representation ? convertRepresentationToTrackInfo.call(this, manifest, representation) : null;
        },

        getCurrentTrackInfo = function(manifest, representationController) {
            var representation = representationController.getCurrentRepresentation();

            return representation ? convertRepresentationToTrackInfo.call(this, manifest, representation): null;
        },

        getEvent = function(eventBox, eventStreams, startTime) {
            var event = new Dash.vo.Event(),
                schemeIdUri = eventBox.scheme_id_uri,
                value = eventBox.value,
                timescale = eventBox.timescale,
                presentationTimeDelta = eventBox.presentation_time_delta,
                duration = eventBox.event_duration,
                id = eventBox.id,
                messageData = eventBox.message_data,
                presentationTime = startTime*timescale+presentationTimeDelta;

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
        },

        getEventsFor = function(manifest, info, streamProcessor) {
            var events = [];

            if (info instanceof MediaPlayer.vo.StreamInfo) {
                events = this.manifestExt.getEventsForPeriod(manifest, getPeriodForStreamInfo(info));
            } else if (info instanceof MediaPlayer.vo.MediaInfo) {
                events = this.manifestExt.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
            } else if (info instanceof MediaPlayer.vo.TrackInfo) {
                events = this.manifestExt.getEventStreamForRepresentation(manifest, getRepresentationForTrackInfo(info, streamProcessor.trackController));
            }

            return events;
        };

    return {
        system : undefined,
        manifestExt: undefined,
        timelineConverter: undefined,

        metricsList: {
            TCP_CONNECTION: "TcpConnection",
            HTTP_REQUEST: "HttpRequest",
            HTTP_REQUEST_TRACE: "HttpRequestTrace",
            TRACK_SWITCH : "RepresentationSwitch",
            BUFFER_LEVEL: "BufferLevel",
            BUFFER_STATE: "BufferState",
            DVR_INFO: "DVRInfo",
            DROPPED_FRAMES: "DroppedFrames",
            SCHEDULING_INFO: "SchedulingInfo",
            MANIFEST_UPDATE: "ManifestUpdate",
            MANIFEST_UPDATE_STREAM_INFO: "ManifestUpdatePeriodInfo",
            MANIFEST_UPDATE_TRACK_INFO: "ManifestUpdateRepresentationInfo",
            PLAY_LIST: "PlayList",
            PLAY_LIST_TRACE: "PlayListTrace"
        },

        convertDataToTrack: convertRepresentationToTrackInfo,
        convertDataToMedia: convertAdaptationToMediaInfo,
        convertDataToStream: convertPeriodToStreamInfo,
        getDataForTrack: getRepresentationForTrackInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getDataForStream: getPeriodForStreamInfo,

        getStreamsInfo: getStreamsInfoFromManifest,
        getManifestInfo: getMpdInfo,
        getMediaInfoForType: getMediaInfoForType,

        getCurrentTrackInfo: getCurrentTrackInfo,
        getTrackInfoForQuality: getTrackInfoForQuality,
        updateData: updateData,

        getInitRequest: getInitRequest,
        getNextFragmentRequest: getNextFragmentRequest,
        getFragmentRequestForTime: getFragmentRequestForTime,
        generateFragmentRequestForTime: generateFragmentRequestForTime,
        getIndexHandlerTime: getIndexHandlerTime,
        setIndexHandlerTime: setIndexHandlerTime,

        getEventsFor: getEventsFor,
        getEvent: getEvent,

        reset: function(){
            periods = [];
            adaptations = {};
        }
    };
};

Dash.dependencies.DashAdapter.prototype = {
    constructor: Dash.dependencies.DashAdapter
};