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

import DataChunk from '../streaming/vo/DataChunk';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import MssFragmentInfoController from './MssFragmentInfoController';
import MssFragmentProcessor from './MssFragmentProcessor';
import MssParser from './parser/MssParser';
import MssErrors from './errors/MssErrors';
import DashJSError from '../streaming/vo/DashJSError';
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';

function MssHandler(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const constants = config.constants;
    const initSegmentType = config.initSegmentType;
    const dashMetrics = config.dashMetrics;
    const playbackController = config.playbackController;
    const streamController = config.streamController;
    const protectionController = config.protectionController;
    const mssFragmentProcessor = MssFragmentProcessor(context).create({
        dashMetrics: dashMetrics,
        playbackController: playbackController,
        protectionController: protectionController,
        streamController: streamController,
        eventBus: eventBus,
        constants: constants,
        ISOBoxer: config.ISOBoxer,
        debug: config.debug,
        errHandler: config.errHandler
    });
    let mssParser,
        fragmentInfoControllers,
        instance;

    function setup() {
        fragmentInfoControllers = [];
    }

    function getStreamProcessor(type) {
        return streamController.getActiveStreamProcessors().filter(processor => {
            return processor.getType() === type;
        })[0];
    }

    function getFragmentInfoController(type) {
        return fragmentInfoControllers.filter(controller => {
            return (controller.getType() === type);
        })[0];
    }

    function createDataChunk(request, streamId, endFragment) {
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
        chunk.endFragment = endFragment;

        return chunk;
    }

    function startFragmentInfoControllers() {

        // Create MssFragmentInfoControllers for each StreamProcessor of active stream (only for audio, video or text)
        let processors = streamController.getActiveStreamProcessors();
        processors.forEach(function (processor) {
            if (processor.getType() === constants.VIDEO ||
                processor.getType() === constants.AUDIO ||
                processor.getType() === constants.TEXT) {

                let fragmentInfoController = getFragmentInfoController(processor.getType());
                if (!fragmentInfoController) {
                    fragmentInfoController = MssFragmentInfoController(context).create({
                        streamProcessor: processor,
                        baseURLController: config.baseURLController,
                        debug: config.debug
                    });
                    fragmentInfoController.initialize();
                    fragmentInfoControllers.push(fragmentInfoController);
                }
                fragmentInfoController.start();
            }
        });
    }

    function stopFragmentInfoControllers() {
        fragmentInfoControllers.forEach(c => {
            c.reset();
        });
        fragmentInfoControllers = [];
    }

    function onInitFragmentNeeded(e) {
        let streamProcessor = getStreamProcessor(e.mediaType);
        if (!streamProcessor) return;

        // Create init segment request
        let representationController = streamProcessor.getRepresentationController();
        let representation = representationController.getCurrentRepresentation();
        let mediaInfo = streamProcessor.getMediaInfo();

        let request = new FragmentRequest();
        request.mediaType = representation.adaptation.type;
        request.type = initSegmentType;
        request.range = representation.range;
        request.quality = representation.index;
        request.mediaInfo = mediaInfo;
        request.representationId = representation.id;

        const chunk = createDataChunk(request, mediaInfo.streamInfo.id, e.type !== events.FRAGMENT_LOADING_PROGRESS);

        try {
            // Generate init segment (moov)
            chunk.bytes = mssFragmentProcessor.generateMoov(representation);

            // Notify init segment has been loaded
            eventBus.trigger(events.INIT_FRAGMENT_LOADED,
                { chunk: chunk },
                { streamId: mediaInfo.streamInfo.id, mediaType: representation.adaptation.type }
            );
        } catch (e) {
            config.errHandler.error(new DashJSError(e.code, e.message, e.data));
        }

        // Change the sender value to stop event to be propagated
        e.sender = null;
    }

    function onSegmentMediaLoaded(e) {
        if (e.error)  return;

        let streamProcessor = getStreamProcessor(e.request.mediaType);
        if (!streamProcessor) return;

        // Process moof to transcode it from MSS to DASH (or to update segment timeline for SegmentInfo fragments)
        mssFragmentProcessor.processFragment(e, streamProcessor);

        if (e.request.type === HTTPRequest.MSS_FRAGMENT_INFO_SEGMENT_TYPE) {
            // If FragmentInfo loaded, then notify corresponding MssFragmentInfoController
            let fragmentInfoController = getFragmentInfoController(e.request.mediaType);
            if (fragmentInfoController) {
                fragmentInfoController.fragmentInfoLoaded(e);
            }
        }

        // Start MssFragmentInfoControllers in case of start-over streams
        let manifestInfo = e.request.mediaInfo.streamInfo.manifestInfo;
        if (!manifestInfo.isDynamic && manifestInfo.dvrWindowSize !== Infinity) {
            startFragmentInfoControllers();
        }
    }

    function onPlaybackPaused() {
        if (playbackController.getIsDynamic() && playbackController.getTime() !== 0) {
            startFragmentInfoControllers();
        }
    }

    function onPlaybackSeekAsked() {
        if (playbackController.getIsDynamic() && playbackController.getTime() !== 0) {
            startFragmentInfoControllers();
        }
    }

    function onTTMLPreProcess(ttmlSubtitles) {
        if (!ttmlSubtitles || !ttmlSubtitles.data) {
            return;
        }

        ttmlSubtitles.data = ttmlSubtitles.data.replace(/http:\/\/www.w3.org\/2006\/10\/ttaf1/gi, 'http://www.w3.org/ns/ttml');
    }

    function registerEvents() {
        eventBus.on(events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded, instance, { priority: dashjs.FactoryMaker.getSingletonFactoryByName(eventBus.getClassName()).EVENT_PRIORITY_HIGH }); /* jshint ignore:line */
        eventBus.on(events.PLAYBACK_PAUSED, onPlaybackPaused, instance, { priority: dashjs.FactoryMaker.getSingletonFactoryByName(eventBus.getClassName()).EVENT_PRIORITY_HIGH }); /* jshint ignore:line */
        eventBus.on(events.PLAYBACK_SEEK_ASKED, onPlaybackSeekAsked, instance, { priority: dashjs.FactoryMaker.getSingletonFactoryByName(eventBus.getClassName()).EVENT_PRIORITY_HIGH }); /* jshint ignore:line */
        eventBus.on(events.FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, instance, { priority: dashjs.FactoryMaker.getSingletonFactoryByName(eventBus.getClassName()).EVENT_PRIORITY_HIGH }); /* jshint ignore:line */
        eventBus.on(events.TTML_TO_PARSE, onTTMLPreProcess, instance);
    }

    function reset() {
        if (mssParser) {
            mssParser.reset();
            mssParser = undefined;
        }

        eventBus.off(events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded, this);
        eventBus.off(events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(events.PLAYBACK_SEEK_ASKED, onPlaybackSeekAsked, this);
        eventBus.off(events.FRAGMENT_LOADING_COMPLETED, onSegmentMediaLoaded, this);
        eventBus.off(events.TTML_TO_PARSE, onTTMLPreProcess, this);

        // Reset FragmentInfoControllers
        stopFragmentInfoControllers();
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
const factory = dashjs.FactoryMaker.getClassFactory(MssHandler); /* jshint ignore:line */
factory.errors = MssErrors;
dashjs.FactoryMaker.updateClassFactory(MssHandler.__dashjs_factory_name, factory); /* jshint ignore:line */
export default factory; /* jshint ignore:line */
