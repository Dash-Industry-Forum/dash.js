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
import FragmentModel from '../models/FragmentModel.js';
import FragmentRequest from '../vo/FragmentRequest.js';
import HTTPRequest from '../vo/metrics/HTTPRequest.js';
import SourceBufferExtensions from '../extensions/SourceBufferExtensions.js';
import ScheduleRulesCollection from '../rules/SchedulingRules/ScheduleRulesCollection.js';
import DataChunk from '../vo/DataChunk.js';
import BufferController from './BufferController.js';
import EventBus from '../utils/EventBus.js';
import Events from "../Events.js";

let FragmentController = function () {
    "use strict";

    var fragmentModels = [],

        findModel = function(context) {
            var ln = fragmentModels.length;
            // We expect one-to-one relation between FragmentModel and context,
            // so just compare the given context object with the one that stored in the model to find the model for it
            for (var i = 0; i < ln; i++) {
                if (fragmentModels[i].getContext() == context) {
                    return fragmentModels[i];
                }
            }

            return null;
        },

        createDataChunk = function(bytes, request, streamId) {
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
        },

        onFragmentLoadingCompleted = function(e) {
            if (!findModel.call(this, e.sender.getContext())) return;

            var request = e.request,
                bytes = e.response,
                streamId = e.sender.getContext().streamProcessor.getStreamInfo().id,//TODO seem like a bit much object envy... pass streamInfo in payload?
                isInit = this.isInitializationRequest(request),
                chunk;

            if (!bytes) {
                this.log("No " + request.mediaType + " bytes to push.");
                return;
            }

            chunk = createDataChunk.call(this, bytes, request, streamId);
            EventBus.trigger(isInit ? Events.INIT_FRAGMENT_LOADED : Events.MEDIA_FRAGMENT_LOADED, {chunk: chunk, fragmentModel: e.sender});
        };



    return {
        system: undefined,
        log: undefined,
        scheduleRulesCollection: undefined,
        rulesController: undefined,

        setup: function() {
            EventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        },

        process: function (bytes) {
            var result = null;

            if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
                result = new Uint8Array(bytes);
            }

            return result;
        },

        getModel: function(context) {
            if (!context) return null;
            // Wrap the buffer controller into model and store it to track the loading state and execute the requests
            var model = findModel(context);

            if (!model){
                model = this.system.getObject("fragmentModel");
                model.setContext(context);
                fragmentModels.push(model);
            }

            return model;
        },

        detachModel: function(model) {
            var idx = fragmentModels.indexOf(model);
            // If we have the model for the given buffer just remove it from array
            if (idx > -1) {
                fragmentModels.splice(idx, 1);
            }
        },

		isInitializationRequest: function(request){
			return (request && request.type && request.type === HTTPRequest.INIT_SEGMENT_TYPE);
		},

        reset: function() {
            EventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
            fragmentModels = [];
        }
    };
};

FragmentController.prototype = {
    constructor: FragmentController
};

export default FragmentController;