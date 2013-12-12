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

        findModel = function(bufferController) {
            var ln = fragmentModels.length;
            // We expect one-to-one relation between FragmentModel and BufferController,
            // so just compare the given BufferController object with the one that stored in the model to find the model for it
            for (var i = 0; i < ln; i++) {
                if (fragmentModels[i].getContext() == bufferController) {
                    return fragmentModels[i];
                }
            }

            return null;
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

        process: function (bytes) {
            var result = null;

            if (bytes !== null && bytes !== undefined && bytes.byteLength > 0) {
                result = new Uint8Array(bytes);
            }

            return Q.when(result);
        },

        attachBufferController: function(bufferController) {
            if (!bufferController) return null;
            // Wrap the buffer controller into model and store it to track the loading state and execute the requests
            var model = findModel(bufferController);

            if (!model){
                model = this.system.getObject("fragmentModel");
                model.setContext(bufferController);
                fragmentModels.push(model);
            }

            return model;
        },

        detachBufferController: function(bufferController) {
            var idx = fragmentModels.indexOf(bufferController);
            // If we have the model for the given buffer just remove it from array
            if (idx > -1) {
                fragmentModels.splice(idx, 1);
            }
        },

        onBufferControllerStateChange: function() {
            // Check if we are ready to execute pending requests and do it
            if (isReadyToLoadNextFragment()) {
                executeRequests.call(this);
            }
        },

        isFragmentLoadedOrPending: function(bufferController, request) {
            var fragmentModel = findModel(bufferController),
                isLoaded;

            if (!fragmentModel) {
                return false;
            }

            isLoaded = fragmentModel.isFragmentLoadedOrPending(request);

            return isLoaded;
        },

        getPendingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);

            if (!fragmentModel) {
                return null;
            }

            return fragmentModel.getPendingRequests();
        },

        getLoadingRequests: function(bufferController) {
            var fragmentModel = findModel(bufferController);

            if (!fragmentModel) {
                return null;
            }

            return fragmentModel.getLoadingRequests();
        },

		isInitializationRequest: function(request){
			return (request && request.type && request.type.toLowerCase() === "initialization segment");
		},

        getLoadingTime: function(bufferController) {
            var fragmentModel = findModel(bufferController);

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

        prepareFragmentForLoading: function(bufferController, request, startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback) {
            var fragmentModel = findModel(bufferController);

            if (!fragmentModel || !request) {
                return Q.when(null);
            }
            // Store the request and all the necessary callbacks in the model for deferred execution
            fragmentModel.addRequest(request);
            fragmentModel.setCallbacks(startLoadingCallback, successLoadingCallback, errorLoadingCallback, streamEndCallback);

            return Q.when(true);
        }
    };
};

MediaPlayer.dependencies.FragmentController.prototype = {
    constructor: MediaPlayer.dependencies.FragmentController
};