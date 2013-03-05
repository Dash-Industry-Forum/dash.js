/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.rules.BandwidthRule = function () {
    "use strict";

    var rules,

        checkRatio = function (newIdx, currentIdx) {
            var self = this,
                deferred = Q.defer();

            self.manifestExt.getBandwidth(newIdx).then(
                function (newBandwidth) {
                    self.manifestExt.getBandwidth(currentIdx).then(
                        function (currentBandwidth) {
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
                downloadRatio,
                switchRatio,
                deferred,
                funcs,
                i,
                len;

            self.debug.log("Checking bandwidth rule...");

            if (!metrics) {
                self.debug.log("No metrics, bailing.");
                return Q.when(-1);
            }

            if (httpRequests === null || httpRequests === undefined || httpRequests.length === 0) {
                self.debug.log("No requests made for this stream yet, bailing.");
                return Q.when(-1);
            }

            lastRequest = httpRequests[httpRequests.length - 1];
            downloadTime = (lastRequest.tresponse.getTime() - lastRequest.trequest.getTime()) / 1000;

            if (downloadTime <= 0) {
                self.debug.log("Don't know how long the download of the last fragment took, bailing.");
                return Q.when(-1);
            }

            if (lastRequest.mediaduration === null ||
                lastRequest.mediaduration === undefined ||
                lastRequest.mediaduration <= 0) {
                self.debug.log("Don't know the duration of the last media fragment, bailing.");
                return Q.when(-1);
            }

            deferred = Q.defer();

            downloadRatio = lastRequest.mediaduration / downloadTime;
            self.debug.log("Download ratio: " + downloadRatio);

            if (isNaN(downloadRatio)) {
                self.debug.log("Invalid ratio, bailing.");
                deferred.resolve(-1);
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
                                                        deferred.resolve(0);
                                                    } else {
                                                        self.debug.log("Things could be better, so just switch down one index.");
                                                        deferred.resolve(current - 1);
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
                    deferred.resolve(current);
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
                                                                    deferred.resolve(max - 1);
                                                                }
                                                                else if (downloadRatio > 100.0) {
                                                                    self.debug.log("Just enough bandwidth available, switch up one.");
                                                                    deferred.resolve(current + 1);
                                                                }
                                                                else {
                                                                    self.debug.log("Not exactly sure where to go, so do some math.");
                                                                    i = -1;
                                                                    funcs = [];
                                                                    while ((i += 1) < max) {
                                                                        funcs.push(checkRatio.call(self, i, current));
                                                                    }

                                                                    Q.all(funcs).then(
                                                                        function (results) {
                                                                            for (i = 0, len = results.length; i < len; i += 1) {
                                                                                if (downloadRatio < results[i]) {
                                                                                    break;
                                                                                }
                                                                            }
                                                                            self.debug.log("Calculated ideal new quality index is: " + i);
                                                                            deferred.resolve(i);
                                                                        }
                                                                    );
                                                                }
                                                            } else {
                                                                self.debug.log("Not enough bandwidth to switch up.");
                                                                deferred.resolve(-1);
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
                            deferred.resolve(max);
                        }
                    }
                );
            }

            return deferred.promise;
        }
    };
};

MediaPlayer.rules.BandwidthRule.prototype = {
    constructor: MediaPlayer.rules.BandwidthRule
};