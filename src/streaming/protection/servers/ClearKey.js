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
 * CableLabs ClearKey license server implementation
 *
 * For testing purposes and evaluating potential uses for ClearKey, we have developed
 * a dirt-simple API for requesting ClearKey licenses from a remote server.
 *
 * @implements MediaPlayer.dependencies.protection.servers.LicenseServer
 * @class
 */
MediaPlayer.dependencies.protection.servers.ClearKey = function() {
    "use strict";

    return {

        getServerURLFromMessage: function(url, message/*, messageType*/) {
            // Build ClearKey server query string
            var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
            url += "/?";
            for (var i = 0; i < jsonMsg.kids.length; i++) {
                url += jsonMsg.kids[i] + "&";
            }
            url = url.substring(0, url.length-1);
            return url;
        },

        getHTTPMethod: function(/*messageType*/) { return 'GET'; },

        getResponseType: function(/*keySystemStr*/) { return 'json'; },

        getLicenseMessage: function(serverResponse/*, keySystemStr, messageType*/) {
            if (!serverResponse.hasOwnProperty("keys")) {
                return null;
            }
            var i, keyPairs = [];
            for (i = 0; i < serverResponse.keys.length; i++) {
                var keypair = serverResponse.keys[i],
                    keyid = keypair.kid.replace(/=/g, ""),
                    key = keypair.k.replace(/=/g, "");
                keyPairs.push(new MediaPlayer.vo.protection.KeyPair(keyid, key));
            }
            return new MediaPlayer.vo.protection.ClearKeyKeySet(keyPairs);
        },

        getErrorResponse: function(serverResponse/*, keySystemStr, messageType*/) {
            return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
        }
    };
};

MediaPlayer.dependencies.protection.servers.ClearKey.prototype = {
    constructor: MediaPlayer.dependencies.protection.servers.ClearKey
};
