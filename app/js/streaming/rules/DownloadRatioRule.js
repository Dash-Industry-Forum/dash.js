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

    var checkRatio = function (newIdx, currentBandwidth, data) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getRepresentationFor(newIdx, data).then(
                function(rep)
                {
                    self.manifestExt.getBandwidth(rep).then(
                        function (newBandwidth)
                        {
                            deferred.resolve(newBandwidth / currentBandwidth);
                        }
                    );
                }
            );

            return deferred.promise;
        };

    return {
        debug: undefined,
        manifestExt: undefined,

        checkIndex: function (current, metrics, data) {
            var self = this,
                httpRequests = metrics.HttpList,
                lastRequest,
                downloadTime,
                totalTime,
                downloadRatio,
                totalRatio,
                switchRatio,
                deferred,
                funcs,
                i,
                len,
                DOWNLOAD_RATIO_SAFETY_FACTOR = 0.75;

            self.debug.log("Checking download ratio rule...");

            if (!metrics) {
                self.debug.log("No metrics, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (httpRequests === null || httpRequests === undefined || httpRequests.length === 0) {
                self.debug.log("No requests made for this stream yet, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            lastRequest = httpRequests[httpRequests.length - 1];

            totalTime = (lastRequest.tfinish.getTime() - lastRequest.trequest.getTime()) / 1000;
            downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime()) / 1000;

            if (totalTime <= 0) {
                self.debug.log("Don't know how long the download of the last fragment took, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            if (lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0) {
                self.debug.log("Don't know the duration of the last media fragment, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            // TODO : I structured this all goofy and messy.  fix plz

            deferred = Q.defer();

            totalRatio = lastRequest.mediaduration / totalTime;
            downloadRatio = (lastRequest.mediaduration / downloadTime) * DOWNLOAD_RATIO_SAFETY_FACTOR;

            if (isNaN(downloadRatio) || isNaN(totalRatio)) {
                self.debug.log("Total time: " + totalTime + "s");
                self.debug.log("Download time: " + downloadTime + "s");
                self.debug.log("The ratios are NaN, bailing.");
                return Q.when(new MediaPlayer.rules.SwitchRequest());
            }

            self.debug.log("Total ratio: " + totalRatio);
            self.debug.log("Download ratio: " + downloadRatio);

//            if (totalRatio * 2 < downloadRatio) {
                // don't let data buffering or caching hide the time it 
                // took to down load the data in the latency bucket
                //downloadRatio = (totalRatio * DOWNLOAD_RATIO_SAFETY_FACTOR);
//            }

            self.debug.log("Download ratio: " + downloadRatio);

            if (isNaN(downloadRatio)) {
                self.debug.log("Invalid ratio, bailing.");
                deferred.resolve(new MediaPlayer.rules.SwitchRequest());
            } else if (downloadRatio < 1.0) {
                self.debug.log("Download ratio is poor.");
                if (current > 0) {
                    self.debug.log("We are not at the lowest bitrate, so switch down.");
                    self.manifestExt.getRepresentationFor(current - 1, data).then(
                        function (representation1) {
                            self.manifestExt.getBandwidth(representation1).then(
                                function (oneDownBandwidth) {
                                    self.manifestExt.getRepresentationFor(current, data).then(
                                        function (representation2) {
                                            self.manifestExt.getBandwidth(representation2).then(
                                                function (currentBandwidth) {
                                                    switchRatio = oneDownBandwidth / currentBandwidth;
                                                    self.debug.log("Switch ratio: " + switchRatio);

                                                    if (downloadRatio < switchRatio) {
                                                        self.debug.log("Things must be going pretty bad, switch all the way down.");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(0));
                                                    } else {
                                                        self.debug.log("Things could be better, so just switch down one index.");
                                                        deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1));
                                                    }
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                } else {
                    self.debug.log("We are at the lowest bitrate and cannot switch down, use current.");
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                }
            } else {
                self.debug.log("Download ratio is good.");
                self.manifestExt.getRepresentationCount(data).then(
                    function (max) {
                        max -= 1; // 0 based
                        if (current < max) {
                            self.debug.log("We are not at the highest bitrate, so switch up.");
                            self.manifestExt.getRepresentationFor(current + 1, data).then(
                                function (representation1) {
                                    self.manifestExt.getBandwidth(representation1).then(
                                        function (oneUpBandwidth) {
                                            self.manifestExt.getRepresentationFor(current, data).then(
                                                function (representation2) {
                                                    self.manifestExt.getBandwidth(representation2).then(
                                                        function (currentBandwidth) {
                                                            switchRatio = oneUpBandwidth / currentBandwidth;
                                                            self.debug.log("Switch ratio: " + switchRatio);

                                                            if (downloadRatio >= switchRatio) {
                                                                if (downloadRatio > 1000.0) {
                                                                    self.debug.log("Tons of bandwidth available, go all the way up.");
                                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(max - 1));
                                                                }
                                                                else if (downloadRatio > 100.0) {
                                                                    self.debug.log("Just enough bandwidth available, switch up one.");
                                                                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current + 1));
                                                                }
                                                                else {
                                                                    self.debug.log("Not exactly sure where to go, so do some math.");
                                                                    i = -1;
                                                                    funcs = [];
                                                                    while ((i += 1) < max) {
                                                                        funcs.push(checkRatio.call(self, i, currentBandwidth, data));
                                                                    }

                                                                    Q.all(funcs).then(
                                                                        function (results) {
                                                                            for (i = 0, len = results.length; i < len; i += 1) {
                                                                                if (downloadRatio < results[i]) {
                                                                                    break;
                                                                                }
                                                                            }
                                                                            self.debug.log("Calculated ideal new quality index is: " + i);
                                                                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(i));
                                                                        }
                                                                    );
                                                                }
                                                            } else {
                                                                self.debug.log("Not enough bandwidth to switch up.");
                                                                deferred.resolve(new MediaPlayer.rules.SwitchRequest());
                                                            }
                                                        }
                                                    );
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        } else {
                            self.debug.log("We are at the highest bitrate and cannot switch up, use current.");
                            deferred.resolve(new MediaPlayer.rules.SwitchRequest(max));
                        }
                    }
                );
            }

            return deferred.promise;
        }
    };
};

MediaPlayer.rules.DownloadRatioRule.prototype = {
    constructor: MediaPlayer.rules.DownloadRatioRule
};