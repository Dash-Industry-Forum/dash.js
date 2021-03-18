import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Constants from '../constants/Constants';
import DashJSError from "../vo/DashJSError";
import Errors from "../../core/errors/Errors";

function CapabilitiesFilter() {
    const context = this.context;
    let instance,
        adapter,
        capabilities,
        manifestModel,
        errHandler,
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

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
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
    }

    function isMediaSupported(mediaInfo) {
        const type = mediaInfo ? mediaInfo.type : null;
        let codec,
            msg;

        if (type === Constants.MUXED) {
            msg = 'Multiplexed representations are intentionally not supported, as they are not compliant with the DASH-AVC/264 guidelines';
            logger.fatal(msg);
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_MULTIPLEXED_CODE, msg, manifestModel.getValue()));
            return false;
        }

        if (type === Constants.TEXT || type === Constants.FRAGMENTED_TEXT || type === Constants.EMBEDDED_TEXT || type === Constants.IMAGE) {
            return true;
        }

        codec = mediaInfo.codec;
        logger.debug(type + ' codec: ' + codec);

        if (!!mediaInfo.contentProtection && !capabilities.supportsEncryptedMedia()) {
            errHandler.error(new DashJSError(Errors.CAPABILITY_MEDIAKEYS_ERROR_CODE, Errors.CAPABILITY_MEDIAKEYS_ERROR_MESSAGE));
        } else if (!capabilities.supportsCodec(codec)) {
            msg = type + 'Codec (' + codec + ') is not supported.';
            logger.error(msg);
            return false;
        }

        return true;
    }

    instance = {
        setConfig,
        filterUnsupportedFeaturesOfPeriod,
        isMediaSupported
    };

    setup();

    return instance;
}

CapabilitiesFilter.__dashjs_factory_name = 'CapabilitiesFilter';
export default FactoryMaker.getSingletonFactory(CapabilitiesFilter);
