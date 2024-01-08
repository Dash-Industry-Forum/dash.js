/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2022, Dash Industry Forum.
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
import FactoryMaker from '../../core/FactoryMaker.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import Debug from '../../core/Debug.js';

// Note: in modern browsers, the header names are returned in all lower case
const CMSD_STATIC = 'static';
const CMSD_DYNAMIC = 'dynamic';
const CMSD_RESPONSE_FIELD_BASENAME = 'cmsd-';
const CMSD_STATIC_RESPONSE_FIELD_NAME = CMSD_RESPONSE_FIELD_BASENAME + CMSD_STATIC;
const CMSD_DYNAMIC_RESPONSE_FIELD_NAME = CMSD_RESPONSE_FIELD_BASENAME + CMSD_DYNAMIC;
const CMSD_KEYS = {
    AVAILABILITY_TIME: 'at',
    DURESS: 'du',
    ENCODED_BITRATE: 'br',
    ESTIMATED_THROUGHPUT: 'etp',
    HELD_TIME: 'ht',
    INTERMEDIARY_IDENTIFIER: 'n',
    MAX_SUGGESTED_BITRATE: 'mb',
    NEXT_OBJECT_RESPONSE: 'nor',
    NEXT_RANGE_RESPONSE: 'nrr',
    OBJECT_DURATION: 'd',
    OBJECT_TYPE: 'ot',
    RESPONSE_DELAY: 'rd',
    ROUND_TRIP_TIME: 'rtt',
    STARTUP: 'su',
    STREAM_TYPE: 'st',
    STREAMING_FORMAT: 'sf',
    VERSION: 'v'
}
const OBJECT_TYPES = {
    MANIFEST: 'm',
    AUDIO: 'a',
    VIDEO: 'v',
    INIT: 'i',
    CAPTION: 'c',
    ISOBMFF_TEXT_TRACK: 'tt',
    ENCRYPTION_KEY: 'k',
    OTHER: 'o',
    STREAM: 'stream' // Specific value for parameters without object type, which apply for all media/objects
};

const PERSISTENT_PARAMS = [
    CMSD_KEYS.MAX_SUGGESTED_BITRATE,
    CMSD_KEYS.STREAM_TYPE,
    CMSD_KEYS.STREAMING_FORMAT,
    CMSD_KEYS.VERSION
];

const MEDIATYPE_TO_OBJECTTYPE = {
    'video': OBJECT_TYPES.VIDEO,
    'audio': OBJECT_TYPES.AUDIO,
    'text': OBJECT_TYPES.ISOBMFF_TEXT_TRACK,
    'stream': OBJECT_TYPES.STREAM
}

const integerRegex = /^[-0-9]/

function CmsdModel() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        _staticParamsDict,
        _dynamicParamsDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function initialize() {}

    function setConfig(/*config*/) {}

    function _resetInitialSettings() {
        _staticParamsDict = {};
        _dynamicParamsDict = {};
    }

    function _clearParams(params) {
        if (!params) {
            return;
        }
        Object.keys(params).forEach(key => {
            if (!PERSISTENT_PARAMS.includes(key)) {
                delete params[key];
            }
        })
    }

    function _parseParameterValue(value) {
        // If the value type is BOOLEAN and the value is TRUE, then the equals sign and the value are omitted
        if (!value) {
            return true;
        }
        // Check if boolean 'false'
        if (value.toLowerCase() === 'false') {
            return false;
        }
        // Check if a number
        if (integerRegex.test(value)) {
            return parseInt(value, 10);
        }
        // Value is a string, remove double quotes from string value
        return value.replace(/["]+/g, '');
    }

    function _parseCMSDStatic(value) {
        try {
            const params = {};
            const items = value.split(',');
            for (let i = 0; i < items.length; i++) {
                // <key>=<value>
                const substrs = items[i].split('=');
                const key = substrs[0];
                const v = _parseParameterValue(substrs[1]);
                params[key] = v;
            }
            return params;
        } catch (e) {
            logger.error('Failed to parse CMSD-Static response header value:', e);
        }
    }

    function _parseCMSDDynamic(value) {
        try {
            const params = {};
            const entries = value.split(',');
            // Consider only last CMSD-Dynamic entry
            const entry = entries[entries.length - 1];
            const items = entry.split(';');
            // Server identifier as 1st item
            for (let i = 1; i < items.length; i++) {
                // <key>=<value>
                const substrs = items[i].split('=');
                const key = substrs[0];
                const v = _parseParameterValue(substrs[1]);
                params[key] = v;
            }
            return params;
        } catch (e) {
            logger.error('Failed to parse CMSD-Dynamic response header value:', e);
            return [];
        }
    }

    function _mediaTypetoObjectType(mediaType) {
        return MEDIATYPE_TO_OBJECTTYPE[mediaType] || OBJECT_TYPES.OTHER;
    }

    function _getParamValueForObjectType(paramsType, ot, key) {
        const params = paramsType === CMSD_STATIC ? _staticParamsDict : _dynamicParamsDict;
        const otParams = params[ot] || {};
        const streamParams = params[OBJECT_TYPES.STREAM] || {};
        const value = otParams[key] || streamParams[key];
        return value;
    }

    function parseResponseHeaders(responseHeaders, mediaType) {
        let staticParams = null;
        let dynamicParams = null;

        // Note: responseHeaders as a record of key:value
        for (const key in responseHeaders) {
            const value = responseHeaders[key];
            switch (key) {
                case CMSD_STATIC_RESPONSE_FIELD_NAME:
                    staticParams = _parseCMSDStatic(value);
                    eventBus.trigger(Events.CMSD_STATIC_HEADER, staticParams);
                    break;
                case CMSD_DYNAMIC_RESPONSE_FIELD_NAME:
                    if (!dynamicParams) {
                        dynamicParams = _parseCMSDDynamic(value);
                    }
                    break;
                default:
                    break;
            }
        }

        // Get object type
        let ot = OBJECT_TYPES.STREAM;
        if (staticParams && staticParams[CMSD_KEYS.OBJECT_TYPE]) {
            ot = staticParams[CMSD_KEYS.OBJECT_TYPE];
        } else if (mediaType) {
            ot = _mediaTypetoObjectType(mediaType)
        }

        // Clear previously received params except persistent ones
        _clearParams(_staticParamsDict[ot]);
        _clearParams(_dynamicParamsDict[ot]);

        // Merge params with previously received params
        if (staticParams) {
            _staticParamsDict[ot] = Object.assign(_staticParamsDict[ot] || {}, staticParams);
        }
        if (dynamicParams) {
            _dynamicParamsDict[ot] = Object.assign(_dynamicParamsDict[ot] || {}, dynamicParams);
        }

        return {
            static: staticParams,
            dynamic: dynamicParams
        }
    }

    function getMaxBitrate(type) {
        let ot = _mediaTypetoObjectType(type);
        let mb = _getParamValueForObjectType(CMSD_DYNAMIC, ot, CMSD_KEYS.MAX_SUGGESTED_BITRATE);
        return mb ? mb : -1
    }

    function getEstimatedThroughput(type) {
        let ot = _mediaTypetoObjectType(type);
        let etp = _getParamValueForObjectType(CMSD_DYNAMIC, ot, CMSD_KEYS.ESTIMATED_THROUGHPUT);
        return etp ? etp : null
    }

    function getResponseDelay(type) {
        let ot = _mediaTypetoObjectType(type);
        let rd = _getParamValueForObjectType(CMSD_DYNAMIC, ot, CMSD_KEYS.RESPONSE_DELAY);
        return rd ? rd : null
    }

    function getRoundTripTime(type) {
        let ot = _mediaTypetoObjectType(type);
        let rd = _getParamValueForObjectType(CMSD_DYNAMIC, ot, CMSD_KEYS.ROUND_TRIP_TIME);
        return rd ? rd : null
    }

    function reset() {
        _resetInitialSettings();
    }

    instance = {
        setConfig,
        initialize,
        reset,
        parseResponseHeaders,
        getMaxBitrate,
        getEstimatedThroughput,
        getResponseDelay,
        getRoundTripTime,
    };

    setup();

    return instance;
}

CmsdModel.__dashjs_factory_name = 'CmsdModel';
export default FactoryMaker.getSingletonFactory(CmsdModel);
