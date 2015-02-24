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

/**
 * Implemented in:
 *   Chrome 40 with chrome://flags -- Enable Encrypted Media Extensions
 */
MediaPlayer.models.ProtectionModel_21Jan2015 = function () {

    var videoElement = null,
        mediaKeys = null,

        // Session list
        sessions = [],

        requestKeySystemAccessInternal = function(ksConfigurations, idx) {
            var self = this;
            (function(i) {
                var keySystem = ksConfigurations[i].ks;
                var configs = ksConfigurations[i].configs;
                navigator.requestMediaKeySystemAccess(keySystem.systemString, configs).then(function(mediaKeySystemAccess) {

                    // Chrome 40 does not currently implement MediaKeySystemAccess.getConfiguration()
                    var configuration = (typeof mediaKeySystemAccess.getConfiguration === 'function') ?
                            mediaKeySystemAccess.getConfiguration() : null;
                    var keySystemAccess = new MediaPlayer.vo.protection.KeySystemAccess(keySystem, configuration);
                    keySystemAccess.mksa = mediaKeySystemAccess;
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE,
                            keySystemAccess);
                }).catch(function() {
                    if (++i < ksConfigurations.length) {
                        requestKeySystemAccessInternal(ksConfigurations, i);
                    } else {
                        self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE,
                                null, "Key system access denied!");
                    }
                });
            })(idx);
        },

        // This is our main event handler for all desired HTMLMediaElement events
        // related to EME.  These events are translated into our API-independent
        // versions of the same events
        createEventHandler = function() {
            var self = this;
            return {
                handleEvent: function(event) {
                    switch (event.type) {

                        case "encrypted":
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY,
                                new MediaPlayer.vo.protection.NeedKey(event.initData, event.initDataType));
                            break;
                    }
                }
            };
        },
        eventHandler = null,

        removeSession = function(token) {
            // Remove from our session list
            for (var i = 0; i < sessions.length; i++) {
                if (sessions[i] === token) {
                    sessions.splice(i,1);
                    break;
                }
            }
        },

        // Function to create our session token objects which manage the EME
        // MediaKeySession and session-specific event handler
        createSessionToken = function(session, initData) {

            var self = this;
            var token = {
                prototype: (new MediaPlayer.models.SessionToken()).prototype,
                session: session,
                initData: initData,

                // This is our main event handler for all desired MediaKeySession events
                // These events are translated into our API-independent versions of the
                // same events
                handleEvent: function(event) {
                    switch (event.type) {

                        case "keystatuseschange":
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_STATUSES_CHANGED,
                                    this);
                            break;

                        case "message":
                            self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE,
                                    new MediaPlayer.vo.protection.KeyMessage(this, event.message, undefined, event.messageType));
                            break;
                    }
                },

                getSessionID: function() {
                    return this.session.sessionId;
                },

                getExpirationTime: function() {
                    return this.session.expiration;
                },

                getKeyStatuses: function() {
                    return this.session.keyStatuses;
                }
            };

            // Add all event listeners
            session.addEventListener("keystatuseschange", token);
            session.addEventListener("message", token);

            // Register callback for session closed Promise
            session.closed.then(function () {
                removeSession(token);
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED,
                        token.getSessionID());
            });

            // Add to our session list
            sessions.push(token);

            return token;
        };

    return {
        system: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        keySystem: null,

        setup: function() {
            eventHandler = createEventHandler.call(this);
        },

        /**
         * Initialize this protection model
         */
        init: function() {
        },

        teardown: function() {
            if (videoElement) {
                videoElement.removeEventListener("encrypted", eventHandler);
            }
            for (var i = 0; i < sessions.length; i++) {
                this.closeKeySession(sessions[i]);
            }
        },

        requestKeySystemAccess: function(ksConfigurations) {
            requestKeySystemAccessInternal.call(this, ksConfigurations, 0);
        },

        selectKeySystem: function(keySystemAccess) {
            var self = this;
            keySystemAccess.mksa.createMediaKeys().then(function(mkeys) {
                self.keySystem = keySystemAccess.keySystem;
                mediaKeys = mkeys;
                if (videoElement) {
                    videoElement.setMediaKeys(mediaKeys);
                }
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED);

            }).catch(function() {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED,
                        null, "Error selecting keys system (" + keySystemAccess.keySystem.systemString + ")! Could not create MediaKeys -- TODO");

            });
        },

        setMediaElement: function(mediaElement) {
            if (videoElement) {
                videoElement.removeEventListener("encrypted", eventHandler().bind(this));
            }
            videoElement = mediaElement;
            videoElement.addEventListener("encrypted", eventHandler);
            if (mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        },

        setServerCertificate: function(serverCertificate) {
            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not set server certificate until you have selected a key system");
            }

            var self = this;
            mediaKeys.setServerCertificate(serverCertificate).then(function() {
                self.notify(MediaPlayer.models.ProtectionModel.ENAME_SERVER_CERTIFICATE_UPDATED);
            }).catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.ENAME_SERVER_CERTIFICATE_UPDATED,
                        null, "Error updating server certificate -- " + error.name);
            });
        },

        createKeySession: function(initData, sessionType) {

            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not create sessions until you have selected a key system");
            }

            // TODO: Need to check for duplicate initData.  If we already have
            // a KeySession for this exact initData, we shouldn't create a new session.

            var session = mediaKeys.createSession(sessionType);
            var sessionToken = createSessionToken.call(this, session, initData);

            // Generate initial key request
            var self = this;
            session.generateRequest("cenc", initData).then(function() {
                self.notify(MediaPlayer.models.ProtectionModel.ENAME_KEY_SESSION_CREATED, sessionToken);
            }).catch(function(error) {
                // TODO: Better error string
                removeSession(sessionToken);
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED,
                        null, "Error generating key request -- " + error.name);
            });
        },

        updateKeySession: function(sessionToken, message) {

            var session = sessionToken.session;

            // Send our request to the key session
            var self = this;
            session.update(message).catch(function (error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR,
                    new MediaPlayer.vo.protection.KeyError(sessionToken, "Error sending update() message! " + error.name));
            });
        },

        loadKeySession: function(sessionID) {
            if (!this.keySystem || !mediaKeys) {
                throw new Error("Can not load sessions until you have selected a key system");
            }

            var session = mediaKeys.createSession();

            // Load persisted session data into our newly created session object
            var self = this;
            session.load(sessionID).then(function (success) {
                if (success) {
                    var sessionToken = createSessionToken.call(this, session);
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED,
                        sessionToken);
                } else {
                    self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED,
                        null, "Could not load session! Invalid Session ID (" + sessionID + ")");
                }
            }).catch(function (error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED,
                        null, "Could not load session (" + sessionID + ")! " + error.name);
            });
        },

        removeKeySession: function(sessionToken) {

            var session = sessionToken.session;

            var self = this;
            session.remove().then(function () {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED,
                        sessionToken.getSessionID());
            }).catch(function (error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED,
                        null, "Error removing session (" + sessionToken.getSessionID() + "). " + error.name);
            });
        },

        closeKeySession: function(sessionToken) {

            var session = sessionToken.session;

            // Remove event listeners
            session.removeEventListener("keystatuseschange", sessionToken);
            session.removeEventListener("message", sessionToken);

            // Send our request to the key session
            var self = this;
            session.close().catch(function(error) {
                self.notify(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED,
                        null, "Error closing session (" + sessionToken.getSessionID() + ") " + error.name);
            });
        }
    };
};

/**
 * Detects presence of EME v3Feb2014 APIs
 *
 * @param videoElement {HTMLMediaElement} the media element that will be
 * used for detecting APIs
 * @returns {Boolean} true if support was detected, false otherwise
 */
MediaPlayer.models.ProtectionModel_21Jan2015.detect = function(videoElement) {
    if (videoElement.onencrypted === undefined ||
            videoElement.mediaKeys === undefined) {
        return false;
    }
    if (navigator.requestMediaKeySystemAccess === undefined ||
            typeof navigator.requestMediaKeySystemAccess !== 'function') {
        return false;
    }

    return true;
};

MediaPlayer.models.ProtectionModel_21Jan2015.prototype = {
    constructor: MediaPlayer.models.ProtectionModel_21Jan2015
};

