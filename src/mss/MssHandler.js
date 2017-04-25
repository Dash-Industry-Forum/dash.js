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

import Events from '../core/events/Events';
import MediaPlayerEvents from '../streaming/MediaPlayerEvents';
import EventBus from '../core/EventBus';
import FactoryMaker from '../core/FactoryMaker';
import DataChunk from '../streaming/vo/DataChunk';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';
import MssFragmentProcessor from './MssFragmentProcessor';
import MssParser from './parser/MssParser';

function MssHandler(config) {

    let context = this.context;
    let eventBus = config.eventBus;
    let mssFragmentProcessor = MssFragmentProcessor(context).create();
    let mssParser;

    let instance;

    function setup() {
    }

    function onInitializationRequested(e) {
        let streamProcessor = e.sender.getStreamProcessor();
        let request = new FragmentRequest();
        let representationController = streamProcessor.getRepresentationController();
        let representation = representationController.getCurrentRepresentation();
        let period,
            presentationStartTime;

        period = representation.adaptation.period;

        request.mediaType = representation.adaptation.type;
        request.type = HTTPRequest.INIT_SEGMENT_TYPE;
        request.range = representation.range;
        presentationStartTime = period.start;
        //request.availabilityStartTime = timelineConverter.calcAvailabilityStartTimeFromPresentationTime(presentationStartTime, representation.adaptation.period.mpd, isDynamic);
        //request.availabilityEndTime = timelineConverter.calcAvailabilityEndTimeFromPresentationTime(presentationStartTime + period.duration, period.mpd, isDynamic);
        request.quality = representation.index;
        request.mediaInfo = streamProcessor.getMediaInfo();
        request.representationId = representation.id;

        const chunk = createDataChunk(request, streamProcessor.getStreamInfo().id);

        // Generate initialization segment (moov)
        chunk.bytes = mssFragmentProcessor.generateMoov(representation);

        eventBus.trigger(Events.INIT_FRAGMENT_LOADED, {chunk: chunk, fragmentModel: streamProcessor.getFragmentModel()});

        // Change the sender value to stop event to be propagated
        e.sender = null;
    }

    function createDataChunk(request, streamId) {
        const chunk = new DataChunk();

        chunk.streamId = streamId;
        chunk.mediaInfo = request.mediaInfo;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.index = request.index;
        chunk.quality = request.quality;
        chunk.representationId = request.representationId;

        return chunk;
    }


    function onSegmentMediaLoaded(e) {
        // Process moof to transcode it from MSS to DASH
        mssFragmentProcessor.processMoof(e);
    }

    function registerEvents() {
        eventBus.on(Events.INIT_REQUESTED, onInitializationRequested, instance, EventBus.EVENT_PRIORITY_HIGH);
        eventBus.on(MediaPlayerEvents.FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, instance, EventBus.EVENT_PRIORITY_HIGH);
    }

    function reset() {
        eventBus.off(Events.INIT_REQUESTED, onInitializationRequested, this);
        eventBus.off(MediaPlayerEvents.FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, this);
    }

    function createMssParser() {
        mssParser = MssParser(context).create(config);
        return mssParser;
    }

    instance = {
        reset: reset,
        createMssParser: createMssParser,
        registerEvents: registerEvents
    };

    setup();

    return instance;
}

MssHandler.__dashjs_factory_name = 'MssHandler';
let factory = FactoryMaker.getClassFactory(MssHandler);
export default factory;
