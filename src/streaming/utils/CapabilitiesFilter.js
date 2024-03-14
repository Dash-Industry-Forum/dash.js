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
                    _applyCustomFilters(manifest);
                    resolve();
                })
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
        const customCapabilitiesFilters = customParametersModel.getCustomCapabilitiesFilters();
        if (!customCapabilitiesFilters || customCapabilitiesFilters.length === 0 || !manifest || !manifest.Period || manifest.Period.length === 0) {
            return;
        }

        manifest.Period.forEach((period) => {
            period.AdaptationSet = period.AdaptationSet.filter((as) => {

                if (!as.Representation || as.Representation.length === 0) {
                    return true;
                }

                as.Representation = as.Representation.filter((representation) => {
                    return !customCapabilitiesFilters.some(customFilter => !customFilter(representation));
                });

                return as.Representation && as.Representation.length > 0;
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
