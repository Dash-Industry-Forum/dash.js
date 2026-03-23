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
 * @classdesc Data provided for a particular piece of content to customize license server URLs,
 *  license server HTTP request headers, clearkeys, or other content-specific data.
 *  In practice protData objects are plain objects passed by the application; this class
 *  serves as documentation and as a canonical reference for all supported properties.
 * @ignore
 */
class ProtectionData {
    /**
     * @param {Object} [config={}] configuration object
     * @param {string|Object} [config.serverURL] a license server URL to use with this key system.
     * When specified as a string, a single URL will be used regardless of message type.
     * When specified as an object, the object will have property names for each message
     * type ({@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|message
     * types defined here)} with the corresponding property value being the URL to use for
     * messages of that type
     * @param {Object} [config.httpRequestHeaders] headers to add to the license request
     * @param {Object} [config.clearkeys] defines a set of clear keys that are available to
     * the key system.  Object properties are base64-encoded keyIDs (with no padding).
     * Corresponding property values are keys, base64-encoded (no padding).
     * @param {number} [config.priority] priority order of the key system (0 is highest, -1 for undefined)
     * @param {string} [config.serverCertificate] Base64 string representation of the server certificate
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeys-setservercertificate})
     * @param {string} [config.audioRobustness] audio robustness level
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-robustness})
     * @param {string} [config.videoRobustness] video robustness level
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemmediacapability-robustness})
     * @param {string} [config.distinctiveIdentifier] distinctive identifier requirement: "required", "optional", or "not-allowed"
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-distinctiveidentifier})
     * @param {string} [config.persistentState] persistent state requirement: "required", "optional", or "not-allowed"
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-persistentstate})
     * @param {string} [config.sessionType] the session type: "temporary" or "persistent-license"
     * (see {@link https://www.w3.org/TR/encrypted-media/#dom-mediakeysessiontype})
     * @param {string} [config.sessionId] session id for reusing an existing key session
     * (see {@link https://www.w3.org/TR/encrypted-media/#session-id})
     * @param {boolean} [config.withCredentials] whether license requests are made using credentials
     * @param {number} [config.httpTimeout] timeout in milliseconds for license requests
     * @param {Array} [config.certUrls] array of server certificate URLs
     * @param {string} [config.cdmData] CDM-specific data passed during key system access request
     * @param {string} [config.laURL] legacy/alternative license acquisition URL
     * @param {boolean} [config.drmtoday] flag indicating DRMToday vendor-specific handling
     * @param {Array.<string>} [config.systemStringPriority] preferred key system string ordering
     * @param {Array.<string>} [config.initDataTypes] initialization data types (e.g. "cenc", "sinf")
     * @class
     */
    constructor(config = {}) {
        this.serverURL = config.serverURL || null;
        this.httpRequestHeaders = config.httpRequestHeaders || null;
        this.clearkeys = config.clearkeys || null;
        this.priority = config.priority !== undefined ? config.priority : -1;
        this.serverCertificate = config.serverCertificate || null;
        this.audioRobustness = config.audioRobustness || '';
        this.videoRobustness = config.videoRobustness || '';
        this.distinctiveIdentifier = config.distinctiveIdentifier || 'optional';
        this.persistentState = config.persistentState || null;
        this.sessionType = config.sessionType || 'temporary';
        this.sessionId = config.sessionId || null;
        this.withCredentials = config.withCredentials || false;
        this.httpTimeout = config.httpTimeout || 0;
        this.certUrls = config.certUrls || null;
        this.cdmData = config.cdmData || null;
        this.laURL = config.laURL || null;
        this.drmtoday = config.drmtoday || false;
        this.systemStringPriority = config.systemStringPriority || null;
        this.initDataTypes = config.initDataTypes || null;
    }
}

/**
 * License server URL. When specified as a string, a single URL is used
 * regardless of message type. When specified as an object, property names
 * correspond to message types and values are the URLs for each type.
 *
 * @instance
 * @type {string|Object}
 * @name ProtectionData.serverURL
 * @memberof ProtectionData
 */

/**
 * HTTP request headers for license requests. Each property name is a
 * header name with its corresponding header value being the property value.
 *
 * @instance
 * @type {Object}
 * @name ProtectionData.httpRequestHeaders
 * @memberof ProtectionData
 */

/**
 * ClearKey key-pairs that can be used to decrypt the content.
 * Object properties are base64-encoded keyIDs (no padding),
 * corresponding values are base64-encoded keys (no padding).
 *
 * @instance
 * @type {Object}
 * @name ProtectionData.clearkeys
 * @memberof ProtectionData
 */

/**
 * Priority order of the key system (0 is the highest priority, -1 for undefined).
 *
 * @instance
 * @type {number}
 * @name ProtectionData.priority
 * @memberof ProtectionData
 */

/**
 * Base64 string representation of the server certificate.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.serverCertificate
 * @memberof ProtectionData
 */

/**
 * Audio robustness level for the key system.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.audioRobustness
 * @memberof ProtectionData
 */

/**
 * Video robustness level for the key system.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.videoRobustness
 * @memberof ProtectionData
 */

/**
 * Distinctive identifier requirement: "required", "optional", or "not-allowed".
 *
 * @instance
 * @type {string}
 * @name ProtectionData.distinctiveIdentifier
 * @memberof ProtectionData
 */

/**
 * Persistent state requirement: "required", "optional", or "not-allowed".
 *
 * @instance
 * @type {string}
 * @name ProtectionData.persistentState
 * @memberof ProtectionData
 */

/**
 * The session type: "temporary" or "persistent-license".
 *
 * @instance
 * @type {string}
 * @name ProtectionData.sessionType
 * @memberof ProtectionData
 */

/**
 * Session id for reusing an existing key session.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.sessionId
 * @memberof ProtectionData
 */

/**
 * Whether license requests are made using credentials.
 *
 * @instance
 * @type {boolean}
 * @name ProtectionData.withCredentials
 * @memberof ProtectionData
 */

/**
 * Timeout in milliseconds for license requests.
 *
 * @instance
 * @type {number}
 * @name ProtectionData.httpTimeout
 * @memberof ProtectionData
 */

/**
 * Array of server certificate URLs.
 *
 * @instance
 * @type {Array}
 * @name ProtectionData.certUrls
 * @memberof ProtectionData
 */

/**
 * CDM-specific data passed during key system access request.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.cdmData
 * @memberof ProtectionData
 */

/**
 * Legacy/alternative license acquisition URL.
 *
 * @instance
 * @type {string}
 * @name ProtectionData.laURL
 * @memberof ProtectionData
 */

/**
 * Flag indicating DRMToday vendor-specific handling.
 *
 * @instance
 * @type {boolean}
 * @name ProtectionData.drmtoday
 * @memberof ProtectionData
 */

/**
 * Preferred key system string ordering.
 *
 * @instance
 * @type {Array.<string>}
 * @name ProtectionData.systemStringPriority
 * @memberof ProtectionData
 */

/**
 * Initialization data types (e.g. "cenc", "sinf").
 *
 * @instance
 * @type {Array.<string>}
 * @name ProtectionData.initDataTypes
 * @memberof ProtectionData
 */

export default ProtectionData;
