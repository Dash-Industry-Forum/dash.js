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
MediaPlayer.dependencies.ProtectionController = function () {
    "use strict";

    var keySystems = null,

        onKeyMessage = function(e) {
            if (e.error) {
                this.log(e.error);
            } else {
                var keyMessageEvent = e.data;
                this.protectionModel.keySystem.doLicenseRequest(keyMessageEvent.message,
                    keyMessageEvent.defaultURL, keyMessageEvent.sessionToken);
            }
        },

        onLicenseRequestComplete = function(e) {
            if (!e.error) {
                this.log("DRM: License request successful.  Session ID = " + e.data.requestData.getSessionID());
                this.updateKeySession(e.data.requestData, e.data.message);
            } else {
                this.log("DRM: License request failed! -- " + e.error);
            }
        },

        onKeySystemSelected = function() {
            this.protectionModel.keySystem.subscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
        };

    return {
        system : undefined,
        log : undefined,
        protectionExt: undefined,

        setup : function () {
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE] = onKeyMessage.bind(this);
            this[MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED] = onKeySystemSelected.bind(this);
            this[MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE] = onLicenseRequestComplete.bind(this);
        },

        init: function (protectionModel) {
            this.protectionModel = protectionModel;
            keySystems = this.protectionExt.getKeySystems();
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            this.protectionModel.subscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
        },

        teardown: function() {
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_MESSAGE, this);
            this.protectionModel.unsubscribe(MediaPlayer.models.ProtectionModel.eventList.ENAME_KEY_SYSTEM_SELECTED, this);
            if (this.protectionModel.keySystem) {
                this.protectionModel.keySystem.unsubscribe(MediaPlayer.dependencies.protection.KeySystem.eventList.ENAME_LICENSE_REQUEST_COMPLETE, this);
            }
        },

        requestKeySystemAccess: function(ksConfiguration) {
            this.protectionModel.requestKeySystemAccess(ksConfiguration);
        },

        selectKeySystem: function(keySystemAccess) {
            if (this.protectionModel.keySystem) {
                throw new Error("DRM: KeySystem already selected!");
            }
            this.protectionModel.selectKeySystem(keySystemAccess);
        },

        createKeySession: function(initData, sessionType) {
            this.protectionModel.createKeySession(initData, sessionType);
        },

        updateKeySession: function(sessionToken, message) {
            this.protectionModel.updateKeySession(sessionToken, message);
        },

        loadKeySession: function(sessionID) {
            this.protectionModel.loadKeySession(sessionID);
        },

        removeKeySession: function(sessionToken) {
            this.protectionModel.removeKeySession(sessionToken);
        },

        closeKeySession: function(sessionToken) {
            this.protectionModel.closeKeySession(sessionToken);
        },

        setServerCertificate: function(serverCertificate) {
            this.protectionModel.setServerCertificate(serverCertificate);
        }
    };

};

MediaPlayer.dependencies.ProtectionController.prototype = {
    constructor: MediaPlayer.dependencies.ProtectionController
};


