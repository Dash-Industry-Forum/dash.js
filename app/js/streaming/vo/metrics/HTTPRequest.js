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
MediaPlayer.vo.metrics.HTTPRequest = function () {
    "use strict";

    this.stream = null;         // type of stream ("audio" | "video" etc..)
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
    this.tfinish = null;        // Real-Time | The real time at which the request finshed.
    this.responsecode = null;   // The HTTP response code.
    this.interval = null;       // The duration of the throughput trace intervals (ms), for successful requests only.
    this.mediaduration = null;  // The duration of the media requests, if available, in milliseconds.
    this.trace = [];            // Throughput traces, for successful requests only.
};

MediaPlayer.vo.metrics.HTTPRequest.prototype = {
    constructor: MediaPlayer.vo.metrics.HTTPRequest
};

MediaPlayer.vo.metrics.HTTPRequest.Trace = function () {
    "use strict";

    /*
     * s - Real-Time | Measurement period start.
     * d - Measurement period duration (ms).
     * b - List of integers counting the bytes received in each trace interval within the measurement period.
     */
    this.s = null;
    this.d = null;
    this.b = [];
};

MediaPlayer.vo.metrics.HTTPRequest.Trace.prototype = {
    constructor : MediaPlayer.vo.metrics.HTTPRequest.Trace
};
