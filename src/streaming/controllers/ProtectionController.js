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
MediaPlayer.dependencies.ProtectionController = function () {
    "use strict";

    var keySystems = null,
        pendingNeedKeyData = [],
        pendingLicenseRequests = [],
        audioInfo,
        videoInfo,
        protDataSet,

        getProtData = function(keySystem) {
            var protData = null,
                keySystemString = keySystem.systemString;
            if (protDataSet) {
                protData = (keySystemString in protDataSet) ? protDataSet[keySystemString] : null;
            }
            return protData;
        },

        selectKeySystem = function(supportedKS, notifyOnError) {

            var self = this;

            // Build our request object for requestKeySystemAccess
            var audioCapabilities = [], videoCapabilities = [];
            if (videoInfo) {
                videoCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(videoInfo.codec));
            }
            if (audioInfo) {
                audioCapabilities.push(new MediaPlayer.vo.protection.MediaCapability(audioInfo.codec));
            }
            var ksConfig = new MediaPlayer.vo.protection.KeySystemConfiguration(
                    audioCapabilities, videoCapabilities);
            var requestedKeySystems = [];

            var ksIdx;
            if (this.keySystem) {
                // We have a key system
                for (ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                    if (this.keySystem === supportedKS[ksIdx].ks) {

                        requestedKeySystems.push({ks: supportedKS[ksIdx].ks, configs: [ksConfig]});

                        // Ensure that we would be granted key system access using the key
                        // system and codec information
                        var ksAccess = {};
                        ksAccess[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = function(event) {
                            if (event.error) {
                                if (notifyOnError) {
                                    self.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                                            "DRM: KeySystem Access Denied! -- " + event.error);
                                }
                            } else {
                                self.log("KeySystem Access Granted");
                                self.createKeySession(supportedKS[ksIdx].initData);
                            }
                        };
                        this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, ksAccess, undefined, true);
                        this.requestKeySystemAccess(requestedKeySystems);
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

                var ksSelected = {};
                ksSelected[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = function(event) {
                    if (event.error) {
                        self.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected);
                        if (notifyOnError) {
                            self.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                                    "DRM: KeySystem Access Denied! -- " + event.error);
                        }
                    } else {
                        var keySystemAccess = event.data;
                        self.log("KeySystem Access Granted (" + keySystemAccess.keySystem.systemString + ")!  Selecting key system...");
                        self.selectKeySystem(keySystemAccess);
                    }
                };
                ksSelected[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = function(event) {
                    if (!event.error) {
                        pendingNeedKeyData = [];
                        self.keySystem = self.protectionModel.keySystem;
                        self.protectionExt.subscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, self);
                        for (var i = 0; i < pendingNeedKeyData.length; i++) {
                            for (ksIdx = 0; ksIdx < pendingNeedKeyData[i].length; ksIdx++) {
                                if (self.keySystem === pendingNeedKeyData[i][ksIdx].ks) {
                                    self.createKeySession(pendingNeedKeyData[i][ksIdx].initData);
                                    break;
                                }
                            }
                        }
                    } else {
                        if (notifyOnError) {
                            self.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                                    "DRM: Error selecting key system! -- " + event.error);
                        }
                    }
                };
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, ksSelected, undefined, true);
                this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, ksSelected, undefined, true);

                this.requestKeySystemAccess(requestedKeySystems);
            } else {
                // We are in the process of selecting a key system, so just save the data
                pendingNeedKeyData.push(supportedKS);
            }
        },

        onKeyMessage = function(e) {
            if (e.error) {
                this.log(e.error);
            } else {
                var keyMessageEvent = e.data;
                pendingLicenseRequests.push(keyMessageEvent.sessionToken);
                this.protectionExt.requestLicense(this.keySystem, getProtData(this.keySystem),
                    keyMessageEvent.message, keyMessageEvent.defaultURL,
                    keyMessageEvent.sessionToken);
            }
        },

        onLicenseRequestComplete = function(e) {
            // Determine if this event is for us
            var i, sessionToken = (e.error) ? e.data : e.data.requestData;
            for (i = 0; i < pendingLicenseRequests.length; i++) {
                if (pendingLicenseRequests[i] === sessionToken) {
                    pendingLicenseRequests.splice(i, 1);

                    // It is for us, now process the event
                    if (!e.error) {
                        this.log("DRM: License request successful.  Session ID = " + e.data.requestData.getSessionID());
                        this.updateKeySession(sessionToken, e.data.message);
                    } else {
                        this.log("DRM: License request failed! -- " + e.error);
                    }

                    break;
                }
            }
        },

        onNeedKey = function (event) {
            // Ignore non-cenc initData
            if (event.data.initDataType !== "cenc") {
                this.log("DRM:  Only 'cenc' initData is supported!  Ignoring initData of type: " + event.data.initDataType);
                return;
            }

            // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
            // Convert to ArrayBuffer
            var abInitData = event.data.initData;
            if (ArrayBuffer.isView(abInitData)) {
                abInitData = abInitData.buffer;
            }

            var supportedKS = this.protectionExt.getSupportedKeySystems(abInitData);
            if (supportedKS.length === 0) {
                this.log("Received needkey event with initData, but we don't support any of the key systems!");
                return;
            }

            selectKeySystem.call(this, supportedKS, true);
        },

        onServerCertificateUpdated = function(event) {
            if (!event.error) {
                this.log("DRM: License server certificate successfully updated.");
            } else {
                this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                        "DRM: Failed to update license server certificate. -- " + event.error);
            }
        },

        onKeySessionCreated = function(event) {
            if (!event.error) {
                this.log("DRM: Session created.  SessionID = " + event.data.getSessionID());
            } else {
                this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                        "DRM: Failed to create key session. -- " + event.error);
            }
        },

        onKeyAdded = function (/*event*/) {
            this.log("DRM: Key added.");
        },

        onKeyError = function (event) {
            this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                    "DRM: MediaKeyError - sessionId: " + event.data.sessionToken.getSessionID() + ".  " + event.data.error);
        },

        onKeySessionClosed = function(event) {
            if (!event.error) {
                this.log("DRM: Session closed.  SessionID = " + event.data);
            } else {
                this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                        "DRM Failed to close key session. -- " + event.error);
            }
        },

        onKeySessionRemoved = function(event) {
            if (!event.error) {
                this.log("DRM: Session removed.  SessionID = " + event.data);
            } else {
                this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR,
                        "DRM: Failed to remove key session. -- " + event.error);
            }
        };

    return {
        system : undefined,
        log : undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        protectionExt: undefined,
        keySystem: undefined,
        sessionType: "temporary",

        setup : function () {
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE] = onKeyMessage.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY] = onNeedKey.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED] = onServerCertificateUpdated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED] = onKeyAdded.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR] = onKeyError.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED] = onKeySessionCreated.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED] = onKeySessionClosed.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED] = onKeySessionRemoved.bind(this);
            this[MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE] = onLicenseRequestComplete.bind(this);

            keySystems = this.protectionExt.getKeySystems();
            this.protectionModel = this.system.getObject("protectionModel");
            this.protectionModel.init();

            // Subscribe to events
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_NEED_KEY, this);
        },

        init: function (manifest, aInfo, vInfo) {

            var adapter,
                streamInfo;

            if (!aInfo && !vInfo) {
                // Look for ContentProtection elements.  InitData can be provided by either the
                // dash264drm:Pssh ContentProtection format or a DRM-specific format.
                adapter = this.system.getObject("adapter");
                streamInfo = adapter.getStreamsInfo(manifest)[0]; // TODO: Single period only for now.
            }

            audioInfo = aInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, "audio") : null);
            videoInfo = vInfo || (streamInfo ? adapter.getMediaInfoForType(manifest, streamInfo, "video") : null);

            var mediaInfo = (videoInfo) ? videoInfo : audioInfo; // We could have audio or video only

            // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
            // and video will be the same.  Just use one valid MediaInfo object
            var supportedKS = this.protectionExt.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
            if (supportedKS && supportedKS.length > 0) {
                selectKeySystem.call(this, supportedKS, false);
            }
        },

        teardown: function() {
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            if (this.keySystem) {
                this.protectionExt.unsubscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
            }

            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_SERVER_CERTIFICATE_UPDATED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ADDED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_ERROR, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CREATED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_CLOSED, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SESSION_REMOVED, this);
            this.keySystem = undefined;

            this.protectionModel.teardown();
            this.protectionModel = undefined;
        },

        requestKeySystemAccess: function(ksConfiguration) {
            this.protectionModel.requestKeySystemAccess(ksConfiguration);
        },

        selectKeySystem: function(keySystemAccess) {
            if (this.keySystem) {
                throw new Error("DRM: KeySystem already selected!");
            }
            this.protectionModel.selectKeySystem(keySystemAccess);
        },

        createKeySession: function(initData) {
            var initDataForKS = MediaPlayer.dependencies.protection.CommonEncryption.getPSSHForKeySystem(this.keySystem, initData);
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
                    this.notify(MediaPlayer.dependencies.ProtectionController.eventList.ENAME_PROTECTION_ERROR, "Error creating key session! " + error.message);
                }
            } else {
                this.log("Selected key system is " + this.keySystem.systemString + ".  needkey/encrypted event contains no initData corresponding to that key system!");
            }
        },

        updateKeySession: function(sessionToken, message) {
            this.protectionModel.updateKeySession(sessionToken, message);
        },

        loadKeySession: function(sessionID) {
            this.protectionModel.loadKeySession(sessionID);
        },

        removeKeySession: function(sessionToken) {
            this.protectionModel.removeKeySession(sessionToken);
        },

        closeKeySession: function(sessionToken) {
            this.protectionModel.closeKeySession(sessionToken);
        },

        setServerCertificate: function(serverCertificate) {
            this.protectionModel.setServerCertificate(serverCertificate);
        },

        setMediaElement: function(element) {
            this.protectionModel.setMediaElement(element);
        },

        setSessionType: function(sessionType) {
            this.sessionType = sessionType;
        },

        /**
         * Attach KeySystem-specific data to use for License Acquisition with EME
         *
         * @param data and object containing property names corresponding to key
         * system name strings and associated values being instances of
         * MediaPlayer.vo.protection.ProtectionData
         */
        setProtectionData: function(data) {
            protDataSet = data;
        }
    };

};

MediaPlayer.dependencies.ProtectionController.eventList = {
    ENAME_PROTECTION_ERROR: "protectionError"
};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};


