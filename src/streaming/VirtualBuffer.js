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
 * Represents data structure to keep and drive {@link DataChunk}
 */
import MediaController from './controllers/MediaController.js';
import CustomTimeRanges from './utils/CustomTimeRanges.js';
import HTTPRequest from './vo/metrics/HTTPRequest.js';
import EventBus from '../core/EventBus.js';
import Events from '../core/events/Events.js';
import FactoryMaker from '../core/FactoryMaker.js';

function VirtualBuffer() {

    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let instance,
        data,
        sourceBufferController;

    function setup() {
        data = {};
    }

    /**
     * Adds DataChunk to array of chunks
     * @param {@link DataChunk}
     * @memberof VirtualBuffer#
     */
    function append(chunk) {
        var streamId = chunk.streamId;
        var mediaType = chunk.mediaInfo.type;
        var segmentType = chunk.segmentType;
        var start = chunk.start;
        var end = chunk.end;

        data[streamId] = data[streamId] || createDataStorage();
        data[streamId][mediaType][segmentType].push(chunk);
        sortArrayByProperty(data[streamId][mediaType][segmentType], 'index');

        if (!isNaN(start) && !isNaN(end)) {
            data[streamId][mediaType].calculatedBufferedRanges.add(start, end);
            eventBus.trigger(Events.CHUNK_APPENDED, {chunk: chunk, sender: this});
        }
    }

    /**
     * Adds DataChunk to array of appended chunks and updates virual ranges of appended chunks
     * @param {@link DataChunk}
     * @param buffer {SourceBuffer}
     * @memberof VirtualBuffer#
     */
    function storeAppendedChunk(chunk, buffer) {
        if (!chunk || !buffer) return;

        // after the media segment has bee appended we check how the buffered ranges of SourceBuffer have been change. The
        // difference is the actual buffered range of the appended segment.
        // We need to update actualBufferedRanges so that it reflects SourceBuffer ranges.
        // Also we store the appended chunk so that any BufferController has access to the list
        // of appended chunks.
        var streamId = chunk.streamId;
        var mediaType = chunk.mediaInfo.type;
        var bufferedRanges = data[streamId][mediaType].actualBufferedRanges;
        var oldChunk = getChunks({ streamId: streamId, mediaType: mediaType, appended: true, start: chunk.start })[0];

        var diff,
            idx;

        if (oldChunk) {
            idx = data[streamId][mediaType].appended.indexOf(oldChunk);
            data[streamId][mediaType].appended[idx] = chunk;
        } else {
            data[streamId][mediaType].appended.push(chunk);
        }

        sortArrayByProperty(data[streamId][mediaType].appended, 'start');
        diff = sourceBufferController.getRangeDifference(bufferedRanges, buffer);

        if (!diff) {
            if (oldChunk) {
                chunk.bufferedRange = oldChunk.bufferedRange;
            } else {
                //TODO this is dirty fix for a case when segments are not aligned across representations and thus oldChunk is not found
                // We should not use a calculated range here, only actual one should be used, but we don't know yet how to find it.
                chunk.bufferedRange = {start: chunk.start, end: chunk.end};
            }
            return;
        }

        chunk.bufferedRange = diff;
        bufferedRanges.add(diff.start, diff.end);

        if (!oldChunk) return;

        // if there is an old chunk already appended for the same index, we may need to adjust bufferedRange of a new chunk, because
        // it may be not valid.
        //
        // Example:
        //
        // Before appending the old chunk
        //
        // 0|-----Range-------|4
        // 0|--occupied space-|4
        //
        // After appending the old chunk
        //
        // 0|-----------------Range----------------|10
        // 0|-occupied space-4|-------Old chunk----|10
        //
        // After clearing the buffer from 7s to 10s
        //
        // 0|-----------------Range----|7
        // 0|-occupied space-4|OldChunk|7
        //
        // Since the old chunk has been cut only partially, after appending the new chunk its range will be detected as
        //
        // |-----------------Range-----------------|10
        // |----occupied space--------7|-New chunk-|10
        // This is not a valid value because the actual range of a new chunk is the same as the original range of
        // the old chunk, so we do the following adjustment
        chunk.bufferedRange.start = Math.min(oldChunk.bufferedRange.start, diff.start);
        chunk.bufferedRange.end = Math.max(oldChunk.bufferedRange.end, diff.end);
    }

    /**
     * Updates virual ranges of appended chunks according to the given ranges
     * @param filter
     * @param ranges
     * @memberof VirtualBuffer#
     */
    function updateBufferedRanges(filter, ranges) {
        if (!filter) return;

        var streamId = filter.streamId;
        var mediaType = filter.mediaType;
        var appendedChunks = getChunks({ streamId: streamId, mediaType: mediaType, appended: true });

        var remainingChunks = [];
        var start,
            end;

        data[streamId][mediaType].actualBufferedRanges = CustomTimeRanges(context).create();

        if (!ranges || ranges.length === 0) {
            data[streamId][mediaType].appended = [];
            return;
        }

        for (var i = 0, ln = ranges.length; i < ln; i++) {
            start = ranges.start(i);
            end = ranges.end(i);
            data[streamId][mediaType].actualBufferedRanges.add(start, end);
            // we need to select chunks that belong only to the new ranges
            remainingChunks = remainingChunks.concat(findChunksForRange(appendedChunks, {start: start, end: end}, true));
        }

        data[streamId][mediaType].appended = remainingChunks;
    }

    /**
     * Finds and returns {@link DataChunk} that satisfies filtering options
     * @param filter - an object that contains properties by which the method search for chunks
     * @returns {Array}
     * @memberof VirtualBuffer#
     */
    function getChunks(filter) {
        var originData = findData(filter);
        var segmentType = filter.segmentType;
        var appended = filter.appended;
        var removeOrigin = filter.removeOrigin;
        var limit = filter.limit || Number.POSITIVE_INFINITY;
        var mediaController = MediaController(context).getInstance();

        var ln = 0;
        var result = [];
        var sourceArr;

        if (!originData) return result;

        delete filter.streamId;
        delete filter.mediaType;
        delete filter.segmentType;
        delete filter.removeOrigin;
        delete filter.limit;
        delete filter.appended;

        sourceArr = appended ? originData.appended : (segmentType ? originData[segmentType] : []);

        result = sourceArr.filter(function (item, idx, arr) {
            if (ln >= limit) return false;

            for (var prop in filter) {
                if (prop === 'mediaInfo') {
                    return mediaController.isTracksEqual(item[prop], filter[prop]);
                }

                if (filter.hasOwnProperty(prop) && item[prop] != filter[prop]) return false;
            }

            if (removeOrigin) {
                originData.calculatedBufferedRanges.remove(item.start, item.end);
                arr.splice(idx, 1);
            }

            ln++;

            return true;
        });

        if (filter.forRange) {
            result = findChunksForRange(result, filter.forRange, false);
        }

        return result;
    }

    /**
     * Finds and returns {@link DataChunk} that satisfies filtering options. Filtered chunks are removed
     * from the original array
     * @param filter - an object that contains properties by which the method search for chunks
     * @returns {Array}
     * @memberof VirtualBuffer#
     */
    function extract(filter) {
        filter.removeOrigin = true;
        return getChunks(filter);
    }

    /**
     * Calculates total buffer size across all Periods
     * @param {@link MediaInfo}
     * @returns {Number}
     * @memberof VirtualBuffer#
     */
    function getTotalBufferLevel(mediaInfo) {
        var mediaType = mediaInfo.type;
        var level = 0;

        for (var streamId in data) {
            if (data.hasOwnProperty(streamId)) {
                level += sourceBufferController.getTotalBufferedTime({buffered: data[streamId][mediaType].calculatedBufferedRanges});
            }
        }

        return level;
    }

    function setConfig(config) {
        if (!config) return;

        if (config.sourceBufferController) {
            sourceBufferController = config.sourceBufferController;
        }
    }

    /**
     * @memberof VirtualBuffer#
     */
    function reset() {
        data = {};
    }

    function sortArrayByProperty(array, sortProp) {
        var compare = function (obj1, obj2) {
            if (obj1[sortProp] < obj2[sortProp]) return -1;
            if (obj1[sortProp] > obj2[sortProp]) return 1;
            return 0;
        };

        array.sort(compare);
    }

    function findData(filter) {
        var streamId = filter.streamId;
        var mediaType = filter.mediaType;

        if (!data[streamId]) return null;

        return data[streamId][mediaType];
    }

    function findChunksForRange(chunks, range, truncateChunk) {
        var rangeStart = range.start;
        var rangeEnd = range.end;
        var chunksForRange = [];

        var chunkStart,
            chunkEnd,
            isStartIncluded,
            isEndIncluded;

        chunks.forEach(function (chunk) {
            chunkStart = chunk.bufferedRange.start;
            chunkEnd = chunk.bufferedRange.end;
            isStartIncluded = (chunkStart >= rangeStart && chunkStart < rangeEnd);
            isEndIncluded = (chunkEnd > rangeStart && chunkEnd <= rangeEnd);

            // if a segment has been partially removed from SourceBuffer we select it as well, but we
            // need to update its bufferedRange
            //
            // Example 1:
            // |-----------------Range----------------|
            //                            |----Chunk-----|
            // becomes
            // |-----------------Range----------------|
            //                            |----Chunk--|
            // Example 2:
            //       |-----------------Range----------------|
            // |-------Chunk-----|
            // becomes
            //       |-----------------Range----------------|
            //       |-Chunk-----|

            if (isStartIncluded || isEndIncluded) {
                chunksForRange.push(chunk);

                if (truncateChunk) {
                    chunk.bufferedRange.start = isStartIncluded ? chunkStart : rangeStart;
                    chunk.bufferedRange.end = isEndIncluded ? chunkEnd : rangeEnd;
                }
            }
        });

        return chunksForRange;
    }

    function createDataStorage() {
        var data = {};

        data.audio = {calculatedBufferedRanges: CustomTimeRanges(context).create(),
            actualBufferedRanges: CustomTimeRanges(context).create(),
            appended: []};
        data.audio[HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
        data.audio[HTTPRequest.INIT_SEGMENT_TYPE] = [];
        data.video = {calculatedBufferedRanges: CustomTimeRanges(context).create(),
            actualBufferedRanges: CustomTimeRanges(context).create(),
            appended: []};
        data.video[HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
        data.video[HTTPRequest.INIT_SEGMENT_TYPE] = [];
        data.fragmentedText = {calculatedBufferedRanges: CustomTimeRanges(context).create(),
            actualBufferedRanges: CustomTimeRanges(context).create(),
            appended: []};
        data.fragmentedText[HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
        data.fragmentedText[HTTPRequest.INIT_SEGMENT_TYPE] = [];

        return data;
    }

    instance = {
        append: append,
        extract: extract,
        getChunks: getChunks,
        storeAppendedChunk: storeAppendedChunk,
        updateBufferedRanges: updateBufferedRanges,
        getTotalBufferLevel: getTotalBufferLevel,
        setConfig: setConfig,
        reset: reset
    };

    setup();
    return instance;
}
VirtualBuffer.__dashjs_factory_name = 'VirtualBuffer';
export default FactoryMaker.getSingletonFactory(VirtualBuffer);