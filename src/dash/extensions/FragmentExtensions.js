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

Dash.dependencies.FragmentExtensions = function () {
    "use strict";

    var getSamplesInfo = function (ab) {
            var isoFile = this.boxParser.parse(ab),
                tfhdBox = isoFile.getBox("tfhd"),
                tfdtBox = isoFile.getBox("tfdt"),
                trunBox = isoFile.getBox("trun"),
                moofBox = isoFile.getBox("moof"),
                sampleDuration,
                sampleCompostionTimeOffset,
                sampleCount,
                sampleSize,
                sampleDts,
                sampleList,
                sample,
                i,
                dataOffset;

            sampleCount = trunBox.sample_count;
            sampleDts= tfdtBox.baseMediaDecodeTime;
            dataOffset = (tfhdBox.base_data_offset || 0) + (trunBox.data_offset || 0);

            sampleList=[];
            for (i = 0; i < sampleCount; i++) {
                sample = trunBox.samples[i];
                sampleDuration = (sample.sample_duration !== undefined) ? sample.sample_duration : tfhdBox.default_sample_duration;
                sampleSize = (sample.sample_size !== undefined) ? sample.sample_size : tfhdBox.default_sample_size;
                sampleCompostionTimeOffset = (sample.sample_composition_time_offset !== undefined) ? sample.sample_composition_time_offset : 0;

                sampleList.push({'dts' : sampleDts,
                                 'cts' : (sampleDts + sampleCompostionTimeOffset),
                                 'duration' :sampleDuration,
                                 'offset': moofBox.offset + dataOffset,
                                 'size' :sampleSize});
                dataOffset += sampleSize;
                sampleDts += sampleDuration;
            }
            return sampleList;
        },

        getMediaTimescaleFromMoov = function(ab) {
            var isoFile = this.boxParser.parse(ab),
                mdhdBox = isoFile.getBox("mdhd");
            return mdhdBox.timescale;
        };

    return {
        log : undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        boxParser: undefined,

        getSamplesInfo:getSamplesInfo,
        getMediaTimescaleFromMoov: getMediaTimescaleFromMoov
    };
};

Dash.dependencies.FragmentExtensions.prototype = {
    constructor: Dash.dependencies.FragmentExtensions
};

Dash.dependencies.FragmentExtensions.eventList = {
    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted"
};