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

import FactoryMaker from '../../core/FactoryMaker';

function FragmentedTextBoxParser() {

    let instance,
        boxParser;

    function setConfig(config) {
        if (!config) return;

        if (config.boxParser) {
            boxParser = config.boxParser;
        }
    }

    function getSamplesInfo(ab) {
        var isoFile = boxParser.parse(ab);
        var tfhdBox = isoFile.getBox('tfhd');
        var tfdtBox = isoFile.getBox('tfdt');
        var trunBox = isoFile.getBox('trun');
        var moofBox = isoFile.getBox('moof');
        var mfhdBox = isoFile.getBox('mfhd');

        var sampleDuration,
            sampleCompositionTimeOffset,
            sampleCount,
            sampleSize,
            sampleDts,
            sampleList,
            sample,
            i,
            dataOffset,
            sequenceNumber,
            totalDuration;

        sequenceNumber = mfhdBox.sequence_number;
        sampleCount = trunBox.sample_count;
        sampleDts = tfdtBox.baseMediaDecodeTime;
        dataOffset = (tfhdBox.base_data_offset || 0) + (trunBox.data_offset || 0);

        sampleList = [];
        for (i = 0; i < sampleCount; i++) {
            sample = trunBox.samples[i];
            sampleDuration = (sample.sample_duration !== undefined) ? sample.sample_duration : tfhdBox.default_sample_duration;
            sampleSize = (sample.sample_size !== undefined) ? sample.sample_size : tfhdBox.default_sample_size;
            sampleCompositionTimeOffset = (sample.sample_composition_time_offset !== undefined) ? sample.sample_composition_time_offset : 0;

            sampleList.push({'dts': sampleDts,
                'cts': (sampleDts + sampleCompositionTimeOffset),
                'duration': sampleDuration,
                'offset': moofBox.offset + dataOffset,
                'size': sampleSize});
            dataOffset += sampleSize;
            sampleDts += sampleDuration;
        }
        totalDuration = sampleDts - tfdtBox.baseMediaDecodeTime;
        return {sampleList: sampleList, sequenceNumber: sequenceNumber, totalDuration: totalDuration};
    }

    function getMediaTimescaleFromMoov(ab) {
        var isoFile = boxParser.parse(ab);
        var mdhdBox = isoFile.getBox('mdhd');

        return mdhdBox ? mdhdBox.timescale : NaN;
    }

    instance = {
        getSamplesInfo: getSamplesInfo,
        getMediaTimescaleFromMoov: getMediaTimescaleFromMoov,
        setConfig: setConfig
    };

    return instance;
}

FragmentedTextBoxParser.__dashjs_factory_name = 'FragmentedTextBoxParser';
export default FactoryMaker.getSingletonFactory(FragmentedTextBoxParser);