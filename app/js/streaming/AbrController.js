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
        quality = 0;

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

        getPlaybackQuality: function (data) {
            var self = this,
                deferred = Q.defer(),
                newQuality = 999,
                ruleQuality,
                rules,
                i,
                len,
                funcs = [];

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
                                        for (i = 0, len = results.length; i < len; i += 1) {
                                            if (results[i] !== -1) {
                                                newQuality = Math.min(newQuality, results[i]);
                                            }
                                        }

                                        if (newQuality !== 999) {
                                            quality = newQuality;
                                        }

                                        self.debug.log("New quality of " + quality);
                                        deferred.resolve(quality);
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

        setPlaybackQuality: function (newPlaybackQuality) {
            if (newPlaybackQuality === quality) {
                return;
            }
            quality = newPlaybackQuality;
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};