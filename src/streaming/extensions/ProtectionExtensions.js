// The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
//
// Copyright (c) 2013, Microsoft Open Technologies, Inc. 
//
// All rights reserved.
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//     -             Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//     -             Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//     -             Neither the name of the Microsoft Open Technologies, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

MediaPlayer.dependencies.ProtectionExtensions = function () {
    "use strict";

    var keySystems = [];
    var clearkeyKeySystem;

    return {
        system: undefined,
        log: undefined,

        /**
         * Setup the key systems available in the player
         */
        setup: function() {
            var keySystem;

            // PlayReady
            keySystem = this.system.getObject("ksPlayReady");
            keySystems.push(keySystem);

            // Widevine
            keySystem = this.system.getObject("ksWidevine");
            keySystems.push(keySystem);

            // ClearKey
            keySystem = this.system.getObject("ksClearKey");
            keySystems.push(keySystem);
            clearkeyKeySystem = keySystem;
        },

        /**
         * Initialize the available key systems
         *
         * @param protectionDataSet object that contains 0 or more ProtectionData
         * objects.  Each one is identified by an attribute name equal to
         * to the unique key system string for the DRM to which it is intended
         */
        init: function(protectionDataSet) {
            var getProtectionData = function(keySystemString) {
                var protData = null;
                if (protectionDataSet) {
                    protData = (keySystemString in protectionDataSet) ? protectionDataSet[keySystemString] : null;
                }
                return protData;
            };

            for (var i = 0; i < keySystems.length; i++) {
                var keySystem = keySystems[i];
                keySystem.init(getProtectionData(keySystem.systemString));
            }
        },

        /**
         * Returns a prioritized list of key systems supported
         * by this player (not necessarily those supported by the
         * user agent)
         *
         * @returns {MediaPlayer.dependencies.protection.KeySystem[]} a prioritized
         * list of key systems
         */
        getKeySystems: function() {
            return keySystems;
        },

        /**
         * Returns the key system associated with the given key system string
         * name (i.e. 'org.w3.clearkey')
         *
         * @param {string} systemString the system string
         * @returns {MediaPlayer.dependencies.protection.KeySystem} the key system
         * or null if no key system is associated with the given key system string
         */
        getKeySystemBySystemString: function(systemString) {
            for (var i = 0; i < keySystems.length; i++) {
                if (keySystems[i].systemString === systemString) {
                    return keySystems[i];
                }
            }
            return null;
        },

        /**
         * Determines whether the given key system is ClearKey.  This is
         * necessary because the EME spec defines ClearKey and its method
         * for providing keys to the key session; and this method has changed
         * between the various API versions.  Our EME-specific ProtectionModels
         * must know if the system is ClearKey so that it can format the keys
         * according to the particular spec version.
         *
         * @param keySystem the key
         */
        isClearKey: function(keySystem) {
            return (keySystem === clearkeyKeySystem);
        },

        /**
         * Returns a set of supported key systems and CENC intialization data
         * from the given array of ContentProtection elements.  Only
         * key systems that are supported by this player will be returned.
         * Key systems are returned in priority order (highest first).
         *
         * This can be called by code that wants to "pre-fetch" keys for media
         * that is not currently being played using DRM-specific ContentProtection
         * element data
         *
         * @param {Object[]} cps array of content protection elements parsed
         * from the manifest
         * @returns {Object[]} array of objects with ks (KeySystem) and
         * initData {ArrayBuffer) properties.  Empty array is returned if no
         * supported key systems were found
         */
        getSupportedKeySystemsFromContentProtection: function(cps) {
            var cp, ks, ksIdx, cpIdx, supportedKS = [];

            for(ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                ks = keySystems[ksIdx];
                for(cpIdx = 0; cpIdx < cps.length; ++cpIdx) {
                    cp = cps[cpIdx];
                    if (cp.schemeIdUri.toLowerCase() === ks.schemeIdURI) {
                        var initData = ks.getInitData(cp);
                        if (!!initData) {
                            supportedKS.push({
                                ks: keySystems[ksIdx],
                                initData: initData
                            });
                        }
                    }
                }
            }
            return supportedKS;
        },

        /**
         * Returns key systems supported by this player for the given PSSH
         * initializationData.  Key systems are returned in priority
         * order (highest priority first)
         *
         * @param {ArrayBuffer} initData Concatenated PSSH data for all DRMs
         * supported by the content
         * @returns {Object[]} array of objects with ks (KeySystem) and
         * initData {ArrayBuffer) properties.  Empty array is returned if no
         * supported key systems were found
         */
        getSupportedKeySystems: function(initData) {
            var ksIdx, supportedKS = [],
                pssh = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);

                    for (ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                if (keySystems[ksIdx].uuid in pssh) {
                    supportedKS.push({
                        ks: keySystems[ksIdx],
                        initData: pssh[keySystems[ksIdx].uuid]
                    });
                        }
                    }
            return supportedKS;
        },

        /**
         * Select a key system by using the priority-ordered key systems supported
         * by the player and the key systems supported by the content
         *
         * @param {MediaPlayer.models.ProtectionModel} protectionModel
         * @param {MediaPlayer.dependencies.ProtectionController} protectionController
         * @param {Object} mediaInfos media information set
         * @param {MediaPlayer.vo.MediaInfo} mediaInfos.video video media information
         * @param {MediaPlayer.vo.MediaInfo} mediaInfos.audio audio media information
         * @param {ArrayBuffer} initData the concatenated set of PSSH data found in
         * the content indicating DRM support for this content
         */
        autoSelectKeySystem: function(protectionModel, protectionController, mediaInfos, initData) {

            // Does the initData contain a key system supported by the player?
            var supportedKS = this.getSupportedKeySystems(initData);
            if (supportedKS.length === 0) {
                throw new Error("DRM system for this content not supported by the player!");
                }

            var ksConfig = new MediaPlayer.vo.protection.KeySystemConfiguration(
                    [new MediaPlayer.vo.protection.MediaCapability(mediaInfos.audio.codec)],
                    [new MediaPlayer.vo.protection.MediaCapability(mediaInfos.video.codec)]);
            var requestedKeySystems = [];
            for (var i = 0; i < supportedKS.length; i++) {
                requestedKeySystems.push({ ks: supportedKS[i].ks, configs: [ksConfig] });
            }

            // Since ProtectionExtensions is a singleton, we need to create an IIFE to wrap the
            // event callback and save the values of protectionModel and protectionController.
            var self = this;
            (function(protMod, protCont) {

                // Callback object for KEY_SYSTEM_ACCESS_COMPLETE event
                var cbObj = {};

                // Subscribe for event and then perform request
                cbObj[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE] = function(event) {
                    protMod.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, this);
                    if (!event.error) {
                        var keySystemAccess = event.data;
                        self.log("KeySystem Access Granted (" + keySystemAccess.keySystem.systemString + ")!");
                        protCont.selectKeySystem(keySystemAccess);
                    } else {
                        self.log(event.error);
            }
                };

                protMod.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_ACCESS_COMPLETE, cbObj);
                protCont.requestKeySystemAccess(requestedKeySystems);

            })(protectionModel, protectionController);
        }
    };
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions
};

