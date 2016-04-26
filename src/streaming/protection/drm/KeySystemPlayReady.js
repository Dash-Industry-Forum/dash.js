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
import CommonEncryption from '../CommonEncryption';
import Error from '../../vo/Error';

import FactoryMaker from '../../../core/FactoryMaker';
import BASE64 from '../../../../externals/base64';

const uuid = '9a04f079-9840-4286-ab92-e65be0885f95';
const systemString = 'com.microsoft.playready';
const schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemPlayReady() {

    let instance;
    let messageFormat = 'utf16';

    function getRequestHeadersFromMessage(message) {
        var msg,
            xmlDoc;
        var headers = {};
        var parser = new DOMParser();
        var dataview = (messageFormat === 'utf16') ? new Uint16Array(message) : new Uint8Array(message);

        msg = String.fromCharCode.apply(null, dataview);
        xmlDoc = parser.parseFromString(msg, 'application/xml');

        var headerNameList = xmlDoc.getElementsByTagName('name');
        var headerValueList = xmlDoc.getElementsByTagName('value');
        for (var i = 0; i < headerNameList.length; i++) {
            headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
        }
        // some versions of the PlayReady CDM return 'Content' instead of 'Content-Type'.
        // this is NOT w3c conform and license servers may reject the request!
        // -> rename it to proper w3c definition!
        if (headers.hasOwnProperty('Content')) {
            headers['Content-Type'] = headers.Content;
            delete headers.Content;
        }
        return headers;
    }

    function getLicenseRequestFromMessage(message) {
        var msg,
            xmlDoc;
        var licenseRequest = null;
        var parser = new DOMParser();
        var dataview = (messageFormat === 'utf16') ? new Uint16Array(message) : new Uint8Array(message);

        msg = String.fromCharCode.apply(null, dataview);
        xmlDoc = parser.parseFromString(msg, 'application/xml');

        if (xmlDoc.getElementsByTagName('Challenge')[0]) {
            var Challenge = xmlDoc.getElementsByTagName('Challenge')[0].childNodes[0].nodeValue;
            if (Challenge) {
                licenseRequest = BASE64.decode(Challenge);
            }
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

        var PROSize,
            PSSHSize,
            PSSHBoxBuffer,
            PSSHBox,
            PSSHData;

        // Handle common encryption PSSH
        if ('pssh' in cpData) {
            return CommonEncryption.parseInitDataFromContentProtection(cpData);
        }
        // Handle native MS PlayReady ContentProtection elements
        if ('pro' in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
        }
        else if ('prheader' in cpData) {
            uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.prheader.__text);
        }
        else {
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
     * @param {string} format the expected message format.  Either "utf8" or "utf16".
     * @throws {Error} Specified message format is not one of "utf8" or "utf16"
     */
    function setPlayReadyMessageFormat(format) {
        if (format !== 'utf8' && format !== 'utf16') {
            throw new Error('Illegal PlayReady message format! -- ' + format);
        }
        messageFormat = format;
    }

    instance = {
        uuid: uuid,
        schemeIdURI: schemeIdURI,
        systemString: systemString,
        getInitData: getInitData,
        getRequestHeadersFromMessage: getRequestHeadersFromMessage,
        getLicenseRequestFromMessage: getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData: getLicenseServerURLFromInitData,
        setPlayReadyMessageFormat: setPlayReadyMessageFormat
    };

    return instance;
}

KeySystemPlayReady.__dashjs_factory_name = 'KeySystemPlayReady';
export default FactoryMaker.getSingletonFactory(KeySystemPlayReady);