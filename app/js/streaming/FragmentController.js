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

        executeIfReady = function() {
            if (isReadyToLoadNextFragment.call(this)) {
                executeRequests.call(this);
            }
        },

        onFragmentLoadingStart = function(sender, request) {
            var self = this;

            if (self.isInitializationRequest(request)) {
                self.notify(self.eventList.ENAME_INIT_SEGMENT_LOADING_START, sender, request);
            }else {
                self.notify(self.eventList.ENAME_MEDIA_SEGMENT_LOADING_START, sender, request);
            }
        },

        onFragmentLoadingCompleted = function(sender, request, response) {
            var self = this,
                bytes = self.process(response);

            if (bytes === null) {
                self.debug.log("No " + request.streamType + " bytes to push.");
                return;
            }

            if (self.isInitializationRequest(request)) {
                self.notify(self.eventList.ENAME_INIT_SEGMENT_LOADED, sender, bytes, request.quality);
            }else {
                self.notify(self.eventList.ENAME_MEDIA_SEGMENT_LOADED, sender, bytes, request.quality, request.index);
            }
        },

        onStreamCompleted = function(sender, request) {
            this.notify(this.eventList.ENAME_STREAM_COMPLETED, sender, request);
        },

        onBufferLevelBalanced = function(/*sender*/) {
            executeIfReady.call(this);
        },

        isReadyToLoadNextFragment = function() {
            var isReady = true,
                ln = fragmentModels.length;

            // Loop through the models and check if all of them are in the ready state
            for (var i = 0; i < ln; i++) {
                if (!fragmentModels[i].isReady()) {
                    isReady = false;
                    break;
                }
            }

            return isReady;
        },

        executeRequests = function() {
            for (var i = 0; i < fragmentModels.length; i++) {
                fragmentModels[i].executeCurrentRequest();
            }
        };

    return {
        system: undefined,
        debug: undefined,
        fragmentLoader: undefined,
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.fragmentLoadingStarted = onFragmentLoadingStart;
            this.fragmentLoadingCompleted = onFragmentLoadingCompleted;
            this.streamCompleted = onStreamCompleted;

            this.bufferLevelBalanced = onBufferLevelBalanced;
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
            var model = findModel(context),
                loader;

            if (!model){
                model = this.system.getObject("fragmentModel");
                loader = this.system.getObject("fragmentLoader");
                model.setContext(context);
                model.setLoader(loader);
                model.subscribe(model.eventList.ENAME_FRAGMENT_LOADING_STARTED, this);
                model.subscribe(model.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, this);
                model.subscribe(model.eventList.ENAME_STREAM_COMPLETED, this);
                model.subscribe(model.eventList.ENAME_FRAGMENT_LOADING_FAILED, context);
                loader.subscribe(loader.eventList.ENAME_LOADING_COMPLETED, model);
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

        onStateChange: function() {
            // Check if we are ready to execute pending requests and do it
            executeIfReady.call(this);
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
			return (request && request.type && request.type.toLowerCase() === "initialization segment");
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
        },

        isFragmentExists: function(request) {
            var deferred = Q.defer();

            this.fragmentLoader.checkForExistence(request).then(
                function() {
                    deferred.resolve(true);
                },
                function() {
                    deferred.resolve(false);
                }
            );

            return deferred.promise;
        },

        prepareFragmentForLoading: function(context, request) {
            var fragmentModel = findModel(context);

            if (!fragmentModel || !request) {
                return false;
            }
            // Store the request and all the necessary callbacks in the model for deferred execution
            fragmentModel.addRequest(request);

            return true;
        },

        resetModel: function(model) {
            this.abortRequestsForModel(model);
            this.cancelPendingRequestsForModel(model);

            model.unsubscribe(model.eventList.ENAME_FRAGMENT_LOADING_STARTED, this);
            model.unsubscribe(model.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, this);
            model.unsubscribe(model.eventList.ENAME_STREAM_COMPLETED, this);
            model.unsubscribe(model.eventList.ENAME_FRAGMENT_LOADING_FAILED, model.getContext());
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};