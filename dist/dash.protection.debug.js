(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.dashjs || (g.dashjs = {})).Protection = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(_dereq_,module,exports){
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
/**
 * @class
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ErrorsBase = (function () {
    function ErrorsBase() {
        _classCallCheck(this, ErrorsBase);
    }

    _createClass(ErrorsBase, [{
        key: 'extend',
        value: function extend(errors, config) {
            if (!errors) return;

            var override = config ? config.override : false;
            var publicOnly = config ? config.publicOnly : false;

            for (var err in errors) {
                if (!errors.hasOwnProperty(err) || this[err] && !override) continue;
                if (publicOnly && errors[err].indexOf('public_') === -1) continue;
                this[err] = errors[err];
            }
        }
    }]);

    return ErrorsBase;
})();

exports['default'] = ErrorsBase;
module.exports = exports['default'];

},{}],2:[function(_dereq_,module,exports){
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
/**
 * @class
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var EventsBase = (function () {
    function EventsBase() {
        _classCallCheck(this, EventsBase);
    }

    _createClass(EventsBase, [{
        key: 'extend',
        value: function extend(events, config) {
            if (!events) return;

            var override = config ? config.override : false;
            var publicOnly = config ? config.publicOnly : false;

            for (var evt in events) {
                if (!events.hasOwnProperty(evt) || this[evt] && !override) continue;
                if (publicOnly && events[evt].indexOf('public_') === -1) continue;
                this[evt] = events[evt];
            }
        }
    }]);

    return EventsBase;
})();

exports['default'] = EventsBase;
module.exports = exports['default'];

},{}],3:[function(_dereq_,module,exports){
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

/**
 * Protection Constants declaration
 * @class
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ProtectionConstants = (function () {
    _createClass(ProtectionConstants, [{
        key: 'init',
        value: function init() {
            this.CLEARKEY_KEYSTEM_STRING = 'org.w3.clearkey';
            this.WIDEVINE_KEYSTEM_STRING = 'com.widevine.alpha';
            this.PLAYREADY_KEYSTEM_STRING = 'com.microsoft.playready';
        }
    }]);

    function ProtectionConstants() {
        _classCallCheck(this, ProtectionConstants);

        this.init();
    }

    return ProtectionConstants;
})();

var constants = new ProtectionConstants();
exports['default'] = constants;
module.exports = exports['default'];

},{}],4:[function(_dereq_,module,exports){
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

/**
 * @class
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var CommonEncryption = (function () {
    function CommonEncryption() {
        _classCallCheck(this, CommonEncryption);
    }

    _createClass(CommonEncryption, null, [{
        key: 'findCencContentProtection',

        /**
         * Find and return the ContentProtection element in the given array
         * that indicates support for MPEG Common Encryption
         *
         * @param {Array} cpArray array of content protection elements
         * @returns {Object|null} the Common Encryption content protection element or
         * null if one was not found
         */
        value: function findCencContentProtection(cpArray) {
            var retVal = null;
            for (var i = 0; i < cpArray.length; ++i) {
                var cp = cpArray[i];
                if (cp.schemeIdUri.toLowerCase() === 'urn:mpeg:dash:mp4protection:2011' && cp.value.toLowerCase() === 'cenc') retVal = cp;
            }
            return retVal;
        }

        /**
         * Returns just the data portion of a single PSSH
         *
         * @param {ArrayBuffer} pssh - the PSSH
         * @return {ArrayBuffer} data portion of the PSSH
         */
    }, {
        key: 'getPSSHData',
        value: function getPSSHData(pssh) {
            var offset = 8; // Box size and type fields
            var view = new DataView(pssh);

            // Read version
            var version = view.getUint8(offset);

            offset += 20; // Version (1), flags (3), system ID (16)

            if (version > 0) {
                offset += 4 + 16 * view.getUint32(offset); // Key ID count (4) and All key IDs (16*count)
            }

            offset += 4; // Data size
            return pssh.slice(offset);
        }

        /**
         * Returns the PSSH associated with the given key system from the concatenated
         * list of PSSH boxes in the given initData
         *
         * @param {KeySystem} keySystem the desired
         * key system
         * @param {ArrayBuffer} initData 'cenc' initialization data.  Concatenated list of PSSH.
         * @returns {ArrayBuffer|null} The PSSH box data corresponding to the given key system, null if not found
         * or null if a valid association could not be found.
         */
    }, {
        key: 'getPSSHForKeySystem',
        value: function getPSSHForKeySystem(keySystem, initData) {
            var psshList = CommonEncryption.parsePSSHList(initData);
            if (keySystem && psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
                return psshList[keySystem.uuid.toLowerCase()];
            }
            return null;
        }

        /**
         * Parse a standard common encryption PSSH which contains a simple
         * base64-encoding of the init data
         *
         * @param {Object} cpData the ContentProtection element
         * @param {BASE64} BASE64 reference
         * @returns {ArrayBuffer|null} the init data or null if not found
         */
    }, {
        key: 'parseInitDataFromContentProtection',
        value: function parseInitDataFromContentProtection(cpData, BASE64) {
            if ('pssh' in cpData) {
                return BASE64.decodeArray(cpData.pssh.__text).buffer;
            }
            return null;
        }

        /**
         * Parses list of PSSH boxes into keysystem-specific PSSH data
         *
         * @param {ArrayBuffer} data - the concatenated list of PSSH boxes as provided by
         * CDM as initialization data when CommonEncryption content is detected
         * @returns {Object|Array} an object that has a property named according to each of
         * the detected key system UUIDs (e.g. 00000000-0000-0000-0000-0000000000)
         * and a ArrayBuffer (the entire PSSH box) as the property value
         */
    }, {
        key: 'parsePSSHList',
        value: function parsePSSHList(data) {

            if (data === null || data === undefined) return [];

            var dv = new DataView(data.buffer || data); // data.buffer first for Uint8Array support
            var done = false;
            var pssh = {};

            // TODO: Need to check every data read for end of buffer
            var byteCursor = 0;
            while (!done) {

                var size = undefined,
                    nextBox = undefined,
                    version = undefined,
                    systemID = undefined,
                    psshDataSize = undefined;
                var boxStart = byteCursor;

                if (byteCursor >= dv.buffer.byteLength) break;

                /* Box size */
                size = dv.getUint32(byteCursor);
                nextBox = byteCursor + size;
                byteCursor += 4;

                /* Verify PSSH */
                if (dv.getUint32(byteCursor) !== 0x70737368) {
                    byteCursor = nextBox;
                    continue;
                }
                byteCursor += 4;

                /* Version must be 0 or 1 */
                version = dv.getUint8(byteCursor);
                if (version !== 0 && version !== 1) {
                    byteCursor = nextBox;
                    continue;
                }
                byteCursor++;

                byteCursor += 3; /* skip flags */

                // 16-byte UUID/SystemID
                systemID = '';
                var i = undefined,
                    val = undefined;
                for (i = 0; i < 4; i++) {
                    val = dv.getUint8(byteCursor + i).toString(16);
                    systemID += val.length === 1 ? '0' + val : val;
                }
                byteCursor += 4;
                systemID += '-';
                for (i = 0; i < 2; i++) {
                    val = dv.getUint8(byteCursor + i).toString(16);
                    systemID += val.length === 1 ? '0' + val : val;
                }
                byteCursor += 2;
                systemID += '-';
                for (i = 0; i < 2; i++) {
                    val = dv.getUint8(byteCursor + i).toString(16);
                    systemID += val.length === 1 ? '0' + val : val;
                }
                byteCursor += 2;
                systemID += '-';
                for (i = 0; i < 2; i++) {
                    val = dv.getUint8(byteCursor + i).toString(16);
                    systemID += val.length === 1 ? '0' + val : val;
                }
                byteCursor += 2;
                systemID += '-';
                for (i = 0; i < 6; i++) {
                    val = dv.getUint8(byteCursor + i).toString(16);
                    systemID += val.length === 1 ? '0' + val : val;
                }
                byteCursor += 6;

                systemID = systemID.toLowerCase();

                /* PSSH Data Size */
                psshDataSize = dv.getUint32(byteCursor);
                byteCursor += 4;

                /* PSSH Data */
                pssh[systemID] = dv.buffer.slice(boxStart, nextBox);
                byteCursor = nextBox;
            }

            return pssh;
        }
    }]);

    return CommonEncryption;
})();

exports['default'] = CommonEncryption;
module.exports = exports['default'];

},{}],5:[function(_dereq_,module,exports){
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
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _controllersProtectionController = _dereq_(7);

var _controllersProtectionController2 = _interopRequireDefault(_controllersProtectionController);

var _controllersProtectionKeyController = _dereq_(8);

var _controllersProtectionKeyController2 = _interopRequireDefault(_controllersProtectionKeyController);

var _ProtectionEvents = _dereq_(6);

var _ProtectionEvents2 = _interopRequireDefault(_ProtectionEvents);

var _errorsProtectionErrors = _dereq_(13);

var _errorsProtectionErrors2 = _interopRequireDefault(_errorsProtectionErrors);

var _modelsProtectionModel_21Jan2015 = _dereq_(15);

var _modelsProtectionModel_21Jan20152 = _interopRequireDefault(_modelsProtectionModel_21Jan2015);

var _modelsProtectionModel_3Feb2014 = _dereq_(16);

var _modelsProtectionModel_3Feb20142 = _interopRequireDefault(_modelsProtectionModel_3Feb2014);

var _modelsProtectionModel_01b = _dereq_(14);

var _modelsProtectionModel_01b2 = _interopRequireDefault(_modelsProtectionModel_01b);

var APIS_ProtectionModel_01b = [
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
}];

var APIS_ProtectionModel_3Feb2014 = [
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
}];

function Protection() {
    var instance = undefined;
    var context = this.context;

    /**
     * Create a ProtectionController and associated ProtectionModel for use with
     * a single piece of content.
     *
     * @param {Object} config
     * @return {ProtectionController} protection controller
     *
     */
    function createProtectionSystem(config) {
        var controller = null;

        var protectionKeyController = (0, _controllersProtectionKeyController2['default'])(context).getInstance();
        protectionKeyController.setConfig({ debug: config.debug, BASE64: config.BASE64 });
        protectionKeyController.initialize();

        var protectionModel = getProtectionModel(config);

        if (!controller && protectionModel) {
            //TODO add ability to set external controller if still needed at all?
            controller = (0, _controllersProtectionController2['default'])(context).create({
                protectionModel: protectionModel,
                protectionKeyController: protectionKeyController,
                eventBus: config.eventBus,
                debug: config.debug,
                events: config.events,
                BASE64: config.BASE64,
                constants: config.constants
            });
            config.capabilities.setEncryptedMediaSupported(true);
        }
        return controller;
    }

    function getProtectionModel(config) {
        var debug = config.debug;
        var logger = debug.getLogger(instance);
        var eventBus = config.eventBus;
        var errHandler = config.errHandler;
        var videoElement = config.videoModel ? config.videoModel.getElement() : null;

        if ((!videoElement || videoElement.onencrypted !== undefined) && (!videoElement || videoElement.mediaKeys !== undefined)) {
            logger.info('EME detected on this user agent! (ProtectionModel_21Jan2015)');
            return (0, _modelsProtectionModel_21Jan20152['default'])(context).create({ debug: debug, eventBus: eventBus, events: config.events });
        } else if (getAPI(videoElement, APIS_ProtectionModel_3Feb2014)) {
            logger.info('EME detected on this user agent! (ProtectionModel_3Feb2014)');
            return (0, _modelsProtectionModel_3Feb20142['default'])(context).create({ debug: debug, eventBus: eventBus, events: config.events, api: getAPI(videoElement, APIS_ProtectionModel_3Feb2014) });
        } else if (getAPI(videoElement, APIS_ProtectionModel_01b)) {
            logger.info('EME detected on this user agent! (ProtectionModel_01b)');
            return (0, _modelsProtectionModel_01b2['default'])(context).create({ debug: debug, eventBus: eventBus, errHandler: errHandler, events: config.events, api: getAPI(videoElement, APIS_ProtectionModel_01b) });
        } else {
            logger.warn('No supported version of EME detected on this user agent! - Attempts to play encrypted content will fail!');
            return null;
        }
    }

    function getAPI(videoElement, apis) {
        for (var i = 0; i < apis.length; i++) {
            var api = apis[i];
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
        createProtectionSystem: createProtectionSystem
    };

    return instance;
}

Protection.__dashjs_factory_name = 'Protection';
var factory = dashjs.FactoryMaker.getClassFactory(Protection); /* jshint ignore:line */
factory.events = _ProtectionEvents2['default'];
factory.errors = _errorsProtectionErrors2['default'];
dashjs.FactoryMaker.updateClassFactory(Protection.__dashjs_factory_name, factory); /* jshint ignore:line */
exports['default'] = factory;
module.exports = exports['default'];

},{"13":13,"14":14,"15":15,"16":16,"6":6,"7":7,"8":8}],6:[function(_dereq_,module,exports){
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
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _coreEventsEventsBase = _dereq_(2);

var _coreEventsEventsBase2 = _interopRequireDefault(_coreEventsEventsBase);

/**
 * @class
  */

var ProtectionEvents = (function (_EventsBase) {
  _inherits(ProtectionEvents, _EventsBase);

  /**
   * @description Public facing external events to be used when including protection package.
   * All public events will be aggregated into the MediaPlayerEvents Class and can be accessed
   * via MediaPlayer.events.  public_ is the prefix that we use to move event names to MediaPlayerEvents.
   */

  function ProtectionEvents() {
    _classCallCheck(this, ProtectionEvents);

    _get(Object.getPrototypeOf(ProtectionEvents.prototype), 'constructor', this).call(this);

    /**
     * Event ID for events delivered when the protection set receives
     * a key message from the CDM
     *
     * @ignore
     */
    this.INTERNAL_KEY_MESSAGE = 'internalKeyMessage';

    /**
     * Event ID for events delivered when a key system selection procedure
     * completes
     * @ignore
     */
    this.INTERNAL_KEY_SYSTEM_SELECTED = 'internalKeySystemSelected';

    /**
     * Event ID for events delivered when the status of one decryption keys has changed
     * @ignore
     */
    this.INTERNAL_KEY_STATUS_CHANGED = 'internalkeyStatusChanged';

    /**
     * Event ID for events delivered when a new key has been added
     *
     * @constant
     * @deprecated The latest versions of the EME specification no longer
     * use this event.  {@MediaPlayer.models.protectionModel.eventList.KEY_STATUSES_CHANGED}
     * is preferred.
     * @event ProtectionEvents#KEY_ADDED
     */
    this.KEY_ADDED = 'public_keyAdded';
    /**
     * Event ID for events delivered when an error is encountered by the CDM
     * while processing a license server response message
     * @event ProtectionEvents#KEY_ERROR
     */
    this.KEY_ERROR = 'public_keyError';

    /**
     * Event ID for events delivered when the protection set receives
     * a key message from the CDM
     * @event ProtectionEvents#KEY_MESSAGE
     */
    this.KEY_MESSAGE = 'public_keyMessage';

    /**
     * Event ID for events delivered when a key session close
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_CLOSED
     */
    this.KEY_SESSION_CLOSED = 'public_keySessionClosed';

    /**
     * Event ID for events delivered when a new key sessions creation
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_CREATED
     */
    this.KEY_SESSION_CREATED = 'public_keySessionCreated';

    /**
     * Event ID for events delivered when a key session removal
     * process has completed
     * @event ProtectionEvents#KEY_SESSION_REMOVED
     */
    this.KEY_SESSION_REMOVED = 'public_keySessionRemoved';

    /**
     * Event ID for events delivered when the status of one or more
     * decryption keys has changed
     * @event ProtectionEvents#KEY_STATUSES_CHANGED
     */
    this.KEY_STATUSES_CHANGED = 'public_keyStatusesChanged';

    /**
     * Event ID for events delivered when a key system access procedure
     * has completed
     * @ignore
     */
    this.KEY_SYSTEM_ACCESS_COMPLETE = 'public_keySystemAccessComplete';

    /**
     * Event ID for events delivered when a key system selection procedure
     * completes
     * @event ProtectionEvents#KEY_SYSTEM_SELECTED
     */
    this.KEY_SYSTEM_SELECTED = 'public_keySystemSelected';

    /**
     * Event ID for events delivered when a license request procedure
     * has completed
     * @event ProtectionEvents#LICENSE_REQUEST_COMPLETE
     */
    this.LICENSE_REQUEST_COMPLETE = 'public_licenseRequestComplete';

    /**
     * Event ID for needkey/encrypted events
     * @ignore
     */
    this.NEED_KEY = 'needkey';

    /**
     * Event ID for events delivered when the Protection system is detected and created.
     * @event ProtectionEvents#PROTECTION_CREATED
     */
    this.PROTECTION_CREATED = 'public_protectioncreated';

    /**
     * Event ID for events delivered when the Protection system is destroyed.
     * @event ProtectionEvents#PROTECTION_DESTROYED
     */
    this.PROTECTION_DESTROYED = 'public_protectiondestroyed';

    /**
     * Event ID for events delivered when a new server certificate has
     * been delivered to the CDM
     * @ignore
     */
    this.SERVER_CERTIFICATE_UPDATED = 'serverCertificateUpdated';

    /**
     * Event ID for events delivered when the process of shutting down
     * a protection set has completed
     * @ignore
     */
    this.TEARDOWN_COMPLETE = 'protectionTeardownComplete';

    /**
     * Event ID for events delivered when a HTMLMediaElement has been
     * associated with the protection set
     * @ignore
     */
    this.VIDEO_ELEMENT_SELECTED = 'videoElementSelected';
  }

  return ProtectionEvents;
})(_coreEventsEventsBase2['default']);

var protectionEvents = new ProtectionEvents();
exports['default'] = protectionEvents;
module.exports = exports['default'];

},{"2":2}],7:[function(_dereq_,module,exports){
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

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _voMediaCapability = _dereq_(26);

var _voMediaCapability2 = _interopRequireDefault(_voMediaCapability);

var _voKeySystemConfiguration = _dereq_(25);

var _voKeySystemConfiguration2 = _interopRequireDefault(_voKeySystemConfiguration);

var _errorsProtectionErrors = _dereq_(13);

var _errorsProtectionErrors2 = _interopRequireDefault(_errorsProtectionErrors);

var _voDashJSError = _dereq_(28);

var _voDashJSError2 = _interopRequireDefault(_voDashJSError);

var NEEDKEY_BEFORE_INITIALIZE_RETRIES = 5;
var NEEDKEY_BEFORE_INITIALIZE_TIMEOUT = 500;

var LICENSE_SERVER_REQUEST_RETRIES = 3;
var LICENSE_SERVER_REQUEST_RETRY_INTERVAL = 1000;
var LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT = 8000;

/**
 * @module ProtectionController
 * @description Provides access to media protection information and functionality.  Each
 * ProtectionController manages a single {@link MediaPlayer.models.ProtectionModel}
 * which encapsulates a set of protection information (EME APIs, selected key system,
 * key sessions).  The APIs of ProtectionController mostly align with the latest EME
 * APIs.  Key system selection is mostly automated when combined with app-overrideable
 * functionality provided in {@link ProtectionKeyController}.
 * @todo ProtectionController does almost all of its tasks automatically after init() is
 * called.  Applications might want more control over this process and want to go through
 * each step manually (key system selection, session creation, session maintenance).
 * @param {Object} config
 */

function ProtectionController(config) {

    config = config || {};
    var protectionKeyController = config.protectionKeyController;
    var protectionModel = config.protectionModel;
    var eventBus = config.eventBus;
    var events = config.events;
    var debug = config.debug;
    var BASE64 = config.BASE64;
    var constants = config.constants;
    var needkeyRetries = [];

    var instance = undefined,
        logger = undefined,
        pendingNeedKeyData = undefined,
        mediaInfoArr = undefined,
        protDataSet = undefined,
        sessionType = undefined,
        robustnessLevel = undefined,
        keySystem = undefined;

    function setup() {
        logger = debug.getLogger(instance);
        pendingNeedKeyData = [];
        mediaInfoArr = [];
        sessionType = 'temporary';
        robustnessLevel = '';
    }

    function checkConfig() {
        if (!eventBus || !eventBus.hasOwnProperty('on') || !protectionKeyController || !protectionKeyController.hasOwnProperty('getSupportedKeySystemsFromContentProtection')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    /**
     * Initialize this protection system with a given audio
     * or video stream information.
     *
     * @param {StreamInfo} [mediaInfo] Media information
     * @memberof module:ProtectionController
     * @instance
     * @todo This API will change when we have better support for allowing applications
     * to select different adaptation sets for playback.  Right now it is clunky for
     * applications to create {@link StreamInfo} with the right information,
     * @ignore
     */
    function initializeForMedia(mediaInfo) {
        // Not checking here if a session for similar KS/KID combination is already created
        // because still don't know which keysystem will be selected.
        // Once Keysystem is selected and before creating the session, we will do that check
        // so we create the strictly necessary DRM sessions
        if (!mediaInfo) {
            throw new Error('mediaInfo can not be null or undefined');
        }

        checkConfig();

        eventBus.on(events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
        eventBus.on(events.INTERNAL_KEY_STATUS_CHANGED, onKeyStatusChanged, this);

        mediaInfoArr.push(mediaInfo);

        // ContentProtection elements are specified at the AdaptationSet level, so the CP for audio
        // and video will be the same.  Just use one valid MediaInfo object
        var supportedKS = protectionKeyController.getSupportedKeySystemsFromContentProtection(mediaInfo.contentProtection);
        if (supportedKS && supportedKS.length > 0) {
            selectKeySystem(supportedKS, true);
        }
    }

    /**
     * Returns a set of supported key systems and CENC initialization data
     * from the given array of ContentProtection elements.  Only
     * key systems that are supported by this player will be returned.
     * Key systems are returned in priority order (highest first).
     *
     * @param {Array.<Object>} cps - array of content protection elements parsed
     * from the manifest
     * @returns {Array.<Object>} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @memberof module:ProtectionKeyController
     * @instance
     * @ignore
     */
    function getSupportedKeySystemsFromContentProtection(cps) {
        checkConfig();
        return protectionKeyController.getSupportedKeySystemsFromContentProtection(cps);
    }

    /**
     * Create a new key session associated with the given initialization data from
     * the MPD or from the PSSH box in the media
     *
     * @param {ArrayBuffer} initData the initialization data
     * @param {Uint8Array} cdmData the custom data to provide to licenser
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     * @todo In older versions of the EME spec, there was a one-to-one relationship between
     * initialization data and key sessions.  That is no longer true in the latest APIs.  This
     * API will need to modified (and a new "generateRequest(keySession, initData)" API created)
     * to come up to speed with the latest EME standard
     * @ignore
     */
    function createKeySession(initData, cdmData) {
        var initDataForKS = _CommonEncryption2['default'].getPSSHForKeySystem(keySystem, initData);
        var protData = getProtData(keySystem);
        if (initDataForKS) {

            // Check for duplicate initData
            var currentInitData = protectionModel.getAllInitData();
            for (var i = 0; i < currentInitData.length; i++) {
                if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
                    logger.warn('DRM: Ignoring initData because we have already seen it!');
                    return;
                }
            }
            try {
                protectionModel.createKeySession(initDataForKS, protData, getSessionType(keySystem), cdmData);
            } catch (error) {
                eventBus.trigger(events.KEY_SESSION_CREATED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_MESSAGE + error.message) });
            }
        } else if (initData) {
            protectionModel.createKeySession(initData, protData, getSessionType(keySystem), cdmData);
        } else {
            eventBus.trigger(events.KEY_SESSION_CREATED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Selected key system is ' + (keySystem ? keySystem.systemString : null) + '.  needkey/encrypted event contains no initData corresponding to that key system!') });
        }
    }

    /**
     * Loads a key session with the given session ID from persistent storage.  This
     * essentially creates a new key session
     *
     * @param {string} sessionID
     * @param {string} initData
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionCreated
     * @ignore
     */
    function loadKeySession(sessionID, initData) {
        checkConfig();
        protectionModel.loadKeySession(sessionID, initData, getSessionType(keySystem));
    }

    /**
     * Removes the given key session from persistent storage and closes the session
     * as if {@link ProtectionController#closeKeySession}
     * was called
     *
     * @param {SessionToken} sessionToken the session
     * token
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionRemoved
     * @fires ProtectionController#KeySessionClosed
     * @ignore
     */
    function removeKeySession(sessionToken) {
        checkConfig();
        protectionModel.removeKeySession(sessionToken);
    }

    /**
     * Closes the key session and releases all associated decryption keys.  These
     * keys will no longer be available for decrypting media
     *
     * @param {SessionToken} sessionToken the session
     * token
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#KeySessionClosed
     * @ignore
     */
    function closeKeySession(sessionToken) {
        checkConfig();
        protectionModel.closeKeySession(sessionToken);
    }

    /**
     * Sets a server certificate for use by the CDM when signing key messages
     * intended for a particular license server.  This will fire
     * an error event if a key system has not yet been selected.
     *
     * @param {ArrayBuffer} serverCertificate a CDM-specific license server
     * certificate
     * @memberof module:ProtectionController
     * @instance
     * @fires ProtectionController#ServerCertificateUpdated
     */
    function setServerCertificate(serverCertificate) {
        checkConfig();
        protectionModel.setServerCertificate(serverCertificate);
    }

    /**
     * Associate this protection system with the given HTMLMediaElement.  This
     * causes the system to register for needkey/encrypted events from the given
     * element and provides a destination for setting of MediaKeys
     *
     * @param {HTMLMediaElement} element the media element to which the protection
     * system should be associated
     * @memberof module:ProtectionController
     * @instance
     */
    function setMediaElement(element) {
        checkConfig();
        if (element) {
            protectionModel.setMediaElement(element);
            eventBus.on(events.NEED_KEY, onNeedKey, this);
        } else if (element === null) {
            protectionModel.setMediaElement(element);
            eventBus.off(events.NEED_KEY, onNeedKey, this);
        }
    }

    /**
     * Sets the session type to use when creating key sessions.  Either "temporary" or
     * "persistent-license".  Default is "temporary".
     *
     * @param {string} value the session type
     * @memberof module:ProtectionController
     * @instance
     */
    function setSessionType(value) {
        sessionType = value;
    }

    /**
     * Sets the robustness level for video and audio capabilities. Optional to remove Chrome warnings.
     * Possible values are SW_SECURE_CRYPTO, SW_SECURE_DECODE, HW_SECURE_CRYPTO, HW_SECURE_CRYPTO, HW_SECURE_DECODE, HW_SECURE_ALL.
     *
     * @param {string} level the robustness level
     * @memberof module:ProtectionController
     * @instance
     */
    function setRobustnessLevel(level) {
        robustnessLevel = level;
    }

    /**
     * Attach KeySystem-specific data to use for license acquisition with EME
     *
     * @param {Object} data an object containing property names corresponding to
     * key system name strings (e.g. "org.w3.clearkey") and associated values
     * being instances of {@link ProtectionData}
     * @memberof module:ProtectionController
     * @instance
     * @ignore
     */
    function setProtectionData(data) {
        protDataSet = data;
        protectionKeyController.setProtectionData(data);
    }

    /**
     * Stop method is called when current playback is stopped/resetted.
     *
     * @memberof module:ProtectionController
     * @instance
     */
    function stop() {
        if (protectionModel) {
            protectionModel.stop();
        }
    }

    /**
     * Destroys all protection data associated with this protection set.  This includes
     * deleting all key sessions. In the case of persistent key sessions, the sessions
     * will simply be unloaded and not deleted.  Additionally, if this protection set is
     * associated with a HTMLMediaElement, it will be detached from that element.
     *
     * @memberof module:ProtectionController
     * @instance
     * @ignore
     */
    function reset() {
        checkConfig();

        eventBus.off(events.INTERNAL_KEY_MESSAGE, onKeyMessage, this);
        eventBus.off(events.INTERNAL_KEY_STATUS_CHANGED, onKeyStatusChanged, this);

        setMediaElement(null);

        keySystem = undefined; //TODO-Refactor look at why undefined is needed for this. refactor

        if (protectionModel) {
            protectionModel.reset();
            protectionModel = null;
        }

        needkeyRetries.forEach(function (retryTimeout) {
            return clearTimeout(retryTimeout);
        });
        needkeyRetries = [];

        mediaInfoArr = [];
    }

    ///////////////
    // Private
    ///////////////

    function getProtData(keySystem) {
        var protData = null;
        if (keySystem) {
            var keySystemString = keySystem.systemString;

            if (protDataSet) {
                protData = keySystemString in protDataSet ? protDataSet[keySystemString] : null;
            }
        }
        return protData;
    }

    function getKeySystemConfiguration(keySystem) {
        var protData = getProtData(keySystem);
        var audioCapabilities = [];
        var videoCapabilities = [];
        var audioRobustness = protData && protData.audioRobustness && protData.audioRobustness.length > 0 ? protData.audioRobustness : robustnessLevel;
        var videoRobustness = protData && protData.videoRobustness && protData.videoRobustness.length > 0 ? protData.videoRobustness : robustnessLevel;
        var ksSessionType = getSessionType(keySystem);
        var distinctiveIdentifier = protData && protData.distinctiveIdentifier ? protData.distinctiveIdentifier : 'optional';
        var persistentState = protData && protData.persistentState ? protData.persistentState : ksSessionType === 'temporary' ? 'optional' : 'required';

        mediaInfoArr.forEach(function (media) {
            if (media.type === constants.AUDIO) {
                audioCapabilities.push(new _voMediaCapability2['default'](media.codec, audioRobustness));
            } else if (media.type === constants.VIDEO) {
                videoCapabilities.push(new _voMediaCapability2['default'](media.codec, videoRobustness));
            }
        });

        return new _voKeySystemConfiguration2['default'](audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState, [ksSessionType]);
    }

    function getSessionType(keySystem) {
        var protData = getProtData(keySystem);
        var ksSessionType = protData && protData.sessionType ? protData.sessionType : sessionType;
        return ksSessionType;
    }

    function selectKeySystem(supportedKS, fromManifest) {
        var self = this;
        var requestedKeySystems = [];

        // Reorder key systems according to priority order provided in protectionData
        supportedKS = supportedKS.sort(function (ksA, ksB) {
            var indexA = protDataSet && protDataSet[ksA.ks.systemString] && protDataSet[ksA.ks.systemString].priority >= 0 ? protDataSet[ksA.ks.systemString].priority : supportedKS.length;
            var indexB = protDataSet && protDataSet[ksB.ks.systemString] && protDataSet[ksB.ks.systemString].priority >= 0 ? protDataSet[ksB.ks.systemString].priority : supportedKS.length;
            return indexA - indexB;
        });

        var ksIdx = undefined;
        if (keySystem) {
            // We have a key system
            for (ksIdx = 0; ksIdx < supportedKS.length; ksIdx++) {
                if (keySystem === supportedKS[ksIdx].ks) {
                    var _ret = (function () {

                        requestedKeySystems.push({ ks: supportedKS[ksIdx].ks, configs: [getKeySystemConfiguration(keySystem)] });

                        // Ensure that we would be granted key system access using the key
                        // system and codec information
                        var onKeySystemAccessComplete = function onKeySystemAccessComplete(event) {
                            eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                            if (event.error) {
                                if (!fromManifest) {
                                    eventBus.trigger(events.KEY_SYSTEM_SELECTED, { error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + event.error) });
                                }
                            } else {
                                logger.info('DRM: KeySystem Access Granted');
                                eventBus.trigger(events.KEY_SYSTEM_SELECTED, { data: event.data });
                                if (supportedKS[ksIdx].sessionId) {
                                    // Load MediaKeySession with sessionId
                                    loadKeySession(supportedKS[ksIdx].sessionId, supportedKS[ksIdx].initData);
                                } else if (supportedKS[ksIdx].initData) {
                                    // Create new MediaKeySession with initData
                                    createKeySession(supportedKS[ksIdx].initData, supportedKS[ksIdx].cdmData);
                                }
                            }
                        };
                        eventBus.on(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                        protectionModel.requestKeySystemAccess(requestedKeySystems);
                        return 'break';
                    })();

                    if (_ret === 'break') break;
                }
            }
        } else if (keySystem === undefined) {
            var onKeySystemSelected;

            (function () {
                // First time through, so we need to select a key system
                keySystem = null;
                pendingNeedKeyData.push(supportedKS);

                // Add all key systems to our request list since we have yet to select a key system
                for (var i = 0; i < supportedKS.length; i++) {
                    requestedKeySystems.push({ ks: supportedKS[i].ks, configs: [getKeySystemConfiguration(supportedKS[i].ks)] });
                }

                var keySystemAccess = undefined;
                var onKeySystemAccessComplete = function onKeySystemAccessComplete(event) {
                    eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                    if (event.error) {
                        keySystem = undefined;
                        eventBus.off(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                        if (!fromManifest) {
                            eventBus.trigger(events.KEY_SYSTEM_SELECTED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + event.error) });
                        }
                    } else {
                        keySystemAccess = event.data;
                        logger.info('DRM: KeySystem Access Granted (' + keySystemAccess.keySystem.systemString + ')!  Selecting key system...');
                        protectionModel.selectKeySystem(keySystemAccess);
                    }
                };

                onKeySystemSelected = function onKeySystemSelected(event) {
                    eventBus.off(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                    eventBus.off(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                    if (!event.error) {
                        if (!protectionModel) {
                            return;
                        }
                        keySystem = protectionModel.getKeySystem();
                        eventBus.trigger(events.KEY_SYSTEM_SELECTED, { data: keySystemAccess });
                        // Set server certificate from protData
                        var protData = getProtData(keySystem);
                        if (protData && protData.serverCertificate && protData.serverCertificate.length > 0) {
                            protectionModel.setServerCertificate(BASE64.decodeArray(protData.serverCertificate).buffer);
                        }
                        for (var i = 0; i < pendingNeedKeyData.length; i++) {
                            for (ksIdx = 0; ksIdx < pendingNeedKeyData[i].length; ksIdx++) {
                                if (keySystem === pendingNeedKeyData[i][ksIdx].ks) {
                                    // For Clearkey: if parameters for generating init data was provided by the user, use them for generating
                                    // initData and overwrite possible initData indicated in encrypted event (EME)
                                    if (protectionKeyController.isClearKey(keySystem) && protData && protData.hasOwnProperty('clearkeys')) {
                                        var initData = { kids: Object.keys(protData.clearkeys) };
                                        pendingNeedKeyData[i][ksIdx].initData = new TextEncoder().encode(JSON.stringify(initData));
                                    }
                                    if (pendingNeedKeyData[i][ksIdx].sessionId) {
                                        // Load MediaKeySession with sessionId
                                        loadKeySession(pendingNeedKeyData[i][ksIdx].sessionId, pendingNeedKeyData[i][ksIdx].initData);
                                    } else if (pendingNeedKeyData[i][ksIdx].initData !== null) {
                                        // Create new MediaKeySession with initData
                                        createKeySession(pendingNeedKeyData[i][ksIdx].initData, pendingNeedKeyData[i][ksIdx].cdmData);
                                    }
                                    break;
                                }
                            }
                        }
                    } else {
                        keySystem = undefined;
                        if (!fromManifest) {
                            eventBus.trigger(events.KEY_SYSTEM_SELECTED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE + 'Error selecting key system! -- ' + event.error) });
                        }
                    }
                };

                eventBus.on(events.INTERNAL_KEY_SYSTEM_SELECTED, onKeySystemSelected, self);
                eventBus.on(events.KEY_SYSTEM_ACCESS_COMPLETE, onKeySystemAccessComplete, self);
                protectionModel.requestKeySystemAccess(requestedKeySystems);
            })();
        } else {
            // We are in the process of selecting a key system, so just save the data
            pendingNeedKeyData.push(supportedKS);
        }
    }

    function sendLicenseRequestCompleteEvent(data, error) {
        eventBus.trigger(events.LICENSE_REQUEST_COMPLETE, { data: data, error: error });
    }

    function onKeyStatusChanged(e) {
        if (e.error) {
            eventBus.trigger(events.KEY_STATUSES_CHANGED, { data: null, error: e.error });
        } else {
            logger.debug('DRM: key status = ' + e.status);
        }
    }

    function onKeyMessage(e) {
        logger.debug('DRM: onKeyMessage');

        // Dispatch event to applications indicating we received a key message
        var keyMessage = e.data;
        eventBus.trigger(events.KEY_MESSAGE, { data: keyMessage });
        var messageType = keyMessage.messageType ? keyMessage.messageType : 'license-request';
        var message = keyMessage.message;
        var sessionToken = keyMessage.sessionToken;
        var protData = getProtData(keySystem);
        var keySystemString = keySystem ? keySystem.systemString : null;
        var licenseServerData = protectionKeyController.getLicenseServer(keySystem, protData, messageType);
        var eventData = { sessionToken: sessionToken, messageType: messageType };

        // Ensure message from CDM is not empty
        if (!message || message.byteLength === 0) {
            sendLicenseRequestCompleteEvent(eventData, new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE));
            return;
        }

        // Message not destined for license server
        if (!licenseServerData) {
            logger.debug('DRM: License server request not required for this message (type = ' + e.data.messageType + ').  Session ID = ' + sessionToken.getSessionID());
            sendLicenseRequestCompleteEvent(eventData);
            return;
        }

        // Perform any special handling for ClearKey
        if (protectionKeyController.isClearKey(keySystem)) {
            var clearkeys = protectionKeyController.processClearKeyLicenseRequest(keySystem, protData, message);
            if (clearkeys) {
                logger.debug('DRM: ClearKey license request handled by application!');
                sendLicenseRequestCompleteEvent(eventData);
                protectionModel.updateKeySession(sessionToken, clearkeys);
                return;
            }
        }

        // All remaining key system scenarios require a request to a remote license server
        // Determine license server URL
        var url = null;
        if (protData && protData.serverURL) {
            var serverURL = protData.serverURL;
            if (typeof serverURL === 'string' && serverURL !== '') {
                url = serverURL;
            } else if (typeof serverURL === 'object' && serverURL.hasOwnProperty(messageType)) {
                url = serverURL[messageType];
            }
        } else if (protData && protData.laURL && protData.laURL !== '') {
            // TODO: Deprecated!
            url = protData.laURL;
        } else {
            url = keySystem.getLicenseServerURLFromInitData(_CommonEncryption2['default'].getPSSHData(sessionToken.initData));
            if (!url) {
                url = e.data.laURL;
            }
        }
        // Possibly update or override the URL based on the message
        url = licenseServerData.getServerURLFromMessage(url, message, messageType);

        // Ensure valid license server URL
        if (!url) {
            sendLicenseRequestCompleteEvent(eventData, new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE));
            return;
        }

        // Set optional XMLHttpRequest headers from protection data and message
        var reqHeaders = {};
        var withCredentials = false;
        var updateHeaders = function updateHeaders(headers) {
            if (headers) {
                for (var key in headers) {
                    if ('authorization' === key.toLowerCase()) {
                        withCredentials = true;
                    }
                    reqHeaders[key] = headers[key];
                }
            }
        };
        if (protData) {
            updateHeaders(protData.httpRequestHeaders);
        }
        updateHeaders(keySystem.getRequestHeadersFromMessage(message));

        // Overwrite withCredentials property from protData if present
        if (protData && typeof protData.withCredentials == 'boolean') {
            withCredentials = protData.withCredentials;
        }

        var reportError = function reportError(xhr, eventData, keySystemString, messageType) {
            var errorMsg = xhr.response ? licenseServerData.getErrorResponse(xhr.response, keySystemString, messageType) : 'NONE';
            sendLicenseRequestCompleteEvent(eventData, new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR complete. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState + '.  Response is ' + errorMsg));
        };

        var onLoad = function onLoad(xhr) {
            if (!protectionModel) {
                return;
            }

            if (xhr.status === 200) {
                var licenseMessage = licenseServerData.getLicenseMessage(xhr.response, keySystemString, messageType);
                if (licenseMessage !== null) {
                    sendLicenseRequestCompleteEvent(eventData);
                    protectionModel.updateKeySession(sessionToken, licenseMessage);
                } else {
                    reportError(xhr, eventData, keySystemString, messageType);
                }
            } else {
                reportError(xhr, eventData, keySystemString, messageType);
            }
        };

        var onAbort = function onAbort(xhr) {
            sendLicenseRequestCompleteEvent(eventData, new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR aborted. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
        };

        var onError = function onError(xhr) {
            sendLicenseRequestCompleteEvent(eventData, new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE + keySystemString + ' update, XHR error. status is "' + xhr.statusText + '" (' + xhr.status + '), readyState is ' + xhr.readyState));
        };

        var reqPayload = keySystem.getLicenseRequestFromMessage(message);
        var reqMethod = licenseServerData.getHTTPMethod(messageType);
        var responseType = licenseServerData.getResponseType(keySystemString, messageType);
        var timeout = protData && !isNaN(protData.httpTimeout) ? protData.httpTimeout : LICENSE_SERVER_REQUEST_DEFAULT_TIMEOUT;

        doLicenseRequest(url, reqHeaders, reqMethod, responseType, withCredentials, reqPayload, LICENSE_SERVER_REQUEST_RETRIES, timeout, onLoad, onAbort, onError);
    }

    // Implement license requests with a retry mechanism to avoid temporary network issues to affect playback experience
    function doLicenseRequest(url, headers, method, responseType, withCredentials, payload, retriesCount, timeout, onLoad, onAbort, onError) {
        var xhr = new XMLHttpRequest();

        xhr.open(method, url, true);
        xhr.responseType = responseType;
        xhr.withCredentials = withCredentials;
        if (timeout > 0) {
            xhr.timeout = timeout;
        }
        for (var key in headers) {
            xhr.setRequestHeader(key, headers[key]);
        }

        var retryRequest = function retryRequest() {
            // fail silently and retry
            retriesCount--;
            setTimeout(function () {
                doLicenseRequest(url, headers, method, responseType, withCredentials, payload, retriesCount, timeout, onLoad, onAbort, onError);
            }, LICENSE_SERVER_REQUEST_RETRY_INTERVAL);
        };

        xhr.onload = function () {
            if (this.status === 200 || retriesCount <= 0) {
                onLoad(this);
            } else {
                logger.warn('License request failed (' + this.status + '). Retrying it... Pending retries: ' + retriesCount);
                retryRequest();
            }
        };

        xhr.ontimeout = xhr.onerror = function () {
            if (retriesCount <= 0) {
                onError(this);
            } else {
                logger.warn('License request network request failed . Retrying it... Pending retries: ' + retriesCount);
                retryRequest();
            }
        };

        xhr.onabort = function () {
            onAbort(this);
        };

        xhr.send(payload);
    }

    function onNeedKey(event, retry) {
        logger.debug('DRM: onNeedKey');
        // Ignore non-cenc initData
        if (event.key.initDataType !== 'cenc') {
            logger.warn('DRM:  Only \'cenc\' initData is supported!  Ignoring initData of type: ' + event.key.initDataType);
            return;
        }

        if (mediaInfoArr.length === 0) {
            logger.warn('DRM: onNeedKey called before initializeForMedia, wait until initialized');
            retry = typeof retry === 'undefined' ? 1 : retry + 1;
            if (retry < NEEDKEY_BEFORE_INITIALIZE_RETRIES) {
                needkeyRetries.push(setTimeout(function () {
                    onNeedKey(event, retry);
                }, NEEDKEY_BEFORE_INITIALIZE_TIMEOUT));
                return;
            }
        }

        // Some browsers return initData as Uint8Array (IE), some as ArrayBuffer (Chrome).
        // Convert to ArrayBuffer
        var abInitData = event.key.initData;
        if (ArrayBuffer.isView(abInitData)) {
            abInitData = abInitData.buffer;
        }

        // If key system has already been selected and initData already seen, then do nothing
        if (keySystem) {
            var initDataForKS = _CommonEncryption2['default'].getPSSHForKeySystem(keySystem, abInitData);
            if (initDataForKS) {

                // Check for duplicate initData
                var currentInitData = protectionModel.getAllInitData();
                for (var i = 0; i < currentInitData.length; i++) {
                    if (protectionKeyController.initDataEquals(initDataForKS, currentInitData[i])) {
                        logger.warn('DRM: Ignoring initData because we have already seen it!');
                        return;
                    }
                }
            }
        }

        logger.debug('DRM: initData:', String.fromCharCode.apply(null, new Uint8Array(abInitData)));

        var supportedKS = protectionKeyController.getSupportedKeySystems(abInitData, protDataSet);
        if (supportedKS.length === 0) {
            logger.debug('DRM: Received needkey event with initData, but we don\'t support any of the key systems!');
            return;
        }

        selectKeySystem(supportedKS, false);
    }

    function getKeySystems() {
        return protectionKeyController ? protectionKeyController.getKeySystems() : [];
    }

    function setKeySystems(keySystems) {
        if (protectionKeyController) {
            protectionKeyController.setKeySystems(keySystems);
        }
    }

    instance = {
        initializeForMedia: initializeForMedia,
        createKeySession: createKeySession,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        setMediaElement: setMediaElement,
        setSessionType: setSessionType,
        setRobustnessLevel: setRobustnessLevel,
        setProtectionData: setProtectionData,
        getSupportedKeySystemsFromContentProtection: getSupportedKeySystemsFromContentProtection,
        getKeySystems: getKeySystems,
        setKeySystems: setKeySystems,
        stop: stop,
        reset: reset
    };

    setup();
    return instance;
}

ProtectionController.__dashjs_factory_name = 'ProtectionController';
exports['default'] = dashjs.FactoryMaker.getClassFactory(ProtectionController);
/* jshint ignore:line */
module.exports = exports['default'];

},{"13":13,"25":25,"26":26,"28":28,"4":4}],8:[function(_dereq_,module,exports){
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
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _drmKeySystemClearKey = _dereq_(9);

var _drmKeySystemClearKey2 = _interopRequireDefault(_drmKeySystemClearKey);

var _drmKeySystemW3CClearKey = _dereq_(11);

var _drmKeySystemW3CClearKey2 = _interopRequireDefault(_drmKeySystemW3CClearKey);

var _drmKeySystemWidevine = _dereq_(12);

var _drmKeySystemWidevine2 = _interopRequireDefault(_drmKeySystemWidevine);

var _drmKeySystemPlayReady = _dereq_(10);

var _drmKeySystemPlayReady2 = _interopRequireDefault(_drmKeySystemPlayReady);

var _serversDRMToday = _dereq_(18);

var _serversDRMToday2 = _interopRequireDefault(_serversDRMToday);

var _serversPlayReady = _dereq_(19);

var _serversPlayReady2 = _interopRequireDefault(_serversPlayReady);

var _serversWidevine = _dereq_(20);

var _serversWidevine2 = _interopRequireDefault(_serversWidevine);

var _serversClearKey = _dereq_(17);

var _serversClearKey2 = _interopRequireDefault(_serversClearKey);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

/**
 * @module ProtectionKeyController
 * @ignore
 * @description Media protection key system functionality that can be modified/overridden by applications
 */
function ProtectionKeyController() {

    var context = this.context;

    var instance = undefined,
        debug = undefined,
        logger = undefined,
        keySystems = undefined,
        BASE64 = undefined,
        clearkeyKeySystem = undefined,
        clearkeyW3CKeySystem = undefined;

    function setConfig(config) {
        if (!config) return;

        if (config.debug) {
            debug = config.debug;
            logger = debug.getLogger(instance);
        }

        if (config.BASE64) {
            BASE64 = config.BASE64;
        }
    }

    function initialize() {
        keySystems = [];

        var keySystem = undefined;

        // PlayReady
        keySystem = (0, _drmKeySystemPlayReady2['default'])(context).getInstance({ BASE64: BASE64 });
        keySystems.push(keySystem);

        // Widevine
        keySystem = (0, _drmKeySystemWidevine2['default'])(context).getInstance({ BASE64: BASE64 });
        keySystems.push(keySystem);

        // ClearKey
        keySystem = (0, _drmKeySystemClearKey2['default'])(context).getInstance({ BASE64: BASE64 });
        keySystems.push(keySystem);
        clearkeyKeySystem = keySystem;

        // W3C ClearKey
        keySystem = (0, _drmKeySystemW3CClearKey2['default'])(context).getInstance({ BASE64: BASE64, debug: debug });
        keySystems.push(keySystem);
        clearkeyW3CKeySystem = keySystem;
    }

    /**
     * Returns a prioritized list of key systems supported
     * by this player (not necessarily those supported by the
     * user agent)
     *
     * @returns {Array.<KeySystem>} a prioritized
     * list of key systems
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function getKeySystems() {
        return keySystems;
    }

    /**
     * Sets the prioritized list of key systems to be supported
     * by this player.
     *
     * @param {Array.<KeySystem>} newKeySystems the new prioritized
     * list of key systems
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function setKeySystems(newKeySystems) {
        keySystems = newKeySystems;
    }

    /**
     * Returns the key system associated with the given key system string
     * name (i.e. 'org.w3.clearkey')
     *
     * @param {string} systemString the system string
     * @returns {KeySystem|null} the key system
     * or null if no supported key system is associated with the given key
     * system string
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function getKeySystemBySystemString(systemString) {
        for (var i = 0; i < keySystems.length; i++) {
            if (keySystems[i].systemString === systemString) {
                return keySystems[i];
            }
        }
        return null;
    }

    /**
     * Determines whether the given key system is ClearKey.  This is
     * necessary because the EME spec defines ClearKey and its method
     * for providing keys to the key session; and this method has changed
     * between the various API versions.  Our EME-specific ProtectionModels
     * must know if the system is ClearKey so that it can format the keys
     * according to the particular spec version.
     *
     * @param {Object} keySystem the key
     * @returns {boolean} true if this is the ClearKey key system, false
     * otherwise
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function isClearKey(keySystem) {
        return keySystem === clearkeyKeySystem || keySystem === clearkeyW3CKeySystem;
    }

    /**
     * Check equality of initData array buffers.
     *
     * @param {ArrayBuffer} initData1 - first initData
     * @param {ArrayBuffer} initData2 - second initData
     * @returns {boolean} true if the initData arrays are equal in size and
     * contents, false otherwise
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function initDataEquals(initData1, initData2) {
        if (initData1.byteLength === initData2.byteLength) {
            var data1 = new Uint8Array(initData1);
            var data2 = new Uint8Array(initData2);

            for (var j = 0; j < data1.length; j++) {
                if (data1[j] !== data2[j]) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    /**
     * Returns a set of supported key systems and CENC initialization data
     * from the given array of ContentProtection elements.  Only
     * key systems that are supported by this player will be returned.
     * Key systems are returned in priority order (highest first).
     *
     * @param {Array.<Object>} cps - array of content protection elements parsed
     * from the manifest
     * @returns {Array.<Object>} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function getSupportedKeySystemsFromContentProtection(cps) {
        var cp = undefined,
            ks = undefined,
            ksIdx = undefined,
            cpIdx = undefined;
        var supportedKS = [];

        if (cps) {
            for (ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
                ks = keySystems[ksIdx];
                for (cpIdx = 0; cpIdx < cps.length; ++cpIdx) {
                    cp = cps[cpIdx];
                    if (cp.schemeIdUri.toLowerCase() === ks.schemeIdURI) {
                        // Look for DRM-specific ContentProtection
                        var initData = ks.getInitData(cp);

                        supportedKS.push({
                            ks: keySystems[ksIdx],
                            initData: initData,
                            cdmData: ks.getCDMData(),
                            sessionId: ks.getSessionId(cp)
                        });
                    }
                }
            }
        }
        return supportedKS;
    }

    /**
     * Returns key systems supported by this player for the given PSSH
     * initializationData. Only key systems supported by this player
     * that have protection data present will be returned.  Key systems are returned in priority order
     * (highest priority first)
     *
     * @param {ArrayBuffer} initData Concatenated PSSH data for all DRMs
     * supported by the content
     * @param {ProtectionData} protDataSet user specified protection data - license server url etc
     * supported by the content
     * @returns {Array.<Object>} array of objects indicating which supported key
     * systems were found.  Empty array is returned if no
     * supported key systems were found
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function getSupportedKeySystems(initData, protDataSet) {
        var supportedKS = [];
        var pssh = _CommonEncryption2['default'].parsePSSHList(initData);
        var ks = undefined,
            keySystemString = undefined,
            shouldNotFilterOutKeySystem = undefined;

        for (var ksIdx = 0; ksIdx < keySystems.length; ++ksIdx) {
            ks = keySystems[ksIdx];
            keySystemString = ks.systemString;
            shouldNotFilterOutKeySystem = protDataSet ? keySystemString in protDataSet : true;

            if (ks.uuid in pssh && shouldNotFilterOutKeySystem) {
                supportedKS.push({
                    ks: ks,
                    initData: pssh[ks.uuid],
                    cdmData: ks.getCDMData(),
                    sessionId: ks.getSessionId()
                });
            }
        }
        return supportedKS;
    }

    /**
     * Returns the license server implementation data that should be used for this request.
     *
     * @param {KeySystem} keySystem the key system
     * associated with this license request
     * @param {ProtectionData} protData protection data to use for the
     * request
     * @param {string} [messageType="license-request"] the message type associated with this
     * request.  Supported message types can be found
     * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
     * @returns {LicenseServer|null} the license server
     * implementation that should be used for this request or null if the player should not
     * pass messages of the given type to a license server
     * @memberof module:ProtectionKeyController
     * @instance
     *
     */
    function getLicenseServer(keySystem, protData, messageType) {

        // Our default server implementations do not do anything with "license-release" or
        // "individualization-request" messages, so we just send a success event
        if (messageType === 'license-release' || messageType === 'individualization-request') {
            return null;
        }

        var licenseServerData = null;
        if (protData && protData.hasOwnProperty('drmtoday')) {
            licenseServerData = (0, _serversDRMToday2['default'])(context).getInstance({ BASE64: BASE64 });
        } else if (keySystem.systemString === _constantsProtectionConstants2['default'].WIDEVINE_KEYSTEM_STRING) {
            licenseServerData = (0, _serversWidevine2['default'])(context).getInstance();
        } else if (keySystem.systemString === _constantsProtectionConstants2['default'].PLAYREADY_KEYSTEM_STRING) {
            licenseServerData = (0, _serversPlayReady2['default'])(context).getInstance();
        } else if (keySystem.systemString === _constantsProtectionConstants2['default'].CLEARKEY_KEYSTEM_STRING) {
            licenseServerData = (0, _serversClearKey2['default'])(context).getInstance();
        }

        return licenseServerData;
    }

    /**
     * Allows application-specific retrieval of ClearKey keys.
     *
     * @param {KeySystem} clearkeyKeySystem They exact ClearKey System to be used
     * @param {ProtectionData} protData protection data to use for the
     * request
     * @param {ArrayBuffer} message the key message from the CDM
     * @return {ClearKeyKeySet|null} the clear keys associated with
     * the request or null if no keys can be returned by this function
     * @memberof module:ProtectionKeyController
     * @instance
     */
    function processClearKeyLicenseRequest(clearkeyKeySystem, protData, message) {
        try {
            return clearkeyKeySystem.getClearKeysFromProtectionData(protData, message);
        } catch (error) {
            logger.error('Failed to retrieve clearkeys from ProtectionData');
            return null;
        }
    }

    function setProtectionData(protectionDataSet) {
        var getProtectionData = function getProtectionData(keySystemString) {
            var protData = null;
            if (protectionDataSet) {
                protData = keySystemString in protectionDataSet ? protectionDataSet[keySystemString] : null;
            }
            return protData;
        };

        for (var i = 0; i < keySystems.length; i++) {
            var keySystem = keySystems[i];
            if (keySystem.hasOwnProperty('init')) {
                keySystem.init(getProtectionData(keySystem.systemString));
            }
        }
    }

    instance = {
        initialize: initialize,
        setProtectionData: setProtectionData,
        isClearKey: isClearKey,
        initDataEquals: initDataEquals,
        getKeySystems: getKeySystems,
        setKeySystems: setKeySystems,
        getKeySystemBySystemString: getKeySystemBySystemString,
        getSupportedKeySystemsFromContentProtection: getSupportedKeySystemsFromContentProtection,
        getSupportedKeySystems: getSupportedKeySystems,
        getLicenseServer: getLicenseServer,
        processClearKeyLicenseRequest: processClearKeyLicenseRequest,
        setConfig: setConfig
    };

    return instance;
}

ProtectionKeyController.__dashjs_factory_name = 'ProtectionKeyController';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(ProtectionKeyController);
/* jshint ignore:line */
module.exports = exports['default'];

},{"10":10,"11":11,"12":12,"17":17,"18":18,"19":19,"20":20,"3":3,"4":4,"9":9}],9:[function(_dereq_,module,exports){
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

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _voKeyPair = _dereq_(23);

var _voKeyPair2 = _interopRequireDefault(_voKeyPair);

var _voClearKeyKeySet = _dereq_(21);

var _voClearKeyKeySet2 = _interopRequireDefault(_voClearKeyKeySet);

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

var uuid = 'e2719d58-a985-b3c9-781a-b030af78d30e';
var systemString = _constantsProtectionConstants2['default'].CLEARKEY_KEYSTEM_STRING;
var schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemClearKey(config) {

    config = config || {};
    var instance = undefined;
    var BASE64 = config.BASE64;

    /**
     * Returns desired clearkeys (as specified in the CDM message) from protection data
     *
     * @param {ProtectionData} protectionData the protection data
     * @param {ArrayBuffer} message the ClearKey CDM message
     * @returns {ClearKeyKeySet} the key set or null if none found
     * @throws {Error} if a keyID specified in the CDM message was not found in the
     * protection data
     * @memberof KeySystemClearKey
     */
    function getClearKeysFromProtectionData(protectionData, message) {
        var clearkeySet = null;
        if (protectionData) {
            // ClearKey is the only system that does not require a license server URL, so we
            // handle it here when keys are specified in protection data
            var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
            var keyPairs = [];
            for (var i = 0; i < jsonMsg.kids.length; i++) {
                var clearkeyID = jsonMsg.kids[i];
                var clearkey = protectionData.clearkeys && protectionData.clearkeys.hasOwnProperty(clearkeyID) ? protectionData.clearkeys[clearkeyID] : null;
                if (!clearkey) {
                    throw new Error('DRM: ClearKey keyID (' + clearkeyID + ') is not known!');
                }
                // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
                keyPairs.push(new _voKeyPair2['default'](clearkeyID, clearkey));
            }
            clearkeySet = new _voClearKeyKeySet2['default'](keyPairs);
        }
        return clearkeySet;
    }

    function getInitData(cp) {
        return _CommonEncryption2['default'].parseInitDataFromContentProtection(cp, BASE64);
    }

    function getRequestHeadersFromMessage() /*message*/{
        return null;
    }

    function getLicenseRequestFromMessage(message) {
        return new Uint8Array(message);
    }

    function getLicenseServerURLFromInitData() /*initData*/{
        return null;
    }

    function getCDMData() {
        return null;
    }

    function getSessionId() /*cp*/{
        return null;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        getCDMData: getCDMData,
        getSessionId: getSessionId,
        getClearKeysFromProtectionData: getClearKeysFromProtectionData
    };

    return instance;
}

KeySystemClearKey.__dashjs_factory_name = 'KeySystemClearKey';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(KeySystemClearKey);
/* jshint ignore:line */
module.exports = exports['default'];

},{"21":21,"23":23,"3":3,"4":4}],10:[function(_dereq_,module,exports){
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

/**
 * Microsoft PlayReady DRM
 *
 * @class
 * @implements KeySystem
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

var uuid = '9a04f079-9840-4286-ab92-e65be0885f95';
var systemString = _constantsProtectionConstants2['default'].PLAYREADY_KEYSTEM_STRING;
var schemeIdURI = 'urn:uuid:' + uuid;
var PRCDMData = '<PlayReadyCDMData type="LicenseAcquisition"><LicenseAcquisition version="1.0" Proactive="false"><CustomData encoding="base64encoded">%CUSTOMDATA%</CustomData></LicenseAcquisition></PlayReadyCDMData>';
var protData = undefined;

function KeySystemPlayReady(config) {

    config = config || {};
    var instance = undefined;
    var messageFormat = 'utf-16';
    var BASE64 = config.BASE64;

    function checkConfig() {
        if (!BASE64 || !BASE64.hasOwnProperty('decodeArray') || !BASE64.hasOwnProperty('decodeArray')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    function getRequestHeadersFromMessage(message) {
        var msg = undefined,
            xmlDoc = undefined;
        var headers = {};
        var parser = new DOMParser();
        var dataview = messageFormat === 'utf-16' ? new Uint16Array(message) : new Uint8Array(message);

        msg = String.fromCharCode.apply(null, dataview);
        xmlDoc = parser.parseFromString(msg, 'application/xml');

        var headerNameList = xmlDoc.getElementsByTagName('name');
        var headerValueList = xmlDoc.getElementsByTagName('value');
        for (var i = 0; i < headerNameList.length; i++) {
            headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
        }
        // Some versions of the PlayReady CDM return 'Content' instead of 'Content-Type'.
        // this is NOT w3c conform and license servers may reject the request!
        // -> rename it to proper w3c definition!
        if (headers.hasOwnProperty('Content')) {
            headers['Content-Type'] = headers.Content;
            delete headers.Content;
        }
        // Set Content-Type header by default if not provided in the the CDM message (<PlayReadyKeyMessage/>)
        // or if the message contains directly the challenge itself (Ex: LG SmartTVs)
        if (!headers.hasOwnProperty('Content-Type')) {
            headers['Content-Type'] = 'text/xml; charset=utf-8';
        }
        return headers;
    }

    function getLicenseRequestFromMessage(message) {
        var licenseRequest = null;
        var parser = new DOMParser();
        var dataview = messageFormat === 'utf-16' ? new Uint16Array(message) : new Uint8Array(message);

        checkConfig();
        var msg = String.fromCharCode.apply(null, dataview);
        var xmlDoc = parser.parseFromString(msg, 'application/xml');

        if (xmlDoc.getElementsByTagName('PlayReadyKeyMessage')[0]) {
            var Challenge = xmlDoc.getElementsByTagName('Challenge')[0].childNodes[0].nodeValue;
            if (Challenge) {
                licenseRequest = BASE64.decode(Challenge);
            }
        } else {
            // The message from CDM is not a wrapped message as on IE11 and Edge,
            // thus it contains direclty the challenge itself
            // (note that the xmlDoc at this point may be unreadable since it may have been interpreted as UTF-16)
            return message;
        }

        return licenseRequest;
    }

    function getLicenseServerURLFromInitData(initData) {
        if (initData) {
            var data = new DataView(initData);
            var numRecords = data.getUint16(4, true);
            var offset = 6;
            var parser = new DOMParser();

            for (var i = 0; i < numRecords; i++) {
                // Parse the PlayReady Record header
                var recordType = data.getUint16(offset, true);
                offset += 2;
                var recordLength = data.getUint16(offset, true);
                offset += 2;
                if (recordType !== 0x0001) {
                    offset += recordLength;
                    continue;
                }

                var recordData = initData.slice(offset, offset + recordLength);
                var record = String.fromCharCode.apply(null, new Uint16Array(recordData));
                var xmlDoc = parser.parseFromString(record, 'application/xml');

                // First try <LA_URL>
                if (xmlDoc.getElementsByTagName('LA_URL')[0]) {
                    var laurl = xmlDoc.getElementsByTagName('LA_URL')[0].childNodes[0].nodeValue;
                    if (laurl) {
                        return laurl;
                    }
                }

                // Optionally, try <LUI_URL>
                if (xmlDoc.getElementsByTagName('LUI_URL')[0]) {
                    var luiurl = xmlDoc.getElementsByTagName('LUI_URL')[0].childNodes[0].nodeValue;
                    if (luiurl) {
                        return luiurl;
                    }
                }
            }
        }

        return null;
    }

    function getInitData(cpData) {
        // * desc@ getInitData
        // *   generate PSSH data from PROHeader defined in MPD file
        // *   PSSH format:
        // *   size (4)
        // *   box type(PSSH) (8)
        // *   Protection SystemID (16)
        // *   protection system data size (4) - length of decoded PROHeader
        // *   decoded PROHeader data from MPD file
        var PSSHBoxType = new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00]); //'PSSH' 8 bytes
        var playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]);

        var byteCursor = 0;
        var uint8arraydecodedPROHeader = null;

        var PROSize = undefined,
            PSSHSize = undefined,
            PSSHBoxBuffer = undefined,
            PSSHBox = undefined,
            PSSHData = undefined;

        checkConfig();
        if (!cpData) {
            return null;
        }
        // Handle common encryption PSSH
        if ('pssh' in cpData) {
            return _CommonEncryption2['default'].parseInitDataFromContentProtection(cpData, BASE64);
        }
        // Handle native MS PlayReady ContentProtection elements
        if ('pro' in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
        } else if ('prheader' in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
        } else {
            return null;
        }

        PROSize = uint8arraydecodedPROHeader.length;
        PSSHSize = 0x4 + PSSHBoxType.length + playreadySystemID.length + 0x4 + PROSize;

        PSSHBoxBuffer = new ArrayBuffer(PSSHSize);

        PSSHBox = new Uint8Array(PSSHBoxBuffer);
        PSSHData = new DataView(PSSHBoxBuffer);

        PSSHData.setUint32(byteCursor, PSSHSize);
        byteCursor += 0x4;

        PSSHBox.set(PSSHBoxType, byteCursor);
        byteCursor += PSSHBoxType.length;

        PSSHBox.set(playreadySystemID, byteCursor);
        byteCursor += playreadySystemID.length;

        PSSHData.setUint32(byteCursor, PROSize);
        byteCursor += 0x4;

        PSSHBox.set(uint8arraydecodedPROHeader, byteCursor);
        byteCursor += PROSize;

        return PSSHBox.buffer;
    }

    /**
     * It seems that some PlayReady implementations return their XML-based CDM
     * messages using UTF16, while others return them as UTF8.  Use this function
     * to modify the message format to expect when parsing CDM messages.
     *
     * @param {string} format the expected message format.  Either "utf-8" or "utf-16".
     * @throws {Error} Specified message format is not one of "utf8" or "utf16"
     */
    function setPlayReadyMessageFormat(format) {
        if (format !== 'utf-8' && format !== 'utf-16') {
            throw new Error('Specified message format is not one of "utf-8" or "utf-16"');
        }
        messageFormat = format;
    }

    /**
     * Initialize the Key system with protection data
     * @param {Object} protectionData the protection data
     */
    function init(protectionData) {
        if (protectionData) {
            protData = protectionData;
        }
    }

    /**
     * Get Playready Custom data
     */
    function getCDMData() {
        var customData = undefined,
            cdmData = undefined,
            cdmDataBytes = undefined,
            i = undefined;

        checkConfig();
        if (protData && protData.cdmData) {
            // Convert custom data into multibyte string
            customData = [];
            for (i = 0; i < protData.cdmData.length; ++i) {
                customData.push(protData.cdmData.charCodeAt(i));
                customData.push(0);
            }
            customData = String.fromCharCode.apply(null, customData);

            // Encode in Base 64 the custom data string
            customData = BASE64.encode(customData);

            // Initialize CDM data with Base 64 encoded custom data
            // (see https://msdn.microsoft.com/en-us/library/dn457361.aspx)
            cdmData = PRCDMData.replace('%CUSTOMDATA%', customData);

            // Convert CDM data into multibyte characters
            cdmDataBytes = [];
            for (i = 0; i < cdmData.length; ++i) {
                cdmDataBytes.push(cdmData.charCodeAt(i));
                cdmDataBytes.push(0);
            }

            return new Uint8Array(cdmDataBytes).buffer;
        }

        return null;
    }

    function getSessionId(cp) {
        // Get sessionId from protectionData or from manifest
        if (protData && protData.sessionId) {
            return protData.sessionId;
        } else if (cp && cp.sessionId) {
            return cp.sessionId;
        }
        return null;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        getCDMData: getCDMData,
        getSessionId: getSessionId,
        setPlayReadyMessageFormat: setPlayReadyMessageFormat,
        init: init
    };

    return instance;
}

KeySystemPlayReady.__dashjs_factory_name = 'KeySystemPlayReady';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(KeySystemPlayReady);
/* jshint ignore:line */
module.exports = exports['default'];

},{"3":3,"4":4}],11:[function(_dereq_,module,exports){
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

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _voKeyPair = _dereq_(23);

var _voKeyPair2 = _interopRequireDefault(_voKeyPair);

var _voClearKeyKeySet = _dereq_(21);

var _voClearKeyKeySet2 = _interopRequireDefault(_voClearKeyKeySet);

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

var uuid = '1077efec-c0b2-4d02-ace3-3c1e52e2fb4b';
var systemString = _constantsProtectionConstants2['default'].CLEARKEY_KEYSTEM_STRING;
var schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemW3CClearKey(config) {
    var instance = undefined;
    var BASE64 = config.BASE64;
    var logger = config.debug.getLogger(instance);
    /**
     * Returns desired clearkeys (as specified in the CDM message) from protection data
     *
     * @param {ProtectionData} protectionData the protection data
     * @param {ArrayBuffer} message the ClearKey CDM message
     * @returns {ClearKeyKeySet} the key set or null if none found
     * @throws {Error} if a keyID specified in the CDM message was not found in the
     * protection data
     * @memberof KeySystemClearKey
     */
    function getClearKeysFromProtectionData(protectionData, message) {
        var clearkeySet = null;
        if (protectionData) {
            // ClearKey is the only system that does not require a license server URL, so we
            // handle it here when keys are specified in protection data
            var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
            var keyPairs = [];
            for (var i = 0; i < jsonMsg.kids.length; i++) {
                var clearkeyID = jsonMsg.kids[i];
                var clearkey = protectionData.clearkeys && protectionData.clearkeys.hasOwnProperty(clearkeyID) ? protectionData.clearkeys[clearkeyID] : null;
                if (!clearkey) {
                    throw new Error('DRM: ClearKey keyID (' + clearkeyID + ') is not known!');
                }
                // KeyIDs from CDM are not base64 padded.  Keys may or may not be padded
                keyPairs.push(new _voKeyPair2['default'](clearkeyID, clearkey));
            }
            clearkeySet = new _voClearKeyKeySet2['default'](keyPairs);

            logger.warn('ClearKey schemeIdURI is using W3C Common PSSH systemID (1077efec-c0b2-4d02-ace3-3c1e52e2fb4b) in Content Protection. See DASH-IF IOP v4.1 section 7.6.2.4');
        }
        return clearkeySet;
    }

    function getInitData(cp) {
        return _CommonEncryption2['default'].parseInitDataFromContentProtection(cp, BASE64);
    }

    function getRequestHeadersFromMessage() /*message*/{
        return null;
    }

    function getLicenseRequestFromMessage(message) {
        return new Uint8Array(message);
    }

    function getLicenseServerURLFromInitData() /*initData*/{
        return null;
    }

    function getCDMData() {
        return null;
    }

    function getSessionId() /*cp*/{
        return null;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        getCDMData: getCDMData,
        getSessionId: getSessionId,
        getClearKeysFromProtectionData: getClearKeysFromProtectionData
    };

    return instance;
}

KeySystemW3CClearKey.__dashjs_factory_name = 'KeySystemW3CClearKey';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(KeySystemW3CClearKey);
/* jshint ignore:line */
module.exports = exports['default'];

},{"21":21,"23":23,"3":3,"4":4}],12:[function(_dereq_,module,exports){
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

/**
 * Google Widevine DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _CommonEncryption = _dereq_(4);

var _CommonEncryption2 = _interopRequireDefault(_CommonEncryption);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

var uuid = 'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed';
var systemString = _constantsProtectionConstants2['default'].WIDEVINE_KEYSTEM_STRING;
var schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemWidevine(config) {

    config = config || {};
    var instance = undefined;
    var protData = null;
    var BASE64 = config.BASE64;

    function init(protectionData) {
        if (protectionData) {
            protData = protectionData;
        }
    }

    function getInitData(cp) {
        return _CommonEncryption2['default'].parseInitDataFromContentProtection(cp, BASE64);
    }

    function getRequestHeadersFromMessage() /*message*/{
        return null;
    }

    function getLicenseRequestFromMessage(message) {
        return new Uint8Array(message);
    }

    function getLicenseServerURLFromInitData() /*initData*/{
        return null;
    }

    function getCDMData() {
        return null;
    }

    function getSessionId(cp) {
        // Get sessionId from protectionData or from manifest
        if (protData && protData.sessionId) {
            return protData.sessionId;
        } else if (cp && cp.sessionId) {
            return cp.sessionId;
        }
        return null;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        init: init,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        getCDMData: getCDMData,
        getSessionId: getSessionId
    };

    return instance;
}

KeySystemWidevine.__dashjs_factory_name = 'KeySystemWidevine';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(KeySystemWidevine);
/* jshint ignore:line */
module.exports = exports['default'];

},{"3":3,"4":4}],13:[function(_dereq_,module,exports){
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
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _coreErrorsErrorsBase = _dereq_(1);

var _coreErrorsErrorsBase2 = _interopRequireDefault(_coreErrorsErrorsBase);

/**
 * @class
 */

var ProtectionErrors = (function (_ErrorsBase) {
  _inherits(ProtectionErrors, _ErrorsBase);

  function ProtectionErrors() {
    _classCallCheck(this, ProtectionErrors);

    _get(Object.getPrototypeOf(ProtectionErrors.prototype), 'constructor', this).call(this);

    /**
     *  Generid key Error code
     */
    this.MEDIA_KEYERR_CODE = 100;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_UNKNOWN_CODE = 101;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_CLIENT_CODE = 102;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_SERVICE_CODE = 103;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_OUTPUT_CODE = 104;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_HARDWARECHANGE_CODE = 105;
    /**
     *  Error code returned by keyerror api for ProtectionModel_01b
     */
    this.MEDIA_KEYERR_DOMAIN_CODE = 106;

    /**
     *  Error code returned when an error occured in keymessage event for ProtectionModel_01b
     */
    this.MEDIA_KEY_MESSAGE_ERROR_CODE = 107;
    /**
     *  Error code returned when challenge is invalid in keymessage event (event triggered by CDM)
     */
    this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_CODE = 108;
    /**
     *  Error code returned when License server certificate has not been successfully updated
     */
    this.SERVER_CERTIFICATE_UPDATED_ERROR_CODE = 109;
    /**
     *  Error code returned when license validity has expired
     */
    this.KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE = 110;
    /**
     *  Error code returned when no licenser url is defined
     */
    this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_CODE = 111;
    /**
     *  Error code returned when key system access is denied
     */
    this.KEY_SYSTEM_ACCESS_DENIED_ERROR_CODE = 112;
    /**
     *  Error code returned when key session has not been successfully created
     */
    this.KEY_SESSION_CREATED_ERROR_CODE = 113;
    /**
     *  Error code returned when license request failed after a keymessage event has been triggered
     */
    this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_CODE = 114;

    this.MEDIA_KEYERR_UNKNOWN_MESSAGE = 'An unspecified error occurred. This value is used for errors that don\'t match any of the other codes.';
    this.MEDIA_KEYERR_CLIENT_MESSAGE = 'The Key System could not be installed or updated.';
    this.MEDIA_KEYERR_SERVICE_MESSAGE = 'The message passed into update indicated an error from the license service.';
    this.MEDIA_KEYERR_OUTPUT_MESSAGE = 'There is no available output device with the required characteristics for the content protection system.';
    this.MEDIA_KEYERR_HARDWARECHANGE_MESSAGE = 'A hardware configuration change caused a content protection error.';
    this.MEDIA_KEYERR_DOMAIN_MESSAGE = 'An error occurred in a multi-device domain licensing configuration. The most common error is a failure to join the domain.';
    this.MEDIA_KEY_MESSAGE_ERROR_MESSAGE = 'Multiple key sessions were creates with a user-agent that does not support sessionIDs!! Unpredictable behavior ahead!';
    this.MEDIA_KEY_MESSAGE_NO_CHALLENGE_ERROR_MESSAGE = 'DRM: Empty key message from CDM';
    this.SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE = 'Error updating server certificate -- ';
    this.KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE = 'DRM: KeyStatusChange error! -- License has expired';
    this.MEDIA_KEY_MESSAGE_NO_LICENSE_SERVER_URL_ERROR_MESSAGE = 'DRM: No license server URL specified!';
    this.KEY_SYSTEM_ACCESS_DENIED_ERROR_MESSAGE = 'DRM: KeySystem Access Denied! -- ';
    this.KEY_SESSION_CREATED_ERROR_MESSAGE = 'DRM: unable to create session! --';
    this.MEDIA_KEY_MESSAGE_LICENSER_ERROR_MESSAGE = 'DRM: licenser error! --';
  }

  return ProtectionErrors;
})(_coreErrorsErrorsBase2['default']);

var protectionErrors = new ProtectionErrors();
exports['default'] = protectionErrors;
module.exports = exports['default'];

},{"1":1}],14:[function(_dereq_,module,exports){
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

/**
 * Initial implementation of EME
 *
 * Implemented by Google Chrome prior to v36
 *
 * @implements ProtectionModel
 * @class
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _controllersProtectionKeyController = _dereq_(8);

var _controllersProtectionKeyController2 = _interopRequireDefault(_controllersProtectionKeyController);

var _voNeedKey = _dereq_(27);

var _voNeedKey2 = _interopRequireDefault(_voNeedKey);

var _voDashJSError = _dereq_(28);

var _voDashJSError2 = _interopRequireDefault(_voDashJSError);

var _voKeyMessage = _dereq_(22);

var _voKeyMessage2 = _interopRequireDefault(_voKeyMessage);

var _voKeySystemConfiguration = _dereq_(25);

var _voKeySystemConfiguration2 = _interopRequireDefault(_voKeySystemConfiguration);

var _voKeySystemAccess = _dereq_(24);

var _voKeySystemAccess2 = _interopRequireDefault(_voKeySystemAccess);

var _errorsProtectionErrors = _dereq_(13);

var _errorsProtectionErrors2 = _interopRequireDefault(_errorsProtectionErrors);

function ProtectionModel_01b(config) {

    config = config || {};
    var context = this.context;
    var eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
    var events = config.events;
    var debug = config.debug;
    var api = config.api;
    var errHandler = config.errHandler;

    var instance = undefined,
        logger = undefined,
        videoElement = undefined,
        keySystem = undefined,
        protectionKeyController = undefined,

    // With this version of the EME APIs, sessionIDs are not assigned to
    // sessions until the first key message is received.  We are assuming
    // that in the case of multiple sessions, key messages will be received
    // in the order that generateKeyRequest() is called.
    // Holding spot for newly-created sessions until we determine whether or
    // not the CDM supports sessionIDs
    pendingSessions = undefined,

    // List of sessions that have been initialized.  Only the first position will
    // be used in the case that the CDM does not support sessionIDs
    sessions = undefined,

    // Not all CDMs support the notion of sessionIDs.  Without sessionIDs
    // there is no way for us to differentiate between sessions, therefore
    // we must only allow a single session.  Once we receive the first key
    // message we can set this flag to determine if more sessions are allowed
    moreSessionsAllowed = undefined,

    // This is our main event handler for all desired HTMLMediaElement events
    // related to EME.  These events are translated into our API-independent
    // versions of the same events
    eventHandler = undefined;

    function setup() {
        logger = debug.getLogger(instance);
        videoElement = null;
        keySystem = null;
        pendingSessions = [];
        sessions = [];
        protectionKeyController = (0, _controllersProtectionKeyController2['default'])(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        if (videoElement) {
            removeEventListeners();
        }
        for (var i = 0; i < sessions.length; i++) {
            closeKeySession(sessions[i]);
        }
        eventBus.trigger(events.TEARDOWN_COMPLETE);
    }

    function getKeySystem() {
        return keySystem;
    }

    function getAllInitData() {
        var retVal = [];
        for (var i = 0; i < pendingSessions.length; i++) {
            retVal.push(pendingSessions[i].initData);
        }
        for (var i = 0; i < sessions.length; i++) {
            retVal.push(sessions[i].initData);
        }
        return retVal;
    }

    function requestKeySystemAccess(ksConfigurations) {
        var ve = videoElement;
        if (!ve) {
            // Must have a video element to do this capability tests
            ve = document.createElement('video');
        }

        // Try key systems in order, first one with supported key system configuration
        // is used
        var found = false;
        for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
            var systemString = ksConfigurations[ksIdx].ks.systemString;
            var configs = ksConfigurations[ksIdx].configs;
            var supportedAudio = null;
            var supportedVideo = null;

            // Try key system configs in order, first one with supported audio/video
            // is used
            for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                //let audios = configs[configIdx].audioCapabilities;
                var videos = configs[configIdx].videoCapabilities;
                // Look for supported video container/codecs
                if (videos && videos.length !== 0) {
                    supportedVideo = []; // Indicates that we have a requested video config
                    for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                        if (ve.canPlayType(videos[videoIdx].contentType, systemString) !== '') {
                            supportedVideo.push(videos[videoIdx]);
                        }
                    }
                }

                // No supported audio or video in this configuration OR we have
                // requested audio or video configuration that is not supported
                if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
                    continue;
                }

                // This configuration is supported
                found = true;
                var ksConfig = new _voKeySystemConfiguration2['default'](supportedAudio, supportedVideo);
                var ks = protectionKeyController.getKeySystemBySystemString(systemString);
                eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { data: new _voKeySystemAccess2['default'](ks, ksConfig) });
                break;
            }
        }
        if (!found) {
            eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { error: 'Key system access denied! -- No valid audio/video content configurations detected!' });
        }
    }

    function selectKeySystem(keySystemAccess) {
        keySystem = keySystemAccess.keySystem;
        eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED);
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement) {
            return;
        }

        // Replacing the previous element
        if (videoElement) {
            removeEventListeners();

            // Close any open sessions - avoids memory leak on LG webOS 2016/2017 TVs
            for (var i = 0; i < sessions.length; i++) {
                closeKeySession(sessions[i]);
            }
            sessions = [];
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener(api.keyerror, eventHandler);
            videoElement.addEventListener(api.needkey, eventHandler);
            videoElement.addEventListener(api.keymessage, eventHandler);
            videoElement.addEventListener(api.keyadded, eventHandler);
            eventBus.trigger(events.VIDEO_ELEMENT_SELECTED);
        }
    }

    function createKeySession(initData /*, protData, keySystemType */) {
        if (!keySystem) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        // Determine if creating a new session is allowed
        if (moreSessionsAllowed || sessions.length === 0) {
            var newSession = { // Implements SessionToken
                sessionID: null,
                initData: initData,
                getSessionID: function getSessionID() {
                    return this.sessionID;
                },

                getExpirationTime: function getExpirationTime() {
                    return NaN;
                },

                getSessionType: function getSessionType() {
                    return 'temporary';
                }
            };
            pendingSessions.push(newSession);

            // Send our request to the CDM
            videoElement[api.generateKeyRequest](keySystem.systemString, new Uint8Array(initData));

            return newSession;
        } else {
            throw new Error('Multiple sessions not allowed!');
        }
    }

    function updateKeySession(sessionToken, message) {
        var sessionID = sessionToken.sessionID;
        if (!protectionKeyController.isClearKey(keySystem)) {
            // Send our request to the CDM
            videoElement[api.addKey](keySystem.systemString, new Uint8Array(message), new Uint8Array(sessionToken.initData), sessionID);
        } else {
            // For clearkey, message is a ClearKeyKeySet
            for (var i = 0; i < message.keyPairs.length; i++) {
                videoElement[api.addKey](keySystem.systemString, message.keyPairs[i].key, message.keyPairs[i].keyID, sessionID);
            }
        }
    }

    function closeKeySession(sessionToken) {
        // Send our request to the CDM
        try {
            videoElement[api.cancelKeyRequest](keySystem.systemString, sessionToken.sessionID);
        } catch (error) {
            eventBus.trigger(events.KEY_SESSION_CLOSED, { data: null, error: 'Error closing session (' + sessionToken.sessionID + ') ' + error.message });
        }
    }

    function setServerCertificate() /*serverCertificate*/{/* Not supported */}
    function loadKeySession() /*sessionID*/{/* Not supported */}
    function removeKeySession() /*sessionToken*/{/* Not supported */}

    function createEventHandler() {
        return {
            handleEvent: function handleEvent(event) {
                var sessionToken = null;
                switch (event.type) {
                    case api.needkey:
                        var initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                        eventBus.trigger(events.NEED_KEY, { key: new _voNeedKey2['default'](initData, 'cenc') });
                        break;

                    case api.keyerror:
                        sessionToken = findSessionByID(sessions, event.sessionId);
                        if (!sessionToken) {
                            sessionToken = findSessionByID(pendingSessions, event.sessionId);
                        }

                        if (sessionToken) {
                            var code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_CODE;
                            var msg = '';
                            switch (event.errorCode.code) {
                                case 1:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_UNKNOWN_CODE;
                                    msg += 'MEDIA_KEYERR_UNKNOWN - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_UNKNOWN_MESSAGE;
                                    break;
                                case 2:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_CLIENT_CODE;
                                    msg += 'MEDIA_KEYERR_CLIENT - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_CLIENT_MESSAGE;
                                    break;
                                case 3:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_SERVICE_CODE;
                                    msg += 'MEDIA_KEYERR_SERVICE - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_SERVICE_MESSAGE;
                                    break;
                                case 4:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_OUTPUT_CODE;
                                    msg += 'MEDIA_KEYERR_OUTPUT - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_OUTPUT_MESSAGE;
                                    break;
                                case 5:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_HARDWARECHANGE_CODE;
                                    msg += 'MEDIA_KEYERR_HARDWARECHANGE - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_HARDWARECHANGE_MESSAGE;
                                    break;
                                case 6:
                                    code = _errorsProtectionErrors2['default'].MEDIA_KEYERR_DOMAIN_CODE;
                                    msg += 'MEDIA_KEYERR_DOMAIN - ' + _errorsProtectionErrors2['default'].MEDIA_KEYERR_DOMAIN_MESSAGE;
                                    break;
                            }
                            msg += '  System Code = ' + event.systemCode;
                            // TODO: Build error string based on key error
                            eventBus.trigger(events.KEY_ERROR, { data: new _voDashJSError2['default'](code, msg, sessionToken) });
                        } else {
                            logger.error('No session token found for key error');
                        }
                        break;

                    case api.keyadded:
                        sessionToken = findSessionByID(sessions, event.sessionId);
                        if (!sessionToken) {
                            sessionToken = findSessionByID(pendingSessions, event.sessionId);
                        }

                        if (sessionToken) {
                            logger.debug('DRM: Key added.');
                            eventBus.trigger(events.KEY_ADDED, { data: sessionToken }); //TODO not sure anything is using sessionToken? why there?
                        } else {
                                logger.debug('No session token found for key added');
                            }
                        break;

                    case api.keymessage:
                        // If this CDM does not support session IDs, we will be limited
                        // to a single session
                        moreSessionsAllowed = event.sessionId !== null && event.sessionId !== undefined;

                        // SessionIDs supported
                        if (moreSessionsAllowed) {
                            // Attempt to find an uninitialized token with this sessionID
                            sessionToken = findSessionByID(sessions, event.sessionId);
                            if (!sessionToken && pendingSessions.length > 0) {

                                // This is the first message for our latest session, so set the
                                // sessionID and add it to our list
                                sessionToken = pendingSessions.shift();
                                sessions.push(sessionToken);
                                sessionToken.sessionID = event.sessionId;

                                eventBus.trigger(events.KEY_SESSION_CREATED, { data: sessionToken });
                            }
                        } else if (pendingSessions.length > 0) {
                            // SessionIDs not supported
                            sessionToken = pendingSessions.shift();
                            sessions.push(sessionToken);

                            if (pendingSessions.length !== 0) {
                                errHandler.error(new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_ERROR_CODE, _errorsProtectionErrors2['default'].MEDIA_KEY_MESSAGE_ERROR_MESSAGE));
                            }
                        }

                        if (sessionToken) {
                            var message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;

                            // For ClearKey, the spec mandates that you pass this message to the
                            // addKey method, so we always save it to the token since there is no
                            // way to tell which key system is in use
                            sessionToken.keyMessage = message;
                            eventBus.trigger(events.INTERNAL_KEY_MESSAGE, { data: new _voKeyMessage2['default'](sessionToken, message, event.defaultURL) });
                        } else {
                            logger.warn('No session token found for key message');
                        }
                        break;
                }
            }
        };
    }

    /**
     * Helper function to retrieve the stored session token based on a given
     * sessionID value
     *
     * @param {Array} sessionArray - the array of sessions to search
     * @param {*} sessionID - the sessionID to search for
     * @returns {*} the session token with the given sessionID
     */
    function findSessionByID(sessionArray, sessionID) {
        if (!sessionID || !sessionArray) {
            return null;
        } else {
            var len = sessionArray.length;
            for (var i = 0; i < len; i++) {
                if (sessionArray[i].sessionID == sessionID) {
                    return sessionArray[i];
                }
            }
            return null;
        }
    }

    function removeEventListeners() {
        videoElement.removeEventListener(api.keyerror, eventHandler);
        videoElement.removeEventListener(api.needkey, eventHandler);
        videoElement.removeEventListener(api.keymessage, eventHandler);
        videoElement.removeEventListener(api.keyadded, eventHandler);
    }

    instance = {
        getAllInitData: getAllInitData,
        requestKeySystemAccess: requestKeySystemAccess,
        getKeySystem: getKeySystem,
        selectKeySystem: selectKeySystem,
        setMediaElement: setMediaElement,
        createKeySession: createKeySession,
        updateKeySession: updateKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        stop: reset,
        reset: reset
    };

    setup();

    return instance;
}

ProtectionModel_01b.__dashjs_factory_name = 'ProtectionModel_01b';
exports['default'] = dashjs.FactoryMaker.getClassFactory(ProtectionModel_01b);
/* jshint ignore:line */
module.exports = exports['default'];

},{"13":13,"22":22,"24":24,"25":25,"27":27,"28":28,"8":8}],15:[function(_dereq_,module,exports){
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

/**
 * Most recent EME implementation
 *
 * Implemented by Google Chrome v36+ (Windows, OSX, Linux)
 *
 * @implements ProtectionModel
 * @class
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _controllersProtectionKeyController = _dereq_(8);

var _controllersProtectionKeyController2 = _interopRequireDefault(_controllersProtectionKeyController);

var _voNeedKey = _dereq_(27);

var _voNeedKey2 = _interopRequireDefault(_voNeedKey);

var _errorsProtectionErrors = _dereq_(13);

var _errorsProtectionErrors2 = _interopRequireDefault(_errorsProtectionErrors);

var _voDashJSError = _dereq_(28);

var _voDashJSError2 = _interopRequireDefault(_voDashJSError);

var _voKeyMessage = _dereq_(22);

var _voKeyMessage2 = _interopRequireDefault(_voKeyMessage);

var _voKeySystemAccess = _dereq_(24);

var _voKeySystemAccess2 = _interopRequireDefault(_voKeySystemAccess);

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

function ProtectionModel_21Jan2015(config) {

    config = config || {};
    var context = this.context;
    var eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
    var events = config.events;
    var debug = config.debug;

    var instance = undefined,
        logger = undefined,
        keySystem = undefined,
        videoElement = undefined,
        mediaKeys = undefined,
        sessions = undefined,
        eventHandler = undefined,
        protectionKeyController = undefined;

    function setup() {
        logger = debug.getLogger(instance);
        keySystem = null;
        videoElement = null;
        mediaKeys = null;
        sessions = [];
        protectionKeyController = (0, _controllersProtectionKeyController2['default'])(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        var numSessions = sessions.length;
        var session = undefined;

        if (numSessions !== 0) {
            (function () {
                // Called when we are done closing a session.  Success or fail
                var done = function done(session) {
                    removeSession(session);
                    if (sessions.length === 0) {
                        if (videoElement) {
                            videoElement.removeEventListener('encrypted', eventHandler);
                            videoElement.setMediaKeys(null).then(function () {
                                eventBus.trigger(events.TEARDOWN_COMPLETE);
                            });
                        } else {
                            eventBus.trigger(events.TEARDOWN_COMPLETE);
                        }
                    }
                };
                for (var i = 0; i < numSessions; i++) {
                    session = sessions[i];
                    (function (s) {
                        // Override closed promise resolver
                        session.session.closed.then(function () {
                            done(s);
                        });
                        // Close the session and handle errors, otherwise promise
                        // resolver above will be called
                        closeKeySessionInternal(session)['catch'](function () {
                            done(s);
                        });
                    })(session);
                }
            })();
        } else {
            eventBus.trigger(events.TEARDOWN_COMPLETE);
        }
    }

    function stop() {
        // Close and remove not usable sessions
        var session = undefined;
        for (var i = 0; i < sessions.length; i++) {
            session = sessions[i];
            if (!session.getUsable()) {
                closeKeySessionInternal(session)['catch'](function () {
                    removeSession(session);
                });
            }
        }
    }

    function getKeySystem() {
        return keySystem;
    }

    function getAllInitData() {
        var retVal = [];
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i].initData) {
                retVal.push(sessions[i].initData);
            }
        }
        return retVal;
    }

    function requestKeySystemAccess(ksConfigurations) {
        requestKeySystemAccessInternal(ksConfigurations, 0);
    }

    function selectKeySystem(keySystemAccess) {
        keySystemAccess.mksa.createMediaKeys().then(function (mkeys) {
            keySystem = keySystemAccess.keySystem;
            mediaKeys = mkeys;
            if (videoElement) {
                videoElement.setMediaKeys(mediaKeys).then(function () {
                    eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED);
                });
            } else {
                eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED);
            }
        })['catch'](function () {
            eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED, { error: 'Error selecting keys system (' + keySystemAccess.keySystem.systemString + ')! Could not create MediaKeys -- TODO' });
        });
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement) return;

        // Replacing the previous element
        if (videoElement) {
            videoElement.removeEventListener('encrypted', eventHandler);
            if (videoElement.setMediaKeys) {
                videoElement.setMediaKeys(null);
            }
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener('encrypted', eventHandler);
            if (videoElement.setMediaKeys && mediaKeys) {
                videoElement.setMediaKeys(mediaKeys);
            }
        }
    }

    function setServerCertificate(serverCertificate) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not set server certificate until you have selected a key system');
        }
        mediaKeys.setServerCertificate(serverCertificate).then(function () {
            logger.info('DRM: License server certificate successfully updated.');
            eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED);
        })['catch'](function (error) {
            eventBus.trigger(events.SERVER_CERTIFICATE_UPDATED, { error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].SERVER_CERTIFICATE_UPDATED_ERROR_CODE, _errorsProtectionErrors2['default'].SERVER_CERTIFICATE_UPDATED_ERROR_MESSAGE + error.name) });
        });
    }

    function createKeySession(initData, protData, sessionType) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        var session = mediaKeys.createSession(sessionType);
        var sessionToken = createSessionToken(session, initData, sessionType);
        var ks = this.getKeySystem();

        // Generate initial key request.
        // keyids type is used for clearkey when keys are provided directly in the protection data and then request to a license server is not needed
        var dataType = ks.systemString === _constantsProtectionConstants2['default'].CLEARKEY_KEYSTEM_STRING && protData && protData.clearkeys ? 'keyids' : 'cenc';
        session.generateRequest(dataType, initData).then(function () {
            logger.debug('DRM: Session created.  SessionID = ' + sessionToken.getSessionID());
            eventBus.trigger(events.KEY_SESSION_CREATED, { data: sessionToken });
        })['catch'](function (error) {
            // TODO: Better error string
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CREATED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Error generating key request -- ' + error.name) });
        });
    }

    function updateKeySession(sessionToken, message) {
        var session = sessionToken.session;

        // Send our request to the key session
        if (protectionKeyController.isClearKey(keySystem)) {
            message = message.toJWK();
        }
        session.update(message)['catch'](function (error) {
            eventBus.trigger(events.KEY_ERROR, { data: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEYERR_CODE, 'Error sending update() message! ' + error.name, sessionToken) });
        });
    }

    function loadKeySession(sessionID, initData, sessionType) {
        if (!keySystem || !mediaKeys) {
            throw new Error('Can not load sessions until you have selected a key system');
        }

        // Check if session Id is not already loaded or loading
        for (var i = 0; i < sessions.length; i++) {
            if (sessionID === sessions[i].sessionId) {
                logger.warn('DRM: Ignoring session ID because we have already seen it!');
                return;
            }
        }

        var session = mediaKeys.createSession(sessionType);
        var sessionToken = createSessionToken(session, initData, sessionType, sessionID);

        // Load persisted session data into our newly created session object
        session.load(sessionID).then(function (success) {
            if (success) {
                logger.debug('DRM: Session loaded.  SessionID = ' + sessionToken.getSessionID());
                eventBus.trigger(events.KEY_SESSION_CREATED, { data: sessionToken });
            } else {
                removeSession(sessionToken);
                eventBus.trigger(events.KEY_SESSION_CREATED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session! Invalid Session ID (' + sessionID + ')') });
            }
        })['catch'](function (error) {
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CREATED, { data: null, error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_SESSION_CREATED_ERROR_MESSAGE + 'Could not load session (' + sessionID + ')! ' + error.name) });
        });
    }

    function removeKeySession(sessionToken) {
        var session = sessionToken.session;

        session.remove().then(function () {
            logger.debug('DRM: Session removed.  SessionID = ' + sessionToken.getSessionID());
            eventBus.trigger(events.KEY_SESSION_REMOVED, { data: sessionToken.getSessionID() });
        }, function (error) {
            eventBus.trigger(events.KEY_SESSION_REMOVED, { data: null, error: 'Error removing session (' + sessionToken.getSessionID() + '). ' + error.name });
        });
    }

    function closeKeySession(sessionToken) {
        // Send our request to the key session
        closeKeySessionInternal(sessionToken)['catch'](function (error) {
            removeSession(sessionToken);
            eventBus.trigger(events.KEY_SESSION_CLOSED, { data: null, error: 'Error closing session (' + sessionToken.getSessionID() + ') ' + error.name });
        });
    }

    function requestKeySystemAccessInternal(ksConfigurations, idx) {

        if (navigator.requestMediaKeySystemAccess === undefined || typeof navigator.requestMediaKeySystemAccess !== 'function') {
            eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { error: 'Insecure origins are not allowed' });
            return;
        }

        (function (i) {
            var keySystem = ksConfigurations[i].ks;
            var configs = ksConfigurations[i].configs;
            var systemString = keySystem.systemString;

            // PATCH to support persistent licenses on Edge browser (see issue #2658)
            if (systemString === _constantsProtectionConstants2['default'].PLAYREADY_KEYSTEM_STRING && configs[0].persistentState === 'required') {
                systemString += '.recommendation';
            }

            navigator.requestMediaKeySystemAccess(systemString, configs).then(function (mediaKeySystemAccess) {
                // Chrome 40 does not currently implement MediaKeySystemAccess.getConfiguration()
                var configuration = typeof mediaKeySystemAccess.getConfiguration === 'function' ? mediaKeySystemAccess.getConfiguration() : null;
                var keySystemAccess = new _voKeySystemAccess2['default'](keySystem, configuration);
                keySystemAccess.mksa = mediaKeySystemAccess;
                eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { data: keySystemAccess });
            })['catch'](function (error) {
                if (++i < ksConfigurations.length) {
                    requestKeySystemAccessInternal(ksConfigurations, i);
                } else {
                    eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { error: 'Key system access denied! ' + error.message });
                }
            });
        })(idx);
    }

    function closeKeySessionInternal(sessionToken) {
        var session = sessionToken.session;

        // Remove event listeners
        session.removeEventListener('keystatuseschange', sessionToken);
        session.removeEventListener('message', sessionToken);

        // Send our request to the key session
        return session.close();
    }

    // This is our main event handler for all desired HTMLMediaElement events
    // related to EME.  These events are translated into our API-independent
    // versions of the same events
    function createEventHandler() {
        return {
            handleEvent: function handleEvent(event) {
                switch (event.type) {
                    case 'encrypted':
                        if (event.initData) {
                            var initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                            eventBus.trigger(events.NEED_KEY, { key: new _voNeedKey2['default'](initData, event.initDataType) });
                        }
                        break;
                }
            }
        };
    }

    function removeSession(token) {
        // Remove from our session list
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i] === token) {
                sessions.splice(i, 1);
                break;
            }
        }
    }

    function parseKeyStatus(args) {
        // Edge and Chrome implement different version of keystatues, param are not on same order
        var status = undefined,
            keyId = undefined;
        if (args && args.length > 0) {
            if (args[0]) {
                if (typeof args[0] === 'string') {
                    status = args[0];
                } else {
                    keyId = args[0];
                }
            }

            if (args[1]) {
                if (typeof args[1] === 'string') {
                    status = args[1];
                } else {
                    keyId = args[1];
                }
            }
        }
        return {
            status: status,
            keyId: keyId
        };
    }

    // Function to create our session token objects which manage the EME
    // MediaKeySession and session-specific event handler
    function createSessionToken(session, initData, sessionType, sessionID) {
        var token = { // Implements SessionToken
            session: session,
            initData: initData,
            sessionId: sessionID,

            // This is our main event handler for all desired MediaKeySession events
            // These events are translated into our API-independent versions of the
            // same events
            handleEvent: function handleEvent(event) {
                switch (event.type) {
                    case 'keystatuseschange':
                        eventBus.trigger(events.KEY_STATUSES_CHANGED, { data: this });
                        event.target.keyStatuses.forEach(function () {
                            var keyStatus = parseKeyStatus(arguments);
                            switch (keyStatus.status) {
                                case 'expired':
                                    eventBus.trigger(events.INTERNAL_KEY_STATUS_CHANGED, { error: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].KEY_STATUS_CHANGED_EXPIRED_ERROR_CODE, _errorsProtectionErrors2['default'].KEY_STATUS_CHANGED_EXPIRED_ERROR_MESSAGE) });
                                    break;
                                default:
                                    eventBus.trigger(events.INTERNAL_KEY_STATUS_CHANGED, keyStatus);
                                    break;
                            }
                        });
                        break;

                    case 'message':
                        var message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
                        eventBus.trigger(events.INTERNAL_KEY_MESSAGE, { data: new _voKeyMessage2['default'](this, message, undefined, event.messageType) });
                        break;
                }
            },

            getSessionID: function getSessionID() {
                return session.sessionId;
            },

            getExpirationTime: function getExpirationTime() {
                return session.expiration;
            },

            getKeyStatuses: function getKeyStatuses() {
                return session.keyStatuses;
            },

            getUsable: function getUsable() {
                var usable = false;
                session.keyStatuses.forEach(function () {
                    var keyStatus = parseKeyStatus(arguments);
                    if (keyStatus.status === 'usable') {
                        usable = true;
                    }
                });
                return usable;
            },

            getSessionType: function getSessionType() {
                return sessionType;
            }
        };

        // Add all event listeners
        session.addEventListener('keystatuseschange', token);
        session.addEventListener('message', token);

        // Register callback for session closed Promise
        session.closed.then(function () {
            removeSession(token);
            logger.debug('DRM: Session closed.  SessionID = ' + token.getSessionID());
            eventBus.trigger(events.KEY_SESSION_CLOSED, { data: token.getSessionID() });
        });

        // Add to our session list
        sessions.push(token);

        return token;
    }

    instance = {
        getAllInitData: getAllInitData,
        requestKeySystemAccess: requestKeySystemAccess,
        getKeySystem: getKeySystem,
        selectKeySystem: selectKeySystem,
        setMediaElement: setMediaElement,
        setServerCertificate: setServerCertificate,
        createKeySession: createKeySession,
        updateKeySession: updateKeySession,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        closeKeySession: closeKeySession,
        stop: stop,
        reset: reset
    };

    setup();

    return instance;
}

ProtectionModel_21Jan2015.__dashjs_factory_name = 'ProtectionModel_21Jan2015';
exports['default'] = dashjs.FactoryMaker.getClassFactory(ProtectionModel_21Jan2015);
/* jshint ignore:line */
module.exports = exports['default'];

},{"13":13,"22":22,"24":24,"27":27,"28":28,"3":3,"8":8}],16:[function(_dereq_,module,exports){
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

/**
 * Implementation of the EME APIs as of the 3 Feb 2014 state of the specification.
 *
 * Implemented by Internet Explorer 11 (Windows 8.1)
 *
 * @implements ProtectionModel
 * @class
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _controllersProtectionKeyController = _dereq_(8);

var _controllersProtectionKeyController2 = _interopRequireDefault(_controllersProtectionKeyController);

var _voNeedKey = _dereq_(27);

var _voNeedKey2 = _interopRequireDefault(_voNeedKey);

var _voDashJSError = _dereq_(28);

var _voDashJSError2 = _interopRequireDefault(_voDashJSError);

var _errorsProtectionErrors = _dereq_(13);

var _errorsProtectionErrors2 = _interopRequireDefault(_errorsProtectionErrors);

var _voKeyMessage = _dereq_(22);

var _voKeyMessage2 = _interopRequireDefault(_voKeyMessage);

var _voKeySystemConfiguration = _dereq_(25);

var _voKeySystemConfiguration2 = _interopRequireDefault(_voKeySystemConfiguration);

var _voKeySystemAccess = _dereq_(24);

var _voKeySystemAccess2 = _interopRequireDefault(_voKeySystemAccess);

function ProtectionModel_3Feb2014(config) {

    config = config || {};
    var context = this.context;
    var eventBus = config.eventBus; //Need to pass in here so we can use same instance since this is optional module
    var events = config.events;
    var debug = config.debug;
    var api = config.api;

    var instance = undefined,
        logger = undefined,
        videoElement = undefined,
        keySystem = undefined,
        mediaKeys = undefined,
        keySystemAccess = undefined,
        sessions = undefined,
        eventHandler = undefined,
        protectionKeyController = undefined;

    function setup() {
        logger = debug.getLogger(instance);
        videoElement = null;
        keySystem = null;
        mediaKeys = null;
        keySystemAccess = null;
        sessions = [];
        protectionKeyController = (0, _controllersProtectionKeyController2['default'])(context).getInstance();
        eventHandler = createEventHandler();
    }

    function reset() {
        try {
            for (var i = 0; i < sessions.length; i++) {
                closeKeySession(sessions[i]);
            }
            if (videoElement) {
                videoElement.removeEventListener(api.needkey, eventHandler);
            }
            eventBus.trigger(events.TEARDOWN_COMPLETE);
        } catch (error) {
            eventBus.trigger(events.TEARDOWN_COMPLETE, { error: 'Error tearing down key sessions and MediaKeys! -- ' + error.message });
        }
    }

    function getKeySystem() {
        return keySystem;
    }

    function getAllInitData() {
        var retVal = [];
        for (var i = 0; i < sessions.length; i++) {
            retVal.push(sessions[i].initData);
        }
        return retVal;
    }

    function requestKeySystemAccess(ksConfigurations) {

        // Try key systems in order, first one with supported key system configuration
        // is used
        var found = false;
        for (var ksIdx = 0; ksIdx < ksConfigurations.length; ksIdx++) {
            var systemString = ksConfigurations[ksIdx].ks.systemString;
            var configs = ksConfigurations[ksIdx].configs;
            var supportedAudio = null;
            var supportedVideo = null;

            // Try key system configs in order, first one with supported audio/video
            // is used
            for (var configIdx = 0; configIdx < configs.length; configIdx++) {
                var audios = configs[configIdx].audioCapabilities;
                var videos = configs[configIdx].videoCapabilities;

                // Look for supported audio container/codecs
                if (audios && audios.length !== 0) {
                    supportedAudio = []; // Indicates that we have a requested audio config
                    for (var audioIdx = 0; audioIdx < audios.length; audioIdx++) {
                        if (window[api.MediaKeys].isTypeSupported(systemString, audios[audioIdx].contentType)) {
                            supportedAudio.push(audios[audioIdx]);
                        }
                    }
                }

                // Look for supported video container/codecs
                if (videos && videos.length !== 0) {
                    supportedVideo = []; // Indicates that we have a requested video config
                    for (var videoIdx = 0; videoIdx < videos.length; videoIdx++) {
                        if (window[api.MediaKeys].isTypeSupported(systemString, videos[videoIdx].contentType)) {
                            supportedVideo.push(videos[videoIdx]);
                        }
                    }
                }

                // No supported audio or video in this configuration OR we have
                // requested audio or video configuration that is not supported
                if (!supportedAudio && !supportedVideo || supportedAudio && supportedAudio.length === 0 || supportedVideo && supportedVideo.length === 0) {
                    continue;
                }

                // This configuration is supported
                found = true;
                var ksConfig = new _voKeySystemConfiguration2['default'](supportedAudio, supportedVideo);
                var ks = protectionKeyController.getKeySystemBySystemString(systemString);
                eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { data: new _voKeySystemAccess2['default'](ks, ksConfig) });
                break;
            }
        }
        if (!found) {
            eventBus.trigger(events.KEY_SYSTEM_ACCESS_COMPLETE, { error: 'Key system access denied! -- No valid audio/video content configurations detected!' });
        }
    }

    function selectKeySystem(ksAccess) {
        try {
            mediaKeys = ksAccess.mediaKeys = new window[api.MediaKeys](ksAccess.keySystem.systemString);
            keySystem = ksAccess.keySystem;
            keySystemAccess = ksAccess;
            if (videoElement) {
                setMediaKeys();
            }
            eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED);
        } catch (error) {
            eventBus.trigger(events.INTERNAL_KEY_SYSTEM_SELECTED, { error: 'Error selecting keys system (' + keySystem.systemString + ')! Could not create MediaKeys -- TODO' });
        }
    }

    function setMediaElement(mediaElement) {
        if (videoElement === mediaElement) return;

        // Replacing the previous element
        if (videoElement) {
            videoElement.removeEventListener(api.needkey, eventHandler);
        }

        videoElement = mediaElement;

        // Only if we are not detaching from the existing element
        if (videoElement) {
            videoElement.addEventListener(api.needkey, eventHandler);
            if (mediaKeys) {
                setMediaKeys();
            }
        }
    }

    function createKeySession(initData, protData, sessionType, cdmData) {
        if (!keySystem || !mediaKeys || !keySystemAccess) {
            throw new Error('Can not create sessions until you have selected a key system');
        }

        // Use the first video capability for the contentType.
        // TODO:  Not sure if there is a way to concatenate all capability data into a RFC6386-compatible format

        // If player is trying to playback Audio only stream - don't error out.
        var capabilities = null;

        if (keySystemAccess.ksConfiguration.videoCapabilities && keySystemAccess.ksConfiguration.videoCapabilities.length > 0) {
            capabilities = keySystemAccess.ksConfiguration.videoCapabilities[0];
        }

        if (capabilities === null && keySystemAccess.ksConfiguration.audioCapabilities && keySystemAccess.ksConfiguration.audioCapabilities.length > 0) {
            capabilities = keySystemAccess.ksConfiguration.audioCapabilities[0];
        }

        if (capabilities === null) {
            throw new Error('Can not create sessions for unknown content types.');
        }

        var contentType = capabilities.contentType;
        var session = mediaKeys.createSession(contentType, new Uint8Array(initData), cdmData ? new Uint8Array(cdmData) : null);
        var sessionToken = createSessionToken(session, initData);

        // Add all event listeners
        session.addEventListener(api.error, sessionToken);
        session.addEventListener(api.message, sessionToken);
        session.addEventListener(api.ready, sessionToken);
        session.addEventListener(api.close, sessionToken);

        // Add to our session list
        sessions.push(sessionToken);
        logger.debug('DRM: Session created.  SessionID = ' + sessionToken.getSessionID());
        eventBus.trigger(events.KEY_SESSION_CREATED, { data: sessionToken });
    }

    function updateKeySession(sessionToken, message) {
        var session = sessionToken.session;

        if (!protectionKeyController.isClearKey(keySystem)) {
            // Send our request to the key session
            session.update(new Uint8Array(message));
        } else {
            // For clearkey, message is a ClearKeyKeySet
            session.update(new Uint8Array(message.toJWK()));
        }
    }

    /**
     * Close the given session and release all associated keys.  Following
     * this call, the sessionToken becomes invalid
     *
     * @param {Object} sessionToken - the session token
     */
    function closeKeySession(sessionToken) {
        var session = sessionToken.session;

        // Remove event listeners
        session.removeEventListener(api.error, sessionToken);
        session.removeEventListener(api.message, sessionToken);
        session.removeEventListener(api.ready, sessionToken);
        session.removeEventListener(api.close, sessionToken);

        // Remove from our session list
        for (var i = 0; i < sessions.length; i++) {
            if (sessions[i] === sessionToken) {
                sessions.splice(i, 1);
                break;
            }
        }

        // Send our request to the key session
        session[api.release]();
    }

    function setServerCertificate() /*serverCertificate*/{/* Not supported */}
    function loadKeySession() /*sessionID*/{/* Not supported */}
    function removeKeySession() /*sessionToken*/{/* Not supported */}

    function createEventHandler() {
        return {
            handleEvent: function handleEvent(event) {
                switch (event.type) {

                    case api.needkey:
                        if (event.initData) {
                            var initData = ArrayBuffer.isView(event.initData) ? event.initData.buffer : event.initData;
                            eventBus.trigger(events.NEED_KEY, { key: new _voNeedKey2['default'](initData, 'cenc') });
                        }
                        break;
                }
            }
        };
    }

    // IE11 does not let you set MediaKeys until it has entered a certain
    // readyState, so we need this logic to ensure we don't set the keys
    // too early
    function setMediaKeys() {
        var boundDoSetKeys = null;
        var doSetKeys = function doSetKeys() {
            videoElement.removeEventListener('loadedmetadata', boundDoSetKeys);
            videoElement[api.setMediaKeys](mediaKeys);
            eventBus.trigger(events.VIDEO_ELEMENT_SELECTED);
        };
        if (videoElement.readyState >= 1) {
            doSetKeys();
        } else {
            boundDoSetKeys = doSetKeys.bind(this);
            videoElement.addEventListener('loadedmetadata', boundDoSetKeys);
        }
    }

    // Function to create our session token objects which manage the EME
    // MediaKeySession and session-specific event handler
    function createSessionToken(keySession, initData) {
        return {
            // Implements SessionToken
            session: keySession,
            initData: initData,

            getSessionID: function getSessionID() {
                return this.session.sessionId;
            },

            getExpirationTime: function getExpirationTime() {
                return NaN;
            },

            getSessionType: function getSessionType() {
                return 'temporary';
            },
            // This is our main event handler for all desired MediaKeySession events
            // These events are translated into our API-independent versions of the
            // same events
            handleEvent: function handleEvent(event) {
                switch (event.type) {
                    case api.error:
                        var errorStr = 'KeyError'; // TODO: Make better string from event
                        eventBus.trigger(events.KEY_ERROR, { data: new _voDashJSError2['default'](_errorsProtectionErrors2['default'].MEDIA_KEYERR_CODE, errorStr, this) });
                        break;
                    case api.message:
                        var message = ArrayBuffer.isView(event.message) ? event.message.buffer : event.message;
                        eventBus.trigger(events.INTERNAL_KEY_MESSAGE, { data: new _voKeyMessage2['default'](this, message, event.destinationURL) });
                        break;
                    case api.ready:
                        logger.debug('DRM: Key added.');
                        eventBus.trigger(events.KEY_ADDED);
                        break;

                    case api.close:
                        logger.debug('DRM: Session closed.  SessionID = ' + this.getSessionID());
                        eventBus.trigger(events.KEY_SESSION_CLOSED, { data: this.getSessionID() });
                        break;
                }
            }
        };
    }

    instance = {
        getAllInitData: getAllInitData,
        requestKeySystemAccess: requestKeySystemAccess,
        getKeySystem: getKeySystem,
        selectKeySystem: selectKeySystem,
        setMediaElement: setMediaElement,
        createKeySession: createKeySession,
        updateKeySession: updateKeySession,
        closeKeySession: closeKeySession,
        setServerCertificate: setServerCertificate,
        loadKeySession: loadKeySession,
        removeKeySession: removeKeySession,
        stop: reset,
        reset: reset
    };

    setup();

    return instance;
}

ProtectionModel_3Feb2014.__dashjs_factory_name = 'ProtectionModel_3Feb2014';
exports['default'] = dashjs.FactoryMaker.getClassFactory(ProtectionModel_3Feb2014);
/* jshint ignore:line */
module.exports = exports['default'];

},{"13":13,"22":22,"24":24,"25":25,"27":27,"28":28,"8":8}],17:[function(_dereq_,module,exports){
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

/**
 * CableLabs ClearKey license server implementation
 *
 * For testing purposes and evaluating potential uses for ClearKey, we have developed
 * a dirt-simple API for requesting ClearKey licenses from a remote server.
 *
 * @implements LicenseServer
 * @class
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _voKeyPair = _dereq_(23);

var _voKeyPair2 = _interopRequireDefault(_voKeyPair);

var _voClearKeyKeySet = _dereq_(21);

var _voClearKeyKeySet2 = _interopRequireDefault(_voClearKeyKeySet);

function ClearKey() {

    var instance = undefined;

    function getServerURLFromMessage(url, message /*, messageType*/) {
        // Build ClearKey server query string
        var jsonMsg = JSON.parse(String.fromCharCode.apply(null, new Uint8Array(message)));
        url += '/?';
        for (var i = 0; i < jsonMsg.kids.length; i++) {
            url += jsonMsg.kids[i] + '&';
        }
        url = url.substring(0, url.length - 1);
        return url;
    }

    function getHTTPMethod() /*messageType*/{
        return 'GET';
    }

    function getResponseType() /*keySystemStr*/{
        return 'json';
    }

    function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
        if (!serverResponse.hasOwnProperty('keys')) {
            return null;
        }
        var keyPairs = [];
        for (var i = 0; i < serverResponse.keys.length; i++) {
            var keypair = serverResponse.keys[i];
            var keyid = keypair.kid.replace(/=/g, '');
            var key = keypair.k.replace(/=/g, '');

            keyPairs.push(new _voKeyPair2['default'](keyid, key));
        }
        return new _voClearKeyKeySet2['default'](keyPairs);
    }

    function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
        return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
    }

    instance = {
        getServerURLFromMessage: getServerURLFromMessage,
        getHTTPMethod: getHTTPMethod,
        getResponseType: getResponseType,
        getLicenseMessage: getLicenseMessage,
        getErrorResponse: getErrorResponse
    };

    return instance;
}

ClearKey.__dashjs_factory_name = 'ClearKey';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(ClearKey);
/* jshint ignore:line */
module.exports = exports['default'];

},{"21":21,"23":23}],18:[function(_dereq_,module,exports){
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

/**
 * CastLabs DRMToday License Server implementation
 *
 * @implements LicenseServer
 * @class
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _constantsProtectionConstants = _dereq_(3);

var _constantsProtectionConstants2 = _interopRequireDefault(_constantsProtectionConstants);

function DRMToday(config) {

    config = config || {};
    var BASE64 = config.BASE64;

    var keySystems = {};
    keySystems[_constantsProtectionConstants2['default'].WIDEVINE_KEYSTEM_STRING] = {
        responseType: 'json',
        getLicenseMessage: function getLicenseMessage(response) {
            return BASE64.decodeArray(response.license);
        },
        getErrorResponse: function getErrorResponse(response) {
            return response;
        }
    };
    keySystems[_constantsProtectionConstants2['default'].PLAYREADY_KEYSTEM_STRING] = {
        responseType: 'arraybuffer',
        getLicenseMessage: function getLicenseMessage(response) {
            return response;
        },
        getErrorResponse: function getErrorResponse(response) {
            return String.fromCharCode.apply(null, new Uint8Array(response));
        }
    };

    var instance = undefined;

    function checkConfig() {
        if (!BASE64 || !BASE64.hasOwnProperty('decodeArray')) {
            throw new Error('Missing config parameter(s)');
        }
    }

    function getServerURLFromMessage(url /*, message, messageType*/) {
        return url;
    }

    function getHTTPMethod() /*messageType*/{
        return 'POST';
    }

    function getResponseType(keySystemStr /*, messageType*/) {
        return keySystems[keySystemStr].responseType;
    }

    function getLicenseMessage(serverResponse, keySystemStr /*, messageType*/) {
        checkConfig();
        return keySystems[keySystemStr].getLicenseMessage(serverResponse);
    }

    function getErrorResponse(serverResponse, keySystemStr /*, messageType*/) {
        return keySystems[keySystemStr].getErrorResponse(serverResponse);
    }

    instance = {
        getServerURLFromMessage: getServerURLFromMessage,
        getHTTPMethod: getHTTPMethod,
        getResponseType: getResponseType,
        getLicenseMessage: getLicenseMessage,
        getErrorResponse: getErrorResponse
    };

    return instance;
}

DRMToday.__dashjs_factory_name = 'DRMToday';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(DRMToday);
/* jshint ignore:line */
module.exports = exports['default'];

},{"3":3}],19:[function(_dereq_,module,exports){
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

/* global escape: true */

/**
 * Microsoft PlayReady Test License Server
 *
 * For testing content that uses the PlayReady test server at
 *
 * @implements LicenseServer
 * @class
 * @ignore
 */

'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
function PlayReady() {

    var instance = undefined;

    var soap = 'http://schemas.xmlsoap.org/soap/envelope/';

    function uintToString(arrayBuffer) {
        var encodedString = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
        var decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;
    }

    function parseServerResponse(serverResponse) {
        if (window.DOMParser) {
            var stringResponse = uintToString(serverResponse);
            var parser = new window.DOMParser();
            var xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
            var envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
            var body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
            var fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;

            if (fault) {
                return null;
            }
        }
        return serverResponse;
    }

    function parseErrorResponse(serverResponse) {
        var faultstring = '';
        var statusCode = '';
        var message = '';
        var idStart = -1;
        var idEnd = -1;

        if (window.DOMParser) {
            var stringResponse = uintToString(serverResponse);
            var parser = new window.DOMParser();
            var xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
            var envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
            var body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
            var fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;
            var detail = fault ? fault.getElementsByTagName('detail')[0] : null;
            var exception = detail ? detail.getElementsByTagName('Exception')[0] : null;
            var node = null;

            if (fault === null) {
                return stringResponse;
            }

            node = fault.getElementsByTagName('faultstring')[0].firstChild;
            faultstring = node ? node.nodeValue : null;

            if (exception !== null) {
                node = exception.getElementsByTagName('StatusCode')[0];
                statusCode = node ? node.firstChild.nodeValue : null;
                node = exception.getElementsByTagName('Message')[0];
                message = node ? node.firstChild.nodeValue : null;
                idStart = message ? message.lastIndexOf('[') + 1 : -1;
                idEnd = message ? message.indexOf(']') : -1;
                message = message ? message.substring(idStart, idEnd) : '';
            }
        }

        var errorString = 'code: ' + statusCode + ', name: ' + faultstring;
        if (message) {
            errorString += ', message: ' + message;
        }

        return errorString;
    }

    function getServerURLFromMessage(url /*, message, messageType*/) {
        return url;
    }

    function getHTTPMethod() /*messageType*/{
        return 'POST';
    }

    function getResponseType() /*keySystemStr, messageType*/{
        return 'arraybuffer';
    }

    function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
        return parseServerResponse.call(this, serverResponse);
    }

    function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
        return parseErrorResponse.call(this, serverResponse);
    }

    instance = {
        getServerURLFromMessage: getServerURLFromMessage,
        getHTTPMethod: getHTTPMethod,
        getResponseType: getResponseType,
        getLicenseMessage: getLicenseMessage,
        getErrorResponse: getErrorResponse
    };

    return instance;
}

PlayReady.__dashjs_factory_name = 'PlayReady';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(PlayReady);
/* jshint ignore:line */
module.exports = exports['default'];

},{}],20:[function(_dereq_,module,exports){
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

/**
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
function Widevine() {

    var instance = undefined;

    function getServerURLFromMessage(url /*, message, messageType*/) {
        return url;
    }

    function getHTTPMethod() /*messageType*/{
        return 'POST';
    }

    function getResponseType() /*keySystemStr, messageType*/{
        return 'arraybuffer';
    }

    function getLicenseMessage(serverResponse /*, keySystemStr, messageType*/) {
        return serverResponse;
    }

    function getErrorResponse(serverResponse /*, keySystemStr, messageType*/) {
        return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
    }

    instance = {
        getServerURLFromMessage: getServerURLFromMessage,
        getHTTPMethod: getHTTPMethod,
        getResponseType: getResponseType,
        getLicenseMessage: getLicenseMessage,
        getErrorResponse: getErrorResponse
    };

    return instance;
}

Widevine.__dashjs_factory_name = 'Widevine';
exports['default'] = dashjs.FactoryMaker.getSingletonFactory(Widevine);
/* jshint ignore:line */
module.exports = exports['default'];

},{}],21:[function(_dereq_,module,exports){
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

/**
 * @classdesc A collection of ClearKey encryption keys with an (optional) associated
 *  type
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var ClearKeyKeySet = (function () {
    /**
     * @param {Array.<KeyPair>} keyPairs
     * @param {string} type the type of keys in this set.  One of either 'persistent'
     * or 'temporary'.  Can also be null or undefined.
     * @class
     * @ignore
     */

    function ClearKeyKeySet(keyPairs, type) {
        _classCallCheck(this, ClearKeyKeySet);

        if (type && type !== 'persistent' && type !== 'temporary') throw new Error('Invalid ClearKey key set type!  Must be one of \'persistent\' or \'temporary\'');
        this.keyPairs = keyPairs;
        this.type = type;
    }

    /**
     * Convert this key set to its JSON Web Key (JWK) representation
     *
     * @return {ArrayBuffer} JWK object UTF-8 encoded as ArrayBuffer
     */

    _createClass(ClearKeyKeySet, [{
        key: 'toJWK',
        value: function toJWK() {
            var i = undefined;
            var numKeys = this.keyPairs.length;
            var jwk = { keys: [] };

            for (i = 0; i < numKeys; i++) {
                var key = {
                    kty: 'oct',
                    alg: 'A128KW',
                    kid: this.keyPairs[i].keyID,
                    k: this.keyPairs[i].key
                };
                jwk.keys.push(key);
            }
            if (this.type) {
                jwk.type = this.type;
            }
            var jwkString = JSON.stringify(jwk);
            var len = jwkString.length;

            // Convert JSON string to ArrayBuffer
            var buf = new ArrayBuffer(len);
            var bView = new Uint8Array(buf);
            for (i = 0; i < len; i++) bView[i] = jwkString.charCodeAt(i);
            return buf;
        }
    }]);

    return ClearKeyKeySet;
})();

exports['default'] = ClearKeyKeySet;
module.exports = exports['default'];

},{}],22:[function(_dereq_,module,exports){
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
/**
 * @classdesc EME-independent KeyMessage
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var KeyMessage =
/**
 * @param {SessionToken} sessionToken the session
 * to which the key message is associated
 * @param {ArrayBuffer} message the key message
 * @param {string} defaultURL license acquisition URL provided by the CDM
 * @param {string} messageType Supported message types can be found
 * {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @class
 */
function KeyMessage(sessionToken, message, defaultURL, messageType) {
  _classCallCheck(this, KeyMessage);

  this.sessionToken = sessionToken;
  this.message = message;
  this.defaultURL = defaultURL;
  this.messageType = messageType ? messageType : 'license-request';
};

exports['default'] = KeyMessage;
module.exports = exports['default'];

},{}],23:[function(_dereq_,module,exports){
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
/**
 * @classdesc Represents a 128-bit keyID and 128-bit encryption key
 * @ignore
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KeyPair =
/**
 * @param {string} keyID 128-bit key ID, base64 encoded, with no padding
 * @param {string} key 128-bit encryption key, base64 encoded, with no padding
 * @class
 * @ignore
 */
function KeyPair(keyID, key) {
  _classCallCheck(this, KeyPair);

  this.keyID = keyID;
  this.key = key;
};

exports["default"] = KeyPair;
module.exports = exports["default"];

},{}],24:[function(_dereq_,module,exports){
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
/**
 * @classdesc Creates a new key system access token.  Represents a valid key system for
 * given piece of content and key system requirements.  Used to initialize license
 * acquisition operations.
 * @ignore
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var KeySystemAccess =
/**
 * @param {MediaPlayer.dependencies.protection.KeySystem} keySystem the key system
 * @param {KeySystemConfiguration} ksConfiguration the
 * subset of configurations passed to the key system access request that are supported
 * by this user agent
 * @class
 * @ignore
 */
function KeySystemAccess(keySystem, ksConfiguration) {
  _classCallCheck(this, KeySystemAccess);

  this.keySystem = keySystem;
  this.ksConfiguration = ksConfiguration;
};

exports["default"] = KeySystemAccess;
module.exports = exports["default"];

},{}],25:[function(_dereq_,module,exports){
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

/**
 * @classdesc Represents a set of configurations that describe the capabilities desired for
 *  support by a given CDM
 * @ignore
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var KeySystemConfiguration =
/**
 * @param {Array.<MediaCapability>} audioCapabilities array of
 * desired audio capabilities.  Higher preference capabilities should be placed earlier
 * in the array.
 * @param {Array.<MediaCapability>} videoCapabilities array of
 * desired video capabilities.  Higher preference capabilities should be placed earlier
 * in the array.
 * @param {string} distinctiveIdentifier desired use of distinctive identifiers.
 * One of "required", "optional", or "not-allowed"
 * @param {string} persistentState desired support for persistent storage of
 * key systems.  One of "required", "optional", or "not-allowed"
 * @param {Array.<string>} sessionTypes List of session types that must
 * be supported by the key system
 * @class
 */
function KeySystemConfiguration(audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState, sessionTypes) {
    _classCallCheck(this, KeySystemConfiguration);

    this.initDataTypes = ['cenc'];
    if (audioCapabilities && audioCapabilities.length) {
        this.audioCapabilities = audioCapabilities;
    }
    if (videoCapabilities && videoCapabilities.length) {
        this.videoCapabilities = videoCapabilities;
    }
    this.distinctiveIdentifier = distinctiveIdentifier;
    this.persistentState = persistentState;
    this.sessionTypes = sessionTypes;
};

exports['default'] = KeySystemConfiguration;
module.exports = exports['default'];

},{}],26:[function(_dereq_,module,exports){
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
/**
 * @classdesc A media capability
 * @ignore
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MediaCapability =
/**
 * @param {string} contentType MIME type and codecs (RFC6386)
 * @param {string} robustness
 * @class
 * @ignore
 */
function MediaCapability(contentType, robustness) {
  _classCallCheck(this, MediaCapability);

  this.contentType = contentType;
  this.robustness = robustness;
};

exports["default"] = MediaCapability;
module.exports = exports["default"];

},{}],27:[function(_dereq_,module,exports){
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
/**
 * @classdesc NeedKey
 * @ignore
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var NeedKey =
/**
 * @param {ArrayBuffer} initData the initialization data
 * @param {string} initDataType initialization data type
 * @class
 */
function NeedKey(initData, initDataType) {
  _classCallCheck(this, NeedKey);

  this.initData = initData;
  this.initDataType = initDataType;
};

exports["default"] = NeedKey;
module.exports = exports["default"];

},{}],28:[function(_dereq_,module,exports){
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
/**
 * @class
 * @ignore
 */
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var DashJSError = function DashJSError(code, message, data) {
  _classCallCheck(this, DashJSError);

  this.code = code || null;
  this.message = message || null;
  this.data = data || null;
};

exports["default"] = DashJSError;
module.exports = exports["default"];

},{}]},{},[5])(5)
});
//# sourceMappingURL=dash.protection.debug.js.map
