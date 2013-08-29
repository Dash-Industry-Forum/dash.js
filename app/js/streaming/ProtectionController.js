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

MediaPlayer.dependencies.ProtectionController = function () {
    "use strict";

    var element = null,
        keySystems = null,

        teardownKeySystem = function (kid) {
            var self = this;
            self.protectionModel.removeKeySystem(kid);
        },

        selectKeySystem = function (codec, contentProtection) {
            var self = this;

            for(var ks = 0; ks < keySystems.length; ++ks) {
                for(var cp = 0; cp < contentProtection.length; ++cp) {
                    if (keySystems[ks].isSupported(contentProtection[cp]) &&
                        self.protectionExt.supportsCodec(keySystems[ks].keysTypeString, codec)) {

                        var kid = self.manifestExt.getKID(contentProtection[cp]);
                        if (!kid) {
                            kid = "unknown";
                        }

                        self.protectionModel.addKeySystem(kid, contentProtection[cp], keySystems[ks]);

                        self.debug.log("DRM: Selected Key System: " + keySystems[ks].keysTypeString + " For KID: " + kid);

                        return kid;
                    }
                }
            }
            throw new Error("DRM: The protection system for this content is not supported.");
        },

        ensureKeySession = function (kid, codec, eventInitData) {
            var self = this,
                session = null,
                initData = null;

            if (!self.protectionModel.needToAddKeySession(kid)) {
                return;
            }

            initData = self.protectionModel.getInitData(kid);

            if (!initData && !!eventInitData) {
                initData = eventInitData;
                self.debug.log("DRM: Using initdata from needskey event. length: " + initData.length);
            }
            else if (!!initData){
                self.debug.log("DRM: Using initdata from prheader in mpd. length: " + initData.length);
            }

            if (!!initData) {
                session = self.protectionModel.addKeySession(kid, codec, initData);
                self.debug.log("DRM: Added Key Session [" + session.sessionId + "] for KID: " + kid + " type: " + codec + " initData length: " + initData.length);
            }
            else {
                self.debug.log("DRM: initdata is null.");
            }
        },

        updateFromMessage = function (kid, session, msg, laURL) {
            var self = this,
                result;
            result = self.protectionModel.updateFromMessage(kid, msg, laURL);
            result.then(
                function (data) {
                    session.update(data);
            });
            return result;
        };

    return {
        system : undefined,
        debug : undefined,
        manifestExt : undefined,
        capabilities : undefined,
        videoModel : undefined,
        protectionModel : undefined,
        protectionExt : undefined,

        setup : function () {
            keySystems = this.protectionExt.getKeySystems();
        },

        init: function (videoModel, protectionModel) {
            this.videoModel = videoModel;
            this.protectionModel = protectionModel;
            element = this.videoModel.getElement();
        },

        selectKeySystem : selectKeySystem,
        ensureKeySession : ensureKeySession,
        updateFromMessage : updateFromMessage,
        teardownKeySystem : teardownKeySystem
    };
};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};
