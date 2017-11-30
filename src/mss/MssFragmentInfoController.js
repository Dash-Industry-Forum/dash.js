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
    let context = this.context;

    let instance;
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

    let streamProcessor = config.streamProcessor;
    let eventBus = config.eventBus;
    let metricsModel = config.metricsModel;
    let playbackController = config.playbackController;
    const ISOBoxer = config.ISOBoxer;
    const log = config.log;

    const controllerType = 'MssFragmentInfoController';

    function setup() {
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
        let representationController = streamProcessor.getRepresentationController();
        let representation = representationController.getCurrentRepresentation();

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

            log('[FragmentInfoController][' + type + '] onFragmentRequest ' + request.url);

            // Download the fragment info segment
            sendRequest(request);
        } else {
            // No more fragment in current list
            log('[FragmentInfoController][' + type + '] bufferFragmentInfo failed');
        }
    }

    function bufferFragmentInfo() {
        var segmentTime;

        // Check if running state
        if (!started) {
            return;
        }

        log('[FragmentInfoController][' + type + '] Start buffering process...');

        // Get next segment time
        segmentTime = _fragmentInfoTime;

        log('[FragmentInfoController][' + type + '] loadNextFragment for time: ' + segmentTime);

        let representation = getCurrentRepresentation();
        let request = indexHandler.getSegmentRequestForTime(representation, segmentTime);
        onFragmentRequest(request);
    }

    function delayLoadNextFragmentInfo(delay) {
        var delayMs = Math.round(Math.min((delay * 1000), 2000));

        log('[FragmentInfoController][' + type + '] Check buffer delta = ' + delayMs + ' ms');

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

        let request = e.fragmentInfo.request;
        let deltaDate,
            deltaTimeStamp;


        if (!e.fragmentInfo.response) {
            log('[FragmentInfoController][' + type + '] ERROR loading ', request.url);
            return;
        }

        segmentDuration = request.duration;
        log('[FragmentInfoController][' + type + '] FragmentInfo loaded ', request.url);
        try {

            // update segment list
            let mssFragmentMoofProcessor = MSSFragmentMoofProcessor(context).create({
                metricsModel: metricsModel,
                playbackController: playbackController,
                ISOBoxer: ISOBoxer,
                log: log
            });
            mssFragmentMoofProcessor.updateSegmentList(e.fragmentInfo, streamProcessor);

            deltaDate = (new Date().getTime() - startFragmentInfoDate) / 1000;
            deltaTimeStamp = (_fragmentInfoTime + segmentDuration) - startTimeStampValue;
            deltaTime = (deltaTimeStamp - deltaDate) > 0 ? (deltaTimeStamp - deltaDate) : 0;
            delayLoadNextFragmentInfo(deltaTime);
        } catch (e) {
            log('[FragmentInfoController][' + type + '] ERROR - Internal error while processing fragment info segment ');
        }
    }

    function startPlayback() {
        if (!started) {
            return;
        }

        startFragmentInfoDate = new Date().getTime();
        startTimeStampValue = _fragmentInfoTime;

        log('[FragmentInfoController][' + type + '] startPlayback');

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
        log('[FragmentInfoController][' + type + '] START');

        let representation = getCurrentRepresentation();
        segments = representation.segments;

        if (segments) {
            _fragmentInfoTime = segments[segments.length - 1].presentationStartTime - segments[segments.length - 1].duration;

            startPlayback();
        } else {
            indexHandler.updateSegmentList(representation);
            segments = representation.segments;
            _fragmentInfoTime = segments[segments.length - 1].presentationStartTime - segments[segments.length - 1].duration;

            startPlayback();
        }
    }

    function doStop() {
        if (!started) {
            return;
        }
        log('[FragmentInfoController][' + type + '] STOP');

        eventBus.off(MssEvents.FRAGMENT_INFO_LOADING_COMPLETED, onFragmentInfoLoadedCompleted, instance);

        // Stop buffering process
        clearTimeout(bufferTimeout);
        started = false;

        startFragmentInfoDate = null;
        startTimeStampValue = null;
    }

    function reset() {
        doStop();
        streamProcessor.unregisterExternalController(instance);
    }

    instance = {
        initialize: initialize,
        controllerType: controllerType,
        start: doStart,
        reset: reset
    };

    setup();

    return instance;
}

MssFragmentInfoController.__dashjs_factory_name = 'MssFragmentInfoController';
export default dashjs.FactoryMaker.getClassFactory(MssFragmentInfoController); /* jshint ignore:line */
