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
MediaPlayer.dependencies.MediaController = function () {

     var tracks = {},
         initialSettings,
         switchMode,

         storeLastSettings = function(type, value) {
             if (this.DOMStorage.isSupported(MediaPlayer.utils.DOMStorage.STORAGE_TYPE_LOCAL) && (type === "video" || type === "audio")) {
                 localStorage.setItem(MediaPlayer.utils.DOMStorage["LOCAL_STORAGE_"+type.toUpperCase()+"_SETTINGS_KEY"], JSON.stringify({settings: value, timestamp:new Date().getTime()}));
             }
         },

         extractSettings = function(mediaInfo) {
             return {
                 lang: mediaInfo.lang,
                 viewpoint: mediaInfo.viewpoint,
                 roles: mediaInfo.roles
             };
         },

         matchSettings = function(settings, track) {
             var matchLang = !settings.lang || (settings.lang === track.lang),
                 matchViewPoint = !settings.viewpoint || (settings.viewpoint === track.viewpoint),
                 matchRole = !settings.role || !!track.roles.filter(function(item) {
                     return item === settings.role;
                 })[0];

             return (matchLang && matchViewPoint && matchRole);
         },

         resetSwitchMode = function() {
             switchMode = {
                 audio: MediaPlayer.dependencies.MediaController.trackSwitchModes.ALWAYS_REPLACE,
                 video: MediaPlayer.dependencies.MediaController.trackSwitchModes.NEVER_REPLACE
             };
         },

         resetInitialSettings = function() {
             initialSettings = {
                 audio: null,
                 video: null
             };
         },

         createTrackInfo = function() {
             return {
                 audio: {
                     list : [],
                     storeLastSettings: true,
                     current: null
                 },
                 video: {
                     list : [],
                     storeLastSettings: true,
                     current: null
                 },
                 text: {
                     list : [],
                     storeLastSettings: true,
                     current: null
                 },
                 fragmentedText: {
                     list : [],
                     storeLastSettings: true,
                     current: null
                 }
             };
         };

    return {
        log: undefined,
        system: undefined,
        errHandler: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        DOMStorage:undefined,

        setup: function() {
            resetInitialSettings.call(this);
            resetSwitchMode.call(this);
        },

        /**
         * @param streamInfo
         * @memberof MediaController#
         */
        checkInitialMediaSettings: function(streamInfo) {
            var self = this;

            ["audio", "video", "text", "fragmentedText"].forEach(function(type){
                var settings = self.getInitialSettings(type),
                    tracksForType = self.getTracksFor(type, streamInfo),
                    isSet = false;

                if (!settings) {
                    settings = self.DOMStorage.getSavedMediaSettings(type);
                    self.setInitialSettings(type, settings);
                }

                if (!tracksForType || (tracksForType.length === 0)) return;

                if (settings) {
                    tracksForType.forEach(function(track){
                        if (!isSet && matchSettings.call(self, settings, track)) {
                            self.setTrack(track);
                            isSet = true;
                        }
                    });
                }

                if (!isSet) {
                    self.setTrack(tracksForType[0]);
                }
            });
        },

        /**
         * @param track
         * @returns {Boolean}
         * @memberof MediaController#
         */
        addTrack: function(track) {
            var mediaType = track ? track.type : null,
                streamId = track? track.streamInfo.id : null,
                initSettings = this.getInitialSettings(mediaType);

            if (!track || (!this.isMultiTrackSupportedByType(mediaType))) return false;

            tracks[streamId] = tracks[streamId] || createTrackInfo.call(this);

            if (tracks[streamId][mediaType].list.indexOf(track) >= 0) return false;

            tracks[streamId][mediaType].list.push(track);

            if (initSettings && (matchSettings.call(this, initSettings, track)) && !this.getCurrentTrackFor(mediaType, track.streamInfo)) {
                this.setTrack(track);
            }

            return true;
        },

        /**
         * @param type
         * @param streamInfo
         * @returns {Array}
         * @memberof MediaController#
         */
        getTracksFor: function(type, streamInfo) {
            if (!type || !streamInfo) return [];

            var id = streamInfo.id;

            if (!tracks[id] || !tracks[id][type]) return [];

            return tracks[id][type].list;
        },

        /**
         * @param type
         * @param streamInfo
         * @returns {Object}
         * @memberof MediaController#
         */
        getCurrentTrackFor: function(type, streamInfo) {
            if (!type || !streamInfo) return null;

            return tracks[streamInfo.id][type].current;
        },

        /**
         * @param track
         * @returns {Boolean}
         * @memberof MediaController#
         */
        isCurrentTrack: function(track) {
            var type = track.type,
                id = track.streamInfo.id;

            return (tracks[id] && tracks[id][type] && this.isTracksEqual(tracks[id][type].current, track));
        },

        /**
         * @param track
         * @memberof MediaController#
         */
        setTrack: function(track) {
            if (!track) return;

            var type = track.type,
                streamInfo = track.streamInfo,
                id = streamInfo.id,
                current = this.getCurrentTrackFor(type, streamInfo);

            if (!tracks[id] || !tracks[id][type] || (current && this.isTracksEqual(track, current))) return;

            tracks[id][type].current = track;

            if (current) {
                this.notify(MediaPlayer.dependencies.MediaController.eventList.CURRENT_TRACK_CHANGED, {oldMediaInfo: current, newMediaInfo: track, switchMode: switchMode[type]});
            }

            var settings = extractSettings.call(this, track);

            if (!settings || !tracks[id][type].storeLastSettings) return;

            if (settings.roles) {
                settings.role = settings.roles[0];
                delete settings.roles;
            }

            storeLastSettings.call(this, type, settings);
        },

        /**
         * @param type
         * @param {Object}
         * @memberof MediaController#
         */
        setInitialSettings: function(type, value) {
            if (!type || !value) return;

            initialSettings[type] = value;
        },

        /**
         * @param type
         * @returns {Object}
         * @memberof MediaController#
         */
        getInitialSettings: function(type) {
            if (!type) return null;

            return initialSettings[type];
        },

        /**
         * @param type
         * @param mode
         * @memberof MediaController#
         */
        setSwitchMode: function(type, mode) {
            var isModeSupported = !!MediaPlayer.dependencies.MediaController.trackSwitchModes[mode];

            if (!isModeSupported) {
                this.log("track switch mode is not supported: " + mode);
                return;
            }

            switchMode[type] = mode;
        },

        /**
         * @param type
         * @returns mode
         * @memberof MediaController#
         */
        getSwitchMode: function(type) {
            return switchMode[type];
        },

        /**
         * @param type
         * @returns {Boolean}
         * @memberof MediaController#
         */
        isMultiTrackSupportedByType: function (type) {
            return (type === "audio" || type === "video" || type === "text" || type === "fragmentedText");
        },

        /**
         * @param t1 first track to compare
         * @param t2 second track to compare
         * @returns {Boolean}
         * @memberof MediaController#
         */
        isTracksEqual: function(t1, t2) {
            return (t1.id === t2.id && t1.viewpoint === t2.viewpoint && t1.lang === t2.lang && t1.roles.toString() == t2.roles.toString());
        },

        /**
         * @memberof MediaController#
         */
        reset: function () {
            resetSwitchMode.call(this);
            tracks = {};
            initialSettings = {
                audio: null,
                video: null
            };
        }
    };
};

MediaPlayer.dependencies.MediaController.prototype = {
    constructor: MediaPlayer.dependencies.MediaController
};

MediaPlayer.dependencies.MediaController.eventList = {
    CURRENT_TRACK_CHANGED: "currenttrackchanged"
};

MediaPlayer.dependencies.MediaController.trackSwitchModes = {
    NEVER_REPLACE: "NEVER_REPLACE",
    ALWAYS_REPLACE: "ALWAYS_REPLACE"
};