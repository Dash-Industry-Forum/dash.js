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
import ProtectionErrors from '../errors/ProtectionErrors';
import DashJSError from '../../vo/DashJSError';
import KeyMessage from '../vo/KeyMessage';
import KeySystemAccess from '../vo/KeySystemAccess';
import ProtectionConstants from '../../constants/ProtectionConstants';

const SYSTEM_STRING_PRIORITY = {};
SYSTEM_STRING_PRIORITY[ProtectionConstants.PLAYREADY_KEYSTEM_STRING] = [ProtectionConstants.PLAYREADY_KEYSTEM_STRING, ProtectionConstants.PLAYREADY_RECOMMENDATION_KEYSTEM_STRING];
SYSTEM_STRING_PRIORITY[ProtectionConstants.WIDEVINE_KEYSTEM_STRING] = [ProtectionConstants.WIDEVINE_KEYSTEM_STRING];
SYSTEM_STRING_PRIORITY[ProtectionConstants.CLEARKEY_KEYSTEM_STRING] = [ProtectionConstants.CLEARKEY_KEYSTEM_STRING];

function ProtectionModel_21Jan2015(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;//Need to pass in here so we can use same instance since this is optional module
    const events = config.events;
    const debug = config.debug;

    let instance,
        logger,
        keySystem,
        videoElement,
        mediaKeys,
        sessions,
        eventHandler,
        protectionKeyController;

    function setup() {
        logger = debug.getLogger(instance);
        keySystem = null;
        videoElement = null;
        mediaKeys = null;
        sessions = [];
        protectionKeyController = ProtectionKeyController(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        const numSessions = sessions.length;
        let session;

        if (numSessions !== 0) {
            // Called when we are done closing a session.  Success or fail
            const done = function (session) {
                removeSession(session);
                if (sessions.length === 0) {
                    if (videoElement) {
                        videoElement.removeEventListener('encrypted', eventHandler);
                        videoElement.setMediaKeys(null).then(function () {
                            eventBus.trigger(events.TEARDOWN_COMPLETE);
                        });
                    } else {
                        eventBus.trigger(events.TEARDOWN_COMPLETE);
                    }
                }
            };
            for (let i = 0; i < numSessions; i++) {
                session = sessions[i];
                (function (s) {
                    // Override closed promise resolver
                    session.session.closed.then(function () {
                        done(s);
                    });
                    // Close the session and handle errors, otherwise promise
                    // resolver above will be called
                    _closeKeySessionInternal(session).catch(function () {
                        done(s);
                    });

                })(session);
            }
        } else {
            eventBus.trigger(events.TEARDOWN_COMPLETE);
        }
    }

    function stop() {
        // Close and remove not usable sessions
        let session;
        for (let i = 0; i < sessions.length; i++) {
            session = sessions[i];
            if (!session.getUsable()) {
                _closeKeySessionInternal(session).catch(function () {
                    removeSession(session);
                });
            }
        }
    }

    function getAllInitData() {
        const retVal = [];
        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i].initData) {
                retVal.push(sessions[i].initData);
            }
        }
        return retVal;
    }

    function getSessions() {
        return sessions;
    }

    function requestKeySystemAccess(ksConfigurations) {
        return new Promise((resolve, reject) => {
            _requestKeySystemAccessInternal(ksConfigurations, 0, resolve, reject);
        })
    }

    /**
     * Initializes access to a key system. Once we found a valid configuration we get a mediaKeySystemAccess object
     * @param ksConfigurations
     * @param idx
     * @param resolve
     * @param reject
     * @private
     */
    function _requestKeySystemAccessInternal(ksConfigurations, idx, resolve, reject) {

        // In case requestMediaKeySystemAccess is not available we can not proceed and dispatch an error
        if (navigator.requestMediaKeySystemAccess === undefined ||
            typeof navigator.requestMediaKeySystemAccess !== 'function') {
            const msg = 'Insecure origins are not allowed';
            eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {error: msg});
            reject({error: msg});
            return;
        }

        // If a systemStringPriority is defined by the application we use these values. Otherwise we use the default system string
        // This is useful for DRM systems such as Playready for which multiple system strings are possible for instance com.microsoft.playready and com.microsoft.playready.recommendation
        const protDataSystemStringPriority = ksConfigurations[idx].protData && ksConfigurations[idx].protData.systemStringPriority ? ksConfigurations[idx].protData.systemStringPriority : null;
        const configs = ksConfigurations[idx].configs;
        const currentKeySystem = ksConfigurations[idx].ks;
        let systemString = currentKeySystem.systemString;

        // Use the default values in case no values are provided by the application
        const systemStringsToApply = protDataSystemStringPriority ? protDataSystemStringPriority : SYSTEM_STRING_PRIORITY[systemString] ? SYSTEM_STRING_PRIORITY[systemString] : [systemString];

        // Check all the available system strings and the available configurations for support
        _checkAccessForKeySystem(systemStringsToApply, configs)
            .then((mediaKeySystemAccess) => {
                const configuration = (typeof mediaKeySystemAccess.getConfiguration === 'function') ?
                    mediaKeySystemAccess.getConfiguration() : null;
                const keySystemAccess = new KeySystemAccess(currentKeySystem, configuration);

                keySystemAccess.mksa = mediaKeySystemAccess;
                eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {data: keySystemAccess});
                resolve({data: keySystemAccess});
            })
            .catch((e) => {
                if (idx + 1 < ksConfigurations.length) {
                    _requestKeySystemAccessInternal(ksConfigurations, idx + 1, resolve, reject);
                } else {
                    const errorMessage = 'Key system access denied! ';
                    eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, {error: errorMessage + e.message});
                    reject({error: errorMessage + e.message});
                }
            })
    }

    /**
     * For a specific key system: Iterate over the possible system strings and resolve once a valid configuration was found
     * @param {array} systemStringsToApply
     * @param {object} configs
     * @return {Promise}
     * @private
     */
    function _checkAccessForKeySystem(systemStringsToApply, configs) {
        return new Promise((resolve, reject) => {
            _checkAccessForSystemStrings(systemStringsToApply, configs, 0, resolve, reject);
        })
    }

    /**
     * Recursively iterate over the possible system strings until a supported configuration is found or we ran out of options
     * @param {array} systemStringsToApply
     * @param {object} configs
     * @param {number} idx
     * @param {function} resolve
     * @param {function} reject
     * @private
     */
    function _checkAccessForSystemStrings(systemStringsToApply, configs, idx, resolve, reject) {
        const systemString = systemStringsToApply[idx];

        logger.debug(`Requesting key system access for system string ${systemString}`);

        navigator.requestMediaKeySystemAccess(systemString, configs)
            .then((mediaKeySystemAccess) => {
                mediaKeySystemAccess.selectedSystemString = systemString;
                resolve(mediaKeySystemAccess);
            })
            .catch((e) => {
                if (idx + 1 < systemStringsToApply.length) {
                    _checkAccessForSystemStrings(systemStringsToApply, configs, idx + 1, resolve, reject);
                } else {
                    reject(e);
                }
            });
    }

    /**
     * Selects a key system by creating the mediaKeys and adding them to the video element
     * @param keySystemAccess
     * @return {Promise<unknown>}
     */
    function selectKeySystem(keySystemAccess) {
        return new Promise((resolve, reject) => {
            keySystemAccess.mksa.createMediaKeys()
                .then((mkeys) => {
                    keySystem = keySystemAccess.keySystem;
                    mediaKeys = mkeys;
                    if (videoElement) {
                        return videoElement.setMediaKeys(mediaKeys)
                    } else {
                        return Promise.resolve();
                    }
                })
                .then(() => {
                    resolve(keySystem);
                })
                .catch(function () {
                    reject({error: 'Error selecting keys system (' + keySystemAccess.keySystem.systemString + ')! Could not create MediaKeys -- TODO'});
                });
        })
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement)
            return;

        // Replacing the previous element
        if (videoElement) {
            videoElement.removeEventListener('encrypted', eventHandler);
            if (videoElement.setMediaKeys) {
                videoElement.setMediaKeys(null);
            }
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener('encrypted', eventHandler);
            if (videoElement.setMediaKeys && mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        }
    }

    function setServerCertificate(serverCertificate) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not set server certificate until you have selected a key system');
        }
        mediaKeys.setServerCertificate(serverCertificate).then(function () {
            logger.info('DRM: License server certificate successfully updated.');
            eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED);
        }).catch(function (error) {
            eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED, {error: new DashJSError(ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_CODE, ProtectionErrors.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE + error.name)});
        });
    }

    /**
     * Create a key session, a session token and initialize a request by calling generateRequest
     * @param ksInfo
     */
    function createKeySession(ksInfo) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        const session = mediaKeys.createSession(ksInfo.sessionType);
        const sessionToken = createSessionToken(session, ksInfo);


        // The "keyids" type is used for Clearkey when keys are provided directly in the protection data and a request to a license server is not needed
        const dataType = keySystem.systemString === ProtectionConstants.CLEARKEY_KEYSTEM_STRING && (ksInfo.initData || (ksInfo.protData && ksInfo.protData.clearkeys)) ? ProtectionConstants.INITIALIZATION_DATA_TYPE_KEYIDS : ProtectionConstants.INITIALIZATION_DATA_TYPE_CENC;

        session.generateRequest(dataType, ksInfo.initData).then(function () {
            logger.debug('DRM: Session created.  SessionID = ' + sessionToken.getSessionId());
            eventBus.trigger(events.KEY_SESSION_CREATED, {data: sessionToken});
        }).catch(function (error) {
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CREATED, {
                data: null,
                error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + 'Error generating key request -- ' + error.name)
            });
        });
    }

    function updateKeySession(sessionToken, message) {
        const session = sessionToken.session;

        // Send our request to the key session
        if (protectionKeyController.isClearKey(keySystem)) {
            message = message.toJWK();
        }
        session.update(message)
            .then(() => {
                eventBus.trigger(events.KEY_SESSION_UPDATED);
            })
            .catch(function (error) {
                eventBus.trigger(events.KEY_ERROR, {error: new DashJSError(ProtectionErrors.MEDIA_KEYERR_CODE, 'Error sending update() message! ' + error.name, sessionToken)});
            });
    }

    function loadKeySession(ksInfo) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not load sessions until you have selected a key system');
        }

        const sessionId = ksInfo.sessionId;

        // Check if session Id is not already loaded or loading
        for (let i = 0; i < sessions.length; i++) {
            if (sessionId === sessions[i].sessionId) {
                logger.warn('DRM: Ignoring session ID because we have already seen it!');
                return;
            }
        }

        const session = mediaKeys.createSession(ksInfo.sessionType);
        const sessionToken = createSessionToken(session, ksInfo);

        // Load persisted session data into our newly created session object
        session.load(sessionId).then(function (success) {
            if (success) {
                logger.debug('DRM: Session loaded.  SessionID = ' + sessionToken.getSessionId());
                eventBus.trigger(events.KEY_SESSION_CREATED, {data: sessionToken});
            } else {
                removeSession(sessionToken);
                eventBus.trigger(events.KEY_SESSION_CREATED, {
                    data: null,
                    error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session! Invalid Session ID (' + sessionId + ')')
                });
            }
        }).catch(function (error) {
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CREATED, {
                data: null,
                error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session (' + sessionId + ')! ' + error.name)
            });
        });
    }

    function removeKeySession(sessionToken) {
        const session = sessionToken.session;

        session.remove().then(function () {
            logger.debug('DRM: Session removed.  SessionID = ' + sessionToken.getSessionId());
            eventBus.trigger(events.KEY_SESSION_REMOVED, {data: sessionToken.getSessionId()});
        }, function (error) {
            eventBus.trigger(events.KEY_SESSION_REMOVED, {
                data: null,
                error: 'Error removing session (' + sessionToken.getSessionId() + '). ' + error.name
            });

        });
    }

    function closeKeySession(sessionToken) {
        // Send our request to the key session
        _closeKeySessionInternal(sessionToken).catch(function (error) {
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CLOSED, {
                data: null,
                error: 'Error closing session (' + sessionToken.getSessionId() + ') ' + error.name
            });
        });
    }

    function _closeKeySessionInternal(sessionToken) {
        const session = sessionToken.session;

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
                            let initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                            eventBus.trigger(events.NEED_KEY, {key: new NeedKey(initData, event.initDataType)});
                        }
                        break;
                }
            }
        };
    }

    function removeSession(token) {
        // Remove from our session list
        for (let i = 0; i < sessions.length; i++) {
            if (sessions[i] === token) {
                sessions.splice(i, 1);
                break;
            }
        }
    }

    function parseKeyStatus(args) {
        // Edge and Chrome implement different version of keystatues, param are not on same order
        let status, keyId;
        if (args && args.length > 0) {
            if (args[0]) {
                if (typeof args[0] === 'string') {
                    status = args[0];
                } else {
                    keyId = args[0];
                }
            }

            if (args[1]) {
                if (typeof args[1] === 'string') {
                    status = args[1];
                } else {
                    keyId = args[1];
                }
            }
        }
        return {
            status: status,
            keyId: keyId
        };
    }

    // Function to create our session token objects which manage the EME
    // MediaKeySession and session-specific event handler
    function createSessionToken(session, ksInfo) {
        const token = { // Implements SessionToken
            session: session,
            keyId: ksInfo.keyId,
            initData: ksInfo.initData,
            sessionId: ksInfo.sessionId,
            sessionType: ksInfo.sessionType,

            // This is our main event handler for all desired MediaKeySession events
            // These events are translated into our API-independent versions of the
            // same events
            handleEvent: function (event) {
                switch (event.type) {
                    case 'keystatuseschange':
                        eventBus.trigger(events.KEY_STATUSES_CHANGED, {data: this});
                        event.target.keyStatuses.forEach(function () {
                            let keyStatus = parseKeyStatus(arguments);
                            switch (keyStatus.status) {
                                case 'expired':
                                    eventBus.trigger(events.INTERNAL_KEY_STATUS_CHANGED, {error: new DashJSError(ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE, ProtectionErrors.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE)});
                                    break;
                                default:
                                    eventBus.trigger(events.INTERNAL_KEY_STATUS_CHANGED, keyStatus);
                                    break;
                            }
                        });
                        break;

                    case 'message':
                        let message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
                        eventBus.trigger(events.INTERNAL_KEY_MESSAGE, {data: new KeyMessage(this, message, undefined, event.messageType)});
                        break;
                }
            },

            getKeyId: function () {
                return this.keyId;
            },

            getSessionId: function () {
                return session.sessionId;
            },

            getSessionType: function () {
                return this.sessionType;
            },

            getExpirationTime: function () {
                return session.expiration;
            },

            getKeyStatuses: function () {
                return session.keyStatuses;
            },

            getUsable: function () {
                let usable = false;
                session.keyStatuses.forEach(function () {
                    let keyStatus = parseKeyStatus(arguments);
                    if (keyStatus.status === 'usable') {
                        usable = true;
                    }
                });
                return usable;
            }
        };

        // Add all event listeners
        session.addEventListener('keystatuseschange', token);
        session.addEventListener('message', token);

        // Register callback for session closed Promise
        session.closed.then(() => {
            removeSession(token);
            logger.debug('DRM: Session closed.  SessionID = ' + token.getSessionId());
            eventBus.trigger(events.KEY_SESSION_CLOSED, {data: token.getSessionId()});
        });

        // Add to our session list
        sessions.push(token);

        return token;
    }

    instance = {
        getAllInitData,
        getSessions,
        requestKeySystemAccess,
        selectKeySystem,
        setMediaElement,
        setServerCertificate,
        createKeySession,
        updateKeySession,
        loadKeySession,
        removeKeySession,
        closeKeySession,
        stop,
        reset
    };

    setup();

    return instance;
}

ProtectionModel_21Jan2015.__dashjs_factory_name = 'ProtectionModel_21Jan2015';
export default dashjs.FactoryMaker.getClassFactory(ProtectionModel_21Jan2015); /* jshint ignore:line */
