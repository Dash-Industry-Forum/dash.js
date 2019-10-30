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

import CommonEncryption from '../CommonEncryption';
import MediaCapability from '../vo/MediaCapability';
import KeySystemConfiguration from '../vo/KeySystemConfiguration';
import ProtectionErrors from '../errors/ProtectionErrors';
import DashJSError from '../../vo/DashJSError';

const NEEDKEY_BEFORE_INITIALIZE_RETRIES = 5;
const NEEDKEY_BEFORE_INITIALIZE_TIMEOUT = 500;

const LICENSE_SERVER_REQUEST_RETRIES = 3;
const LICENSE_SERVER_REQUEST_RETRY_INTERVAL = 1000;
const LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT = 8000;

/**
 * @module ProtectionController
 * @description Provides access to media protection information and functionality.  Each
 * ProtectionController manages a single {@link MediaPlayer.models.ProtectionModel}
 * which encapsulates a set of protection information (EME APIs, selected key system,
 * key sessions).  The APIs of ProtectionController mostly align with the latest EME
 * APIs.  Key system selection is mostly automated when combined with app-overrideable
 * functionality provided in {@link ProtectionKeyController}.
 * @todo ProtectionController does almost all of its tasks automatically after init() is
 * called.  Applications might want more control over this process and want to go through
 * each step manually (key system selection, session creation, session maintenance).
 * @param {Object} config
 */

function ProtectionController(config) {

    config = config || {};
    const protectionKeyController = config.protectionKeyController;
    let protectionModel = config.protectionModel;
    const eventBus = config.eventBus;
    const events = config.events;
    const debug = config.debug;
    const BASE64 = config.BASE64;
    const constants = config.constants;
    let needkeyRetries = [];

    let instance,
        logger,
        pendingNeedKeyData,
        mediaInfoArr,
        protDataSet,
        sessionType,
        robustnessLevel,
        keySystem;

    function setup() {
        logger = debug.getLogger(instance);
        pendingNeedKeyData = [];
        mediaInfoArr = [];
        sessionType = 'temporary';
        robustnessLevel = '';
    }

    function checkConfig() {
        if (!eventBus || !eventBus.hasOwnProperty('on') || !protectionKeyController || !protectionKeyController.hasOwnProperty('getSupportedKeySystemsFromContentProtection')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    /**
     * Initialize this protection system with a given audio
     * or video stream information.
     *
     * @param {StreamInfo} [mediaInfo] Media information
     * @memberof module:ProtectionController
     * @instance
     * @todo This API will change when we have better support for allowing applications
     * to select different adaptation sets for playback.  Right now it is clunky for
     * applications to create {@link StreamInfo} with the right information,
     * @ignore
     */
    function initializeForMedia(mediaInfo) {
        // Not checking here if a session for similar KS/KID combination is already created
        // because still don't know which keysystem will be selected.
        // Once Keysystem is selected and before creating the session, we will do that check
        // so we create the strictly necessary DRM sessions
        if (!mediaInfo) {
            throw new Error('mediaInfo can not be null or undefined');
        }

        checkConfig();

        eventBus.on(events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
        eventBus.on(events.INTERNAL_KEY_STATUS_CHANGED, onKeyStatusChanged, this);

        mediaInfoArr.push(mediaInfo);

        // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
        // and video will be the same.  Just use one valid MediaInfo object
        const supportedKS = protectionKeyController.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
        if (supportedKS && supportedKS.length > 0) {
            selectKeySystem(supportedKS, true);
        }
    }

    /**
     * Returns a set of supported key systems and CENC initialization data
     * from the given array of ContentProtection elements.  Only
     * key systems that are supported by this player will be returned.
     * Key systems are returned in priority order (highest first).
     *
     * @param {Array.<Object>} cps - array of content protection elements parsed
     * from the manifest
     * @returns {Array.<Object>} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @memberof module:ProtectionKeyController
     * @instance
     * @ignore
     */
    function getSupportedKeySystemsFromContentProtection(cps) {
        checkConfig();
        return protectionKeyController.getSupportedKeySystemsFromContentProtection(cps);
    }

    /**
     * Create a new key session associated with the given initialization data from
     * the MPD or from the PSSH box in the media
     *
     * @param {ArrayBuffer} initData the initialization data
     * @param {Uint8Array} cdmData the custom data to provide to licenser
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     * @todo In older versions of the EME spec, there was a one-to-one relationship between
     * initialization data and key sessions.  That is no longer true in the latest APIs.  This
     * API will need to modified (and a new "generateRequest(keySession, initData)" API created)
     * to come up to speed with the latest EME standard
     * @ignore
     */
    function createKeySession(initData, cdmData) {
        const initDataForKS = CommonEncryption.getPSSHForKeySystem(keySystem, initData);
        const protData = getProtData(keySystem);
        if (initDataForKS) {

            // Check for duplicate initData
            const currentInitData = protectionModel.getAllInitData();
            for (let i = 0; i < currentInitData.length; i++) {
                if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
                    logger.warn('DRM: Ignoring initData because we have already seen it!');
                    return;
                }
            }
            try {
                protectionModel.createKeySession(initDataForKS, protData, getSessionType(keySystem), cdmData);
            } catch (error) {
                eventBus.trigger(events.KEY_SESSION_CREATED, {data: null, error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + error.message)});
            }
        } else if (initData) {
            protectionModel.createKeySession(initData, protData, getSessionType(keySystem), cdmData);
        } else {
            eventBus.trigger(events.KEY_SESSION_CREATED, {data: null, error: new DashJSError(ProtectionErrors.KEY_SESSION_CREATED_ERROR_CODE, ProtectionErrors.KEY_SESSION_CREATED_ERROR_MESSAGE + 'Selected key system is ' + (keySystem ? keySystem.systemString : null) + '.  needkey/encrypted event contains no initData corresponding to that key system!')});
        }
    }

    /**
     * Loads a key session with the given session ID from persistent storage.  This
     * essentially creates a new key session
     *
     * @param {string} sessionID
     * @param {string} initData
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     * @ignore
     */
    function loadKeySession(sessionID, initData) {
        checkConfig();
        protectionModel.loadKeySession(sessionID, initData, getSessionType(keySystem));
    }

    /**
     * Removes the given key session from persistent storage and closes the session
     * as if {@link ProtectionController#closeKeySession}
     * was called
     *
     * @param {SessionToken} sessionToken the session
     * token
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionRemoved
     * @fires ProtectionController#KeySessionClosed
     * @ignore
     */
    function removeKeySession(sessionToken) {
        checkConfig();
        protectionModel.removeKeySession(sessionToken);
    }

    /**
     * Closes the key session and releases all associated decryption keys.  These
     * keys will no longer be available for decrypting media
     *
     * @param {SessionToken} sessionToken the session
     * token
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionClosed
     * @ignore
     */
    function closeKeySession(sessionToken) {
        checkConfig();
        protectionModel.closeKeySession(sessionToken);
    }

    /**
     * Sets a server certificate for use by the CDM when signing key messages
     * intended for a particular license server.  This will fire
     * an error event if a key system has not yet been selected.
     *
     * @param {ArrayBuffer} serverCertificate a CDM-specific license server
     * certificate
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#ServerCertificateUpdated
     */
    function setServerCertificate(serverCertificate) {
        checkConfig();
        protectionModel.setServerCertificate(serverCertificate);
    }

    /**
     * Associate this protection system with the given HTMLMediaElement.  This
     * causes the system to register for needkey/encrypted events from the given
     * element and provides a destination for setting of MediaKeys
     *
     * @param {HTMLMediaElement} element the media element to which the protection
     * system should be associated
     * @memberof module:ProtectionController
     * @instance
     */
    function setMediaElement(element) {
        checkConfig();
        if (element) {
            protectionModel.setMediaElement(element);
            eventBus.on(events.NEED_KEY, onNeedKey, this);
        } else if (element === null) {
            protectionModel.setMediaElement(element);
            eventBus.off(events.NEED_KEY, onNeedKey, this);
        }
    }

    /**
     * Sets the session type to use when creating key sessions.  Either "temporary" or
     * "persistent-license".  Default is "temporary".
     *
     * @param {string} value the session type
     * @memberof module:ProtectionController
     * @instance
     */
    function setSessionType(value) {
        sessionType = value;
    }

    /**
     * Sets the robustness level for video and audio capabilities. Optional to remove Chrome warnings.
     * Possible values are SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL.
     *
     * @param {string} level the robustness level
     * @memberof module:ProtectionController
     * @instance
     */
    function setRobustnessLevel(level) {
        robustnessLevel = level;
    }

    /**
     * Attach KeySystem-specific data to use for license acquisition with EME
     *
     * @param {Object} data an object containing property names corresponding to
     * key system name strings (e.g. "org.w3.clearkey") and associated values
     * being instances of {@link ProtectionData}
     * @memberof module:ProtectionController
     * @instance
     * @ignore
     */
    function setProtectionData(data) {
        protDataSet = data;
        protectionKeyController.setProtectionData(data);
    }

    /**
     * Stop method is called when current playback is stopped/resetted.
     *
     * @memberof module:ProtectionController
     * @instance
     */
    function stop() {
        if (protectionModel) {
            protectionModel.stop();
        }
    }


    /**
     * Destroys all protection data associated with this protection set.  This includes
     * deleting all key sessions. In the case of persistent key sessions, the sessions
     * will simply be unloaded and not deleted.  Additionally, if this protection set is
     * associated with a HTMLMediaElement, it will be detached from that element.
     *
     * @memberof module:ProtectionController
     * @instance
     * @ignore
     */
    function reset() {
        checkConfig();

        eventBus.off(events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
        eventBus.off(events.INTERNAL_KEY_STATUS_CHANGED, onKeyStatusChanged, this);

        setMediaElement(null);

        keySystem = undefined;//TODO-Refactor look at why undefined is needed for this. refactor

        if (protectionModel) {
            protectionModel.reset();
            protectionModel = null;
        }

        needkeyRetries.forEach( retryTimeout => clearTimeout(retryTimeout));
        needkeyRetries = [];

        mediaInfoArr = [];
    }

    ///////////////
    // Private
    ///////////////

    function getProtData(keySystem) {
        let protData = null;
        if (keySystem) {
            const keySystemString = keySystem.systemString;

            if (protDataSet) {
                protData = (keySystemString in protDataSet) ? protDataSet[keySystemString] : null;
            }
        }
        return protData;
    }

    function getKeySystemConfiguration(keySystem) {
        const protData = getProtData(keySystem);
        const audioCapabilities = [];
        const videoCapabilities = [];
        const audioRobustness = (protData && protData.audioRobustness && protData.audioRobustness.length > 0) ? protData.audioRobustness : robustnessLevel;
        const videoRobustness = (protData && protData.videoRobustness && protData.videoRobustness.length > 0) ? protData.videoRobustness : robustnessLevel;
        const ksSessionType = getSessionType(keySystem);
        const distinctiveIdentifier = (protData && protData.distinctiveIdentifier) ? protData.distinctiveIdentifier : 'optional';
        const persistentState = (protData && protData.persistentState) ? protData.persistentState : (ksSessionType === 'temporary') ? 'optional' : 'required';

        mediaInfoArr.forEach((media) => {
            if (media.type === constants.AUDIO) {
                audioCapabilities.push(new MediaCapability(media.codec, audioRobustness));
            } else if (media.type === constants.VIDEO) {
                videoCapabilities.push(new MediaCapability(media.codec, videoRobustness));
            }
        });

        return new KeySystemConfiguration(
            audioCapabilities, videoCapabilities, distinctiveIdentifier,
            persistentState,
            [ksSessionType]);
    }

    function getSessionType(keySystem) {
        const protData = getProtData(keySystem);
        const ksSessionType = (protData && protData.sessionType) ? protData.sessionType : sessionType;
        return ksSessionType;
    }

    function selectKeySystem(supportedKS, fromManifest) {
        const self = this;
        const requestedKeySystems = [];

        // Reorder key systems according to priority order provided in protectionData
        supportedKS = supportedKS.sort((ksA, ksB) => {
            let indexA = (protDataSet && protDataSet[ksA.ks.systemString] && protDataSet[ksA.ks.systemString].priority >= 0) ? protDataSet[ksA.ks.systemString].priority : supportedKS.length;
            let indexB = (protDataSet && protDataSet[ksB.ks.systemString] && protDataSet[ksB.ks.systemString].priority >= 0) ? protDataSet[ksB.ks.systemString].priority : supportedKS.length;
            return indexA - indexB;
        });

        let ksIdx;
        if (keySystem) {
            // We have a key system
            for (ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                if (keySystem === supportedKS[ksIdx].ks) {

                    requestedKeySystems.push({ks: supportedKS[ksIdx].ks, configs: [getKeySystemConfiguration(keySystem)]});

                    // Ensure that we would be granted key system access using the key
                    // system and codec information
                    const onKeySystemAccessComplete = function (event) {
                        eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                        if (event.error) {
                            if (!fromManifest) {
                                eventBus.trigger(events.KEY_SYSTEM_SELECTED, {error: new DashJSError(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + event.error)});
                            }
                        } else {
                            logger.info('DRM: KeySystem Access Granted');
                            eventBus.trigger(events.KEY_SYSTEM_SELECTED, {data: event.data});
                            if (supportedKS[ksIdx].sessionId) {
                                // Load MediaKeySession with sessionId
                                loadKeySession(supportedKS[ksIdx].sessionId, supportedKS[ksIdx].initData);
                            } else if (supportedKS[ksIdx].initData) {
                                // Create new MediaKeySession with initData
                                createKeySession(supportedKS[ksIdx].initData, supportedKS[ksIdx].cdmData);
                            }
                        }
                    };
                    eventBus.on(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                    protectionModel.requestKeySystemAccess(requestedKeySystems);
                    break;
                }
            }
        }
        else if (keySystem === undefined) {
            // First time through, so we need to select a key system
            keySystem = null;
            pendingNeedKeyData.push(supportedKS);

            // Add all key systems to our request list since we have yet to select a key system
            for (let i = 0; i < supportedKS.length; i++) {
                requestedKeySystems.push({ks: supportedKS[i].ks, configs: [getKeySystemConfiguration(supportedKS[i].ks)]});
            }

            let keySystemAccess;
            const onKeySystemAccessComplete = function (event) {
                eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                if (event.error) {
                    keySystem = undefined;
                    eventBus.off(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                    if (!fromManifest) {
                        eventBus.trigger(events.KEY_SYSTEM_SELECTED, {data: null, error: new DashJSError(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + event.error)});
                    }
                } else {
                    keySystemAccess = event.data;
                    logger.info('DRM: KeySystem Access Granted (' + keySystemAccess.keySystem.systemString + ')!  Selecting key system...');
                    protectionModel.selectKeySystem(keySystemAccess);
                }
            };
            var onKeySystemSelected = function (event) {
                eventBus.off(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                if (!event.error) {
                    if (!protectionModel) {
                        return;
                    }
                    keySystem = protectionModel.getKeySystem();
                    eventBus.trigger(events.KEY_SYSTEM_SELECTED, {data: keySystemAccess});
                    // Set server certificate from protData
                    const protData = getProtData(keySystem);
                    if (protData && protData.serverCertificate && protData.serverCertificate.length > 0) {
                        protectionModel.setServerCertificate(BASE64.decodeArray(protData.serverCertificate).buffer);
                    }
                    for (let i = 0; i < pendingNeedKeyData.length; i++) {
                        for (ksIdx = 0; ksIdx < pendingNeedKeyData[i].length; ksIdx++) {
                            if (keySystem === pendingNeedKeyData[i][ksIdx].ks) {
                                // For Clearkey: if parameters for generating init data was provided by the user, use them for generating
                                // initData and overwrite possible initData indicated in encrypted event (EME)
                                if (protectionKeyController.isClearKey(keySystem) && protData && protData.hasOwnProperty('clearkeys')) {
                                    const initData = { kids: Object.keys(protData.clearkeys) };
                                    pendingNeedKeyData[i][ksIdx].initData = new TextEncoder().encode(JSON.stringify(initData));
                                }
                                if (pendingNeedKeyData[i][ksIdx].sessionId) {
                                    // Load MediaKeySession with sessionId
                                    loadKeySession(pendingNeedKeyData[i][ksIdx].sessionId, pendingNeedKeyData[i][ksIdx].initData);
                                } else if (pendingNeedKeyData[i][ksIdx].initData !== null) {
                                    // Create new MediaKeySession with initData
                                    createKeySession(pendingNeedKeyData[i][ksIdx].initData, pendingNeedKeyData[i][ksIdx].cdmData);
                                }
                                break;
                            }
                        }
                    }
                } else {
                    keySystem = undefined;
                    if (!fromManifest) {
                        eventBus.trigger(events.KEY_SYSTEM_SELECTED, {data: null, error: new DashJSError(ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, ProtectionErrors.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + 'Error selecting key system! -- ' + event.error)});
                    }
                }
            };
            eventBus.on(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
            eventBus.on(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
            protectionModel.requestKeySystemAccess(requestedKeySystems);
        } else {
            // We are in the process of selecting a key system, so just save the data
            pendingNeedKeyData.push(supportedKS);
        }
    }

    function sendLicenseRequestCompleteEvent(data, error) {
        eventBus.trigger(events.LICENSE_REQUEST_COMPLETE, {data: data, error: error});
    }

    function onKeyStatusChanged(e) {
        if (e.error) {
            eventBus.trigger(events.KEY_STATUSES_CHANGED, {data: null, error: e.error});
        } else {
            logger.debug('DRM: key status = ' + e.status);
        }
    }

    function onKeyMessage(e) {
        logger.debug('DRM: onKeyMessage');

        // Dispatch event to applications indicating we received a key message
        const keyMessage = e.data;
        eventBus.trigger(events.KEY_MESSAGE, {data: keyMessage});
        const messageType = (keyMessage.messageType) ? keyMessage.messageType : 'license-request';
        const message = keyMessage.message;
        const sessionToken = keyMessage.sessionToken;
        const protData = getProtData(keySystem);
        const keySystemString = keySystem ? keySystem.systemString : null;
        const licenseServerData = protectionKeyController.getLicenseServer(keySystem, protData, messageType);
        const eventData = { sessionToken: sessionToken, messageType: messageType };

        // Ensure message from CDM is not empty
        if (!message || message.byteLength === 0) {
            sendLicenseRequestCompleteEvent(eventData, new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE, ProtectionErrors.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE));
            return;
        }

        // Message not destined for license server
        if (!licenseServerData) {
            logger.debug('DRM: License server request not required for this message (type = ' + e.data.messageType + ').  Session ID = ' + sessionToken.getSessionID());
            sendLicenseRequestCompleteEvent(eventData);
            return;
        }

        // Perform any special handling for ClearKey
        if (protectionKeyController.isClearKey(keySystem)) {
            const clearkeys = protectionKeyController.processClearKeyLicenseRequest(keySystem, protData, message);
            if (clearkeys)  {
                logger.debug('DRM: ClearKey license request handled by application!');
                sendLicenseRequestCompleteEvent(eventData);
                protectionModel.updateKeySession(sessionToken, clearkeys);
                return;
            }
        }

        // All remaining key system scenarios require a request to a remote license server
        // Determine license server URL
        let url = null;
        if (protData && protData.serverURL) {
            const serverURL = protData.serverURL;
            if (typeof serverURL === 'string' && serverURL !== '') {
                url = serverURL;
            } else if (typeof serverURL === 'object' && serverURL.hasOwnProperty(messageType)) {
                url = serverURL[messageType];
            }
        } else if (protData && protData.laURL && protData.laURL !== '') {
            // TODO: Deprecated!
            url = protData.laURL;
        } else {
            url = keySystem.getLicenseServerURLFromInitData(CommonEncryption.getPSSHData(sessionToken.initData));
            if (!url) {
                url = e.data.laURL;
            }
        }
        // Possibly update or override the URL based on the message
        url = licenseServerData.getServerURLFromMessage(url, message, messageType);

        // Ensure valid license server URL
        if (!url) {
            sendLicenseRequestCompleteEvent(eventData, new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE, ProtectionErrors.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE));
            return;
        }

        // Set optional XMLHttpRequest headers from protection data and message
        const reqHeaders = {};
        let withCredentials = false;
        const updateHeaders = function (headers) {
            if (headers) {
                for (const key in headers) {
                    if ('authorization' === key.toLowerCase()) {
                        withCredentials = true;
                    }
                    reqHeaders[key] = headers[key];
                }
            }
        };
        if (protData) {
            updateHeaders(protData.httpRequestHeaders);
        }
        updateHeaders(keySystem.getRequestHeadersFromMessage(message));

        // Overwrite withCredentials property from protData if present
        if (protData && typeof protData.withCredentials == 'boolean') {
            withCredentials = protData.withCredentials;
        }

        const reportError = function (xhr, eventData, keySystemString, messageType) {
            const errorMsg = ((xhr.response) ? licenseServerData.getErrorResponse(xhr.response, keySystemString, messageType) : 'NONE');
            sendLicenseRequestCompleteEvent(eventData, new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE,
                ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR complete. status is "' +
                xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState + '.  Response is ' + errorMsg));
        };

        const onLoad = function (xhr) {
            if (!protectionModel) {
                return;
            }

            if (xhr.status === 200) {
                const licenseMessage = licenseServerData.getLicenseMessage(xhr.response, keySystemString, messageType);
                if (licenseMessage !== null) {
                    sendLicenseRequestCompleteEvent(eventData);
                    protectionModel.updateKeySession(sessionToken, licenseMessage);
                } else {
                    reportError(xhr, eventData, keySystemString, messageType);
                }
            } else {
                reportError(xhr, eventData, keySystemString, messageType);
            }
        };

        const onAbort = function (xhr) {
            sendLicenseRequestCompleteEvent(eventData, new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE,
                ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR aborted. status is "' +
                xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
        };

        const onError = function (xhr) {
            sendLicenseRequestCompleteEvent(eventData, new DashJSError(ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE,
                ProtectionErrors.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR error. status is "' +
                xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
        };

        const reqPayload = keySystem.getLicenseRequestFromMessage(message);
        const reqMethod = licenseServerData.getHTTPMethod(messageType);
        const responseType = licenseServerData.getResponseType(keySystemString, messageType);
        const timeout = protData && !isNaN(protData.httpTimeout) ? protData.httpTimeout : LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT;

        doLicenseRequest(url, reqHeaders, reqMethod, responseType, withCredentials, reqPayload,
            LICENSE_SERVER_REQUEST_RETRIES, timeout, onLoad, onAbort, onError);
    }

    // Implement license requests with a retry mechanism to avoid temporary network issues to affect playback experience
    function doLicenseRequest(url, headers, method, responseType, withCredentials, payload, retriesCount, timeout, onLoad, onAbort, onError) {
        const xhr = new XMLHttpRequest();

        xhr.open(method, url, true);
        xhr.responseType = responseType;
        xhr.withCredentials = withCredentials;
        if (timeout > 0) {
            xhr.timeout = timeout;
        }
        for (const key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }

        const retryRequest = function () {
            // fail silently and retry
            retriesCount--;
            setTimeout(function () {
                doLicenseRequest(url, headers, method, responseType, withCredentials, payload,
                    retriesCount, timeout, onLoad, onAbort, onError);
            }, LICENSE_SERVER_REQUEST_RETRY_INTERVAL);
        };

        xhr.onload = function () {
            if (this.status === 200 || retriesCount <= 0) {
                onLoad(this);
            } else {
                logger.warn('License request failed (' + this.status + '). Retrying it... Pending retries: ' + retriesCount);
                retryRequest();
            }
        };

        xhr.ontimeout = xhr.onerror = function () {
            if (retriesCount <= 0) {
                onError(this);
            } else {
                logger.warn('License request network request failed . Retrying it... Pending retries: ' + retriesCount);
                retryRequest();
            }
        };

        xhr.onabort = function () {
            onAbort(this);
        };

        xhr.send(payload);
    }

    function onNeedKey(event, retry) {
        logger.debug('DRM: onNeedKey');
        // Ignore non-cenc initData
        if (event.key.initDataType !== 'cenc') {
            logger.warn('DRM:  Only \'cenc\' initData is supported!  Ignoring initData of type: ' + event.key.initDataType);
            return;
        }

        if (mediaInfoArr.length === 0) {
            logger.warn('DRM: onNeedKey called before initializeForMedia, wait until initialized');
            retry = typeof retry === 'undefined' ? 1 : retry + 1;
            if (retry < NEEDKEY_BEFORE_INITIALIZE_RETRIES) {
                needkeyRetries.push(setTimeout(() => {
                    onNeedKey(event, retry);
                }, NEEDKEY_BEFORE_INITIALIZE_TIMEOUT));
                return;
            }

        }

        // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
        // Convert to ArrayBuffer
        let abInitData = event.key.initData;
        if (ArrayBuffer.isView(abInitData)) {
            abInitData = abInitData.buffer;
        }

        // If key system has already been selected and initData already seen, then do nothing
        if (keySystem) {
            const initDataForKS = CommonEncryption.getPSSHForKeySystem(keySystem, abInitData);
            if (initDataForKS) {

                // Check for duplicate initData
                const currentInitData = protectionModel.getAllInitData();
                for (let i = 0; i < currentInitData.length; i++) {
                    if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
                        logger.warn('DRM: Ignoring initData because we have already seen it!');
                        return;
                    }
                }
            }
        }

        logger.debug('DRM: initData:', String.fromCharCode.apply(null, new Uint8Array(abInitData)));

        const supportedKS = protectionKeyController.getSupportedKeySystems(abInitData, protDataSet);
        if (supportedKS.length === 0) {
            logger.debug('DRM: Received needkey event with initData, but we don\'t support any of the key systems!');
            return;
        }

        selectKeySystem(supportedKS, false);
    }

    function getKeySystems() {
        return protectionKeyController ? protectionKeyController.getKeySystems() : [];
    }

    function setKeySystems(keySystems) {
        if (protectionKeyController) {
            protectionKeyController.setKeySystems(keySystems);
        }
    }

    instance = {
        initializeForMedia: initializeForMedia,
        createKeySession: createKeySession,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        setMediaElement: setMediaElement,
        setSessionType: setSessionType,
        setRobustnessLevel: setRobustnessLevel,
        setProtectionData: setProtectionData,
        getSupportedKeySystemsFromContentProtection: getSupportedKeySystemsFromContentProtection,
        getKeySystems: getKeySystems,
        setKeySystems: setKeySystems,
        stop: stop,
        reset: reset
    };

    setup();
    return instance;
}

ProtectionController.__dashjs_factory_name = 'ProtectionController';
export default dashjs.FactoryMaker.getClassFactory(ProtectionController); /* jshint ignore:line */
