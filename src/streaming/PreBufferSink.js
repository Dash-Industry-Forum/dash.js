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
import Debug from '../core/Debug.js';
import FactoryMaker from '../core/FactoryMaker.js';

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

    let initSegments = [];
    let chunks = [];
    let onAppended = onAppendedCallback;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function reset() {
        chunks = [];
        initSegments = [];
        outstandingInit = null;
        onAppended = null;
    }

    function append(chunk) {
        if (chunk.segmentType !== 'InitializationSegment') {
            chunks.push(chunk);
            chunks.sort(function (a, b) {
                return a.start - b.start;
            });
            outstandingInit = null;
        } else {
            if (!initSegments.includes(chunk)) {
                initSegments.push(chunk);
            }
            //We might be in the process of downloading a media segment, this would be its init pair.
            outstandingInit = chunk;
        }

        logger.debug('PreBufferSink appended chunk s: ' + chunk.start + '; e: ' + chunk.end);
        if (onAppended) {
            onAppended({
                chunk: chunk
            });
        }
        return Promise.resolve();
    }

    function remove(start, end) {
        chunks = chunks.filter(a => !((isNaN(end) || a.start < end) && (isNaN(start) || a.end > start)));
        return Promise.resolve();
    }

    //Nothing async, nothing to abort.
    function abort() {
        return Promise.resolve();
    }

    function getAllBufferRanges() {
        let ranges = [];

        for (let i = 0; i < chunks.length; i++) {
            let chunk = chunks[i];
            if (ranges.length === 0 || chunk.start > ranges[ranges.length - 1].end) {
                ranges.push({start: chunk.start, end: chunk.end});
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

    function updateTimestampOffset() {
        return Promise.resolve();
    }

    function getBuffer() {
        return this;
    }

    //Return an array of all chunks along with init segments in the order to append to the SourceBuffer.
    //Chunks are removed from PreBuffer when they are discharged.
    function discharge() {
        const result = chunks;
        let lastInit = null;

        for (let i = 0; i < result.length; i++) {
            if (!lastInit || result[i].representation.id != lastInit.representation.id) {
                lastInit = initSegments.find(init => init.representation.id === result[i].representation.id);
                if (lastInit) {
                    result.splice(i, 0, lastInit);
                    i++;
                }
            }
        }

        if (outstandingInit) {
            result.push(outstandingInit);
            outstandingInit = null;
        }

        chunks = [];
        initSegments = [];

        return result;
    }

    function waitForUpdateEnd(callback) {
        callback();
    }

    instance = {
        getAllBufferRanges,
        append,
        remove,
        abort,
        discharge,
        reset,
        updateTimestampOffset,
        waitForUpdateEnd,
        getBuffer
    };

    setup();

    return instance;
}

PreBufferSink.__dashjs_factory_name = 'PreBufferSink';
const factory = FactoryMaker.getClassFactory(PreBufferSink);
export default factory;
