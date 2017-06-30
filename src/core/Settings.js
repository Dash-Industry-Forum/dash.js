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
import FactoryMaker from './FactoryMaker';
import Utils from './Utils.js';
import Debug from './../core/Debug';

function Settings() {
    let log = Debug(this.context).getInstance().log;

    const defaultSettings = {
        streaming: {
            abandonLoadTimeout: 10000,
            liveDelayFragmentCount: 4,
            liveDelay: NaN,
            setScheduleWhilePaused: true,
            setFastSwitchEnabled: false,
            bufferToKeep: 30,
            bufferPruningInterval: 30,
            stableBufferTime: 12,
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 60,
            longFormContentDurationThreshold: 600,
            richBufferThreshold: 20,
            wallclockTimeUpdateInterval: 50,
            abr: {
                bandwidthSafetyFactor: 0.9,
                useDefaultAbrRules: true,
                useBufferOccupancyAbr: false,
                useDeadTimeLatency: true,
                limitBitrateByPortal: false,
                usePixelLimitInRatioByBitratePortal: false,
                maxBitrate: { audio: NaN, video: NaN },
                minBitrate: { audio: NaN, video: NaN },
                maxRepresentationRatio: { audio: NaN, video: NaN },
                initialBitrate: { audio: NaN, video: NaN },
                initialRepresentationRatio: { audio: NaN, video: NaN },
                autoSwitchBitrate: { audio: false, video: false }
            }
        }
    };

    let settings = Utils.clone(defaultSettings);

    //Merge in the settings. If something exists in the new config that doesn't match the schema of the default config,
    //regard it as an error and log it.
    function mixinSettings(source, dest, path) {
        for (let n in source) {
            if (source.hasOwnProperty(n)) {
                if (dest.hasOwnProperty(n)) {
                    if (typeof source[n] === 'object') {
                        mixinSettings(source[n], dest[n], path.slice() + n + '.');
                    } else {
                        dest[n] = Utils.clone(source[n]);
                    }
                } else {
                    log('Warning: the settings option \'' + path + n + '\' wasn\'t found and will be ignored.');
                    //If you're getting this warning, then the passed in partial object doesn't match whats expected.
                    //Check it against the defaultSettings object.
                }
            }
        }
    }

    function get() {
        return settings;
    }

    // Set something on the settings - settingsObj should be a partial object.
    // If a json object is passed in, update everything that matches the partial object. Anything that does not match the schema
    // of the default object is ignored(and a warning is given).
    function update(settingsObj) {
        if (typeof settingsObj === 'object') {
            mixinSettings(settingsObj, settings, '');
        }
    }

    function reset() {
        settings = Utils.clone(defaultSettings);
    }

    const instance = {
        get: get,
        update: update,
        reset: reset
    };

    return instance;
}


Settings.__dashjs_factory_name = 'Settings';
let factory = FactoryMaker.getSingletonFactory(Settings);
export default factory;
