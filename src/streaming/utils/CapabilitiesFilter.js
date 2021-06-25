import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Constants from '../constants/Constants';

function CapabilitiesFilter() {
    const context = this.context;
    let instance,
        adapter,
        capabilities,
        settings,
        logger,
        customCapabilitiesFilters;


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

            if (!as.Representation_asArray || as.Representation_asArray.length === 0) {
                resolve();
                return;
            }

            const promises = [];
            const configurations = [];

            as.Representation_asArray.forEach((rep, i) => {
                const codec = adapter.getCodec(as, i, false);
                const config = _createConfiguration(type,rep, codec);

                configurations.push(config);
                promises.push(capabilities.supportsCodec(config, type));
            });

            Promise.all(promises)
                .then((supported) => {
                    as.Representation_asArray = as.Representation_asArray.filter((_, i) => {
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

    function setCustomCapabilitiesFilters(customFilters) {
        customCapabilitiesFilters = customFilters;
    }

    instance = {
        setConfig,
        filterUnsupportedFeatures,
        setCustomCapabilitiesFilters
    };

    setup();

    return instance;
}

CapabilitiesFilter.__dashjs_factory_name = 'CapabilitiesFilter';
export default FactoryMaker.getSingletonFactory(CapabilitiesFilter);
