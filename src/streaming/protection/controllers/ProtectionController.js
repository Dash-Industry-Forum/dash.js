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
import Events from '../../../core/events/Events';
import MediaCapability from '../vo/MediaCapability';
import KeySystemConfiguration from '../vo/KeySystemConfiguration';
import FactoryMaker from '../../../core/FactoryMaker';
import Protection from '../Protection';

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

    let protectionKeyController = config.protectionKeyController;
    let protectionModel = config.protectionModel;
    let adapter = config.adapter;
    let eventBus = config.eventBus;
    let log = config.log;

    let instance,
        keySystems,
        pendingNeedKeyData,
        audioInfo,
        videoInfo,
        protDataSet,
        initialized,
        sessionType,
        robustnessLevel,
        keySystem;

    function setup() {
        keySystems = protectionKeyController.getKeySystems();
        pendingNeedKeyData = [];
        initialized = false;
        sessionType = 'temporary';
        robustnessLevel = '';

        Events.extend(Protection.events);
    }

    /**
     * Initialize this protection system with a given manifest and optional audio
     * and video stream information.
     *
     * @param {Object} manifest the json version of the manifest XML document for the
     * desired content.  Applications can download their manifest using
     * {@link module:MediaPlayer#retrieveManifest}
     * @param {StreamInfo} [aInfo] audio stream information
     * @param {StreamInfo} [vInfo] video stream information
     * @memberof module:ProtectionController
     * @instance
     * @todo This API will change when we have better support for allowing applications
     * to select different adaptation sets for playback.  Right now it is clunky for
     * applications to create {@link StreamInfo} with the right information,
     */
    function initialize(manifest, aInfo, vInfo) {

        // TODO: We really need to do much more here... We need to be smarter about knowing
        // which adaptation sets for which we have initialized, including the default key ID
        // value from the ContentProtection elements so we know whether or not we still need to
        // select key systems and acquire keys.
        if (!initialized) {

            var streamInfo;

            if (!aInfo && !vInfo) {
                // Look for ContentProtection elements.  InitData can be provided by either the
                // dash264drm:Pssh ContentProtection format or a DRM-specific format.
                streamInfo = adapter.getStreamsInfo(manifest)[0]; // TODO: Single period only for now. See TODO above
            }

            audioInfo = aInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, 'audio') : null);
            videoInfo = vInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, 'video') : null);

            var mediaInfo = (videoInfo) ? videoInfo : audioInfo; // We could have audio or video only

            // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
            // and video will be the same.  Just use one valid MediaInfo object
            var supportedKS = protectionKeyController.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
            if (supportedKS && supportedKS.length > 0) {
                selectKeySystem(supportedKS, true);
            }

            initialized = true;
        }
    }

    /**
     * Create a new key session associated with the given initialization data from
     * the MPD or from the PSSH box in the media
     *
     * @param {ArrayBuffer} initData the initialization data
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     * @todo In older versions of the EME spec, there was a one-to-one relationship between
     * initialization data and key sessions.  That is no longer true in the latest APIs.  This
     * API will need to modified (and a new "generateRequest(keySession, initData)" API created)
     * to come up to speed with the latest EME standard
     */
    function createKeySession(initData) {
        var initDataForKS = CommonEncryption.getPSSHForKeySystem(keySystem, initData);
        if (initDataForKS) {

            // Check for duplicate initData
            var currentInitData = protectionModel.getAllInitData();
            for (var i = 0; i < currentInitData.length; i++) {
                if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
                    log('DRM: Ignoring initData because we have already seen it!');
                    return;
                }
            }
            try {
                protectionModel.createKeySession(initDataForKS, sessionType);
            } catch (error) {
                eventBus.trigger(Events.KEY_SESSION_CREATED, {data: null, error: 'Error creating key session! ' + error.message});
            }
        } else {
            eventBus.trigger(Events.KEY_SESSION_CREATED, {data: null, error: 'Selected key system is ' + keySystem.systemString + '.  needkey/encrypted event contains no initData corresponding to that key system!'});
        }
    }

    /**
     * Loads a key session with the given session ID from persistent storage.  This
     * essentially creates a new key session
     *
     * @param {string} sessionID
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     */
    function loadKeySession(sessionID) {
        protectionModel.loadKeySession(sessionID);
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
     */
    function removeKeySession(sessionToken) {
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
     */
    function closeKeySession(sessionToken) {
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
        if (element) {
            protectionModel.setMediaElement(element);
            eventBus.on(Events.NEED_KEY, onNeedKey, this);
            eventBus.on(Events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
        } else if (element === null) {
            protectionModel.setMediaElement(element);
            eventBus.off(Events.NEED_KEY, onNeedKey, this);
            eventBus.off(Events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
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
     */
    function setProtectionData(data) {
        protDataSet = data;
    }

    /**
     * Destroys all protection data associated with this protection set.  This includes
     * deleting all key sessions.  In the case of persistent key sessions, the sessions
     * will simply be unloaded and not deleted.  Additionally, if this protection set is
     * associated with a HTMLMediaElement, it will be detached from that element.
     *
     * @memberof module:ProtectionController
     * @instance
     */
    function reset() {
        setMediaElement(null);

        keySystem = undefined;//TODO-Refactor look at why undefined is needed for this. refactor

        if (protectionModel) {
            protectionModel.reset();
            protectionModel = null;
        }
    }

    ///////////////
    // Private
    ///////////////

    function getProtData(keySystem) {
        var protData = null;
        var keySystemString = keySystem.systemString;

        if (protDataSet) {
            protData = (keySystemString in protDataSet) ? protDataSet[keySystemString] : null;
        }
        return protData;
    }

    function selectKeySystem(supportedKS, fromManifest) {

        var self = this;

        // Build our request object for requestKeySystemAccess
        var audioCapabilities = [];
        var videoCapabilities = [];

        if (videoInfo) {
            videoCapabilities.push(new MediaCapability(videoInfo.codec, robustnessLevel));
        }
        if (audioInfo) {
            audioCapabilities.push(new MediaCapability(audioInfo.codec, robustnessLevel));
        }
        var ksConfig = new KeySystemConfiguration(
                audioCapabilities, videoCapabilities, 'optional',
                (sessionType === 'temporary') ? 'optional' : 'required',
                [sessionType]);
        var requestedKeySystems = [];

        var ksIdx;
        if (keySystem) {
            // We have a key system
            for (ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                if (keySystem === supportedKS[ksIdx].ks) {

                    requestedKeySystems.push({ks: supportedKS[ksIdx].ks, configs: [ksConfig]});

                    // Ensure that we would be granted key system access using the key
                    // system and codec information
                    let onKeySystemAccessComplete = function (event) {
                        eventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                        if (event.error) {
                            if (!fromManifest) {
                                eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {error: 'DRM: KeySystem Access Denied! -- ' + event.error});
                            }
                        } else {
                            log('DRM: KeySystem Access Granted');
                            eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: event.data});
                            createKeySession(supportedKS[ksIdx].initData);
                        }
                    };
                    eventBus.on(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
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
            for (var i = 0; i < supportedKS.length; i++) {
                requestedKeySystems.push({ks: supportedKS[i].ks, configs: [ksConfig]});
            }

            var keySystemAccess;
            var onKeySystemAccessComplete = function (event) {
                eventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                if (event.error) {
                    keySystem = undefined;
                    eventBus.off(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);

                    if (!fromManifest) {
                        eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: null, error: 'DRM: KeySystem Access Denied! -- ' + event.error});
                    }
                } else {
                    keySystemAccess = event.data;
                    log('DRM: KeySystem Access Granted (' + keySystemAccess.keySystem.systemString + ')!  Selecting key system...');
                    protectionModel.selectKeySystem(keySystemAccess);
                }
            };
            var onKeySystemSelected = function (event) {
                eventBus.off(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                eventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                if (!event.error) {
                    keySystem = protectionModel.getKeySystem();
                    eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: keySystemAccess});
                    for (var i = 0; i < pendingNeedKeyData.length; i++) {
                        for (ksIdx = 0; ksIdx < pendingNeedKeyData[i].length; ksIdx++) {
                            if (keySystem === pendingNeedKeyData[i][ksIdx].ks) {
                                createKeySession(pendingNeedKeyData[i][ksIdx].initData);
                                break;
                            }
                        }
                    }
                } else {
                    keySystem = undefined;
                    if (!fromManifest) {
                        eventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: null, error: 'DRM: Error selecting key system! -- ' + event.error});
                    }
                }
            };
            eventBus.on(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
            eventBus.on(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
            protectionModel.requestKeySystemAccess(requestedKeySystems);
        } else {
            // We are in the process of selecting a key system, so just save the data
            pendingNeedKeyData.push(supportedKS);
        }
    }

    function sendLicenseRequestCompleteEvent(data, error) {
        eventBus.trigger(Events.LICENSE_REQUEST_COMPLETE, {data: data, error: error});
    }

    function onKeyMessage(e) {
        log('DRM: onKeyMessage');
        if (e.error) {
            log(e.error);
            return;
        }

        // Dispatch event to applications indicating we received a key message
        var keyMessage = e.data;
        eventBus.trigger(Events.KEY_MESSAGE, {data: keyMessage});
        var messageType = (keyMessage.messageType) ? keyMessage.messageType : 'license-request';
        var message = keyMessage.message;
        var sessionToken = keyMessage.sessionToken;
        var protData = getProtData(keySystem);
        var keySystemString = keySystem.systemString;
        var licenseServerData = protectionKeyController.getLicenseServer(keySystem, protData, messageType);
        var eventData = { sessionToken: sessionToken, messageType: messageType };

        // Message not destined for license server
        if (!licenseServerData) {
            log('DRM: License server request not required for this message (type = ' + e.data.messageType + ').  Session ID = ' + sessionToken.getSessionID());
            sendLicenseRequestCompleteEvent(eventData);
            return;
        }

        // Perform any special handling for ClearKey
        if (protectionKeyController.isClearKey(keySystem)) {
            var clearkeys = protectionKeyController.processClearKeyLicenseRequest(protData, message);
            if (clearkeys)  {
                log('DRM: ClearKey license request handled by application!');
                sendLicenseRequestCompleteEvent(eventData);
                protectionModel.updateKeySession(sessionToken, clearkeys);
                return;
            }
        }

        // All remaining key system scenarios require a request to a remote license server
        var xhr = new XMLHttpRequest();

        // Determine license server URL
        var url = null;
        if (protData && protData.serverURL) {
            var serverURL = protData.serverURL;
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
            sendLicenseRequestCompleteEvent(eventData, 'DRM: No license server URL specified!');
            return;
        }

        xhr.open(licenseServerData.getHTTPMethod(messageType), url, true);
        xhr.responseType = licenseServerData.getResponseType(keySystemString, messageType);
        xhr.onload = function () {
            if (this.status == 200) {
                sendLicenseRequestCompleteEvent(eventData);
                protectionModel.updateKeySession(sessionToken,
                        licenseServerData.getLicenseMessage(this.response, keySystemString, messageType));
            } else {
                sendLicenseRequestCompleteEvent(eventData,
                        'DRM: ' + keySystemString + ' update, XHR status is "' + this.statusText + '" (' + this.status +
                        '), expected to be 200. readyState is ' + this.readyState +
                        '.  Response is ' + ((this.response) ? licenseServerData.getErrorResponse(this.response, keySystemString, messageType) : 'NONE'));
            }
        };
        xhr.onabort = function () {
            sendLicenseRequestCompleteEvent(eventData, 'DRM: ' + keySystemString + ' update, XHR aborted. status is "' + this.statusText + '" (' + this.status + '), readyState is ' + this.readyState);
        };
        xhr.onerror = function () {
            sendLicenseRequestCompleteEvent(eventData, 'DRM: ' + keySystemString + ' update, XHR error. status is "' + this.statusText + '" (' + this.status + '), readyState is ' + this.readyState);
        };

        // Set optional XMLHttpRequest headers from protection data and message
        var updateHeaders = function (headers) {
            var key;
            if (headers) {
                for (key in headers) {
                    if ('authorization' === key.toLowerCase()) {
                        xhr.withCredentials = true;
                    }
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
        };
        if (protData) {
            updateHeaders(protData.httpRequestHeaders);
        }
        updateHeaders(keySystem.getRequestHeadersFromMessage(message));

        // Set withCredentials property from protData
        if (protData && protData.withCredentials) {
            xhr.withCredentials = true;
        }

        xhr.send(keySystem.getLicenseRequestFromMessage(message));
    }

    function onNeedKey(event) {
        log('DRM: onNeedKey');
        // Ignore non-cenc initData
        if (event.key.initDataType !== 'cenc') {
            log('DRM:  Only \'cenc\' initData is supported!  Ignoring initData of type: ' + event.key.initDataType);
            return;
        }

        // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
        // Convert to ArrayBuffer
        var abInitData = event.key.initData;
        if (ArrayBuffer.isView(abInitData)) {
            abInitData = abInitData.buffer;
        }

        log('DRM: initData:', String.fromCharCode.apply(null, new Uint8Array(abInitData)));

        var supportedKS = protectionKeyController.getSupportedKeySystems(abInitData, protDataSet);
        if (supportedKS.length === 0) {
            log('DRM: Received needkey event with initData, but we don\'t support any of the key systems!');
            return;
        }

        selectKeySystem(supportedKS, false);
    }

    instance = {
        initialize: initialize,
        createKeySession: createKeySession,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        setMediaElement: setMediaElement,
        setSessionType: setSessionType,
        setRobustnessLevel: setRobustnessLevel,
        setProtectionData: setProtectionData,
        reset: reset
    };

    setup();
    return instance;
}

ProtectionController.__dashjs_factory_name = 'ProtectionController';
export default FactoryMaker.getClassFactory(ProtectionController);
