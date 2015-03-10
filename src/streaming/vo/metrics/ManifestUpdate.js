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
MediaPlayer.vo.metrics.ManifestUpdate = function () {
    "use strict";

    this.mediaType = null;
    this.type = null;                       // static|dynamic
    this.requestTime = null;                // when this manifest update was requested
    this.fetchTime = null;                  // when this manifest update was received
    this.availabilityStartTime = null;
    this.presentationStartTime = 0;      // the seek point (liveEdge for dynamic, Stream[0].startTime for static)
    this.clientTimeOffset = 0;           // the calculated difference between the server and client wall clock time
    this.currentTime = null;                // actual element.currentTime
    this.buffered = null;                   // actual element.ranges
    this.latency = 0;                       // (static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - elementCurrentTime)
    this.streamInfo = [];
    this.trackInfo = [];
};

MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo = function () {
    "use strict";

    this.id = null;         // Stream@id
    this.index = null;
    this.start = null;      // Stream@start
    this.duration = null;   // Stream@duration
};

MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo = function () {
    "use strict";

    this.id = null;                         // Track@id
    this.index = null;
    this.mediaType = null;
    this.streamIndex = null;
    this.presentationTimeOffset = null;     // @presentationTimeOffset
    this.startNumber = null;                // @startNumber
    this.fragmentInfoType = null;            // list|template|timeline
};

MediaPlayer.vo.metrics.ManifestUpdate.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate
};

MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.StreamInfo
};

MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo.prototype = {
    constructor: MediaPlayer.vo.metrics.ManifestUpdate.TrackInfo
};