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
import Debug from '../core/Debug';
import FactoryMaker from '../core/FactoryMaker';

/**
 * This is a sink that is used to temporarily hold onto media chunks before a video element is added.
 * The discharge() function is used to get the chunks out of the PreBuffer for adding to a real SourceBuffer.
 *
 * @class PreBufferSink
 * @ignore
 * @implements FragmentSink
 */
function PreBufferSink(onAppendedCallback) {
    const context = this.context;

    let instance,
        logger,
        outstandingInit;
    let chunks = [];
    let onAppended = onAppendedCallback;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function reset() {
        chunks = [];
        outstandingInit = null;
        onAppended = null;
    }

    function append(chunk) {
        if (chunk.segmentType !== 'InitializationSegment') { //Init segments are stored in the initCache.
            chunks.push(chunk);
            chunks.sort(function (a, b) { return a.start - b.start; });
            outstandingInit = null;
        } else {//We need to hold an init chunk for when a corresponding media segment is being downloaded when the discharge happens.
            outstandingInit = chunk;
        }

        logger.debug('PreBufferSink appended chunk s: ' + chunk.start + '; e: ' + chunk.end);
        if (onAppended) {
            onAppended({
                chunk: chunk
            });
        }
    }

    function remove(start, end) {
        chunks = chunks.filter( a => !((isNaN(end) || a.start < end) && (isNaN(start) || a.end > start))); //The opposite of the getChunks predicate.
    }

    //Nothing async, nothing to abort.
    function abort() {
    }

    function getAllBufferRanges() {
        let ranges = [];

        for (let i = 0; i < chunks.length; i++) {
            let chunk = chunks[i];
            if (ranges.length === 0 || chunk.start > ranges[ranges.length - 1].end) {
                ranges.push({ start: chunk.start, end: chunk.end });
            } else {
                ranges[ranges.length - 1].end = chunk.end;
            }
        }

        //Implements TimeRanges interface. So acts just like sourceBuffer.buffered.
        const timeranges = {
            start: function (n) {
                return ranges[n].start;
            },
            end: function (n) {
                return ranges[n].end;
            }
        };

        Object.defineProperty(timeranges, 'length', {
            get: function () {
                return ranges.length;
            }
        });

        return timeranges;
    }

    function hasDiscontinuitiesAfter() {
        return false;
    }

    function updateTimestampOffset() {
        // Nothing to do
    }

    function getBuffer() {
        return this;
    }

    /**
     * Return the all chunks in the buffer the lie between times start and end.
     * Because a chunk cannot be split, this returns the full chunk if any part of its time lies in the requested range.
     * Chunks are removed from the buffer when they are discharged.
     * @function PreBufferSink#discharge
     * @param {?Number} start The start time from which to discharge from the buffer. If NaN, it is regarded as unbounded.
     * @param {?Number} end The end time from which to discharge from the buffer. If NaN, it is regarded as unbounded.
     * @returns {Array} The set of chunks from the buffer within the time ranges.
     */
    function discharge(start, end) {
        const result = getChunksAt(start, end);
        if (outstandingInit) {
            result.push(outstandingInit);
            outstandingInit = null;
        }

        remove(start, end);

        return result;
    }

    function getChunksAt(start, end) {
        return chunks.filter( a => ((isNaN(end) || a.start < end) && (isNaN(start) || a.end > start)) );
    }

    function waitForUpdateEnd(callback) {
        callback();
    }

    instance = {
        getAllBufferRanges: getAllBufferRanges,
        append: append,
        remove: remove,
        abort: abort,
        discharge: discharge,
        reset: reset,
        updateTimestampOffset: updateTimestampOffset,
        hasDiscontinuitiesAfter: hasDiscontinuitiesAfter,
        waitForUpdateEnd: waitForUpdateEnd,
        getBuffer: getBuffer
    };

    setup();

    return instance;
}

PreBufferSink.__dashjs_factory_name = 'PreBufferSink';
const factory = FactoryMaker.getClassFactory(PreBufferSink);
export default factory;
