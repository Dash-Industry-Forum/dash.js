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
MediaPlayer.rules.SameTimeRequestRule = function () {
    "use strict";

    var findClosestToTime = function(fragmentModels, time) {
            var req,
                r,
                pendingReqs,
                i = 0,
                j,
                pln,
                ln = fragmentModels.length;

            for (i; i < ln; i += 1) {
                pendingReqs = fragmentModels[i].getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
                sortRequestsByProperty.call(this, pendingReqs, "index");

                for (j = 0, pln = pendingReqs.length; j < pln; j++) {
                    req = pendingReqs[j];

                    if ((req.startTime > time) && (!r || req.startTime < r.startTime)) {
                        r = req;
                    }
                }
            }
            if (r || req) {
                return [r || req];
            }
            return null;
        },

        getForTime = function(fragmentModels, currentTime) {
            var ln = fragmentModels.length,
                req,
            i, initSegs = [],requestSegs = [];

            for (i = 0; i < ln; i += 1) {
                var pendingReqs = fragmentModels[i].getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING});
                for (var j=0;j<pendingReqs.length;j++) {
                    req=pendingReqs[j];
                    if (req.type == MediaPlayer.vo.metrics.HTTPRequest.INIT_SEGMENT_TYPE) {
                        initSegs.push(req);
                    }
                }

                req = fragmentModels[i].getRequests({state: MediaPlayer.dependencies.FragmentModel.states.PENDING, time: currentTime})[0];

                if (req) {
                    requestSegs.push(req);
                }
            }
            if (initSegs.length>0) {
                return initSegs;
            }
            if (requestSegs.length>0) {
                return requestSegs;
            }
            return null;
        },

        sortRequestsByProperty = function(requestsArray, sortProp) {
            var compare = function (req1, req2){
                if (req1[sortProp] < req2[sortProp] || (isNaN(req1[sortProp]) && req1.action !== "complete")) return -1;
                if (req1[sortProp] > req2[sortProp]) return 1;
                return 0;
            };

            requestsArray.sort(compare);

        };

    return {
        playbackController: undefined,

        setup: function() {

        },

        setFragmentModels: function(fragmentModels, streamid) {
            this.fragmentModels = this.fragmentModels || {};
            this.fragmentModels[streamid] = fragmentModels;
        },

        execute: function(context, callback) {
            var streamInfo = context.getStreamInfo(),
                streamId = streamInfo.id,
                current = context.getCurrentValue(),
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                playbackController = this.playbackController,
                fragmentModels = this.fragmentModels[streamId],
                model,
                req,
                currentTime,
                wallclockTime = new Date(),
                reqForCurrentTime,
                mLength = fragmentModels ? fragmentModels.length : null,
                reqsToExecute = [],
                loadingLength;

            if (!fragmentModels || !mLength) {
                callback(new MediaPlayer.rules.SwitchRequest([], p));
                return;
            }

            currentTime = playbackController.isPlaybackStarted() ? playbackController.getTime() : playbackController.getStreamStartTime(streamInfo);
            reqForCurrentTime = getForTime(fragmentModels, currentTime);
            req = reqForCurrentTime || findClosestToTime(fragmentModels, currentTime) || current;

            if (!req || req.length===0) {
                callback(new MediaPlayer.rules.SwitchRequest([], p));
                return;
            }
            for (var i=0;i<req.length;i++) {
                reqsToExecute.push(req[i]);
            }

            for (i=0;i<mLength;i++) {
                model = fragmentModels[i];
                // Should we enforce this here, as opposed to a
                // loadingLength count rule?
                loadingLength = model.getRequests({state: MediaPlayer.dependencies.FragmentModel.states.LOADING}).length;
                if (loadingLength > MediaPlayer.dependencies.ScheduleController.LOADING_REQUEST_THRESHOLD) {
                    callback(new MediaPlayer.rules.SwitchRequest([], p));
                    return;
                }
            }

            // Should we enforce this here or have a proper can we load it rule?
            reqsToExecute = reqsToExecute.filter( function(req) {
                return (req.action === "complete") || (wallclockTime.getTime() >= req.availabilityStartTime.getTime());
            });

            callback(new MediaPlayer.rules.SwitchRequest(reqsToExecute, p));
        }
    };
};

MediaPlayer.rules.SameTimeRequestRule.prototype = {
    constructor: MediaPlayer.rules.SameTimeRequestRule
};