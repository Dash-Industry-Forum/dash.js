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
MediaPlayer.dependencies.RequestModifierExtensions = function () {
    "use strict";
    return {
        prepareRequest: function(info, data){
            // if no customization needed, then simply return data, or omit this function
            var respdata = {};

            respdata.method = data.method;
            respdata.body = data.body;

            var newUrl = data.url;
            if (!!info.range){
                if ("string" === typeof(info.range)){
                    newUrl += "/range/"+info.range;
                }
                else if ("undefined" !== typeof(info.range.start)) {
                    newUrl += "/ByteRange/"+info.range.start + "-"+info.range.end;
                }
            }

            if (!!window.sessionUriSuffix){
                newUrl += "/SessionMagic/"+window.sessionUriSuffix;
            }
            respdata.url = newUrl;

            var newHeaders = {};
            for (var header in data.headers){
                if ("range" === header.toLowerCase()){
                    // Exclude "range" header in request to server.
                    // Range was passed on URL
                    continue;
                }
                newHeaders[header] = data.headers[header];
            }
            respdata.headers = newHeaders;

            return respdata;
        },
        modifyRequestURL : function (url) {
            return url;
        },

        modifyRequestHeader : function (request) {
            return request;
        }
    };
};
