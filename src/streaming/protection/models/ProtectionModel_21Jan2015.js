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

/**
 * Most recent EME implementation
 *
 * Implemented by Google Chrome v36+ (Windows, OSX, Linux)
 *
 * @implements ProtectionModel
 * @class
 */
import ProtectionKeyController from '../controllers/ProtectionKeyController';
import NeedKey from '../vo/NeedKey';
import KeyError from '../vo/KeyError';
import KeyMessage from '../vo/KeyMessage';
import KeySystemAccess from '../vo/KeySystemAccess';
import Events from '../../../core/events/Events';
import FactoryMaker from '../../../core/FactoryMaker';

function ProtectionModel_21Jan2015(config) {

    let context = this.context;
    let eventBus = config.eventBus;//Need to pass in here so we can use same instance since this is optional module
    let log = config.log;

    var instance,
        keySystem,
        videoElement,
        mediaKeys,
        sessions,
        eventHandler,
        protectionKeyController;

    function setup() {
        keySystem = null;
        videoElement = null;
        mediaKeys = null;
        sessions = [];
        protectionKeyController = ProtectionKeyController(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        var numSessions = sessions.length;
        var session;

        if (numSessions !== 0) {
            // Called when we are done closing a session.  Success or fail
            var done = function (session) {
                removeSession(session);
                if (sessions.length === 0) {
                    if (videoElement) {
                        videoElement.removeEventListener('encrypted', eventHandler);
                        videoElement.setMediaKeys(null).then(function () {
                            eventBus.trigger(Events.TEARDOWN_COMPLETE);
                        });
                    } else {
                        eventBus.trigger(Events.TEARDOWN_COMPLETE);
                    }
                }
            };
            for (var i = 0; i < numSessions; i++) {
                session = sessions[i];
                (function (s) {
                    // Override closed promise resolver
                    session.session.closed.then(function () {
                        done(s);
                    });
                    // Close the session and handle errors, otherwise promise
                    // resolver above will be called
                    closeKeySessionInternal(session).catch(function () {
                        done(s);
                    });

                })(session);
            }
        } else {
            eventBus.trigger(Events.TEARDOWN_COMPLETE);
        }
    }

    function getKeySystem() {
        return keySystem;
    }

    function getAllInitData() {
        var retVal = [];
        for (var i = 0; i < sessions.length; i++) {
            retVal.push(sessions[i].initData);
        }
        return retVal;
    }

    function requestKeySystemAccess(ksConfigurations) {
        requestKeySystemAccessInternal(ksConfigurations, 0);
    }

    function selectKeySystem(keySystemAccess) {
        keySystemAccess.mksa.createMediaKeys().then(function (mkeys) {
            keySystem = keySystemAccess.keySystem;
            mediaKeys = mkeys;
            if (videoElement) {
                videoElement.setMediaKeys(mediaKeys);
            }
            eventBus.trigger(Events.INTERNAL_KEY_SYSTEM_SELECTED);

        }).catch(function () {
            eventBus.trigger(Events.INTERNAL_KEY_SYSTEM_SELECTED, {error: 'Error selecting keys system (' + keySystemAccess.keySystem.systemString + ')! Could not create MediaKeys -- TODO'});
        });
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement)
            return;

        // Replacing the previous element
        if (videoElement) {
            videoElement.removeEventListener('encrypted', eventHandler);
            videoElement.setMediaKeys(null);
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener('encrypted', eventHandler);
            if (mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        }
    }

    function setServerCertificate(serverCertificate) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not set server certificate until you have selected a key system');
        }
        mediaKeys.setServerCertificate(serverCertificate).then(function () {
            log('DRM: License server certificate successfully updated.');
            eventBus.trigger(Events.SERVER_CERTIFICATE_UPDATED);
        }).catch(function (error) {
            eventBus.trigger(Events.SERVER_CERTIFICATE_UPDATED, {error: 'Error updating server certificate -- ' + error.name});
        });
    }

    function createKeySession(initData, sessionType) {

        if (!keySystem || !mediaKeys) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        var session = mediaKeys.createSession(sessionType);
        var sessionToken = createSessionToken(session, initData, sessionType);

        // Generate initial key request
        session.generateRequest('cenc', initData).then(function () {
            log('DRM: Session created.  SessionID = ' + sessionToken.getSessionID());
            eventBus.trigger(Events.KEY_SESSION_CREATED, {data: sessionToken});
        }).catch(function (error) {
            // TODO: Better error string
            removeSession(sessionToken);
            eventBus.trigger(Events.KEY_SESSION_CREATED, {data: null, error: 'Error generating key request -- ' + error.name});
        });
    }

    function updateKeySession(sessionToken, message) {

        var session = sessionToken.session;

        // Send our request to the key session
        if (protectionKeyController.isClearKey(keySystem)) {
            message = message.toJWK();
        }
        session.update(message).catch(function (error) {
            eventBus.trigger(Events.KEY_ERROR, {data: new KeyError(sessionToken, 'Error sending update() message! ' + error.name)});
        });
    }

    function loadKeySession(sessionID) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not load sessions until you have selected a key system');
        }

        var session = mediaKeys.createSession();

        // Load persisted session data into our newly created session object
        session.load(sessionID).then(function (success) {
            if (success) {
                var sessionToken = createSessionToken(session);
                log('DRM: Session created.  SessionID = ' + sessionToken.getSessionID());
                eventBus.trigger(Events.KEY_SESSION_CREATED, {data: sessionToken});
            } else {
                eventBus.trigger(Events.KEY_SESSION_CREATED, {data: null, error: 'Could not load session! Invalid Session ID (' + sessionID + ')'});
            }
        }).catch(function (error) {
            eventBus.trigger(Events.KEY_SESSION_CREATED, {data: null, error: 'Could not load session (' + sessionID + ')! ' + error.name});
        });
    }

    function removeKeySession(sessionToken) {
        var session = sessionToken.session;

        session.remove().then(function () {
            log('DRM: Session removed.  SessionID = ' + sessionToken.getSessionID());
            eventBus.trigger(Events.KEY_SESSION_REMOVED, {data: sessionToken.getSessionID()});
        }, function (error) {
            eventBus.trigger(Events.KEY_SESSION_REMOVED, {data: null, error: 'Error removing session (' + sessionToken.getSessionID() + '). ' + error.name});

        });
    }

    function closeKeySession(sessionToken) {
        // Send our request to the key session
        closeKeySessionInternal(sessionToken).catch(function (error) {
            removeSession(sessionToken);
            eventBus.trigger(Events.KEY_SESSION_CLOSED, {data: null, error: 'Error closing session (' + sessionToken.getSessionID() + ') ' + error.name});
        });
    }

    function requestKeySystemAccessInternal(ksConfigurations, idx) {
        (function (i) {
            var keySystem = ksConfigurations[i].ks;
            var configs = ksConfigurations[i].configs;
            navigator.requestMediaKeySystemAccess(keySystem.systemString, configs).then(function (mediaKeySystemAccess) {

                // Chrome 40 does not currently implement MediaKeySystemAccess.getConfiguration()
                var configuration = (typeof mediaKeySystemAccess.getConfiguration === 'function') ?
                        mediaKeySystemAccess.getConfiguration() : null;
                var keySystemAccess = new KeySystemAccess(keySystem, configuration);
                keySystemAccess.mksa = mediaKeySystemAccess;
                eventBus.trigger(Events.KEY_SYSTEM_ACCESS_COMPLETE, {data: keySystemAccess});

            }).catch(function () {
                if (++i < ksConfigurations.length) {
                    requestKeySystemAccessInternal(ksConfigurations, i);
                } else {
                    eventBus.trigger(Events.KEY_SYSTEM_ACCESS_COMPLETE, {error: 'Key system access denied!'});
                }
            });
        })(idx);
    }

    function closeKeySessionInternal(sessionToken) {
        var session = sessionToken.session;

        // Remove event listeners
        session.removeEventListener('keystatuseschange', sessionToken);
        session.removeEventListener('message', sessionToken);

        // Send our request to the key session
        return session.close();
    }

    // This is our main event handler for all desired HTMLMediaElement events
    // related to EME.  These events are translated into our API-independent
    // versions of the same events
    function createEventHandler() {
        return {
            handleEvent: function (event) {
                switch (event.type) {

                    case 'encrypted':
                        if (event.initData) {
                            var initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                            eventBus.trigger(Events.NEED_KEY, {key: new NeedKey(initData, event.initDataType)});
                        }
                        break;
                }
            }
        };
    }

    function removeSession(token) {
        // Remove from our session list
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i] === token) {
                sessions.splice(i,1);
                break;
            }
        }
    }

    // Function to create our session token objects which manage the EME
    // MediaKeySession and session-specific event handler
    function createSessionToken(session, initData, sessionType) {

        var token = { // Implements SessionToken
            session: session,
            initData: initData,

            // This is our main event handler for all desired MediaKeySession events
            // These events are translated into our API-independent versions of the
            // same events
            handleEvent: function (event) {
                switch (event.type) {
                    case 'keystatuseschange':
                        eventBus.trigger(Events.KEY_STATUSES_CHANGED, {data: this});
                        break;

                    case 'message':
                        var message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
                        eventBus.trigger(Events.INTERNAL_KEY_MESSAGE, {data: new KeyMessage(this, message, undefined, event.messageType)});
                        break;
                }
            },

            getSessionID: function () {
                return session.sessionId;
            },

            getExpirationTime: function () {
                return session.expiration;
            },

            getKeyStatuses: function () {
                return session.keyStatuses;
            },

            getSessionType: function () {
                return sessionType;
            }
        };

        // Add all event listeners
        session.addEventListener('keystatuseschange', token);
        session.addEventListener('message', token);

        // Register callback for session closed Promise
        session.closed.then(function () {
            removeSession(token);
            log('DRM: Session closed.  SessionID = ' + token.getSessionID());
            eventBus.trigger(Events.KEY_SESSION_CLOSED, {data: token.getSessionID()});
        });

        // Add to our session list
        sessions.push(token);

        return token;
    }

    instance = {
        getAllInitData: getAllInitData,
        requestKeySystemAccess: requestKeySystemAccess,
        getKeySystem: getKeySystem,
        selectKeySystem: selectKeySystem,
        setMediaElement: setMediaElement,
        setServerCertificate: setServerCertificate,
        createKeySession: createKeySession,
        updateKeySession: updateKeySession,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        closeKeySession: closeKeySession,
        reset: reset
    };

    setup();

    return instance;
}

ProtectionModel_21Jan2015.__dashjs_factory_name = 'ProtectionModel_21Jan2015';
export default FactoryMaker.getClassFactory(ProtectionModel_21Jan2015);