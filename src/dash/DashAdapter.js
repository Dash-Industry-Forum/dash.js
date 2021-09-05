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
import DashManifestModel from './models/DashManifestModel';
import PatchManifestModel from './models/PatchManifestModel';

/**
 * @module DashAdapter
 * @description The DashAdapter module can be accessed using the MediaPlayer API getDashAdapter()
 */

function DashAdapter() {
    let instance,
        dashManifestModel,
        patchManifestModel,
        voPeriods,
        currentMediaInfo,
        constants,
        cea608parser;

    const context = this.context;

    const PROFILE_DVB = 'urn:dvb:dash:profile:dvb-dash:2014';

    function setup() {
        dashManifestModel = DashManifestModel(context).getInstance();
        patchManifestModel = PatchManifestModel(context).getInstance();
        reset();
    }

    // #region PUBLIC FUNCTIONS
    // --------------------------------------------------
    function setConfig(config) {
        if (!config) return;

        if (config.constants) {
            constants = config.constants;
        }

        if (config.cea608parser) {
            cea608parser = config.cea608parser;
        }

        if (config.errHandler) {
            dashManifestModel.setConfig({ errHandler: config.errHandler });
        }

        if (config.BASE64) {
            dashManifestModel.setConfig({ BASE64: config.BASE64 });
        }
    }

    /**
     * Creates an instance of RepresentationInfo based on a representation value object
     * @param {object} voRepresentation
     * @returns {RepresentationInfo|null} representationInfo
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function convertRepresentationToRepresentationInfo(voRepresentation) {
        if (voRepresentation) {
            let representationInfo = new RepresentationInfo();
            const realAdaptation = voRepresentation.adaptation.period.mpd.manifest.Period_asArray[voRepresentation.adaptation.period.index].AdaptationSet_asArray[voRepresentation.adaptation.index];
            const realRepresentation = dashManifestModel.getRepresentationFor(voRepresentation.index, realAdaptation);

            representationInfo.id = voRepresentation.id;
            representationInfo.quality = voRepresentation.index;
            representationInfo.bandwidth = dashManifestModel.getBandwidth(realRepresentation);
            representationInfo.fragmentDuration = voRepresentation.segmentDuration || (voRepresentation.segments && voRepresentation.segments.length > 0 ? voRepresentation.segments[0].duration : NaN);
            representationInfo.MSETimeOffset = voRepresentation.MSETimeOffset;
            representationInfo.mediaInfo = convertAdaptationToMediaInfo(voRepresentation.adaptation);

            return representationInfo;
        } else {
            return null;
        }
    }

    /**
     * Returns a MediaInfo object for a given media type and the corresponding streamInfo.
     * @param {object} streamInfo
     * @param {MediaType }type
     * @returns {null|MediaInfo} mediaInfo
     * @memberOf module:DashAdapter
     * @instance
     */
    function getMediaInfoForType(streamInfo, type) {
        if (voPeriods.length === 0 || !streamInfo) {
            return null;
        }

        let selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voPeriods);
        if (!selectedVoPeriod) return null;

        const voAdaptations = dashManifestModel.getAdaptationsForPeriod(selectedVoPeriod);

        let realAdaptation = getAdaptationForType(streamInfo.index, type, streamInfo);
        if (!realAdaptation) return null;
        let idx = dashManifestModel.getIndexForAdaptation(realAdaptation, voPeriods[0].mpd.manifest, streamInfo.index);

        return convertAdaptationToMediaInfo(voAdaptations[idx]);
    }

    /**
     * Checks if the role of the specified AdaptationSet is set to main
     * @param {object} adaptation
     * @returns {boolean}
     * @memberOf module:DashAdapter
     * @instance
     */
    function getIsMain(adaptation) {
        return dashManifestModel.getRolesForAdaptation(adaptation).filter(function (role) {
            return role.value === DashConstants.MAIN;
        })[0];
    }

    /**
     * Returns the AdaptationSet for a given period index and a given mediaType.
     * @param {number} periodIndex
     * @param {MediaType} type
     * @param {object} streamInfo
     * @returns {null|object} adaptation
     * @memberOf module:DashAdapter
     * @instance
     */
    function getAdaptationForType(periodIndex, type, streamInfo) {
        const adaptations = dashManifestModel.getAdaptationsForType(voPeriods[0].mpd.manifest, periodIndex, type);

        if (!adaptations || adaptations.length === 0) return null;

        if (adaptations.length > 1 && streamInfo) {
            const allMediaInfoForType = getAllMediaInfoForType(streamInfo, type);

            if (currentMediaInfo[streamInfo.id] && currentMediaInfo[streamInfo.id][type]) {
                for (let i = 0, ln = adaptations.length; i < ln; i++) {
                    if (areMediaInfosEqual(currentMediaInfo[streamInfo.id][type], allMediaInfoForType[i])) {
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

    /**
     * Compares two mediaInfo objects
     * @param {MediaInfo} mInfoOne
     * @param {MediaInfo} mInfoTwo
     * @returns {boolean}
     */
    function areMediaInfosEqual(mInfoOne, mInfoTwo) {
        if (!mInfoOne || !mInfoTwo) {
            return false;
        }

        const sameId = mInfoOne.id === mInfoTwo.id;
        const sameCodec = mInfoOne.codec === mInfoTwo.codec;
        const sameViewpoint = mInfoOne.viewpoint === mInfoTwo.viewpoint;
        const sameLang = mInfoOne.lang === mInfoTwo.lang;
        const sameRoles = mInfoOne.roles.toString() === mInfoTwo.roles.toString();
        const sameAccessibility = mInfoOne.accessibility.toString() === mInfoTwo.accessibility.toString();
        const sameAudioChannelConfiguration = mInfoOne.audioChannelConfiguration.toString() === mInfoTwo.audioChannelConfiguration.toString();

        return (sameId && sameCodec && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
    }

    function _getAllMediaInfo(manifest, period, streamInfo, adaptations, type, embeddedText) {
        let mediaArr = [];
        let data,
            media,
            idx,
            i,
            j,
            ln;

        if (!adaptations || adaptations.length === 0) {
            return [];
        }

        const voAdaptations = dashManifestModel.getAdaptationsForPeriod(period);

        for (i = 0, ln = adaptations.length; i < ln; i++) {
            data = adaptations[i];
            idx = dashManifestModel.getIndexForAdaptation(data, manifest, streamInfo.index);
            media = convertAdaptationToMediaInfo(voAdaptations[idx]);

            if (embeddedText) {
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
                                    media = convertAdaptationToMediaInfo.call(this, voAdaptations[idx]);
                                }
                                convertVideoInfoToEmbeddedTextInfo(media, parts[j].substring(0, 3), parts[j].substring(4));
                                mediaArr.push(media);
                                media = null;
                            }
                        } else {
                            for (j = 0; j < parts.length; j++) { // Only languages for CC1, CC2, ...
                                if (!media) {
                                    media = convertAdaptationToMediaInfo.call(this, voAdaptations[idx]);
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

    /**
     * Returns all the mediaInfos for a given mediaType and the corresponding streamInfo.
     * @param {object} streamInfo
     * @param {MediaType} type
     * @param {object} externalManifest Set to null or undefined if no external manifest is to be used
     * @returns {Array} mediaArr
     * @memberOf module:DashAdapter
     * @instance
     */
    function getAllMediaInfoForType(streamInfo, type, externalManifest) {
        let voLocalPeriods = voPeriods;
        let manifest = externalManifest;
        let mediaArr = [];

        if (manifest) {
            checkConfig();

            voLocalPeriods = getRegularPeriods(manifest);
        } else {
            if (voPeriods.length > 0) {
                manifest = voPeriods[0].mpd.manifest;
            } else {
                return mediaArr;
            }
        }

        const selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voLocalPeriods);
        let adaptationsForType = dashManifestModel.getAdaptationsForType(manifest, streamInfo ? streamInfo.index : null, type);

        mediaArr = _getAllMediaInfo(manifest, selectedVoPeriod, streamInfo, adaptationsForType, type);

        // Search for embedded text in video track
        if (type === constants.TEXT) {
            adaptationsForType = dashManifestModel.getAdaptationsForType(manifest, streamInfo ? streamInfo.index : null, constants.VIDEO);
            mediaArr = mediaArr.concat(_getAllMediaInfo(manifest, selectedVoPeriod, streamInfo, adaptationsForType, type, true));
        }

        return mediaArr;
    }

    /**
     * Update the internal voPeriods array with the information from the new manifest
     * @param {object} newManifest
     * @returns {*}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function updatePeriods(newManifest) {
        if (!newManifest) return null;

        checkConfig();

        voPeriods = getRegularPeriods(newManifest);
    }

    /**
     * Returns an array of streamInfo objects
     * @param {object} externalManifest
     * @param {number} maxStreamsInfo
     * @returns {Array} streams
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getStreamsInfo(externalManifest, maxStreamsInfo) {
        const streams = [];
        let voLocalPeriods = voPeriods;

        //if manifest is defined, getStreamsInfo is for an outside manifest, not the current one
        if (externalManifest) {
            checkConfig();
            voLocalPeriods = getRegularPeriods(externalManifest);
        }

        if (voLocalPeriods.length > 0) {
            if (!maxStreamsInfo || maxStreamsInfo > voLocalPeriods.length) {
                maxStreamsInfo = voLocalPeriods.length;
            }
            for (let i = 0; i < maxStreamsInfo; i++) {
                streams.push(convertPeriodToStreamInfo(voLocalPeriods[i]));
            }
        }

        return streams;
    }

    /**
     * Returns the AdaptationSet as saved in the DashManifestModel
     * @param {object} streamInfo
     * @param {object} mediaInfo
     * @returns {object} realAdaptation
     * @memberOf module:DashAdapter
     * @instance
     */
    function getRealAdaptation(streamInfo, mediaInfo) {
        let id,
            realAdaptation;

        const selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voPeriods);

        id = mediaInfo ? mediaInfo.id : null;

        if (voPeriods.length > 0 && selectedVoPeriod) {
            realAdaptation = id ? dashManifestModel.getAdaptationForId(id, voPeriods[0].mpd.manifest, selectedVoPeriod.index) : dashManifestModel.getAdaptationForIndex(mediaInfo ? mediaInfo.index : null, voPeriods[0].mpd.manifest, selectedVoPeriod.index);
        }

        return realAdaptation;
    }

    /**
     * Return all EssentialProperties of a Representation
     * @param {object} representation
     * @return {array}
     */
    function getEssentialPropertiesForRepresentation(representation) {
        try {
            return dashManifestModel.getEssentialPropertiesForRepresentation(representation);
        } catch (e) {
            return [];
        }
    }

    /**
     * Returns the period as defined in the DashManifestModel for a given index
     * @param {number} index
     * @return {object}
     */
    function getRealPeriodByIndex(index) {
        return dashManifestModel.getRealPeriodForIndex(index, voPeriods[0].mpd.manifest);
    }

    /**
     * Returns all voRepresentations for a given mediaInfo
     * @param {object} mediaInfo
     * @returns {Array} voReps
     * @memberOf module:DashAdapter
     * @instance
     */
    function getVoRepresentations(mediaInfo) {
        let voReps;

        const voAdaptation = getAdaptationForMediaInfo(mediaInfo);
        voReps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation);

        return voReps;
    }

    /**
     * Returns the event for the given parameters.
     * @param {object} eventBox
     * @param {object} eventStreams
     * @param {number} mediaStartTime
     * @param {object} voRepresentation
     * @returns {null|Event}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getEvent(eventBox, eventStreams, mediaStartTime, voRepresentation) {
        try {
            if (!eventBox || !eventStreams || isNaN(mediaStartTime) || !voRepresentation) {
                return null;
            }

            const schemeIdUri = eventBox.scheme_id_uri;
            const value = eventBox.value;

            if (!eventStreams[schemeIdUri + '/' + value]) {
                return null;
            }

            const event = new Event();
            const timescale = eventBox.timescale || 1;
            const periodStart = voRepresentation.adaptation.period.start;
            const eventStream = eventStreams[schemeIdUri + '/' + value];
            const presentationTimeOffset = !isNaN(voRepresentation.presentationTimeOffset) ? voRepresentation.presentationTimeOffset : !isNaN(eventStream.presentationTimeOffset) ? eventStream.presentationTimeOffset : 0;
            let presentationTimeDelta = eventBox.presentation_time_delta / timescale; // In case of version 1 events the presentation_time is parsed as presentation_time_delta
            let calculatedPresentationTime;

            if (eventBox.version === 0) {
                calculatedPresentationTime = periodStart + mediaStartTime - presentationTimeOffset + presentationTimeDelta;
            } else {
                calculatedPresentationTime = periodStart - presentationTimeOffset + presentationTimeDelta;
            }

            const duration = eventBox.event_duration;
            const id = eventBox.id;
            const messageData = eventBox.message_data;

            event.eventStream = eventStream;
            event.eventStream.value = value;
            event.eventStream.timescale = timescale;
            event.duration = duration;
            event.id = id;
            event.calculatedPresentationTime = calculatedPresentationTime;
            event.messageData = messageData;
            event.presentationTimeDelta = presentationTimeDelta;

            return event;
        } catch (e) {
            return null;
        }
    }

    /**
     * Returns the events for the given info object. info can either be an instance of StreamInfo, MediaInfo or RepresentationInfo
     * @param {object} info
     * @param {object} voRepresentation
     * @returns {Array}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getEventsFor(info, voRepresentation) {
        let events = [];

        if (voPeriods.length > 0) {
            const manifest = voPeriods[0].mpd.manifest;

            if (info instanceof StreamInfo) {
                events = dashManifestModel.getEventsForPeriod(getPeriodForStreamInfo(info, voPeriods));
            } else if (info instanceof MediaInfo) {
                events = dashManifestModel.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info));
            } else if (info instanceof RepresentationInfo) {
                events = dashManifestModel.getEventStreamForRepresentation(manifest, voRepresentation);
            }
        }

        return events;
    }

    /**
     * Sets the current active mediaInfo for a given streamId and a given mediaType
     * @param {number} streamId
     * @param {MediaType} type
     * @param {object} mediaInfo
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function setCurrentMediaInfo(streamId, type, mediaInfo) {
        currentMediaInfo[streamId] = currentMediaInfo[streamId] || {};
        currentMediaInfo[streamId][type] = currentMediaInfo[streamId][type] || {};
        currentMediaInfo[streamId][type] = mediaInfo;
    }

    /**
     * Check if the given type is a text track
     * @param {object} adaptation
     * @returns {boolean}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getIsTextTrack(adaptation) {
        return dashManifestModel.getIsText(adaptation);
    }

    /**
     * Returns the UTC Timing Sources specified in the manifest
     * @returns {Array} utcTimingSources
     * @memberOf module:DashAdapter
     * @instance
     */
    function getUTCTimingSources() {
        const manifest = getManifest();
        return dashManifestModel.getUTCTimingSources(manifest);
    }

    /**
     * Returns the suggestedPresentationDelay as specified in the manifest
     * @returns {String} suggestedPresentationDelay
     * @memberOf module:DashAdapter
     * @instance
     */
    function getSuggestedPresentationDelay() {
        const mpd = voPeriods.length > 0 ? voPeriods[0].mpd : null;
        return dashManifestModel.getSuggestedPresentationDelay(mpd);
    }

    /**
     * Returns the availabilityStartTime as specified in the manifest
     * @param {object} externalManifest Omit this value if no external manifest should be used
     * @returns {string} availabilityStartTime
     * @memberOf module:DashAdapter
     * @instance
     */
    function getAvailabilityStartTime(externalManifest) {
        const mpd = getMpd(externalManifest);
        return dashManifestModel.getAvailabilityStartTime(mpd);
    }

    /**
     * Returns a boolean indicating if the manifest is dynamic or not
     * @param {object} externalManifest Omit this value if no external manifest should be used
     * @returns {boolean}
     * @memberOf module:DashAdapter
     * @instance
     */
    function getIsDynamic(externalManifest) {
        const manifest = getManifest(externalManifest);
        return dashManifestModel.getIsDynamic(manifest);
    }

    /**
     * Returns the duration of the MPD
     * @param {object} externalManifest Omit this value if no external manifest should be used
     * @returns {number} duration
     * @memberOf module:DashAdapter
     * @instance
     */
    function getDuration(externalManifest) {
        const manifest = getManifest(externalManifest);
        return dashManifestModel.getDuration(manifest);
    }

    /**
     * Returns all periods of the MPD
     * @param {object} externalManifest Omit this value if no external manifest should be used
     * @returns {Array} periods
     * @memberOf module:DashAdapter
     * @instance
     */
    function getRegularPeriods(externalManifest) {
        const mpd = getMpd(externalManifest);
        return dashManifestModel.getRegularPeriods(mpd);
    }

    /**
     * Returns an MPD object
     * @param {object} externalManifest Omit this value if no external manifest should be used
     * @returns {object} MPD
     * @memberOf module:DashAdapter
     * @instance
     */
    function getMpd(externalManifest) {
        const manifest = getManifest(externalManifest);
        return dashManifestModel.getMpd(manifest);
    }

    /**
     * Returns the location element of the MPD
     * @param {object} manifest
     * @returns {String} location
     * @memberOf module:DashAdapter
     * @instance
     */
    function getLocation(manifest) {
        return dashManifestModel.getLocation(manifest);
    }

    /**
     * Returns the manifest update period used for dynamic manifests
     * @param {object} manifest
     * @param {number} latencyOfLastUpdate
     * @returns {NaN|number} manifestUpdatePeriod
     * @memberOf module:DashAdapter
     * @instance
     */
    function getManifestUpdatePeriod(manifest, latencyOfLastUpdate = 0) {
        return dashManifestModel.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
    }

    /**
     * Returns the publish time from the manifest
     * @param {object} manifest
     * @returns {Date|null} publishTime
     * @memberOf module:DashAdapter
     * @instance
     */
    function getPublishTime(manifest) {
        return dashManifestModel.getPublishTime(manifest);
    }

    /**
     * Returns the patch location of the MPD if one exists and it is still valid
     * @param {object} manifest
     * @returns {(String|null)} patch location
     * @memberOf module:DashAdapter
     * @instance
     */
    function getPatchLocation(manifest) {
        const patchLocation = dashManifestModel.getPatchLocation(manifest);
        const publishTime = dashManifestModel.getPublishTime(manifest);

        // short-circuit when no patch location or publish time exists
        if (!patchLocation || !publishTime) {
            return null;
        }

        // if a ttl is provided, ensure patch location has not expired
        if (patchLocation.hasOwnProperty('ttl') && publishTime) {
            // attribute describes number of seconds as a double
            const ttl = parseFloat(patchLocation.ttl) * 1000;

            // check if the patch location has expired, if so do not consider it
            if (publishTime.getTime() + ttl <= new Date().getTime()) {
                return null;
            }
        }

        // the patch location exists and, if a ttl applies, has not expired
        return patchLocation.__text;
    }

    /**
     * Checks if the manifest has a DVB profile
     * @param {object} manifest
     * @returns {boolean}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getIsDVB(manifest) {
        return dashManifestModel.hasProfile(manifest, PROFILE_DVB);
    }

    /**
     * Checks if the manifest is actually just a patch manifest
     * @param  {object} manifest
     * @return {boolean}
     */
    function getIsPatch(manifest) {
        return patchManifestModel.getIsPatch(manifest);
    }

    /**
     * Returns the base urls for a given element
     * @param {object} node
     * @returns {Array}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getBaseURLsFromElement(node) {
        return dashManifestModel.getBaseURLsFromElement(node);
    }

    /**
     * Returns the function to sort the Representations
     * @returns {*}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getRepresentationSortFunction() {
        return dashManifestModel.getRepresentationSortFunction();
    }

    /**
     * Returns the codec for a given adaptation set and a given representation id.
     * @param {object} adaptation
     * @param {number} representationId
     * @param {boolean} addResolutionInfo Defines whether to include resolution information in the output
     * @returns {String} codec
     * @memberOf module:DashAdapter
     * @instance
     */
    function getCodec(adaptation, representationId, addResolutionInfo) {
        return dashManifestModel.getCodec(adaptation, representationId, addResolutionInfo);
    }

    /**
     * Returns the bandwidth for a given representation id and the corresponding period index
     * @param {number} representationId
     * @param {number} periodIdx
     * @returns {number} bandwidth
     * @memberOf module:DashAdapter
     * @instance
     */
    function getBandwidthForRepresentation(representationId, periodIdx) {
        let representation;
        let period = getPeriod(periodIdx);

        representation = findRepresentation(period, representationId);

        return representation ? representation.bandwidth : null;
    }

    /**
     * Returns the index for a given representation id
     * @param {string} representationId
     * @param {number} periodIdx
     * @returns {number} index
     * @memberOf module:DashAdapter
     * @instance
     */
    function getIndexForRepresentation(representationId, periodIdx) {
        let period = getPeriod(periodIdx);

        return findRepresentationIndex(period, representationId);
    }

    /**
     * This method returns the current max index based on what is defined in the MPD.
     * @param {string} bufferType - String 'audio' or 'video',
     * @param {number} periodIdx - Make sure this is the period index not id
     * @return {number}
     * @memberof module:DashAdapter
     * @instance
     */
    function getMaxIndexForBufferType(bufferType, periodIdx) {
        let period = getPeriod(periodIdx);

        return findMaxBufferIndex(period, bufferType);
    }

    /**
     * Returns the voPeriod object for a given id
     * @param {String} id
     * @returns {object|null}
     */
    function getPeriodById(id) {
        if (!id || voPeriods.length === 0) {
            return null;
        }
        const periods = voPeriods.filter((p) => {
            return p.id === id;
        });

        if (periods && periods.length > 0) {
            return periods[0];
        }

        return null;
    }

    /**
     * Checks if the given AdaptationSet is from the given media type
     * @param {object} adaptation
     * @param {string} type
     * @return {boolean}
     */
    function getIsTypeOf(adaptation, type) {
        return dashManifestModel.getIsTypeOf(adaptation, type);
    }

    function reset() {
        voPeriods = [];
        currentMediaInfo = {};
    }

    /**
     * Checks if the supplied manifest is compatible for application of the supplied patch
     * @param  {object}  manifest
     * @param  {object}  patch
     * @return {boolean}
     */
    function isPatchValid(manifest, patch) {
        let manifestId = dashManifestModel.getId(manifest);
        let patchManifestId = patchManifestModel.getMpdId(patch);
        let manifestPublishTime = dashManifestModel.getPublishTime(manifest);
        let patchPublishTime = patchManifestModel.getPublishTime(patch);
        let originalManifestPublishTime = patchManifestModel.getOriginalPublishTime(patch);

        // Patches are considered compatible if the following are true
        // - MPD@id == Patch@mpdId
        // - MPD@publishTime == Patch@originalPublishTime
        // - MPD@publishTime < Patch@publishTime
        // - All values in comparison exist
        return !!(manifestId && patchManifestId && (manifestId == patchManifestId) &&
            manifestPublishTime && originalManifestPublishTime && (manifestPublishTime.getTime() == originalManifestPublishTime.getTime()) &&
            patchPublishTime && (manifestPublishTime.getTime() < patchPublishTime.getTime()));
    }

    /**
     * Takes a given patch and applies it to the provided manifest, assumes patch is valid for manifest
     * @param  {object} manifest
     * @param  {object} patch
     */
    function applyPatchToManifest(manifest, patch) {
        // get all operations from the patch and apply them in document order
        patchManifestModel.getPatchOperations(patch)
            .forEach((operation) => {
                let result = operation.getMpdTarget(manifest);

                // operation supplies a path that doesn't match mpd, skip
                if (result === null) {
                    return;
                }

                let { name, target, leaf } = result;

                // short circuit for attribute selectors
                if (operation.xpath.findsAttribute()) {
                    switch (operation.action) {
                        case 'add':
                        case 'replace':
                            // add and replace are just setting the value
                            target[name] = operation.value;
                            break;
                        case 'remove':
                            // remove is deleting the value
                            delete target[name];
                            break;
                    }
                    return;
                }

                // determine the relative insert position prior to possible removal
                let relativePosition = (target[name + '_asArray'] || []).indexOf(leaf);
                let insertBefore = (operation.position === 'prepend' || operation.position === 'before');

                // perform removal operation first, we have already capture the appropriate relative position
                if (operation.action === 'remove' || operation.action === 'replace') {
                    // note that we ignore the 'ws' attribute of patch operations as it does not effect parsed mpd operations

                    // purge the directly named entity
                    delete target[name];

                    // if we did have a positional reference we need to purge from array set and restore X2JS proper semantics
                    if (relativePosition != -1) {
                        let targetArray = target[name + '_asArray'];
                        targetArray.splice(relativePosition, 1);
                        if (targetArray.length > 1) {
                            target[name] = targetArray;
                        } else if (targetArray.length == 1) {
                            // xml parsing semantics, singular asArray must be non-array in the unsuffixed key
                            target[name] = targetArray[0];
                        } else {
                            // all nodes of this type deleted, remove entry
                            delete target[name + '_asArray'];
                        }
                    }
                }

                // Perform any add/replace operations now, technically RFC5261 only allows a single element to take the
                // place of a replaced element while the add case allows an arbitrary number of children.
                // Due to the both operations requiring the same insertion logic they have been combined here and we will
                // not enforce single child operations for replace, assertions should be made at patch parse time if necessary
                if (operation.action === 'add' || operation.action === 'replace') {
                    // value will be an object with element name keys pointing to arrays of objects
                    Object.keys(operation.value).forEach((insert) => {
                        let insertNodes = operation.value[insert];

                        let updatedNodes = target[insert + '_asArray'] || [];
                        if (updatedNodes.length === 0 && target[insert]) {
                            updatedNodes.push(target[insert]);
                        }

                        if (updatedNodes.length === 0) {
                            // no original nodes for this element type
                            updatedNodes = insertNodes;
                        } else {
                            // compute the position we need to insert at, default to end of set
                            let position = updatedNodes.length;
                            if (insert == name && relativePosition != -1) {
                                // if the inserted element matches the operation target (not leaf) and there is a relative position we
                                // want the inserted position to be set such that our insertion is relative to original position
                                // since replace has modified the array length we reduce the insert point by 1
                                position = relativePosition + (insertBefore ? 0 : 1) + (operation.action == 'replace' ? -1 : 0);
                            } else {
                                // otherwise we are in an add append/prepend case or replace case that removed the target name completely
                                position = insertBefore ? 0 : updatedNodes.length;
                            }

                            // we dont have to perform element removal for the replace case as that was done above
                            updatedNodes.splice.apply(updatedNodes, [position, 0].concat(insertNodes));
                        }

                        // now we properly reset the element keys on the target to match parsing semantics
                        target[insert + '_asArray'] = updatedNodes;
                        target[insert] = updatedNodes.length == 1 ? updatedNodes[0] : updatedNodes;
                    });
                }
            });
    }

    // #endregion PUBLIC FUNCTIONS

    // #region PRIVATE FUNCTIONS
    // --------------------------------------------------
    function getManifest(externalManifest) {
        return externalManifest ? externalManifest : voPeriods.length > 0 ? voPeriods[0].mpd.manifest : null;
    }

    function getAdaptationForMediaInfo(mediaInfo) {
        try {
            const selectedVoPeriod = getPeriodForStreamInfo(mediaInfo.streamInfo, voPeriods);
            const voAdaptations = dashManifestModel.getAdaptationsForPeriod(selectedVoPeriod);

            if (!mediaInfo || !mediaInfo.streamInfo || mediaInfo.streamInfo.id === undefined || !voAdaptations) return null;
            return voAdaptations[mediaInfo.index];
        } catch (e) {
            return null;
        }
    }

    function getPeriodForStreamInfo(streamInfo, voPeriodsArray) {
        const ln = voPeriodsArray.length;

        for (let i = 0; i < ln; i++) {
            let voPeriod = voPeriodsArray[i];

            if (streamInfo && streamInfo.id === voPeriod.id) return voPeriod;
        }

        return null;
    }

    function convertAdaptationToMediaInfo(adaptation) {
        if (!adaptation) {
            return null;
        }

        let mediaInfo = new MediaInfo();
        const realAdaptation = adaptation.period.mpd.manifest.Period_asArray[adaptation.period.index].AdaptationSet_asArray[adaptation.index];
        let viewpoint;

        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo(adaptation.period);
        mediaInfo.representationCount = dashManifestModel.getRepresentationCount(realAdaptation);
        mediaInfo.labels = dashManifestModel.getLabelsForAdaptation(realAdaptation);
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

        if (mediaInfo.audioChannelConfiguration.length === 0 && Array.isArray(realAdaptation.Representation_asArray) && realAdaptation.Representation_asArray.length > 0) {
            mediaInfo.audioChannelConfiguration = dashManifestModel.getAudioChannelConfigurationForRepresentation(realAdaptation.Representation_asArray[0]).map(function (audioChannelConfiguration) {
                return audioChannelConfiguration.value;
            });
        }
        mediaInfo.roles = dashManifestModel.getRolesForAdaptation(realAdaptation).map(function (role) {
            return role.value;
        });
        mediaInfo.codec = dashManifestModel.getCodec(realAdaptation);
        mediaInfo.mimeType = dashManifestModel.getMimeType(realAdaptation);
        mediaInfo.contentProtection = dashManifestModel.getContentProtectionData(realAdaptation);
        mediaInfo.bitrateList = dashManifestModel.getBitrateListForAdaptation(realAdaptation);
        mediaInfo.selectionPriority = dashManifestModel.getSelectionPriority(realAdaptation);

        if (mediaInfo.contentProtection) {
            mediaInfo.contentProtection.forEach(function (item) {
                item.KID = dashManifestModel.getKID(item);
            });
        }

        mediaInfo.isText = dashManifestModel.getIsText(realAdaptation);
        mediaInfo.supplementalProperties = dashManifestModel.getSupplementalProperties(realAdaptation);

        mediaInfo.isFragmented = dashManifestModel.getIsFragmented(realAdaptation);
        mediaInfo.isEmbedded = false;

        return mediaInfo;
    }

    function convertVideoInfoToEmbeddedTextInfo(mediaInfo, channel, lang) {
        mediaInfo.id = channel; // CC1, CC2, CC3, or CC4
        mediaInfo.index = 100 + parseInt(channel.substring(2, 3));
        mediaInfo.type = constants.TEXT;
        mediaInfo.codec = 'cea-608-in-SEI';
        mediaInfo.isEmbedded = true;
        mediaInfo.isFragmented = false;
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

        manifestInfo.dvrWindowSize = mpd.timeShiftBufferDepth;
        manifestInfo.loadedTime = mpd.manifest.loadedTime;
        manifestInfo.availableFrom = mpd.availabilityStartTime;
        manifestInfo.minBufferTime = mpd.manifest.minBufferTime;
        manifestInfo.maxFragmentDuration = mpd.maxSegmentDuration;
        manifestInfo.duration = dashManifestModel.getDuration(mpd.manifest);
        manifestInfo.isDynamic = dashManifestModel.getIsDynamic(mpd.manifest);
        manifestInfo.serviceDescriptions = dashManifestModel.getServiceDescriptions(mpd.manifest);
        manifestInfo.protocol = mpd.manifest.protocol;

        return manifestInfo;
    }

    function checkConfig() {
        if (!constants) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function getPeriod(periodIdx) {
        return voPeriods.length > 0 ? voPeriods[0].mpd.manifest.Period_asArray[periodIdx] : null;
    }

    function findRepresentationIndex(period, representationId) {
        const index = findRepresentation(period, representationId, true);

        return index !== null ? index : -1;
    }

    function findRepresentation(period, representationId, returnIndex) {
        let adaptationSet,
            adaptationSetArray,
            representation,
            representationArray,
            adaptationSetArrayIndex,
            representationArrayIndex;

        if (period) {
            adaptationSetArray = period.AdaptationSet_asArray;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation_asArray;
                for (representationArrayIndex = 0; representationArrayIndex < representationArray.length; representationArrayIndex = representationArrayIndex + 1) {
                    representation = representationArray[representationArrayIndex];
                    if (representationId === representation.id) {
                        if (returnIndex) {
                            return representationArrayIndex;
                        } else {
                            return representation;
                        }
                    }
                }
            }
        }

        return null;
    }

    function findMaxBufferIndex(period, bufferType) {
        let adaptationSet,
            adaptationSetArray,
            representationArray,
            adaptationSetArrayIndex;

        if (!period || !bufferType) return -1;

        adaptationSetArray = period.AdaptationSet_asArray;
        for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
            adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
            representationArray = adaptationSet.Representation_asArray;
            if (dashManifestModel.getIsTypeOf(adaptationSet, bufferType)) {
                return representationArray.length;
            }
        }

        return -1;
    }

    // #endregion PRIVATE FUNCTIONS

    instance = {
        getBandwidthForRepresentation,
        getIndexForRepresentation,
        getMaxIndexForBufferType,
        convertRepresentationToRepresentationInfo,
        getStreamsInfo,
        getMediaInfoForType,
        getAllMediaInfoForType,
        getAdaptationForType,
        getRealAdaptation,
        getRealPeriodByIndex,
        getEssentialPropertiesForRepresentation,
        getVoRepresentations,
        getEventsFor,
        getEvent,
        getMpd,
        setConfig,
        updatePeriods,
        getIsTextTrack,
        getUTCTimingSources,
        getSuggestedPresentationDelay,
        getAvailabilityStartTime,
        getIsTypeOf,
        getIsDynamic,
        getDuration,
        getRegularPeriods,
        getLocation,
        getPatchLocation,
        getManifestUpdatePeriod,
        getPublishTime,
        getIsDVB,
        getIsPatch,
        getBaseURLsFromElement,
        getRepresentationSortFunction,
        getCodec,
        getPeriodById,
        setCurrentMediaInfo,
        isPatchValid,
        applyPatchToManifest,
        areMediaInfosEqual,
        reset
    };

    setup();
    return instance;
}

DashAdapter.__dashjs_factory_name = 'DashAdapter';
export default FactoryMaker.getSingletonFactory(DashAdapter);
