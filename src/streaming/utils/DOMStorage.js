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
MediaPlayer.utils.DOMStorage = function () {

    var enableLastBitrateCaching = true,
        checkInitialBitrate = function() {
            ['video', 'audio'].forEach(function(value) {
                //first make sure player has not explicitly set a starting bit rate
                if (this.abrController.getInitialBitrateFor(value) === undefined) {
                    //Checks local storage to see if there is valid, non-expired bit rate
                    //hinting from the last play session to use as a starting bit rate. if not,
                    // it uses the default video and audio value in MediaPlayer.dependencies.AbrController
                    if (this.isSupported(MediaPlayer.utils.DOMStorage.STORAGE_TYPE_LOCAL) && enableLastBitrateCaching) {
                        var key = MediaPlayer.utils.DOMStorage["LOCAL_STORAGE_"+value.toUpperCase()+"_BITRATE_KEY"],
                            obj = JSON.parse(localStorage.getItem(key)) || {},
                            isExpired = (new Date().getTime() - parseInt(obj.timestamp)) >= MediaPlayer.utils.DOMStorage.LOCAL_STORAGE_BITRATE_EXPIRATION || false,
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
                        this.abrController.setInitialBitrateFor(value, MediaPlayer.dependencies.AbrController["DEFAULT_"+value.toUpperCase()+"_BITRATE"]);
                    }
                }

            }, this);
        };

    return {
        system: undefined,
        log:undefined,
        abrController: undefined,
        checkInitialBitrate:checkInitialBitrate,
        enableLastBitrateCaching: function(enable, ttl) {
            enableLastBitrateCaching = enable;
            if (ttl !== undefined && !isNaN(ttl) && typeof(ttl) === "number"){
                MediaPlayer.utils.DOMStorage.LOCAL_STORAGE_BITRATE_EXPIRATION = ttl;
            }
        },
        //type can be local, session
        isSupported: function(type) {
            if (type === MediaPlayer.utils.DOMStorage.STORAGE_TYPE_LOCAL) {
                return window.localStorage || false;
            } else if (type === MediaPlayer.utils.DOMStorage.STORAGE_TYPE_SESSION) {
                return window.sessionStorage || false;
            } else {
                return false;
            }
        }

    };
};


MediaPlayer.utils.DOMStorage.LOCAL_STORAGE_VIDEO_BITRATE_KEY = "dashjs_vbitrate";
MediaPlayer.utils.DOMStorage.LOCAL_STORAGE_AUDIO_BITRATE_KEY = "dashjs_abitrate";
MediaPlayer.utils.DOMStorage.LOCAL_STORAGE_BITRATE_EXPIRATION = 360000;
MediaPlayer.utils.DOMStorage.STORAGE_TYPE_LOCAL = "local";
MediaPlayer.utils.DOMStorage.STORAGE_TYPE_SESSION = "session";

MediaPlayer.utils.DOMStorage.prototype = {
    constructor: MediaPlayer.utils.DOMStorage
};