/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014-2015, Cable Television Laboratories, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Cable Television Laboratories, Inc. nor the names of its
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

MediaPlayer.dependencies.protection.KeySystem_ClearKey = function() {
    "use strict";

    var keySystemStr = "webkit-org.w3.clearkey",
        keySystemUUID = "10000000-0000-0000-0000-000000000000",
        protData,

        /**
         * Request a ClearKey license using PSSH-based message format that allows
         * multiple methodologies for retrieving/storing key information
         *
         * @param message the ClearKey PSSH
         * @param requestData request data to be passed back in the LicenseRequestComplete event
         */
        requestClearKeyLicense = function(message, /*laURL,*/ requestData) {
            var self = this,
                i;

            /* The ClearKey PSSH data format is defined as below:
             *
             * clearkey_pssh_data {
             *   unsigned int (8) type
             *   if (type == 0) {
             *     unsigned int(16)              url_length
             *     unsigned int(8)[url_length]   url (base64-encoded)
             *   }
             *   else if (type == 1) {
             *     unsigned int(8)               num_keys
             *     for (i = 0; i < num_keys; i++) {
             *       unsigned int(8)[16]         key_id
             *       unsigned int(8)[16]         key
             *     }
             *   }
             * }
             */

            var psshData = MediaPlayer.dependencies.protection.CommonEncryption.getPSSHData(message),
                dv = new DataView(psshData.buffer),
                byteCursor = 0,
                ckType,
                keyPairs = [];

            /* Read the ClearKey data type (0=URL, 1=JSON) */
            ckType = dv.getUint8(byteCursor);
            byteCursor += 1;

            /* URL -- Retrieve JWKs from remote server */
            if (ckType === 0) {
                var url,
                    urlB64 = "",
                    urlLen = dv.getUint16(byteCursor);

                byteCursor += 2;

                for (i = 0; i < urlLen; i++) {
                    urlB64 += String.fromCharCode(dv.getUint8(byteCursor+i));
                }
                url = atob(urlB64);
                url = url.replace(/&amp;/, '&');

                var xhr = new XMLHttpRequest();
                xhr.onload = function () {
                    if (xhr.status == 200) {

                        if (!xhr.response.hasOwnProperty("keys")) {
                            self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                    null, new Error('DRM: ClearKey Remote update, Illegal response JSON'));
                        }
                        for (i = 0; i < xhr.reponse.keys.length; i++) {
                            var keypair = xhr.response.keys[i],
                                    keyid = atob(keypair.kid),
                                    key = atob(keypair.k);
                            keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, key));
                        }
                        var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), requestData);
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                event);
                    } else {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                                null, new Error('DRM: ClearKey Remote update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                    }
                };
                xhr.onabort = function () {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new Error('DRM: ClearKey update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };
                xhr.onerror = function () {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new Error('DRM: ClearKey update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };

                xhr.open('GET', url);
                xhr.responseType = 'json';
                xhr.send();
            }
            /* internal -- keys and keyIDs are in the PSSH itself */
            else if (ckType === 1) {
                var numKeys = dv.getUint8(byteCursor);

                byteCursor += 1;

                for (i = 0; i < numKeys; i++) {
                    var keyid, key;
                    keyid = new Uint8Array(psshData.buffer.slice(byteCursor, byteCursor+16));
                    byteCursor += 16;
                    key = new Uint8Array(psshData.buffer.slice(byteCursor, byteCursor+16));
                    byteCursor += 16;
                    keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, key));
                }

                var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs), requestData);
                this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                        event);
            }
            else {
                this.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                        null, new Error('DRM: Illegal ClearKey type: ' + ckType));
            }

        };


    return {

        schemeIdURI: undefined,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        /**
         * Initialize this key system
         *
         * @param protectionData {ProtectionData} data providing overrides for
         * default or CDM-provided values
         */
        init: function(protectionData) {
            this.schemeIdURI = "urn:uuid:" + keySystemUUID;
            protData = protectionData;
        },

        doLicenseRequest: function(message, laURL, requestData) {
            requestClearKeyLicense.call(this, message, requestData);
        },

        getInitData: function(/*cpData*/) { return null; },

        initDataEquals: function(initData1, initData2) {
            if (initData1.length === initData2.length) {
                if (btoa(initData1.buffer) === btoa(initData2.buffer)) {
                    return true;
                }
            }
            return false;
        }
    };
};

MediaPlayer.dependencies.protection.KeySystem_ClearKey.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_ClearKey
};

