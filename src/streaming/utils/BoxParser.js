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

import Debug from '../../core/Debug';
import IsoFile from './IsoFile';
import FactoryMaker from '../../core/FactoryMaker';
import ISOBoxer from 'codem-isoboxer';

import IsoBoxSearchInfo from '../vo/IsoBoxSearchInfo';

function BoxParser(/*config*/) {

    let logger,
        instance;
    let context = this.context;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    /**
     * @param {ArrayBuffer} data
     * @returns {IsoFile|null}
     * @memberof BoxParser#
     */
    function parse(data) {
        if (!data) return null;

        if (data.fileStart === undefined) {
            data.fileStart = 0;
        }

        let parsedFile = ISOBoxer.parseBuffer(data);
        let dashIsoFile = IsoFile(context).create();

        dashIsoFile.setData(parsedFile);

        return dashIsoFile;
    }

    /**
     * From the list of type boxes to look for, returns the latest one that is fully completed (header + payload). This
     * method only looks into the list of top boxes and doesn't analyze nested boxes.
     * @param {string[]} types
     * @param {ArrayBuffer|uint8Array} buffer
     * @param {number} offset
     * @returns {IsoBoxSearchInfo}
     * @memberof BoxParser#
     */
    function findLastTopIsoBoxCompleted(types, buffer, offset) {
        if (offset === undefined) {
            offset = 0;
        }

        // 8 = size (uint32) + type (4 characters)
        if (!buffer || offset + 8 >= buffer.byteLength) {
            return new IsoBoxSearchInfo(0, false);
        }

        const data = (buffer instanceof ArrayBuffer) ? new Uint8Array(buffer) : buffer;
        let boxInfo;
        let lastCompletedOffset = 0;
        while (offset < data.byteLength) {
            const boxSize = parseUint32(data, offset);
            const boxType = parseIsoBoxType(data, offset + 4);

            if (boxSize === 0) {
                break;
            }

            if (offset + boxSize <= data.byteLength) {
                if (types.indexOf(boxType) >= 0) {
                    boxInfo = new IsoBoxSearchInfo(offset, true, boxSize);
                } else {
                    lastCompletedOffset = offset + boxSize;
                }
            }

            offset += boxSize;
        }

        if (!boxInfo) {
            return new IsoBoxSearchInfo(lastCompletedOffset, false);
        }

        return boxInfo;
    }

    function getSamplesInfo(ab) {
        if (!ab || ab.byteLength === 0) {
            return {sampleList: [], lastSequenceNumber: NaN, totalDuration: NaN, numSequences: NaN};
        }
        let isoFile = parse(ab);
        // zero or more moofs
        let moofBoxes = isoFile.getBoxes('moof');
        // exactly one mfhd per moof
        let mfhdBoxes = isoFile.getBoxes('mfhd');

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
            let moofBox = moofBoxes[l];
            // zero or more trafs per moof
            let trafBoxes = moofBox.getChildBoxes('traf');
            for (j = 0; j < trafBoxes.length; j++) {
                let trafBox = trafBoxes[j];
                // exactly one tfhd per traf
                let tfhdBox = trafBox.getChildBox('tfhd');
                // zero or one tfdt per traf
                let tfdtBox = trafBox.getChildBox('tfdt');
                sampleDts = tfdtBox.baseMediaDecodeTime;
                // zero or more truns per traf
                let trunBoxes = trafBox.getChildBoxes('trun');
                // zero or more subs per traf
                let subsBoxes = trafBox.getChildBoxes('subs');
                for (k = 0; k < trunBoxes.length; k++) {
                    let trunBox = trunBoxes[k];
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
                                let subsBox = subsBoxes[m];
                                if (subsIndex < (subsBox.entry_count - 1) && i > nextSubsSample) {
                                    subsIndex++;
                                    nextSubsSample += subsBox.entries[subsIndex].sample_delta;
                                }
                                if (i == nextSubsSample) {
                                    sampleData.subSizes = [];
                                    let entry = subsBox.entries[subsIndex];
                                    for (n = 0; n < entry.subsample_count; n++) {
                                        sampleData.subSizes.push(entry.subsamples[n].subsample_size);
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
        let isoFile = parse(ab);
        let mdhdBox = isoFile ? isoFile.getBox('mdhd') : undefined;

        return mdhdBox ? mdhdBox.timescale : NaN;
    }

    function parseUint32(data, offset) {
        return data[offset + 3] >>> 0 |
            (data[offset + 2] << 8) >>> 0 |
            (data[offset + 1] << 16) >>> 0 |
            (data[offset] << 24) >>> 0;
    }

    function parseIsoBoxType(data, offset) {
        return String.fromCharCode(data[offset++]) +
            String.fromCharCode(data[offset++]) +
            String.fromCharCode(data[offset++]) +
            String.fromCharCode(data[offset]);
    }

    function findInitRange(data) {
        let initRange = null;
        let start,
            end;

        const isoFile = parse(data);

        if (!isoFile) {
            return initRange;
        }

        const ftyp = isoFile.getBox('ftyp');
        const moov = isoFile.getBox('moov');

        logger.debug('Searching for initialization.');

        if (moov && moov.isComplete) {
            start = ftyp ? ftyp.offset : moov.offset;
            end = moov.offset + moov.size - 1;
            initRange = start + '-' + end;

            logger.debug('Found the initialization.  Range: ' + initRange);
        }

        return initRange;
    }

    instance = {
        parse: parse,
        findLastTopIsoBoxCompleted: findLastTopIsoBoxCompleted,
        getMediaTimescaleFromMoov: getMediaTimescaleFromMoov,
        getSamplesInfo: getSamplesInfo,
        findInitRange: findInitRange
    };

    setup();

    return instance;
}
BoxParser.__dashjs_factory_name = 'BoxParser';
export default FactoryMaker.getSingletonFactory(BoxParser);
