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

        createDataStorage = function() {
            var data = {};

            data.audio = {buffered: new MediaPlayer.utils.CustomTimeRanges()};
            data.audio[MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
            data.audio[MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE] = [];
            data.video = {buffered: new MediaPlayer.utils.CustomTimeRanges()};
            data.video[MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE] = [];
            data.video[MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE] = [];
            data.fragmentedText = {buffered: new MediaPlayer.utils.CustomTimeRanges()};
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
                mediaType = chunk.mediaType,
                segmentType = chunk.segmentType,
                start = chunk.start,
                end = chunk.end;

            data[streamId] = data[streamId] || createDataStorage();
            data[streamId][mediaType][segmentType].push(chunk);
            sortArrayByProperty(data[streamId][mediaType][segmentType], "index");

            if (!isNaN(start) && !isNaN(end)) {
                data[streamId][mediaType].buffered.add(start, end);
                this.notify(MediaPlayer.utils.VirtualBuffer.eventList.CHUNK_APPENDED, {chunk: chunk});
            }
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
                removeOrigin = filter.removeOrigin,
                limit = filter.limit || Number.POSITIVE_INFINITY,
                ln = 0,
                result = [];

            if (!originData) return result;

            delete filter.streamId;
            delete filter.mediaType;
            delete filter.segmentType;
            delete filter.removeOrigin;
            delete filter.limit;

            result = originData[segmentType].filter(function(item, idx, arr) {
                if (ln >= limit) return false;

                for (var prop in filter) {
                    if (filter.hasOwnProperty(prop) && item[prop] != filter[prop]) return false;
                }

                if (removeOrigin) {
                    originData.buffered.remove(item.start, item.end);
                    arr.splice(idx, 1);
                }

                ln +=1;

                return true;
            });

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
                    level += this.sourceBufferExt.getTotalBufferedTime(data[streamId][mediaType]);
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