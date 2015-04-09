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
MediaPlayer.rules.AbandonRequestsRule = function () {
    "use strict";

    var GRACE_TIME_THRESHOLD = 1000,
        ABANDON_MULTIPLIER = 1.75,
        fragmentDict = {},
        scheduleController = {},

        setFragmentRequestDict = function (type, id) {
            fragmentDict[type] = fragmentDict[type] || {};
            fragmentDict[type][id] = fragmentDict[type][id] || {};
        };

    return {
        metricsExt: undefined,
        log:undefined,
        adapter:undefined,

        setScheduleController: function(scheduleControllerValue) {
            var id = scheduleControllerValue.streamProcessor.getStreamInfo().id;
            scheduleController[id] = scheduleController[id] || {};
            scheduleController[id][scheduleControllerValue.streamProcessor.getType()] = scheduleControllerValue;
        },

        execute: function(context, callback) {

            var now = new Date().getTime(),
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                streamId = context.getStreamInfo().id,
                progressEvent = context.getCurrentValue(),
                trackInfo = context.getTrackInfo(),
                req = progressEvent.data.request,
                scheduleCtrl = scheduleController[streamId][mediaType],
                fragmentModel = scheduleCtrl.getFragmentModel(),
                concurrentReqs = fragmentModel.getRequests({state:MediaPlayer.dependencies.FragmentModel.states.LOADING}).length,
                fragmentInfo,
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

            if (mediaType === 'video' && !isNaN(req.index)) { // TODO just for testing remove and make dict to store sep values for audio and video!!

                setFragmentRequestDict(mediaType, req.index);
                fragmentInfo = fragmentDict[mediaType][req.index];

                if (fragmentInfo === null && req.firstByteDate === null) {
                    callback(switchRequest);
                    return;
                }

                //setup some init info based on first progress event
                if (fragmentInfo.firstByteTime === undefined) {
                    fragmentInfo.firstByteTime = req.firstByteDate.getTime();
                    fragmentInfo.segmentDuration = req.duration;
                    fragmentInfo.bytesTotal = req.bytesTotal;
                    fragmentInfo.id = req.index;
                }

                //update info base on subsequent progress events until completed.
                fragmentInfo.bytesLoaded = req.bytesLoaded;
                fragmentInfo.elapsedTime = now - fragmentInfo.firstByteTime;


                if (fragmentInfo.bytesLoaded < fragmentInfo.bytesTotal &&
                    fragmentInfo.elapsedTime >= GRACE_TIME_THRESHOLD) {

                    fragmentInfo.measuredBandwidthInKbps = Math.round((fragmentInfo.bytesLoaded*8/fragmentInfo.elapsedTime)) * concurrentReqs;
                    fragmentInfo.estimatedTimeOfDownload = fragmentInfo.bytesTotal*8*0.001/fragmentInfo.measuredBandwidthInKbps;

                    if (fragmentInfo.estimatedTimeOfDownload < (fragmentInfo.segmentDuration * ABANDON_MULTIPLIER) || trackInfo.quality === 0) {
                        callback(switchRequest);
                        return;
                    }else if (fragmentInfo.allowToLoad !== false) {
                        fragmentInfo.allowToLoad = false;
                        var newQuality = this.adapter.getQulityIndexForBitrate(context.getStreamProcessor(), fragmentInfo.measuredBandwidthInKbps*1000);
                        switchRequest = new MediaPlayer.rules.SwitchRequest(newQuality, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                    }
                }
                //TODO figure out way to set completed request that no longer needed to be stored in dict to null.
            }

            callback(switchRequest);
        },

        reset: function() {
            fragmentDict = {};
        }
    };
};

MediaPlayer.rules.AbandonRequestsRule.ABANDON_LOAD = "abandonload";
MediaPlayer.rules.AbandonRequestsRule.ALLOW_LOAD = "allowload";
MediaPlayer.rules.AbandonRequestsRule.ABANDON_TIMEOUT = 10000;

MediaPlayer.rules.AbandonRequestsRule.prototype = {
    constructor: MediaPlayer.rules.AbandonRequestsRule
};




