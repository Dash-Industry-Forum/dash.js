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
import DashJSError from '../streaming/vo/DashJSError';
import MssErrors from './errors/MssErrors';

import Events from '../streaming/MediaPlayerEvents';

/**
 * @module MssFragmentMoofProcessor
 * @ignore
 * @param {Object} config object
 */
function MssFragmentMoofProcessor(config) {

    config = config || {};
    let instance,
        type,
        logger;
    const dashMetrics = config.dashMetrics;
    const playbackController = config.playbackController;
    const errorHandler = config.errHandler;
    const eventBus = config.eventBus;
    const ISOBoxer = config.ISOBoxer;
    const debug = config.debug;

    function setup() {
        logger = debug.getLogger(instance);
        type = '';
    }

    function processTfrf(request, tfrf, tfdt, streamProcessor) {
        const representationController = streamProcessor.getRepresentationController();
        const representation = representationController.getCurrentRepresentation();

        const manifest = representation.adaptation.period.mpd.manifest;
        const adaptation = manifest.Period_asArray[representation.adaptation.period.index].AdaptationSet_asArray[representation.adaptation.index];
        const timescale = adaptation.SegmentTemplate.timescale;

        type = streamProcessor.getType();

        if (manifest.type !== 'dynamic' && !manifest.timeShiftBufferDepth) {
            return;
        }

        if (!tfrf) {
            errorHandler.error(new DashJSError(MssErrors.MSS_NO_TFRF_CODE, MssErrors.MSS_NO_TFRF_MESSAGE));
            return;
        }

        // Get adaptation's segment timeline (always a SegmentTimeline in Smooth Streaming use case)
        const segments = adaptation.SegmentTemplate.SegmentTimeline.S;
        const entries = tfrf.entry;
        let entry,
            segmentTime,
            range;
        let segment = null;
        let t = 0;
        let availabilityStartTime = null;

        if (entries.length === 0) {
            return;
        }

        // Consider only first tfrf entry (to avoid pre-condition failure on fragment info requests)
        entry = entries[0];

        // In case of start-over streams, check if we have reached end of original manifest duration (set in timeShiftBufferDepth)
        // => then do not update anymore timeline
        if (manifest.type === 'static') {
            // Get first segment time
            segmentTime = segments[0].tManifest ? parseFloat(segments[0].tManifest) : segments[0].t;
            if (entry.fragment_absolute_time > (segmentTime + (manifest.timeShiftBufferDepth * timescale))) {
                return;
            }
        }

        logger.debug('entry - t = ', (entry.fragment_absolute_time / timescale));

        // Get last segment time
        segmentTime = segments[segments.length - 1].tManifest ? parseFloat(segments[segments.length - 1].tManifest) : segments[segments.length - 1].t;
        logger.debug('Last segment - t = ', (segmentTime / timescale));

        // Check if we have to append new segment to timeline
        if (entry.fragment_absolute_time <= segmentTime) {
            // Update DVR window range
            // => set range end to end time of current segment
            range = {
                start: segments[0].t / timescale,
                end: (tfdt.baseMediaDecodeTime / timescale) + request.duration
            };

            updateDVR(request.mediaType, range, streamProcessor.getStreamInfo().manifestInfo);
            return;
        }

        logger.debug('Add new segment - t = ', (entry.fragment_absolute_time / timescale));
        segment = {};
        segment.t = entry.fragment_absolute_time;
        segment.d = entry.fragment_duration;
        // If timestamps starts at 0 relative to 1st segment (dynamic to static) then update segment time
        if (segments[0].tManifest) {
            segment.t -= parseFloat(segments[0].tManifest) - segments[0].t;
            segment.tManifest = entry.fragment_absolute_time;
        }
        segments.push(segment);

        // In case of static start-over streams, update content duration
        if (manifest.type === 'static') {
            if (type === 'video') {
                segment = segments[segments.length - 1];
                var end = (segment.t + segment.d) / timescale;
                if (end > representation.adaptation.period.duration) {
                    eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, { sender: this, newDuration: end });
                }
            }
            return;
        }
        // In case of live streams, update segment timeline according to DVR window
        else if (manifest.timeShiftBufferDepth && manifest.timeShiftBufferDepth > 0) {
            // Get timestamp of the last segment
            segment = segments[segments.length - 1];
            t = segment.t;

            // Determine the segments' availability start time
            availabilityStartTime = Math.round((t - (manifest.timeShiftBufferDepth * timescale)) / timescale);

            // Remove segments prior to availability start time
            segment = segments[0];
            while (Math.round(segment.t / timescale) < availabilityStartTime) {
                logger.debug('Remove segment  - t = ' + (segment.t / timescale));
                segments.splice(0, 1);
                segment = segments[0];
            }

            // Update DVR window range => set range end to end time of current segment
            range = {
                start: segments[0].t / timescale,
                end: (tfdt.baseMediaDecodeTime / timescale) + request.duration
            };

            updateDVR(type, range, streamProcessor.getStreamInfo().manifestInfo);
        }

        representationController.updateRepresentation(representation, true);
    }

    function updateDVR(type, range, manifestInfo) {
        const dvrInfos = dashMetrics.getCurrentDVRInfo(type);
        if (!dvrInfos || (range.end > dvrInfos.range.end)) {
            logger.debug('Update DVR Infos [' + range.start + ' - ' + range.end + ']');
            dashMetrics.addDVRInfo(type, playbackController.getTime(), manifestInfo, range);
        }
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
        const isoFile = ISOBoxer.parseBuffer(e.response);
        // Update track_Id in tfhd box
        const tfhd = isoFile.fetch('tfhd');
        tfhd.track_ID = e.request.mediaInfo.index + 1;

        // Add tfdt box
        let tfdt = isoFile.fetch('tfdt');
        const traf = isoFile.fetch('traf');
        if (tfdt === null) {
            tfdt = ISOBoxer.createFullBox('tfdt', traf, tfhd);
            tfdt.version = 1;
            tfdt.flags = 0;
            tfdt.baseMediaDecodeTime = Math.floor(e.request.startTime * e.request.timescale);
        }

        const trun = isoFile.fetch('trun');

        // Process tfxd boxes
        // This box provide absolute timestamp but we take the segment start time for tfdt
        let tfxd = isoFile.fetch('tfxd');
        if (tfxd) {
            tfxd._parent.boxes.splice(tfxd._parent.boxes.indexOf(tfxd), 1);
            tfxd = null;
        }
        let tfrf = isoFile.fetch('tfrf');
        processTfrf(e.request, tfrf, tfdt, sp);
        if (tfrf) {
            tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf), 1);
            tfrf = null;
        }

        // If protected content in PIFF1.1 format (sepiff box = Sample Encryption PIFF)
        // => convert sepiff box it into a senc box
        // => create saio and saiz boxes (if not already present)
        const sepiff = isoFile.fetch('sepiff');
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

                const saiz = ISOBoxer.createFullBox('saiz', traf);
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
        const moof = isoFile.fetch('moof');
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
            throw new Error('e.response parameter is missing');
        }

        const isoFile = ISOBoxer.parseBuffer(e.response);
        // Update track_Id in tfhd box
        const tfhd = isoFile.fetch('tfhd');
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
        processTfrf(e.request, tfrf, tfdt, sp);
        if (tfrf) {
            tfrf._parent.boxes.splice(tfrf._parent.boxes.indexOf(tfrf), 1);
            tfrf = null;
        }
    }

    function getType() {
        return type;
    }

    instance = {
        convertFragment: convertFragment,
        updateSegmentList: updateSegmentList,
        getType: getType
    };

    setup();
    return instance;
}

MssFragmentMoofProcessor.__dashjs_factory_name = 'MssFragmentMoofProcessor';
export default dashjs.FactoryMaker.getClassFactory(MssFragmentMoofProcessor); /* jshint ignore:line */
