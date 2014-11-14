/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates, Akamai Technologies
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.DownloadRatioRule = function () {
    "use strict";

    /*
     * This rule is intended to be sure that we can download fragments in a
     * timely manner.  The general idea is that it should take longer to download
     * a fragment than it will take to play the fragment.
     *
     * This rule is not sufficient by itself.  We may be able to download a fragment
     * fine, but if the buffer is not sufficiently long playback hiccups will happen.
     * Be sure to use this rule in conjunction with the InsufficientBufferRule.
     */

    var stepDownFactor = 1,
        downloadRatioArray = [],
        TOTAL_DOWNLOAD_RATIO_ARRAY_LENGTH = 20,

        getSwitchRatio = function (sp, newIdx, currentBandwidth) {
            var newBandwidth = sp.getTrackForQuality(newIdx).bandwidth;
            return (newBandwidth / currentBandwidth);
        },

        getAverageDownloadRatio = function (sampleAmount) {
            var averageDownloadRatio = 0,
                len = downloadRatioArray.length;

            sampleAmount = len < sampleAmount ? len : sampleAmount;
            if (len > 0) {
                var startValue = len - sampleAmount,
                    totalSampledValue = 0;

                for (var i = startValue; i < len; i++) {
                    totalSampledValue += downloadRatioArray[i];
                }
                averageDownloadRatio = totalSampledValue / sampleAmount;
            }

            return averageDownloadRatio;
        };

    return {
        debug: undefined,
        metricsExt: undefined,
        metricsModel: undefined,

        execute: function (context, callback) {
            var self = this,
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                current = context.getCurrentValue(),
                sp = context.getStreamProcessor(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                currentBufferMetric = metrics.BufferLevel[metrics.BufferLevel.length-1] || null,
                downloadTime,
                totalTime,
                averageDownloadRatio,
                downloadRatio,
                totalRatio,
                currentBandwidth,
                switchRequest = null;

            if (!metrics ||
                lastRequest === null ||
                lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0 ||
                isNaN(lastRequest.mediaduration)) {

                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

            if (totalTime <= 0) {
                //self.debug.log("Don't know how long the download of the last fragment took, bailing.");
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = (lastRequest.mediaduration / downloadTime);

            //figure out the average download ratio over sample amount and do not let the length grow beyond threshold.
            downloadRatioArray.push(downloadRatio);
            if (downloadRatioArray.length > TOTAL_DOWNLOAD_RATIO_ARRAY_LENGTH) {
                downloadRatioArray.shift();
            }
            averageDownloadRatio = getAverageDownloadRatio(3);

            if (isNaN(averageDownloadRatio) || isNaN(downloadRatio) || isNaN(totalRatio)) {
                //self.debug.log("The ratios are NaN, bailing.");
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            if (averageDownloadRatio < .9)
            {
                if (current > 0)
                {
                    var switchDownTo = Math.max(current - stepDownFactor, 0);
                    switchRequest = new MediaPlayer.rules.SwitchRequest(switchDownTo, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
                    stepDownFactor++;
                }
            } else {

                if (currentBufferMetric !== null &&
                    currentBufferMetric.level >= currentBufferMetric.target) { // Only switch up if we are not at low buffer otherwise let the InsufficientBufferRule handle this.

                    var max = mediaInfo.trackCount - 1,
                        i;

                    if (current < max) {
                        if (averageDownloadRatio > 20)
                        {
                            switchRequest = new MediaPlayer.rules.SwitchRequest(max, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
                            stepDownFactor = 1;
                        }else {
                            //else figure out the best place to switch up to based on switch and download ratios.
                            currentBandwidth = sp.getTrackForQuality(current).bandwidth;
                            for ( i = max ; i > 0; i-- ) {

                                var switchRatio = getSwitchRatio.call(self, sp, i, currentBandwidth)
                                if ( averageDownloadRatio > switchRatio * MediaPlayer.rules.DownloadRatioRule.DOWNLOAD_RATIO_SAFETY_FACTOR) {
                                    switchRequest = new MediaPlayer.rules.SwitchRequest(i, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            if (switchRequest === null) {
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                self.debug.log("xxx DownloadRatioRule requesting switch to index: ", switchRequest.value, " priority: ",
                    switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "default" :
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "strong" : "weak");
            }

            callback(switchRequest);
        },

        reset: function() {
            stepDownFactor = 1;
            downloadRatioArray = [];
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.DOWNLOAD_RATIO_SAFETY_FACTOR = 1.4;
MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};