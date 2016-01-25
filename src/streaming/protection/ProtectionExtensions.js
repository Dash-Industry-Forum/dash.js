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
 * @class ProtectionExtensions
 */
import CommonEncryption from './CommonEncryption.js';
import KeySystemClearKey from './drm/KeySystemClearKey.js';
import KeySystemWidevine from './drm/KeySystemWidevine.js';
import KeySystemPlayReady from './drm/KeySystemPlayReady.js';
import DRMToday from './servers/DRMToday.js';
import PlayReady from './servers/PlayReady.js';
import Widevine from './servers/Widevine.js';
import ClearKey from './servers/ClearKey.js';
import FactoryMaker from '../../core/FactoryMaker.js';

function ProtectionExtensions() {

    let context = this.context;

    let instance,
        log,
        keySystems,
        clearkeyKeySystem;

    function setConfig(config) {
        if (!config) return;

        if (config.log) {
            log = config.log;
        }
    }

    function initialize() {
        keySystems = [];

        var keySystem;

        // PlayReady
        keySystem = KeySystemPlayReady(context).getInstance();
        keySystems.push(keySystem);

        // Widevine
        keySystem = KeySystemWidevine(context).getInstance();
        keySystems.push(keySystem);

        // ClearKey
        keySystem = KeySystemClearKey(context).getInstance();
        keySystems.push(keySystem);
        clearkeyKeySystem = keySystem;
    }

    /**
     * Returns a prioritized list of key systems supported
     * by this player (not necessarily those supported by the
     * user agent)
     *
     * @returns {KeySystem[]} a prioritized
     * list of key systems
     */
    function getKeySystems() {
        return keySystems;
    }

    /**
     * Returns the key system associated with the given key system string
     * name (i.e. 'org.w3.clearkey')
     *
     * @param {string} systemString the system string
     * @returns {KeySystem} the key system
     * or null if no supported key system is associated with the given key
     * system string
     */
    function getKeySystemBySystemString(systemString) {
        for (var i = 0; i < keySystems.length; i++) {
            if (keySystems[i].systemString === systemString) {
                return keySystems[i];
            }
        }
        return null;
    }

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
    function isClearKey(keySystem) {
        return (keySystem === clearkeyKeySystem);
    }

    /**
     * Check equality of initData array buffers.
     *
     * @param initData1 {ArrayBuffer} first initData
     * @param initData2 {ArrayBuffer} second initData
     * @returns {boolean} true if the initData arrays are equal in size and
     * contents, false otherwise
     */
    function initDataEquals(initData1, initData2) {
        if (initData1.byteLength === initData2.byteLength) {
            var data1 = new Uint8Array(initData1);
            var data2 = new Uint8Array(initData2);

            for (var j = 0; j < data1.length; j++) {
                if (data1[j] !== data2[j]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

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
     * @returns {KeySystem} Object.ks the key
     * system identified by the ContentProtection element
     * @returns {ArrayBuffer} Object.initData the initialization data parsed
     * from the ContentProtection element
     */
    function getSupportedKeySystemsFromContentProtection(cps) {
        var cp, ks, ksIdx, cpIdx;
        var supportedKS = [];

        if (cps) {
            for (ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                ks = keySystems[ksIdx];
                for (cpIdx = 0; cpIdx < cps.length; ++cpIdx) {
                    cp = cps[cpIdx];
                    if (cp.schemeIdUri.toLowerCase() === ks.schemeIdURI) {

                        // Look for DRM-specific ContentProtection
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
        }
        return supportedKS;
    }

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
     * @returns {KeySystem} Object.ks the key
     * system
     * @returns {ArrayBuffer} Object.initData the initialization data
     * associated with the key system
     */
    function getSupportedKeySystems(initData) {
        var ksIdx;
        var supportedKS = [];
        var pssh = CommonEncryption.parsePSSHList(initData);

        for (ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
            if (keySystems[ksIdx].uuid in pssh) {
                supportedKS.push({
                    ks: keySystems[ksIdx],
                    initData: pssh[keySystems[ksIdx].uuid]
                });
            }
        }
        return supportedKS;
    }

    /**
     * Returns the license server implementation data that should be used for this request.
     *
     * @param {KeySystem} keySystem the key system
     * associated with this license request
     * @param {ProtectionData} protData protection data to use for the
     * request
     * @param {String} [messageType="license-request"] the message type associated with this
     * request.  Supported message types can be found
     * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
     * @return {LicenseServer} the license server
     * implementation that should be used for this request or null if the player should not
     * pass messages of the given type to a license server
     *
     */
    function getLicenseServer(keySystem, protData, messageType) {

        // Our default server implementations do not do anything with "license-release" or
        // "individualization-request" messages, so we just send a success event
        if (messageType === 'license-release' || messageType == 'individualization-request') {
            return null;
        }

        var licenseServerData = null;
        if (protData && protData.hasOwnProperty('drmtoday')) {
            licenseServerData = DRMToday(context).getInstance();
        } else if (keySystem.systemString === 'com.widevine.alpha') {
            licenseServerData = Widevine(context).getInstance();
        } else if (keySystem.systemString === 'com.microsoft.playready') {
            licenseServerData = PlayReady(context).getInstance();
        } else if (keySystem.systemString === 'org.w3.clearkey') {
            licenseServerData = ClearKey(context).getInstance();
        }

        return licenseServerData;
    }

    /**
     * Allows application-specific retrieval of ClearKey keys.
     *
     * @param {ProtectionData} protData protection data to use for the
     * request
     * @param {ArrayBuffer} message the key message from the CDM
     * @return {ClearKeyKeySet} the clear keys associated with
     * the request or null if no keys can be returned by this function
     */
    function processClearKeyLicenseRequest(protData, message) {
        try {
            return clearkeyKeySystem.getClearKeysFromProtectionData(protData, message);
        } catch (error) {
            log('Failed to retrieve clearkeys from ProtectionData');
            return null;
        }
    }

    instance = {
        initialize: initialize,
        isClearKey: isClearKey,
        initDataEquals: initDataEquals,
        getKeySystems: getKeySystems,
        getKeySystemBySystemString: getKeySystemBySystemString,
        getSupportedKeySystemsFromContentProtection: getSupportedKeySystemsFromContentProtection,
        getSupportedKeySystems: getSupportedKeySystems,
        getLicenseServer: getLicenseServer,
        processClearKeyLicenseRequest: processClearKeyLicenseRequest,
        setConfig: setConfig
    };

    return instance;
}

ProtectionExtensions.__dashjs_factory_name = 'ProtectionExtensions';
export default FactoryMaker.getSingletonFactory(ProtectionExtensions);