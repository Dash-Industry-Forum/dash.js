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
 * @module MssFragmentMoovProcessor
 * @param {Object} config object
 */
function MssFragmentMoofProcessor(config) {

    config = config || {};
    let instance;
    let metricsModel = config.metricsModel;
    let playbackController = config.playbackController;
    const ISOBoxer = config.ISOBoxer;
    const log = config.log;

    function setup() {
    }

    function processTfrf(request, tfrf, tfdt, streamProcessor) {
        let representationController = streamProcessor.getRepresentationController();
        let representation = representationController.getCurrentRepresentation();
        let indexHandler = streamProcessor.getIndexHandler();

        let manifest = representation.adaptation.period.mpd.manifest;
        let adaptation = manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index];

        let segmentsUpdated = false;
        // Get adaptation's segment timeline (always a SegmentTimeline in Smooth Streaming use case)
        let segments = adaptation.SegmentTemplate.SegmentTimeline.S;
        let entries = tfrf.entry;
        let fragment_absolute_time = 0;
        let fragment_duration = 0;
        let segment = null;
        let t = 0;
        let i = 0;
        let j = 0;
        let segmentId = -1;
        let availabilityStartTime = null;
        let range;

        if (manifest.type !== 'dynamic') {
            return false;
        }

        // Go through tfrf entries
        while (i < entries.length) {
            fragment_absolute_time = entries[i].fragment_absolute_time;
            fragment_duration = entries[i].fragment_duration;

            // Get timestamp of the last segment
            segment = segments[segments.length - 1];
            t = segment.t;

            if (fragment_absolute_time > t) {
                log('[MssFragmentMoofProcessor]Add new segment - t = ' + (fragment_absolute_time / 10000000.0));
                segments.push({
                    t: fragment_absolute_time,
                    d: fragment_duration
                });
                segmentsUpdated = true;
            }

            i += 1;
        }

        for (j = segments.length - 1; j >= 0; j -= 1) {
            if (segments[j].t === tfdt.baseMediaDecodeTime) {
                segmentId = j;
                break;
            }
        }

        if (segmentId >= 0) {
            for (i = 0; i < entries.length; i += 1) {
                if (segmentId + i < segments.length) {
                    t = segments[segmentId + i].t;
                    if ((t + segments[segmentId + i].d) !== entries[i].fragment_absolute_time) {
                        segments[segmentId + i].t = entries[i].fragment_absolute_time;
                        segments[segmentId + i].d = entries[i].fragment_duration;
                        log('[MssFragmentMoofProcessor]Correct tfrf time  = ' + entries[i].fragment_absolute_time + 'and duration = ' + entries[i].fragment_duration + '! ********');
                        segmentsUpdated = true;
                    }
                }
            }
        }

        //
        if (manifest.timeShiftBufferDepth && manifest.timeShiftBufferDepth > 0) {
            if (segmentsUpdated) {
                // Get timestamp of the last segment
                segment = segments[segments.length - 1];
                t = segment.t;

                // Determine the segments' availability start time
                availabilityStartTime = t - (manifest.timeShiftBufferDepth * 10000000);

                // Remove segments prior to availability start time
                segment = segments[0];
                while (segment.t < availabilityStartTime) {
                    log('[MssFragmentMoofProcessor]Remove segment  - t = ' + (segment.t / 10000000.0));
                    segments.splice(0, 1);
                    segment = segments[0];
                }
            }

            // Update DVR window range
            // => set range end to end time of current segment
            range = {
                start: segments[0].t / adaptation.SegmentTemplate.timescale,
                end: (tfdt.baseMediaDecodeTime / adaptation.SegmentTemplate.timescale) + request.duration
            };

            var dvrInfos = metricsModel.getMetricsFor(request.mediaType).DVRInfo;
            if (dvrInfos) {
                if (dvrInfos.length === 0 || (dvrInfos.length > 0 && range.end > dvrInfos[dvrInfos.length - 1].range.end)) {
                    log('[MssFragmentMoofProcessor][' + request.mediaType + '] Update DVR Infos [' + range.start + ' - ' + range.end + ']');
                    metricsModel.addDVRInfo(request.mediaType, playbackController.getTime(), streamProcessor.getStreamInfo().manifestInfo, range);
                }
            }
        }

        if (segmentsUpdated) {
            indexHandler.updateSegmentList(representation);
        }
        return segmentsUpdated;
    }

    // This function returns the offset of the 1st byte of a child box within a container box
    function getBoxOffset(parent, type) {
        let offset = 8;
        let i = 0;

        for (i = 0; i < parent.boxes.length; i++) {
            if (parent.boxes[i].type === type) {
                return offset;
            }
            offset += parent.boxes[i].size;
        }
        return offset;
    }

    function convertFragment(e, sp) {

        let i;

        // e.request contains request description object
        // e.response contains fragment bytes
        if (!e.response) {
            return;
        }
        let isoFile = ISOBoxer.parseBuffer(e.response);
        // Update track_Id in tfhd box
        let tfhd = isoFile.fetch('tfhd');
        tfhd.track_ID = e.request.mediaInfo.index + 1;

        // Add tfdt box
        let tfdt = isoFile.fetch('tfdt');
        let traf = isoFile.fetch('traf');
        if (tfdt === null) {
            tfdt = ISOBoxer.createFullBox('tfdt', traf, tfhd);
            tfdt.version = 1;
            tfdt.flags = 0;
            tfdt.baseMediaDecodeTime = Math.floor(e.request.startTime * e.request.timescale);
        }

        let trun = isoFile.fetch('trun');

        // Process tfxd boxes
        // This box provide absolute timestamp but we take the segment start time for tfdt
        let tfxd = isoFile.fetch('tfxd');
        if (tfxd) {
            tfxd._parent.boxes.splice(tfxd._parent.boxes.indexOf(tfxd), 1);
            tfxd = null;
        }
        let tfrf = isoFile.fetch('tfrf');
        if (tfrf) {
            processTfrf(e.request, tfrf, tfdt, sp);
            tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf), 1);
            tfrf = null;
        }

        // If protected content in PIFF1.1 format (sepiff box = Sample Encryption PIFF)
        // => convert sepiff box it into a senc box
        // => create saio and saiz boxes (if not already present)
        let sepiff = isoFile.fetch('sepiff');
        if (sepiff !== null) {
            sepiff.type = 'senc';
            sepiff.usertype = undefined;

            let saio = isoFile.fetch('saio');
            if (saio === null) {
                // Create Sample Auxiliary Information Offsets Box box (saio)
                saio = ISOBoxer.createFullBox('saio', traf);
                saio.version = 0;
                saio.flags = 0;
                saio.entry_count = 1;
                saio.offset = [0];

                let saiz = ISOBoxer.createFullBox('saiz', traf);
                saiz.version = 0;
                saiz.flags = 0;
                saiz.sample_count = sepiff.sample_count;
                saiz.default_sample_info_size = 0;
                saiz.sample_info_size = [];

                if (sepiff.flags & 0x02) {
                    // Sub-sample encryption => set sample_info_size for each sample
                    for (i = 0; i < sepiff.sample_count; i += 1) {
                        // 10 = 8 (InitializationVector field size) + 2 (subsample_count field size)
                        // 6 = 2 (BytesOfClearData field size) + 4 (BytesOfEncryptedData field size)
                        saiz.sample_info_size[i] = 10 + (6 * sepiff.entry[i].NumberOfEntries);
                    }
                } else {
                    // No sub-sample encryption => set default sample_info_size = InitializationVector field size (8)
                    saiz.default_sample_info_size = 8;
                }
            }
        }

        tfhd.flags &= 0xFFFFFE; // set tfhd.base-data-offset-present to false
        tfhd.flags |= 0x020000; // set tfhd.default-base-is-moof to true
        trun.flags |= 0x000001; // set trun.data-offset-present to true

        // Update trun.data_offset field that corresponds to first data byte (inside mdat box)
        let moof = isoFile.fetch('moof');
        let length = moof.getLength();
        trun.data_offset = length + 8;

        // Update saio box offset field according to new senc box offset
        let saio = isoFile.fetch('saio');
        if (saio !== null) {
            let trafPosInMoof = getBoxOffset(moof, 'traf');
            let sencPosInTraf = getBoxOffset(traf, 'senc');
            // Set offset from begin fragment to the first IV field in senc box
            saio.offset[0] = trafPosInMoof + sencPosInTraf + 16; // 16 = box header (12) + sample_count field size (4)
        }

        // Write transformed/processed fragment into request reponse data
        e.response = isoFile.write();
    }

    function updateSegmentList(e, sp) {

        // e.request contains request description object
        // e.response contains fragment bytes
        if (!e.response) {
            return;
        }

        let isoFile = ISOBoxer.parseBuffer(e.response);
        // Update track_Id in tfhd box
        let tfhd = isoFile.fetch('tfhd');
        tfhd.track_ID = e.request.mediaInfo.index + 1;

        // Add tfdt box
        let tfdt = isoFile.fetch('tfdt');
        let traf = isoFile.fetch('traf');
        if (tfdt === null) {
            tfdt = ISOBoxer.createFullBox('tfdt', traf, tfhd);
            tfdt.version = 1;
            tfdt.flags = 0;
            tfdt.baseMediaDecodeTime = Math.floor(e.request.startTime * e.request.timescale);
        }

        let tfrf = isoFile.fetch('tfrf');
        if (tfrf) {
            processTfrf(e.request, tfrf, tfdt, sp);
            tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf), 1);
            tfrf = null;
        }
    }

    instance = {
        convertFragment: convertFragment,
        updateSegmentList: updateSegmentList
    };

    setup();
    return instance;
}

MssFragmentMoofProcessor.__dashjs_factory_name = 'MssFragmentMoofProcessor';
export default dashjs.FactoryMaker.getClassFactory(MssFragmentMoofProcessor); /* jshint ignore:line */
