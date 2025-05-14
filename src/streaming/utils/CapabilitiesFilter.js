import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import Constants from '../constants/Constants.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import DashConstants from '../../dash/constants/DashConstants.js';

function CapabilitiesFilter() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        adapter,
        capabilities,
        settings,
        customParametersModel,
        protectionController,
        logger;


    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.capabilities) {
            capabilities = config.capabilities;
        }

        if (config.settings) {
            settings = config.settings;
        }

        if (config.protectionController) {
            protectionController = config.protectionController;
        }

        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }

    }

    function filterUnsupportedFeatures(manifest) {
        return new Promise((resolve) => {
            const mediaTypesToCheck = [Constants.VIDEO, Constants.AUDIO];
            const promises = [];

            // We determine all the configurations we need to check. Each unique configuration should only be checked once.
            // This is important especially for large multiperiod MPDs. A redundant configuration check can lead to increased processing time.
            mediaTypesToCheck.forEach(mediaType => {
                const configurationsToCheck = _getConfigurationsToCheck(manifest, mediaType);
                configurationsToCheck.forEach(basicConfiguration => {
                    promises.push(capabilities.runCodecSupportCheck(basicConfiguration, mediaType));
                })
            })


            Promise.allSettled(promises)
                .then(() => {
                    mediaTypesToCheck.forEach((mediaType) => {
                        _filterUnsupportedCodecs(mediaType, manifest)
                    })

                    if (settings.get().streaming.capabilities.filterUnsupportedEssentialProperties) {
                        _filterUnsupportedEssentialProperties(manifest);
                    }
                    return _applyCustomFilters(manifest);
                })
                .then(() => {
                    resolve();
                })
                .catch((e) => {
                    logger.error(e);
                    resolve();
                });
        });
    }


    function _filterUnsupportedCodecs(type, manifest) {
        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return
        }

        manifest.Period
            .forEach((period) => {
                _filterUnsupportedAdaptationSetsOfPeriod(period, type);
            })
    }

    function _filterUnsupportedAdaptationSetsOfPeriod(period, type) {
        if (!period || !period.AdaptationSet || period.AdaptationSet.length === 0) {
            return;
        }

        period.AdaptationSet = period.AdaptationSet.filter((as) => {
            if (adapter.getIsTypeOf(as, type)) {
                _filterUnsupportedRepresentationsOfAdaptation(as, type);
            }
            const supported = as.Representation && as.Representation.length > 0;
            if (!supported) {
                eventBus.trigger(Events.ADAPTATION_SET_REMOVED_NO_CAPABILITIES, {
                    adaptationSet: as
                });
                logger.warn(`[CapabilitiesFilter] AdaptationSet with ID ${as.id ? as.id : 'undefined'} and codec ${as.codecs ? as.codecs : 'undefined'} has been removed because of no supported Representation`);
            }

            return supported;
        })
    }

    function _filterUnsupportedRepresentationsOfAdaptation(as, type) {
        if (!as.Representation || as.Representation.length === 0) {
            return;
        }

        as.Representation = as.Representation.filter((rep, i) => {
            const codec = adapter.getCodec(as, i, false);
            const isMainCodecSupported = _isCodecSupported(type, rep, codec);

            let isSupplementalCodecSupported = _isSupplementalCodecSupported(rep, type);
            if (isSupplementalCodecSupported) {
                logger.debug(`[CapabilitiesFilter] Codec supported. Upgrading codecs string of Representation with ID ${rep.id}`);
                rep.codecs = rep[DashConstants.SUPPLEMENTAL_CODECS]
            }

            if (!isMainCodecSupported && !isSupplementalCodecSupported) {
                logger.warn(`[CapabilitiesFilter] Codec ${codec} not supported. Removing Representation with ID ${rep.id}`);
            }

            return isMainCodecSupported || isSupplementalCodecSupported;
        });
    }

    function _isSupplementalCodecSupported(rep, type) {
        let isSupplementalCodecSupported = false;
        const supplementalCodecs = adapter.getSupplementalCodecs(rep);

        if (supplementalCodecs.length > 0) {
            if (supplementalCodecs.length > 1) {
                logger.warn(`[CapabilitiesFilter] Multiple supplemental codecs not supported; using the first in list`);
            }
            const supplementalCodec = supplementalCodecs[0];
            isSupplementalCodecSupported = _isCodecSupported(type, rep, supplementalCodec);
        }

        return isSupplementalCodecSupported
    }

    function _isCodecSupported(type, rep, codec) {
        const config = _createConfiguration(type, rep, codec);

        return capabilities.isCodecSupportedBasedOnTestedConfigurations(config, type);
    }

    function _getConfigurationsToCheck(manifest, type) {
        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return [];
        }

        const configurationsSet = new Set();
        const configurations = [];

        manifest.Period.forEach((period) => {
            if (!period.ImportedMPD) {
                period.AdaptationSet.forEach((as) => {
                    if (adapter.getIsTypeOf(as, type)) {
                        as.Representation.forEach((rep, i) => {
                            const codec = adapter.getCodec(as, i, false);
                            _processCodecToCheck(type, rep, codec, configurationsSet, configurations);

                            const supplementalCodecs = adapter.getSupplementalCodecs(rep)
                            if (supplementalCodecs.length > 0) {
                                _processCodecToCheck(type, rep, supplementalCodecs[0], configurationsSet, configurations);
                            }
                        });
                    }
                });
            }
        });

        return configurations;
    }

    function _processCodecToCheck(type, rep, codec, configurationsSet, configurations) {
        const config = _createConfiguration(type, rep, codec);
        const configString = JSON.stringify(config);

        if (!configurationsSet.has(configString)) {
            configurationsSet.add(configString);
            configurations.push(config);
        }
    }

    function _createConfiguration(type, rep, codec) {
        let config = null;
        switch (type) {
            case Constants.VIDEO:
                config = _createVideoConfiguration(rep, codec);
                break;
            case Constants.AUDIO:
                config = _createAudioConfiguration(rep, codec);
                break;
            default:
                return config;
        }

        return _addGenericAttributesToConfig(rep, config);
    }

    function _createVideoConfiguration(rep, codec) {
        let config = {
            codec: codec,
            width: rep.width || null,
            height: rep.height || null,
            framerate: adapter.getFramerate(rep) || null,
            bitrate: rep.bandwidth || null,
            isSupported: true
        }
        if (settings.get().streaming.capabilities.filterVideoColorimetryEssentialProperties) {
            Object.assign(config, _convertHDRColorimetryToConfig(rep));
        }
        let colorimetrySupported = config.isSupported;

        if (settings.get().streaming.capabilities.filterHDRMetadataFormatEssentialProperties) {
            Object.assign(config, _convertHDRMetadataFormatToConfig(rep));
        }
        let metadataFormatSupported = config.isSupported;

        if (!colorimetrySupported || !metadataFormatSupported) {
            config.isSupported = false; // restore this flag as it may got overridden by 2nd Object.assign
        }

        return config;
    }

    function _convertHDRColorimetryToConfig(representation) {
        let cfg = {
            colorGamut: null,
            transferFunction: null,
            isSupported: true
        };

        for (const prop of representation.EssentialProperty || []) {

            // note: MCA does not reflect a parameter related to 'urn:mpeg:mpegB:cicp:VideoFullRangeFlag'

            // translate ColourPrimaries signaling into capability queries
            if (prop.schemeIdUri === Constants.COLOUR_PRIMARIES_SCHEME_ID_URI && ['1', '5', '6', '7'].includes(prop.value.toString())) {
                cfg.colorGamut = Constants.MEDIA_CAPABILITIES_API.COLORGAMUT.SRGB;
            } else if (prop.schemeIdUri === Constants.COLOUR_PRIMARIES_SCHEME_ID_URI && ['11', '12'].includes(prop.value.toString())) {
                cfg.colorGamut = Constants.MEDIA_CAPABILITIES_API.COLORGAMUT.P3;
            } else if (prop.schemeIdUri === Constants.COLOUR_PRIMARIES_SCHEME_ID_URI && ['9'].includes(prop.value.toString())) {
                cfg.colorGamut = Constants.MEDIA_CAPABILITIES_API.COLORGAMUT.REC2020;
            } else if (prop.schemeIdUri === Constants.COLOUR_PRIMARIES_SCHEME_ID_URI && ['2'].includes(prop.value.toString())) {
                cfg.colorGamut = null;
            } else if (prop.schemeIdUri === Constants.COLOUR_PRIMARIES_SCHEME_ID_URI) {
                cfg.isSupported = false;
            }

            // translate TransferCharacteristics signaling into capability queries
            if (prop.schemeIdUri === Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI && ['1', '6', '13', '14', '15'].includes(prop.value.toString())) {
                cfg.transferFunction = Constants.MEDIA_CAPABILITIES_API.TRANSFERFUNCTION.SRGB;
            } else if (prop.schemeIdUri === Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI && ['16'].includes(prop.value.toString())) {
                cfg.transferFunction = Constants.MEDIA_CAPABILITIES_API.TRANSFERFUNCTION.PQ;
            } else if (prop.schemeIdUri === Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI && ['18'].includes(prop.value.toString())) {
                cfg.transferFunction = Constants.MEDIA_CAPABILITIES_API.TRANSFERFUNCTION.HLG;
            } else if (prop.schemeIdUri === Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI && ['2'].includes(prop.value.toString())) {
                cfg.transferFunction = null;
            } else if (prop.schemeIdUri === Constants.TRANSFER_CHARACTERISTICS_SCHEME_ID_URI) {
                cfg.isSupported = false;
            }
        }

        return cfg;
    }

    function _convertHDRMetadataFormatToConfig(representation) {
        let cfg = {
            isSupported: true,
            hdrMetadataType: null
        };

        for (const prop of representation.EssentialProperty || []) {
            // translate hdrMetadataType signaling into capability queries
            if (prop.schemeIdUri === Constants.HDR_METADATA_FORMAT_SCHEME_ID_URI && prop.value === Constants.HDR_METADATA_FORMAT_VALUES.ST2094_10) {
                cfg.hdrMetadataType = Constants.MEDIA_CAPABILITIES_API.HDR_METADATATYPE.SMPTE_ST_2094_10;
            } else if (prop.schemeIdUri === Constants.HDR_METADATA_FORMAT_SCHEME_ID_URI && prop.value === Constants.HDR_METADATA_FORMAT_VALUES.SL_HDR2) {
                cfg.hdrMetadataType = Constants.MEDIA_CAPABILITIES_API.HDR_METADATATYPE.SLHDR2; // Note: This is not specified by W3C
            } else if (prop.schemeIdUri === Constants.HDR_METADATA_FORMAT_SCHEME_ID_URI && prop.value === Constants.HDR_METADATA_FORMAT_VALUES.ST2094_40) {
                cfg.hdrMetadataType = Constants.MEDIA_CAPABILITIES_API.HDR_METADATATYPE.SMPTE_ST_2094_40;
            } else if (prop.schemeIdUri === Constants.HDR_METADATA_FORMAT_SCHEME_ID_URI) {
                cfg.isSupported = false;
            }
        }

        return cfg;
    }

    function _createAudioConfiguration(rep, codec) {
        const samplerate = rep.audioSamplingRate || null;
        const bitrate = rep.bandwidth || null;

        return {
            codec,
            bitrate,
            samplerate,
            isSupported: true
        };
    }

    function _addGenericAttributesToConfig(rep, config) {
        if (rep && rep[DashConstants.CONTENT_PROTECTION] && rep[DashConstants.CONTENT_PROTECTION].length > 0) {
            config.keySystemsMetadata = protectionController.getSupportedKeySystemMetadataFromContentProtection(rep[DashConstants.CONTENT_PROTECTION])
        }
        return config
    }

    function _filterUnsupportedEssentialProperties(manifest) {

        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return;
        }

        manifest.Period.forEach((period) => {
            if (!period.ImportedMPD) {
                period.AdaptationSet = period.AdaptationSet.filter((as) => {

                    if (!as.Representation || as.Representation.length === 0) {
                        return true;
                    }

                    const adaptationSetEssentialProperties = adapter.getEssentialPropertiesForAdaptationSet(as);
                    const doesSupportEssentialProperties = _doesSupportEssentialProperties(adaptationSetEssentialProperties);

                    if (!doesSupportEssentialProperties) {
                        return false;
                    }

                    as.Representation = as.Representation.filter((rep) => {
                        const essentialProperties = adapter.getEssentialPropertiesForRepresentation(rep);
                        return _doesSupportEssentialProperties(essentialProperties);
                    });

                    return as.Representation && as.Representation.length > 0;
                });
            }
        });
    }

    function _doesSupportEssentialProperties(essentialProperties) {
        if (!essentialProperties || essentialProperties.length === 0) {
            return true
        }

        let i = 0;
        while (i < essentialProperties.length) {
            if (!capabilities.supportsEssentialProperty(essentialProperties[i])) {
                logger.debug('[Stream] EssentialProperty not supported: ' + essentialProperties[i].schemeIdUri);
                return false;
            }
            i += 1;
        }

        return true
    }

    function _applyCustomFilters(manifest) {
        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return Promise.resolve();
        }

        const promises = [];
        manifest.Period.forEach((period) => {
            promises.push(_applyCustomFiltersAdaptationSetsOfPeriod(period));
        });

        return Promise.all(promises);
    }

    function _applyCustomFiltersAdaptationSetsOfPeriod(period) {
        return new Promise((resolve) => {

            if (!period || !period.AdaptationSet || period.AdaptationSet.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            period.AdaptationSet.forEach((as) => {
                promises.push(_applyCustomFiltersRepresentationsOfAdaptation(as));
            });

            Promise.all(promises)
                .then(() => {
                    period.AdaptationSet = period.AdaptationSet.filter((as) => {
                        return as.Representation && as.Representation.length > 0;
                    });
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });

    }

    function _applyCustomFiltersRepresentationsOfAdaptation(as) {
        return new Promise((resolve) => {

            if (!as.Representation || as.Representation.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            as.Representation.forEach((rep) => {
                promises.push(_applyCustomFiltersRepresentation(rep));
            });

            Promise.all(promises)
                .then((supported) => {
                    as.Representation = as.Representation.filter((rep, i) => {
                        let isReprSupported = supported[i].every((s) => {
                            return s
                        });
                        if (!isReprSupported) {
                            logger.debug('[Stream] Representation ' + rep.id + ' has been removed because of unsupported CustomFilter');
                        }
                        return isReprSupported;
                    });
                    resolve();
                })
                .catch((err) => {
                    logger.warn('[Stream] at least one promise rejected in CustomFilter with error: ', err);
                    resolve();
                });
        });

    }

    function _applyCustomFiltersRepresentation(rep) {
        const promises = [];
        const customCapabilitiesFilters = customParametersModel.getCustomCapabilitiesFilters();

        if (!customCapabilitiesFilters || customCapabilitiesFilters.length === 0) {
            promises.push(Promise.resolve(true));
        } else {
            customCapabilitiesFilters.forEach(customFilter => {
                promises.push(new Promise(resolve => resolve(customFilter(rep))));
            });
        }

        return Promise.all(promises)
    }

    instance = {
        setConfig,
        filterUnsupportedFeatures,
    };

    setup();

    return instance;
}

CapabilitiesFilter.__dashjs_factory_name = 'CapabilitiesFilter';
export default FactoryMaker.getSingletonFactory(CapabilitiesFilter);
