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

function PlayerConfig() {
    const defaultConfig = {
        streaming: {
            abr: {
                useDeadTimeLatency: true,
                limitBitrateByPortal: false,
                usePixelLimitInRatioByBitratePortal: false,
                maxBitrate: { audio: NaN, video: NaN },
                minBitrate: { audio: NaN, video: NaN },
                maxRepresentationRatio: { audio: NaN, video: NaN },
                initialBitrate: { audio: NaN, video: NaN },
                initialRepresentationRatio: { audio: NaN, video: NaN},
                autoSwitchBitrate: { audio: false, video: false }
            }
        }
    };

    let config = Utils.clone(defaultConfig);

    //Merge in the config. If something exists in the new config that doesn't match the schema of the default config,
    //regard it as an error and log it.
    function mixinConfig(source, dest, path) {
        for (let n in source) {
            if (source.hasOwnProperty(n)) {
                if (dest.hasOwnProperty(n)) {
                    if (typeof source[n] === 'object') {
                        mixinConfig(source[n], dest[n], path.slice() + n + '.');
                    } else {
                        dest[n] = Utils.clone(source[n]);
                    }
                } else {
                    console.log('Warning: the config option \'' + path + n + '\' wasn\'t found and will be ignored.');
                    //TODO Warn config option doesn't match against default schema
                }
            }
        }
    }

    function get() {
        return config;
    }

    //Set something on the config object.
    //If a json object is passed in, mix it in. Anything unspecified remains the same.
    function set(conf) {
        if (typeof conf === 'object') {
            mixinConfig(conf, config, '');
        }
    }

    function reset() {
        config = Utils.clone(defaultConfig);
    }

    const instance = {
        get: get,
        set: set,
        reset: reset
    };

    return instance;
}


PlayerConfig.__dashjs_factory_name = 'PlayerConfig';
let factory = FactoryMaker.getSingletonFactory(PlayerConfig);
export default factory;
