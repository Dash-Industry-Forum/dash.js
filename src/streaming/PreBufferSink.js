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
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import FactoryMaker from '../core/FactoryMaker';

//implements fragmentSink
function PreBufferSink() {
    const context = this.context;
    const log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();

    let chunks = [];

    function reset() {
        chunks = [];
    }

    function append(chunk) {
        if (chunk.segmentType !== 'InitializationSegment') { //Init segments are stored in the initCache.
            chunks.push(chunk);
            chunks.sort(function (a, b) { return a.start - b.start; });
        }
        log('PreBufferSink appended chunk s: ' + chunk.start + '; e: ' + chunk.end);
        eventBus.trigger(Events.SOURCEBUFFER_APPEND_COMPLETED, {
            buffer: this,
            bytes: chunk.bytes,
            canAppend: true
        });
    }

    function remove(start, end) {
        chunks = chunks.filter( a => !(a.start <= end && a.end >= start)); //The opposite of the getChunks predicate.
    }

    /**
     * Nothing async, nothing to abort.
     */
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

    /*
     * Grab the current chunks in the buffer between these times. Then, remove them.
     * TODO: fragmentSource interface?
     */
    function discharge(start, end) {
        const result = getChunksAt(start, end);
        remove(start, end);

        return result;
    }

    function getChunksAt(start, end) {
        return chunks.filter( a => (a.start <= end && a.end >= start) );
    }

    const instance = {
        getAllBufferRanges: getAllBufferRanges,
        append: append,
        remove: remove,
        abort: abort,
        discharge: discharge,
        reset: reset
    };

    return instance;
}

PreBufferSink.__dashjs_factory_name = 'PreBufferSink';
const factory = FactoryMaker.getClassFactory(PreBufferSink);
export default factory;
