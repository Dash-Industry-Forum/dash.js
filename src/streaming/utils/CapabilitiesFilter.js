import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Constants from '../constants/Constants';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
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
            const promises = [];

            promises.push(_filterUnsupportedCodecs(Constants.VIDEO, manifest));
            promises.push(_filterUnsupportedCodecs(Constants.AUDIO, manifest));

            Promise.all(promises)
                .then(() => {
                    if (settings.get().streaming.capabilities.filterUnsupportedEssentialProperties) {
                        _filterUnsupportedEssentialProperties(manifest);
                    }
                    _applyCustomFilters(manifest);
                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
    }


    function _filterUnsupportedCodecs(type, manifest) {
        if (!manifest || !manifest.Period_asArray || manifest.Period_asArray.length === 0) {
            return Promise.resolve();
        }

        const promises = [];
        manifest.Period_asArray.forEach((period) => {
            promises.push(_filterUnsupportedAdaptationSetsOfPeriod(period, type));
        });

        return Promise.all(promises);
    }

    function _filterUnsupportedAdaptationSetsOfPeriod(period, type) {
        return new Promise((resolve) => {

            if (!period || !period.AdaptationSet_asArray || period.AdaptationSet_asArray.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            period.AdaptationSet_asArray.forEach((as) => {
                if (adapter.getIsTypeOf(as, type)) {
                    promises.push(_filterUnsupportedRepresentationsOfAdaptation(as, type));
                }
            });

            Promise.all(promises)
                .then(() => {
                    period.AdaptationSet_asArray = period.AdaptationSet_asArray.filter((as) => {
                        const supported = as.Representation_asArray && as.Representation_asArray.length > 0;

                        if (!supported) {
                            eventBus.trigger(Events.ADAPTATION_SET_REMOVED_NO_CAPABILITIES, {
                                adaptationSet: as
                            });
                            logger.info(`AdaptationSet has been removed because of no supported Representation`);
                        }

                        return supported;
                    });

                    if (period.AdaptationSet_asArray.length === 0) {
                        logger.error(`All AdaptationSets have been removed from the period`);
                    }

                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });

    }

    function _filterUnsupportedRepresentationsOfAdaptation(as, type) {
        return new Promise((resolve) => {

            if (!as.Representation_asArray || as.Representation_asArray.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            const configurations = [];

            const { replaceCodecs } = settings.get().streaming.capabilities;

            as.Representation_asArray.forEach((rep, i) => {
                for (const [from, to] of replaceCodecs) {
                    if (rep.codecs?.toLowerCase() === from.toLowerCase()) {
                        rep.codecs = to;
                    }
                }

                const codec = adapter.getCodec(as, i, false);
                const config = _createConfiguration(type, rep, codec);

                configurations.push(config);
                promises.push(capabilities.supportsCodec(config, type));
            });

            Promise.all(promises)
                .then((supported) => {
                    as.Representation_asArray = as.Representation_asArray
                        .filter((_, i) => {
                            if (!supported[i]) {
                                logger.debug(`[Stream] Codec ${configurations[i].codec} not supported `);
                            }
                            return supported[i];
                        });

                    // Filter out representations whose codec family is incompatible with the
                    // first remaining representation. The SourceBuffer is initialized with the
                    // codec of the first representation (index 0), so allowing ABR to switch to
                    // a representation with a different codec family (e.g. HEVC vs AVC in the
                    // same AdaptationSet) would cause the MSE SourceBuffer to reject the data.
                    if (settings.get().streaming.capabilities.filterMixedCodecAdaptationSets &&
                        as.Representation_asArray.length > 1) {
                        const firstCodecRoot = as.Representation_asArray[0].codecs
                            ? as.Representation_asArray[0].codecs.split('.')[0]
                            : null;
                        if (firstCodecRoot) {
                            const beforeLength = as.Representation_asArray.length;
                            as.Representation_asArray = as.Representation_asArray.filter((rep) => {
                                if (!rep.codecs) {
                                    return true;
                                }
                                const repCodecRoot = rep.codecs.split('.')[0];
                                const compatible = capabilities.codecRootCompatibleWithCodec(firstCodecRoot, repCodecRoot);
                                if (!compatible) {
                                    logger.debug(`[Stream] Filtered out representation with codec ${rep.codecs} (codec family "${repCodecRoot}" is incompatible with primary codec family "${firstCodecRoot}")`);
                                }
                                return compatible;
                            });
                            if (as.Representation_asArray.length < beforeLength) {
                                logger.info(`[Stream] Removed ${beforeLength - as.Representation_asArray.length} representations with mixed codec families to prevent SourceBuffer codec mismatch`);
                            }
                        }
                    }

                    resolve();
                })
                .catch(() => {
                    resolve();
                });
        });
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
        const width = rep.width || null;
        const height = rep.height || null;
        const framerate = rep.frameRate || null;
        const bitrate = rep.bandwidth || null;

        return {
            codec,
            width,
            height,
            framerate,
            bitrate
        };
    }

    function _createAudioConfiguration(rep, codec) {
        const samplerate = rep.audioSamplingRate || null;
        const bitrate = rep.bandwidth || null;

        return {
            codec,
            bitrate,
            samplerate
        };
    }

    function _addGenericAttributesToConfig(rep, config) {
        if (rep && rep[DashConstants.CONTENT_PROTECTION+'_asArray'] && rep[DashConstants.CONTENT_PROTECTION+'_asArray'].length > 0) {
            config.keySystemsMetadata = protectionController.getSupportedKeySystemMetadataFromContentProtection(rep[DashConstants.CONTENT_PROTECTION+'_asArray'])
        }
        return config
    }

    function _filterUnsupportedEssentialProperties(manifest) {

        if (!manifest || !manifest.Period_asArray || manifest.Period_asArray.length === 0) {
            return;
        }

        manifest.Period_asArray.forEach((period) => {
            period.AdaptationSet_asArray = period.AdaptationSet_asArray.filter((as) => {

                if (!as.Representation_asArray || as.Representation_asArray.length === 0) {
                    return true;
                }

                as.Representation_asArray = as.Representation_asArray.filter((rep) => {
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

                return as.Representation_asArray && as.Representation_asArray.length > 0;
            });
        });

    }

    function _applyCustomFilters(manifest) {
        const customCapabilitiesFilters = customParametersModel.getCustomCapabilitiesFilters();
        if (!customCapabilitiesFilters || customCapabilitiesFilters.length === 0 || !manifest || !manifest.Period_asArray || manifest.Period_asArray.length === 0) {
            return;
        }

        manifest.Period_asArray.forEach((period) => {
            period.AdaptationSet_asArray = period.AdaptationSet_asArray.filter((as) => {

                if (!as.Representation_asArray || as.Representation_asArray.length === 0) {
                    return true;
                }

                as.Representation_asArray = as.Representation_asArray.filter((representation) => {
                    return !customCapabilitiesFilters.some(customFilter => !customFilter(representation));
                });

                return as.Representation_asArray && as.Representation_asArray.length > 0;
            });
        });
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
