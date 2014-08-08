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
        rulesController: undefined,
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

        getPlaybackQuality: function (type, data) {
            var self = this,
                quality,
                oldQuality,
                rules,
                confidence,

                callback = function(res) {
                    var topQualityIdx = getTopQualityIndex(type);

                    quality = res.value;
                    confidence = res.confidence;

                    // be sure the quality valid!
                    if (quality < 0) {
                        quality = 0;
                    }
                    // zero based
                    if (quality > topQualityIdx) {
                        quality = topQualityIdx;
                    }

                    oldQuality = getInternalQuality(type);

                    if (quality === oldQuality) return;

                    setInternalQuality(type, quality);
                    //self.debug.log("New quality of " + quality);
                    setInternalConfidence(type, confidence);
                    //self.debug.log("New confidence of " + confidence);

                    self.notify(self.eventList.ENAME_QUALITY_CHANGED, type, oldQuality, quality);
                };

            quality = getInternalQuality(type);

            confidence = getInternalConfidence(type);

            //self.debug.log("ABR enabled? (" + autoSwitchBitrate + ")");

            if (!autoSwitchBitrate) return;

            //self.debug.log("Check ABR rules.");

            if (self.abrRulesCollection.downloadRatioRule) {
                self.abrRulesCollection.downloadRatioRule.setData(data);
            }

            rules = self.abrRulesCollection.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES);

            self.rulesController.applyRules(rules, type, callback.bind(self), quality, function(currentValue, newValue) {
                return Math.min(currentValue, newValue);
            });
        },

        setPlaybackQuality: function (type, newPlaybackQuality) {
            var quality = getInternalQuality(type),
                isInt = newPlaybackQuality !== null && !isNaN(newPlaybackQuality) && (newPlaybackQuality % 1 === 0);

            if (!isInt) throw "argument is not an integer";

            if (newPlaybackQuality !== quality && newPlaybackQuality >= 0 && topQualities.hasOwnProperty(type) && newPlaybackQuality <= topQualities[type]) {
                setInternalQuality(type, newPlaybackQuality);
                this.notify(this.eventList.ENAME_QUALITY_CHANGED, type, quality, newPlaybackQuality);
            }
        },

        getQualityFor: function (type) {
            return getInternalQuality(type);
        },

        getConfidenceFor: function(type) {
            return getInternalConfidence(type);
        },

        reset: function() {
            var rules = this.abrRulesCollection.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES),
                rule,
                ln = rules.length,
                i = 0;

            for (i; i < ln; i += 1) {
                rule = rules[i];

                if (typeof(rule.reset) === "function") {
                    rule.reset();
                }
            }

            autoSwitchBitrate = true;
            topQualities = {};
            qualityDict = {};
            confidenceDict = {};
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};