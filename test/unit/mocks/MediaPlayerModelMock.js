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
import {
    HTTPRequest
}
from '../../../src/streaming/vo/metrics/HTTPRequest';
import Constants from '../../../src/streaming/constants/Constants';

const DEFAULT_UTC_TIMING_SOURCE = {
    scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
    value: 'http://time.akamai.com/?iso'
};
const LIVE_DELAY_FRAGMENT_COUNT = 4;

const DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION = 360000;
const DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION = 360000;

const BANDWIDTH_SAFETY_FACTOR = 0.9;
const ABANDON_LOAD_TIMEOUT = 10000;

const BUFFER_TO_KEEP = 20;
const BUFFER_PRUNING_INTERVAL = 10;
const DEFAULT_MIN_BUFFER_TIME = 12;
const DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH = 20;
const BUFFER_TIME_AT_TOP_QUALITY = 30;
const BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM = 60;
const LONG_FORM_CONTENT_DURATION_THRESHOLD = 600;
const SEGMENT_OVERLAP_TOLERANCE_TIME = 0.05;

const FRAGMENT_RETRY_ATTEMPTS = 3;
const FRAGMENT_RETRY_INTERVAL = 1000;

const MANIFEST_RETRY_ATTEMPTS = 3;
const MANIFEST_RETRY_INTERVAL = 500;

const XLINK_RETRY_ATTEMPTS = 1;
const XLINK_RETRY_INTERVAL = 500;

//This value influences the startup time for live (in ms).
const WALLCLOCK_TIME_UPDATE_INTERVAL = 50;

const DEFAULT_XHR_WITH_CREDENTIALS = false;

const CACHE_LOAD_THRESHOLD_VIDEO = 50;
const CACHE_LOAD_THRESHOLD_AUDIO = 5;

const SMALL_GAP_LIMIT = 0.8;

const MANIFEST_UPDATE_RETRY_INTERVAL = 100;

class MediaPlayerModelMock {

    // Constants
    static get DEFAULT_UTC_TIMING_SOURCE() {
        return DEFAULT_UTC_TIMING_SOURCE;
    }

    static get LIVE_DELAY_FRAGMENT_COUNT() {
        return LIVE_DELAY_FRAGMENT_COUNT;
    }

    static get DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION() {
        return DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION;
    }

    static get DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION() {
        return DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION;
    }

    static get BANDWIDTH_SAFETY_FACTOR() {
        return BANDWIDTH_SAFETY_FACTOR;
    }

    static get BUFFER_TO_KEEP() {
        return BUFFER_TO_KEEP;
    }

    static get BUFFER_PRUNING_INTERVAL() {
        return BUFFER_PRUNING_INTERVAL;
    }

    static get DEFAULT_MIN_BUFFER_TIME() {
        return DEFAULT_MIN_BUFFER_TIME;
    }

    static get DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH() {
        return DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH;
    }

    static get BUFFER_TIME_AT_TOP_QUALITY() {
        return BUFFER_TIME_AT_TOP_QUALITY;
    }

    static get BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM() {
        return BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM;
    }

    static get LONG_FORM_CONTENT_DURATION_THRESHOLD() {
        return LONG_FORM_CONTENT_DURATION_THRESHOLD;
    }

    static get FRAGMENT_RETRY_ATTEMPTS() {
        return FRAGMENT_RETRY_ATTEMPTS;
    }

    static get FRAGMENT_RETRY_INTERVAL() {
        return FRAGMENT_RETRY_INTERVAL;
    }

    static get MANIFEST_RETRY_ATTEMPTS() {
        return MANIFEST_RETRY_ATTEMPTS;
    }

    static get MANIFEST_RETRY_INTERVAL() {
        return MANIFEST_RETRY_INTERVAL;
    }

    static get MANIFEST_UPDATE_RETRY_INTERVAL() {
        return MANIFEST_UPDATE_RETRY_INTERVAL;
    }

    static get XLINK_RETRY_ATTEMPTS() {
        return XLINK_RETRY_ATTEMPTS;
    }

    static get XLINK_RETRY_INTERVAL() {
        return XLINK_RETRY_INTERVAL;
    }

    static get WALLCLOCK_TIME_UPDATE_INTERVAL() {
        return WALLCLOCK_TIME_UPDATE_INTERVAL;
    }
    static get DEFAULT_XHR_WITH_CREDENTIALS() {
        return DEFAULT_XHR_WITH_CREDENTIALS;
    }

    constructor() {
        this.setup();
    }

    setup() {
        this.UTCTimingSources = [];
        this.useSuggestedPresentationDelay = false;
        this.useManifestDateHeaderTimeSource = true;
        this.scheduleWhilePaused = true;
        this.useDefaultABRRules = true;
        this.fastSwitchEnabled = false;
        this.lastBitrateCachingInfo = {
            enabled: true,
            ttl: DEFAULT_LOCAL_STORAGE_BITRATE_EXPIRATION
        };
        this.lastMediaSettingsCachingInfo = {
            enabled: true,
            ttl: DEFAULT_LOCAL_STORAGE_MEDIA_SETTINGS_EXPIRATION
        };
        this.liveDelayFragmentCount = LIVE_DELAY_FRAGMENT_COUNT;
        this.liveDelay = undefined; // Explicitly state that default is undefined
        this.bufferToKeep = BUFFER_TO_KEEP;
        this.bufferPruningInterval = BUFFER_PRUNING_INTERVAL;
        this.stableBufferTime = NaN;
        this.bufferTimeAtTopQuality = BUFFER_TIME_AT_TOP_QUALITY;
        this.bufferTimeAtTopQualityLongForm = BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM;
        this.longFormContentDurationThreshold = LONG_FORM_CONTENT_DURATION_THRESHOLD;
        this.segmentOverlapToleranceTime = SEGMENT_OVERLAP_TOLERANCE_TIME;
        this.bandwidthSafetyFactor = BANDWIDTH_SAFETY_FACTOR;
        this.abandonLoadTimeout = ABANDON_LOAD_TIMEOUT;
        this.wallclockTimeUpdateInterval = WALLCLOCK_TIME_UPDATE_INTERVAL;
        this.xhrWithCredentials = {
            default: DEFAULT_XHR_WITH_CREDENTIALS
        };
        this.customABRRule = [];

        this.retryAttempts = {
            [HTTPRequest.MPD_TYPE]: MANIFEST_RETRY_ATTEMPTS, [HTTPRequest.XLINK_EXPANSION_TYPE]: XLINK_RETRY_ATTEMPTS, [HTTPRequest.MEDIA_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS, [HTTPRequest.INIT_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS, [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS, [HTTPRequest.INDEX_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS, [HTTPRequest.OTHER_TYPE]: FRAGMENT_RETRY_ATTEMPTS
        };

        this.retryIntervals = {
            [HTTPRequest.MPD_TYPE]: MANIFEST_RETRY_INTERVAL, [HTTPRequest.XLINK_EXPANSION_TYPE]: XLINK_RETRY_INTERVAL, [HTTPRequest.MEDIA_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL, [HTTPRequest.INIT_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL, [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL, [HTTPRequest.INDEX_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL, [HTTPRequest.OTHER_TYPE]: FRAGMENT_RETRY_INTERVAL
        };

        this.cacheLoadThresholds = {};
        this.cacheLoadThresholds[Constants.VIDEO] = CACHE_LOAD_THRESHOLD_VIDEO;
        this.cacheLoadThresholds[Constants.AUDIO] = CACHE_LOAD_THRESHOLD_AUDIO;
        this.jumpGaps = false;
        this.smallGapLimit = SMALL_GAP_LIMIT;
        this.lowLatencyEnabled = false;
        this.manifestUpdateRetryInterval = MANIFEST_UPDATE_RETRY_INTERVAL;
    }

    //TODO Should we use Object.define to have setters/getters? makes more readable code on other side.

    setUseDefaultABRRules(value) {
        this.useDefaultABRRules = value;
    }

    getUseDefaultABRRules() {
        return this.useDefaultABRRules;
    }

    findABRCustomRule(rulename) {
        let i;
        for (i = 0; i < this.customABRRule.length; i++) {
            if (this.customABRRule[i].rulename === rulename) {
                return i;
            }
        }
        return -1;
    }

    getABRCustomRules() {
        return this.customABRRule;
    }

    addABRCustomRule(type, rulename, rule) {

        let index = this.findABRCustomRule(rulename);
        if (index === -1) {
            // add rule
            this.customABRRule.push({
                type: type,
                rulename: rulename,
                rule: rule
            });
        } else {
            // update rule
            this.customABRRule[index].type = type;
            this.customABRRule[index].rule = rule;
        }
    }

    removeABRCustomRule(rulename) {
        let index = this.findABRCustomRule(rulename);
        if (index !== -1) {
            // remove rule
            this.customABRRule.splice(index, 1);
        }
    }

    removeAllABRCustomRule() {
        this.customABRRule = [];
    }

    setBandwidthSafetyFactor(value) {
        this.bandwidthSafetyFactor = value;
    }

    getBandwidthSafetyFactor() {
        return this.bandwidthSafetyFactor;
    }

    setAbandonLoadTimeout(value) {
        this.abandonLoadTimeout = value;
    }

    getAbandonLoadTimeout() {
        return this.abandonLoadTimeout;
    }

    setStableBufferTime(value) {
        this.stableBufferTime = value;
    }

    getStableBufferTime() {
        return !isNaN(this.stableBufferTime) ? this.stableBufferTime : this.fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
    }

    setBufferTimeAtTopQuality(value) {
        this.bufferTimeAtTopQuality = value;
    }

    getBufferTimeAtTopQuality() {
        return this.bufferTimeAtTopQuality;
    }

    setBufferTimeAtTopQualityLongForm(value) {
        this.bufferTimeAtTopQualityLongForm = value;
    }

    getBufferTimeAtTopQualityLongForm() {
        return this.bufferTimeAtTopQualityLongForm;
    }

    setLongFormContentDurationThreshold(value) {
        this.longFormContentDurationThreshold = value;
    }

    getLongFormContentDurationThreshold() {
        return this.longFormContentDurationThreshold;
    }

    setSegmentOverlapToleranceTime(value) {
        this.segmentOverlapToleranceTime = value;
    }

    getSegmentOverlapToleranceTime() {
        return this.segmentOverlapToleranceTime;
    }

    setCacheLoadThresholdForType(type, value) {
        this.cacheLoadThresholds[type] = value;
    }

    getCacheLoadThresholdForType(type) {
        return this.cacheLoadThresholds[type];
    }

    setBufferToKeep(value) {
        this.bufferToKeep = value;
    }

    getBufferToKeep() {
        return this.bufferToKeep;
    }

    setLastBitrateCachingInfo(enable, ttl) {
        this.lastBitrateCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof (ttl) === 'number') {
            this.lastBitrateCachingInfo.ttl = ttl;
        }
    }

    getLastBitrateCachingInfo() {
        return this.lastBitrateCachingInfo;
    }

    setLastMediaSettingsCachingInfo(enable, ttl) {
        this.lastMediaSettingsCachingInfo.enabled = enable;
        if (ttl !== undefined && !isNaN(ttl) && typeof (ttl) === 'number') {
            this.lastMediaSettingsCachingInfo.ttl = ttl;
        }
    }

    getLastMediaSettingsCachingInfo() {
        return this.lastMediaSettingsCachingInfo;
    }

    setBufferPruningInterval(value) {
        this.bufferPruningInterval = value;
    }

    getBufferPruningInterval() {
        return this.bufferPruningInterval;
    }

    setFragmentRetryAttempts(value) {
        this.retryAttempts[HTTPRequest.MEDIA_SEGMENT_TYPE] = value;
    }

    setManifestRetryAttempts(value) {
        this.retryAttempts[HTTPRequest.MPD_TYPE] = value;
    }

    setRetryAttemptsForType(type, value) {
        this.retryAttempts[type] = value;
    }

    getFragmentRetryAttempts() {
        return this.retryAttempts[HTTPRequest.MEDIA_SEGMENT_TYPE];
    }

    getManifestRetryAttempts() {
        return this.retryAttempts[HTTPRequest.MPD_TYPE];
    }

    getRetryAttemptsForType(type) {
        return this.retryAttempts[type];
    }

    setFragmentRetryInterval(value) {
        this.retryIntervals[HTTPRequest.MEDIA_SEGMENT_TYPE] = value;
    }

    setManifestRetryInterval(value) {
        this.retryIntervals[HTTPRequest.MPD_TYPE] = value;
    }

    setRetryIntervalForType(type, value) {
        this.retryIntervals[type] = value;
    }

    getFragmentRetryInterval() {
        return this.retryIntervals[HTTPRequest.MEDIA_SEGMENT_TYPE];
    }

    getManifestRetryInterval() {
        return this.retryIntervals[HTTPRequest.MPD_TYPE];
    }

    getRetryIntervalForType(type) {
        return this.retryIntervals[type];
    }

    setWallclockTimeUpdateInterval(value) {
        this.wallclockTimeUpdateInterval = value;
    }

    getWallclockTimeUpdateInterval() {
        return this.wallclockTimeUpdateInterval;
    }

    setScheduleWhilePaused(value) {
        this.scheduleWhilePaused = value;
    }

    getScheduleWhilePaused() {
        return this.scheduleWhilePaused;
    }

    setLiveDelayFragmentCount(value) {
        this.liveDelayFragmentCount = value;
    }

    setLiveDelay(value) {
        this.liveDelay = value;
    }

    getLiveDelayFragmentCount() {
        return this.liveDelayFragmentCount;
    }

    getLiveDelay() {
        return this.liveDelay;
    }

    setUseManifestDateHeaderTimeSource(value) {
        this.useManifestDateHeaderTimeSource = value;
    }

    getUseManifestDateHeaderTimeSource() {
        return this.useManifestDateHeaderTimeSource;
    }

    setUseSuggestedPresentationDelay(value) {
        this.useSuggestedPresentationDelay = value;
    }

    getUseSuggestedPresentationDelay() {
        return this.useSuggestedPresentationDelay;
    }

    setUTCTimingSources(value) {
        this.UTCTimingSources = value;
    }

    getUTCTimingSources() {
        return this.UTCTimingSources;
    }

    setXHRWithCredentialsForType(type, value) {
        if (!type) {
            Object.keys(this.xhrWithCredentials).forEach(key => {
                this.setXHRWithCredentialsForType(key, value);
            });
        } else {
            this.xhrWithCredentials[type] = !!value;
        }
    }

    getXHRWithCredentialsForType(type) {
        const useCreds = this.xhrWithCredentials[type];

        if (useCreds === undefined) {
            return this.xhrWithCredentials.default;
        }

        return useCreds;
    }

    getFastSwitchEnabled() {
        return this.fastSwitchEnabled;
    }

    setFastSwitchEnabled(value) {
        this.fastSwitchEnabled = value;
    }

    setJumpGaps(value) {
        this.jumpGaps = value;
    }

    getJumpGaps() {
        return this.jumpGaps;
    }

    setManifestUpdateRetryInterval(value) {
        this.manifestUpdateRetryInterval = value;
    }

    getManifestUpdateRetryInterval() {
        return this.manifestUpdateRetryInterval;
    }

    setSmallGapLimit(value) {
        this.smallGapLimit = value;
    }

    getSmallGapLimit() {
        return this.smallGapLimit;
    }

    setLowLatencyEnabled(value) {
        this.lowLatencyEnabled = value;
    }

    getLowLatencyEnabled() {
        return this.lowLatencyEnabled;
    }

    reset() {
        this.setup();
    }
}

export default MediaPlayerModelMock;
