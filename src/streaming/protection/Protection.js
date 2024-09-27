/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import ProtectionController from './controllers/ProtectionController.js';
import ProtectionKeyController from './controllers/ProtectionKeyController.js';
import ProtectionEvents from './ProtectionEvents.js';
import ProtectionErrors from './errors/ProtectionErrors.js';
import DefaultProtectionModel from './models/DefaultProtectionModel.js';
import ProtectionModel_3Feb2014 from './models/ProtectionModel_3Feb2014.js';
import ProtectionModel_01b from './models/ProtectionModel_01b.js';

const APIS_ProtectionModel_01b = [
    // Un-prefixed as per spec
    {
        // Video Element
        generateKeyRequest: 'generateKeyRequest',
        addKey: 'addKey',
        cancelKeyRequest: 'cancelKeyRequest',

        // Events
        needkey: 'needkey',
        keyerror: 'keyerror',
        keyadded: 'keyadded',
        keymessage: 'keymessage'
    },
    // Webkit-prefixed (early Chrome versions and Chrome with EME disabled in chrome://flags)
    {
        // Video Element
        generateKeyRequest: 'webkitGenerateKeyRequest',
        addKey: 'webkitAddKey',
        cancelKeyRequest: 'webkitCancelKeyRequest',

        // Events
        needkey: 'webkitneedkey',
        keyerror: 'webkitkeyerror',
        keyadded: 'webkitkeyadded',
        keymessage: 'webkitkeymessage'
    }
];

const APIS_ProtectionModel_3Feb2014 = [
    // Un-prefixed as per spec
    // Chrome 38-39 (and some earlier versions) with chrome://flags -- Enable Encrypted Media Extensions
    {
        // Video Element
        setMediaKeys: 'setMediaKeys',
        // MediaKeys
        MediaKeys: 'MediaKeys',
        // MediaKeySession
        release: 'close',

        // Events
        needkey: 'needkey',
        error: 'keyerror',
        message: 'keymessage',
        ready: 'keyadded',
        close: 'keyclose'
    },
    // MS-prefixed (IE11, Windows 8.1)
    {
        // Video Element
        setMediaKeys: 'msSetMediaKeys',
        // MediaKeys
        MediaKeys: 'MSMediaKeys',
        // MediaKeySession
        release: 'close',
        // Events
        needkey: 'msneedkey',
        error: 'mskeyerror',
        message: 'mskeymessage',
        ready: 'mskeyadded',
        close: 'mskeyclose'
    }
];

function Protection() {
    let instance;
    const context = this.context;

    /**
     * Create a ProtectionController and associated ProtectionModel for use with
     * a single piece of content.
     *
     * @param {Object} config
     * @return {ProtectionController} protection controller
     *
     */
    function createProtectionSystem(config) {
        let controller = null;

        const protectionKeyController = ProtectionKeyController(context).getInstance();
        protectionKeyController.setConfig({ debug: config.debug, BASE64: config.BASE64, settings: config.settings });
        protectionKeyController.initialize();

        let protectionModel = _getProtectionModel(config);

        if (protectionModel) {
            controller = ProtectionController(context).create({
                BASE64: config.BASE64,
                cmcdModel: config.cmcdModel,
                constants: config.constants,
                customParametersModel: config.customParametersModel,
                debug: config.debug,
                eventBus: config.eventBus,
                events: config.events,
                protectionKeyController: protectionKeyController,
                protectionModel: protectionModel,
                settings: config.settings
            });
            config.capabilities.setEncryptedMediaSupported(true);
        }
        return controller;
    }

    function _getProtectionModel(config) {
        const debug = config.debug;
        const logger = debug.getLogger(instance);
        const eventBus = config.eventBus;
        const errHandler = config.errHandler;
        const videoElement = config.videoModel ? config.videoModel.getElement() : null;

        if ((!videoElement || videoElement.onencrypted !== undefined) &&
            (!videoElement || videoElement.mediaKeys !== undefined)) {
            logger.info('EME detected on this user agent! (DefaultProtectionModel');
            return DefaultProtectionModel(context).create({
                debug: debug,
                eventBus: eventBus,
                events: config.events
            });
        } else if (_getAPI(videoElement, APIS_ProtectionModel_3Feb2014)) {
            logger.info('EME detected on this user agent! (ProtectionModel_3Feb2014)');
            return ProtectionModel_3Feb2014(context).create({
                debug: debug,
                eventBus: eventBus,
                events: config.events,
                api: _getAPI(videoElement, APIS_ProtectionModel_3Feb2014)
            });
        } else if (_getAPI(videoElement, APIS_ProtectionModel_01b)) {
            logger.info('EME detected on this user agent! (ProtectionModel_01b)');
            return ProtectionModel_01b(context).create({
                debug: debug,
                eventBus: eventBus,
                errHandler: errHandler,
                events: config.events,
                api: _getAPI(videoElement, APIS_ProtectionModel_01b)
            });
        } else {
            logger.warn('No supported version of EME detected on this user agent! - Attempts to play encrypted content will fail!');
            return null;
        }
    }

    function _getAPI(videoElement, apis) {
        for (let i = 0; i < apis.length; i++) {
            const api = apis[i];
            // detect if api is supported by browser
            // check only first function in api -> should be fine
            if (typeof videoElement[api[Object.keys(api)[0]]] !== 'function') {
                continue;
            }

            return api;
        }

        return null;
    }

    instance = {
        createProtectionSystem
    };

    return instance;
}

Protection.__dashjs_factory_name = 'Protection';
const factory = dashjs.FactoryMaker.getClassFactory(Protection);
factory.events = ProtectionEvents;
factory.errors = ProtectionErrors;
dashjs.FactoryMaker.updateClassFactory(Protection.__dashjs_factory_name, factory);
export default factory;
