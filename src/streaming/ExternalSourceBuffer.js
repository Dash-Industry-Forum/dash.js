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

class ExternalSourceBuffer {
    constructor(mimeType, eventBus) {
        this.eventBus = eventBus;
        this.mimeType = mimeType;
        this.updating = false;
        this.chunks = [];
        this.appendWindowStart = 0;
        this.appendWindowEnd = Infinity;
        this.timestampOffset = 0;
        this.mode = 'segments';
    }

    appendBuffer(segmentData, segmentStartTime, segmentEndTime) {
        if (this.updating) {
            throw new Error('SourceBuffer is currently updating');
        }
        this.updating = true;
        this.eventBus.trigger('externalSourceBufferUpdateStart', { mimeType: this.mimeType, request: 'appendBuffer', data: segmentData, start: segmentStartTime, end: segmentEndTime });

        if (!Number.isNaN(segmentStartTime)) {
            this.chunks.push({data: segmentData, start: segmentStartTime, end: segmentEndTime});
            this.chunks.sort((a, b) => a.start - b.start); // sort ascending based on start times
        }
        // Simulate async data append
        setTimeout(() => {
            this.updating = false;
            this.eventBus.trigger('externalSourceBufferUpdating', { mimeType: this.mimeType });
            this.eventBus.trigger('externalSourceBufferUpdateEnd', { mimeType: this.mimeType });
        }, 10);
    }

    abort() {
        if (this.updating) {
            this.updating = false;
            this.eventBus.trigger('externalSourceBufferAbort', { mimeType: this.mimeType });
            this.eventBus.trigger('externalSourceBufferUpdateEnd', { mimeType: this.mimeType });
        }
    }

    remove(start, end) {
        if (this.updating) {
            throw new Error('SourceBuffer is currently updating');
        }
        this.updating = true;
        this.eventBus.trigger('externalSourceBufferUpdateStart', { mimeType: this.mimeType, request: 'remove', start: start, end: end });

        this.chunks = this.chunks.filter(segment => segment.end <= start || segment.start >= end);

        // Simulate async data removal
        setTimeout(() => {
            this.updating = false;
            this.eventBus.trigger('externalSourceBufferUpdating', { mimeType: this.mimeType });
            this.eventBus.trigger('externalSourceBufferUpdateEnd', { mimeType: this.mimeType });
        }, 10);
    }

    get buffered() {
        return new TimeRanges(this.chunks);
    }
}

/**
 * Implements TimeRanges interface as described in https://html.spec.whatwg.org/multipage/media.html#timeranges
 * According to the spec, ranges in such an object are ordered, don't overlap, and don't touch
 * (adjacent ranges are folded into one bigger range).
 */
class TimeRanges {
    constructor(chunks) {
        this._ranges = [];

        // Process ordered chunks into TimeRanges
        for (const chunk of chunks) {
            const ranges = this._ranges;
            const newRange = { start: chunk.start, end: chunk.end };
            const lastRange = ranges.length ? ranges[ranges.length - 1] : null;

            if (!lastRange || newRange.start > lastRange.end) {
                ranges.push(newRange); // empty or discontinuity in buffered period
            } else {
                lastRange.end = newRange.end; // continuous buffered period
            }
        }
    }

    get length() {
        return this._ranges.length;
    }

    start(index) {
        return this._ranges[index].start;
    }

    end(index) {
        return this._ranges[index].end;
    }
}

export default ExternalSourceBuffer;
