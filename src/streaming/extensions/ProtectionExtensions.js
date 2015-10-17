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
 * Media protection functionality that can be modified/overridden by applications
 *
 * @class MediaPlayer.dependencies.ProtectionExtensions
 */
MediaPlayer.dependencies.ProtectionExtensions = function () {
    "use strict";

    this.system = undefined;
    this.log = undefined;
    this.keySystems = [];
    this.notify = undefined;
    this.subscribe = undefined;
    this.unsubscribe = undefined;

    this.clearkeyKeySystem = undefined;
};

MediaPlayer.dependencies.ProtectionExtensions.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionExtensions,

    /**
     * Setup the key systems available in the player
     */
    setup: function() {
        var keySystem;

        // PlayReady
        keySystem = this.system.getObject("ksPlayReady");
        this.keySystems.push(keySystem);

        // Widevine
        keySystem = this.system.getObject("ksWidevine");
        this.keySystems.push(keySystem);

        // Primetime
        keySystem = this.system.getObject("ksPrimetime");
        this.keySystems.push(keySystem);

        // ClearKey
        keySystem = this.system.getObject("ksClearKey");
        this.keySystems.push(keySystem);
        this.clearkeyKeySystem = keySystem;
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
        return this.keySystems;
    },

    /**
     * Returns the key system associated with the given key system string
     * name (i.e. 'org.w3.clearkey')
     *
     * @param {string} systemString the system string
     * @returns {MediaPlayer.dependencies.protection.KeySystem} the key system
     * or null if no supported key system is associated with the given key
     * system string
     */
    getKeySystemBySystemString: function(systemString) {
        for (var i = 0; i < this.keySystems.length; i++) {
            if (this.keySystems[i].systemString === systemString) {
                return this.keySystems[i];
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
     * @returns {boolean} true if this is the ClearKey key system, false
     * otherwise
     */
    isClearKey: function(keySystem) {
        return (keySystem === this.clearkeyKeySystem);
    },

    /**
     * Check equality of initData array buffers.
     *
     * @param initData1 {ArrayBuffer} first initData
     * @param initData2 {ArrayBuffer} second initData
     * @returns {boolean} true if the initData arrays are equal in size and
     * contents, false otherwise
     */
    initDataEquals: function(initData1, initData2) {
        if (initData1.byteLength === initData2.byteLength) {
            var data1 = new Uint8Array(initData1),
                data2 = new Uint8Array(initData2);
            for (var j = 0; j < data1.length; j++) {
                if (data1[j] !== data2[j]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    },

    /**
     * Returns a set of supported key systems and CENC intialization data
     * from the given array of ContentProtection elements.  Only
     * key systems that are supported by this player will be returned.
     * Key systems are returned in priority order (highest first).
     *
     * @param {Object[]} cps array of content protection elements parsed
     * from the manifest
     * @returns {Object[]} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @returns {MediaPlayer.dependencies.protection.KeySystem} Object.ks the key
     * system identified by the ContentProtection element
     * @returns {ArrayBuffer} Object.initData the initialization data parsed
     * from the ContentProtection element
     */
    getSupportedKeySystemsFromContentProtection: function(cps) {
        var cp, ks, ksIdx, cpIdx, supportedKS = [];

        if (cps) {
            for(ksIdx = 0; ksIdx < this.keySystems.length; ++ksIdx) {
                ks = this.keySystems[ksIdx];
                for(cpIdx = 0; cpIdx < cps.length; ++cpIdx) {
                    cp = cps[cpIdx];
                    if (cp.schemeIdUri.toLowerCase() === ks.schemeIdURI) {

                        // Look for DRM-specific ContentProtection
                        var initData = ks.getInitData(cp);
                        if (!!initData) {
                            supportedKS.push({
                                ks: this.keySystems[ksIdx],
                                initData: initData
                            });
                        }
                    }
                }
            }
        }
        return supportedKS;
    },

    /**
     * Returns key systems supported by this player for the given PSSH
     * initializationData. Only key systems supported by this player
     * will be returned.  Key systems are returned in priority order
     * (highest priority first)
     *
     * @param {ArrayBuffer} initData Concatenated PSSH data for all DRMs
     * supported by the content
     * @returns {Object[]} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @returns {MediaPlayer.dependencies.protection.KeySystem} Object.ks the key
     * system
     * @returns {ArrayBuffer} Object.initData the initialization data
     * associated with the key system
     */
    getSupportedKeySystems: function(initData) {
        var ksIdx, supportedKS = [],
                pssh = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);

        for (ksIdx = 0; ksIdx < this.keySystems.length; ++ksIdx) {
            if (this.keySystems[ksIdx].uuid in pssh) {
                supportedKS.push({
                    ks: this.keySystems[ksIdx],
                    initData: pssh[this.keySystems[ksIdx].uuid]
                });
            }
        }
        return supportedKS;
    },

    /**
     * Returns the license server implementation data that should be used for this request.
     *
     * @param {MediaPlayer.dependencies.protection.KeySystem} keySystem the key system
     * associated with this license request
     * @param {MediaPlayer.vo.protection.ProtectionData} protData protection data to use for the
     * request
     * @param {String} [messageType="license-request"] the message type associated with this
     * request.  Supported message types can be found
     * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
     * @return {MediaPlayer.dependencies.protection.servers.LicenseServer} the license server
     * implementation that should be used for this request or null if the player should not
     * pass messages of the given type to a license server
     *
     */
    getLicenseServer: function(keySystem, protData, messageType) {

        // Our default server implementations do not do anything with "license-release"
        // messages, so we just send a success event
        if (messageType === "license-release") {
            return null;
        }

        var licenseServerData = null;
        if (protData && protData.hasOwnProperty("drmtoday")) {
            licenseServerData = this.system.getObject("serverDRMToday");
        } else if (keySystem.systemString === "com.widevine.alpha") {
            licenseServerData = this.system.getObject("serverWidevine");
        } else if (keySystem.systemString === "com.adobe.primetime") {
            licenseServerData = this.system.getObject("serverPrimetime");
        } else if (keySystem.systemString === "com.microsoft.playready") {
            licenseServerData = this.system.getObject("serverPlayReady");
        } else if (keySystem.systemString === "org.w3.clearkey") {
            licenseServerData = this.system.getObject("serverClearKey");
        }

        return licenseServerData;
    },

    /**
     * Allows application-specific retrieval of ClearKey keys.
     *
     * @param {MediaPlayer.vo.protection.ProtectionData} protData protection data to use for the
     * request
     * @param {ArrayBuffer} message the key message from the CDM
     * @return {MediaPlayer.vo.protection.ClearKeyKeySet} the clear keys associated with
     * the request or null if no keys can be returned by this function
     */
    processClearKeyLicenseRequest: function(protData, message) {
        try {
            return MediaPlayer.dependencies.protection.KeySystem_ClearKey.getClearKeysFromProtectionData(protData, message);
        } catch (error) {
            this.log("Failed to retrieve clearkeys from ProtectionData");
            return null;
        }
    }
};

