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
MediaPlayer.rules.ThroughputRule = function () {
    "use strict";

    // these numbers are way too small, particularly if coming from
    // cache, they're also not by type, so it could well end up just
    // using audio requests to choose video bitrates - which won't be
    // a problem if from the same connection, but what if we have
    // multiplexed audio/video with different distribution issues?

    var throughputArray = {},
        AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2,
        AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3,

        storeLastRequestThroughputByType = function (type, lastRequestThroughput) {
            throughputArray[type] = throughputArray[type] || [];
            // XXX silly way of doing this, why not just store
            // throughput of actual unique requests and then sum?
            // would also mean getAverageThroughput wouldn't need to
            // be calculated each time the rule is run, but only when
            // the throughput array changes.
            if (lastRequestThroughput !== Infinity &&
                lastRequestThroughput !== throughputArray[type][throughputArray[type].length-1]) {
                throughputArray[type].push(lastRequestThroughput);
            }
        },

        getAverageThroughput = function (type,  isDynamic) {
            var averageThroughput = 0,
                sampleAmount = isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE: AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD,
                arr = throughputArray[type],
                len = arr.length;

            sampleAmount = len < sampleAmount ? len : sampleAmount;

            if (len > 0) {
                var startValue = len - sampleAmount,
                    totalSampledValue = 0;

                for (var i = startValue; i < len; i++) {
                    totalSampledValue += arr[i];
                }
                averageThroughput = totalSampledValue / sampleAmount;
            }
            if (arr.length > sampleAmount) {
                arr.shift();
            }

            return Math.round((averageThroughput * MediaPlayer.dependencies.AbrController.BANDWIDTH_SAFETY) / 1000);
        };


    return {
        log: undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        manifestExt:undefined,
        manifestModel:undefined,

        execute: function (context, callback) {
            var self = this,
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                current = context.getCurrentValue(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                streamProcessor = context.getStreamProcessor(),
                abrController = streamProcessor.getABRController(),
                isDynamic= streamProcessor.isDynamic(),
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                downloadTime,
                bytes,
                averageThroughput,
                lastRequestThroughput,
                switchRequest =  new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

            if ( lastRequest === null ||
                lastRequest.type !== MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE ||
                (metrics.BufferState.length > 0) || (metrics.BufferLevel.length > 0) ) {
                callback(switchRequest);
                return;
            }

            var bufferStateVO = metrics.BufferState[metrics.BufferState.length - 1],
                bufferLevelVO = metrics.BufferLevel[metrics.BufferLevel.length - 1];

            if (lastRequest.trace.length) {
                downloadTime = (lastRequest._tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

                bytes = lastRequest.trace.reduce(function (a, b) {
                    return a + b.b[0];
                }, 0);

                lastRequestThroughput = (bytes * 8) / downloadTime;
                storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
            }

            averageThroughput = getAverageThroughput(mediaType, isDynamic);
            abrController.setAverageThroughput(mediaType, averageThroughput);

            // Why don't we propose anyway, the controller blocks
            // switches if abandoned?
            if (abrController.getAbandonmentStateFor(mediaType) !== MediaPlayer.dependencies.AbrController.ABANDON_LOAD) {

                if (bufferStateVO.state === MediaPlayer.dependencies.BufferController.BUFFER_LOADED &&
                    ((bufferLevelVO.level) >= (MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD_MS*2) || isDynamic)) {
                    var newQuality = abrController.getQualityForBitrate(mediaInfo, averageThroughput);
                    switchRequest = new MediaPlayer.rules.SwitchRequest(newQuality, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
                }

                if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && switchRequest.value !== current) {
                    self.log("ThroughputRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ",
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "Default" :
                            switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "Strong" : "Weak", "Average throughput", averageThroughput, "kbps");
                }
            }

            callback(switchRequest);
        },

        reset: function() {
            throughputArray = {};
        }
    };
};

MediaPlayer.rules.ThroughputRule.prototype = {
    constructor: MediaPlayer.rules.ThroughputRule
};
