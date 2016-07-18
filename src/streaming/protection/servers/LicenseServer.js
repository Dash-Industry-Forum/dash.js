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
 * Defines the public interface for license server implementations supported
 * by the player.
 *
 * Different license servers have different requirements regarding the methods
 * used to request DRM licenses.  Things like request headers, license response
 * formats (for both error and success cases) need to be customized for a
 * specific server implementation
 *
 * License servers handle requests for more than just initial license retrieval.
 * Each API takes a parameter which describes the message type as supported by
 * the Encrypted Media Extensions.
 *
 * @interface
 */


/**
 * Returns a new or updated license server URL based on the requirements of the
 * license server and possibly from information passed in the CDM license message
 *
 * @function
 * @name LicenseServer#getServerURLFromMessage
 * @param {?string} url the initially established URL (from ProtectionData or initData)
 * @param {ArrayBuffer} message the CDM message which may be needed to generate the license
 * requests URL
 * @param {string} messageType the message type associated with this request.  Supported
 * message types can be found {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @returns {string} the URL to use in license requests
 */

/**
 * Returns the HTTP method to be used (i.e. "GET", "POST", etc.) in
 * XMLHttpRequest.open().
 *
 * @function
 * @name LicenseServer#getHTTPMethod
 * @param {string} messageType the message type associated with this request.  Supported
 * message types can be found {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @returns {string} the HTTP method
 */

/**
 * Returns the response type to set for XMLHttpRequest.responseType
 *
 * @function
 * @name LicenseServer#getResponseType
 * @param {string} keySystemStr the key system string representing the key system
 * associated with a license request.  Multi-DRM license servers may have different
 * response types depending on the key system.
 * @param {string} messageType the message type associated with this request.  Supported
 * message types can be found {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @returns {string} the response type
 */

/**
 * Parses the license server response for any message intended for
 * the CDM.
 *
 * @function
 * @name LicenseServer#getLicenseMessage
 * @param {Object} serverResponse the response as returned in XMLHttpRequest.response
 * @param {string} keySystemStr the key system string representing the key system
 * associated with a license request.
 * @param {string} messageType the message type associated with this request.  Supported
 * message types can be found {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @returns {ArrayBuffer} message that will be sent to the CDM or null if no CDM message
 * was present in the response.
 */

/**
 * Parses the license server response during error conditions and returns a
 * string to display for debugging purposes
 *
 * @function
 * @name LicenseServer#getErrorResponse
 * @param {Object} serverResponse the server response
 * @param {string} messageType the message type associated with this request.  Supported
 * message types can be found {@link https://w3c.github.io/encrypted-media/#idl-def-MediaKeyMessageType|here}.
 * @returns {string} an error message that indicates the reason for the failure
 */
