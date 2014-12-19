﻿/*
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
MediaPlayer.rules.DownloadRatioRule = function () {
    "use strict";

    /*
     * This rule is intended to be sure that we can download fragments in a
     * timely manner.  The general idea is that it should take longer to download
     * a fragment than it will take to play the fragment.
     *
     * This rule is not sufficient by itself.  We may be able to download a fragment
     * fine, but if the buffer is not sufficiently long playback hiccups will happen.
     * Be sure to use this rule in conjuction with the InsufficientBufferRule.
     */

    var streamProcessors = {},

        checkRatio = function (sp, newIdx, currentBandwidth) {
            var newBandwidth = sp.getTrackForQuality(newIdx).bandwidth;

            return (newBandwidth / currentBandwidth);
        };

    return {
        debug: undefined,
        metricsExt: undefined,
        metricsModel: undefined,

        setStreamProcessor: function(streamProcessorValue) {
            var type = streamProcessorValue.getType(),
                id = streamProcessorValue.getStreamInfo().id;

            streamProcessors[id] = streamProcessors[id] || {};
            streamProcessors[id][type] = streamProcessorValue;
        },

        execute: function (context, callback) {
            var self = this,
                streamId = context.getStreamInfo().id,
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                current = context.getCurrentValue(),
                sp = streamProcessors[streamId][mediaType],
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                lastRequest = self.metricsExt.getCurrentHttpRequest(metrics),
                downloadTime,
                totalTime,
                downloadRatio,
                totalRatio,
                switchRatio,
                oneDownBandwidth,
                oneUpBandwidth,
                currentBandwidth,
                i,
                max,
                switchRequest,
                DOWNLOAD_RATIO_SAFETY_FACTOR = 0.75;

            //self.debug.log("Checking download ratio rule...");

            if (!metrics) {
                //self.debug.log("No metrics, bailing.");
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            if (lastRequest === null) {
                //self.debug.log("No requests made for this stream yet, bailing.");
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

            if (lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0 ||
                isNaN(lastRequest.mediaduration)) {
                //self.debug.log("Don't know the duration of the last media fragment, bailing.");
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            // TODO : I structured this all goofy and messy.  fix plz

            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = (lastRequest.mediaduration / downloadTime) * DOWNLOAD_RATIO_SAFETY_FACTOR;

            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                //self.debug.log("Total time: " + totalTime + "s");
                //self.debug.log("Download time: " + downloadTime + "s");
                self.debug.log("The ratios are NaN, bailing.");
                callback(new MediaPlayer.rules.SwitchRequest());
                return;
            }

            //self.debug.log("Total ratio: " + totalRatio);
            //self.debug.log("Download ratio: " + downloadRatio);

            if (isNaN(downloadRatio)) {
                //self.debug.log("Invalid ratio, bailing.");
                switchRequest = new MediaPlayer.rules.SwitchRequest();
            } else if (downloadRatio < 4.0) {
                //self.debug.log("Download ratio is poor.");
                if (current > 0) {
                    self.debug.log("We are not at the lowest bitrate, so switch down.");
                    oneDownBandwidth = sp.getTrackForQuality(current - 1).bandwidth;
                    currentBandwidth = sp.getTrackForQuality(current).bandwidth;
                    switchRatio = oneDownBandwidth / currentBandwidth;
                    //self.debug.log("Switch ratio: " + switchRatio);

                    if (downloadRatio < switchRatio) {
                        self.debug.log("Things must be going pretty bad, switch all the way down.");
                        switchRequest = new MediaPlayer.rules.SwitchRequest(0);
                    } else {
                        self.debug.log("Things could be better, so just switch down one index.");
                        switchRequest = new MediaPlayer.rules.SwitchRequest(current - 1);
                    }
                } else {
                    //self.debug.log("We are at the lowest bitrate and cannot switch down, use current.");
                    switchRequest = new MediaPlayer.rules.SwitchRequest(current);
                }
            } else {
                //self.debug.log("Download ratio is good.");
                max = mediaInfo.trackCount - 1; // 0 based

                if (current < max) {
                    //self.debug.log("We are not at the highest bitrate, so switch up.");
                    oneUpBandwidth = sp.getTrackForQuality(current + 1).bandwidth;
                    currentBandwidth = sp.getTrackForQuality(current).bandwidth;
                    switchRatio = oneUpBandwidth / currentBandwidth;
                    //self.debug.log("Switch ratio: " + switchRatio);

                    if (downloadRatio >= switchRatio) {
                        if (downloadRatio > 100.0) {
                            self.debug.log("Tons of bandwidth available, go all the way up.");
                            switchRequest = new MediaPlayer.rules.SwitchRequest(max);
                        }
                        else if (downloadRatio > 10.0) {
                            self.debug.log("Just enough bandwidth available, switch up one.");
                            switchRequest = new MediaPlayer.rules.SwitchRequest(current + 1);
                        }
                        else {
                            //self.debug.log("Not exactly sure where to go, so do some math.");
                            i = -1;
                            while ((i += 1) < max) {
                                if (downloadRatio < checkRatio.call(self, sp, i, currentBandwidth)) {
                                    break;
                                }
                            }

                            self.debug.log("Calculated ideal new quality index is: " + i);
                            switchRequest = new MediaPlayer.rules.SwitchRequest(i);
                        }
                    } else {
                        //self.debug.log("Not enough bandwidth to switch up.");
                        switchRequest = new MediaPlayer.rules.SwitchRequest();
                    }
                } else {
                    //self.debug.log("We are at the highest bitrate and cannot switch up, use current.");
                    switchRequest = new MediaPlayer.rules.SwitchRequest(max);
                }
            }

            callback(switchRequest);
        },

        reset: function() {
            streamProcessors = {};
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};