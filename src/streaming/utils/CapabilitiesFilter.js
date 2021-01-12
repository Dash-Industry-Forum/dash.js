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

        if (!realPeriod || !realPeriod.AdaptationSet_asArray || realPeriod.AdaptationSet_asArray.length === 0) {
            return;
        }

        realPeriod.AdaptationSet_asArray = realPeriod.AdaptationSet_asArray.filter((as) => {

            if (!as.Representation_asArray || as.Representation_asArray.length === 0 || !adapter.getIsTypeOf(as, type)) {
                return true;
            }

            as.Representation_asArray = as.Representation_asArray.filter((_, i) => {
                const codec = adapter.getCodec(as, i, true);
                if (!capabilities.supportsCodec(codec)) {
                    logger.error('[Stream] codec not supported: ' + codec);
                    return false;
                }
                return true;
            });

            return as.Representation_asArray && as.Representation_asArray.length > 0;
        });

    }

    function _filterUnsupportedEssentialProperties(streamInfo) {
        const realPeriod = adapter.getRealPeriodByIndex(streamInfo ? streamInfo.index : null);

        if (!realPeriod || !realPeriod.AdaptationSet_asArray || realPeriod.AdaptationSet_asArray.length === 0) {
            return;
        }

        realPeriod.AdaptationSet_asArray = realPeriod.AdaptationSet_asArray.filter((as) => {

            if (!as.Representation_asArray || as.Representation_asArray.length === 0) {
                return true;
            }

            as.Representation_asArray = as.Representation_asArray.filter((rep) => {
                const essentialProperties = adapter.getEssentialPropertiesForRepresentation(rep);

                if (essentialProperties && essentialProperties.length > 0) {
                    essentialProperties.forEach((ep) => {
                        if (!capabilities.supportsEssentialProperty(ep)) {
                            logger.debug('[Stream] EssentialProperty not supported: ' + ep.schemeIdUri);
                            return false;
                        }
                    });
                }

                return true;
            });

            return as.Representation_asArray && as.Representation_asArray.length > 0;
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
