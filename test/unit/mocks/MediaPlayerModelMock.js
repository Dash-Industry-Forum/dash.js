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


const DEFAULT_UTC_TIMING_SOURCE = {
    scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
    value: 'http://time.akamai.com/?iso&ms'
};

const DEFAULT_MIN_BUFFER_TIME = 12;
const DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH = 20;

const FRAGMENT_RETRY_ATTEMPTS = 3;
const FRAGMENT_RETRY_INTERVAL = 1000;

const MANIFEST_RETRY_ATTEMPTS = 3;
const MANIFEST_RETRY_INTERVAL = 500;

const XLINK_RETRY_ATTEMPTS = 1;
const XLINK_RETRY_INTERVAL = 500;

const DEFAULT_XHR_WITH_CREDENTIALS = false;

const MANIFEST_UPDATE_RETRY_INTERVAL = 100;

class MediaPlayerModelMock {

    // Constants
    static get DEFAULT_UTC_TIMING_SOURCE() {
        return DEFAULT_UTC_TIMING_SOURCE;
    }

    static get DEFAULT_MIN_BUFFER_TIME() {
        return DEFAULT_MIN_BUFFER_TIME;
    }

    static get DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH() {
        return DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH;
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

    static get DEFAULT_XHR_WITH_CREDENTIALS() {
        return DEFAULT_XHR_WITH_CREDENTIALS;
    }

    constructor(data) {
        this.setup();

        if (data && data.settings) {
            this.settings = data.settings;
        }
    }

    setup() {
        this.fastSwitchEnabled = false;
        this.liveDelay = null; // Explicitly state that default is null
        this.stableBufferTime = -1;
        this.xhrWithCredentials = {
            default: DEFAULT_XHR_WITH_CREDENTIALS
        };
        this.customABRRule = [];

        this.retryAttempts = {
            [HTTPRequest.MPD_TYPE]: MANIFEST_RETRY_ATTEMPTS,
            [HTTPRequest.XLINK_EXPANSION_TYPE]: XLINK_RETRY_ATTEMPTS,
            [HTTPRequest.MEDIA_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS,
            [HTTPRequest.INIT_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS,
            [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS,
            [HTTPRequest.INDEX_SEGMENT_TYPE]: FRAGMENT_RETRY_ATTEMPTS,
            [HTTPRequest.OTHER_TYPE]: FRAGMENT_RETRY_ATTEMPTS
        };

        this.retryIntervals = {
            [HTTPRequest.MPD_TYPE]: MANIFEST_RETRY_INTERVAL,
            [HTTPRequest.XLINK_EXPANSION_TYPE]: XLINK_RETRY_INTERVAL,
            [HTTPRequest.MEDIA_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL,
            [HTTPRequest.INIT_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL,
            [HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL,
            [HTTPRequest.INDEX_SEGMENT_TYPE]: FRAGMENT_RETRY_INTERVAL,
            [HTTPRequest.OTHER_TYPE]: FRAGMENT_RETRY_INTERVAL
        };
    }

    getCatchupPlaybackRates() {
        return { min: -0.5, max: 0.5 };
    }

    getStableBufferTime() {
        return this.stableBufferTime > -1 ? this.stableBufferTime : this.fastSwitchEnabled ? DEFAULT_MIN_BUFFER_TIME_FAST_SWITCH : DEFAULT_MIN_BUFFER_TIME;
    }

    setRetryAttemptsForType(type, value) {
        this.retryAttempts[type] = value;
    }

    getRetryAttemptsForType(type) {
        return this.retryAttempts[type];
    }

    setRetryIntervalForType(type, value) {
        this.retryIntervals[type] = value;
    }

    getRetryIntervalsForType(type) {
        return this.retryIntervals[type];
    }

    reset() {
        this.setup();
    }

    setConfig() {

    }
}

export default MediaPlayerModelMock;
