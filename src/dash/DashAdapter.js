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

import DashConstants from './constants/DashConstants';
import RepresentationInfo from './vo/RepresentationInfo';
import MediaInfo from './vo/MediaInfo';
import StreamInfo from './vo/StreamInfo';
import ManifestInfo from './vo/ManifestInfo';
import Event from './vo/Event';
import FactoryMaker from '../core/FactoryMaker';

function DashAdapter() {
    let instance,
        dashManifestModel,
        voPeriods,
        voAdaptations,
        currentMediaInfo,
        constants,
        cea608parser;

    const PROFILE_DVB = 'urn:dvb:dash:profile:dvb-dash:2014';

    function setup() {
        reset();
    }

    function setConfig(config) {
        if (!config) return;

        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }

        if (config.constants) {
            constants = config.constants;
        }

        if (config.cea608parser) {
            cea608parser = config.cea608parser;
        }
    }

    function getAdaptationForMediaInfo(mediaInfo) {
        if (!mediaInfo || !mediaInfo.streamInfo || mediaInfo.streamInfo.id === undefined || !voAdaptations[mediaInfo.streamInfo.id]) return null;
        return voAdaptations[mediaInfo.streamInfo.id][mediaInfo.index];
    }

    function getPeriodForStreamInfo(streamInfo, voPeriodsArray) {
        const ln = voPeriodsArray.length;

        for (let i = 0; i < ln; i++) {
            let voPeriod = voPeriodsArray[i];

            if (streamInfo.id === voPeriod.id) return voPeriod;
        }

        return null;
    }

    function convertRepresentationToRepresentationInfo(voRepresentation) {
        let representationInfo = new RepresentationInfo();
        const realAdaptation = voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index];
        const realRepresentation = dashManifestModel.getRepresentationFor(voRepresentation.index, realAdaptation);

        representationInfo.id = voRepresentation.id;
        representationInfo.quality = voRepresentation.index;
        representationInfo.bandwidth = dashManifestModel.getBandwidth(realRepresentation);
        representationInfo.DVRWindow = voRepresentation.segmentAvailabilityRange;
        representationInfo.fragmentDuration = voRepresentation.segmentDuration || (voRepresentation.segments && voRepresentation.segments.length > 0 ? voRepresentation.segments[0].duration : NaN);
        representationInfo.MSETimeOffset = voRepresentation.MSETimeOffset;
        representationInfo.useCalculatedLiveEdgeTime = voRepresentation.useCalculatedLiveEdgeTime;
        representationInfo.mediaInfo = convertAdaptationToMediaInfo(voRepresentation.adaptation);

        return representationInfo;
    }

    function convertAdaptationToMediaInfo(adaptation) {
        let mediaInfo = new MediaInfo();
        const realAdaptation = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        let viewpoint;

        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo(adaptation.period);
        mediaInfo.representationCount = dashManifestModel.getRepresentationCount(realAdaptation);
        mediaInfo.lang = dashManifestModel.getLanguageForAdaptation(realAdaptation);
        viewpoint = dashManifestModel.getViewpointForAdaptation(realAdaptation);
        mediaInfo.viewpoint = viewpoint ? viewpoint.value : undefined;
        mediaInfo.accessibility = dashManifestModel.getAccessibilityForAdaptation(realAdaptation).map(function (accessibility) {
            let accessibilityValue = accessibility.value;
            let accessibilityData = accessibilityValue;
            if (accessibility.schemeIdUri && (accessibility.schemeIdUri.search('cea-608') >= 0) && typeof (cea608parser) !== 'undefined') {
                if (accessibilityValue) {
                    accessibilityData = 'cea-608:' + accessibilityValue;
                } else {
                    accessibilityData = 'cea-608';
                }
                mediaInfo.embeddedCaptions = true;
            }
            return accessibilityData;
        });

        mediaInfo.audioChannelConfiguration = dashManifestModel.getAudioChannelConfigurationForAdaptation(realAdaptation).map(function (audioChannelConfiguration) {
            return audioChannelConfiguration.value;
        });
        mediaInfo.roles = dashManifestModel.getRolesForAdaptation(realAdaptation).map(function (role) {
            return role.value;
        });
        mediaInfo.codec = dashManifestModel.getCodec(realAdaptation);
        mediaInfo.mimeType = dashManifestModel.getMimeType(realAdaptation);
        mediaInfo.contentProtection = dashManifestModel.getContentProtectionData(realAdaptation);
        mediaInfo.bitrateList = dashManifestModel.getBitrateListForAdaptation(realAdaptation);

        if (mediaInfo.contentProtection) {
            mediaInfo.contentProtection.forEach(function (item) {
                item.KID = dashManifestModel.getKID(item);
            });
        }

        mediaInfo.isText = dashManifestModel.getIsTextTrack(mediaInfo.mimeType);

        return mediaInfo;
    }

    function convertVideoInfoToEmbeddedTextInfo(mediaInfo, channel, lang) {
        mediaInfo.id = channel; // CC1, CC2, CC3, or CC4
        mediaInfo.index = 100 + parseInt(channel.substring(2, 3));
        mediaInfo.type = constants.EMBEDDED_TEXT;
        mediaInfo.codec = 'cea-608-in-SEI';
        mediaInfo.isText = true;
        mediaInfo.isEmbedded = true;
        mediaInfo.lang = lang;
        mediaInfo.roles = ['caption'];
    }

    function convertVideoInfoToThumbnailInfo(mediaInfo) {
        mediaInfo.type = constants.IMAGE;
    }

    function convertPeriodToStreamInfo(period) {
        let streamInfo = new StreamInfo();
        const THRESHOLD = 1;

        streamInfo.id = period.id;
        streamInfo.index = period.index;
        streamInfo.start = period.start;
        streamInfo.duration = period.duration;
        streamInfo.manifestInfo = convertMpdToManifestInfo(period.mpd);
        streamInfo.isLast = period.mpd.manifest.Period_asArray.length === 1 || Math.abs((streamInfo.start + streamInfo.duration) - streamInfo.manifestInfo.duration) < THRESHOLD;

        return streamInfo;
    }

    function convertMpdToManifestInfo(mpd) {
        let manifestInfo = new ManifestInfo();

        manifestInfo.DVRWindowSize = mpd.timeShiftBufferDepth;
        manifestInfo.loadedTime = mpd.manifest.loadedTime;
        manifestInfo.availableFrom = mpd.availabilityStartTime;
        manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
        manifestInfo.duration = getDuration(mpd.manifest);
        manifestInfo.isDynamic = getIsDynamic(mpd.manifest);

        return manifestInfo;
    }

    function getMediaInfoForType(streamInfo, type) {

        if (voPeriods.length === 0) {
            return null;
        }

        const manifest = voPeriods[0].mpd.manifest;
        let realAdaptation = getAdaptationForType(manifest, streamInfo.index, type, streamInfo);
        if (!realAdaptation) return null;

        let selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voPeriods);
        let periodId = selectedVoPeriod.id;
        let idx = dashManifestModel.getIndexForAdaptation(realAdaptation, manifest, streamInfo.index);

        voAdaptations[periodId] = voAdaptations[periodId] || dashManifestModel.getAdaptationsForPeriod(selectedVoPeriod);

        return convertAdaptationToMediaInfo(voAdaptations[periodId][idx]);
    }

    function getIsMain(adaptation) {
        return dashManifestModel.getRolesForAdaptation(adaptation).filter(function (role) {
            return role.value === DashConstants.MAIN;
        })[0];
    }

    function getAdaptationForType(periodIndex, type, streamInfo) {
        const manifest = voPeriods[0].mpd.manifest;
        const adaptations = dashManifestModel.getAdaptationsForType(manifest, periodIndex, type);

        if (!adaptations || adaptations.length === 0) return null;

        if (adaptations.length > 1 && streamInfo) {
            const allMediaInfoForType = getAllMediaInfoForType(streamInfo, type);

            if (currentMediaInfo[streamInfo.id] && currentMediaInfo[streamInfo.id][type]) {
                for (let i = 0, ln = adaptations.length; i < ln; i++) {
                    if (currentMediaInfo[streamInfo.id][type].isMediaInfoEqual(allMediaInfoForType[i])) {
                        return adaptations[i];
                    }
                }
            }

            for (let i = 0, ln = adaptations.length; i < ln; i++) {
                if (getIsMain(adaptations[i])) {
                    return adaptations[i];
                }
            }
        }

        return adaptations[0];
    }

    function getAllMediaInfoForType(streamInfo, type, externalManifest) {
        let voLocalPeriods = voPeriods;
        let manifest = externalManifest;
        let mediaArr = [];
        let data,
            media,
            idx,
            i,
            j,
            ln;

        if (manifest) {
            checkSetConfigCall();

            voLocalPeriods = getPeriodsFromManifest(manifest);
        } else {
            if (voPeriods.length > 0) {
                manifest = voPeriods[0].mpd.manifest;
            } else {
                return mediaArr;
            }
        }

        const selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voLocalPeriods);
        const periodId = selectedVoPeriod.id;
        const adaptationsForType = dashManifestModel.getAdaptationsForType(manifest, streamInfo.index, type !== constants.EMBEDDED_TEXT ? type : constants.VIDEO);

        if (!adaptationsForType) return mediaArr;

        voAdaptations[periodId] = voAdaptations[periodId] || dashManifestModel.getAdaptationsForPeriod(selectedVoPeriod);

        for (i = 0, ln = adaptationsForType.length; i < ln; i++) {
            data = adaptationsForType[i];
            idx = dashManifestModel.getIndexForAdaptation(data, manifest, streamInfo.index);
            media = convertAdaptationToMediaInfo(voAdaptations[periodId][idx]);

            if (type === constants.EMBEDDED_TEXT) {
                let accessibilityLength = media.accessibility.length;
                for (j = 0; j < accessibilityLength; j++) {
                    if (!media) {
                        continue;
                    }
                    let accessibility = media.accessibility[j];
                    if (accessibility.indexOf('cea-608:') === 0) {
                        let value = accessibility.substring(8);
                        let parts = value.split(';');
                        if (parts[0].substring(0, 2) === 'CC') {
                            for (j = 0; j < parts.length; j++) {
                                if (!media) {
                                    media = convertAdaptationToMediaInfo.call(this, voAdaptations[periodId][idx]);
                                }
                                convertVideoInfoToEmbeddedTextInfo(media, parts[j].substring(0, 3), parts[j].substring(4));
                                mediaArr.push(media);
                                media = null;
                            }
                        } else {
                            for (j = 0; j < parts.length; j++) { // Only languages for CC1, CC2, ...
                                if (!media) {
                                    media = convertAdaptationToMediaInfo.call(this, voAdaptations[periodId][idx]);
                                }
                                convertVideoInfoToEmbeddedTextInfo(media, 'CC' + (j + 1), parts[j]);
                                mediaArr.push(media);
                                media = null;
                            }
                        }
                    } else if (accessibility.indexOf('cea-608') === 0) { // Nothing known. We interpret it as CC1=eng
                        convertVideoInfoToEmbeddedTextInfo(media, constants.CC1, 'eng');
                        mediaArr.push(media);
                        media = null;
                    }
                }
            } else if (type === constants.IMAGE) {
                convertVideoInfoToThumbnailInfo(media);
                mediaArr.push(media);
                media = null;
            } else if (media) {
                mediaArr.push(media);
            }
        }

        return mediaArr;
    }

    function checkSetConfigCall() {
        if (!dashManifestModel || !dashManifestModel.hasOwnProperty('getMpd') || !dashManifestModel.hasOwnProperty('getRegularPeriods')) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function updatePeriods(newManifest) {
        if (!newManifest) return null;

        checkSetConfigCall();

        voPeriods = getPeriodsFromManifest(newManifest);

        voAdaptations = {};
    }

    function getPeriodsFromManifest(manifest) {
        const mpd = getMpd(manifest);

        return getRegularPeriods(mpd);
    }

    function getStreamsInfo(externalManifest, maxStreamsInfo) {
        const streams = [];
        let voLocalPeriods = voPeriods;

        //if manifest is defined, getStreamsInfo is for an outside manifest, not the current one
        if (externalManifest) {
            checkSetConfigCall();
            voLocalPeriods = getPeriodsFromManifest(externalManifest);
        }

        if (!maxStreamsInfo) {
            maxStreamsInfo = voLocalPeriods.length;
        }
        for (let i = 0; i < maxStreamsInfo; i++) {
            streams.push(convertPeriodToStreamInfo(voLocalPeriods[i]));
        }

        return streams;
    }

    function getRealAdaptation(streamInfo, mediaInfo) {
        let id,
            realAdaptation;

        const selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voPeriods);

        id = mediaInfo ? mediaInfo.id : null;

        if (voPeriods.length > 0) {
            realAdaptation = id ? dashManifestModel.getAdaptationForId(id, voPeriods[0].mpd.manifest, selectedVoPeriod.index) : dashManifestModel.getAdaptationForIndex(mediaInfo.index, voPeriods[0].mpd.manifest, selectedVoPeriod.index);
        }

        return realAdaptation;
    }

    function getVoRepresentations(mediaInfo) {
        let voReps;

        const voAdaptation = getAdaptationForMediaInfo(mediaInfo);
        voReps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);

        return voReps;
    }

    function getEvent(eventBox, eventStreams, startTime) {
        if (!eventBox || !eventStreams) {
            return null;
        }
        const event = new Event();
        const schemeIdUri = eventBox.scheme_id_uri;
        const value = eventBox.value;
        const timescale = eventBox.timescale;
        const presentationTimeDelta = eventBox.presentation_time_delta;
        const duration = eventBox.event_duration;
        const id = eventBox.id;
        const messageData = eventBox.message_data;
        const presentationTime = startTime * timescale + presentationTimeDelta;

        if (!eventStreams[schemeIdUri + '/' + value]) return null;

        event.eventStream = eventStreams[schemeIdUri + '/' + value];
        event.eventStream.value = value;
        event.eventStream.timescale = timescale;
        event.duration = duration;
        event.id = id;
        event.presentationTime = presentationTime;
        event.messageData = messageData;
        event.presentationTimeDelta = presentationTimeDelta;

        return event;
    }

    function getEventsFor(info, voRepresentation) {
        let events = [];

        if (voPeriods.length === 0) {
            return events;
        }

        const manifest = voPeriods[0].mpd.manifest;

        if (info instanceof StreamInfo) {
            events = dashManifestModel.getEventsForPeriod(getPeriodForStreamInfo(info, voPeriods));
        } else if (info instanceof MediaInfo) {
            events = dashManifestModel.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
        } else if (info instanceof RepresentationInfo) {
            events = dashManifestModel.getEventStreamForRepresentation(manifest, voRepresentation);
        }

        return events;
    }

    function setCurrentMediaInfo(streamId, type, mediaInfo) {
        currentMediaInfo[streamId] = currentMediaInfo[streamId] || {};
        currentMediaInfo[streamId][type] = currentMediaInfo[streamId][type] || {};
        currentMediaInfo[streamId][type] = mediaInfo;
    }

    function getIsTextTrack(type) {
        return dashManifestModel.getIsTextTrack(type);
    }

    function getUTCTimingSources() {
        const manifest = voPeriods[0].mpd.manifest;
        return dashManifestModel.getUTCTimingSources(manifest);
    }

    function getSuggestedPresentationDelay() {
        const mpd = voPeriods[0].mpd;
        return dashManifestModel.getSuggestedPresentationDelay(mpd);
    }

    function getAvailabilityStartTime(externalMpd) {
        const mpd = externalMpd ? externalMpd : voPeriods[0].mpd;
        return dashManifestModel.getAvailabilityStartTime(mpd);
    }

    function getIsDynamic(externalManifest) {
        const manifest = externalManifest ? externalManifest : voPeriods[0].mpd.manifest;
        return dashManifestModel.getIsDynamic(manifest);
    }

    function getDuration(externalManifest) {
        const manifest = externalManifest ? externalManifest : voPeriods[0].mpd.manifest;
        return dashManifestModel.getDuration(manifest);
    }

    function getRegularPeriods(externalMpd) {
        const mpd = externalMpd ? externalMpd : voPeriods[0].mpd;
        return dashManifestModel.getRegularPeriods(mpd);
    }

    function getMpd(externalManifest) {
        const manifest = externalManifest ? externalManifest : voPeriods[0].mpd.manifest;
        return dashManifestModel.getMpd(manifest);
    }

    function getLocation(manifest) {
        return dashManifestModel.getLocation(manifest);
    }

    function getManifestUpdatePeriod(manifest, latencyOfLastUpdate = 0) {
        return dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
    }

    function getIsDVB(manifest) {
        return dashManifestModel.hasProfile(manifest, PROFILE_DVB);
    }

    function getBaseURLsFromElement(node) {
        return dashManifestModel.getBaseURLsFromElement(node);
    }

    function getRepresentationSortFunction() {
        return dashManifestModel.getRepresentationSortFunction();
    }

    function reset() {
        voPeriods = [];
        voAdaptations = {};
        currentMediaInfo = {};
    }

    instance = {
        convertDataToRepresentationInfo: convertRepresentationToRepresentationInfo,
        getDataForMedia: getAdaptationForMediaInfo,
        getStreamsInfo: getStreamsInfo,
        getMediaInfoForType: getMediaInfoForType,
        getAllMediaInfoForType: getAllMediaInfoForType,
        getAdaptationForType: getAdaptationForType,
        getRealAdaptation: getRealAdaptation,
        getVoRepresentations: getVoRepresentations,
        getEventsFor: getEventsFor,
        getEvent: getEvent,
        setConfig: setConfig,
        updatePeriods: updatePeriods,
        setCurrentMediaInfo: setCurrentMediaInfo,
        getIsTextTrack: getIsTextTrack,
        getUTCTimingSources: getUTCTimingSources,
        getSuggestedPresentationDelay: getSuggestedPresentationDelay,
        getAvailabilityStartTime: getAvailabilityStartTime,
        getIsDynamic: getIsDynamic,
        getDuration: getDuration,
        getRegularPeriods: getRegularPeriods,
        getMpd: getMpd,
        getLocation: getLocation,
        getManifestUpdatePeriod: getManifestUpdatePeriod,
        getIsDVB: getIsDVB,
        getBaseURLsFromElement: getBaseURLsFromElement,
        getRepresentationSortFunction: getRepresentationSortFunction,
        reset: reset
    };

    setup();
    return instance;
}

DashAdapter.__dashjs_factory_name = 'DashAdapter';
export default FactoryMaker.getSingletonFactory(DashAdapter);
