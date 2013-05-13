/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.AbrController = function () {
    "use strict";

    var autoSwitchBitrate = true,
        qualityDict = {},

        getInternalQuality = function (type) {
            var quality;

            if (!qualityDict.hasOwnProperty(type)) {
                qualityDict[type] = 0;
            }

            quality = qualityDict[type];

            return quality;
        },

        setInternalQuality = function (type, value) {
            qualityDict[type] = value;
        };

    return {
        debug: undefined,
        abrRulesCollection: undefined,
        manifestExt: undefined,
        metricsModel: undefined,

        getAutoSwitchBitrate: function () {
            return autoSwitchBitrate;
        },

        setAutoSwitchBitrate: function (value) {
            autoSwitchBitrate = value;
        },

        getMetricsFor: function (data) {
            var deferred = Q.defer(),
                self = this;

            self.manifestExt.getIsVideo(data).then(
                function (isVideo) {
                    if (isVideo) {
                        deferred.resolve(self.metricsModel.getMetricsFor("video"));
                    } else {
                        self.manifestExt.getIsAudio(data).then(
                            function (isAudio) {
                                if (isAudio) {
                                    deferred.resolve(self.metricsModel.getMetricsFor("audio"));
                                } else {
                                    deferred.resolve(self.metricsModel.getMetricsFor("stream"));
                                }
                            }
                        );
                    }
                }
            );

            return deferred.promise;
        },

        getPlaybackQuality: function (type, data) {
            var self = this,
                deferred = Q.defer(),
                newQuality = 999,
                ruleQuality,
                rules,
                i,
                len,
                funcs = [],
                req,
                values,
                quality;

            quality = getInternalQuality(type);

            self.debug.log("ABR enabled? (" + autoSwitchBitrate + ")");

            if (autoSwitchBitrate) {
                self.debug.log("Check ABR rules.");

                self.getMetricsFor(data).then(
                    function (metrics) {
                        self.abrRulesCollection.getRules().then(
                            function (rules) {
                                for (i = 0, len = rules.length; i < len; i += 1) {
                                    funcs.push(rules[i].checkIndex(quality, metrics, data));
                                }
                                Q.all(funcs).then(
                                    function (results) {
                                        self.debug.log(results);
                                        values = {};
                                        values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = 999;
                                        values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = 999;
                                        values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = 999;

                                        for (i = 0, len = results.length; i < len; i += 1) {
                                            req = results[i];
                                            if (req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                                                values[req.priority] = Math.min(values[req.priority], req.quality);
                                            }
                                        }

                                        if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== 999) {
                                            newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
                                        }

                                        if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== 999) {
                                            newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
                                        }

                                        if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== 999) {
                                            newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
                                        }

                                        if (newQuality !== 999 && newQuality !== undefined) {
                                            quality = newQuality;
                                        }

                                        self.manifestExt.getRepresentationCount(data).then(
                                            function (max) {
                                                // be sure the quality valid!
                                                if (quality < 0) {
                                                    quality = 0;
                                                }
                                                // zero based
                                                if (quality >= max) {
                                                    quality = max - 1;
                                                }

                                                setInternalQuality(type, quality);
                                                self.debug.log("New quality of " + quality);

                                                deferred.resolve(quality);
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            } else {
                self.debug.log("Unchanged quality of " + quality);
                deferred.resolve(quality);
            }

            return deferred.promise;
        },

        setPlaybackQuality: function (type, newPlaybackQuality) {
            var quality = getInternalQuality(type);

            if (newPlaybackQuality !== quality) {
                setInternalQuality(type, newPlaybackQuality);
            }
        },

        getQualityFor: function (type) {
            return getInternalQuality(type);
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};