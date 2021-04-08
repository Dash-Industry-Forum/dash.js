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

import KeyPair from '../vo/KeyPair';
import ClearKeyKeySet from '../vo/ClearKeyKeySet';
import CommonEncryption from '../CommonEncryption';
import ProtectionConstants from '../../constants/ProtectionConstants';

const uuid = 'e2719d58-a985-b3c9-781a-b030af78d30e';
const systemString = ProtectionConstants.CLEARKEY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemClearKey(config) {

    config = config || {};
    let instance;
    const BASE64 = config.BASE64;
    const LICENSE_SERVER_MANIFEST_CONFIGURATIONS = {
        attributes: ['Laurl', 'laurl'],
        prefixes: ['clearkey', 'dashif']
    };

    /**
     * Returns desired clearkeys (as specified in the CDM message) from protection data
     *
     * @param {ProtectionData} protectionData the protection data
     * @param {ArrayBuffer} message the ClearKey CDM message
     * @returns {ClearKeyKeySet} the key set or null if none found
     * @throws {Error} if a keyID specified in the CDM message was not found in the
     * protection data
     * @memberof KeySystemClearKey
     */
    function getClearKeysFromProtectionData(protectionData, message) {
        let clearkeySet = null;
        if (protectionData) {
            // ClearKey is the only system that does not require a license server URL, so we
            // handle it here when keys are specified in protection data
            const jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
            const keyPairs = [];
            for (let i = 0; i < jsonMsg.kids.length; i++) {
                const clearkeyID = jsonMsg.kids[i];
                const clearkey = (protectionData.clearkeys && protectionData.clearkeys.hasOwnProperty(clearkeyID)) ? protectionData.clearkeys[clearkeyID] : null;
                if (!clearkey) {
                    throw new Error('DRM: ClearKey keyID (' + clearkeyID + ') is not known!');
                }
                // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
                keyPairs.push(new KeyPair(clearkeyID, clearkey));
            }
            clearkeySet = new ClearKeyKeySet(keyPairs);
        }
        return clearkeySet;
    }

    function getInitData(cp, cencContentProtection) {
        try {
            let initData = CommonEncryption.parseInitDataFromContentProtection(cp, BASE64);

            if (!initData && cencContentProtection) {
                const cencDefaultKid = cencDefaultKidToBase64Representation(cencContentProtection['cenc:default_KID']);
                const data = {kids: [cencDefaultKid]};
                initData = new TextEncoder().encode(JSON.stringify(data));
            }

            return initData;
        } catch (e) {
            return null;
        }
    }

    function cencDefaultKidToBase64Representation(cencDefaultKid) {
        try {
            let kid = cencDefaultKid.replace(/-/g, '');
            kid = btoa(kid.match(/\w{2}/g).map((a) => {
                return String.fromCharCode(parseInt(a, 16));
            }).join(''));
            return kid.replace(/=/g, '');
        } catch (e) {
            return null;
        }
    }

    function getRequestHeadersFromMessage(/*message*/) {
        // Set content type to application/json by default
        return {
            'Content-Type': 'application/json'
        };
    }

    function getLicenseRequestFromMessage(message) {
        return JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
    }

    function getLicenseServerURLFromInitData(/*initData*/) {
        return null;
    }

    function getLicenseServerUrlFromMediaInfo(mediaInfo) {
        try {
            if (!mediaInfo || mediaInfo.length === 0) {
                return null;
            }
            let i = 0;
            let licenseServer = null;
            while (i < mediaInfo.length && !licenseServer) {
                const info = mediaInfo[i];
                if (info && info.contentProtection && info.contentProtection.length > 0) {
                    const clearkeyProtData = info.contentProtection.filter((cp) => {
                        return cp.schemeIdUri && cp.schemeIdUri === schemeIdURI;
                    });
                    if (clearkeyProtData && clearkeyProtData.length > 0) {
                        let j = 0;
                        while (j < clearkeyProtData.length && !licenseServer) {
                            const ckData = clearkeyProtData[j];
                            let k = 0;
                            while (k < LICENSE_SERVER_MANIFEST_CONFIGURATIONS.attributes.length && !licenseServer) {
                                let l = 0;
                                const attribute = LICENSE_SERVER_MANIFEST_CONFIGURATIONS.attributes[k];
                                while (l < LICENSE_SERVER_MANIFEST_CONFIGURATIONS.prefixes.length && !licenseServer) {
                                    const prefix = LICENSE_SERVER_MANIFEST_CONFIGURATIONS.prefixes[l];
                                    if (ckData[attribute] && ckData[attribute].__prefix && ckData[attribute].__prefix === prefix && ckData[attribute].__text) {
                                        licenseServer = ckData[attribute].__text;
                                    }
                                    l += 1;
                                }
                                k += 1;
                            }
                            j += 1;
                        }
                    }
                }
                i += 1;
            }
            return licenseServer;
        } catch
            (e) {
            return null;
        }
    }

    function getCDMData() {
        return null;
    }

    function getSessionId(/*cp*/) {
        return null;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        getCDMData: getCDMData,
        getSessionId: getSessionId,
        getLicenseServerUrlFromMediaInfo,
        getClearKeysFromProtectionData: getClearKeysFromProtectionData
    };

    return instance;
}

KeySystemClearKey.__dashjs_factory_name = 'KeySystemClearKey';
export default dashjs.FactoryMaker.getSingletonFactory(KeySystemClearKey); /* jshint ignore:line */
