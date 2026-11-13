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
import ProtectionConstants from '../../constants/ProtectionConstants.js';

/**
 * @classdesc A model class to save metadata about a key system
 * @ignore
 */

class KeySystemMetadata {
    constructor(config) {
        this.ks = config.ks;
        this.keyId = config.keyId;
        this.initData = config.initData;
        this.protData = config.protData;
        this.cdmData = config.cdmData;
        this.sessionId = config.sessionId;
        this.sessionType = config.sessionType;
    }

    /**
     * Returns the system strings to try in order for a key system. A systemStringPriority defined by the application
     * takes precedence over the defaults, e.g. com.microsoft.playready and com.microsoft.playready.recommendation
     * @param {object} ks
     * @param {object} protData
     * @return {Array.<string>}
     */
    static getSystemStringsToApply(ks, protData) {
        // An empty systemStringPriority would leave nothing to request, so it falls back to the defaults
        return (protData && protData.systemStringPriority && protData.systemStringPriority.length > 0 &&
                protData.systemStringPriority) ||
            ProtectionConstants.DEFAULT_SYSTEM_STRING_PRIORITY[ks.systemString] ||
            [ks.systemString];
    }
}

export default KeySystemMetadata;
