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
import Error from './vo/Error.js';
import EventBus from './../core/EventBus.js';
import Events from './../core/events/Events.js';
import FactoryMaker from '../core/FactoryMaker.js';
import Debug from '../core/Debug.js';
import MediaPlayerModel from './models/MediaPlayerModel.js';

function FragmentLoader(config) {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();
    let metricsModel = config.metricsModel;
    let errHandler = config.errHandler;
    let requestModifier = config.requestModifier;

    let instance,
        mediaPlayerModel,
        xhrs;

    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        xhrs = [];
    }

    function doLoad(request, remainingAttempts) {
        var req = new XMLHttpRequest();
        var traces = [];
        var firstProgress = true;
        var needFailureReport = true;
        var lastTraceTime = null;
        var lastTraceReceivedCount = 0;
        var self = this;
        var handleLoaded = function (requestVO, succeeded) {
            needFailureReport = false;

            var currentTime = new Date();
            var latency,
                download;

            if (!requestVO.firstByteDate) {
                requestVO.firstByteDate = requestVO.requestStartDate;
            }
            requestVO.requestEndDate = currentTime;

            latency = (requestVO.firstByteDate.getTime() - requestVO.requestStartDate.getTime());
            download = (requestVO.requestEndDate.getTime() - requestVO.firstByteDate.getTime());

            log((succeeded ? 'loaded ' : 'failed ') + requestVO.mediaType + ':' + requestVO.type + ':' + requestVO.startTime + ' (' + req.status + ', ' + latency + 'ms, ' + download + 'ms)');

            metricsModel.addHttpRequest(
                request.mediaType,
                null,
                request.type,
                request.url,
                req.responseURL || null,
                request.range,
                request.requestStartDate,
                requestVO.firstByteDate,
                requestVO.requestEndDate,
                req.status,
                request.duration,
                req.getAllResponseHeaders(),
                succeeded ? traces : null
            );
        };

        xhrs.push(req);
        request.requestStartDate = new Date();
        lastTraceTime = request.requestStartDate;

        req.open('GET', requestModifier.modifyRequestURL(request.url), true);
        req.responseType = 'arraybuffer';
        req = requestModifier.modifyRequestHeader(req);
        /*
         req.setRequestHeader("Cache-Control", "no-cache");
         req.setRequestHeader("Pragma", "no-cache");
         req.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2000 00:00:00 GMT");
         */
        if (request.range) {
            req.setRequestHeader('Range', 'bytes=' + request.range);
        }

        req.onprogress = function (event) {
            var currentTime = new Date();

            if (firstProgress) {
                firstProgress = false;
                if (!event.lengthComputable || (event.lengthComputable && event.total !== event.loaded)) {
                    request.firstByteDate = currentTime;
                }
            }

            if (event.lengthComputable) {
                request.bytesLoaded = event.loaded;
                request.bytesTotal = event.total;
            }

            traces.push({
                s: lastTraceTime,
                d: currentTime.getTime() - lastTraceTime.getTime(),
                b: [event.loaded ? event.loaded - lastTraceReceivedCount : 0]
            });

            lastTraceTime = currentTime;
            lastTraceReceivedCount = event.loaded;
            eventBus.trigger(Events.LOADING_PROGRESS, {request: request});
        };

        req.onload = function () {
            if (req.status < 200 || req.status > 299) return;
            handleLoaded(request, true);
            eventBus.trigger(Events.LOADING_COMPLETED, {request: request, response: req.response, sender: instance});
        };

        req.onloadend = req.onerror = function () {
            if (xhrs.indexOf(req) === -1) {
                return;
            } else {
                xhrs.splice(xhrs.indexOf(req), 1);
            }

            if (!needFailureReport) return;

            handleLoaded(request, false);

            if (remainingAttempts > 0) {
                log('Failed loading fragment: ' + request.mediaType + ':' + request.type + ':' + request.startTime + ', retry in ' + mediaPlayerModel.getFragmentRetryInterval() + 'ms' + ' attempts: ' + remainingAttempts);
                remainingAttempts--;
                setTimeout(function () {
                    doLoad.call(self, request, remainingAttempts);
                }, mediaPlayerModel.getFragmentRetryInterval());
            } else {
                log('Failed loading fragment: ' + request.mediaType + ':' + request.type + ':' + request.startTime + ' no retry attempts left');
                errHandler.downloadError('content', request.url, req);
                eventBus.trigger(Events.LOADING_COMPLETED, {
                    request: request,
                    bytes: null,
                    error: new Error(null, 'failed loading fragment', null),
                    sender: self
                });
            }
        };

        req.send();
    }

    function checkForExistence(request) {

        if (!request) {
            eventBus.trigger(Events.CHECK_FOR_EXISTENCE_COMPLETED, { request: request, exists: false });
            return;
        }

        var req = new XMLHttpRequest();
        var isSuccessful = false;

        req.open('HEAD', request.url, true);

        req.onload = function () {
            if (req.status < 200 || req.status > 299) return;
            isSuccessful = true;
            eventBus.trigger(Events.CHECK_FOR_EXISTENCE_COMPLETED, { request: request, exists: true });

        };

        req.onloadend = req.onerror = function () {
            if (isSuccessful) return;
            eventBus.trigger(Events.CHECK_FOR_EXISTENCE_COMPLETED, { request: request, exists: false });
        };

        req.send();
    }

    function load(req) {
        if (!req) {
            eventBus.trigger(Events.LOADING_COMPLETED, {
                request: req,
                bytes: null,
                error: new Error(null, 'request is null', null),
                sender: this
            });
        } else {
            doLoad(req, mediaPlayerModel.getFragmentRetryAttempts());
        }
    }

    function abort() {
        var i,
            req;
        var ln = xhrs.length;

        for (i = 0; i < ln; i++) {
            req = xhrs[i];
            xhrs[i] = null;
            if (!req) continue;
            req.abort();
            req = null;
        }

        xhrs = [];
    }

    instance = {
        checkForExistence: checkForExistence,
        load: load,
        abort: abort
    };

    setup();

    return instance;
}

FragmentLoader.__dashjs_factory_name = 'FragmentLoader';
export default FactoryMaker.getClassFactory(FragmentLoader);
