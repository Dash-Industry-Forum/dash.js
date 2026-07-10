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
import FactoryMaker from '../../../core/FactoryMaker.js';
import { C2PA_METHOD_MANIFEST_BOX, C2PA_METHOD_VSI } from '../C2paOptions.js';
import { NON_C2PA_DETECTION_RESULT } from './C2paDetector.js';

// §19.4 VSI: the COSE_Sign1 travels in an emsg box carrying this scheme URI.
const VSI_EMSG_SCHEME_URI = 'urn:c2pa:verifiable-segment-info';

// §19.3 ManifestBox: the C2PA manifest is stored in a uuid box. Signers use one of two
// UUIDs, so both are recognized (matching the CML validation engine): the C2PA manifest
// store UUID and the ISO 19566-5 JUMBF UUID used by c2pa-rs.
const C2PA_MANIFEST_STORE_UUID = [
    0xd8, 0xfe, 0xc3, 0xd6, 0x1a, 0x96, 0x4f, 0x32,
    0xa0, 0xf6, 0xf3, 0xec, 0xf9, 0x6c, 0x10, 0xea
];
const JUMBF_UUID = [
    0xd8, 0xfe, 0xc3, 0xd6, 0x1b, 0x0e, 0x48, 0x3c,
    0x92, 0x97, 0x58, 0x28, 0x87, 0x7e, 0xc4, 0x81
];

/**
 * @module BoxParsingDetector
 * @implements module:C2paDetector
 * @description The box-parsing {@link module:C2paDetector} strategy. It reuses dash.js's own
 * ISO-BMFF parser (`BoxParser` over codem-isoboxer) to classify a segment: an emsg box with
 * the VSI scheme URI marks §19.4, a C2PA uuid box marks §19.3, and neither marks non-C2PA.
 * No new parser or dependency is introduced. This strategy can be swapped for an
 * `MpdSignalingDetector` once C2PA is signalled in the MPD, without touching the validation
 * path (see {@link module:C2paDetector}).
 * @param {Object} config
 * @param {Object} config.boxParser The dash.js BoxParser singleton (parse(buffer) -> IsoFile).
 */
function BoxParsingDetector(config) {
    config = config || {};
    const boxParser = config.boxParser;

    let instance;

    /**
     * @param {import('../C2paScanner.js').SegmentInput} segmentInput
     * @returns {import('./C2paDetector.js').C2paDetectionResult}
     */
    function detect(segmentInput) {
        if (!segmentInput || !segmentInput.bytes || !boxParser) {
            return NON_C2PA_DETECTION_RESULT;
        }

        const isoFile = _parse(segmentInput.bytes);
        if (!isoFile) {
            return NON_C2PA_DETECTION_RESULT;
        }

        if (_hasVsiEmsg(isoFile)) {
            return { hasC2pa: true, method: C2PA_METHOD_VSI };
        }
        if (_hasC2paManifestBox(isoFile)) {
            return { hasC2pa: true, method: C2PA_METHOD_MANIFEST_BOX };
        }
        return NON_C2PA_DETECTION_RESULT;
    }

    function _parse(bytes) {
        try {
            return boxParser.parse(_toArrayBuffer(bytes));
        } catch (e) {
            return null;
        }
    }

    function _toArrayBuffer(bytes) {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }

    function _hasVsiEmsg(isoFile) {
        return isoFile.getBoxes('emsg').some((box) => box.scheme_id_uri === VSI_EMSG_SCHEME_URI);
    }

    function _hasC2paManifestBox(isoFile) {
        return isoFile.getBoxes('uuid').some((box) => _isC2paUuid(box.usertype));
    }

    function _isC2paUuid(usertype) {
        return _matchesUuid(usertype, C2PA_MANIFEST_STORE_UUID) || _matchesUuid(usertype, JUMBF_UUID);
    }

    function _matchesUuid(usertype, expected) {
        if (!usertype || usertype.length !== expected.length) {
            return false;
        }
        for (let i = 0; i < expected.length; i++) {
            if (usertype[i] !== expected[i]) {
                return false;
            }
        }
        return true;
    }

    instance = {
        detect
    };

    return instance;
}

BoxParsingDetector.__dashjs_factory_name = 'BoxParsingDetector';
export default FactoryMaker.getClassFactory(BoxParsingDetector);
