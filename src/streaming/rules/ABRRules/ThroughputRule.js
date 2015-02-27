/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2014, Akamai Technologies
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.ThroughputRule = function () {
    "use strict";


    var throughputArray = [],
        AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_LIVE = 2,
        AVERAGE_THROUGHPUT_SAMPLE_AMOUNT_VOD = 3,
        //THROUGHTPUT_RATIO_SAFETY_FACTOR = 1.2,

        storeLastRequestThroughputByType = function (type, lastRequestThroughput) {
            throughputArray[type] = throughputArray[type] || [];
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

            return averageThroughput;
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
                manifest = this.manifestModel.getValue(),
                current = context.getCurrentValue(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                isDynamic= context.getStreamProcessor().isDynamic(),
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                downloadTime,
                averageThroughput,
                lastRequestThroughput,
                bufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null,
                bufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
                switchRequest =  new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK);

            if (!metrics || lastRequest === null || lastRequest.type !== MediaPlayer.vo.metrics.HTTPRequest.MEDIA_SEGMENT_TYPE ||
                bufferStateVO === null || bufferLevelVO === null) {
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;
            lastRequestThroughput = Math.round((lastRequest.trace[lastRequest.trace.length - 1].b * 8 ) / downloadTime);

            storeLastRequestThroughputByType(mediaType, lastRequestThroughput);
            averageThroughput = Math.round(getAverageThroughput(mediaType, isDynamic));

            var adaptation = this.manifestExt.getAdaptationForType(manifest, mediaInfo.streamInfo.index, mediaType);
            var max = mediaInfo.trackCount - 1;

            if (bufferStateVO.state === MediaPlayer.dependencies.BufferController.BUFFER_LOADED &&
                (bufferLevelVO.level >= (MediaPlayer.dependencies.BufferController.LOW_BUFFER_THRESHOLD*2) || isDynamic) )
            {
                for ( var i = max ; i > 0; i-- )
                {
                    var repBandwidth = this.manifestExt.getRepresentationFor(i, adaptation).bandwidth;
                    if (averageThroughput >= repBandwidth) {
                        var p = /*(current < i) ? MediaPlayer.rules.SwitchRequest.prototype.STRONG :*/MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                        switchRequest = new MediaPlayer.rules.SwitchRequest(i, p);
                        break;
                    }
                }
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && current !== switchRequest.value) {
                self.log("ThroughputRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ",
                    switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "Default" :
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "Strong" : "Weak", "Average throughput", Math.round(averageThroughput/1024), "kbps");
            }

            callback(switchRequest);
        },

        reset: function() {
            throughputArray = [];
        }
    };
};

MediaPlayer.rules.ThroughputRule.prototype = {
    constructor: MediaPlayer.rules.ThroughputRule
};