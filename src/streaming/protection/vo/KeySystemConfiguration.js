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
 * @classdesc Represents a set of configurations that describe the capabilities desired for
 *  support by a given CDM
 * @ignore
 */
class KeySystemConfiguration {
    /**
     * @param {Array.<MediaCapability>} audioCapabilities array of
     * desired audio capabilities.  Higher preference capabilities should be placed earlier
     * in the array.
     * @param {Array.<MediaCapability>} videoCapabilities array of
     * desired video capabilities.  Higher preference capabilities should be placed earlier
     * in the array.
     * @param {string} distinctiveIdentifier desired use of distinctive identifiers.
     * One of "required", "optional", or "not-allowed"
     * @param {string} persistentState desired support for persistent storage of
     * key systems.  One of "required", "optional", or "not-allowed"
     * @param {Array.<string>} sessionTypes List of session types that must
     * be supported by the key system
     * @class
     */
    constructor(audioCapabilities, videoCapabilities, distinctiveIdentifier, persistentState, sessionTypes) {
        this.initDataTypes = [ 'cenc' ];
        this.audioCapabilities = audioCapabilities;
        this.videoCapabilities = videoCapabilities;
        this.distinctiveIdentifier = distinctiveIdentifier;
        this.persistentState = persistentState;
        this.sessionTypes = sessionTypes;
    }
}

export default KeySystemConfiguration;
