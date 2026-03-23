/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2026, Dash Industry Forum.
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

import FactoryMaker from '../../../core/FactoryMaker.js';

/**
 * @ignore
 */
function FairPlay() {

    let instance;

    function getServerURLFromMessage(url /*, message, messageType*/) {
        return url;
    }

    function getHTTPMethod(/*messageType*/) {
        return 'POST';
    }

    function getResponseType(/*keySystemStr, messageType*/) {
        return 'arraybuffer';
    }

    /**
     * FairPlay license servers may return the CKC in various formats:
     * - Raw binary CKC (ideal, pass through)
     * - Base64-encoded CKC as text
     * - XML-wrapped: <ckc>base64</ckc>
     * - JSON-wrapped: {"ckc": "base64"} or {"CkcMessage": "base64"} or {"License": "base64"}
     *
     * This function detects text-based formats and decodes the base64 CKC.
     */
    function getLicenseMessage(serverResponse/*, keySystemStr, messageType*/) {
        if (!serverResponse || !serverResponse.byteLength) {
            return serverResponse;
        }

        // Try to interpret as text
        let responseText;
        try {
            responseText = String.fromCharCode.apply(null, new Uint8Array(serverResponse));
        } catch (e) {
            // Large responses may fail with apply(); use iterative approach
            const bytes = new Uint8Array(serverResponse);
            let str = '';
            for (let i = 0; i < bytes.length; i++) {
                str += String.fromCharCode(bytes[i]);
            }
            responseText = str;
        }

        if (!responseText) {
            return serverResponse;
        }

        responseText = responseText.trim();

        // Check for <ckc> XML wrapper
        if (responseText.substr(0, 5) === '<ckc>' && responseText.substr(-6) === '</ckc>') {
            return _base64DecodeToArrayBuffer(responseText.slice(5, -6));
        }

        // Check for JSON wrapper
        try {
            const obj = JSON.parse(responseText);
            const ckc = obj['ckc'] || obj['CkcMessage'] || obj['License'];
            if (ckc) {
                return _base64DecodeToArrayBuffer(ckc);
            }
        } catch (e) {
            // Not JSON
        }

        // Check if the entire response looks like base64 (no binary bytes, valid chars)
        if (/^[A-Za-z0-9+/\r\n]+=*$/.test(responseText) && responseText.length > 0) {
            return _base64DecodeToArrayBuffer(responseText);
        }

        // Raw binary CKC — pass through
        return serverResponse;
    }

    function _base64DecodeToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function getErrorResponse(serverResponse/*, keySystemStr, messageType*/) {
        return String.fromCharCode.apply(null, new Uint8Array(serverResponse));
    }

    instance = {
        getErrorResponse,
        getHTTPMethod,
        getLicenseMessage,
        getResponseType,
        getServerURLFromMessage,
    };

    return instance;
}

FairPlay.__dashjs_factory_name = 'FairPlay';
export default FactoryMaker.getSingletonFactory(FairPlay);
