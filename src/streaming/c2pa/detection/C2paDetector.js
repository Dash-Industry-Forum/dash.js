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
 * @module C2paDetector
 * @description Strategy contract that answers "does this segment carry C2PA provenance,
 * and by which signing method?". It decouples detection from validation so the detection
 * mechanism can evolve independently.
 *
 * The only implementation today is {@link module:BoxParsingDetector}, which inspects the
 * ISO-BMFF boxes of the segment. Once DASH-IF/MPEG define how to signal C2PA in the MPD,
 * an `MpdSignalingDetector` can implement this same contract and replace the box-parsing
 * strategy without touching the validation path — the coordinator depends on this contract,
 * not on any concrete detector.
 *
 * A detector is invoked only when the operator leaves `streaming.c2pa.method` as `'auto'`;
 * a forced method (`'19.3'`/`'19.4'`) bypasses detection entirely.
 */

/**
 * The outcome of inspecting a segment for C2PA provenance.
 * @typedef {Object} C2paDetectionResult
 * @property {boolean} hasC2pa Whether any C2PA provenance was found in the segment.
 * @property {?('19.3'|'19.4')} method The detected signing method, or null when none was found.
 */

/**
 * The detection strategy contract.
 * @typedef {Object} C2paDetector
 * @property {function(import('../C2paScanner.js').SegmentInput): C2paDetectionResult} detect
 * Classifies a normalized segment as §19.3 ManifestBox, §19.4 VSI or non-C2PA.
 */

/**
 * The result returned when a segment carries no C2PA provenance.
 * @type {C2paDetectionResult}
 */
export const NON_C2PA_DETECTION_RESULT = Object.freeze({ hasC2pa: false, method: null });
