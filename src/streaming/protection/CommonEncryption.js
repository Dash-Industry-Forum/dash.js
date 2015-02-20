/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014-2015, Cable Television Laboratories, Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Cable Television Laboratories, Inc. nor the names of its
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

MediaPlayer.dependencies.protection.CommonEncryption = {

    /**
     * Find and return the ContentProtection element in the given array
     * that indicates support for MPEG Common Encryption
     *
     * @param cpArray array of content protection elements
     * @returns the Common Encryption content protection element or
     * null if one was not found
     */
    findCencContentProtection: function(cpArray) {
        var retVal = null;
        for (var i = 0; i < cpArray.length; ++i) {
            var cp = cpArray[i];
            if (cp.schemeIdUri.toLowerCase() === "urn:mpeg:dash:mp4protection:2011" &&
                    cp.value.toLowerCase() === "cenc")
                retVal = cp;
        }
        return retVal;
    },

    /**
     * Returns just the data portion of a single PSSH
     *
     * @param pssh {Uint8Array} the PSSH
     * @return {Uint8Array} data portion of the PSSH
     */
    getPSSHData: function(pssh) {
        // Data begins 32 bytes into the box
        return new Uint8Array(pssh.buffer.slice(32));
    },

    /**
     * Returns the PSSH associated with the given key system from the concatenated
     * list of PSSH boxes in the given initData
     *
     * @param {MediaPlayer.dependencies.protection.KeySystem} keySystem the desired
     * key system
     * @param {ArrayBuffer} initData 'cenc' initialization data.  Concatenated list of PSSH.
     * @returns {Uint8Array} The PSSH box data corresponding to the given key system
     * or null if a valid association could not be found.
     */
    getPSSHForKeySystem: function(keySystem, initData) {
        var psshList = MediaPlayer.dependencies.protection.CommonEncryption.parsePSSHList(initData);
        if (psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
            return psshList[keySystem.uuid.toLowerCase()];
        }
        return null;
    },

    /**
     * Parses list of PSSH boxes into keysystem-specific PSSH data
     *
     * @param data {ArrayBuffer} the concatenated list of PSSH boxes as provided by
     * CDM as initialization data when CommonEncryption content is detected
     * @returns {object} an object that has a property named according to each of
     * the detected key system UUIDs (e.g. 00000000-0000-0000-0000-0000000000)
     * and a Uint8Array (the entire PSSH box) as the property value
     */
    parsePSSHList: function(data) {

        if (data === null)
            return [];

        var dv = new DataView(data),
                done = false;
        var pssh = {};

        // TODO: Need to check every data read for end of buffer
        var byteCursor = 0;
        while (!done) {

            var size, nextBox, version,
                    systemID, psshDataSize, boxStart = byteCursor;

            if (byteCursor >= dv.buffer.byteLength)
                break;

            /* Box size */
            size = dv.getUint32(byteCursor);
            nextBox = byteCursor + size;
            byteCursor += 4;

            /* Verify PSSH */
            if (dv.getUint32(byteCursor) !== 0x70737368) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 4;

            /* Version must be 0 for now */
            version = dv.getUint8(byteCursor);
            if (version !== 0) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor += 1;

            byteCursor += 3; /* skip flags */

            // 16-byte UUID/SystemID
            systemID = "";
            var i, val;
            for (i = 0; i < 4; i++) {
                val = dv.getUint8(byteCursor+i).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor+=4;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor+i).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor+=2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor+i).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor+=2;
            systemID += "-";
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor+i).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor+=2;
            systemID += "-";
            for (i = 0; i < 6; i++) {
                val = dv.getUint8(byteCursor+i).toString(16);
                systemID += (val.length === 1) ? "0" + val : val;
            }
            byteCursor+=6;

            systemID = systemID.toLowerCase();

            /* PSSH Data Size */
            psshDataSize = dv.getUint32(byteCursor);
            byteCursor += 4;

            /* PSSH Data */
            pssh[systemID] = new Uint8Array(dv.buffer.slice(boxStart, nextBox));
            byteCursor = nextBox;
        }

        return pssh;
    }
};