//protection
import ProtectionController from '../controllers/ProtectionController.js';
import ProtectionExtensions from '../extensions/ProtectionExtensions.js';
import ProtectionEvents from './ProtectionEvents.js';
import ProtectionModel_21Jan2015 from '../models/ProtectionModel_21Jan2015.js';
import ProtectionModel_3Feb2014 from '../models/ProtectionModel_3Feb2014.js';
import ProtectionModel_01b from '../models/ProtectionModel_01b.js';
import FactoryMaker from '../../core/FactoryMaker.js'

const APIS_ProtectionModel_01b = [
    // Un-prefixed as per spec
    {
        // Video Element
        generateKeyRequest: "generateKeyRequest",
        addKey: "addKey",
        cancelKeyRequest: "cancelKeyRequest",

        // Events
        needkey: "needkey",
        keyerror: "keyerror",
        keyadded: "keyadded",
        keymessage: "keymessage"
    },
    // Webkit-prefixed (early Chrome versions and Chrome with EME disabled in chrome://flags)
    {
        // Video Element
        generateKeyRequest: "webkitGenerateKeyRequest",
        addKey: "webkitAddKey",
        cancelKeyRequest: "webkitCancelKeyRequest",

        // Events
        needkey: "webkitneedkey",
        keyerror: "webkitkeyerror",
        keyadded: "webkitkeyadded",
        keymessage: "webkitkeymessage"
    }
];

const APIS_ProtectionModel_3Feb2014 = [
    // Un-prefixed as per spec
    // Chrome 38-39 (and some earlier versions) with chrome://flags -- Enable Encrypted Media Extensions
    {
        // Video Element
        setMediaKeys: "setMediaKeys",
        // MediaKeys
        MediaKeys: "MediaKeys",
        // MediaKeySession
        release: "close",

        // Events
        needkey: "needkey",
        error: "keyerror",
        message: "keymessage",
        ready: "keyadded",
        close: "keyclose"
    },
    // MS-prefixed (IE11, Windows 8.1)
    {
        // Video Element
        setMediaKeys: "msSetMediaKeys",
        // MediaKeys
        MediaKeys: "MSMediaKeys",
        // MediaKeySession
        release: "close",
        // Events
        needkey: "msneedkey",
        error: "mskeyerror",
        message: "mskeymessage",
        ready: "mskeyadded",
        close: "mskeyclose"
    }
];


let factory = FactoryMaker.getClassFactory(Protection);
factory.events = ProtectionEvents;
export default factory;

function Protection() {

    let context = this.context;
    let instance = {
        createProtectionSystem:createProtectionSystem
    }
    return instance;

    /**
     * Create a ProtectionController and associated ProtectionModel for use with
     * a single piece of content.
     *
     * @return {MediaPlayer.dependencies.ProtectionController} protection controller
     * @memberof MediaPlayer#
     */
    function createProtectionSystem(config) {

        let controller = null;

        let protectionExt = ProtectionExtensions(context).getInstance();
        protectionExt.setConfig({
            log: config.log,
        });
        protectionExt.initialize();

        let protectionModel =  getProtectionModel(config);

        if(!controller && protectionModel) {//TODO add ability to set external controller if still needed at all?
            controller = ProtectionController(context).create({
                protectionModel:protectionModel,
                protectionExt: protectionExt,
                adapter: config.adapter,
                eventBus: config.eventBus,
                log: config.log
            });
            config.capabilities.setEncryptedMediaSupported(true);
        }
        return controller;
    }

    function getProtectionModel(config) {

        let log = config.log;
        let eventBus = config.eventBus;
        let videoElement = config.videoModel.getElement();

        if (videoElement.onencrypted !== undefined &&
            videoElement.mediaKeys !== undefined &&
            navigator.requestMediaKeySystemAccess !== undefined &&
            typeof navigator.requestMediaKeySystemAccess === 'function') {

            log("EME detected on this user agent! (ProtectionModel_21Jan2015)");
            return ProtectionModel_21Jan2015(context).create({log:log, eventBus:eventBus});

        } else if (getAPI(APIS_ProtectionModel_3Feb2014)){

            log("EME detected on this user agent! (ProtectionModel_3Feb2014)");
            return ProtectionModel_3Feb2014(context).create({log: log, eventBus:eventBus, api:getAPI(APIS_ProtectionModel_3Feb2014)});

        } else if (getAPI(APIS_ProtectionModel_01b)) {

            log("EME detected on this user agent! (ProtectionModel_01b)");
            return ProtectionModel_01b(context).create({log: log, eventBus:eventBus, api:getAPI(APIS_ProtectionModel_01b)});

        } else {

            log("No supported version of EME detected on this user agent! - Attempts to play encrypted content will fail!");
            return null;

        }
    }

    function getAPI(apis) {

        for (var i = 0; i < apis.length; i++) {
            var api = apis[i];
            if (typeof videoElement[api.generateKeyRequest] !== 'function') {
                continue;
            }
            if (typeof videoElement[api.addKey] !== 'function') {
                continue;
            }
            if (typeof videoElement[api.cancelKeyRequest] !== 'function') {
                continue;
            }

            if (typeof videoElement[api.setMediaKeys] !== 'function') {
                continue;
            }
            if (typeof window[api.MediaKeys] !== 'function')  {
                continue;
            }

            return api;
        }

        return null;
    }
}