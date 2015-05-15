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

import ProtectionModel from './ProtectionModel.js';
import NeedKey from '../vo/protection/NeedKey.js';
import KeyError from '../vo/protection/KeyError.js';
import KeyMessage from '../vo/protection/KeyMessage.js';
import KeySystemConfiguration from '../vo/protection/KeySystemConfiguration.js';
import KeySystemAccess from '../vo/protection/KeySystemAccess.js';
import SessionToken from '../vo/protection/SessionToken.js';

let ProtectionModel_3Feb2014 = function () {

    var videoElement = null,
        mediaKeys = null,
        keySystemAccess = null,

        // API names object selected for this user agent
        api = null,

        // Session list
        sessions = [],

        // This is our main event handler for all desired HTMLMediaElement events
        // related to EME.  These events are translated into our API-independent
        // versions of the same events
        createEventHandler = function() {
            var self = this;
            return {
                handleEvent: function(event) {
                    switch (event.type) {

                        case api.needkey:
                            self.notify(ProtectionModel.eventList.ENAME_NEED_KEY,
                                new NeedKey(event.initData, "cenc"));
                            break;
                    }
                }
            };
        },
        eventHandler = null,

        // IE11 does not let you set MediaKeys until it has entered a certain
        // readyState, so we need this logic to ensure we don't set the keys
        // too early
        setMediaKeys = function() {
            // IE11 does not allow setting of media keys until
            var doSetKeys = function() {
                videoElement[api.setMediaKeys](mediaKeys);
                this.notify(ProtectionModel.eventList.ENAME_VIDEO_ELEMENT_SELECTED);
            };
            if (videoElement.readyState >= 1) {
                doSetKeys.call(this);
            } else {
                videoElement.addEventListener("loadedmetadata", doSetKeys.bind(this));
            }

        },

        // Function to create our session token objects which manage the EME
        // MediaKeySession and session-specific event handler
        createSessionToken = function(keySession, initData) {
            var self = this;
            return {
                prototype: (new SessionToken()).prototype,
                session: keySession,
                initData: initData,

                // This is our main event handler for all desired MediaKeySession events
                // These events are translated into our API-independent versions of the
                // same events
                handleEvent: function(event) {
                    switch (event.type) {

                        case api.error:
                            var errorStr = "KeyError"; // TODO: Make better string from event
                            self.notify(ProtectionModel.eventList.ENAME_KEY_ERROR,
                                    new KeyError(this, errorStr));
                            break;

                        case api.message:
                            self.notify(ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                    new KeyMessage(this, event.message, event.destinationURL));
                            break;

                        case api.ready:
                            self.notify(ProtectionModel.eventList.ENAME_KEY_ADDED,
                                    this);
                            break;

                        case api.close:
                            self.notify(ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED,
                                    this.getSessionID());
                            break;
                    }
                },

                getSessionID: function() {
                    return this.session.sessionId;
                }
            };
        };

    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: null,

        setup: function() {
            eventHandler = createEventHandler.call(this);
        },

        /**
         * Initialize this protection model
         */
        init: function() {
            var tmpVideoElement = document.createElement("video");
            api = ProtectionModel_3Feb2014.detect(tmpVideoElement);
        },

        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        requestKeySystemAccess: function(ksConfigurations) {

            // Try key systems in order, first one with supported key system configuration
            // is used
            var found = false;
            for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
                var systemString = ksConfigurations[ksIdx].ks.systemString;
                var configs = ksConfigurations[ksIdx].configs;
                var supportedAudio = null;
                var supportedVideo = null;

                // Try key system configs in order, first one with supported audio/video
                // is used
                for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                    var audios = configs[configIdx].audioCapabilities;
                    var videos = configs[configIdx].videoCapabilities;

                    // Look for supported audio container/codecs
                    if (audios && audios.length !== 0) {
                        supportedAudio = []; // Indicates that we have a requested audio config
                        for (var audioIdx = 0; audioIdx < audios.length; audioIdx++) {
                            if (window[api.MediaKeys].isTypeSupported(systemString, audios[audioIdx].contentType)) {
                                supportedAudio.push(audios[audioIdx]);
                            }
                        }
                    }

                    // Look for supported video container/codecs
                    if (videos && videos.length !== 0) {
                        supportedVideo = []; // Indicates that we have a requested video config
                        for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                            if (window[api.MediaKeys].isTypeSupported(systemString, videos[videoIdx].contentType)) {
                                supportedVideo.push(videos[videoIdx]);
                            }
                        }
                    }

                    // No supported audio or video in this configuration OR we have
                    // requested audio or video configuration that is not supported
                    if ((!supportedAudio && !supportedVideo) ||
                            (supportedAudio && supportedAudio.length === 0) ||
                            (supportedVideo && supportedVideo.length === 0)) {
                        continue;
                    }

                    // This configuration is supported
                    found = true;
                    var ksConfig = new KeySystemConfiguration(supportedAudio, supportedVideo);
                    var ks = this.protectionExt.getKeySystemBySystemString(systemString);
                    var ksAccess = new KeySystemAccess(ks, ksConfig);
                    this.notify(ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE,
                            ksAccess);
                    break;
                }
            }
            if (!found) {
                this.notify(ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE,
                        null, "Key system access denied! -- No valid audio/video content configurations detected!");
            }
        },

        selectKeySystem: function(ksAccess) {
            try {
                mediaKeys = ksAccess.mediaKeys = new window[api.MediaKeys](ksAccess.keySystem.systemString);
                this.keySystem = ksAccess.keySystem;
                keySystemAccess = ksAccess;
                if (videoElement) {
                    setMediaKeys.call(this);
                }
                this.notify(ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED);

            } catch (error) {
                this.notify(ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED,
                        null, "Error selecting keys system (" + this.keySystem.systemString + ")! Could not create MediaKeys -- TODO");
            }
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                setMediaKeys.call(this);
            }
        },

        createKeySession: function(initData /*, keySystemType */) {

            if (!this.keySystem || !mediaKeys || !keySystemAccess) {
                throw new Error("Can not create sessions until you have selected a key system");
            }

            // Check for duplicate initData.
            for (var i = 0; i < sessions.length; i++) {
                if (this.protectionExt.initDataEquals(initData, sessions[i].initData)) {
                    return;
                }
            }

            // Use the first video capability for the contentType.
            // TODO:  Not sure if there is a way to concatenate all capability data into a RFC6386-compatible format
            var contentType = keySystemAccess.ksConfiguration.videoCapabilities[0].contentType;
            var session = mediaKeys.createSession(contentType, new Uint8Array(initData));
            var sessionToken = createSessionToken.call(this, session, initData);

            // Add all event listeners
            session.addEventListener(api.error, sessionToken);
            session.addEventListener(api.message, sessionToken);
            session.addEventListener(api.ready, sessionToken);
            session.addEventListener(api.close, sessionToken);

            // Add to our session list
            sessions.push(sessionToken);

            this.notify(ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, sessionToken);
        },

        updateKeySession: function(sessionToken, message) {

            var session = sessionToken.session;

            if (!this.protectionExt.isClearKey(this.keySystem)) {
                // Send our request to the key session
                session.update(message);
            } else {
                // For clearkey, message is a MediaPlayer.vo.protection.ClearKeyKeySet
                session.update(new Uint8Array(message.toJWK()));
            }
        },

        /**
         * Close the given session and release all associated keys.  Following
         * this call, the sessionToken becomes invalid
         *
         * @param sessionToken the session token
         */
        closeKeySession: function(sessionToken) {

            var session = sessionToken.session;

            // Remove event listeners
            session.removeEventListener(api.error, sessionToken);
            session.removeEventListener(api.message, sessionToken);
            session.removeEventListener(api.ready, sessionToken);
            session.removeEventListener(api.close, sessionToken);

            // Remove from our session list
            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] === sessionToken) {
                    sessions.splice(i,1);
                    break;
                }
            }

            // Send our request to the key session
            session[api.release]();
        },

        setServerCertificate: function(/*serverCertificate*/) { /* Not supported */ },

        loadKeySession: function(/*sessionID*/) { /* Not supported */ },

        removeKeySession: function(/*sessionToken*/) { /* Not supported */ }
    };
};

// Defines the supported 3Feb2014 API variations
ProtectionModel_3Feb2014.APIs = [
    // Un-prefixed as per spec
    // Chrome 38-39 (and some earlier versions) with chrome://flags -- Enable Encrypted Media Extensions
    {
        // Video Element
        setMediaKeys: "setMediaKeys",

        // MediaKeys
        MediaKeys: "MediaKeys",

        // MediaKeySession
        release: "close",

        // Events
        needkey: "needkey",
        error: "keyerror",
        message: "keymessage",
        ready: "keyadded",
        close: "keyclose"
    },
    // MS-prefixed (IE11, Windows 8.1)
    {
        // Video Element
        setMediaKeys: "msSetMediaKeys",

        // MediaKeys
        MediaKeys: "MSMediaKeys",

        // MediaKeySession
        release: "close",

        // Events
        needkey: "msneedkey",
        error: "mskeyerror",
        message: "mskeymessage",
        ready: "mskeyadded",
        close: "mskeyclose"
    }
];

/**
 * Detects presence of EME v3Feb2014 APIs
 *
 * @param videoElement {HTMLMediaElement} the media element that will be
 * used for detecting APIs
 * @returns an API object that is used when initializing the ProtectionModel
 * instance
 */
ProtectionModel_3Feb2014.detect = function(videoElement) {
    var apis = ProtectionModel_3Feb2014.APIs;
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        if (typeof videoElement[api.setMediaKeys] !== 'function') {
            continue;
        }
        if (typeof window[api.MediaKeys] !== 'function')  {
            continue;
        }
        return api;
    }

    return null;
};

ProtectionModel_3Feb2014.prototype = {
    constructor: ProtectionModel_3Feb2014
};

export default ProtectionModel_3Feb2014;
