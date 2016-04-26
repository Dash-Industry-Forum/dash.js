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
 *  license server HTTP request headers, clearkeys, or other content-specific data
 * @ignore
 */
class ProtectionData {
    /**
     * @param {string|Object} serverURL a license server URL to use with this key system.
     * When specified as a string, a single URL will be used regardless of message type.
     * When specified as an object, the object will have property names for each message
     * type ({@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|message
     * types defined here)} with the corresponding property value being the URL to use for
     * messages of that type
     * @param {Object} httpRequestHeaders headers to add to the http request
     * @param {Object} clearkeys defines a set of clear keys that are available to
     * the key system.  Object properties are base64-encoded keyIDs (with no padding).
     * Corresponding property values are keys, base64-encoded (no padding).
     * @class
     */
    constructor(serverURL, httpRequestHeaders, clearkeys) {
        this.serverURL = serverURL;
        this.httpRequestHeaders = httpRequestHeaders;
        this.clearkeys = clearkeys;
    }
}

/**
 * License server URL
 *
 * @instance
 * @type string|Object
 * @name ProtectionData.serverURL
 * @readonly
 * @memberof ProtectionData
 */

/**
 * HTTP Request Headers for use in license requests.  Each property name
 * in the object is a header name with its corresponding header value being
 * the property value
 *
 * @instance
 * @type Object
 * @name ProtectionData.httpRequestsHeaders
 * @readonly
 * @memberof ProtectionData
 */

/**
 * ClearKey key-pairs that can be used to decrypt the content
 *
 * @instance
 * @type Object
 * @name ProtectionData.clearkeys
 * @readonly
 * @memberof ProtectionData
 */

export default ProtectionData;
