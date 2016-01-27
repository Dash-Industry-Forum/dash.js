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
import Events from '../../core/events/Events.js';
import EventBus from '../../core/EventBus.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import TextSourceBuffer from '../TextSourceBuffer.js';
import DOMStorage from '../utils/DOMStorage.js';

const TRACK_SWITCH_MODE_NEVER_REPLACE = 'neverReplace';
const TRACK_SWITCH_MODE_ALWAYS_REPLACE = 'alwaysReplace';
const TRACK_SELECTION_MODE_HIGHEST_BITRATE = 'highestBitrate';
const TRACK_SELECTION_MODE_WIDEST_RANGE = 'widestRange';
const DEFAULT_INIT_TRACK_SELECTION_MODE = TRACK_SELECTION_MODE_HIGHEST_BITRATE;

function MediaController() {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();
    let textSourceBuffer = TextSourceBuffer(context).getInstance();
    let domStorage = DOMStorage(context).getInstance();

    let instance,
        tracks,
        initialSettings,
        selectionMode,
        switchMode,
        errHandler;

    function initialize() {
        tracks = {};
        resetInitialSettings();
        resetSwitchMode();
    }

    /**
     * @param streamInfo
     * @memberof MediaController#
     */
    function checkInitialMediaSettings(streamInfo) {

        ['audio', 'video', 'text', 'fragmentedText'].forEach(function (type) {
            var settings = getInitialSettings(type);
            var tracksForType = getTracksFor(type, streamInfo);
            var tracks = [];

            if (!settings) {
                settings = domStorage.getSavedMediaSettings(type);
                setInitialSettings(type, settings);
            }

            if (!tracksForType || (tracksForType.length === 0)) return;

            if (settings) {
                tracksForType.forEach(function (track) {
                    if (!matchSettings(settings, track)) {
                        tracks.push(track);
                    }
                });
            }

            if (tracks.length === 0) {
                setTrack(selectInitialTrack(tracksForType));
            } else {
                if (tracks.length > 1) {
                    setTrack(selectInitialTrack(tracks));
                } else {
                    setTrack(tracks[0]);
                }
            }
        });
    }

    /**
     * @param track
     * @returns {Boolean}
     * @memberof MediaController#
     */
    function addTrack(track) {
        var mediaType = track ? track.type : null;
        var streamId = track ? track.streamInfo.id : null;
        var initSettings = getInitialSettings(mediaType);

        if (!track || (!isMultiTrackSupportedByType(mediaType))) return false;

        tracks[streamId] = tracks[streamId] || createTrackInfo();

        if (tracks[streamId][mediaType].list.indexOf(track) >= 0) return false;

        tracks[streamId][mediaType].list.push(track);

        if (initSettings && (matchSettings(initSettings, track)) && !getCurrentTrackFor(mediaType, track.streamInfo)) {
            setTrack(track);
        }

        return true;
    }

    /**
     * @param type
     * @param streamInfo
     * @returns {Array}
     * @memberof MediaController#
     */
    function getTracksFor(type, streamInfo) {
        if (!type || !streamInfo) return [];

        var id = streamInfo.id;

        if (!tracks[id] || !tracks[id][type]) return [];

        return tracks[id][type].list;
    }

    /**
     * @param type
     * @param streamInfo
     * @returns {Object}
     * @memberof MediaController#
     */
    function getCurrentTrackFor(type, streamInfo) {
        if (!type || !streamInfo) return null;

        return tracks[streamInfo.id][type].current;
    }

    /**
     * @param track
     * @returns {Boolean}
     * @memberof MediaController#
     */
    function isCurrentTrack(track) {
        var type = track.type;
        var id = track.streamInfo.id;

        return (tracks[id] && tracks[id][type] && isTracksEqual(tracks[id][type].current, track));
    }

    /**
     * @param track
     * @memberof MediaController#
     */
    function setTrack(track) {
        if (!track) return;

        var type = track.type;
        var streamInfo = track.streamInfo;
        var id = streamInfo.id;
        var current = getCurrentTrackFor(type, streamInfo);

        if (!tracks[id] || !tracks[id][type] || (current && isTracksEqual(track, current))) return;

        tracks[id][type].current = track;

        if (current) {
            eventBus.trigger(Events.CURRENT_TRACK_CHANGED, {oldMediaInfo: current, newMediaInfo: track, switchMode: switchMode[type]});
        }

        var settings = extractSettings(track);

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

        storeLastSettings(type, settings);
    }

    /**
     * @param type
     * @param {Object}
     * @memberof MediaController#
     */
    function setInitialSettings(type, value) {
        if (!type || !value) return;

        initialSettings[type] = value;
    }

    /**
     * @param type
     * @returns {Object}
     * @memberof MediaController#
     */
    function getInitialSettings(type) {
        if (!type) return null;

        return initialSettings[type];
    }

    /**
     * @param type
     * @param mode
     * @memberof MediaController#
     */
    function setSwitchMode(type, mode) {
        var isModeSupported = !!MediaController[mode];

        if (!isModeSupported) {
            log('track switch mode is not supported: ' + mode);
            return;
        }

        switchMode[type] = mode;
    }

    /**
     * @param type
     * @returns mode
     * @memberof MediaController#
     */
    function getSwitchMode(type) {
        return switchMode[type];
    }

    /**
     * @param mode
     * @memberof MediaController#
     */
    function setSelectionModeForInitialTrack(mode) {
        var isModeSupported = !!MediaController.trackSelectionModes[mode];

        if (!isModeSupported) {
            log('track selection mode is not supported: ' + mode);
            return;
        }
        selectionMode = mode;
    }

    /**
     * @returns mode
     * @memberof MediaController#
     */
    function getSelectionModeForInitialTrack() {
        return selectionMode || DEFAULT_INIT_TRACK_SELECTION_MODE;
    }

    /**
     * @param type
     * @returns {Boolean}
     * @memberof MediaController#
     */
    function isMultiTrackSupportedByType(type) {
        return (type === 'audio' || type === 'video' || type === 'text' || type === 'fragmentedText');
    }

    /**
     * @param t1 first track to compare
     * @param t2 second track to compare
     * @returns {Boolean}
     * @memberof MediaController#
     */
    function isTracksEqual(t1, t2) {
        var sameId = t1.id === t2.id;
        var sameViewpoint = t1.viewpoint === t2.viewpoint;
        var sameLang = t1.lang === t2.lang;
        var sameRoles = t1.roles.toString() == t2.roles.toString();
        var sameAccessibility = t1.accessibility.toString() == t2.accessibility.toString();
        var sameAudioChannelConfiguration = t1.audioChannelConfiguration.toString() == t2.audioChannelConfiguration.toString();

        return (sameId && sameViewpoint && sameLang && sameRoles && sameAccessibility && sameAudioChannelConfiguration);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.errHandler) {
            errHandler = config.errHandler;
        }
    }

    /**
     * @memberof MediaController#
     */
    function reset() {
        initialize();
        textSourceBuffer.resetEmbedded();
    }

    function storeLastSettings(type, value) {
        if (domStorage.isSupported(DOMStorage.STORAGE_TYPE_LOCAL) && (type === 'video' || type === 'audio')) {
            localStorage.setItem(DOMStorage['LOCAL_STORAGE_' + type.toUpperCase() + '_SETTINGS_KEY'], JSON.stringify({settings: value, timestamp: new Date().getTime()}));
        }
    }

    function extractSettings(mediaInfo) {
        var settings = {
            lang: mediaInfo.lang,
            viewpoint: mediaInfo.viewpoint,
            roles: mediaInfo.roles,
            accessibility: mediaInfo.accessibility,
            audioChannelConfiguration: mediaInfo.audioChannelConfiguration
        };
        var notEmpty = settings.lang || settings.viewpoint || (settings.role && settings.role.length > 0) ||
        (settings.accessibility && settings.accessibility.length > 0) || (settings.audioChannelConfiguration && settings.audioChannelConfiguration.length > 0);

        return notEmpty ? settings : null;
    }

    function matchSettings(settings, track) {
        var matchLang = !settings.lang || (settings.lang === track.lang);
        var matchViewPoint = !settings.viewpoint || (settings.viewpoint === track.viewpoint);
        var matchRole = !settings.role || !!track.roles.filter(function (item) {
            return item === settings.role;
        })[0];
        var matchAccessibility = !settings.accessibility || !!track.accessibility.filter(function (item) {
            return item === settings.accessibility;
        })[0];
        var matchAudioChannelConfiguration = !settings.audioChannelConfiguration || !!track.audioChannelConfiguration.filter(function (item) {
            return item === settings.audioChannelConfiguration;
        })[0];

        return (matchLang && matchViewPoint && matchRole && matchAccessibility && matchAudioChannelConfiguration);
    }

    function resetSwitchMode() {
        switchMode = {
            audio: TRACK_SWITCH_MODE_ALWAYS_REPLACE,
            video: TRACK_SWITCH_MODE_NEVER_REPLACE
        };
    }

    function resetInitialSettings() {
        initialSettings = {
            audio: null,
            video: null
        };
    }

    function selectInitialTrack(tracks) {
        var mode = getSelectionModeForInitialTrack();
        var tmpArr = [];
        var getTracksWithHighestBitrate = function (trackArr) {
            var max = 0;
            var result = [];
            var tmp;

            trackArr.forEach(function (track) {
                tmp = Math.max.apply(Math, track.bitrateList);

                if (tmp > max) {
                    max = tmp;
                    result = [track];
                } else if (tmp === max) {
                    result.push(track);
                }
            });

            return result;
        };
        var getTracksWithWidestRange = function (trackArr) {
            var max = 0;
            var result = [];
            var tmp;

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
        };

        switch (mode) {
            case TRACK_SELECTION_MODE_HIGHEST_BITRATE:
                tmpArr = getTracksWithHighestBitrate(tracks);

                if (tmpArr.length > 1) {
                    tmpArr = getTracksWithWidestRange(tmpArr);
                }
                break;
            case TRACK_SELECTION_MODE_WIDEST_RANGE:
                tmpArr = getTracksWithWidestRange(tracks);

                if (tmpArr.length > 1) {
                    tmpArr = getTracksWithHighestBitrate(tracks);
                }
                break;
            default:
                log('track selection mode is not supported: ' + mode);
                break;
        }

        return tmpArr[0];
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
            fragmentedText: {
                list: [],
                storeLastSettings: true,
                current: null
            }
        };
    }

    instance = {
        initialize: initialize,
        checkInitialMediaSettings: checkInitialMediaSettings,
        addTrack: addTrack,
        getTracksFor: getTracksFor,
        getCurrentTrackFor: getCurrentTrackFor,
        isCurrentTrack: isCurrentTrack,
        setTrack: setTrack,
        setInitialSettings: setInitialSettings,
        getInitialSettings: getInitialSettings,
        setSwitchMode: setSwitchMode,
        getSwitchMode: getSwitchMode,
        setSelectionModeForInitialTrack: setSelectionModeForInitialTrack,
        getSelectionModeForInitialTrack: getSelectionModeForInitialTrack,
        isMultiTrackSupportedByType: isMultiTrackSupportedByType,
        isTracksEqual: isTracksEqual,
        setConfig: setConfig,
        reset: reset
    };

    return instance;
}

MediaController.__dashjs_factory_name = 'MediaController';
let factory = FactoryMaker.getSingletonFactory(MediaController);
factory.TRACK_SWITCH_MODE_NEVER_REPLACE = TRACK_SWITCH_MODE_NEVER_REPLACE;
factory.TRACK_SWITCH_MODE_ALWAYS_REPLACE = TRACK_SWITCH_MODE_ALWAYS_REPLACE;
factory.TRACK_SELECTION_MODE_HIGHEST_BITRATE = TRACK_SELECTION_MODE_HIGHEST_BITRATE;
factory.TRACK_SELECTION_MODE_WIDEST_RANGE = TRACK_SELECTION_MODE_WIDEST_RANGE;
factory.DEFAULT_INIT_TRACK_SELECTION_MODE = DEFAULT_INIT_TRACK_SELECTION_MODE;
export default factory;
