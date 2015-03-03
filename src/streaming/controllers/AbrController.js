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

        getInternalQuality = function (type, id) {
            var quality;

            qualityDict[id] = qualityDict[id] || {};

            if (!qualityDict[id].hasOwnProperty(type)) {
                qualityDict[id][type] = 0;
            }

            quality = qualityDict[id][type];

            return quality;
        },

        setInternalQuality = function (type, id, value) {
            qualityDict[id] = qualityDict[id] || {};
            qualityDict[id][type] = value;
        },

        getInternalConfidence = function (type, id) {
            var confidence;

            confidenceDict[id] = confidenceDict[id] || {};

            if (!confidenceDict[id].hasOwnProperty(type)) {
                confidenceDict[id][type] = 0;
            }

            confidence = confidenceDict[id][type];

            return confidence;
        },

        setInternalConfidence = function (type, id, value) {
            confidenceDict[id] = confidenceDict[id] || {};
            confidenceDict[id][type] = value;
        },

        setTopQualityIndex = function (type, id, value) {
            topQualities[id] = topQualities[id] || {};
            topQualities[id][type] = value;
        },

        getTopQualityIndex = function(type, id) {
            var idx;

            topQualities[id] = topQualities[id] || {};

            if (!topQualities[id].hasOwnProperty(type)) {
                topQualities[id][type] = 0;
            }

            idx = topQualities[id][type];

            return idx;
        };

    return {
        log: undefined,
        abrRulesCollection: undefined,
        rulesController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        getAutoSwitchBitrate: function () {
            return autoSwitchBitrate;
        },

        setAutoSwitchBitrate: function (value) {
            autoSwitchBitrate = value;
        },

        getPlaybackQuality: function (streamProcessor) {
            var self = this,
                type = streamProcessor.getType(),
                streamId = streamProcessor.getStreamInfo().id,
                quality,
                oldQuality,
                rules,
                confidence,

                callback = function(res) {
                    var topQualityIdx = getTopQualityIndex(type, streamId);

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

                    oldQuality = getInternalQuality(type, streamId);

                    if (quality === oldQuality) return;

                    setInternalQuality(type, streamId, quality);
                    //self.log("New quality of " + quality);
                    setInternalConfidence(type, streamId, confidence);
                    //self.log("New confidence of " + confidence);

                    self.notify(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, {mediaType: type, streamInfo: streamProcessor.getStreamInfo(), oldQuality: oldQuality, newQuality: quality});
                };

            quality = getInternalQuality(type, streamId);
            confidence = getInternalConfidence(type, streamId);


            //self.log("ABR enabled? (" + autoSwitchBitrate + ")");
            if (!autoSwitchBitrate) return;

            //self.log("Check ABR rules.");
            rules = self.abrRulesCollection.getRules(MediaPlayer.rules.ABRRulesCollection.prototype.QUALITY_SWITCH_RULES);
            self.rulesController.applyRules(rules, streamProcessor, callback.bind(self), quality, function(currentValue, newValue) {
                currentValue = currentValue === MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE ? 0 : currentValue;
                return Math.max(currentValue, newValue);
            });
        },

        setPlaybackQuality: function (type, streamInfo, newPlaybackQuality) {
            var id = streamInfo.id,
                quality = getInternalQuality(type, id),
                isInt = newPlaybackQuality !== null && !isNaN(newPlaybackQuality) && (newPlaybackQuality % 1 === 0);

            if (!isInt) throw "argument is not an integer";

            if (newPlaybackQuality !== quality && newPlaybackQuality >= 0 && topQualities[id].hasOwnProperty(type) && newPlaybackQuality <= topQualities[id][type]) {
                setInternalQuality(type, streamInfo.id, newPlaybackQuality);
                this.notify(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, {mediaType: type, streamInfo: streamInfo, oldQuality: quality, newQuality: newPlaybackQuality});
            }
        },

        getQualityFor: function (type, streamInfo) {
            return getInternalQuality(type, streamInfo.id);
        },

        getConfidenceFor: function(type, streamInfo) {
            return getInternalConfidence(type, streamInfo.id);
        },

        /**
         * @param mediaInfo
         * @returns {Array}
         * @memberof AbrController#
         */
        getBitrateList: function(mediaInfo) {
            if (!mediaInfo || !mediaInfo.bitrateList) return null;

            var bitrateList = mediaInfo.bitrateList,
                type = mediaInfo.type,
                infoList = [],
                bitrateInfo;

            for (var i = 0, ln = bitrateList.length; i < ln; i += 1) {
                bitrateInfo = new MediaPlayer.vo.BitrateInfo();
                bitrateInfo.mediaType = type;
                bitrateInfo.qualityIndex = i;
                bitrateInfo.bitrate = bitrateList[i];
                infoList.push(bitrateInfo);
            }

            return infoList;
        },

        updateTopQualityIndex: function(mediaInfo) {
            var type = mediaInfo.type,
                streamId = mediaInfo.streamInfo.id,
                max;

            max = mediaInfo.trackCount - 1;

            if (getTopQualityIndex(type, streamId) === max) return max;

            setTopQualityIndex(type, streamId, max);

            return max;
        },

        isPlayingAtTopQuality: function(streamInfo) {
            var self = this,
                isAtTop,
                streamId = streamInfo.id,
                audioQuality = self.getQualityFor("audio", streamInfo),
                videoQuality = self.getQualityFor("video", streamInfo);

            isAtTop = (audioQuality === getTopQualityIndex("audio", streamId)) &&
                (videoQuality === getTopQualityIndex("video", streamId));

            return isAtTop;
        },

        reset: function() {
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

MediaPlayer.dependencies.AbrController.eventList = {
    ENAME_QUALITY_CHANGED: "qualityChanged"
};