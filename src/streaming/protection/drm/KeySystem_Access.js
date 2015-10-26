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
 * Adobe Access DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */
MediaPlayer.dependencies.protection.KeySystem_Access = function() {
    "use strict";

    var keySystemStr = "com.adobe.primetime",
    keySystemUUID = "f239e769-efa3-4850-9c16-a903c6932efb",

    getPsshUrl = function(cpData) {
        var absUrl = new RegExp('^(?:(?:[a-z]+:)?\/)?\/', 'i'),
        url;

        if (typeof(cpData) !== "undefined" && cpData.pssh && cpData.pssh.uri) {
            url = cpData.pssh.uri;
            if (!absUrl.test(cpData.pssh.uri) && cpData.BaseURL) {
                url = cpData.BaseURL + cpData.pssh.uri;
            }
        }

        return url;
    },

    parseInitDataFromContentProtection = function(cpData) {
        if ("pssh" in cpData && cpData.pssh.uri && cpData.pssh.uri !== "") {

            var xhr = new XMLHttpRequest(),
            url = getPsshUrl(cpData),
            self = this;

            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function() {
                if (this.status == 200) {
                    var event = new MediaPlayer.vo.protection.PsshRequestComplete(this.response, cpData);
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_PSSH_REQUEST_COMPLETE,
                            event);
                } else {
                    self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_PSSH_REQUEST_COMPLETE,
                            {requestData:cpData}, new Error('DRM: Access update, XHR status is "' + xhr.statusText + '" (' + xhr.status +
                                    '), expected to be 200. readyState is ' + xhr.readyState) +
                                    ".  Response is " + ((this.response) ? String.fromCharCode.apply(null, new Uint8Array(this.response)) : "NONE"));
                }
            };
            xhr.onabort = function () {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_PSSH_REQUEST_COMPLETE,
                        {requestData:cpData}, new Error('DRM: Access update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
            };
            xhr.onerror = function () {
                self.notify(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_PSSH_REQUEST_COMPLETE,
                        {requestData:cpData}, new Error('DRM: Access update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
            };

            xhr.send();
            return "pending";
        }
        else {
            return MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection.call(this, cpData);
        }

    };

    return {
        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        getInitData: parseInitDataFromContentProtection,

        getRequestHeadersFromMessage: function(/*message*/) { return null; },

        getLicenseRequestFromMessage: function(message) { return new Uint8Array(message); },

        getLicenseServerURLFromInitData: function(/*initData*/) { return null; },
    };

};

MediaPlayer.dependencies.protection.KeySystem_Access.prototype = {
        constructor: MediaPlayer.dependencies.protection.KeySystem_Access
};

