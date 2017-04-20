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
        let isoFile = boxParser.parse(ab);
        let tfhdBox = isoFile.getBox('tfhd');
        let tfdtBox = isoFile.getBox('tfdt');
        let trunBox = isoFile.getBox('trun');
        let moofBox = isoFile.getBox('moof');
        let mfhdBox = isoFile.getBox('mfhd');
        let subsBox = isoFile.getBox('subs');

        let sampleDuration,
            sampleCompositionTimeOffset,
            sampleCount,
            sampleSize,
            sampleDts,
            sampleList,
            sample,
            i, j, k, l, m, n,
            dataOffset,
            lastSequenceNumber,
            numSequences,
            totalDuration;

        numSequences = isoFile.getBoxes('moof').length;
        lastSequenceNumber = mfhdBoxes[mfhdBoxes.length - 1].sequence_number;
        sampleCount = 0;

        sampleList = [];
        let subsIndex = -1;
        let nextSubsSample = -1;
        for (l = 0; l < moofBoxes.length; l++) {
            var moofBox = moofBoxes[l];
            // zero or more trafs per moof
            var trafBoxes = moofBox.getChildBoxes('traf');
            for (j = 0; j < trafBoxes.length; j++) {
                var trafBox = trafBoxes[j];
                // exactly one tfhd per traf
                var tfhdBox = trafBox.getChildBox('tfhd');
                // zero or one tfdt per traf
                var tfdtBox = trafBox.getChildBox('tfdt');
                sampleDts = tfdtBox.baseMediaDecodeTime;
                // zero or more truns per traf
                var trunBoxes = trafBox.getChildBoxes('trun');
                // zero or more subs per traf
                var subsBoxes = trafBox.getChildBoxes('subs');
                for (k = 0; k < trunBoxes.length; k++) {
                    var trunBox = trunBoxes[k];
                    sampleCount = trunBox.sample_count;
                    dataOffset = (tfhdBox.base_data_offset || 0) + (trunBox.data_offset || 0);

                    for (i = 0; i < sampleCount; i++) {
                        sample = trunBox.samples[i];
                        sampleDuration = (sample.sample_duration !== undefined) ? sample.sample_duration : tfhdBox.default_sample_duration;
                        sampleSize = (sample.sample_size !== undefined) ? sample.sample_size : tfhdBox.default_sample_size;
                        sampleCompositionTimeOffset = (sample.sample_composition_time_offset !== undefined) ? sample.sample_composition_time_offset : 0;
                        let sampleData = {
                            'dts': sampleDts,
                            'cts': (sampleDts + sampleCompositionTimeOffset),
                            'duration': sampleDuration,
                            'offset': moofBox.offset + dataOffset,
                            'size': sampleSize,
                            'subSizes': [sampleSize]
                        };
                        if (subsBoxes) {
                            for (m = 0; m < subsBoxes.length; m++) {
                                var subsBox = subsBoxes[m];
                                if (subsIndex < subsBox.entry_count && i > nextSubsSample) {
                                    subsIndex++;
                                    nextSubsSample += subsBox.entries[subsIndex].sample_delta;
                                }
                                if (i == nextSubsSample) {
                                    sampleData.subSizes = [];
                                    let entry = subsBox.entries[subsIndex];
                                    for (n = 0; n < entry.subsample_count; n++) {
                                        sampleData.subSizes.push(entry.subsamples[j].subsample_size);
                                    }
                                }
                            }
                        }
                        sampleList.push(sampleData);
                        dataOffset += sampleSize;
                        sampleDts += sampleDuration;
                    }
                }
                totalDuration = sampleDts - tfdtBox.baseMediaDecodeTime;
            }
        }
        return {sampleList: sampleList, lastSequenceNumber: lastSequenceNumber, totalDuration: totalDuration, numSequences: numSequences};
    }

    function getMediaTimescaleFromMoov(ab) {
        let isoFile = boxParser.parse(ab);
        let mdhdBox = isoFile.getBox('mdhd');

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
