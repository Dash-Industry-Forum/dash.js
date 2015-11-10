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
import AbrController from '../controllers/AbrController.js';

let DOMStorage = function () {

    var isSupported,
        enableLastBitrateCaching = true,
        enableLastMediaSettingsCaching = true,

        setExpiration = function(expType, ttl) {
            if (ttl !== undefined && !isNaN(ttl) && typeof(ttl) === "number"){
                DOMStorage[expType] = ttl;
            }
        },

        getSavedMediaSettings = function(type) {
            //Checks local storage to see if there is valid, non-expired media settings
            if (!this.isSupported(DOMStorage.STORAGE_TYPE_LOCAL) || !enableLastMediaSettingsCaching) return null;

            var key = DOMStorage["LOCAL_STORAGE_"+type.toUpperCase()+"_SETTINGS_KEY"],
                obj = JSON.parse(localStorage.getItem(key)) || {},
                isExpired = (new Date().getTime() - parseInt(obj.timestamp)) >= DOMStorage.LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION || false,
                settings = obj.settings;

            if (isExpired){
                localStorage.removeItem(key);
                settings = null;
            }

            return settings;
        },

        checkInitialBitrate = function() {
            ['video', 'audio'].forEach(function(value) {
                //first make sure player has not explicitly set a starting bit rate
                if (this.abrController.getInitialBitrateFor(value) === undefined) {
                    //Checks local storage to see if there is valid, non-expired bit rate
                    //hinting from the last play session to use as a starting bit rate. if not,
                    // it uses the default video and audio value in AbrController
                    if (this.isSupported(DOMStorage.STORAGE_TYPE_LOCAL) && enableLastBitrateCaching) {
                        var key = DOMStorage["LOCAL_STORAGE_"+value.toUpperCase()+"_BITRATE_KEY"],
                            obj = JSON.parse(localStorage.getItem(key)) || {},
                            isExpired = (new Date().getTime() - parseInt(obj.timestamp)) >= DOMStorage.LOCAL_STORAGE_BITRATE_EXPIRATION || false,
                            bitrate = parseInt(obj.bitrate);

                        if (!isNaN(bitrate) && !isExpired) {
                            this.abrController.setInitialBitrateFor(value, bitrate);
                            this.log("Last bitrate played for "+value+" was "+bitrate);
                        } else if (isExpired){
                            localStorage.removeItem(key);
                        }
                    }
                    //check again to see if local storage value was set, if not set default value for startup.
                    if (this.abrController.getInitialBitrateFor(value) === undefined) {
                        this.abrController.setInitialBitrateFor(value, AbrController["DEFAULT_"+value.toUpperCase()+"_BITRATE"]);
                    }
                }

            }, this);
        };

    return {
        system: undefined,
        log:undefined,
        checkInitialBitrate:checkInitialBitrate,
        getSavedMediaSettings: getSavedMediaSettings,

        setup: function () {
            this.abrController = AbrController.getInstance();
        },

        enableLastBitrateCaching: function(enable, ttl) {
            enableLastBitrateCaching = enable;
            setExpiration.call(this, "LOCAL_STORAGE_BITRATE_EXPIRATION", ttl);
        },

        enableLastMediaSettingsCaching: function(enable, ttl) {
            enableLastMediaSettingsCaching = enable;
            setExpiration.call(this, "LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION", ttl);
        },

        //type can be local, session
        isSupported: function(type) {
            if (isSupported !== undefined) return isSupported;

            isSupported = false;

            var testKey = '1',
                testValue = "1",
                storage;

            try {
                storage = window[type];
            } catch (error) {
                this.log("Warning: DOMStorage access denied: " + error.message);
                return isSupported;
            }

            if (!storage || (type !== DOMStorage.STORAGE_TYPE_LOCAL && type !== DOMStorage.STORAGE_TYPE_SESSION)) {
                return isSupported;
            }

            /* When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage is available, but trying to call setItem throws an exception.
            http://stackoverflow.com/questions/14555347/html5-localstorage-error-with-safari-quota-exceeded-err-dom-exception-22-an

            Check if the storage can be used
            */
            try {
                storage.setItem(testKey, testValue);
                storage.removeItem(testKey);
                isSupported = true;
            } catch (error) {
                this.log("Warning: DOMStorage is supported, but cannot be used: " + error.message);
            }

            return isSupported;
        }
    };
};

DOMStorage.LOCAL_STORAGE_VIDEO_BITRATE_KEY = "dashjs_vbitrate";
DOMStorage.LOCAL_STORAGE_AUDIO_BITRATE_KEY = "dashjs_abitrate";
DOMStorage.LOCAL_STORAGE_AUDIO_SETTINGS_KEY = "dashjs_asettings";
DOMStorage.LOCAL_STORAGE_VIDEO_SETTINGS_KEY = "dashjs_vsettings";
DOMStorage.LOCAL_STORAGE_BITRATE_EXPIRATION = 360000;
DOMStorage.LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION = 360000;
DOMStorage.STORAGE_TYPE_LOCAL = "localStorage";
DOMStorage.STORAGE_TYPE_SESSION = "sessionStorage";

DOMStorage.prototype = {
    constructor: DOMStorage
};

export default DOMStorage;