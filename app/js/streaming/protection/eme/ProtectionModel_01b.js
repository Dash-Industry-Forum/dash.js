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

MediaPlayer.models.ProtectionModel_01b = function () {

    var videoElement = null,

        // API names object selected for this user agent
        api = null,

        // With this version of the EME APIs, sessionIDs are not assigned to
        // sessions until the first key message is received.  We are assuming
        // that in the case of multiple sessions, key messages will be received
        // in the order that generateKeyRequest() is called.

        // Holding spot for newly-created sessions until we determine whether or
        // not the CDM supports sessionIDs
        pendingSessions = [],

        // List of sessions that have been initialized.  Only the first position will
        // be used in the case that the CDM does not support sessionIDs
        sessions = [],

        // Not all CDMs support the notion of sessionIDs.  Without sessionIDs
        // there is no way for us to differentiate between sessions, therefore
        // we must only allow a single session.  Once we receive the first key
        // message we can set this flag to determine if more sessions are allowed
        moreSessionsAllowed,

        // This is our main event handler for all desired HTMLMediaElement events
        // related to EME.  These events are translated into our API-independent
        // versions of the same events
        createEventHandler = function() {
            var self = this;
            return {
                handleEvent: function(event) {
                    var sessionToken = null;
                    switch (event.type) {

                        case api.needkey:
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY,
                                new MediaPlayer.vo.protection.NeedKey(event.initData));
                            break;

                        case api.keyerror:
                            sessionToken = findSessionByID(sessions, event.sessionId);
                            if (!sessionToken) {
                                sessionToken = findSessionByID(pendingSessions, event.sessionId);
                            }

                            if (sessionToken) {
                                var msg = "";
                                switch (event.errorCode.code) {
                                    case 1:
                                        msg += "MEDIA_KEYERR_UNKNOWN - An unspecified error occurred. This value is used for errors that don't match any of the other codes.";
                                        break;
                                    case 2:
                                        msg += "MEDIA_KEYERR_CLIENT - The Key System could not be installed or updated.";
                                        break;
                                    case 3:
                                        msg += "MEDIA_KEYERR_SERVICE - The message passed into update indicated an error from the license service.";
                                        break;
                                    case 4:
                                        msg += "MEDIA_KEYERR_OUTPUT - There is no available output device with the required characteristics for the content protection system.";
                                        break;
                                    case 5:
                                        msg += "MEDIA_KEYERR_HARDWARECHANGE - A hardware configuration change caused a content protection error.";
                                        break;
                                    case 6:
                                        msg += "MEDIA_KEYERR_DOMAIN - An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.";
                                        break;
                                }
                                msg += "  System Code = " + event.systemCode;
                                // TODO: Build error string based on key error
                                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR,
                                    new MediaPlayer.vo.protection.KeyError(sessionToken, msg));
                            } else {
                                self.debug.log("No session token found for key error");
                            }
                            break;

                        case api.keyadded:
                            sessionToken = findSessionByID(sessions, event.sessionId);
                            if (!sessionToken) {
                                sessionToken = findSessionByID(pendingSessions, event.sessionId);
                            }

                            if (sessionToken) {
                                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED,
                                    sessionToken);
                            } else {
                                self.debug.log("No session token found for key added");
                            }
                            break;

                        case api.keymessage:

                            // If this CDM does not support session IDs, we will be limited
                            // to a single session
                            moreSessionsAllowed = (event.sessionId !== null) && (event.sessionId !== undefined);

                            // SessionIDs supported
                            if (moreSessionsAllowed) {

                                // Attempt to find an uninitialized token with this sessionID
                                sessionToken = findSessionByID(sessions, event.sessionId);
                                if (!sessionToken && pendingSessions.length > 0) {

                                    // This is the first message for our latest session, so set the
                                    // sessionID and add it to our list
                                    sessionToken = pendingSessions.shift();
                                    sessions.push(sessionToken);
                                    sessionToken.sessionID = event.sessionId;
                                }
                            } else { // SessionIDs not supported

                                sessionToken = pendingSessions.shift();
                                sessions.push(sessionToken);

                                if (pendingSessions.length !== 0) {
                                    self.errHandler.mediaKeyMessageError("Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!");
                                }
                            }

                            if (sessionToken) {
                                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                    new MediaPlayer.vo.protection.KeyMessage(sessionToken, event.message, event.defaultURL));
                            } else {
                                self.debug.log("No session token found for key message");
                            }
                            break;
                    }
                }
            };
        },
        eventHandler = null,

        /**
         * Helper function to retrieve the stored session token based on a given
         * sessionID value
         *
         * @param sessionArray {[]} the array of sessions to search
         * @param sessionID the sessionID to search for
         * @returns {*} the session token with the given sessionID
         */
        findSessionByID = function(sessionArray, sessionID) {

            if (!sessionID) {
                return null;
            } else {
                var len = sessions.length;
                for (var i = 0; i < len; i++) {
                    if (sessions[i].sessionID == sessionID) {
                        return sessions[i];
                    }
                }
                return null;
            }
        },

        removeEventListeners = function() {
            videoElement.removeEventListener(api.keyerror, eventHandler);
            videoElement.removeEventListener(api.needkey, eventHandler);
            videoElement.removeEventListener(api.keymessage, eventHandler);
            videoElement.removeEventListener(api.keyadded, eventHandler);
        };

    return {
        system: undefined,
        debug: undefined,
        errHandler: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        keySystem: null,

        setup: function() {
            eventHandler = createEventHandler.call(this);
        },

        /**
         * Initialize this protection model
         *
         * @param element
         */
        init: function() {
            var tmpVideoElement = document.createElement("video");
            api = MediaPlayer.models.ProtectionModel_01b.detect(tmpVideoElement);
        },

        teardown: function() {
            if (videoElement) {
                removeEventListeners();
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        isSupported: function(keySystem, contentType) {
            return (videoElement.canPlayType(contentType, keySystem.systemString) !== "");
        },

        selectKeySystem: function(keySystem) {
            this.keySystem = keySystem;
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                removeEventListeners();
            }
            videoElement = mediaElement;
            videoElement.addEventListener(api.keyerror, eventHandler);
            videoElement.addEventListener(api.needkey, eventHandler);
            videoElement.addEventListener(api.keymessage, eventHandler);
            videoElement.addEventListener(api.keyadded, eventHandler);
        },

        createKeySession: function(initData/*, contentType, initDataType*/) {

            if (!this.keySystem) {
                throw new Error("Can not create sessions until you have selected a key system");
            }

            // TODO: Need to check for duplicate initData.  If we already have
            // a KeySession for this exact initData, we shouldn't create a new session.

            // Determine if creating a new session is allowed
            if (moreSessionsAllowed || sessions.length === 0) {

                var newSession = {
                    prototype: (new MediaPlayer.models.SessionToken()).prototype,
                    sessionID: null,
                    initData: initData
                };
                pendingSessions.push(newSession);

                // Send our request to the CDM
                videoElement[api.generateKeyRequest](this.keySystem.systemString, initData);

                return newSession;
            }

            throw new Error("Multiple sessions not allowed!");
        },

        updateKeySession: function(sessionToken, message) {
            // Send our request to the CDM
            videoElement[api.addKey](this.keySystem.systemString,
                message, sessionToken.initData, sessionToken.sessionID);
        },

        closeKeySession: function(sessionToken) {
            // Send our request to the CDM
            videoElement[api.cancelKeyRequest](this.keySystem.systemString, sessionToken.sessionID);
        },

        setServerCertificate: function(/*serverCertificate*/) { /* Not supported */ }
    };
};

MediaPlayer.models.ProtectionModel_01b.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_01b
};

// Defines the supported 0.1b API variations
MediaPlayer.models.ProtectionModel_01b.APIs = [
    // Un-prefixed as per spec
    {
        // Video Element
        generateKeyRequest: "generateKeyRequest",
        addKey: "addKey",
        cancelKeyRequest: "cancelKeyRequest",

        // Events
        needkey: "needkey",
        keyerror: "keyerror",
        keyadded: "keyadded",
        keymessage: "keymessage"
    },
    // Webkit-prefixed (early Chrome versions and Chrome with EME disabled in chrome://flags)
    {
        // Video Element
        generateKeyRequest: "webkitGenerateKeyRequest",
        addKey: "webkitAddKey",
        cancelKeyRequest: "webkitCancelKeyRequest",

        // Events
        needkey: "webkitneedkey",
        keyerror: "webkitkeyerror",
        keyadded: "webkitkeyadded",
        keymessage: "webkitkeymessage"
    }
];

/**
 * Detects presence of EME v0.1b APIs
 *
 * @param videoElement {HTMLMediaElement} the media element that will be
 * used for detecting APIs
 * @returns an API object that is used when initializing the ProtectionModel
 * instance
 */
MediaPlayer.models.ProtectionModel_01b.detect = function(videoElement) {
    var apis = MediaPlayer.models.ProtectionModel_01b.APIs;
    for (var i = 0; i < apis.length; i++) {
        var api = apis[i];
        if (typeof videoElement[api.generateKeyRequest] !== 'function') {
            continue;
        }
        if (typeof videoElement[api.addKey] !== 'function') {
            continue;
        }
        if (typeof videoElement[api.cancelKeyRequest] !== 'function') {
            continue;
        }
        return api;
    }

    return null;
};


