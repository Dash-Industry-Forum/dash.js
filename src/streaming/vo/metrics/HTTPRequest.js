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
/**
 * @classdesc This Object holds reference to the HTTPRequest for manifest, fragment and xlink loading.
 * Members which are not defined in ISO23009-1 Annex D should be prefixed by a _ so that they are ignored
 * by Metrics Reporting code.
 */
class HTTPRequest {
    /**
     * @class
     */
    constructor() {
        /**
         * Identifier of the TCP connection on which the HTTP request was sent.
         * @public
         */
        this.tcpid = null;
        /**
         * This is an optional parameter and should not be included in HTTP request/response transactions for progressive download.
         * The type of the request:
         * - MPD
         * - XLink expansion
         * - Initialization Fragment
         * - Index Fragment
         * - Media Fragment
         * - Bitstream Switching Fragment
         * - other
         * @public
         */
        this.type = null;
        /**
         * The original URL (before any redirects or failures)
         * @public
         */
        this.url = null;
        /**
         * The actual URL requested, if different from above
         * @public
         */
        this.actualurl = null;
        /**
         * The contents of the byte-range-spec part of the HTTP Range header.
         * @public
         */
        this.range = null;
        /**
         * Real-Time | The real time at which the request was sent.
         * @public
         */
        this.trequest = null;
        /**
         * Real-Time | The real time at which the first byte of the response was received.
         * @public
         */
        this.tresponse = null;
        /**
         * The HTTP response code.
         * @public
         */
        this.responsecode = null;
        /**
         * The duration of the throughput trace intervals (ms), for successful requests only.
         * @public
         */
        this.interval = null;
        /**
         * Throughput traces, for successful requests only.
         * @public
         */
        this.trace = [];

        /**
         * Type of stream ("audio" | "video" etc..)
         * @public
         */
        this._stream = null;
        /**
         * Real-Time | The real time at which the request finished.
         * @public
         */
        this._tfinish = null;
        /**
         * The duration of the media requests, if available, in milliseconds.
         * @public
         */
        this._mediaduration = null;
        /**
         * all the response headers from request.
         * @public
         */
        this._responseHeaders = null;
        /**
         * The selected service location for the request. string.
         * @public
         */
        this._serviceLocation = null;
    }
}

/**
 * @classdesc This Object holds reference to the progress of the HTTPRequest.
 */
class HTTPRequestTrace {
    /**
    * @class
    */
    constructor() {
        /**
         * Real-Time | Measurement stream start.
         * @public
         */
        this.s = null;
        /**
         * Measurement stream duration (ms).
         * @public
         */
        this.d = null;
        /**
         * List of integers counting the bytes received in each trace interval within the measurement stream.
         * @public
         */
        this.b = [];
    }
}

HTTPRequest.MPD_TYPE = 'MPD';
HTTPRequest.XLINK_EXPANSION_TYPE = 'XLinkExpansion';
HTTPRequest.INIT_SEGMENT_TYPE = 'InitializationSegment';
HTTPRequest.INDEX_SEGMENT_TYPE = 'IndexSegment';
HTTPRequest.MEDIA_SEGMENT_TYPE = 'MediaSegment';
HTTPRequest.BITSTREAM_SWITCHING_SEGMENT_TYPE = 'BitstreamSwitchingSegment';
HTTPRequest.OTHER_TYPE = 'other';

export { HTTPRequest, HTTPRequestTrace };
