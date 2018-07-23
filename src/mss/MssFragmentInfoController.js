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

import MssEvents from './MssEvents';
import MSSFragmentMoofProcessor from './MssFragmentMoofProcessor';

function MssFragmentInfoController(config) {

    config = config || {};
    const context = this.context;

    let instance;
    let logger;
    let fragmentModel;
    let indexHandler;
    let started;
    let type;
    let bufferTimeout;
    let _fragmentInfoTime;
    let startFragmentInfoDate;
    let startTimeStampValue;
    let deltaTime;
    let segmentDuration;

    const streamProcessor = config.streamProcessor;
    const eventBus = config.eventBus;
    const metricsModel = config.metricsModel;
    const playbackController = config.playbackController;
    const ISOBoxer = config.ISOBoxer;
    const debug = config.debug;
    const controllerType = 'MssFragmentInfoController';

    function setup() {
        logger = debug.getLogger(instance);
    }

    function initialize() {
        started = false;

        startFragmentInfoDate = null;
        startTimeStampValue = null;
        deltaTime = 0;
        segmentDuration = NaN;

        // register to stream processor as external controller
        streamProcessor.registerExternalController(instance);
        type = streamProcessor.getType();
        fragmentModel = streamProcessor.getFragmentModel();
        indexHandler = streamProcessor.getIndexHandler();
    }

    function getCurrentRepresentation() {
        const representationController = streamProcessor.getRepresentationController();
        const representation = representationController.getCurrentRepresentation();

        return representation;
    }

    function sendRequest(request) {
        fragmentModel.executeRequest(request);
    }

    function asFragmentInfoRequest(request) {
        if (request && request.url) {
            request.url = request.url.replace('Fragments', 'FragmentInfo');
            request.type = 'FragmentInfoSegment';
        }

        return request;
    }

    function onFragmentRequest(request) {
        // Check if current request signals end of stream
        if ((request !== null) && (request.action === request.ACTION_COMPLETE)) {
            doStop();
            return;
        }

        if (request !== null) {
            _fragmentInfoTime = request.startTime + request.duration;
            request = asFragmentInfoRequest(request);

            if (streamProcessor.getFragmentModel().isFragmentLoadedOrPending(request)) {
                request = indexHandler.getNextSegmentRequest(getCurrentRepresentation());
                onFragmentRequest(request);
                return;
            }

            logger.debug('onFragmentRequest ' + request.url);

            // Download the fragment info segment
            sendRequest(request);
        } else {
            // No more fragment in current list
            logger.debug('bufferFragmentInfo failed');
        }
    }

    function bufferFragmentInfo() {
        let segmentTime;

        // Check if running state
        if (!started) {
            return;
        }

        logger.debug('Start buffering process...');

        // Get next segment time
        segmentTime = _fragmentInfoTime;

        logger.debug('LoadNextFragment for time: ' + segmentTime);

        const representation = getCurrentRepresentation();
        const request = indexHandler.getSegmentRequestForTime(representation, segmentTime);
        onFragmentRequest(request);
    }

    function delayLoadNextFragmentInfo(delay) {
        const delayMs = Math.round(Math.min((delay * 1000), 2000));

        logger.debug('Check buffer delta = ' + delayMs + ' ms');

        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(function () {
            bufferTimeout = null;
            bufferFragmentInfo();
        }, delayMs);
    }

    function onFragmentInfoLoadedCompleted(e) {
        if (e.streamProcessor !== streamProcessor) {
            return;
        }

        const request = e.fragmentInfo.request;
        let deltaDate,
            deltaTimeStamp;


        if (!e.fragmentInfo.response) {
            logger.error('Load error', request.url);
            return;
        }

        segmentDuration = request.duration;
        logger.debug('FragmentInfo loaded ', request.url);
        try {
            // update segment list
            const mssFragmentMoofProcessor = MSSFragmentMoofProcessor(context).create({
                metricsModel: metricsModel,
                playbackController: playbackController,
                ISOBoxer: ISOBoxer,
                debug: debug
            });
            mssFragmentMoofProcessor.updateSegmentList(e.fragmentInfo, streamProcessor);

            deltaDate = (new Date().getTime() - startFragmentInfoDate) / 1000;
            deltaTimeStamp = (_fragmentInfoTime + segmentDuration) - startTimeStampValue;
            deltaTime = (deltaTimeStamp - deltaDate) > 0 ? (deltaTimeStamp - deltaDate) : 0;
            delayLoadNextFragmentInfo(deltaTime);
        } catch (e) {
            logger.fatal('Internal error while processing fragment info segment ');
        }
    }

    function startPlayback() {
        if (!started) {
            return;
        }

        startFragmentInfoDate = new Date().getTime();
        startTimeStampValue = _fragmentInfoTime;

        logger.debug('startPlayback');

        // Start buffering process
        bufferFragmentInfo.call(this);
    }

    function doStart() {
        let segments;

        if (started === true) {
            return;
        }

        eventBus.on(MssEvents.FRAGMENT_INFO_LOADING_COMPLETED, onFragmentInfoLoadedCompleted, instance);

        started = true;
        logger.debug('Do start');

        let representation = getCurrentRepresentation();
        segments = representation.segments;

        if (segments && segments.length > 0) {
            _fragmentInfoTime = segments[segments.length - 1].presentationStartTime - segments[segments.length - 1].duration;

            startPlayback();
        } else {
            indexHandler.updateSegmentList(representation);
            segments = representation.segments;
            if (segments && segments.length > 0) {
                _fragmentInfoTime = segments[segments.length - 1].presentationStartTime - segments[segments.length - 1].duration;
            }

            startPlayback();
        }
    }

    function doStop() {
        if (!started) {
            return;
        }
        logger.debug('Do stop');

        eventBus.off(MssEvents.FRAGMENT_INFO_LOADING_COMPLETED, onFragmentInfoLoadedCompleted, instance);

        // Stop buffering process
        clearTimeout(bufferTimeout);
        started = false;

        startFragmentInfoDate = null;
        startTimeStampValue = null;
    }

    function getType() {
        return type;
    }

    function reset() {
        doStop();
        streamProcessor.unregisterExternalController(instance);
    }

    instance = {
        initialize: initialize,
        controllerType: controllerType,
        start: doStart,
        getType: getType,
        reset: reset
    };

    setup();

    return instance;
}

MssFragmentInfoController.__dashjs_factory_name = 'MssFragmentInfoController';
export default dashjs.FactoryMaker.getClassFactory(MssFragmentInfoController); /* jshint ignore:line */
