/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.AbrController = function () {
    "use strict";

    var autoSwitchBitrate = true,
        topQualities = {},
        qualityDict = {},
        confidenceDict = {},
        bitrateDict = {},
        streamProcessorDict={},

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

        getInitialBitrate = function(type) {
            return bitrateDict[type];
        },

        setInitialBitrate = function(type, value) {
            bitrateDict[type] = value;
        },

        getMaxBitrate = function(type) {
            if (bitrateDict.hasOwnProperty("max") && bitrateDict.max.hasOwnProperty(type)){
                return bitrateDict.max[type];
            }
            return NaN;
        },

        //TODO  change bitrateDict structure to hold one object for video and audio with initial and max values internal.
        // This means you need to update all the logic around intial bitrate DOMStorage, RebController etc...
        setMaxBitrate = function(type, value) {
            bitrateDict.max = bitrateDict.max || {};
            bitrateDict.max[type] = value;
        },

        getTopQualityIndex = function(type, id) {
            var idx;

            topQualities[id] = topQualities[id] || {};

            if (!topQualities[id].hasOwnProperty(type)) {
                    topQualities[id][type] = 0;
            }

            idx = checkMaxBitrate.call(this, topQualities[id][type], type);

            return idx;
        },

        checkMaxBitrate = function(idx, type){
            var maxBitrate = getMaxBitrate(type);
            if (isNaN(maxBitrate)) {
                return idx;
            }
            var maxIdx = this.getQualityForBitrate(streamProcessorDict[type].getMediaInfo(), maxBitrate);
            return Math.min (idx , maxIdx);
        };

    return {
        log: undefined,
        abrRulesCollection: undefined,
        rulesController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        initialize: function(type, streamProcessor) {
            streamProcessorDict[type] = streamProcessor;
        },

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
                    var topQualityIdx = getTopQualityIndex.call(self, type, streamId);

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

            if (newPlaybackQuality !== quality && newPlaybackQuality >= 0 && newPlaybackQuality <= getTopQualityIndex.call(this, type, id)) {
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
         * @param type
         * @param {number} value A value of the initial bitrate, kbps
         * @memberof AbrController#
         */
        setInitialBitrateFor: function(type, value){
            setInitialBitrate(type, value);
        },

        /**
         * @param type
         * @returns {number} A value of the initial bitrate, kbps
         * @memberof AbrController#
         */
        getInitialBitrateFor: function(type){
            return getInitialBitrate(type);
        },


        setMaxAllowedBitrateFor:function(type, value) {
            setMaxBitrate(type, value);
        },
        getMaxAllowedBitrateFor:function(type) {
            return getMaxBitrate(type);
        },

        /**
         * @param mediaInfo
         * @param bitrate A bitrate value, kbps
         * @returns {number} A quality index for the given bitrate
         * @memberof AbrController#
         */
        getQualityForBitrate: function(mediaInfo, bitrate) {
            var bitrateList = this.getBitrateList(mediaInfo),
                ln = bitrateList.length,
                bitrateInfo;

            for (var i = 0; i < ln; i +=1) {
                bitrateInfo = bitrateList[i];

                if (bitrate*1000 <= bitrateInfo.bitrate) return i;
            }

            return (ln-1);
        },

        /**
         * @param mediaInfo
         * @returns {Array} A list of {@link MediaPlayer.vo.BitrateInfo} objects
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
            setTopQualityIndex(type, streamId, max);

            return max;
        },

        isPlayingAtTopQuality: function(streamInfo) {
            var self = this,
                isAtTop,
                streamId = streamInfo.id,
                audioQuality = self.getQualityFor("audio", streamInfo),
                videoQuality = self.getQualityFor("video", streamInfo);

            isAtTop = (audioQuality === getTopQualityIndex.call(this, "audio", streamId)) &&
                (videoQuality === getTopQualityIndex.call(this, "video", streamId));

            return isAtTop;
        },

        getTopQualityIndexFor:getTopQualityIndex,

        reset: function() {
            autoSwitchBitrate = true;
            topQualities = {};
            qualityDict = {};
            confidenceDict = {};
            streamProcessorDict = {};
            //bitrateDict = {}; // Letting this setting persist over multiple sources.
            // There is no way to set initial bit rate on subsequent media sources in a session if we renew the object each time
            //attachSource is called in media player.
        }
    };
};

MediaPlayer.dependencies.AbrController.prototype = {
    constructor: MediaPlayer.dependencies.AbrController
};

MediaPlayer.dependencies.AbrController.eventList = {
    ENAME_QUALITY_CHANGED: "qualityChanged"
};

// Default initial video bitrate, kbps
MediaPlayer.dependencies.AbrController.DEFAULT_VIDEO_BITRATE = 1000;
// Default initial audio bitrate, kbps
MediaPlayer.dependencies.AbrController.DEFAULT_AUDIO_BITRATE = 100;
