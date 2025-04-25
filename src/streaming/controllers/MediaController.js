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
import Constants from '../constants/Constants.js';
import Events from '../../core/events/Events.js';
import EventBus from '../../core/EventBus.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import {bcp47Normalize} from 'bcp-47-normalize';
import {extendedFilter} from 'bcp-47-match';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import DashConstants from '../../dash/constants/DashConstants.js';
import getNChanFromAudioChannelConfig from '../utils/AudioChannelConfiguration.js';

function MediaController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        tracks,
        settings,
        initialSettings,
        lastSelectedTracks,
        lastSelectedRepresentations,
        customParametersModel,
        mediaPlayerModel,
        videoModel,
        domStorage;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        reset();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.domStorage) {
            domStorage = config.domStorage;
        }

        if (config.settings) {
            settings = config.settings;
        }

        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.videoModel) {
            videoModel = config.videoModel;
        }
    }

    function initialize() {
        _registerEvents();
    }

    function _registerEvents() {
        eventBus.on(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitched, instance);
    }

    function _unRegisterEvents() {
        eventBus.off(MediaPlayerEvents.REPRESENTATION_SWITCH, _onRepresentationSwitched, instance);
    }

    /**
     * Save the last selected bitrate for each media type. In case we transition to a new period and have multiple AdaptationSets that we can choose
     * from we choose the one with a bitrate closest to the current one.
     * @param e
     * @private
     */
    function _onRepresentationSwitched(e) {
        if (!e || !e.currentRepresentation || !e.currentRepresentation.mediaInfo || !e.currentRepresentation.mediaInfo.type) {
            return
        }
        const type = e.currentRepresentation.mediaInfo.type;
        lastSelectedRepresentations[type] = e.currentRepresentation;
    }

    /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @memberof MediaController#
     */
    function setInitialMediaSettingsForType(type, streamInfo) {
        let settings = lastSelectedTracks[type] || getInitialSettings(type);
        const possibleTracks = getTracksFor(type, streamInfo.id);
        let filteredTracks = [];

        if (!settings || Object.keys(settings).length === 0) {
            settings = domStorage.getSavedMediaSettings(type);
            if (settings) {
                // If the settings are defined locally, do not take codec into account or it'll be too strict.
                // eg: An audio track should not be selected by codec but merely by lang.
                delete settings.codec;
            }
            setInitialSettings(type, settings);
        }

        if (!possibleTracks || (possibleTracks.length === 0)) {
            return;
        }

        if (settings) {
            filteredTracks = Array.from(possibleTracks);
            logger.info('Filtering ' + filteredTracks.length + ' ' + type + ' tracks based on settings');

            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsId, settings)
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsLang, settings);
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsIndex, settings);
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsViewPoint, settings);
            if (!(type === Constants.AUDIO && !!lastSelectedTracks[type])) {
                filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsRole, settings);
            }
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsAccessibility, settings);
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsAudioChannelConfig, settings);
            filteredTracks = filterTracksBySettings(filteredTracks, matchSettingsCodec, settings);
            logger.info('Filtering ' + type + ' tracks ended, found ' + filteredTracks.length + ' matching track(s).');
        }

        // We did not apply any filter. We can select from all possible tracks
        if (filteredTracks.length === 0) {
            setTrack(selectInitialTrack(type, possibleTracks));
        }

        // We have some tracks based on the filtering we did.
        else {
            // More than one possibility
            if (filteredTracks.length > 1) {
                setTrack(selectInitialTrack(type, filteredTracks));
            }
            // Only one possibility use this one
            else {
                setTrack(filteredTracks[0]);
            }
        }
    }

    /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */
    function addTrack(track) {
        if (!track) {
            return;
        }

        const mediaType = track.type;
        if (!_isMultiTrackSupportedByType(mediaType)) {
            return;
        }

        let streamId = track.streamInfo.id;
        if (!tracks[streamId]) {
            tracks[streamId] = createTrackInfo();
        }

        const mediaTracks = tracks[streamId][mediaType].list;
        for (let i = 0, len = mediaTracks.length; i < len; ++i) {
            //track is already set.
            if (areTracksEqual(mediaTracks[i], track)) {
                return;
            }
        }

        mediaTracks.push(track);
    }

    /**
     * @param {string} type
     * @param {string} streamId
     * @returns {Array}
     * @memberof MediaController#
     */
    function getTracksFor(type, streamId) {
        if (!type) {
            return [];
        }

        if (!tracks[streamId] || !tracks[streamId][type]) {
            return [];
        }

        return tracks[streamId][type].list;
    }

    /**
     * @param {string} type
     * @param {string} streamId
     * @returns {Object|null}
     * @memberof MediaController#
     */
    function getCurrentTrackFor(type, streamId) {
        if (!type || !tracks[streamId] || !tracks[streamId][type]) {
            return null;
        }
        return tracks[streamId][type].current;
    }

    /**
     * @param {MediaInfo} track
     * @returns {boolean}
     * @memberof MediaController#
     */
    function isCurrentTrack(track) {
        if (!track) {
            return false;
        }
        const type = track.type;
        const id = track.streamInfo.id;

        return (tracks[id] && tracks[id][type] && areTracksEqual(tracks[id][type].current, track));
    }

    /**
     * @param {MediaInfo} track
     * @param {object} options
     * @memberof MediaController#
     */
    function setTrack(track, options = {}) {
        if (!track || !track.streamInfo) {
            return;
        }

        const type = track.type;
        const streamInfo = track.streamInfo;
        const id = streamInfo.id;
        const current = getCurrentTrackFor(type, id);

        if (!tracks[id] || !tracks[id][type]) {
            return;
        }

        tracks[id][type].current = track;

        if (tracks[id][type].current && ((type !== Constants.TEXT && !areTracksEqual(track, current)) || (type === Constants.TEXT && track.isFragmented))) {
            eventBus.trigger(Events.CURRENT_TRACK_CHANGED, {
                oldMediaInfo: current,
                newMediaInfo: track,
                switchMode: settings.get().streaming.trackSwitchMode[type],
                options
            }, { streamId: id });
        }

        if (!options.hasOwnProperty('noSettingsSave') || !options.noSettingsSave) {

            let settings = extractSettings(track);

            if (!settings || !tracks[id][type].storeLastSettings) {
                return;
            }

            if (settings.roles) {
                settings.role = settings.roles[0];
                delete settings.roles;
            }

            if (settings.accessibility) {
                settings.accessibility = settings.accessibility[0];
            }

            if (settings.audioChannelConfiguration) {
                settings.audioChannelConfiguration = settings.audioChannelConfiguration[0];
            }

            lastSelectedTracks[type] = settings;
            domStorage.setSavedMediaSettings(type, settings);
        }
    }

    /**
     * @param {string} type
     * @param {Object} value
     * @memberof MediaController#
     */
    function setInitialSettings(type, value) {
        if (!type || !value) {
            return;
        }

        initialSettings[type] = value;
    }

    /**
     * @param {string} type
     * @returns {Object|null}
     * @memberof MediaController#
     */
    function getInitialSettings(type) {
        if (!type) {
            return null;
        }

        return initialSettings[type];
    }

    /**
     * @memberof MediaController#
     */
    function saveTextSettingsDisabled() {
        domStorage.setSavedMediaSettings(Constants.TEXT, null);
    }

    /**
     * @param {string} type
     * @returns {boolean}
     * @memberof MediaController#
     */
    function _isMultiTrackSupportedByType(type) {
        return (type === Constants.AUDIO || type === Constants.VIDEO || type === Constants.TEXT || type === Constants.IMAGE);
    }

    /**
     * @param {MediaInfo} t1 - first track to compare
     * @param {MediaInfo} t2 - second track to compare
     * @returns {boolean}
     * @memberof MediaController#
     */
    function areTracksEqual(t1, t2) {
        if (!t1 && !t2) {
            return true;
        }

        if (!t1 || !t2) {
            return false;
        }

        const sameId = t1.id === t2.id;
        const sameViewpoint = JSON.stringify(t1.viewpoint) === JSON.stringify(t2.viewpoint);
        const sameLang = t1.lang === t2.lang;
        const sameCodec = t1.codec === t2.codec;
        const sameRoles = JSON.stringify(t1.roles) === JSON.stringify(t2.roles);
        const sameAccessibility = JSON.stringify(t1.accessibility) === JSON.stringify(t2.accessibility);
        const sameAudioChannelConfiguration = JSON.stringify(t1.audioChannelConfiguration) === JSON.stringify(t2.audioChannelConfiguration);

        return (sameId && sameCodec && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
    }


    /**
     * @memberof MediaController#
     */
    function reset() {
        tracks = {};
        lastSelectedTracks = {};
        lastSelectedRepresentations = {};
        resetInitialSettings();
        _unRegisterEvents();
    }

    function extractSettings(mediaInfo) {
        const settings = {
            lang: mediaInfo.lang,
            viewpoint: mediaInfo.viewpoint,
            roles: mediaInfo.roles,
            accessibility: mediaInfo.accessibility,
            audioChannelConfiguration: mediaInfo.audioChannelConfiguration,
            codec: mediaInfo.codec
        };
        let notEmpty = settings.lang || settings.viewpoint || (settings.role && settings.role.length > 0) ||
            (settings.accessibility && settings.accessibility.length > 0) || (settings.audioChannelConfiguration && settings.audioChannelConfiguration.length > 0);

        return notEmpty ? settings : null;
    }

    function filterTracksBySettings(tracks, filterFn, settings) {
        let tracksAfterMatcher = [];
        tracks.forEach(function (track) {
            if (filterFn(settings, track)) {
                tracksAfterMatcher.push(track);
            }
        });
        if (tracksAfterMatcher.length !== 0) {
            return tracksAfterMatcher;
        } else {
            logger.info('Filter-Function (' + filterFn.name + ') resulted in no tracks; setting ignored');
        }
        return tracks;
    }

    function matchSettingsLang(settings, track) {
        try {
            return !settings.lang ||
            (settings.lang instanceof RegExp) ?
                (track.lang.match(settings.lang)) : track.lang !== '' ?
                    (extendedFilter(track.lang, bcp47Normalize(settings.lang)).length > 0) : false;
        } catch (e) {
            return false
        }
    }

    function matchSettingsIndex(settings, track) {
        return (settings.index === undefined) || (settings.index === null) || (track.index === settings.index);
    }

    function matchSettingsId(settings, track) {
        return (settings.id === undefined) || (settings.id === null) || (track.id === settings.id)
    }

    function matchSettingsViewPoint(settings, track) {
        const matchViewPoint = !settings.viewpoint || !!track.viewpoint.filter(function (item) {
            return _compareDescriptorType(item, settings.viewpoint);
        })[0];
        return matchViewPoint;
    }

    function matchSettingsRole(settings, track, isTrackActive = false) {
        if ( !track.roles) {
            return false;
        }
        const matchRole = !settings.role || !!track.roles.filter(function (item) {
            return _compareDescriptorType(item, settings.role);
        })[0];
        return (matchRole || (track.type === Constants.AUDIO && isTrackActive));
    }

    function matchSettingsAccessibility(settings, track) {
        let matchAccessibility;
        if (!settings.accessibility) {
            // if no accessibility is requested (or request is empty string),
            // match only those tracks having no accessibility element present
            matchAccessibility = !track.accessibility.length;
        } else {
            matchAccessibility = !!track.accessibility.filter(function (item) {
                return _compareDescriptorType(item, settings.accessibility);
            })[0];
        }
        return matchAccessibility;
    }

    function matchSettingsAudioChannelConfig(settings, track) {
        let matchAudioChannelConfiguration = !settings.audioChannelConfiguration || !!track.audioChannelConfiguration.filter(function (item) {
            return _compareDescriptorType(item, settings.audioChannelConfiguration);
        })[0];
        return matchAudioChannelConfiguration;
    }

    function matchSettingsCodec(settings, track) {
        return !settings.codec || (settings.codec === track.codec);
    }

    function matchSettings(settings, track, isTrackActive = false) {
        try {
            let matchLang = false;

            // If there is no language defined in the target settings we got a match
            if (!settings.lang) {
                matchLang = true;
            }

            // If the target language is provided as a RegExp apply match function
            else if (settings.lang instanceof RegExp) {
                matchLang = track.lang.match(settings.lang);
            }

            // If the track has a language and we can normalize the target language check if we got a match
            else if (track.lang !== '') {
                const normalizedSettingsLang = bcp47Normalize(settings.lang);
                if (normalizedSettingsLang) {
                    matchLang = extendedFilter(track.lang, normalizedSettingsLang).length > 0
                }
            }

            const matchIndex = (settings.index === undefined) || (settings.index === null) || (track.index === settings.index);
            const matchViewPoint = !settings.viewpoint || !!track.viewpoint.filter(function (item) {
                return _compareDescriptorType(item, settings.viewpoint);
            })[0];
            const matchRole = !settings.role || !!track.roles.filter(function (item) {
                return _compareDescriptorType(item, settings.role);
            })[0];
            let matchAccessibility = !settings.accessibility || !!track.accessibility.filter(function (item) {
                return _compareDescriptorType(item, settings.accessibility);
            })[0];
            let matchAudioChannelConfiguration = !settings.audioChannelConfiguration || !!track.audioChannelConfiguration.filter(function (item) {
                return _compareDescriptorType(item, settings.audioChannelConfiguration);
            })[0];

            return (matchLang && matchIndex && matchViewPoint && (matchRole || (track.type === Constants.AUDIO && isTrackActive)) && matchAccessibility && matchAudioChannelConfiguration);
        } catch (e) {
            return false;
            logger.error(e);
        }
    }

    function resetInitialSettings() {
        initialSettings = {
            audio: null,
            video: null,
            text: null
        };
    }

    function getTracksWithHighestSelectionPriority(trackArr) {
        let max = 0;
        let result = [];

        trackArr.forEach((track) => {
            if (!isNaN(track.selectionPriority)) {
                // Higher max value. Reset list and add new entry
                if (track.selectionPriority > max) {
                    max = track.selectionPriority;
                    result = [track];
                }
                // Same max value add to list
                else if (track.selectionPriority === max) {
                    result.push(track);
                }

            }
        })

        return result;
    }

    function getTracksWithHighestBitrate(trackArr) {
        let max = 0;
        let result = [];
        let tmp;

        trackArr.forEach(function (track) {
            tmp = Math.max.apply(Math, track.bitrateList.map(function (obj) {
                return obj.bandwidth;
            }));

            if (tmp > max) {
                max = tmp;
                result = [track];
            } else if (tmp === max) {
                result.push(track);
            }
        });

        return result;
    }

    function _getVideoTracksWithHighestEfficiency(trackArr) {
        let min = Infinity;
        let result = [];
        let tmp;

        trackArr.forEach(function (track) {
            const sum = track.bitrateList.reduce(function (acc, obj) {
                const resolution = Math.max(1, obj.width * obj.height);
                const efficiency = obj.bandwidth / resolution;
                return acc + efficiency;
            }, 0);
            tmp = sum / track.bitrateList.length;

            if (tmp < min) {
                min = tmp;
                result = [track];
            } else if (tmp === min) {
                result.push(track);
            }
        });
        return result;
    }

    function _getAudioTracksWithHighestEfficiency(trackArr) {
        let min = Infinity;
        let result = [];

        // Note:
        // we ignore potential AudioChannelConfiguration descriptors assigned to different bitrates=Representations
        // since this should not happen per IOP
        trackArr.forEach(function (track) {
            const tmp = track.audioChannelConfiguration.reduce(function (acc, audioChanCfg) {
                let nChan = getNChanFromAudioChannelConfig(audioChanCfg) || 0;
                return acc + nChan;
            }, 0);
            let avgChan = tmp / track.audioChannelConfiguration.length;

            if (track.hasOwnProperty('supplementalProperties')) {
                if (track.supplementalProperties.some(
                    prop => {
                        return (prop.schemeIdUri === 'tag:dolby.com,2018:dash:EC3_ExtensionType:2018' && prop.value === 'JOC');
                    })) {
                    avgChan = 16;
                }
            }

            // avgChan may be undefined, e.g. when audioChannelConfiguration is absent
            if (!avgChan) {
                avgChan = 1;
            }

            let sumEff = track.bitrateList.reduce(function (acc, t) {
                const trackEff = t.bandwidth / avgChan;
                return acc + trackEff;
            }, 0);
            let eff = sumEff / track.bitrateList.length;

            if (eff < min) {
                min = eff;
                result = [track];
            } else if (eff === min) {
                result.push(track);
            }
        });
        return result;
    }

    function getTracksWithHighestEfficiency(trackArr) {
        if (trackArr[0] && (trackArr[0].type === Constants.VIDEO)) {
            return _getVideoTracksWithHighestEfficiency(trackArr);
        } else if (trackArr[0] && (trackArr[0].type === Constants.AUDIO)) {
            return _getAudioTracksWithHighestEfficiency(trackArr);
        }

        return trackArr;
    }

    function getTracksWithWidestRange(trackArr) {
        let max = 0;
        let result = [];
        let tmp;

        trackArr.forEach(function (track) {
            tmp = track.representationCount;

            if (tmp > max) {
                max = tmp;
                result = [track];
            } else if (tmp === max) {
                result.push(track);
            }
        });

        return result;
    }

    function selectInitialTrack(type, mediaInfos) {
        if (type === Constants.TEXT) {
            return _handleInitialTextTrackSelection(mediaInfos);
        }

        let tmpArr;
        const customInitialTrackSelectionFunction = customParametersModel.getCustomInitialTrackSelectionFunction();

        tmpArr = _initialFilterMediaInfosByAllowedSettings(mediaInfos);

        // If we have a custom function that selects the track we use this one
        if (customInitialTrackSelectionFunction && typeof customInitialTrackSelectionFunction === 'function') {
            tmpArr = customInitialTrackSelectionFunction(tmpArr);
        }

        // If we know the current selected bitrate for the media type we select the AdaptationSet that comes closest to this. This should only be relevant for multiperiod when we transition to the next period.
        else if (lastSelectedRepresentations[type]) {
            tmpArr = _trackSelectionModeClosestBitrate(tmpArr, type)
        }

        // Use the track selection function that is defined in the settings
        else {
            if (!settings.get().streaming.ignoreSelectionPriority) {
                tmpArr = _trackSelectionModeHighestSelectionPriority(tmpArr);
            }
            if (settings.get().streaming.prioritizeRoleMain) {
                tmpArr = _trackSelectionRoleMain(tmpArr);
            }
            if (tmpArr.length > 1) {
                let mode = settings.get().streaming.selectionModeForInitialTrack;
                switch (mode) {
                    case Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE:
                        tmpArr = _trackSelectionModeHighestBitrate(tmpArr);
                        break;
                    case Constants.TRACK_SELECTION_MODE_FIRST_TRACK:
                        tmpArr = _trackSelectionModeFirstTrack(tmpArr);
                        break;
                    case Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY:
                        tmpArr = _trackSelectionModeHighestEfficiency(tmpArr);
                        break;
                    case Constants.TRACK_SELECTION_MODE_WIDEST_RANGE:
                        tmpArr = _trackSelectionModeWidestRange(tmpArr);
                        break;
                    default:
                        logger.warn(`Track selection mode ${mode} is not supported. Falling back to TRACK_SELECTION_MODE_FIRST_TRACK`);
                        tmpArr = _trackSelectionModeFirstTrack(tmpArr);
                        break;
                }
            }
        }

        return tmpArr.length > 0 ? tmpArr[0] : mediaInfos[0];
    }

    function _handleInitialTextTrackSelection(mediaInfos) {
        if (!mediaInfos || mediaInfos.length === 0) {
            return null;
        }
        const filteredMediaInfos = mediaInfos.filter((mediaInfo) => {
            if (mediaInfo && mediaInfo.roles && mediaInfo.roles.length > 0) {
                return mediaInfo.roles.every((role) => {
                    return role.schemeIdUri !== Constants.DASH_ROLE_SCHEME_ID || role.value !== DashConstants.FORCED_SUBTITLE
                })
            }
            return true
        })

        if (filteredMediaInfos.length > 0) {
            return filteredMediaInfos[0];
        }

        return mediaInfos[0];
    }

    /**
     * @param {MediaInfo[]} mediaInfos
     * @return {MediaInfo[]}
     */
    function _initialFilterMediaInfosByAllowedSettings(mediaInfos) {
        try {
            let tmpArr;

            tmpArr = _filterMediaInfosByPossibleBitrate(mediaInfos);
            tmpArr = _filterMediaInfosByPortalSize(tmpArr);

            return tmpArr;
        } catch (e) {
            logger.error(e);
            return mediaInfos
        }
    }

    /**
     * Returns all MediaInfo objects that have at least one bitrate that fulfills the constraint.
     * If all fail the constraint we return the original array.
     * @param {MediaInfo[]} mediaInfos
     * @return {MediaInfo[]}
     */
    function _filterMediaInfosByPossibleBitrate(mediaInfos) {
        try {
            const filteredArray = mediaInfos.filter((mediaInfo) => {
                const type = mediaInfo.type;

                return mediaInfo.bitrateList.some((bitrateInfo) => {
                    const maxBitrate = mediaPlayerModel.getAbrBitrateParameter('maxBitrate', type);
                    const minBitrate = mediaPlayerModel.getAbrBitrateParameter('minBitrate', type);

                    if (maxBitrate > -1 && bitrateInfo.bandwidth > maxBitrate * 1000) {
                        return false;
                    }

                    return !(minBitrate > -1 && bitrateInfo.bandwidth < minBitrate * 1000);
                })

            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return mediaInfos
        } catch (e) {
            logger.error(e);
            return mediaInfos
        }
    }

    /**
     * @param {MediaInfo[]} mediaInfos
     * @return {MediaInfo[]}
     * @private
     */
    function _filterMediaInfosByPortalSize(mediaInfos) {
        try {
            if (!settings.get().streaming.abr.limitBitrateByPortal) {
                return mediaInfos;
            }

            const { elementWidth } = videoModel.getVideoElementSize();

            const filteredArray = mediaInfos.filter((mediaInfo) => {
                return mediaInfo.type !== Constants.VIDEO || mediaInfo.bitrateList.some((bitrateInfo) => {
                    return bitrateInfo.width <= elementWidth
                });
            })

            if (filteredArray.length > 0) {
                return filteredArray
            }

            return mediaInfos
        } catch (e) {
            logger.error(e);
            return mediaInfos
        }
    }

    /**
     * Find the track that has a bitrate that matches the currenly selected one
     * @param tracks
     * @param type
     * @returns {*}
     * @private
     */
    function _trackSelectionModeClosestBitrate(tracks, type) {
        if (!tracks || tracks.length === 0 || !type || !lastSelectedRepresentations[type]) {
            return tracks
        }

        const targetBitrate = lastSelectedRepresentations[type].bandwidth;
        if (!targetBitrate || isNaN(targetBitrate)) {
            return tracks;
        }

        let current = { min: NaN, track: null };
        tracks.forEach((track) => {
            track.bitrateList.forEach((entry) => {
                const diff = Math.abs(entry.bandwidth - targetBitrate);
                if (isNaN(current.min) || diff < current.min) {
                    current.min = diff;
                    current.track = track;
                }
            })
        })

        return current.track ? [current.track] : tracks
    }

    function _trackSelectionModeHighestSelectionPriority(tracks) {
        let tmpArr = getTracksWithHighestSelectionPriority(tracks);

        return tmpArr;
    }

    function _trackSelectionRoleMain(tracks) {
        const settings = {role: {schemeIdUri:'urn:mpeg:dash:role:2011', value:'main'} };
        let tmpArr = filterTracksBySettings(tracks, matchSettingsRole, settings);
        return tmpArr;
    }

    function _trackSelectionModeHighestBitrate(tracks) {
        let tmpArr = getTracksWithHighestBitrate(tracks);

        if (tmpArr.length > 1) {
            tmpArr = getTracksWithWidestRange(tmpArr);
        }

        return tmpArr;
    }

    function _trackSelectionModeFirstTrack(tracks) {
        return tracks[0];
    }

    function _trackSelectionModeHighestEfficiency(tracks) {
        let tmpArr = getTracksWithHighestEfficiency(tracks);

        if (tmpArr.length > 1) {
            tmpArr = getTracksWithHighestBitrate(tmpArr);
        }

        return tmpArr;
    }

    function _trackSelectionModeWidestRange(tracks) {
        let tmpArr = getTracksWithWidestRange(tracks);

        if (tmpArr.length > 1) {
            tmpArr = getTracksWithHighestBitrate(tracks);
        }

        return tmpArr;
    }

    function _compareDescriptorType(v1, v2) {
        if (v1 && v2) {
            let t1 = JSON.stringify({
                schemeIdUri: v1.schemeIdUri,
                value: v1.value
            })
            let t2 = JSON.stringify({
                schemeIdUri: v2.schemeIdUri,
                value: v2.value
            })
            return t1 === t2;
        }
        return false;
    }

    function createTrackInfo() {
        const storeLastSettings = settings.get().streaming.saveLastMediaSettingsForCurrentStreamingSession;

        return {
            audio: {
                list: [],
                storeLastSettings,
                current: null
            },
            video: {
                list: [],
                storeLastSettings,
                current: null
            },
            text: {
                list: [],
                storeLastSettings,
                current: null
            },
            image: {
                list: [],
                storeLastSettings,
                current: null
            }
        };
    }

    function clearDataForStream(streamId) {
        if (tracks[streamId]) {
            delete tracks[streamId];
        }
    }


    instance = {
        addTrack,
        areTracksEqual,
        clearDataForStream,
        getCurrentTrackFor,
        getInitialSettings,
        getTracksFor,
        getTracksWithHighestSelectionPriority,
        getTracksWithHighestBitrate,
        getTracksWithHighestEfficiency,
        getTracksWithWidestRange,
        initialize,
        isCurrentTrack,
        matchSettings,
        matchSettingsAccessibility,
        matchSettingsAudioChannelConfig,
        matchSettingsIndex,
        matchSettingsLang,
        matchSettingsRole,
        matchSettingsViewPoint,
        reset,
        saveTextSettingsDisabled,
        selectInitialTrack,
        setConfig,
        setInitialMediaSettingsForType,
        setInitialSettings,
        setTrack,
    };

    setup();

    return instance;
}

MediaController.__dashjs_factory_name = 'MediaController';
const factory = FactoryMaker.getSingletonFactory(MediaController);
FactoryMaker.updateSingletonFactory(MediaController.__dashjs_factory_name, factory);
export default factory;
