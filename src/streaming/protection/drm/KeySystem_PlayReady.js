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

MediaPlayer.dependencies.protection.KeySystem_PlayReady = function() {
    "use strict";

    var keySystemStr = "com.microsoft.playready",
        keySystemUUID = "9a04f079-9840-4286-ab92-e65be0885f95",

        getRequestHeaders = function(message) {
            var msg,
                xmlDoc,
                headers = {},
                parser = new DOMParser();

            msg = String.fromCharCode.apply(null, new Uint16Array(message.buffer));
            xmlDoc = parser.parseFromString(msg, "application/xml");

            var headerNameList = xmlDoc.getElementsByTagName("name");
            var headerValueList = xmlDoc.getElementsByTagName("value");
            for (var i = 0; i < headerNameList.length; i++) {
                headers[headerNameList[i].childNodes[0].nodeValue] = headerValueList[i].childNodes[0].nodeValue;
            }
            return headers;
        },

        getLicenseRequest = function(message) {
            var msg,
                xmlDoc,
                parser = new DOMParser(),
                licenseRequest = null;

            msg = String.fromCharCode.apply(null, new Uint16Array(message.buffer));
            xmlDoc = parser.parseFromString(msg, "application/xml");

            if (xmlDoc.getElementsByTagName("Challenge")[0]) {
                var Challenge = xmlDoc.getElementsByTagName("Challenge")[0].childNodes[0].nodeValue;
                if (Challenge) {
                    licenseRequest = BASE64.decode(Challenge);
                }
            }
            return licenseRequest;
        },

        parseInitDataFromContentProtection = function(cpData) {
            // * desc@ getInitData
            // *   generate PSSH data from PROHeader defined in MPD file
            // *   PSSH format:
            // *   size (4)
            // *   box type(PSSH) (8)
            // *   Protection SystemID (16)
            // *   protection system data size (4) - length of decoded PROHeader
            // *   decoded PROHeader data from MPD file
            var byteCursor = 0,
                PROSize,
                PSSHSize,
                PSSHBoxType = new Uint8Array([0x70, 0x73, 0x73, 0x68, 0x00, 0x00, 0x00, 0x00 ]), //'PSSH' 8 bytes
                playreadySystemID = new Uint8Array([0x9a, 0x04, 0xf0, 0x79, 0x98, 0x40, 0x42, 0x86, 0xab, 0x92, 0xe6, 0x5b, 0xe0, 0x88, 0x5f, 0x95]),
                uint8arraydecodedPROHeader = null,
                PSSHBoxBuffer,
                PSSHBox,
                PSSHData;

            // Handle common encryption PSSH
            if ("pssh" in cpData) {
                return MediaPlayer.dependencies.protection.CommonEncryption.parseInitDataFromContentProtection(cpData);
            }
            // Handle native MS PlayReady ContentProtection elements
            if ("pro" in cpData) {
                uint8arraydecodedPROHeader = BASE64.decodeArray(cpData.pro.__text);
            }
            else if ("prheader" in cpData) {
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
        };

    return {

        schemeIdURI: "urn:uuid:" + keySystemUUID,
        systemString: keySystemStr,
        uuid: keySystemUUID,

        getInitData: parseInitDataFromContentProtection,

        getRequestHeadersFromMessage: getRequestHeaders,

        getLicenseRequestFromMessage: getLicenseRequest
    };
};

MediaPlayer.dependencies.protection.KeySystem_PlayReady.prototype = {
    constructor: MediaPlayer.dependencies.protection.KeySystem_PlayReady
};

