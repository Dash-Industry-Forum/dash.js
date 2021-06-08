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
import {THUMBNAILS_SCHEME_ID_URIS} from '../thumbnail/ThumbnailTracks';
import Constants from '../constants/Constants';

const codecCompatibilityTable = [
    {
        'codec': 'avc1',
        'compatibleCodecs': ['avc3']
    },
    {
        'codec': 'avc3',
        'compatibleCodecs': ['avc1']
    }
];

export function supportsMediaSource() {
    let hasWebKit = ('WebKitMediaSource' in window);
    let hasMediaSource = ('MediaSource' in window);

    return (hasWebKit || hasMediaSource);
}

function Capabilities() {

    let instance,
        settings,
        encryptedMediaSupported;

    function setup() {
        encryptedMediaSupported = false;
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.settings) {
            settings = config.settings;
        }
    }

    /**
     * Returns whether Encrypted Media Extensions are supported on this
     * user agent
     *
     * @return {boolean} true if EME is supported, false otherwise
     */
    function supportsEncryptedMedia() {
        return encryptedMediaSupported;
    }

    /**
     *
     * @param {boolean} value
     */
    function setEncryptedMediaSupported(value) {
        encryptedMediaSupported = value;
    }

    /**
     * Check if a codec is supported by the MediaSource. We use the MediaCapabilities API or the MSE to check.
     * @param {object} config
     * @param {string} type
     * @return {Promise<boolean>}
     */
    function supportsCodec(config, type) {

        if (type !== Constants.AUDIO && type !== Constants.VIDEO) {
            return Promise.resolve(true);
        }

        if (_canUseMediaCapabilitiesApi(config, type)) {
            return _checkCodecWithMediaCapabilities(config, type);
        }

        return _checkCodecWithMse(config);
    }

    /**
     * MediaCapabilitiesAPI throws an error if one of the attribute is missing. We only use it if we have all required information.
     * @param {object} config
     * @param {string} type
     * @return {*|boolean|boolean}
     * @private
     */
    function _canUseMediaCapabilitiesApi(config, type) {

        return settings.get().streaming.capabilities.useMediaCapabilitiesApi && navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo && ((config.codec && type === Constants.AUDIO) || (type === Constants.VIDEO && config.codec && config.width && config.height && config.bitrate && config.framerate));
    }

    /**
     * Check codec support using the MSE
     * @param {object} config
     * @return {Promise<void> | Promise<boolean>}
     * @private
     */
    function _checkCodecWithMse(config) {
        return new Promise((resolve) => {
            if (!config || !config.codec) {
                resolve(false);
                return;
            }

            let codec = config.codec;
            if (config.width && config.height) {
                codec += ';width="' + config.width + '";height="' + config.height + '"';
            }

            if ('MediaSource' in window && MediaSource.isTypeSupported(codec)) {
                resolve(true);
                return;
            } else if ('WebKitMediaSource' in window && WebKitMediaSource.isTypeSupported(codec)) {
                resolve(true);
                return;
            }

            resolve(false);
        });

    }

    /**
     * Check codec support using the MediaCapabilities API
     * @param {object} config
     * @param {string} type
     * @return {Promise<boolean>}
     * @private
     */
    function _checkCodecWithMediaCapabilities(config, type) {
        return new Promise((resolve) => {

            if (!config || !config.codec) {
                resolve(false);
                return;
            }

            const configuration = {
                type: 'media-source'
            };

            configuration[type] = {};
            configuration[type].contentType = config.codec;
            configuration[type].width = config.width;
            configuration[type].height = config.height;
            configuration[type].bitrate = parseInt(config.bitrate);
            configuration[type].framerate = parseFloat(config.framerate);

            navigator.mediaCapabilities.decodingInfo(configuration)
                .then((result) => {
                    resolve(result.supported);
                })
                .catch(() => {
                    resolve(false);
                });
        });
    }

    /**
     * Check if a specific EssentialProperty is supported
     * @param {object} ep
     * @return {boolean}
     */
    function supportsEssentialProperty(ep) {
        try {
            return THUMBNAILS_SCHEME_ID_URIS.indexOf(ep.schemeIdUri) !== -1;
        } catch (e) {
            return true;
        }
    }

    /**
     * Check if the root of the old codec is the same as the new one, or if it's declared as compatible in the compat table
     * @param {string} codec1
     * @param {string} codec2
     * @return {boolean}
     */
    function codecRootCompatibleWithCodec(codec1, codec2) {
        const codecRoot = codec1.split('.')[0];
        const rootCompatible = codec2.indexOf(codecRoot) === 0;
        let compatTableCodec;
        for (let i = 0; i < codecCompatibilityTable.length; i++) {
            if (codecCompatibilityTable[i].codec === codecRoot) {
                compatTableCodec = codecCompatibilityTable[i];
                break;
            }
        }
        if (compatTableCodec) {
            return rootCompatible || compatTableCodec.compatibleCodecs.some((compatibleCodec) => codec2.indexOf(compatibleCodec) === 0);
        }
        return rootCompatible;
    }

    instance = {
        setConfig,
        supportsMediaSource,
        supportsEncryptedMedia,
        supportsCodec,
        setEncryptedMediaSupported,
        supportsEssentialProperty,
        codecRootCompatibleWithCodec
    };

    setup();

    return instance;
}

Capabilities.__dashjs_factory_name = 'Capabilities';
export default FactoryMaker.getSingletonFactory(Capabilities);
