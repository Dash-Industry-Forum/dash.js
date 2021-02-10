import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Constants from '../constants/Constants';

function CapabilitiesFilter() {
    const context = this.context;
    let instance,
        adapter,
        capabilities,
        settings,
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

    }

    function filterUnsupportedFeaturesOfPeriod(streamInfo) {
        _filterUnsupportedCodecs(Constants.VIDEO, streamInfo);
        _filterUnsupportedCodecs(Constants.AUDIO, streamInfo);

        if (settings.get().streaming.filterUnsupportedEssentialProperties) {
            _filterUnsupportedEssentialProperties(streamInfo);
        }
    }


    function _filterUnsupportedCodecs(type, streamInfo) {
        const realPeriod = adapter.getRealPeriodByIndex(streamInfo ? streamInfo.index : null);

        if (!realPeriod || !realPeriod.AdaptationSet || realPeriod.AdaptationSet.length === 0) {
            return;
        }

        realPeriod.AdaptationSet = realPeriod.AdaptationSet.filter((as) => {

            if (!as.Representation || as.Representation.length === 0 || !adapter.getIsTypeOf(as, type)) {
                return true;
            }

            as.Representation = as.Representation.filter((_, i) => {
                const codec = adapter.getCodec(as, i, true);
                if (!capabilities.supportsCodec(codec)) {
                    logger.error('[Stream] codec not supported: ' + codec);
                    return false;
                }
                return true;
            });

            return as.Representation && as.Representation.length > 0;
        });

    }

    function _filterUnsupportedEssentialProperties(streamInfo) {
        const realPeriod = adapter.getRealPeriodByIndex(streamInfo ? streamInfo.index : null);

        if (!realPeriod || !realPeriod.AdaptationSet || realPeriod.AdaptationSet.length === 0) {
            return;
        }

        realPeriod.AdaptationSet = realPeriod.AdaptationSet.filter((as) => {

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

    }

    instance = {
        setConfig,
        filterUnsupportedFeaturesOfPeriod
    };

    setup();

    return instance;
}

CapabilitiesFilter.__dashjs_factory_name = 'CapabilitiesFilter';
export default FactoryMaker.getSingletonFactory(CapabilitiesFilter);
