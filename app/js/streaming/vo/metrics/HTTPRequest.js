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
 */
MediaPlayer.vo.metrics.HTTPRequest = function () {
    "use strict";
    
    this.tcpid = null;          // Identifier of the TCP connection on which the HTTP request was sent.
    this.type = null;           // This is an optional parameter and should not be included in HTTP request/response transactions for progressive download.
                                    // The type of the request:
                                    // - MPD
                                    // - XLink expansion
                                    // - Initialization Segment
                                    // - Index Segment
                                    // - Media Segment
                                    // - Bitstream Switching Segment
                                    // - other
    this.url = null;            // The original URL (before any redirects or failures)
    this.actualurl = null;      // The actual URL requested, if different from above
    this.range = null;          // The contents of the byte-range-spec part of the HTTP Range header.
    this.trequest = null;       // Real-Time | The real time at which the request was sent.
    this.tresponse = null;      // Real-Time | The real time at which the first byte of the response was received.
    this.responsecode = null;   // The HTTP response code.
    this.interval = null;       // The duration of the throughput trace intervals (ms), for successful requests only.
    this.trace = [];            // Throughput traces, for successful requests only.
};

MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest,
    
    /*
     * s - Real-Time | Measurement period start.
     * d - Measurement period duration (ms).
     * b - List of integers counting the bytes received in each trace interval within the measurement period.
     */
    addTrace: function (s, d, b) {
        this.trace.push({
            s: s,
            d: d,
            b: b
        });
    }
};