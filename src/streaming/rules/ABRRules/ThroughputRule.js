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

    var AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2,
        AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3;


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
                switchRequest =  new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

            if ( (metrics.BufferState.length === 0) || (metrics.BufferLevel.length === 0) ) {
                callback(switchRequest);
                return;
            }

            var bufferStateVO = metrics.BufferState[metrics.BufferState.length - 1],
                bufferLevelVO = metrics.BufferLevel[metrics.BufferLevel.length - 1];

            var averageThroughput = self.metricsExt.getRecentThroughput(metrics, (isDynamic ? AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE : AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD));
            // insufficent data don't recommend
            if (averageThroughput<0) {
                callback(switchRequest);
                return;
            }

            averageThroughput = Math.round((averageThroughput * MediaPlayer.dependencies.AbrController.BANDWIDTH_SAFETY) / 1000);

            if (bufferStateVO.state === MediaPlayer.dependencies.BufferController.BUFFER_LOADED &&
                ((bufferLevelVO.level) >= (MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD_MS*2) || isDynamic)) {
                var newQuality = abrController.getQualityForBitrate(mediaInfo, averageThroughput);
                switchRequest = new MediaPlayer.rules.SwitchRequest(newQuality, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && switchRequest.value !== current) {
                self.log("ThroughputRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ", switchRequest.formatPriority(), "Average throughput", averageThroughput, "kbps");
            }
            callback(switchRequest);
        }
    };
};

MediaPlayer.rules.ThroughputRule.prototype = {
    constructor: MediaPlayer.rules.ThroughputRule
};
