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

export default {
    LEVELS: {
        SUGGESTION: 'Suggestion',
        WARNING: 'Warning',
        ERROR: 'Error'
    },
    EVENTS: {
        NO_UTC_TIMING_ELEMENT: {
            key: 'NO_UTC_TIMING_ELEMENT',
            message: 'No UTCTiming element is present in the manifest. You may experience playback failures. For a detailed validation use https://conformance.dashif.org/'
        },
        NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE: {
            key: 'NON_COMPLIANT_SMPTE_IMAGE_ATTRIBUTE',
            message: 'SMPTE 2052-1:2013 defines the attribute name as "imageType" and does not define "imagetype"'
        },
        INVALID_DVR_WINDOW: {
            key: 'INVALID_DVR_WINDOW',
            message: 'No valid segment found when applying a specification compliant DVR window calculation. Using SegmentTimeline entries as a fallback.'
        }
    }
};
