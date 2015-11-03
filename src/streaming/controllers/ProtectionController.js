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
 * Provides access to media protection information and functionality.  Each
 * ProtectionController manages a single {@link MediaPlayer.models.ProtectionModel}
 * which encapsulates a set of protection information (EME APIs, selected key system,
 * key sessions).  The APIs of ProtectionController mostly align with the latest EME
 * APIs.  Key system selection is mostly automated when combined with app-overrideable
 * functionality provided in {@link ProtectionExtensions}.
 *
 * @class ProtectionController
 * @todo ProtectionController does almost all of its tasks automatically after init() is
 * called.  Applications might want more control over this process and want to go through
 * each step manually (key system selection, session creation, session maintenance).
 */
import KeySystem from '../protection/drm/KeySystem.js';
import ProtectionModel from '../models/ProtectionModel.js';
import CommonEncryption from '../protection/CommonEncryption.js';
import EventBus from '../utils/EventBus.js';
import Events from '../Events.js';
import MediaCapability from '../vo/protection/MediaCapability.js';
import KeySystemConfiguration from '../vo/protection/KeySystemConfiguration.js';

let ProtectionController = function () {
    "use strict";

    var keySystems = null,
        pendingNeedKeyData = [],
        audioInfo,
        videoInfo,
        protDataSet,
        initialized = false,

        getProtData = function(keySystem) {
            var protData = null,
                keySystemString = keySystem.systemString;
            if (protDataSet) {
                protData = (keySystemString in protDataSet) ? protDataSet[keySystemString] : null;
            }
            return protData;
        },

        selectKeySystem = function(supportedKS, fromManifest) {

            var self = this;

            // Build our request object for requestKeySystemAccess
            var audioCapabilities = [], videoCapabilities = [];
            if (videoInfo) {
                videoCapabilities.push(new MediaCapability(videoInfo.codec));
            }
            if (audioInfo) {
                audioCapabilities.push(new MediaCapability(audioInfo.codec));
            }
            var ksConfig = new KeySystemConfiguration(
                    audioCapabilities, videoCapabilities, "optional",
                    (self.sessionType === "temporary") ? "optional" : "required",
                    [self.sessionType]);
            var requestedKeySystems = [];

            var ksIdx;
            if (this.keySystem) {
                // We have a key system
                for (ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                    if (this.keySystem === supportedKS[ksIdx].ks) {

                        requestedKeySystems.push({ks: supportedKS[ksIdx].ks, configs: [ksConfig]});

                        // Ensure that we would be granted key system access using the key
                        // system and codec information
                        let onKeySystemAccessComplete = function(event) {
                            EventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                            if (event.error) {
                                if (!fromManifest) {
                                    EventBus.trigger(Events.KEY_SYSTEM_SELECTED, {error: "DRM: KeySystem Access Denied! -- " + event.error});
                                }
                            } else {
                                self.log("KeySystem Access Granted");
                                EventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: event.data});
                                self.createKeySession(supportedKS[ksIdx].initData);
                            }
                        };
                        EventBus.on(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                        this.protectionModel.requestKeySystemAccess(requestedKeySystems);
                        break;
                    }
                }
            }
            else if (this.keySystem === undefined) {
                // First time through, so we need to select a key system
                this.keySystem = null;
                pendingNeedKeyData.push(supportedKS);

                // Add all key systems to our request list since we have yet to select a key system
                for (var i = 0; i < supportedKS.length; i++) {
                    requestedKeySystems.push({ks: supportedKS[i].ks, configs: [ksConfig]});
                }

                var keySystemAccess;
                var onKeySystemAccessComplete = function(event) {
                    EventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                    if (event.error) {
                        self.keySystem = undefined;
                        EventBus.off(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);

                        if (!fromManifest) {
                            EventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: null, error: "DRM: KeySystem Access Denied! -- " + event.error});
                        }
                    } else {
                        keySystemAccess = event.data;
                        self.log("KeySystem Access Granted (" + keySystemAccess.keySystem.systemString + ")!  Selecting key system...");
                        self.protectionModel.selectKeySystem(keySystemAccess);
                    }
                };
                var onKeySystemSelected = function(event) {
                    EventBus.off(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                    EventBus.off(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                    if (!event.error) {
                        self.keySystem = self.protectionModel.keySystem;
                        EventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: keySystemAccess});
                        for (var i = 0; i < pendingNeedKeyData.length; i++) {
                            for (ksIdx = 0; ksIdx < pendingNeedKeyData[i].length; ksIdx++) {
                                if (self.keySystem === pendingNeedKeyData[i][ksIdx].ks) {
                                    self.createKeySession(pendingNeedKeyData[i][ksIdx].initData);
                                    break;
                                }
                            }
                        }
                    } else {
                        self.keySystem = undefined;
                        if (!fromManifest) {
                            EventBus.trigger(Events.KEY_SYSTEM_SELECTED, {data: null, error: "DRM: Error selecting key system! -- " + event.error});
                        }
                    }
                };
                EventBus.on(Events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                EventBus.on(Events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                this.protectionModel.requestKeySystemAccess(requestedKeySystems);
            } else {
                // We are in the process of selecting a key system, so just save the data
                pendingNeedKeyData.push(supportedKS);
            }
        },

        sendLicenseRequestCompleteEvent = function(data, error) {
            EventBus.trigger(Events.LICENSE_REQUEST_COMPLETE, {data: data, error: error});
        },

        onKeyMessage = function(e) {
            if (e.error) {
                this.log(e.error);
                return;
            }

            // Dispatch event to applications indicating we received a key message
            var keyMessage = e.data;
            EventBus.trigger(Events.KEY_MESSAGE, {data: keyMessage});
            var messageType = (keyMessage.messageType) ? keyMessage.messageType : "license-request",
                message = keyMessage.message,
                sessionToken = keyMessage.sessionToken,
                protData = getProtData(this.keySystem),
                keySystemString = this.keySystem.systemString,
                licenseServerData = this.protectionExt.getLicenseServer(this.keySystem, protData, messageType),
                sendEvent = sendLicenseRequestCompleteEvent.bind(this),
                eventData = { sessionToken: sessionToken, messageType: messageType };

            // Message not destined for license server
            if (!licenseServerData) {
                this.log("DRM: License server request not required for this message (type = " + e.data.messageType + ").  Session ID = " + sessionToken.getSessionID());
                sendEvent(eventData);
                return;
            }

            // Perform any special handling for ClearKey
            if (this.protectionExt.isClearKey(this.keySystem)) {
                var clearkeys = this.protectionExt.processClearKeyLicenseRequest(protData, message);
                if (clearkeys)  {
                    this.log("DRM: ClearKey license request handled by application!");
                    sendEvent(eventData);
                    this.protectionModel.updateKeySession(sessionToken, clearkeys);
                    return;
                }
            }

            // All remaining key system scenarios require a request to a remote license server
            var xhr = new XMLHttpRequest(),
                self = this;

            // Determine license server URL
            var url = null;
            if (protData) {
                if (protData.serverURL) {
                    var serverURL = protData.serverURL;
                    if (typeof serverURL === "string" && serverURL !== "") {
                        url = serverURL;
                    } else if (typeof serverURL === "object" && serverURL.hasOwnProperty(messageType)) {
                        url = serverURL[messageType];
                    }
                } else if (protData.laURL && protData.laURL !== "") { // TODO: Deprecated!
                    url = protData.laURL;
                }
            } else {
                url = this.keySystem.getLicenseServerURLFromInitData(CommonEncryption.getPSSHData(sessionToken.initData));
                if (!url) {
                    url = e.data.laURL;
                }
            }
            // Possibly update or override the URL based on the message
            url = licenseServerData.getServerURLFromMessage(url, message, messageType);

            // Ensure valid license server URL
            if (!url) {
                sendEvent(eventData, 'DRM: No license server URL specified!');
                return;
            }

            xhr.open(licenseServerData.getHTTPMethod(messageType), url, true);
            xhr.responseType = licenseServerData.getResponseType(keySystemString, messageType);
            xhr.onload = function() {
                if (this.status == 200) {
                    sendEvent(eventData);
                    self.protectionModel.updateKeySession(sessionToken,
                            licenseServerData.getLicenseMessage(this.response, keySystemString, messageType));
                } else {
                    sendEvent(eventData,
                            'DRM: ' + keySystemString + ' update, XHR status is "' + this.statusText + '" (' + this.status +
                            '), expected to be 200. readyState is ' + this.readyState +
                            ".  Response is " + ((this.response) ? licenseServerData.getErrorResponse(this.response, keySystemString, messageType) : "NONE"));
                }
            };
            xhr.onabort = function () {
                sendEvent(eventData,
                        'DRM: ' + keySystemString + ' update, XHR aborted. status is "' + this.statusText + '" (' + this.status + '), readyState is ' + this.readyState);
            };
            xhr.onerror = function () {
                sendEvent(eventData,
                        'DRM: ' + keySystemString + ' update, XHR error. status is "' + this.statusText + '" (' + this.status + '), readyState is ' + this.readyState);
            };

            // Set optional XMLHttpRequest headers from protection data and message
            var updateHeaders = function(headers) {
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
            updateHeaders(this.keySystem.getRequestHeadersFromMessage(message));

            // Set withCredentials property from protData
            if (protData && protData.withCredentials) {
                xhr.withCredentials = true;
            }

            xhr.send(this.keySystem.getLicenseRequestFromMessage(message));
        },

        onNeedKey = function (event) {
            // Ignore non-cenc initData
            if (event.key.initDataType !== "cenc") {
                this.log("DRM:  Only 'cenc' initData is supported!  Ignoring initData of type: " + event.key.initDataType);
                return;
            }

            // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
            // Convert to ArrayBuffer
            var abInitData = event.key.initData;
            if (ArrayBuffer.isView(abInitData)) {
                abInitData = abInitData.buffer;
            }

            var supportedKS = this.protectionExt.getSupportedKeySystems(abInitData);
            if (supportedKS.length === 0) {
                this.log("Received needkey event with initData, but we don't support any of the key systems!");
                return;
            }

            selectKeySystem.call(this, supportedKS, false);
        };




    return {
        system : undefined,
        log : undefined,
        protectionExt: undefined,
        keySystem: undefined,
        sessionType: "temporary",

        setup : function () {

            EventBus.on(Events.NEED_KEY, onNeedKey, this);
            EventBus.on(Events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);

            keySystems = this.protectionExt.getKeySystems();
            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init();
        },

        /**
         * Initialize this protection system with a given manifest and optional audio
         * and video stream information.
         *
         * @param {Object} manifest the json version of the manifest XML document for the
         * desired content.  Applications can download their manifest using
         * {@link MediaPlayer#retrieveManifest}
         * @param {StreamInfo} [aInfo] audio stream information
         * @param {StreamInfo} [vInfo] video stream information
         * @memberof ProtectionController
         * @instance
         * @todo This API will change when we have better support for allowing applications
         * to select different adaptation sets for playback.  Right now it is clunky for
         * applications to create {@link StreamInfo} with the right information,
         */
        init: function (manifest, aInfo, vInfo) {

            // TODO: We really need to do much more here... We need to be smarter about knowing
            // which adaptation sets for which we have initialized, including the default key ID
            // value from the ContentProtection elements so we know whether or not we still need to
            // select key systems and acquire keys.
            if (!initialized) {
                var adapter,
                        streamInfo;

                if (!aInfo && !vInfo) {
                    // Look for ContentProtection elements.  InitData can be provided by either the
                    // dash264drm:Pssh ContentProtection format or a DRM-specific format.
                    adapter = this.system.getObject("adapter");
                    streamInfo = adapter.getStreamsInfo(manifest)[0]; // TODO: Single period only for now. See TODO above
                }

                audioInfo = aInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, "audio") : null);
                videoInfo = vInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, "video") : null);

                var mediaInfo = (videoInfo) ? videoInfo : audioInfo; // We could have audio or video only

                // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
                // and video will be the same.  Just use one valid MediaInfo object
                var supportedKS = this.protectionExt.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
                if (supportedKS && supportedKS.length > 0) {
                    selectKeySystem.call(this, supportedKS, true);
                }

                initialized = true;
            }
        },

        /**
         * Destroys all protection data associated with this protection set.  This includes
         * deleting all key sessions.  In the case of persistent key sessions, the sessions
         * will simply be unloaded and not deleted.  Additionally, if this protection set is
         * associated with a HTMLMediaElement, it will be detached from that element.
         *
         * @memberof ProtectionController
         * @instance
         */
        teardown: function() {
            this.setMediaElement(null);
            EventBus.off(Events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);

            this.keySystem = undefined;

            this.protectionModel.teardown();
            this.protectionModel = undefined;
        },

        /**
         * Create a new key session associated with the given initialization data from
         * the MPD or from the PSSH box in the media
         *
         * @param {ArrayBuffer} initData the initialization data
         * @memberof ProtectionController
         * @instance
         * @fires ProtectionController#KeySessionCreated
         * @todo In older versions of the EME spec, there was a one-to-one relationship between
         * initialization data and key sessions.  That is no longer true in the latest APIs.  This
         * API will need to modified (and a new "generateRequest(keySession, initData)" API created)
         * to come up to speed with the latest EME standard
         */
        createKeySession: function(initData) {
            var initDataForKS = CommonEncryption.getPSSHForKeySystem(this.keySystem, initData);
            if (initDataForKS) {

                // Check for duplicate initData
                var currentInitData = this.protectionModel.getAllInitData();
                for (var i = 0; i < currentInitData.length; i++) {
                    if (this.protectionExt.initDataEquals(initDataForKS, currentInitData[i])) {
                        this.log("Ignoring initData because we have already seen it!");
                        return;
                    }
                }
                try {
                    this.protectionModel.createKeySession(initDataForKS, this.sessionType);
                } catch (error) {
                    EventBus.trigger(Events.KEY_SESSION_CREATED, {data:null, error:"Error creating key session! " + error.message});
                }
            } else {
                EventBus.trigger(Events.KEY_SESSION_CREATED, {data:null, error:"Selected key system is " + this.keySystem.systemString + ".  needkey/encrypted event contains no initData corresponding to that key system!"});
            }
        },

        /**
         * Loads a key session with the given session ID from persistent storage.  This
         * essentially creates a new key session
         *
         * @param {string} sessionID
         * @memberof ProtectionController
         * @instance
         * @fires ProtectionController#KeySessionCreated
         */
        loadKeySession: function(sessionID) {
            this.protectionModel.loadKeySession(sessionID);
        },

        /**
         * Removes the given key session from persistent storage and closes the session
         * as if {@link ProtectionController#closeKeySession}
         * was called
         *
         * @param {SessionToken} sessionToken the session
         * token
         * @memberof ProtectionController
         * @instance
         * @fires ProtectionController#KeySessionRemoved
         * @fires ProtectionController#KeySessionClosed
         */
        removeKeySession: function(sessionToken) {
            this.protectionModel.removeKeySession(sessionToken);
        },

        /**
         * Closes the key session and releases all associated decryption keys.  These
         * keys will no longer be available for decrypting media
         *
         * @param {SessionToken} sessionToken the session
         * token
         * @memberof ProtectionController
         * @instance
         * @fires ProtectionController#KeySessionClosed
         */
        closeKeySession: function(sessionToken) {
            this.protectionModel.closeKeySession(sessionToken);
        },

        /**
         * Sets a server certificate for use by the CDM when signing key messages
         * intended for a particular license server.  This will fire
         * an error event if a key system has not yet been selected.
         *
         * @param {ArrayBuffer} serverCertificate a CDM-specific license server
         * certificate
         * @memberof ProtectionController
         * @instance
         * @fires ProtectionController#ServerCertificateUpdated
         */
        setServerCertificate: function(serverCertificate) {
            this.protectionModel.setServerCertificate(serverCertificate);
        },

        /**
         * Associate this protection system with the given HTMLMediaElement.  This
         * causes the system to register for needkey/encrypted events from the given
         * element and provides a destination for setting of MediaKeys
         *
         * @param {HTMLMediaElement} element the media element to which the protection
         * system should be associated
         * @memberof ProtectionController
         * @instance
         */
        setMediaElement: function(element) {
            if (element) {
                this.protectionModel.setMediaElement(element);
                EventBus.on(Events.NEED_KEY, onNeedKey, this);
            } else if (element === null) {
                this.protectionModel.setMediaElement(element);
                EventBus.off(Events.NEED_KEY, onNeedKey, this);
            }
        },

        /**
         * Sets the session type to use when creating key sessions.  Either "temporary" or
         * "persistent-license".  Default is "temporary".
         *
         * @param {String} sessionType the session type
         * @memberof ProtectionController
         * @instance
         */
        setSessionType: function(sessionType) {
            this.sessionType = sessionType;
        },

        /**
         * Attach KeySystem-specific data to use for license acquisition with EME
         *
         * @param {Object} data an object containing property names corresponding to
         * key system name strings (e.g. "org.w3.clearkey") and associated values
         * being instances of {@link ProtectionData}
         * @memberof ProtectionController
         * @instance
         */
        setProtectionData: function(data) {
            protDataSet = data;
        }
    };
};

/**
 * Key system selection event
 *
 * @event ProtectionController#KeySystemSelected
 * @type {Object}
 * @property {KeySystemAccess} data key system
 * access object that describes the selected key system and associated
 * audio/video codecs and CDM capabilities.  May be null if an error occurred
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */

/**
 * Key session creation event
 *
 * @event ProtectionController#KeySessionCreated
 * @type {Object}
 * @property {SessionToken} data the session token
 * that can be used to access certain properties of the session.  Also
 * required for other ProtectionController APIs that act on key sessions.
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */

/**
 * Key session removed event
 *
 * @event ProtectionController#KeySessionRemoved
 * @type {Object}
 * @property {string} data the session ID of the session that was removed
 * from persistent storage
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */

/**
 * Key session closed event
 *
 * @event ProtectionController#KeySessionClosed
 * @type {Object}
 * @property {string} data the session ID of the session that was closed
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */

/**
 * Server certificate updated event
 *
 * @event ProtectionController#ServerCertificateUpdated
 * @type {Object}
 * @property {Object} data unused for this event.  The server certificate update
 * was is successful if the "error" property of this event is null or undefined
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */

/**
 * License request completed event
 *
 * @event ProtectionController#LicenseRequestComplete
 * @type {Object}
 * @property {Object} data The event data.  This data will be provided regardless
 * of the success/failure status of the event
 * @property {SessionToken} data.sessionToken session token
 * associated with this license response.  Will never be null, even in error cases.
 * @property {String} data.messageType the message type associated with this request.
 * Supported message types can be found
 * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @property {string} error if not null, an error occurred and this object
 * will contain an informative error string describing the failure
 */


ProtectionController.prototype = {
    constructor: ProtectionController
};


export default ProtectionController;