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

import EventBus from '../utils/EventBus.js';
import Events from "../Events.js";
import FactoryMaker from '../../core/FactoryMaker.js';

const FRAGMENT_MODEL_LOADING = "loading";
const FRAGMENT_MODEL_EXECUTED = "executed";
const FRAGMENT_MODEL_CANCELED = "canceled";
const FRAGMENT_MODEL_FAILED = "failed";


let factory = FactoryMaker.getClassFactory(FragmentModel);

factory.FRAGMENT_MODEL_LOADING = FRAGMENT_MODEL_LOADING;
factory.FRAGMENT_MODEL_EXECUTED = FRAGMENT_MODEL_EXECUTED;
factory.FRAGMENT_MODEL_CANCELED = FRAGMENT_MODEL_CANCELED;
factory.FRAGMENT_MODEL_FAILED = FRAGMENT_MODEL_FAILED;

export default factory;

function FragmentModel(config) {

    let log = config.log,
        metricsModel = config.metricsModel

    let instance = {
        setLoader:setLoader,
        setContext:setContext,
        getContext:getContext,
        getRequests:getRequests,
        isFragmentLoaded:isFragmentLoaded,
        removeExecutedRequestsBeforeTime:removeExecutedRequestsBeforeTime,
        abortRequests:abortRequests,
        executeRequest:executeRequest,
        reset:reset
    }

    setup();
    return instance;

    let context,
        executedRequests,
        loadingRequests,
        delayLoadingTimeout,
        fragmentLoader;

    function setup(){
        context = null;
        fragmentLoader = null;
        executedRequests = [];
        loadingRequests = [];

        EventBus.on(Events.LOADING_COMPLETED, onLoadingCompleted, instance);
        EventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
    }

    function setLoader(value) {
        fragmentLoader = value;
    }

    function setContext(value) {
        context = value;
    }

    function getContext() {
        return context;
    }

    function isFragmentLoaded(request) {
        var isEqualComplete = function(req1, req2) {
                return ((req1.action === "complete") && (req1.action === req2.action));
            },

            isEqualMedia = function(req1, req2) {
                return ((req1.url === req2.url) && (req1.startTime === req2.startTime));
            },

            isEqualInit = function(req1, req2) {
                return isNaN(req1.index) && isNaN(req2.index) && (req1.quality === req2.quality);
            },

            check = function(arr) {
                var req,
                    isLoaded = false,
                    ln = arr.length,
                    i;

                for (i = 0; i < ln; i += 1) {
                    req = arr[i];

                    if (isEqualMedia(request, req) || isEqualInit(request, req) || isEqualComplete(request, req)) {
                        //log(request.mediaType + "Fragment already loaded for time: " + request.startTime);
                        isLoaded = true;
                        break;
                    }
                }

                return isLoaded;
            };

        return (check(loadingRequests) || check(executedRequests));
    }

    /**
     *
     * Gets an array of {@link FragmentRequest} objects
     *
     * @param {object} filter The object with properties by which the method filters the requests to be returned.
     *  the only mandatory property is state, which must be a value from
     *  other properties should match the properties of {@link FragmentRequest}. E.g.:
     *  getRequests({state: FragmentModel.FRAGMENT_MODEL_EXECUTED, quality: 0}) - returns
     *  all the requests from executedRequests array where requests.quality = filter.quality
     *
     * @returns {Array}
     * @memberof FragmentModel#
     */
    function getRequests(filter) {
        var requests = [],
            filteredRequests = [],
            states,
            ln = 1;

        if (!filter || !filter.state) return requests;

        if (filter.state instanceof Array) {
            ln = filter.state.length;
            states = filter.state;
        } else {
            states = [filter.state];
        }

        for(var i = 0; i < ln; i += 1) {
            requests = getRequestsForState(states[i]);
            filteredRequests = filteredRequests.concat(filterRequests(requests, filter));
        }

        return filteredRequests;
    }

    function removeExecutedRequestsBeforeTime(time) {
        var lastIdx = executedRequests.length - 1,
            start = NaN,
            req = null,
            i;

        // loop through the executed requests and remove the ones for which startTime is less than the given time
        for (i = lastIdx; i >= 0; i -=1) {
            req = executedRequests[i];
            start = req.startTime;
            if (!isNaN(start) && (start < time)) {
                removeRequest(executedRequests, req);
            }
        }
    }

    function abortRequests() {
        var reqs = [];
        fragmentLoader.abort();

        while (loadingRequests.length > 0) {
            reqs.push(loadingRequests[0]);
            removeRequest(loadingRequests, loadingRequests[0]);
        }

        loadingRequests = [];

        return reqs;
    }

    function executeRequest(request) {
        var now = new Date().getTime();

        if (!request) return;

        //Adds the ability to delay single fragment loading time to control buffer. Needed for Advanced ABR rules.
        if (now < request.delayLoadingTime ) {
            delayLoadingTimeout = setTimeout(function(){
                executeRequest(request);
            }, (request.delayLoadingTime - now) );
            return;
        }

        switch (request.action) {
            case "complete":
                // Stream has completed, execute the corresponding callback
                executedRequests.push(request);
                addSchedulingInfoMetrics(request, FRAGMENT_MODEL_EXECUTED);
                EventBus.trigger(Events.STREAM_COMPLETED, {request: request, fragmentModel:this});
                break;
            case "download":
                loadingRequests.push(request);
                addSchedulingInfoMetrics(request, FRAGMENT_MODEL_LOADING);
                loadCurrentFragment(request);
                break;
            default:
                log("Unknown request action.");
        }
    }

    function reset() {
        EventBus.off(Events.LOADING_COMPLETED, onLoadingCompleted, this);
        EventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);

        abortRequests();
        context = null;
        fragmentLoader = null;
        executedRequests = [];
        loadingRequests = [];
    }

    function loadCurrentFragment(request) {
        EventBus.trigger(Events.FRAGMENT_LOADING_STARTED, {sender: instance, request: request});
        fragmentLoader.load(request);
    }

    function removeRequest(arr, request) {
        var idx = arr.indexOf(request);

        if (idx !== -1) {
            arr.splice(idx, 1);
        }
    }

    function getRequestForTime(arr, time, threshold) {
        var lastIdx = arr.length - 1,
            start = NaN,
            end = NaN,
            req = null,
            i;

        // loop through the executed requests and pick the one for which the playback interval matches the given time
        for (i = lastIdx; i >= 0; i -=1) {
            req = arr[i];
            start = req.startTime;
            end = start + req.duration;
            threshold = threshold || (req.duration / 2);
            if ((!isNaN(start) && !isNaN(end) && ((time + threshold) >= start) && ((time - threshold) < end)) || (isNaN(start) && isNaN(time))) {
                return req;
            }
        }

        return null;
    }

    function filterRequests(arr, filter) {
        if (!filter) return arr;

        // for time use a specific filtration function
        if (filter.hasOwnProperty("time")) {
            return [getRequestForTime(arr, filter.time, filter.threshold)];
        }

        return arr.filter(function(request/*, idx, arr*/) {
            for (var prop in filter) {
                if (prop === "state") continue;

                if (filter.hasOwnProperty(prop) && request[prop] != filter[prop]) return false;
            }

            return true;
        });
    }

    function getRequestsForState(state) {
        var requests;

        switch (state) {
            case FRAGMENT_MODEL_LOADING:
                requests = loadingRequests;
                break;
            case FRAGMENT_MODEL_EXECUTED:
                requests = executedRequests;
                break;
            default:
                requests = [];
        }

        return requests;
    }

    function addSchedulingInfoMetrics(request, state) {
        if (!request) return;

        var mediaType = request.mediaType,
            now = new Date(),
            type = request.type,
            startTime = request.startTime,
            availabilityStartTime = request.availabilityStartTime,
            duration = request.duration,
            quality = request.quality,
            range = request.range;

        metricsModel.addSchedulingInfo(mediaType, now, type, startTime, availabilityStartTime, duration, quality, range, state);
        metricsModel.addRequestsQueue(mediaType, loadingRequests, executedRequests);
    }

    function onLoadingCompleted(e) {
        if (e.sender !== fragmentLoader) return;

        var request = e.request,
            response = e.response,
            error = e.error;

        loadingRequests.splice(loadingRequests.indexOf(request), 1);

        if (response && !error) {
            executedRequests.push(request);
        }

        addSchedulingInfoMetrics(request, error ? FRAGMENT_MODEL_FAILED : FRAGMENT_MODEL_EXECUTED);
        EventBus.trigger(Events.FRAGMENT_LOADING_COMPLETED, {request: request, response: response, error:error, sender:this})
    }

    function onPlaybackSeeking (){
        if (delayLoadingTimeout !== undefined){
            clearTimeout(delayLoadingTimeout);
        }
    }
};
