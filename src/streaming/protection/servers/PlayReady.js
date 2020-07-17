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

function PlayReady() {

    let instance;

    const soap = 'http://schemas.xmlsoap.org/soap/envelope/';

    function uintToString(arrayBuffer) {
        const encodedString = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer));
        const decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;
    }

    function parseServerResponse(serverResponse) {
        if (window.DOMParser) {
            const stringResponse = uintToString(serverResponse);
            const parser = new window.DOMParser();
            const xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
            const envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
            const body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
            const fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;

            if (fault) {
                return null;
            }
        }
        return serverResponse;
    }

    function parseErrorResponse(serverResponse) {
        let faultstring = '';
        let statusCode = '';
        let message = '';
        let idStart = -1;
        let idEnd = -1;

        if (window.DOMParser) {
            const stringResponse = uintToString(serverResponse);
            const parser = new window.DOMParser();
            const xmlDoc = parser.parseFromString(stringResponse, 'text/xml');
            const envelope = xmlDoc ? xmlDoc.getElementsByTagNameNS(soap, 'Envelope')[0] : null;
            const body = envelope ? envelope.getElementsByTagNameNS(soap, 'Body')[0] : null;
            const fault = body ? body.getElementsByTagNameNS(soap, 'Fault')[0] : null;
            const detail = fault ? fault.getElementsByTagName('detail')[0] : null;
            const exception = detail ? detail.getElementsByTagName('Exception')[0] : null;
            let node = null;

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

        let errorString = `code: ${statusCode}, name: ${faultstring}`;
        if (message) {
            errorString += `, message: ${message}`;
        }

        return errorString;
    }

    function getServerURLFromMessage(url /*, message, messageType*/) {
        return url;
    }

    function getHTTPMethod(/*messageType*/) {
        return 'POST';
    }

    function getResponseType(/*keySystemStr, messageType*/) {
        return 'arraybuffer';
    }

    function getLicenseMessage(serverResponse/*, keySystemStr, messageType*/) {
        return parseServerResponse.call(this, serverResponse);
    }

    function getErrorResponse(serverResponse/*, keySystemStr, messageType*/) {
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
export default dashjs.FactoryMaker.getSingletonFactory(PlayReady); /* jshint ignore:line */