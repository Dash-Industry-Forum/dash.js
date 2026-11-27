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
import FactoryMaker from '../../core/FactoryMaker.js';

/**
 * Sequence-check result when a segment number is a fresh baseline or advances cleanly.
 * @constant {string}
 */
export const SEQUENCE_OK = 'ok';

/**
 * Sequence-check result for a segment number equal to the last one seen.
 * @constant {string}
 */
export const STATUS_REPLAYED = 'replayed';

/**
 * Sequence-check result for a segment number below the last one seen.
 * @constant {string}
 */
export const STATUS_REORDERED = 'reordered';

/**
 * A gap larger than this is not enumerated (an unvalidated or forged sequence number
 * must never drive an unbounded loop); its size is still reported via `missingCount`.
 * @constant {number}
 */
export const MAX_REPORTED_MISSING_SEGMENTS = 100;

/**
 * @module C2paSequenceTracker
 * @description Owns the lean per-track signed-sequence-number bookkeeping used to detect
 * replays, reorders and gaps. Pure input/output: no event emission, no knowledge of
 * records or tracks beyond the trackKey string.
 */
function C2paSequenceTracker() {
    let instance, sequenceTracker;

    function setup() {
        sequenceTracker = {};
    }

    /**
     * Checks a signed sequence number against the last one seen for this track. No
     * cross-track correlation. A NaN segmentNumber is not sequence-checked.
     * @param {string} trackKey
     * @param {number} segmentNumber
     * @returns {{status: string, missing: Array.<number>, missingCount: number}}
     */
    function check(trackKey, segmentNumber) {
        if (isNaN(segmentNumber)) {
            return { status: SEQUENCE_OK, missing: [], missingCount: 0 };
        }

        const lastSequenceNumber = sequenceTracker[trackKey];
        if (lastSequenceNumber === undefined) {
            sequenceTracker[trackKey] = segmentNumber;
            return { status: SEQUENCE_OK, missing: [], missingCount: 0 };
        }

        if (segmentNumber === lastSequenceNumber) {
            return { status: STATUS_REPLAYED, missing: [], missingCount: 0 };
        }
        if (segmentNumber < lastSequenceNumber) {
            return { status: STATUS_REORDERED, missing: [], missingCount: 0 };
        }

        const missingCount = segmentNumber - lastSequenceNumber - 1;
        const missing = [];
        if (missingCount > 0 && missingCount <= MAX_REPORTED_MISSING_SEGMENTS) {
            for (let skipped = lastSequenceNumber + 1; skipped < segmentNumber; skipped++) {
                missing.push(skipped);
            }
        }
        sequenceTracker[trackKey] = segmentNumber;
        return { status: SEQUENCE_OK, missing, missingCount };
    }

    /**
     * Clears one track's last-seen sequence number, so its next segment reads as a fresh
     * baseline instead of a replay, reorder or gap.
     * @param {string} trackKey
     */
    function resetForTrack(trackKey) {
        delete sequenceTracker[trackKey];
    }

    /**
     * Clears every track's sequence state.
     */
    function reset() {
        sequenceTracker = {};
    }

    instance = {
        check,
        resetForTrack,
        reset
    };

    setup();

    return instance;
}

C2paSequenceTracker.__dashjs_factory_name = 'C2paSequenceTracker';
export default FactoryMaker.getClassFactory(C2paSequenceTracker);
