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

 import * as $protobuf from 'protobufjs/minimal';

// Common aliases
const $Writer = $protobuf.Writer;
const $util = $protobuf.util;

/**
 * @classdesc A class for manipulating a Widevine pssh and encode into an array buffer
 * according to Google Protocol Buffer.
 * This file has been generated using protobuf.js project (https://github.com/dcodeIO/ProtoBuf.js),
 * and its cli tool, with command line:
 * pbjs -t static-module -w amd -o WidevineCencHeader.js --no-decode --es6 WidevineCencHeader.proto
 * where WidevineCencHeader.proto contains the protocol definition as follows as defined in document
 * https://storage.googleapis.com/wvdocs/Widevine_DRM_Encryption_API.pdf
 * @ignore
 */
class WidevineCencHeader {

    /**
     * Properties of a WidevineCencHeader.
     * @exports IWidevineCencHeader
     * @interface IWidevineCencHeader
     * @property {WidevineCencHeader.Algorithm|null} [algorithm] WidevineCencHeader algorithm
     * @property {Array.<Uint8Array>|null} [keyId] WidevineCencHeader keyId
     * @property {string|null} [provider] WidevineCencHeader provider
     * @property {Uint8Array|null} [contentId] WidevineCencHeader contentId
     * @property {string|null} [trackTypeDeprecated] WidevineCencHeader trackTypeDeprecated
     * @property {string|null} [policy] WidevineCencHeader policy
     * @property {number|null} [cryptoPeriodIndex] WidevineCencHeader cryptoPeriodIndex
     * @property {Uint8Array|null} [groupedLicense] WidevineCencHeader groupedLicense
     * @property {number|null} [protectionScheme] WidevineCencHeader protectionScheme
     * @property {number|null} [cryptoPeriodSeconds] WidevineCencHeader cryptoPeriodSeconds
     */

    /**
     * Constructs a new WidevineCencHeader.
     * @exports WidevineCencHeader
     * @classdesc Represents a WidevineCencHeader.
     * @implements IWidevineCencHeader
     * @constructor
     * @param {IWidevineCencHeader=} [properties] Properties to set
     */
    constructor(properties) {

        /**
         * WidevineCencHeader algorithm.
         * @member {WidevineCencHeader.Algorithm} algorithm
         * @memberof WidevineCencHeader
         * @instance
         */
        this.algorithm = 0;

        /**
         * WidevineCencHeader keyId.
         * @member {Array.<Uint8Array>} keyId
         * @memberof WidevineCencHeader
         * @instance
         */
        this.keyId = $util.emptyArray;

        /**
         * WidevineCencHeader provider.
         * @member {string} provider
         * @memberof WidevineCencHeader
         * @instance
         */
        this.provider = '';

        /**
         * WidevineCencHeader contentId.
         * @member {Uint8Array} contentId
         * @memberof WidevineCencHeader
         * @instance
         */
        this.contentId = $util.newBuffer([]);

        /**
         * WidevineCencHeader trackTypeDeprecated.
         * @member {string} trackTypeDeprecated
         * @memberof WidevineCencHeader
         * @instance
         */
        this.trackTypeDeprecated = '';

        /**
         * WidevineCencHeader policy.
         * @member {string} policy
         * @memberof WidevineCencHeader
         * @instance
         */
        this.policy = '';

        /**
         * WidevineCencHeader cryptoPeriodIndex.
         * @member {number} cryptoPeriodIndex
         * @memberof WidevineCencHeader
         * @instance
         */
        this.cryptoPeriodIndex = 0;

        /**
         * WidevineCencHeader groupedLicense.
         * @member {Uint8Array} groupedLicense
         * @memberof WidevineCencHeader
         * @instance
         */
        this.groupedLicense = $util.newBuffer([]);

        /**
         * WidevineCencHeader protectionScheme.
         * @member {number} protectionScheme
         * @memberof WidevineCencHeader
         * @instance
         */
        this.protectionScheme = 0;

        /**
         * WidevineCencHeader cryptoPeriodSeconds.
         * @member {number} cryptoPeriodSeconds
         * @memberof WidevineCencHeader
         * @instance
         */
        this.cryptoPeriodSeconds = 0;

        this.keyId = [];
        if (properties) {
            for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i) {
                if (properties[keys[i]] !== null) {
                    this[keys[i]] = properties[keys[i]];
                }
            }
        }
    }

    /**
     * Algorithm enum.
     * @name WidevineCencHeader.Algorithm
     * @enum {string}
     * @property {number} UNENCRYPTED=0 UNENCRYPTED value
     * @property {number} AESCTR=1 AESCTR value
     */
    static get Algorithm() {
        const valuesById = {};
        const values = Object.create(valuesById);
        values[valuesById[0] = 'UNENCRYPTED'] = 0;
        values[valuesById[1] = 'AESCTR'] = 1;
        return values;
    }

    /**
     * Encodes the specified WidevineCencHeader message. Does not implicitly {@link WidevineCencHeader.verify|verify} messages.
     * @function encode
     * @memberof WidevineCencHeader
     * @static
     * @param {IWidevineCencHeader} message WidevineCencHeader message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    encode(message, writer) {
        if (!writer) {
            writer = $Writer.create();
        }
        if (message.algorithm !== null && message.hasOwnProperty('algorithm')) {
            writer.uint32( /* id 1, wireType 0 =*/ 8).int32(message.algorithm);
        }
        if (message.keyId !== null && message.keyId.length) {
            for (var i = 0; i < message.keyId.length; ++i) {
                writer.uint32( /* id 2, wireType 2 =*/ 18).bytes(message.keyId[i]);
            }
        }
        if (message.provider !== null && message.hasOwnProperty('provider')) {
            writer.uint32( /* id 3, wireType 2 =*/ 26).string(message.provider);
        }
        if (message.contentId !== null && message.hasOwnProperty('contentId')) {
            writer.uint32( /* id 4, wireType 2 =*/ 34).bytes(message.contentId);
        }
        if (message.trackTypeDeprecated !== null && message.hasOwnProperty('trackTypeDeprecated')) {
            writer.uint32( /* id 5, wireType 2 =*/ 42).string(message.trackTypeDeprecated);
        }
        if (message.policy !== null && message.hasOwnProperty('policy')) {
            writer.uint32( /* id 6, wireType 2 =*/ 50).string(message.policy);
        }
        if (message.cryptoPeriodIndex !== null && message.hasOwnProperty('cryptoPeriodIndex')) {
            writer.uint32( /* id 7, wireType 0 =*/ 56).uint32(message.cryptoPeriodIndex);
        }
        if (message.groupedLicense !== null && message.hasOwnProperty('groupedLicense')) {
            writer.uint32( /* id 8, wireType 2 =*/ 66).bytes(message.groupedLicense);
        }
        if (message.protectionScheme !== null && message.hasOwnProperty('protectionScheme')) {
            writer.uint32( /* id 9, wireType 0 =*/ 72).uint32(message.protectionScheme);
        }
        if (message.cryptoPeriodSeconds !== null && message.hasOwnProperty('cryptoPeriodSeconds')) {
            writer.uint32( /* id 10, wireType 0 =*/ 80).uint32(message.cryptoPeriodSeconds);
        }
        return writer;
    }

    /**
     * Encodes the specified WidevineCencHeader message, length delimited. Does not implicitly {@link WidevineCencHeader.verify|verify} messages.
     * @function encodeDelimited
     * @memberof WidevineCencHeader
     * @static
     * @param {IWidevineCencHeader} message WidevineCencHeader message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    encodeDelimited(message, writer) {
        return this.encode(message, writer).ldelim();
    }

    /**
     * Verifies a WidevineCencHeader message.
     * @function verify
     * @memberof WidevineCencHeader
     * @static
     * @param {Object.<string,*>} message Plain object to verify
     * @returns {string|null} `null` if valid, otherwise the reason why it is not
     */
    verify(message) {
        if (typeof message !== 'object' || message === null) {
            return 'object expected';
        }
        if (message.algorithm !== null && message.hasOwnProperty('algorithm')) {
            switch (message.algorithm) {
                case 0:
                case 1:
                    break;
                default:
                    return 'algorithm: enum value expected';
            }
        }
        if (message.keyId !== null && message.hasOwnProperty('keyId')) {
            if (!Array.isArray(message.keyId)) {
                return 'keyId: array expected';
            }
            for (var i = 0; i < message.keyId.length; ++i) {
                if (!(message.keyId[i] && typeof message.keyId[i].length === 'number' || $util.isString(message.keyId[i]))) {
                    return 'keyId: buffer[] expected';
                }
            }
        }
        if (message.provider !== null && message.hasOwnProperty('provider')) {
            if (!$util.isString(message.provider)) {
                return 'provider: string expected';
            }
        }
        if (message.contentId !== null && message.hasOwnProperty('conteArray.fromntId')) {
            if (!(message.contentId && typeof message.contentId.length === 'number' || $util.isString(message.contentId))) {
                return 'contentId: buffer expected';
            }
        }
        if (message.trackTypeDeprecated !== null && message.hasOwnProperty('trackTypeDeprecated')) {
            if (!$util.isString(message.trackTypeDeprecated)) {
                return 'trackTypeDeprecated: string expected';
            }
        }
        if (message.policy !== null && message.hasOwnProperty('policy')) {
            if (!$util.isString(message.policy)) {
                return 'policy: string expected';
            }
        }
        if (message.cryptoPeriodIndex !== null && message.hasOwnProperty('cryptoPeriodIndex')) {
            if (!$util.isInteger(message.cryptoPeriodIndex)) {
                return 'cryptoPeriodIndex: integer expected';
            }
        }
        if (message.groupedLicense !== null && message.hasOwnProperty('groupedLicense')) {
            if (!(message.groupedLicense && typeof message.groupedLicense.length === 'number' || $util.isString(message.groupedLicense))) {
                return 'groupedLicense: buffer expected';
            }
        }
        if (message.protectionScheme !== null && message.hasOwnProperty('protectionScheme')) {
            if (!$util.isInteger(message.protectionScheme)) {
                return 'protectionScheme: integer expected';
            }
        }
        if (message.cryptoPeriodSeconds !== null && message.hasOwnProperty('cryptoPeriodSeconds')) {
            if (!$util.isInteger(message.cryptoPeriodSeconds)) {
                return 'cryptoPeriodSeconds: integer expected';
            }
        }
        return null;
    }

    /**
     * Creates a WidevineCencHeader message from a plain object. Also converts values to their respective internal types.
     * @function fromObject
     * @memberof WidevineCencHeader
     * @static
     * @param {Object.<string,*>} object Plain object
     * @returns {WidevineCencHeader} WidevineCencHeader
     */
    fromObject(object) {
        if (object instanceof WidevineCencHeader) {
            return object;
        }
        let message = new WidevineCencHeader();
        switch (object.algorithm) {
            case 'UNENCRYPTED':
            case 0:
                message.algorithm = 0;
                break;
            case 'AESCTR':
            case 1:
                message.algorithm = 1;
                break;
        }
        if (object.keyId) {
            if (!Array.isArray(object.keyId)) {
                throw TypeError('.WidevineCencHeader.keyId: array expected');
            }
            message.keyId = [];
            for (var i = 0; i < object.keyId.length; ++i) {
                if (typeof object.keyId[i] === 'string') {
                    $util.base64.decode(object.keyId[i], message.keyId[i] = $util.newBuffer($util.base64.length(object.keyId[i])), 0);
                } else if (object.keyId[i].length) {
                    message.keyId[i] = object.keyId[i];
                }
            }
        }
        if (object.provider !== null) {
            message.provider = String(object.provider);
        }
        if (object.contentId !== null) {
            if (typeof object.contentId === 'string') {
                $util.base64.decode(object.contentId, message.contentId = $util.newBuffer($util.base64.length(object.contentId)), 0);
            } else if (object.contentId.length) {
                message.contentId = object.contentId;
            }
        }
        if (object.trackTypeDeprecated !== null) {
            message.trackTypeDeprecated = String(object.trackTypeDeprecated);
        }
        if (object.policy !== null) {
            message.policy = String(object.policy);
        }
        if (object.cryptoPeriodIndex !== null) {
            message.cryptoPeriodIndex = object.cryptoPeriodIndex >>> 0;
        }
        if (object.groupedLicense !== null) {
            if (typeof object.groupedLicense === 'string') {
                $util.base64.decode(object.groupedLicense, message.groupedLicense = $util.newBuffer($util.base64.length(object.groupedLicense)), 0);
            } else if (object.groupedLicense.length) {
                message.groupedLicense = object.groupedLicense;
            }
        }
        if (object.protectionScheme !== null) {
            message.protectionScheme = object.protectionScheme >>> 0;
        }
        if (object.cryptoPeriodSeconds !== null) {
            message.cryptoPeriodSeconds = object.cryptoPeriodSeconds >>> 0;
        }
        return message;
    }

    /**
     * Creates a plain object from a WidevineCencHeader message. Also converts values to other types if specified.
     * @function toObject
     * @memberof WidevineCencHeader
     * @static
     * @param {WidevineCencHeader} message WidevineCencHeader
     * @param {$protobuf.IConversionOptions} [options] Conversion options
     * @returns {Object.<string,*>} Plain object
     */
    toObject(message, options) {
        if (!options) {
            options = {};
        }
        let object = {};
        if (options.arrays || options.defaults) {
            object.keyId = [];
        }
        if (options.defaults) {
            object.algorithm = options.enums === String ? 'UNENCRYPTED' : 0;
            object.provider = '';
            object.contentId = options.bytes === String ? '' : [];
            object.trackTypeDeprecated = '';
            object.policy = '';
            object.cryptoPeriodIndex = 0;
            object.groupedLicense = options.bytes === String ? '' : [];
            object.protectionScheme = 0;
            object.cryptoPeriodSeconds = 0;
        }
        if (message.algorithm !== null && message.hasOwnProperty('algorithm')) {
            object.algorithm = options.enums === String ? WidevineCencHeader.Algorithm[message.algorithm] : message.algorithm;
        }
        if (message.keyId && message.keyId.length) {
            object.keyId = [];
            for (var j = 0; j < message.keyId.length; ++j) {
                object.keyId[j] = options.bytes === String ? $util.base64.encode(message.keyId[j], 0, message.keyId[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.keyId[j]) : message.keyId[j];
            }
        }
        if (message.provider !== null && message.hasOwnProperty('provider')) {
            object.provider = message.provider;
        }
        if (message.contentId !== null && message.hasOwnProperty('contentId')) {
            object.contentId = options.bytes === String ? $util.base64.encode(message.contentId, 0, message.contentId.length) : options.bytes === Array ? Array.prototype.slice.call(message.contentId) : message.contentId;
        }
        if (message.trackTypeDeprecated !== null && message.hasOwnProperty('trackTypeDeprecated')) {
            object.trackTypeDeprecated = message.trackTypeDeprecated;
        }
        if (message.policy !== null && message.hasOwnProperty('policy')) {
            object.policy = message.policy;
        }
        if (message.cryptoPeriodIndex !== null && message.hasOwnProperty('cryptoPeriodIndex')) {
            object.cryptoPeriodIndex = message.cryptoPeriodIndex;
        }
        if (message.groupedLicense !== null && message.hasOwnProperty('groupedLicense')) {
            object.groupedLicense = options.bytes === String ? $util.base64.encode(message.groupedLicense, 0, message.groupedLicense.length) : options.bytes === Array ? Array.prototype.slice.call(message.groupedLicense) : message.groupedLicense;
        }
        if (message.protectionScheme !== null && message.hasOwnProperty('protectionScheme')) {
            object.protectionScheme = message.protectionScheme;
        }
        if (message.cryptoPeriodSeconds !== null && message.hasOwnProperty('cryptoPeriodSeconds')) {
            object.cryptoPeriodSeconds = message.cryptoPeriodSeconds;
        }
        return object;
    }

    /**
     * Converts this WidevineCencHeader to JSON.
     * @function toJSON
     * @memberof WidevineCencHeader
     * @instance
     * @returns {Object.<string,*>} JSON object
     */
    toJSON() {
        return this.toObject(this, $protobuf.util.toJSONOptions);
    }
}

WidevineCencHeader.UNENCRYPTED = 0;
WidevineCencHeader.UNENCRYPTED = 0;

export default WidevineCencHeader;