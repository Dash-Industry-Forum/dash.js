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