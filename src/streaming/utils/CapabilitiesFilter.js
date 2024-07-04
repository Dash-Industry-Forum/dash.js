import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import Constants from '../constants/Constants.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';

function CapabilitiesFilter() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        adapter,
        capabilities,
        settings,
        customParametersModel,
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

        if (config.customParametersModel) {
            customParametersModel = config.customParametersModel;
        }

    }

    function filterUnsupportedFeatures(manifest) {
        return new Promise((resolve) => {
            const promises = [];

            promises.push(_filterUnsupportedCodecs(Constants.VIDEO, manifest));
            promises.push(_filterUnsupportedCodecs(Constants.AUDIO, manifest));

            Promise.all(promises)
                .then(() => {
                    if (settings.get().streaming.capabilities.filterUnsupportedEssentialProperties) {
                        _filterUnsupportedEssentialProperties(manifest);
                    }
                })
                .then(() => _applyCustomFilters(manifest))
                .then(() => resolve())
                .catch(() => {
                    resolve();
                });
        });
    }

    function _filterUnsupportedCodecs(type, manifest) {
        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return Promise.resolve();
        }

        const promises = [];
        manifest.Period.forEach((period) => {
            promises.push(_filterUnsupportedAdaptationSetsOfPeriod(period, type));
        });

        return Promise.all(promises);
    }

    function _filterUnsupportedAdaptationSetsOfPeriod(period, type) {
        return new Promise((resolve) => {

            if (!period || !period.AdaptationSet || period.AdaptationSet.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            period.AdaptationSet.forEach((as) => {
                if (adapter.getIsTypeOf(as, type)) {
                    promises.push(_filterUnsupportedRepresentationsOfAdaptation(as, type));
                }
            });

            Promise.all(promises)
                .then(() => {
                    period.AdaptationSet = period.AdaptationSet.filter((as) => {
                        const supported = as.Representation && as.Representation.length > 0;
                        if (!supported) {
                            eventBus.trigger(Events.ADAPTATION_SET_REMOVED_NO_CAPABILITIES, {
                                adaptationSet: as
                            });
                            logger.warn(`AdaptationSet has been removed because of no supported Representation`);
                        }

                        return supported;
                    });
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });

    }

    function _filterUnsupportedRepresentationsOfAdaptation(as, type) {
        return new Promise((resolve) => {

            if (!as.Representation || as.Representation.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            const configurations = [];

            as.Representation.forEach((rep, i) => {
                const codec = adapter.getCodec(as, i, false);
                const config = _createConfiguration(type, rep, codec);

                configurations.push(config);
                promises.push(capabilities.supportsCodec(config, type));
            });

            Promise.all(promises)
                .then((supported) => {
                    as.Representation = as.Representation.filter((_, i) => {
                        if (!supported[i]) {
                            logger.debug(`[Stream] Codec ${configurations[i].codec} not supported `);
                        }
                        return supported[i];
                    });
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }

    function _createConfiguration(type, rep, codec) {
        switch (type) {
            case Constants.VIDEO:
                return _createVideoConfiguration(rep, codec);
            case Constants.AUDIO:
                return _createAudioConfiguration(rep, codec);
            default:
                return null;

        }
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

    function _createVideoConfiguration(rep, codec) {
        let config = {
            codec: codec,
            width: rep.width || null,
            height: rep.height || null,
            framerate: rep.frameRate || null,
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

    function _filterUnsupportedEssentialProperties(manifest) {

        if (!manifest || !manifest.Period || manifest.Period.length === 0) {
            return;
        }

        manifest.Period.forEach((period) => {
            period.AdaptationSet = period.AdaptationSet.filter((as) => {

                if (!as.Representation || as.Representation.length === 0) {
                    return true;
                }

                as.Representation = as.Representation.filter((rep) => {
                    const essentialProperties = adapter.getEssentialPropertiesForRepresentation(rep);

                    if (essentialProperties && essentialProperties.length > 0) {
                        let i = 0;
                        while (i < essentialProperties.length) {
                            if (!capabilities.supportsEssentialProperty(essentialProperties[i])) {
                                logger.debug('[Stream] EssentialProperty not supported: ' + essentialProperties[i].schemeIdUri);
                                return false;
                            }
                            i += 1;
                        }
                    }

                    return true;
                });

                return as.Representation && as.Representation.length > 0;
            });
        });

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
        filterUnsupportedFeatures
    };

    setup();

    return instance;
}

CapabilitiesFilter.__dashjs_factory_name = 'CapabilitiesFilter';
export default FactoryMaker.getSingletonFactory(CapabilitiesFilter);
