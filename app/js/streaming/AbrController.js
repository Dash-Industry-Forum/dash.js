/*
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
MediaPlayer.dependencies.AbrController = function () {
    "use strict";

    var autoSwitchBitrate = true,
        topQualities = {},
        qualityDict = {},
        confidenceDict = {},

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
        },

        getInternalConfidence = function (type) {
            var confidence;

            if (!confidenceDict.hasOwnProperty(type)) {
                confidenceDict[type] = 0;
            }

            confidence = confidenceDict[type];

            return confidence;
        },

        setInternalConfidence = function (type, value) {
            confidenceDict[type] = value;
        },

        setTopQualityIndex = function (type, value) {
            topQualities[type] = value;
        },

        getTopQualityIndex = function(type) {
            var idx;

            if (!topQualities.hasOwnProperty(type)) {
                topQualities[type] = 0;
            }

            idx = topQualities[type];

            return idx;
        },

        onDataUpdateCompleted = function(sender, data/*, representation*/) {
            var self = this,
                type = sender.streamProcessor.getType(),
                max;

            max = self.manifestExt.getRepresentationCount(data) - 1;

            if (getTopQualityIndex(type) === max) return;

            setTopQualityIndex(type, max);
            self.notify(self.eventList.ENAME_TOP_QUALITY_INDEX_CHANGED, type, max);
        };

    return {
        debug: undefined,
        abrRulesCollection: undefined,
        manifestExt: undefined,
        metricsModel: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_QUALITY_CHANGED: "qualityChanged",
            ENAME_TOP_QUALITY_INDEX_CHANGED: "topQualityIndexChanged"
        },

        setup: function() {
            this.dataUpdateCompleted = onDataUpdateCompleted;
        },

        getAutoSwitchBitrate: function () {
            return autoSwitchBitrate;
        },

        setAutoSwitchBitrate: function (value) {
            autoSwitchBitrate = value;
        },

        getMetricsFor: function (data) {
            var metrics,
                self = this;

            if (self.manifestExt.getIsVideo(data)) {
                metrics = self.metricsModel.getMetricsFor("video");
            } else {
                if (self.manifestExt.getIsAudio(data)) {
                    metrics = self.metricsModel.getMetricsFor("audio");
                } else {
                    metrics = self.metricsModel.getMetricsFor("stream");
                }
            }

            return metrics;
        },

        getPlaybackQuality: function (type, data) {
            var self = this,
                newQuality = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE,
                i,
                len,
                req,
                values,
                quality,
                oldQuality,
                topQualityIdx,
                metrics,
                rules,
                confidence;

            quality = getInternalQuality(type);

            confidence = getInternalConfidence(type);

            //self.debug.log("ABR enabled? (" + autoSwitchBitrate + ")");

            if (!autoSwitchBitrate) {
                self.debug.log("Unchanged quality of " + quality);
                return {quality: quality, confidence: confidence};
            }

            //self.debug.log("Check ABR rules.");

            metrics = self.getMetricsFor(data);
            rules = self.abrRulesCollection.getRules();

            values = {};
            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0, len = rules.length; i < len; i += 1) {
                req = rules[i].checkIndex(quality, metrics, data);

                if (req.quality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                    values[req.priority] = Math.min(values[req.priority], req.quality);
                }
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                newConfidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                newQuality = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
            }

            if (newQuality !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newQuality !== undefined) {
                quality = newQuality;
            }

            if (newConfidence !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE && newConfidence !== undefined) {
                confidence = newConfidence;
            }

            topQualityIdx = getTopQualityIndex(type);

            // be sure the quality valid!
            if (quality < 0) {
                quality = 0;
            }
            // zero based
            if (quality > topQualityIdx) {
                quality = topQualityIdx;
            }

            if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            }

            oldQuality = getInternalQuality(type);

            if (quality !== oldQuality) {
                self.notify(self.eventList.ENAME_QUALITY_CHANGED, type, oldQuality, quality);
            }

            setInternalQuality(type, quality);
            //self.debug.log("New quality of " + quality);

            setInternalConfidence(type, confidence);
            //self.debug.log("New confidence of " + confidence);

            return {quality: quality, confidence: confidence};
        },

        setPlaybackQuality: function (type, newPlaybackQuality) {
            var quality = getInternalQuality(type);

            if (newPlaybackQuality !== quality) {
                setInternalQuality(type, newPlaybackQuality);
                this.notify(this.eventList.ENAME_QUALITY_CHANGED, type, quality, newPlaybackQuality);
            }
        },

        getQualityFor: function (type) {
            return getInternalQuality(type);
        },

        getConfidenceFor: function(type) {
            return getInternalConfidence(type);
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};