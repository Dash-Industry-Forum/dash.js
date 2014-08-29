/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, Akamai Technologies
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.utils.TokenAuthentication = function () {
    "use strict";
    var tokenAuthentication = {type:MediaPlayer.utils.TokenAuthentication.TYPE_QUERY};
    return {
        debug:undefined,
        getTokenAuthentication:function () {

            return tokenAuthentication;

        },
        setTokenAuthentication:function (object) {

            tokenAuthentication = object;

        },
        checkRequestHeaderForToken:function(request) {

            if (tokenAuthentication.name !== undefined &&
                request.getResponseHeader(tokenAuthentication.name) !== null) {

                tokenAuthentication.token = request.getResponseHeader(tokenAuthentication.name);
                this.debug.log(tokenAuthentication.name+" received: " + tokenAuthentication.token);

           }
        },
        addTokenAsQueryArg:function(url) {

            if(tokenAuthentication.name !== undefined && tokenAuthentication.token !== undefined) {
                if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_QUERY) {

                    var modifier = url.indexOf('?') === -1 ? '?' : '&';
                    url += modifier + tokenAuthentication.name +"=" + tokenAuthentication.token;
                    this.debug.log(tokenAuthentication.name+" is being appended on the request url with a value of : " + tokenAuthentication.token);

                }
            }

            return url;
        },
        setTokenInRequestHeader:function(request) {

            if (tokenAuthentication.type === MediaPlayer.utils.TokenAuthentication.TYPE_HEADER) {

                request.setRequestHeader(tokenAuthentication.name, tokenAuthentication.token);
                this.debug.log(tokenAuthentication.name+" is being set in the request header with a value of : " + tokenAuthentication.token);

            }

            return request;
        }
    };
};

MediaPlayer.utils.TokenAuthentication.TYPE_QUERY = "query";
MediaPlayer.utils.TokenAuthentication.TYPE_HEADER = "header";