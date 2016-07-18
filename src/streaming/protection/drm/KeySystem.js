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
 * Defines the public interface for all Key Systems (DRMs) supported
 * by the player.
 *
 * @interface KeySystem
 */

/**
 * Key system name string (e.g. 'org.w3.clearkey')
 *
 * @instance
 * @name systemString
 * @memberof KeySystem
 * @readonly
 * @type String
 */

/**
 * Key system UUID in the form '01234567-89ab-cdef-0123-456789abcdef'
 *
 * @instance
 * @name uuid
 * @memberof KeySystem
 * @readonly
 * @type String
 */

/**
 * The scheme ID URI for this key system in the form
 * 'urn:uuid:01234567-89ab-cdef-0123-456789abcdef' as used
 * in DASH ContentProtection elements
 *
 * @instance
 * @name schemeIdURI
 * @memberof KeySystem
 * @readonly
 * @type String
 */

/**
 * Parse DRM-specific init data from the ContentProtection
 * element.
 *
 * @function
 * @name KeySystem#getInitData
 * @param {Object} contentProtection the json-style contentProtection
 * object representing the ContentProtection element parsed from the
 * MPD XML document.
 * @returns {ArrayBuffer} EME initialization data
 */

/**
 * For some key systems, the CDM message contains HTTP headers that
 * can be parsed by the application and attached to the license request.
 * Returns a header object with key/value pairs as object properties/values
 *
 * @function
 * @name KeySystem#getRequestHeadersFromMessage
 * @param {ArrayBuffer} message the CDM message
 * @returns {?Object} headers object with header names as the object property
 * names and header values as the corresponding object property values.  Return
 * null if no such headers were found or if the mechanism is not supported by
 * this key system
 */

/**
 * For some key systems, the CDM message contains more than just the
 * license request data.  This method will pull the license request from
 * the CDM message, if necessary.
 *
 * @function
 * @name KeySystem#getLicenseRequestFromMessage
 * @param message {ArrayBuffer} the CDM message
 * @returns {Uint8Array} the license request message as will be passed to
 * XMLHttpRequest.send()
 */

/**
 * Returns a license server URL as parsed from key system initialization data (PSSH).
 *
 * @function
 * @name KeySystem#getLicenseServerURLFromInitData
 * @param initData {ArrayBuffer} the initialization data.  This is just the "Data" field
 * from the PSSH box definition
 * @returns {?string} The license server URL or null if URL is not available in initData
 */