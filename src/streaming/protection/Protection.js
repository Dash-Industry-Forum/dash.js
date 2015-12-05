//protection
import ProtectionController from '../controllers/ProtectionController.js';
import ProtectionExtensions from '../extensions/ProtectionExtensions.js';
import ProtectionEvents from './ProtectionEvents.js';
import ProtectionModel_21Jan2015 from '../models/ProtectionModel_21Jan2015.js';
//import ProtectionModel_3Feb2014 from './models/ProtectionModel_3Feb2014.js';
//import ProtectionModel_01b from './models/ProtectionModel_01b.js';
import FactoryMaker from '../../core/FactoryMaker.js'

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

        let controller;

        if(!controller && config.capabilities.supportsEncryptedMedia()) {

            let protectionExt = ProtectionExtensions(context).getInstance();
            protectionExt.setConfig({
                log: config.log,
            });
            protectionExt.initialize();

            let protectionModel = ProtectionModel_21Jan2015(context).create({
                log: config.log,
                eventBus:config.eventBus
            });

            controller = ProtectionController(context).create({
                protectionModel:protectionModel,
                protectionExt: protectionExt,
                adapter: config.adapter,
                eventBus: config.eventBus,
                log: config.log
            });
        }

        return controller;
    }
}