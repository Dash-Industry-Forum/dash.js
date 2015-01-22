/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014-2015, Cable Television Laboratories, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Cable Television Laboratories, Inc. nor the names of its
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

MediaPlayer.models.ProtectionModel_3Feb2014 = function () {

    var videoElement = null,
        mediaKeys = null,

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
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY,
                                new MediaPlayer.vo.protection.NeedKey(event.initData));
                            break;
                    }
                }
            };
        },
        eventHandler = null,

        // Function to create our session token objects which manage the EME
        // MediaKeySession and session-specific event handler
        createSessionToken = function(keySession, initData) {
            var self = this;
            return {
                prototype: (new MediaPlayer.models.SessionToken()).prototype,
                session: keySession,
                sessionID: keySession.sessionId,
                initData: initData,

                // This is our main event handler for all desired MediaKeySession events
                // These events are translated into our API-independent versions of the
                // same events
                handleEvent: function(event) {
                    switch (event.type) {

                        case api.error:
                            var errorStr = "KeyError"; // TODO: Make better string from event
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR,
                                    new MediaPlayer.vo.protection.KeyError(this, errorStr));
                            break;

                        case api.message:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                    new MediaPlayer.vo.protection.KeyMessage(this, event.message, event.destinationURL));
                            break;

                        case api.ready:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED,
                                    this);
                            break;

                        case api.close:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED,
                                    this);
                            break;
                    }
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
            api = MediaPlayer.models.ProtectionModel_3Feb2014.detect(tmpVideoElement);
        },

        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        isSupported: function(keySystem, contentType) {
            return window[api.MediaKeys].isTypeSupported(keySystem.systemString, contentType);
        },

        selectKeySystem: function(keySystem) {
            this.keySystem = keySystem;
            mediaKeys = new window[api.MediaKeys](this.keySystem.systemString);
            if (videoElement) {
                videoElement[api.setMediaKeys](mediaKeys);
            }
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler().bind(this));
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                videoElement[api.setMediaKeys](mediaKeys);
            }
        },

        createKeySession: function(initData, contentType/*, initDataType*/) {

            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not create sessions until you have selected a key system");
            }

            // TODO: Need to check for duplicate initData.  If we already have
            // a KeySession for this exact initData, we shouldn't create a new session.

            var session = mediaKeys.createSession(contentType, initData);
            var sessionToken = createSessionToken.call(this, session, initData);

            // Add all event listeners
            session.addEventListener(api.error, sessionToken);
            session.addEventListener(api.message, sessionToken);
            session.addEventListener(api.ready, sessionToken);
            session.addEventListener(api.close, sessionToken);

            // Add to our session list
            sessions.push(sessionToken);

            return sessionToken;
        },

        updateKeySession: function(sessionToken, message) {

            var session = sessionToken.session;

            if (!this.protectionExt.isClearKey(this.keySystem)) {
                // Send our request to the key session
                session.update(message);
            } else {
                // For clearkey, message is a MediaPlayer.vo.protection.ClearKeyKeySet
                session.update(message.toJWKString());
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
        }
    };
};

// Defines the supported 3Feb2014 API variations
MediaPlayer.models.ProtectionModel_3Feb2014.APIs = [
    // Un-prefixed as per spec
    // Chrome 38 (and some earlier versions) with chrome://flags -- Enable Encrypted Media Extensions
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
MediaPlayer.models.ProtectionModel_3Feb2014.detect = function(videoElement) {
    var apis = MediaPlayer.models.ProtectionModel_3Feb2014.APIs;
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

MediaPlayer.models.ProtectionModel_3Feb2014.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_3Feb2014
};

