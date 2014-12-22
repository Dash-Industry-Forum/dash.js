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

MediaPlayer.dependencies.protection.KeySystem_Widevine = function() {
    "use strict";

    var keySystemStr = "com.widevine.alpha",
        keySystemUUID = "edef8ba9-79d6-4ace-a3c8-27dcd51d21ed",
        protData,

        requestLicense = function(message, laURL, requestData) {
            var xhr = new XMLHttpRequest(),
                headers = {},
                key,
                headerOverrides,
                headerName,
                url,
                self = this;

            url = (protData && protData.laURL && protData.laURL !== "") ? protData.laURL : laURL;
            if (!url) {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                    null, new Error('DRM: No valid Widevine Proxy Server URL specified!'));
            } else {
                xhr.open('POST', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function() {
                    if (this.status == 200) {
                        var event = new MediaPlayer.vo.protection.LicenseRequestComplete(new Uint8Array(this.response), requestData);
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            event);
                    } else {
                        self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                            null, new Error('DRM: widevine update, XHR status is "' + xhr.statusText + '" (' + xhr.status +
                                        '), expected to be 200. readyState is ' + xhr.readyState) +
                                        ".  Response is " + ((this.response) ? String.fromCharCode.apply(null, new Uint8Array(this.response)) : "NONE"));
                    }
                };
                xhr.onabort = function () {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                        null, new Error('DRM: widevine update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };
                xhr.onerror = function () {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE,
                        null, new Error('DRM: widevine update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
                };

                headerOverrides = (protData) ? protData.httpRequestHeaders: null;
                if (headerOverrides) {
                    for (key in headerOverrides) {
                        headers[key] = headerOverrides[key];
                    }
                }

                for (headerName in headers) {
                    if ('authorization' === headerName.toLowerCase()) {
                        xhr.withCredentials = true;
                    }

                    xhr.setRequestHeader(headerName, headers[headerName]);
                }

                xhr.send(message);
            }
        },

        /* TODO: Implement me */
        parseInitDataFromContentProtection = function(/*cpData*/) {
            return null;
        },

        /* TODO: Implement me */
        isInitDataEqual = function(/*initData1, initData2*/) {
            return false;
        };

    return {

        schemeIdURI: "urn:uuid:" + keySystemUUID,
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
            protData = protectionData;
        },

        doLicenseRequest: requestLicense,

        getInitData: parseInitDataFromContentProtection,

        initDataEquals: isInitDataEqual
    };
};

MediaPlayer.dependencies.protection.KeySystem_Widevine.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_Widevine
};

