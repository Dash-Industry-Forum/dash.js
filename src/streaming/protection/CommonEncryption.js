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
  * @class
  * @ignore
  */
class CommonEncryption {
    /**
     * Find and return the ContentProtection element in the given array
     * that indicates support for MPEG Common Encryption
     *
     * @param {Array} cpArray array of content protection elements
     * @returns {Object|null} the Common Encryption content protection element or
     * null if one was not found
     */
    static findCencContentProtection(cpArray) {
        let retVal = null;
        for (let i = 0; i < cpArray.length; ++i) {
            let cp = cpArray[i];
            if (cp.schemeIdUri.toLowerCase() === 'urn:mpeg:dash:mp4protection:2011' &&
                    cp.value.toLowerCase() === 'cenc')
                retVal = cp;
        }
        return retVal;
    }

    /**
     * Returns just the data portion of a single PSSH
     *
     * @param {ArrayBuffer} pssh - the PSSH
     * @return {ArrayBuffer} data portion of the PSSH
     */
    static getPSSHData(pssh) {
        let offset = 8; // Box size and type fields
        let view = new DataView(pssh);

        // Read version
        let version = view.getUint8(offset);

        offset += 20; // Version (1), flags (3), system ID (16)

        if (version > 0) {
            offset += 4 + (16 * view.getUint32(offset)); // Key ID count (4) and All key IDs (16*count)
        }

        offset += 4; // Data size
        return pssh.slice(offset);
    }

    /**
     * Returns the PSSH associated with the given key system from the concatenated
     * list of PSSH boxes in the given initData
     *
     * @param {KeySystem} keySystem the desired
     * key system
     * @param {ArrayBuffer} initData 'cenc' initialization data.  Concatenated list of PSSH.
     * @returns {ArrayBuffer|null} The PSSH box data corresponding to the given key system, null if not found
     * or null if a valid association could not be found.
     */
    static getPSSHForKeySystem(keySystem, initData) {
        let psshList = CommonEncryption.parsePSSHList(initData);
        if (keySystem && psshList.hasOwnProperty(keySystem.uuid.toLowerCase())) {
            return psshList[keySystem.uuid.toLowerCase()];
        }
        return null;
    }

    /**
     * Parse a standard common encryption PSSH which contains a simple
     * base64-encoding of the init data
     *
     * @param {Object} cpData the ContentProtection element
     * @param {BASE64} BASE64 reference
     * @returns {ArrayBuffer|null} the init data or null if not found
     */
    static parseInitDataFromContentProtection(cpData, BASE64) {
        if ('pssh' in cpData) {
            return BASE64.decodeArray(cpData.pssh.__text).buffer;
        }
        return null;
    }

    /**
     * Parses list of PSSH boxes into keysystem-specific PSSH data
     *
     * @param {ArrayBuffer} data - the concatenated list of PSSH boxes as provided by
     * CDM as initialization data when CommonEncryption content is detected
     * @returns {Object|Array} an object that has a property named according to each of
     * the detected key system UUIDs (e.g. 00000000-0000-0000-0000-0000000000)
     * and a ArrayBuffer (the entire PSSH box) as the property value
     */
    static parsePSSHList(data) {

        if (data === null || data === undefined)
            return [];

        let dv = new DataView(data.buffer || data); // data.buffer first for Uint8Array support
        let done = false;
        let pssh = {};

        // TODO: Need to check every data read for end of buffer
        let byteCursor = 0;
        while (!done) {

            let size,
                nextBox,
                version,
                systemID,
                psshDataSize;
            let boxStart = byteCursor;

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

            /* Version must be 0 or 1 */
            version = dv.getUint8(byteCursor);
            if (version !== 0 && version !== 1) {
                byteCursor = nextBox;
                continue;
            }
            byteCursor++;

            byteCursor += 3; /* skip flags */

            // 16-byte UUID/SystemID
            systemID = '';
            let i, val;
            for (i = 0; i < 4; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += (val.length === 1) ? '0' + val : val;
            }
            byteCursor += 4;
            systemID += '-';
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += (val.length === 1) ? '0' + val : val;
            }
            byteCursor += 2;
            systemID += '-';
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += (val.length === 1) ? '0' + val : val;
            }
            byteCursor += 2;
            systemID += '-';
            for (i = 0; i < 2; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += (val.length === 1) ? '0' + val : val;
            }
            byteCursor += 2;
            systemID += '-';
            for (i = 0; i < 6; i++) {
                val = dv.getUint8(byteCursor + i).toString(16);
                systemID += (val.length === 1) ? '0' + val : val;
            }
            byteCursor += 6;

            systemID = systemID.toLowerCase();

            /* PSSH Data Size */
            psshDataSize = dv.getUint32(byteCursor);
            byteCursor += 4;

            /* PSSH Data */
            pssh[systemID] = dv.buffer.slice(boxStart, nextBox);
            byteCursor = nextBox;
        }

        return pssh;
    }
}

export default CommonEncryption;
