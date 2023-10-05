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

import DashConstants from '../constants/DashConstants.js';

class Representation {

    constructor() {
        this.absoluteIndex = NaN;
        this.absoluteIndexAfterFiltering = NaN;
        this.adaptation = null;
        this.availabilityTimeComplete = true;
        this.availabilityTimeOffset = 0;
        this.bandwidth = NaN;
        this.bitrateInKbit = NaN;
        this.codecPrivateData = null;
        this.codecs = null;
        this.fragmentDuration = null;
        this.frameRate = null;
        this.height = NaN;
        this.id = null;
        this.indexRange = null;
        this.initialization = null;
        this.maxPlayoutRate = NaN;
        this.mediaFinishedInformation = { numberOfSegments: 0, mediaTimeOfLastSignaledSegment: NaN };
        this.mediaInfo = null;
        this.mimeType = null;
        this.mseTimeOffset = NaN;
        this.presentationTimeOffset = 0;
        this.qualityRanking = NaN;
        this.range = null;
        this.scanType = null;
        this.segments = null;
        this.segmentDuration = NaN;
        this.segmentInfoType = null;
        this.startNumber = 1;
        this.timescale = 1;
        this.width = NaN;
    }

    hasInitialization() {
        return (this.initialization !== null || this.range !== null);
    }

    hasSegments() {
        return this.segmentInfoType !== DashConstants.BASE_URL &&
            this.segmentInfoType !== DashConstants.SEGMENT_BASE &&
            !this.indexRange;
    }
}

export default Representation;
