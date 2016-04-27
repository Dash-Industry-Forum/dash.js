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
 * @classdesc This Object holds reference to the manifest update information.
 */
class ManifestUpdate {
    /**
     * @class
     */
    constructor() {

        /**
         * Media Type Video | Audio | FragmentedText
         * @public
         */
        this.mediaType = null;
        /**
         * MPD Type static | dynamic
         * @public
         */
        this.type = null;
        /**
         * When this manifest update was requested
         * @public
         */
        this.requestTime = null;
        /**
         * When this manifest update was received
         * @public
         */
        this.fetchTime = null;
        /**
         * Calculated Availability Start time of the stream.
         * @public
         */
        this.availabilityStartTime = null;
        /**
         * the seek point (liveEdge for dynamic, Stream[0].startTime for static)
         * @public
         */
        this.presentationStartTime = 0;
        /**
         * The calculated difference between the server and client wall clock time
         * @public
         */
        this.clientTimeOffset = 0;
        /**
         * Actual element.currentTime
         * @public
         */
        this.currentTime = null;
        /**
         * Actual element.ranges
         * @public
         */
        this.buffered = null;
        /**
         * Static is fixed value of zero. dynamic should be ((Now-@availabilityStartTime) - elementCurrentTime)
         * @public
         */
        this.latency = 0;
        /**
         * Array holding list of StreamInfo VO Objects
         * @public
         */
        this.streamInfo = [];
        /**
         * Array holding list of TrackInfo VO Objects
         * @public
         */
        this.trackInfo = [];

    }
}

/**
 * @classdesc This Object holds reference to the current period's stream information when the manifest was updated.
 */
class ManifestUpdateStreamInfo {
    /**
     * @class
     */
    constructor() {
        /**
         * Stream@id
         * @public
         */
        this.id = null;
        /**
         * Period Index
         * @public
         */
        this.index = null;
        /**
         * Stream@start
         * @public
         */
        this.start = null;
        /**
         * Stream@duration
         * @public
         */
        this.duration = null;
    }
}

/**
 * @classdesc This Object holds reference to the current representation's info when the manifest was updated.
 */
class ManifestUpdateTrackInfo {
    /**
     * @class
     */
    constructor() {
        /**
         * Track@id
         * @public
         */
        this.id = null;
        /**
         * Representation Index
         * @public
         */
        this.index = null;
        /**
         * Media Type Video | Audio | FragmentedText
         * @public
         */
        this.mediaType = null;
        /**
         * Which reprenset
         * @public
         */
        this.streamIndex = null;
        /**
         * Holds reference to @presentationTimeOffset
         * @public
         */
        this.presentationTimeOffset = null;
        /**
         * Holds reference to @startNumber
         * @public
         */
        this.startNumber = null;
        /**
         * list|template|timeline
         * @public
         */
        this.fragmentInfoType = null;
    }
}

export { ManifestUpdate, ManifestUpdateStreamInfo, ManifestUpdateTrackInfo };
