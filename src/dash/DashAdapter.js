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

import DashConstants from './constants/DashConstants.js';
import MediaInfo from './vo/MediaInfo.js';
import StreamInfo from './vo/StreamInfo.js';
import ManifestInfo from './vo/ManifestInfo.js';
import Event from './vo/Event.js';
import FactoryMaker from '../core/FactoryMaker.js';
import DashManifestModel from './models/DashManifestModel.js';
import PatchManifestModel from './models/PatchManifestModel.js';
import Representation from './vo/Representation.js';
import {bcp47Normalize} from 'bcp-47-normalize';
import {getId3Frames} from '@svta/common-media-library/id3/getId3Frames.js';
import Constants from '../streaming/constants/Constants.js';

/**
 * @module DashAdapter
 * @description The DashAdapter module can be accessed using the MediaPlayer API getDashAdapter()
 */

function DashAdapter() {
    let instance,
        dashManifestModel,
        patchManifestModel,
        voPeriods,
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
        if (!config) {
            return;
        }

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
        if (!selectedVoPeriod) {
            return null;
        }

        const voAdaptations = dashManifestModel.getAdaptationsForPeriod(selectedVoPeriod);

        let realAdaptation = getMainAdaptationForType(type, streamInfo);
        if (!realAdaptation) {
            return null;
        }
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
    function getMainAdaptationForType(type, streamInfo) {
        const index = streamInfo ? streamInfo.index : 0;
        const adaptations = dashManifestModel.getAdaptationsForType(voPeriods[index].mpd.manifest, index, type);

        if (!adaptations || adaptations.length === 0) {
            return null;
        }

        if (adaptations.length > 1 && streamInfo) {
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
     * @memberof module:DashAdapter
     * @instance
     */
    function areMediaInfosEqual(mInfoOne, mInfoTwo) {
        if (!mInfoOne || !mInfoTwo) {
            return false;
        }

        const sameId = mInfoOne.id === mInfoTwo.id;
        const sameCodec = mInfoOne.codec === mInfoTwo.codec;
        const sameViewpoint = JSON.stringify(mInfoOne.viewpoint) === JSON.stringify(mInfoTwo.viewpoint);
        const sameLang = mInfoOne.lang === mInfoTwo.lang;
        const sameRoles = JSON.stringify(mInfoOne.roles) === JSON.stringify(mInfoTwo.roles);
        const sameAccessibility = JSON.stringify(mInfoOne.accessibility) === JSON.stringify(mInfoTwo.accessibility);
        const sameAudioChannelConfiguration = JSON.stringify(mInfoOne.audioChannelConfiguration) === JSON.stringify(mInfoTwo.audioChannelConfiguration);

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
                    if (accessibility.schemeIdUri === constants.ACCESSIBILITY_CEA608_SCHEME) {
                        if (!accessibility.value || accessibility.value === '') {
                            convertVideoInfoToEmbeddedTextInfo(media, constants.CC1, 'eng');
                            mediaArr.push(media);
                            media = null;
                        } else {
                            let value = accessibility.value;
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
                        }
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
        if (!newManifest) {
            return null;
        }

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
     * Returns the ProducerReferenceTimes as saved in the DashManifestModel if present
     * @param {object} streamInfo
     * @param {object} mediaInfo
     * @returns {object} producerReferenceTimes
     * @memberOf module:DashAdapter
     * @instance
     */
    function getProducerReferenceTimes(streamInfo, mediaInfo) {
        let id, realAdaptation;

        const selectedVoPeriod = getPeriodForStreamInfo(streamInfo, voPeriods);
        id = mediaInfo ? mediaInfo.id : null;

        if (voPeriods.length > 0 && selectedVoPeriod) {
            realAdaptation = id ? dashManifestModel.getAdaptationForId(id, voPeriods[0].mpd.manifest, selectedVoPeriod.index) : dashManifestModel.getAdaptationForIndex(mediaInfo ? mediaInfo.index : null, voPeriods[0].mpd.manifest, selectedVoPeriod.index);
        }

        if (!realAdaptation) {
            return [];
        }
        return dashManifestModel.getProducerReferenceTimesForAdaptation(realAdaptation);
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
     * @memberOf module:DashAdapter
     * @instance
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
        voReps = dashManifestModel.getRepresentationsForAdaptation(voAdaptation, mediaInfo);

        return voReps;
    }

    /**
     * Returns the event for the given parameters.
     * @param {object} eventBox
     * @param {object} eventStreams
     * @param {number} mediaStartTime - Specified in seconds
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
            // The PTO in voRepresentation is already specified in seconds
            const presentationTimeOffset = !isNaN(voRepresentation.presentationTimeOffset) ? voRepresentation.presentationTimeOffset : !isNaN(eventStream.presentationTimeOffset) ? eventStream.presentationTimeOffset : 0;
            // In case of version 1 events the presentation_time is parsed as presentation_time_delta
            let presentationTimeDelta = eventBox.presentation_time_delta / timescale;
            let calculatedPresentationTime;

            if (eventBox.version === 0) {
                calculatedPresentationTime = periodStart + mediaStartTime - presentationTimeOffset + presentationTimeDelta;
            } else {
                calculatedPresentationTime = periodStart - presentationTimeOffset + presentationTimeDelta;
            }

            const duration = eventBox.event_duration / timescale;
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
            event.parsedMessageData = (schemeIdUri === Constants.ID3_SCHEME_ID_URI) ? getId3Frames(messageData) : null;

            return event;
        } catch (e) {
            return null;
        }
    }

    /**
     * Returns the events for the given info object. info can either be an instance of StreamInfo, MediaInfo or Representation
     * @param {object} info
     * @param {object} voRepresentation
     * @returns {Array}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getEventsFor(info, voRepresentation, streamInfo) {
        let events = [];

        if (voPeriods.length > 0) {
            const manifest = voPeriods[0].mpd.manifest;

            if (info instanceof StreamInfo) {
                const period = getPeriodForStreamInfo(info, voPeriods)
                events = dashManifestModel.getEventsForPeriod(period);
            } else if (info instanceof MediaInfo) {
                const period = getPeriodForStreamInfo(streamInfo, voPeriods)
                events = dashManifestModel.getEventStreamForAdaptationSet(manifest, getAdaptationForMediaInfo(info), period);
            } else if (info instanceof Representation) {
                const period = getPeriodForStreamInfo(streamInfo, voPeriods)
                events = dashManifestModel.getEventStreamForRepresentation(manifest, voRepresentation, period);
            }
        }

        return events;
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
     * @returns {number} availabilityStartTime
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
     * Returns the ContentSteering element of the MPD
     * @param {object} manifest
     * @returns {object} contentSteering
     * @memberOf module:DashAdapter
     * @instance
     */
    function getContentSteering(manifest) {
        return dashManifestModel.getContentSteering(manifest);
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
     * Returns the patch locations of the MPD if existing and if they are still valid
     * @param {object} manifest
     * @returns {PatchLocation[]} patch location
     * @memberOf module:DashAdapter
     * @instance
     */
    function getPatchLocation(manifest) {
        const patchLocations = dashManifestModel.getPatchLocation(manifest);
        const publishTime = dashManifestModel.getPublishTime(manifest);

        // short-circuit when no patch location or publish time exists
        if (!patchLocations || patchLocations.length === 0 || !publishTime) {
            return [];
        }

        return patchLocations.filter((patchLocation) => {
            // check if the patch location has expired, if so do not consider it
            return isNaN(patchLocation.ttl) || (publishTime.getTime() + patchLocation.ttl > new Date().getTime())
        })
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
     * @memberOf module:DashAdapter
     * @instance
     */
    function getIsPatch(manifest) {
        return patchManifestModel.getIsPatch(manifest);
    }

    /**
     * Returns the base urls for a given element
     * @param {object} node
     * @returns {BaseURL[]}
     * @memberOf module:DashAdapter
     * @instance
     * @ignore
     */
    function getBaseURLsFromElement(node) {
        return dashManifestModel.getBaseURLsFromElement(node);
    }

    /**
     * Returns the function to sort the Representations
     * @returns {function}
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
    function getCodec(adaptation, representationIndex, addResolutionInfo) {
        return dashManifestModel.getCodec(adaptation, representationIndex, addResolutionInfo);
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
     * Returns the voPeriod object for a given id
     * @param {String} id
     * @returns {object|null}
     * @memberOf module:DashAdapter
     * @instance
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
     * @memberOf module:DashAdapter
     * @instance
     */
    function getIsTypeOf(adaptation, type) {
        return dashManifestModel.getIsTypeOf(adaptation, type);
    }

    function reset() {
        voPeriods = [];
    }

    /**
     * Checks if the supplied manifest is compatible for application of the supplied patch
     * @param  {object}  manifest
     * @param  {object}  patch
     * @return {boolean}
     * @memberOf module:DashAdapter
     * @instance
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
     * @memberOf module:DashAdapter
     * @instance
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

                // short circuit for attribute selectors and text replacement
                if (operation.xpath.findsAttribute() || name === '__text') {
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
                let relativePosition = (target[name] || []).indexOf(leaf);
                let insertBefore = (operation.position === 'prepend' || operation.position === 'before');

                // perform removal operation first, we have already capture the appropriate relative position
                if (operation.action === 'remove' || operation.action === 'replace') {
                    // note that we ignore the 'ws' attribute of patch operations as it does not effect parsed mpd operations

                    // purge the directly named entity
                    if (!Array.isArray(target[name])) {
                        delete target[name];
                    } else if (relativePosition != -1) {
                        // if we did have a positional reference we need to purge from array set and restore X2JS proper semantics
                        let targetArray = target[name];
                        targetArray.splice(relativePosition, 1);
                        if (targetArray.length > 0) {
                            target[name] = targetArray;
                        } else {
                            // all nodes of this type deleted, remove entry
                            delete target[name];
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

                        let updatedNodes = target[insert] || [];
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
                                position = relativePosition + (insertBefore ? 0 : 1) + (operation.action === 'replace' ? -1 : 0);
                            } else {
                                // otherwise we are in an add append/prepend case or replace case that removed the target name completely
                                position = insertBefore ? 0 : updatedNodes.length;
                            }

                            // we dont have to perform element removal for the replace case as that was done above
                            updatedNodes.splice.apply(updatedNodes, [position, 0].concat(insertNodes));
                        }

                        // now we properly reset the element keys on the target to match parsing semantics
                        target[insert] = updatedNodes;
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

            if (!mediaInfo || !mediaInfo.streamInfo || mediaInfo.streamInfo.id === undefined || !voAdaptations) {
                return null;
            }
            return voAdaptations[mediaInfo.index];
        } catch (e) {
            return null;
        }
    }

    function getPeriodForStreamInfo(streamInfo, voPeriodsArray) {
        const ln = voPeriodsArray.length;

        for (let i = 0; i < ln; i++) {
            let voPeriod = voPeriodsArray[i];

            if (streamInfo && streamInfo.id === voPeriod.id) {
                return voPeriod;
            }
        }

        return null;
    }

    function convertAdaptationToMediaInfo(adaptation) {
        if (!adaptation) {
            return null;
        }

        let mediaInfo = new MediaInfo();
        const realAdaptation = adaptation.period.mpd.manifest.Period[adaptation.period.index].AdaptationSet[adaptation.index];

        mediaInfo.id = adaptation.id;
        mediaInfo.index = adaptation.index;
        mediaInfo.type = adaptation.type;
        mediaInfo.streamInfo = convertPeriodToStreamInfo(adaptation.period);
        mediaInfo.representationCount = dashManifestModel.getRepresentationCount(realAdaptation);
        mediaInfo.labels = dashManifestModel.getLabelsForAdaptation(realAdaptation);
        mediaInfo.lang = dashManifestModel.getLanguageForAdaptation(realAdaptation);
        mediaInfo.segmentAlignment = dashManifestModel.getSegmentAlignment(realAdaptation);
        mediaInfo.subSegmentAlignment = dashManifestModel.getSubSegmentAlignment(realAdaptation);
        mediaInfo.viewpoint = dashManifestModel.getViewpointForAdaptation(realAdaptation);
        mediaInfo.accessibility = dashManifestModel.getAccessibilityForAdaptation(realAdaptation);
        if (mediaInfo.accessibility.filter(function (accessibility) {
            if (accessibility.schemeIdUri && (accessibility.schemeIdUri.search('cea-608') >= 0) && typeof (cea608parser) !== 'undefined') {
                return true;
            }
        })[0]) {
            mediaInfo.embeddedCaptions = true;
        }
        mediaInfo.audioChannelConfiguration = dashManifestModel.getAudioChannelConfigurationForAdaptation(realAdaptation);
        if (mediaInfo.audioChannelConfiguration.length === 0 && realAdaptation.Representation && realAdaptation.Representation.length > 0) {
            mediaInfo.audioChannelConfiguration = dashManifestModel.getAudioChannelConfigurationForRepresentation(realAdaptation.Representation[0]);
        }
        mediaInfo.roles = dashManifestModel.getRolesForAdaptation(realAdaptation);
        mediaInfo.codec = dashManifestModel.getCodec(realAdaptation);
        mediaInfo.mimeType = dashManifestModel.getMimeType(realAdaptation);
        mediaInfo.contentProtection = dashManifestModel.getContentProtectionByAdaptation(realAdaptation);
        mediaInfo.bitrateList = dashManifestModel.getBitrateListForAdaptation(realAdaptation);
        mediaInfo.selectionPriority = dashManifestModel.getSelectionPriority(realAdaptation);

        if (mediaInfo.contentProtection && mediaInfo.contentProtection.length > 0) {
            mediaInfo.contentProtection = _applyContentProtectionReferencing(mediaInfo.contentProtection, adaptation.period.mpd.manifest);
            mediaInfo.contentProtection = _applyDefaultKeyId(mediaInfo.contentProtection);
            mediaInfo.normalizedKeyIds = _getNormalizedKeyIds(mediaInfo.contentProtection);
        }

        mediaInfo.isText = dashManifestModel.getIsText(realAdaptation);
        mediaInfo.essentialProperties = dashManifestModel.getEssentialPropertiesForAdaptation(realAdaptation);
        if ((!mediaInfo.essentialProperties || mediaInfo.essentialProperties.length === 0) && realAdaptation.Representation && realAdaptation.Representation.length > 0) {
            mediaInfo.essentialProperties = _getCommonRepresentationEssentialProperties(mediaInfo, realAdaptation);
        }
        mediaInfo.supplementalProperties = dashManifestModel.getSupplementalPropertiesForAdaptation(realAdaptation);
        if ((!mediaInfo.supplementalProperties || mediaInfo.supplementalProperties.length === 0) && realAdaptation.Representation && realAdaptation.Representation.length > 0) {
            mediaInfo.supplementalProperties = _getCommonRepresentationSupplementalProperties(mediaInfo, realAdaptation);
        }

        mediaInfo.isFragmented = dashManifestModel.getIsFragmented(realAdaptation);
        mediaInfo.isEmbedded = false;
        mediaInfo.adaptationSetSwitchingCompatibleIds = _getAdaptationSetSwitchingCompatibleIds(mediaInfo);

        return mediaInfo;
    }

    function _applyDefaultKeyId(contentProtection) {
        const keyIds = contentProtection.map(cp => cp.cencDefaultKid).filter(kid => kid !== null);
        if (keyIds.length) {
            const keyId = keyIds[0];
            contentProtection.forEach(cp => {
                cp.keyId = keyId;
            });
        }

        return contentProtection
    }

    function _applyContentProtectionReferencing(contentProtection, manifest) {
        if (!contentProtection || !contentProtection.length || !manifest) {
            return contentProtection
        }

        const allContentProtectionElements = dashManifestModel.getContentProtectionByManifest(manifest)
        if (!allContentProtectionElements || !allContentProtectionElements.length) {
            return contentProtection
        }

        const contentProtectionElementsByRefId = allContentProtectionElements.reduce((acc, curr) => {
            if (curr.refId) {
                acc.set(curr.refId, curr);
            }
            return acc
        }, new Map())

        return contentProtection.map((contentProtectionElement) => {
            if (contentProtectionElement.ref) {
                const contentProtectionElementSource = contentProtectionElementsByRefId.get(contentProtectionElement.ref);
                if (contentProtectionElementSource) {
                    contentProtectionElement.mergeAttributesFromReference(contentProtectionElementSource)
                }
            }
            return contentProtectionElement
        })
    }

    function _getNormalizedKeyIds(contentProtection) {
        const normalizedKeyIds = new Set();
        contentProtection.forEach((contentProtectionElement) => {
            if (contentProtectionElement.cencDefaultKid) {
                normalizedKeyIds.add(contentProtectionElement.cencDefaultKid.replace(/-/g, '').toLowerCase());
            }
        })

        return normalizedKeyIds
    }

    function _getCommonRepresentationEssentialProperties(mediaInfo, realAdaptation) {
        let arr = realAdaptation.Representation.map(repr => {
            return dashManifestModel.getEssentialPropertiesForRepresentation(repr);
        });

        if (arr.every(v => JSON.stringify(v) === JSON.stringify(arr[0]))) {
            // only output Representation.essentialProperties to mediaInfo, if they are present on all Representations
            return arr[0];
        }

        return []
    }

    function _getCommonRepresentationSupplementalProperties(mediaInfo, realAdaptation) {
        let arr = realAdaptation.Representation.map(repr => {
            return dashManifestModel.getSupplementalPropertiesForRepresentation(repr);
        });

        if (arr.every(v => JSON.stringify(v) === JSON.stringify(arr[0]))) {
            // only output Representation.supplementalProperties to mediaInfo, if they are present on all Representations
            return arr[0];
        }

        return []
    }

    function _getAdaptationSetSwitchingCompatibleIds(mediaInfo) {
        if (!mediaInfo || !mediaInfo.supplementalProperties) {
            return []
        }

        let adaptationSetSwitchingCompatibleIds = []
        const adaptationSetSwitching = mediaInfo.supplementalProperties.filter((sp) => {
            return sp.schemeIdUri === DashConstants.ADAPTATION_SET_SWITCHING_SCHEME_ID_URI
        });
        if (adaptationSetSwitching && adaptationSetSwitching.length > 0) {
            const ids = adaptationSetSwitching[0].value.toString().split(',')
            adaptationSetSwitchingCompatibleIds = ids.map((id) => {
                return id
            })
        }

        return adaptationSetSwitchingCompatibleIds
    }

    function convertVideoInfoToEmbeddedTextInfo(mediaInfo, channel, lang) {
        mediaInfo.id = channel; // CC1, CC2, CC3, or CC4
        mediaInfo.index = 100 + parseInt(channel.substring(2, 3));
        mediaInfo.type = constants.TEXT;
        mediaInfo.codec = 'cea-608-in-SEI';
        mediaInfo.isEmbedded = true;
        mediaInfo.isFragmented = false;
        mediaInfo.lang = bcp47Normalize(lang);
        mediaInfo.roles = [{ schemeIdUri: 'urn:mpeg:dash:role:2011', value: 'caption' }];
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
        streamInfo.isLast = period.mpd.manifest.Period.length === 1 || Math.abs((streamInfo.start + streamInfo.duration) - streamInfo.manifestInfo.duration) < THRESHOLD;
        streamInfo.isEncrypted = period.isEncrypted;

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
        return voPeriods.length > 0 ? voPeriods[0].mpd.manifest.Period[periodIdx] : null;
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
            adaptationSetArray = period.AdaptationSet;
            for (adaptationSetArrayIndex = 0; adaptationSetArrayIndex < adaptationSetArray.length; adaptationSetArrayIndex = adaptationSetArrayIndex + 1) {
                adaptationSet = adaptationSetArray[adaptationSetArrayIndex];
                representationArray = adaptationSet.Representation;
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

    // #endregion PRIVATE FUNCTIONS

    instance = {
        applyPatchToManifest,
        areMediaInfosEqual,
        getAllMediaInfoForType,
        getAvailabilityStartTime,
        getBandwidthForRepresentation,
        getBaseURLsFromElement,
        getCodec,
        getContentSteering,
        getDuration,
        getEssentialPropertiesForRepresentation,
        getEvent,
        getEventsFor,
        getIndexForRepresentation,
        getIsDVB,
        getIsDynamic,
        getIsPatch,
        getIsTextTrack,
        getIsTypeOf,
        getLocation,
        getMainAdaptationForType,
        getManifestUpdatePeriod,
        getMediaInfoForType,
        getMpd,
        getPatchLocation,
        getPeriodById,
        getProducerReferenceTimes,
        getPublishTime,
        getRealAdaptation,
        getRealPeriodByIndex,
        getRegularPeriods,
        getRepresentationSortFunction,
        getStreamsInfo,
        getSuggestedPresentationDelay,
        getUTCTimingSources,
        getVoRepresentations,
        isPatchValid,
        reset,
        setConfig,
        updatePeriods,
    };

    setup();
    return instance;
}

DashAdapter.__dashjs_factory_name = 'DashAdapter';
export default FactoryMaker.getSingletonFactory(DashAdapter);
