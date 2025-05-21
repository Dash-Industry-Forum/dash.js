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
 * @classdesc Similar to Set<TextTrackCue>, but using the {@link areCuesEqual} function to compare cues, instead of ===.
 * @ignore
 */
class CueSet {

    /**
     * The cues contained in the set, grouped by start time.
     *
     * @instance
     * @type {Map<number, TextTrackCue[]>}
     * @name CueSet.cues
     * @memberof CueSet
     */

    /**
     * Creates a new CueSet instance.
     *
     * @param {ArrayLike<TextTrackCue>} [initialCues] - Optional initial cues to add to the set.
     */
    constructor(initialCues) {
        this.cues = new Map();
        if (initialCues) {
            for (const cue of initialCues) {
                this.addCue(cue);
            }
        }
    }

    /**
     * Checks if a cue is already in the set.
     *
     * @param {TextTrackCue} cue
     * @returns {boolean}
     */
    hasCue(cue) {
        const cuesWithSameStartTime = this.cues.get(cue.startTime);
        return cuesWithSameStartTime && cuesWithSameStartTime.some(c => areCuesEqual(c, cue));
    }

    /**
     * Adds a cue to the set, if it is not already present.
     *
     * @param {TextTrackCue} cue
     */
    addCue(cue) {
        const cuesWithSameStartTime = this.cues.get(cue.startTime);

        if (!cuesWithSameStartTime) {
            this.cues.set(cue.startTime, [cue]);
        } else if (!this.hasCue(cue)) {
            cuesWithSameStartTime.push(cue);
        }
    }
}

/**
 * Compares two cues for equality.
 *
 * @param {TextTrackCue} cue1
 * @param {TextTrackCue} cue2
 * @returns {boolean}
 * @private
 */
function areCuesEqual(cue1, cue2) {
    if (cue1.startTime !== cue2.startTime ||
        cue1.endTime !== cue2.endTime) {
        return false;
    }
    if (cue1 instanceof VTTCue && cue2 instanceof VTTCue) {
        return cue1.text === cue2.text;
    }
    return false;
}

export { CueSet };
