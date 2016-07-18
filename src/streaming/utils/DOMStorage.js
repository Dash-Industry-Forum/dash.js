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
import FactoryMaker from '../../core/FactoryMaker';
import MediaPlayerModel from '../models/MediaPlayerModel';
import Debug from '../../core/Debug';

const legacyKeysAndReplacements = [
    { oldKey: 'dashjs_vbitrate',  newKey: 'dashjs_video_bitrate' },
    { oldKey: 'dashjs_abitrate',  newKey: 'dashjs_audio_bitrate' },
    { oldKey: 'dashjs_vsettings', newKey: 'dashjs_video_settings' },
    { oldKey: 'dashjs_asettings', newKey: 'dashjs_audio_settings' }
];

const LOCAL_STORAGE_BITRATE_KEY_TEMPLATE = 'dashjs_?_bitrate';
const LOCAL_STORAGE_SETTINGS_KEY_TEMPLATE = 'dashjs_?_settings';

const STORAGE_TYPE_LOCAL = 'localStorage';
const STORAGE_TYPE_SESSION = 'sessionStorage';

function DOMStorage() {

    let context = this.context;
    let log = Debug(context).getInstance().log;

    let instance,
        supported,
        mediaPlayerModel;

    //type can be local, session
    function isSupported(type) {
        if (supported !== undefined) return supported;

        supported = false;

        var testKey = '1';
        var testValue = '1';
        var storage;

        try {
            if (typeof window !== 'undefined') {
                storage = window[type];
            }
        } catch (error) {
            log('Warning: DOMStorage access denied: ' + error.message);
            return supported;
        }

        if (!storage || (type !== STORAGE_TYPE_LOCAL && type !== STORAGE_TYPE_SESSION)) {
            return supported;
        }

        /* When Safari (OS X or iOS) is in private browsing mode, it appears as though localStorage is available, but trying to call setItem throws an exception.
         http://stackoverflow.com/questions/14555347/html5-localstorage-error-with-safari-quota-exceeded-err-dom-exception-22-an

         Check if the storage can be used
         */
        try {
            storage.setItem(testKey, testValue);
            storage.removeItem(testKey);
            supported = true;
        } catch (error) {
            log('Warning: DOMStorage is supported, but cannot be used: ' + error.message);
        }

        return supported;
    }

    function translateLegacyKeys() {
        if (isSupported(STORAGE_TYPE_LOCAL)) {
            legacyKeysAndReplacements.forEach(entry => {
                const value = localStorage.getItem(entry.oldKey);

                if (value) {
                    localStorage.removeItem(entry.oldKey);

                    try {
                        localStorage.setItem(entry.newKey, value);
                    } catch (e) {
                        log(e.message);
                    }
                }
            });
        }
    }

    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();

        translateLegacyKeys();
    }

    // Return current epoch time, ms, rounded to the nearest 10m to avoid fingerprinting user
    function getTimestamp() {
        let ten_minutes_ms = 60 * 1000 * 10;
        return Math.round(new Date().getTime() / ten_minutes_ms) * ten_minutes_ms;
    }

    function canStore(storageType, key) {
        return isSupported(storageType) && mediaPlayerModel['get' + key + 'CachingInfo']().enabled;
    }

    function getSavedMediaSettings(type) {
        //Checks local storage to see if there is valid, non-expired media settings
        if (!canStore(STORAGE_TYPE_LOCAL, 'LastMediaSettings')) return null;

        var key = LOCAL_STORAGE_SETTINGS_KEY_TEMPLATE.replace(/\?/, type);
        var obj = JSON.parse(localStorage.getItem(key)) || {};
        var isExpired = (new Date().getTime() - parseInt(obj.timestamp, 10)) >= mediaPlayerModel.getLastMediaSettingsCachingInfo().ttl || false;
        var settings = obj.settings;

        if (isExpired) {
            localStorage.removeItem(key);
            settings = null;
        }

        return settings;
    }

    function getSavedBitrateSettings(type) {
        let savedBitrate = NaN;
        //Checks local storage to see if there is valid, non-expired bit rate
        //hinting from the last play session to use as a starting bit rate.
        if (canStore(STORAGE_TYPE_LOCAL, 'LastBitrate')) {
            var key = LOCAL_STORAGE_BITRATE_KEY_TEMPLATE.replace(/\?/, type);
            var obj = JSON.parse(localStorage.getItem(key)) || {};
            var isExpired = (new Date().getTime() - parseInt(obj.timestamp, 10)) >= mediaPlayerModel.getLastBitrateCachingInfo().ttl || false;
            var bitrate = parseInt(obj.bitrate, 10);

            if (!isNaN(bitrate) && !isExpired) {
                savedBitrate = bitrate;
                log('Last saved bitrate for ' + type + ' was ' + bitrate);
            } else if (isExpired) {
                localStorage.removeItem(key);
            }
        }
        return savedBitrate;
    }

    function setSavedMediaSettings(type, value) {
        if (canStore(STORAGE_TYPE_LOCAL, 'LastMediaSettings')) {
            let key = LOCAL_STORAGE_SETTINGS_KEY_TEMPLATE.replace(/\?/, type);
            try {
                localStorage.setItem(key, JSON.stringify({settings: value, timestamp: getTimestamp()}));
            } catch (e) {
                log(e.message);
            }
        }
    }

    function setSavedBitrateSettings(type, bitrate) {
        if (canStore(STORAGE_TYPE_LOCAL, 'LastBitrate') && bitrate) {
            let key = LOCAL_STORAGE_BITRATE_KEY_TEMPLATE.replace(/\?/, type);
            try {
                localStorage.setItem(key, JSON.stringify({bitrate: bitrate / 1000, timestamp: getTimestamp()}));
            } catch (e) {
                log(e.message);
            }
        }
    }

    instance = {
        getSavedBitrateSettings: getSavedBitrateSettings,
        setSavedBitrateSettings: setSavedBitrateSettings,
        getSavedMediaSettings: getSavedMediaSettings,
        setSavedMediaSettings: setSavedMediaSettings,
        isSupported: isSupported
    };

    setup();
    return instance;
}

DOMStorage.__dashjs_factory_name = 'DOMStorage';
let factory = FactoryMaker.getSingletonFactory(DOMStorage);
export default factory;
