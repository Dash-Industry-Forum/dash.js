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

/**
 * Apple FairPlay Streaming DRM
 *
 * @class
 * @implements MediaPlayer.dependencies.protection.KeySystem
 */

import ProtectionConstants from '../../constants/ProtectionConstants.js';
import FactoryMaker from '../../../core/FactoryMaker.js';

const uuid = ProtectionConstants.FAIRPLAY_UUID;
const systemString = ProtectionConstants.FAIRPLAY_KEYSTEM_STRING;
const schemeIdURI = 'urn:uuid:' + uuid;

function KeySystemFairPlay() {

    let instance;

    /**
     * FairPlay has no PSSH in the manifest. Init data comes from the encrypted event with sinf type.
     */
    function getInitData(/*cp*/) {
        return null;
    }

    function getRequestHeadersFromMessage( /*message*/ ) {
        return {
            'Content-Type': 'application/octet-stream'
        };
    }

    function getLicenseRequestFromMessage(message) {
        return new Uint8Array(message);
    }

    function getLicenseServerURLFromInitData( /*initData*/ ) {
        return null;
    }

    function getCDMData(/*cdmData*/) {
        return null;
    }

    instance = {
        uuid,
        schemeIdURI,
        systemString,
        getInitData,
        getRequestHeadersFromMessage,
        getLicenseRequestFromMessage,
        getLicenseServerURLFromInitData,
        getCDMData
    };

    return instance;
}

KeySystemFairPlay.__dashjs_factory_name = 'KeySystemFairPlay';
export default FactoryMaker.getSingletonFactory(KeySystemFairPlay);
