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
import ObjectUtils from './ObjectUtils.js';
import Debug from '../../core/Debug.js';

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
        testedCodecConfigurations,
        encryptedMediaSupported,
        logger;

    const context = this.context;
    const objectUtils = ObjectUtils(context).getInstance();

    function setup() {
        encryptedMediaSupported = false;
        testedCodecConfigurations = [];
        logger = Debug(context).getInstance().getLogger(instance);
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
     * Checks whether SourceBuffer.changeType() is available
     * @return {boolean} true is changeType() is available
     */
    function supportsChangeType() {
        return !!window.SourceBuffer && !!SourceBuffer.prototype && !!SourceBuffer.prototype.changeType;
    }

    /**
     * @param {boolean} value
     */
    function setEncryptedMediaSupported(value) {
        encryptedMediaSupported = value;
    }

    /**
     * Check if a codec is supported by the MediaSource. We use the MediaCapabilities API or the MSE to check.
     * @param {object} basicConfiguration
     * @param {string} type
     * @return {Promise<>}
     */
    function runCodecSupportCheck(basicConfiguration, type) {

        if (type !== Constants.AUDIO && type !== Constants.VIDEO) {
            return Promise.resolve();
        }

        const enhancementCodecs = settings.get().streaming.enhancement.codecs;
        if (settings.get().streaming.enhancement.enabled && basicConfiguration.codec.includes('video') && enhancementCodecs.some(cdc => basicConfiguration.codec.includes(cdc))) {
            return Promise.resolve(true);
        }

        const configurationsToTest = _getEnhancedConfigurations(basicConfiguration, type);

        if (_canUseMediaCapabilitiesApi(basicConfiguration, type)) {
            return _checkCodecWithMediaCapabilities(configurationsToTest);
        }

        _checkCodecWithMse(configurationsToTest);
        return Promise.resolve();
    }

    /**
     * Checks whether a codec is supported according to the previously tested configurations.
     * Note that you need to call runCodecSupportCheck() first to populate the testedCodecConfigurations array.
     * This function only validates codec support based on previously tested configurations.
     * @param basicConfiguration
     * @param type
     * @returns {*|boolean}
     */
    function isCodecSupportedBasedOnTestedConfigurations(basicConfiguration, type) {
        if (!basicConfiguration || !basicConfiguration.codec || (basicConfiguration.isSupported === false)) {
            return false;
        }

        const configurationsToTest = _getEnhancedConfigurations(basicConfiguration, type);

        const testedConfigurations = configurationsToTest
            .map((config) => {
                return _getTestedCodecConfiguration(config, type);
            })
            .filter((config) => {
                return config !== null && config !== undefined;
            })

        if (testedConfigurations && testedConfigurations.length > 0) {
            return _isConfigSupported(testedConfigurations)
        }

        return true
    }

    /**
     * MediaCapabilitiesAPI throws an error if one of the attribute is missing. We only use it if we have all required information.
     * @return {boolean}
     * @private
     */
    function _canUseMediaCapabilitiesApi(basicConfiguration, type) {
        return _isMediaCapabilitiesApiSupported() && ((basicConfiguration.codec && type === Constants.AUDIO) || (type === Constants.VIDEO && basicConfiguration.codec && basicConfiguration.width && basicConfiguration.height && basicConfiguration.bitrate && basicConfiguration.framerate));
    }

    function _isMediaCapabilitiesApiSupported() {
        return settings.get().streaming.capabilities.useMediaCapabilitiesApi && navigator.mediaCapabilities && navigator.mediaCapabilities.decodingInfo
    }


    /**
     * Check codec support using the MSE
     * @param {object} configurationsToTest
     * @private
     */
    function _checkCodecWithMse(configurationsToTest) {
        if (!configurationsToTest || !configurationsToTest.length) {
            return;
        }

        // We only need one config here as we can not add any DRM configuration to the test
        const configurationToTest = configurationsToTest[0];

        const alreadyTestedConfiguration = _getTestedCodecConfiguration(configurationToTest);
        if (alreadyTestedConfiguration) {
            return
        }

        let decodingInfo = {
            supported: false
        }

        if ('ManagedMediaSource' in window && ManagedMediaSource.isTypeSupported(configurationToTest.mediaSourceCodecString)) {
            decodingInfo.supported = true;
        } else if ('MediaSource' in window && MediaSource.isTypeSupported(configurationToTest.mediaSourceCodecString)) {
            decodingInfo.supported = true;
        } else if ('WebKitMediaSource' in window && WebKitMediaSource.isTypeSupported(configurationToTest.mediaSourceCodecString)) {
            decodingInfo.supported = true;
        }

        configurationToTest.decodingInfo = decodingInfo;
        testedCodecConfigurations.push(configurationToTest);
    }


    /**
     * Check codec support using the MediaCapabilities API
     * @param {object} configurationsToTest
     * @return {Promise<boolean>}
     * @private
     */
    function _checkCodecWithMediaCapabilities(configurationsToTest) {
        return new Promise((resolve) => {

            if (!configurationsToTest || configurationsToTest.length === 0) {
                resolve();
                return;
            }

            const promises = configurationsToTest.map((configuration) => {
                return _checkSingleConfigurationWithMediaCapabilities(configuration);
            })

            Promise.allSettled(promises)
                .then(() => {
                    resolve();
                })
                .catch((e) => {
                    logger.error(e);
                    resolve();
                })
        });
    }

    function _getEnhancedConfigurations(inputConfig, type) {
        let configuration

        if (type === Constants.VIDEO) {
            configuration = _getGenericMediaCapabilitiesVideoConfig(inputConfig)
        } else if (type === Constants.AUDIO) {
            configuration = _getGenericMediaCapabilitiesAudioConfig(inputConfig)
        }

        configuration[type].contentType = inputConfig.codec;
        configuration[type].bitrate = parseInt(inputConfig.bitrate);
        configuration.type = 'media-source';

        let mediaSourceCodecString = inputConfig.codec;
        if (inputConfig.width && inputConfig.height) {
            mediaSourceCodecString += ';width="' + inputConfig.width + '";height="' + inputConfig.height + '"';
        }
        configuration.mediaSourceCodecString = mediaSourceCodecString;

        return _enhanceGenericConfigurationWithKeySystemConfiguration(configuration, inputConfig, type)
    }

    function _enhanceGenericConfigurationWithKeySystemConfiguration(genericConfiguration, inputConfig, type) {
        if (!inputConfig || !inputConfig.keySystemsMetadata || inputConfig.keySystemsMetadata.length === 0) {
            return [genericConfiguration];
        }

        const configurations = [ ];

        inputConfig.keySystemsMetadata.forEach((keySystemMetadata) => {

            if (!keySystemMetadata.ks) {
                configurations.push({ ...genericConfiguration });
                return;
            }
                
            // If a systemStringPriority is defined by the application we use these values. Otherwise, we use the default system string
            // This is useful for DRM systems such as Playready for which multiple system strings are possible for instance com.microsoft.playready and com.microsoft.playready.recommendation
            const protDataSystemStringPriority = keySystemMetadata.protData && keySystemMetadata.protData.systemStringPriority ? keySystemMetadata.protData.systemStringPriority : null;
            let systemString = keySystemMetadata.ks.systemString;

            // Use the default values in case no values are provided by the application
            const systemStringsToApply = protDataSystemStringPriority ? protDataSystemStringPriority : [systemString];

            systemStringsToApply.forEach((systemString) => {
                const curr = { ...genericConfiguration };
                curr.keySystemConfiguration = {};
                if (systemString) {
                    curr.keySystemConfiguration.keySystem = systemString;
                }

                let robustnessLevel = ''
                if (keySystemMetadata.ks.systemString === ProtectionConstants.WIDEVINE_KEYSTEM_STRING) {
                    robustnessLevel = ProtectionConstants.ROBUSTNESS_STRINGS.WIDEVINE.SW_SECURE_CRYPTO;
                }
                const protData = keySystemMetadata.protData;
                const audioRobustness = (protData && protData.audioRobustness && protData.audioRobustness.length > 0) ? protData.audioRobustness : robustnessLevel;
                const videoRobustness = (protData && protData.videoRobustness && protData.videoRobustness.length > 0) ? protData.videoRobustness : robustnessLevel;

                if (type === Constants.AUDIO) {
                    curr.keySystemConfiguration[type] = { robustness: audioRobustness }
                } else if (type === Constants.VIDEO) {
                    curr.keySystemConfiguration[type] = { robustness: videoRobustness }
                }
                configurations.push(curr);
            })
        })

        return configurations;
    }

    function _checkSingleConfigurationWithMediaCapabilities(configuration) {
        return new Promise((resolve) => {
            const alreadyTestedConfiguration = _getTestedCodecConfiguration(configuration);
            if (alreadyTestedConfiguration) {
                resolve();
                return
            }

            navigator.mediaCapabilities.decodingInfo(configuration)
                .then((decodingInfo) => {
                    configuration.decodingInfo = decodingInfo;
                    testedCodecConfigurations.push(configuration);
                    resolve();
                })
                .catch((e) => {
                    configuration.decodingInfo = { supported: false };
                    testedCodecConfigurations.push(configuration);
                    logger.error(e);
                    resolve();
                })
        })
    }

    function _isConfigSupported(testedConfigurations) {
        return testedConfigurations.some((testedConfiguration) => {
            return testedConfiguration && testedConfiguration.decodingInfo && testedConfiguration.decodingInfo.supported
        });
    }

    function _getTestedCodecConfiguration(configuration) {
        if (!testedCodecConfigurations || testedCodecConfigurations.length === 0 || !configuration) {
            return
        }

        return testedCodecConfigurations.find((current) => {
            const audioEqual = _isConfigEqual(configuration, current, Constants.AUDIO);
            const videoEqual = _isConfigEqual(configuration, current, Constants.VIDEO);
            const keySystemEqual = _isConfigEqual(configuration, current, 'keySystemConfiguration');

            return audioEqual && videoEqual && keySystemEqual
        })
    }

    function _isConfigEqual(configuration, current, attribute) {

        // Config not present in both of them
        if (!configuration[attribute] && !current[attribute]) {
            return true
        }

        // Config present in both we need to compare
        if (configuration[attribute] && current[attribute]) {
            return objectUtils.areEqual(configuration[attribute], current[attribute])
        }

        return false
    }

    function _getGenericMediaCapabilitiesVideoConfig(inputConfig) {
        const configuration = {
            video: {}
        };

        if (!inputConfig) {
            return configuration;
        }
        if (inputConfig.width) {
            configuration.video.width = inputConfig.width;
        }
        if (inputConfig.height) {
            configuration.video.height = inputConfig.height;
        }
        if (inputConfig.framerate) {
            configuration.video.framerate = parseFloat(inputConfig.framerate)
        }
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
        isCodecSupportedBasedOnTestedConfigurations,
        isProtectionCompatible,
        runCodecSupportCheck,
        setConfig,
        setEncryptedMediaSupported,
        setProtectionController,
        supportsChangeType,
        supportsEncryptedMedia,
        supportsEssentialProperty,
        supportsMediaSource,
    };

    setup();

    return instance;
}

Capabilities.__dashjs_factory_name = 'Capabilities';
export default FactoryMaker.getSingletonFactory(Capabilities);
