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
import Constants from '../constants/Constants';
import Events from '../../core/events/Events';
import EventBus from '../../core/EventBus';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';

function MediaController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        tracks,
        settings,
        initialSettings,
        lastSelectedTracks,
        domStorage,
        customInitialTrackSelectionFunction;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        reset();
    }

    /**
     * @param {string} type
     * @param {StreamInfo} streamInfo
     * @memberof MediaController#
     */
    function setInitialMediaSettingsForType(type, streamInfo) {
        let settings = lastSelectedTracks[type] || getInitialSettings(type);
        const tracksForType = getTracksFor(type, streamInfo.id);
        const tracks = [];

        if (!settings) {
            settings = domStorage.getSavedMediaSettings(type);
            setInitialSettings(type, settings);
        }

        if (!tracksForType || (tracksForType.length === 0)) return;

        if (settings) {
            tracksForType.forEach(function (track) {
                if (matchSettings(settings, track, !!lastSelectedTracks[type])) {
                    tracks.push(track);
                }
            });
        }

        if (tracks.length === 0) {
            setTrack(selectInitialTrack(type, tracksForType), true);
        } else {
            if (tracks.length > 1) {
                setTrack(selectInitialTrack(type, tracks, !!lastSelectedTracks[type]));
            } else {
                setTrack(tracks[0]);
            }
        }
    }

    /**
     * @param {MediaInfo} track
     * @memberof MediaController#
     */
    function addTrack(track) {
        if (!track) return;

        const mediaType = track.type;
        if (!_isMultiTrackSupportedByType(mediaType)) return;

        let streamId = track.streamInfo.id;
        if (!tracks[streamId]) {
            tracks[streamId] = createTrackInfo();
        }

        const mediaTracks = tracks[streamId][mediaType].list;
        for (let i = 0, len = mediaTracks.length; i < len; ++i) {
            //track is already set.
            if (isTracksEqual(mediaTracks[i], track)) {
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
        if (!type) return [];

        if (!tracks[streamId] || !tracks[streamId][type]) return [];

        return tracks[streamId][type].list;
    }

    /**
     * @param {string} type
     * @param {string} streamId
     * @returns {Object|null}
     * @memberof MediaController#
     */
    function getCurrentTrackFor(type, streamId) {
        if (!type || !tracks[streamId] || !tracks[streamId][type]) return null;
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

        return (tracks[id] && tracks[id][type] && isTracksEqual(tracks[id][type].current, track));
    }

    /**
     * @param {MediaInfo} track
     * @param {boolean} noSettingsSave specify if settings must be not be saved
     * @memberof MediaController#
     */
    function setTrack(track, noSettingsSave = false) {
        if (!track || !track.streamInfo) return;

        const type = track.type;
        const streamInfo = track.streamInfo;
        const id = streamInfo.id;
        const current = getCurrentTrackFor(type, id);

        if (!tracks[id] || !tracks[id][type] || isTracksEqual(track, current)) return;

        tracks[id][type].current = track;

        if (tracks[id][type].current && (type !== Constants.TEXT || (type === Constants.TEXT && track.isFragmented))) {
            eventBus.trigger(Events.CURRENT_TRACK_CHANGED, {
                oldMediaInfo: current,
                newMediaInfo: track,
                switchMode: settings.get().streaming.trackSwitchMode[type]
            }, { streamId: id });
        }

        if (!noSettingsSave) {

            let settings = extractSettings(track);

            if (!settings || !tracks[id][type].storeLastSettings) return;

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
        if (!type || !value) return;

        initialSettings[type] = value;
    }

    /**
     * @param {string} type
     * @returns {Object|null}
     * @memberof MediaController#
     */
    function getInitialSettings(type) {
        if (!type) return null;

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
    function isTracksEqual(t1, t2) {
        if (!t1 && !t2) {
            return true;
        }

        if (!t1 || !t2) {
            return false;
        }

        const sameId = t1.id === t2.id;
        const sameViewpoint = t1.viewpoint === t2.viewpoint;
        const sameLang = t1.lang === t2.lang;
        const sameCodec = t1.codec === t2.codec;
        const sameRoles = t1.roles.toString() === t2.roles.toString();
        const sameAccessibility = t1.accessibility.toString() === t2.accessibility.toString();
        const sameAudioChannelConfiguration = t1.audioChannelConfiguration.toString() === t2.audioChannelConfiguration.toString();

        return (sameId && sameCodec && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.domStorage) {
            domStorage = config.domStorage;
        }

        if (config.settings) {
            settings = config.settings;
        }
    }

    /**
     * @memberof MediaController#
     */
    function reset() {
        tracks = {};
        lastSelectedTracks = {};
        customInitialTrackSelectionFunction = null;
        resetInitialSettings();
    }

    function extractSettings(mediaInfo) {
        const settings = {
            lang: mediaInfo.lang,
            viewpoint: mediaInfo.viewpoint,
            roles: mediaInfo.roles,
            accessibility: mediaInfo.accessibility,
            audioChannelConfiguration: mediaInfo.audioChannelConfiguration
        };
        let notEmpty = settings.lang || settings.viewpoint || (settings.role && settings.role.length > 0) ||
            (settings.accessibility && settings.accessibility.length > 0) || (settings.audioChannelConfiguration && settings.audioChannelConfiguration.length > 0);

        return notEmpty ? settings : null;
    }

    function matchSettings(settings, track, isTrackActive = false) {
        const matchLang = !settings.lang || (track.lang.match(settings.lang));
        const matchIndex = (settings.index === undefined) || (settings.index === null) || (track.index === settings.index);
        const matchViewPoint = !settings.viewpoint || (settings.viewpoint === track.viewpoint);
        const matchRole = !settings.role || !!track.roles.filter(function (item) {
            return item === settings.role;
        })[0];
        let matchAccessibility = !settings.accessibility || !!track.accessibility.filter(function (item) {
            return item === settings.accessibility;
        })[0];
        let matchAudioChannelConfiguration = !settings.audioChannelConfiguration || !!track.audioChannelConfiguration.filter(function (item) {
            return item === settings.audioChannelConfiguration;
        })[0];


        return (matchLang && matchIndex && matchViewPoint && (matchRole || (track.type === Constants.AUDIO && isTrackActive)) && matchAccessibility && matchAudioChannelConfiguration);
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
            if(!isNaN(track.selectionPriority)) {
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

    function getTracksWithHighestEfficiency(trackArr) {
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

    function setCustomInitialTrackSelectionFunction(customFunc) {
        customInitialTrackSelectionFunction = customFunc;
    }

    function selectInitialTrack(type, tracks) {
        if (type === Constants.TEXT) return tracks[0];

        let mode = settings.get().streaming.selectionModeForInitialTrack;
        let tmpArr;

        if (customInitialTrackSelectionFunction && typeof customInitialTrackSelectionFunction === 'function') {
            tmpArr = customInitialTrackSelectionFunction(tracks);
        } else {
            switch (mode) {
                case Constants.TRACK_SELECTION_MODE_HIGHEST_SELECTION_PRIORITY:
                    tmpArr = _trackSelectionModeHighestSelectionPriority(tracks);
                    break;
                case Constants.TRACK_SELECTION_MODE_HIGHEST_BITRATE:
                    tmpArr = _trackSelectionModeHighestBitrate(tracks);
                    break;
                case Constants.TRACK_SELECTION_MODE_FIRST_TRACK:
                    tmpArr = _trackSelectionModeFirstTrack(tracks);
                    break;
                case Constants.TRACK_SELECTION_MODE_HIGHEST_EFFICIENCY:
                    tmpArr = _trackSelectionModeHighestEfficiency(tracks);
                    break;
                case Constants.TRACK_SELECTION_MODE_WIDEST_RANGE:
                    tmpArr = _trackSelectionModeWidestRange(tracks);
                    break;
                default:
                    logger.warn(`Track selection mode ${mode} is not supported. Falling back to TRACK_SELECTION_MODE_FIRST_TRACK`);
                    tmpArr = _trackSelectionModeFirstTrack(tracks);
                    break;
            }
        }

        return tmpArr.length > 0 ? tmpArr[0] : tracks[0];
    }


    function _trackSelectionModeHighestSelectionPriority(tracks) {
        let tmpArr = getTracksWithHighestSelectionPriority(tracks);

        if (tmpArr.length > 1) {
            tmpArr = getTracksWithHighestBitrate(tmpArr);
        }

        if (tmpArr.length > 1) {
            tmpArr = getTracksWithWidestRange(tmpArr);
        }

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


    function createTrackInfo() {
        return {
            audio: {
                list: [],
                storeLastSettings: true,
                current: null
            },
            video: {
                list: [],
                storeLastSettings: true,
                current: null
            },
            text: {
                list: [],
                storeLastSettings: true,
                current: null
            },
            image: {
                list: [],
                storeLastSettings: true,
                current: null
            }
        };
    }

    instance = {
        setInitialMediaSettingsForType,
        addTrack,
        getTracksFor,
        getCurrentTrackFor,
        isCurrentTrack,
        setTrack,
        selectInitialTrack,
        setCustomInitialTrackSelectionFunction,
        setInitialSettings,
        getInitialSettings,
        getTracksWithHighestBitrate,
        getTracksWithHighestEfficiency,
        getTracksWithWidestRange,
        isTracksEqual,
        matchSettings,
        saveTextSettingsDisabled,
        setConfig,
        reset
    };

    setup();

    return instance;
}

MediaController.__dashjs_factory_name = 'MediaController';
const factory = FactoryMaker.getSingletonFactory(MediaController);
FactoryMaker.updateSingletonFactory(MediaController.__dashjs_factory_name, factory);
export default factory;
