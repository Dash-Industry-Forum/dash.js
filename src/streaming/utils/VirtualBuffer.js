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
 * Represents data structure to keep and drive {@link MediaPlayer.vo.DataChunk}
 */
MediaPlayer.utils.VirtualBuffer = function () {
    var data = {},

        sortArrayByProperty = function(array, sortProp) {
            var compare = function (obj1, obj2){
                if (obj1[sortProp] < obj2[sortProp]) return -1;
                if (obj1[sortProp] > obj2[sortProp]) return 1;
                return 0;
            };

            array.sort(compare);
        },

        findData = function(filter) {
            var streamId = filter.streamId,
                mediaType = filter.mediaType;

            if (!data[streamId]) return null;

            return data[streamId][mediaType];
        },

        findChunksForRange = function(chunks, range, truncateChunk) {
            var chunksForRange = [],
                rangeStart = range.start,
                rangeEnd = range.end,
                chunkStart,
                chunkEnd,
                isStartIncluded,
                isEndIncluded;

            chunks.forEach(function(chunk) {
                chunkStart = chunk.bufferedRange.start;
                chunkEnd = chunk.bufferedRange.end;
                isStartIncluded = (chunkStart >= rangeStart && chunkStart < rangeEnd);
                isEndIncluded = (chunkEnd > rangeStart && chunkEnd <= rangeEnd);

                // if a segment has been partially removed from SourceBuffer we select it as weel, but we
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
        },

        createDataStorage = function() {
            var data = {};

            data.audio = {calculatedBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                          actualBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                          appended: []};
            data.audio[MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
            data.audio[MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE] = [];
            data.video = {calculatedBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                          actualBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                          appended: []};
            data.video[MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
            data.video[MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE] = [];
            data.fragmentedText = {calculatedBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                                   actualBufferedRanges: new MediaPlayer.utils.CustomTimeRanges(),
                                   appended: []};
            data.fragmentedText[MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
            data.fragmentedText[MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE] = [];

            return data;
        };

    return {
        system:undefined,
        sourceBufferExt: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        /**
         * Adds DataChunk to array of chunks
         * @param {@link MediaPlayer.vo.DataChunk}
         * @memberof VirtualBuffer#
         */
         append: function(chunk) {
            var streamId = chunk.streamId,
                mediaType = chunk.mediaInfo.type,
                segmentType = chunk.segmentType,
                start = chunk.start,
                end = chunk.end;

            data[streamId] = data[streamId] || createDataStorage();
            data[streamId][mediaType][segmentType].push(chunk);
            sortArrayByProperty(data[streamId][mediaType][segmentType], "index");

            if (!isNaN(start) && !isNaN(end)) {
                data[streamId][mediaType].calculatedBufferedRanges.add(start, end);
                this.notify(MediaPlayer.utils.VirtualBuffer.eventList.CHUNK_APPENDED, {chunk: chunk});
            }
        },

        /**
         * Adds DataChunk to array of appended chunks and updates virual ranges of appended chunks
         * @param {@link MediaPlayer.vo.DataChunk}
         * @param buffer {SourceBuffer}
         * @memberof VirtualBuffer#
         */
        storeAppendedChunk: function(chunk, buffer) {
            if (!chunk || !buffer) return;

            // after the media segment has bee appended we check how the buffred ranges of SourceBuffer have been change. The
            // difference is the actual buffred range of the appended segment.
            // We need to update actualBufferedRanges so that it reflects SourceBuffer ranges.
            // Also we store the appended chunk so that any BufferController has access to the list
            // of appended chunks.
            var streamId = chunk.streamId,
                mediaType = chunk.mediaInfo.type,
                bufferedRanges = data[streamId][mediaType].actualBufferedRanges,
                oldChunk = this.getChunks({streamId: streamId, mediaType: mediaType, appended: true, start: chunk.start})[0],
                diff,
                idx;

            if (oldChunk) {
                idx = data[streamId][mediaType].appended.indexOf(oldChunk);
                data[streamId][mediaType].appended[idx] = chunk;
            } else {
                data[streamId][mediaType].appended.push(chunk);
            }

            sortArrayByProperty(data[streamId][mediaType].appended, "start");
            diff = this.sourceBufferExt.getRangeDifference(bufferedRanges, buffer);

            if (!diff) {
                if (oldChunk) {
                    chunk.bufferedRange = oldChunk.bufferedRange;
                }
                return;
            }

            chunk.bufferedRange = diff;
            bufferedRanges.add(diff.start, diff.end);

            if (!oldChunk) return;

            // if there is an old chunk already appended for the same index, we may need to adjust buffredRange of a new chunk, because
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
        },

        /**
         * Updates virual ranges of appended chunks according to the given ranges
         * @param filter
         * @param ranges
         * @memberof VirtualBuffer#
         */
        updateBufferedRanges: function(filter, ranges) {
            if (!filter) return;

            var streamId = filter.streamId,
                mediaType = filter.mediaType,
                appendedChunks = this.getChunks({streamId: streamId, mediaType: mediaType, appended: true}),
                remainingChunks = [],
                start,
                end;

            data[streamId][mediaType].actualBufferedRanges = new MediaPlayer.utils.CustomTimeRanges();

            if (!ranges || ranges.length === 0) {
                data[streamId][mediaType].appended = [];
                return;
            }

            for (var i = 0, ln = ranges.length; i < ln; i += 1) {
                start = ranges.start(i);
                end = ranges.end(i);
                data[streamId][mediaType].actualBufferedRanges.add(start, end);
                // we need to select chunks that belong only to the new ranges
                remainingChunks = remainingChunks.concat(findChunksForRange.call(this, appendedChunks, {start: start, end: end}, true));
            }

            data[streamId][mediaType].appended = remainingChunks;
        },

        /**
         * Finds and returns {@link MediaPlayer.vo.DataChunk} that satisfies filtering options
         * @param filter - an object that contains properties by which the method search for chunks
         * @returns {Array}
         * @memberof VirtualBuffer#
         */
        getChunks: function(filter) {
            var originData = findData.call(this, filter),
                segmentType = filter.segmentType,
                appended = filter.appended,
                removeOrigin = filter.removeOrigin,
                limit = filter.limit || Number.POSITIVE_INFINITY,
                mediaController = this.system.getObject("mediaController"),
                ln = 0,
                result = [],
                sourceArr;

            if (!originData) return result;

            delete filter.streamId;
            delete filter.mediaType;
            delete filter.segmentType;
            delete filter.removeOrigin;
            delete filter.limit;
            delete filter.appended;

            sourceArr = appended ? originData.appended : (segmentType ? originData[segmentType] : []);

            result = sourceArr.filter(function(item, idx, arr) {
                if (ln >= limit) return false;

                for (var prop in filter) {
                    if (prop === "mediaInfo") {
                        return mediaController.isTracksEqual(item[prop], filter[prop]);
                    }

                    if (filter.hasOwnProperty(prop) && item[prop] != filter[prop]) return false;
                }

                if (removeOrigin) {
                    originData.calculatedBufferedRanges.remove(item.start, item.end);
                    arr.splice(idx, 1);
                }

                ln +=1;

                return true;
            });

            if (filter.forRange) {
                result = findChunksForRange.call(this, result, filter.forRange, false);
            }

            return result;
        },

        /**
         * Finds and returns {@link MediaPlayer.vo.DataChunk} that satisfies filtering options. Filtered chunks are removed
         * from the original array
         * @param filter - an object that contains properties by which the method search for chunks
         * @returns {Array}
         * @memberof VirtualBuffer#
         */
        extract: function(filter) {
            filter.removeOrigin = true;

            return this.getChunks(filter);
        },

        /**
         * Calculates total buffer size across all Periods
         * @param {@link MediaPlayer.vo.MediaInfo}
         * @returns {Number}
         * @memberof VirtualBuffer#
         */
        getTotalBufferLevel: function(mediaInfo) {
            var mediaType = mediaInfo.type,
                level = 0;

            for (var streamId in data) {
                if (data.hasOwnProperty(streamId)) {
                    level += this.sourceBufferExt.getTotalBufferedTime({buffered: data[streamId][mediaType].calculatedBufferedRanges});
                }
            }

            return level;
        },

        /**
         * @memberof VirtualBuffer#
         */
        reset: function() {
            data = {};
        }
    };
};

MediaPlayer.utils.VirtualBuffer.prototype = {
    constructor: MediaPlayer.utils.VirtualBuffer
};

MediaPlayer.utils.VirtualBuffer.eventList = {
    CHUNK_APPENDED: "chunkAppended"
};