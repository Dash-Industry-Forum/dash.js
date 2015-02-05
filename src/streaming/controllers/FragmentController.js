/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.FragmentController = function () {
    "use strict";

    var fragmentModels = [],
        inProgress = false,

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

        getRequestsToLoad = function(current, callback) {
            var self =this,
                streamProcessor = fragmentModels[0].getContext().streamProcessor,
                streamId = streamProcessor.getStreamInfo().id,
                rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.FRAGMENTS_TO_EXECUTE_RULES);

            if (rules.indexOf(this.scheduleRulesCollection.sameTimeRequestRule) !== -1) {
                this.scheduleRulesCollection.sameTimeRequestRule.setFragmentModels(fragmentModels, streamId);
            }

            self.rulesController.applyRules(rules, streamProcessor, callback, current, function(currentValue, newValue) {
                return newValue;
            });
        },

        onFragmentLoadingStart = function(e) {
            var self = this,
                request = e.data.request;

            if (self.isInitializationRequest(request)) {
                self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADING_START, {request: request, fragmentModel: e.sender});
            }else {
                self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, {request: request, fragmentModel: e.sender});
            }
        },

        onFragmentLoadingCompleted = function(e) {
            var self = this,
                request = e.data.request,
                bytes = self.process(e.data.response);

            if (bytes === null) {
                self.debug.log("No " + request.mediaType + " bytes to push.");
                return;
            }

            if (self.isInitializationRequest(request)) {
                self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, {bytes: bytes, quality: request.quality, fragmentModel: e.sender});
            }else {
                self.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, {bytes: bytes, quality: request.quality, index: request.index, fragmentModel: e.sender});
            }

            executeRequests.call(this);
        },

        onStreamCompleted = function(e) {
            this.notify(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, {request: e.data.request, fragmentModel: e.sender});
        },

        onBufferLevelBalanced = function(/*e*/) {
            executeRequests.call(this);
        },

        onGetRequests = function(result) {
            var reqsToExecute = result.value,
                mediaType,
                r,
                m,
                i,
                j;

            for (i = 0; i < reqsToExecute.length; i += 1) {
                r = reqsToExecute[i];

                if (!r) continue;

                for (j = 0; j < fragmentModels.length; j += 1) {
                    m = fragmentModels[j];
                    mediaType = m.getContext().streamProcessor.getType();

                    if (r.mediaType !== mediaType) continue;

                    if (!(r instanceof MediaPlayer.vo.FragmentRequest)) {
                        r = m.getPendingRequestForTime(r.startTime);
                    }

                    m.executeRequest(r);
                }
            }

            inProgress = false;
        },

        executeRequests = function(request) {
            if (inProgress) return;

            inProgress = true;

            getRequestsToLoad.call(this, request, onGetRequests.bind(this));
        };

    return {
        system: undefined,
        debug: undefined,
        scheduleRulesCollection: undefined,
        rulesController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED] = onFragmentLoadingStart;
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED] = onFragmentLoadingCompleted;
            this[MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED] = onStreamCompleted;

            this[MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED] = onBufferLevelBalanced;
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

        isFragmentLoadedOrPending: function(context, request) {
            var fragmentModel = findModel(context),
                isLoaded;

            if (!fragmentModel) {
                return false;
            }

            isLoaded = fragmentModel.isFragmentLoadedOrPending(request);

            return isLoaded;
        },

        getPendingRequests: function(context) {
            var fragmentModel = findModel(context);

            if (!fragmentModel) {
                return null;
            }

            return fragmentModel.getPendingRequests();
        },

        getLoadingRequests: function(context) {
            var fragmentModel = findModel(context);

            if (!fragmentModel) {
                return null;
            }

            return fragmentModel.getLoadingRequests();
        },

		isInitializationRequest: function(request){
			return (request && request.type && request.type.toLowerCase().indexOf("initialization") !== -1);
		},

        getLoadingTime: function(context) {
            var fragmentModel = findModel(context);

            if (!fragmentModel) {
                return null;
            }

            return fragmentModel.getLoadingTime();
        },

        getExecutedRequestForTime: function(model, time) {
            if (model) {
                return model.getExecutedRequestForTime(time);
            }

            return null;
        },

        removeExecutedRequest: function(model, request) {
            if (model) {
                model.removeExecutedRequest(request);
            }
        },

        removeExecutedRequestsBeforeTime: function(model, time) {
            if (model) {
                model.removeExecutedRequestsBeforeTime(time);
            }
        },

        cancelPendingRequestsForModel: function(model) {
            if (model) {
                model.cancelPendingRequests();
            }
        },

        abortRequestsForModel: function(model) {
            if (model) {
                model.abortRequests();
            }

            executeRequests.call(this);
        },

        prepareFragmentForLoading: function(context, request) {
            var fragmentModel = findModel(context);

            if (!fragmentModel || !request) return;
            // Store the request and all the necessary callbacks in the model for deferred execution
            if (fragmentModel.addRequest(request)) {
                executeRequests.call(this, request);
            }
        },

        executePendingRequests: function() {
            executeRequests.call(this);
        },

        resetModel: function(model) {
            this.abortRequestsForModel(model);
            this.cancelPendingRequestsForModel(model);
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};

MediaPlayer.dependencies.FragmentController.eventList = {
    ENAME_STREAM_COMPLETED: "streamCompleted",
    ENAME_INIT_FRAGMENT_LOADING_START: "initFragmentLoadingStart",
    ENAME_MEDIA_FRAGMENT_LOADING_START: "mediaFragmentLoadingStart",
    ENAME_INIT_FRAGMENT_LOADED: "initFragmentLoaded",
    ENAME_MEDIA_FRAGMENT_LOADED: "mediaFragmentLoaded"
};