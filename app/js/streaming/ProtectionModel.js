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

MediaPlayer.models.ProtectionModel = function () {
    "use strict";

    var element = null,
        keyAddedListener = null,
        keyErrorListener = null,
        keyMessageListener = null,
        keySystems = [];

    return {
        system : undefined,
        videoModel : undefined,
        protectionExt : undefined,

        setup : function () {
            //this.system.mapHandler("setCurrentTime", undefined, handleSetCurrentTimeNotification.bind(this));
            element = this.videoModel.getElement();
        },

        init: function (videoModel) {
            this.videoModel = videoModel;
            element = this.videoModel.getElement();
        },

        addKeySession: function (kid, mediaCodec, initData) {
            var session = null;

            session = this.protectionExt.createSession(keySystems[kid].keys, mediaCodec, initData);

            this.protectionExt.listenToKeyAdded(session, keyAddedListener);
            this.protectionExt.listenToKeyError(session, keyErrorListener);
            this.protectionExt.listenToKeyMessage(session, keyMessageListener);

            keySystems[kid].initData = initData;
            keySystems[kid].keySessions.push(session);

            return session;
        },

        addKeySystem: function (kid, contentProtectionData, keySystemDesc) {
            var keysLocal = null;

            keysLocal = this.protectionExt.createMediaKeys(keySystemDesc.keysTypeString);

            this.protectionExt.setMediaKey(element, keysLocal);

            keySystems[kid] = {
                kID : kid,
                contentProtection : contentProtectionData,
                keySystem : keySystemDesc,
                keys : keysLocal,
                initData : null,
                keySessions : []
            };
        },

        removeKeySystem: function (kid) {
            if (kid !== null && keySystems[kid] !== undefined && keySystems[kid].keySessions.length !== 0) {
                var keySessions = keySystems[kid].keySessions;

                for(var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.unlistenToKeyError(keySessions[kss], keyErrorListener);
                    this.protectionExt.unlistenToKeyAdded(keySessions[kss], keyAddedListener);
                    this.protectionExt.unlistenToKeyMessage(keySessions[kss], keyMessageListener);
                    keySessions[kss].close();
                }

                keySystems[kid] = undefined;
            }
        },

        needToAddKeySession: function (kid) {
            var keySystem = null;
            keySystem = keySystems[kid];
            return keySystem.keySystem.needToAddKeySession(keySystem.initData, keySystem.keySessions);
        },

        getInitData: function (kid) {
            var keySystem = null;
            keySystem = keySystems[kid];
            return keySystem.keySystem.getInitData(keySystem.contentProtection);
        },

        updateFromMessage: function (kid, msg, laURL) {
            return keySystems[kid].keySystem.getUpdate(msg, laURL);
        },
/*
        addKey: function (type, key, data, id) {
            this.protectionExt.addKey(element, type, key, data, id);
        },

        generateKeyRequest: function(type, data) {
            this.protectionExt.webkitGenerateKeyRequest(element, type, data);
        },
*/
        listenToNeedKey: function(listener) {
            this.protectionExt.listenToNeedKey(this.videoModel, listener);
        },

        listenToKeyError: function(listener) {
            keyErrorListener = listener;

            for(var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;

                for(var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyError(keySessions[kss], listener);
                }
            }
        },

        listenToKeyMessage: function(listener) {
            keyMessageListener = listener;

            for(var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;

                for(var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyMessage(keySessions[kss], listener);
                }
            }
        },

        listenToKeyAdded: function(listener) {
            keyAddedListener = listener;

            for(var ks = 0; ks < keySystems.length; ++ks) {
                var keySessions = keySystems[ks].keySessions;

                for(var kss = 0; kss < keySessions.length; ++kss) {
                    this.protectionExt.listenToKeyAdded(keySessions[kss], listener);
                }
            }
        }
    };
};

MediaPlayer.models.ProtectionModel.prototype = {
    constructor: MediaPlayer.models.ProtectionModel
};