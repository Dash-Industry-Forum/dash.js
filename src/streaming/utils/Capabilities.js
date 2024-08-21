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
import FactoryMaker from '../../core/FactoryMaker.js';
import Constants from '../constants/Constants.js';
import ProtectionConstants from '../constants/ProtectionConstants.js';

export function supportsMediaSource() {
    let hasManagedMediaSource = ('ManagedMediaSource' in window)
    let hasWebKit = ('WebKitMediaSource' in window);
    let hasMediaSource = ('MediaSource' in window);

    return (hasManagedMediaSource || hasWebKit || hasMediaSource);
}

function Capabilities() {

    let instance,
        settings,
        protectionController,
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

        if (config.protectionController) {
            protectionController = config.protectionController;
        }
    }

    function setProtectionController(data) {
        protectionController = data;
    }

    function areKeyIdsUsable(mediaInfo) {
        if (!protectionController || !mediaInfo || !mediaInfo.normalizedKeyIds || mediaInfo.normalizedKeyIds.size === 0) {
            return true
        }

        return protectionController.areKeyIdsUsable(mediaInfo.normalizedKeyIds)
    }

    function areKeyIdsExpired(mediaInfo) {
        if (!protectionController || !mediaInfo || !mediaInfo.normalizedKeyIds || mediaInfo.normalizedKeyIds.size === 0) {
            return false
        }

        return protectionController.areKeyIdsExpired(mediaInfo.normalizedKeyIds)
    }

    function isProtectionCompatible(previousStreamInfo, newStreamInfo) {
        if (!newStreamInfo) {
            return true;
        }
        return !(!previousStreamInfo.isEncrypted && newStreamInfo.isEncrypted);
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

            // eslint-disable-next-line no-undef
            if ('ManagedMediaSource' in window && ManagedMediaSource.isTypeSupported(codec)) {
                resolve(true);
                return;
            } else if ('MediaSource' in window && MediaSource.isTypeSupported(codec)) {
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
     * @param {object} inputConfig
     * @param {string} type
     * @return {Promise<boolean>}
     * @private
     */
    function _checkCodecWithMediaCapabilities(inputConfig, type) {
        return new Promise((resolve) => {

            if (!inputConfig || !inputConfig.codec || (inputConfig.isSupported === false)) {
                resolve(false);
                return;
            }

            const genericMediaCapabilitiesConfiguration = _getGenericMediaCapabilitiesConfig(inputConfig, type);
            const configurationsToTest = _enhanceGenericConfigurationWithKeySystemConfiguration(genericMediaCapabilitiesConfiguration, inputConfig, type)
            const promises = configurationsToTest.map((configuration) => {
                return navigator.mediaCapabilities.decodingInfo(configuration)
            })

            Promise.allSettled(promises)
                .then((results) => {
                    const isSupported = results.some((singleResult) => {
                        return singleResult.status === 'fulfilled' && singleResult.value && singleResult.value.supported
                    })
                    resolve(isSupported);
                })
        });
    }

    function _getGenericMediaCapabilitiesConfig(inputConfig, type) {
        let configuration

        if (type === Constants.VIDEO) {
            configuration = _getGenericMediaCapabilitiesVideoConfig(inputConfig)
        } else if (type === Constants.AUDIO) {
            configuration = _getGenericMediaCapabilitiesAudioConfig(inputConfig)
        }

        configuration[type].contentType = inputConfig.codec;
        configuration[type].bitrate = parseInt(inputConfig.bitrate);
        configuration.type = 'media-source';

        return configuration
    }

    function _getGenericMediaCapabilitiesVideoConfig(inputConfig) {
        const configuration = {
            video: {}
        };

        configuration.video.width = inputConfig.width;
        configuration.video.height = inputConfig.height;
        configuration.video.framerate = parseFloat(inputConfig.framerate);
        if (inputConfig.hdrMetadataType) {
            configuration.video.hdrMetadataType = inputConfig.hdrMetadataType;
        }
        if (inputConfig.colorGamut) {
            configuration.video.colorGamut = inputConfig.colorGamut;
        }
        if (inputConfig.transferFunction) {
            configuration.video.transferFunction = inputConfig.transferFunction;
        }

        return configuration
    }

    function _getGenericMediaCapabilitiesAudioConfig(inputConfig) {
        const configuration = {
            audio: {}
        };

        if (inputConfig.samplerate) {
            configuration.audio.samplerate = inputConfig.samplerate;
        }

        return configuration
    }

    function _enhanceGenericConfigurationWithKeySystemConfiguration(genericMediaCapabilitiesConfiguration, inputConfig, type) {
        if (!inputConfig || !inputConfig.keySystemsMetadata || inputConfig.keySystemsMetadata.length === 0) {
            return [genericMediaCapabilitiesConfiguration];
        }

        return inputConfig.keySystemsMetadata.map((keySystemMetadata) => {
            const curr = { ...genericMediaCapabilitiesConfiguration };
            if (keySystemMetadata.ks) {
                curr.keySystemConfiguration = {};
                if (keySystemMetadata.ks.systemString) {
                    curr.keySystemConfiguration.keySystem = keySystemMetadata.ks.systemString;
                }
                if (keySystemMetadata.ks.systemString === ProtectionConstants.WIDEVINE_KEYSTEM_STRING) {
                    curr.keySystemConfiguration[type] = { robustness: ProtectionConstants.ROBUSTNESS_STRINGS.WIDEVINE.SW_SECURE_CRYPTO };

                }
            }
            return curr
        })
    }

    /**
     * Add additional descriptors to list of descriptors,
     * avoid duplicated entries
     * @param {array} props
     * @param {array} newProps
     * @return {array}
     * @private
     */
    function _addProperties(props, newProps) {
        props = props.filter(p => {
            return !(p.schemeIdUri && (newProps.some(np => np.schemeIdUri === p.schemeIdUri)));
        });
        props.push(...newProps);

        return props;
    }

    /**
     * Check if a specific EssentialProperty is supported
     * @param {DescriptorType} ep
     * @return {boolean}
     */
    function supportsEssentialProperty(ep) {
        let supportedEssentialProps = settings.get().streaming.capabilities.supportedEssentialProperties;

        // we already took care of these descriptors with the codecs check
        // let's bypass them here
        if (settings.get().streaming.capabilities.useMediaCapabilitiesApi && settings.get().streaming.capabilities.filterVideoColorimetryEssentialProperties) {
            supportedEssentialProps = _addProperties(supportedEssentialProps,
                [
                    { schemeIdUri: Constants.COLOUR_PRIMARIES_SCHEME_ID_URI },
                    { schemeIdUri: Constants.MATRIX_COEFFICIENTS_SCHEME_ID_URI },
                    { schemeIdUri: Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI }
                ]
            );
        }
        if (settings.get().streaming.capabilities.useMediaCapabilitiesApi && settings.get().streaming.capabilities.filterHDRMetadataFormatEssentialProperties) {
            supportedEssentialProps = _addProperties(supportedEssentialProps, [{ schemeIdUri: Constants.HDR_METADATA_FORMAT_SCHEME_ID_URI }]);
        }

        try {
            return ep.inArray(supportedEssentialProps);
        } catch (e) {
            return true;
        }
    }

    instance = {
        areKeyIdsExpired,
        areKeyIdsUsable,
        isProtectionCompatible,
        setConfig,
        setEncryptedMediaSupported,
        setProtectionController,
        supportsCodec,
        supportsEncryptedMedia,
        supportsEssentialProperty,
        supportsMediaSource,
    };

    setup();

    return instance;
}

Capabilities.__dashjs_factory_name = 'Capabilities';
export default FactoryMaker.getSingletonFactory(Capabilities);
