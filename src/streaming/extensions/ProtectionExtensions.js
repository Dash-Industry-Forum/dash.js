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
        debug: undefined,

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
         * @returns {KeySystem[]} a prioritized list of key systems
         */
        getKeySystems: function() {
            return keySystems;
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
         * Auto-selects a key system based on initializationData found in
         * the media, initializationData found in the mediaInfo, and the supported
         * key systems of this user agent.  The protectionModel is initialized with
         * the selected key system.
         *
         * @param protectionModel the ProtectionModel
         * @param mediaInfo the media info
         * @param initData initialization data detected in the media
         * @returns selected initialization data that should be used to create
         * a new key session
         */
        autoSelectKeySystem: function(protectionModel, mediaInfo, initData) {
            var ks = null, ksIdx, cpIdx, cp, selectedInitData;

            // Check DRM-specific content protection elements for a DRM we support
            for(ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                for(cpIdx = 0; cpIdx < mediaInfo.contentProtection.length; ++cpIdx) {
                    cp = mediaInfo.contentProtection[cpIdx];
                    if (protectionModel.isSupported(keySystems[ksIdx], mediaInfo.codec) &&
                            cp.schemeIdUri.toLowerCase() === keySystems[ksIdx].schemeIdURI) {
                        selectedInitData = keySystems[ksIdx].getInitData(cp);
                        if (!selectedInitData) {
                            continue;
                        }
                        ks = keySystems[ksIdx];
                        protectionModel.selectKeySystem(ks);
                        break;
                    }
                }
            }

            // Look for ContentProtection element that indicates use of CommonEncryption
            if (!ks ) {
                cp = MediaPlayer.dependencies.protection.CommonEncryption.findCencContentProtection(mediaInfo.contentProtection);

                if (cp) {
                    this.debug.log("CommonEncryption detected in MPD.  Searching initData for supported key systems...");
                    var pssh = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);
                    for (ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                        if (keySystems[ksIdx].uuid in pssh &&
                                protectionModel.isSupported(keySystems[ksIdx], mediaInfo.codec)) {
                            ks = keySystems[ksIdx];
                            selectedInitData = pssh[keySystems[ksIdx].uuid];
                            protectionModel.selectKeySystem(ks);
                            break;
                        }
                    }
                }
            }

            if (!ks) {
                throw new Error("DRM: The protection system for this content is not supported.");
            }

            this.debug.log("Selected key system -- " + ks.systemString);
            return selectedInitData;
        }
    };
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions
};

