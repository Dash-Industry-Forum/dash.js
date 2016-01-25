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
import HTTPRequest from '../vo/metrics/HTTPRequest.js';
import DataChunk from '../vo/DataChunk.js';
import FragmentModel from '../models/FragmentModel.js';
import MetricsModel from '../models/MetricsModel.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

function FragmentController(/*config*/) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let instance,
        fragmentModels;

    function setup() {
        fragmentModels = [];
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    function process(bytes) {
        var result = null;

        if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
            result = new Uint8Array(bytes);
        }

        return result;
    }

    function getModel(scheduleController) {
        if (!scheduleController) return null;
        // Wrap the buffer controller into model and store it to track the loading state and execute the requests
        var model = findModel(scheduleController);

        if (!model) {
            model = FragmentModel(context).create({metricsModel: MetricsModel(context).getInstance()});
            model.setScheduleController(scheduleController);
            fragmentModels.push(model);
        }

        return model;
    }

    function detachModel(model) {
        var idx = fragmentModels.indexOf(model);
        // If we have the model for the given buffer just remove it from array
        if (idx > -1) {
            fragmentModels.splice(idx, 1);
        }
    }

    function isInitializationRequest(request) {
        return (request && request.type && request.type === HTTPRequest.INIT_SEGMENT_TYPE);
    }

    function reset() {
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        fragmentModels = [];
    }

    function findModel(scheduleController) {
        var ln = fragmentModels.length;
        // We expect one-to-one relation between FragmentModel and context,
        // so just compare the given context object with the one that stored in the model to find the model for it
        for (var i = 0; i < ln; i++) {
            if (fragmentModels[i].getScheduleController() == scheduleController) {
                return fragmentModels[i];
            }
        }

        return null;
    }

    function createDataChunk(bytes, request, streamId) {
        var chunk = new DataChunk();

        chunk.streamId = streamId;
        chunk.mediaInfo = request.mediaInfo;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.bytes = bytes;
        chunk.index = request.index;
        chunk.quality = request.quality;

        return chunk;
    }

    function onFragmentLoadingCompleted(e) {
        let scheduleController = e.sender.getScheduleController();
        if (!findModel(scheduleController)) return;

        let request = e.request;
        let bytes = e.response;
        let isInit = isInitializationRequest(request);
        let streamId = scheduleController.getStreamProcessor().getStreamInfo().id;
        let chunk;

        if (!bytes) {
            log('No ' + request.mediaType + ' bytes to push.');
            return;
        }

        chunk = createDataChunk(bytes, request, streamId);
        eventBus.trigger(isInit ? Events.INIT_FRAGMENT_LOADED : Events.MEDIA_FRAGMENT_LOADED, {chunk: chunk, fragmentModel: e.sender});
    }

    instance = {
        process: process,
        getModel: getModel,
        detachModel: detachModel,
        isInitializationRequest: isInitializationRequest,
        reset: reset
    };

    setup();

    return instance;
}

FragmentController.__dashjs_factory_name = 'FragmentController';
export default FactoryMaker.getClassFactory(FragmentController);