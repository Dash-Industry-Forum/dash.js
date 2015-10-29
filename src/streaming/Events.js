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
let Events = (function() {
    return {
        // Manifest events
        MANIFEST_UPDATED: "manifestUpdated",
        MANIFEST_LOADED: "manifestLoaded",

        // RepresentationController events
        DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
        DATA_UPDATE_STARTED: "dataUpdateStarted",
        // BaseURLExtensions events
        INITIALIZATION_LOADED: "initializationLoaded",
        SEGMENTS_LOADED: "segmentsLoaded",
        // DashHandler events
        REPRESENTATION_UPDATED: "representationUpdated",
        // BufferController events
        BUFFER_LEVEL_STATE_CHANGED : "bufferStateChanged",
        BUFFER_LEVEL_UPDATED: "bufferLevelUpdated",
        QUOTA_EXCEEDED: "quotaExceeded",
        BYTES_APPENDED: "bytesAppended",
        BUFFERING_COMPLETED: "bufferingCompleted",
        BUFFER_CLEARED: "bufferCleared",
        INIT_REQUESTED: "initRequested",
        // ABRController events
        QUALITY_CHANGED : "qualityChanged",
        // LiveEdgeFinder events
        LIVE_EDGE_SEARCH_COMPLETED : "liveEdgeSearchCompleted",
        // FragmentController events
        INIT_FRAGMENT_LOADED: "initFragmentLoaded",
        MEDIA_FRAGMENT_LOADED: "mediaFragmentLoaded",
        FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted",
        // FramentModel events
        FRAGMENT_LOADING_STARTED: "fragmentLoadingStarted",
        // Stream events
        STREAM_COMPLETED: "streamCompleted",
        STREAM_INITIALIZED: "streaminitialized",
        // MediaController events
        CURRENT_TRACK_CHANGED: "currenttrackchanged",
        //Playback events.
        PLAYBACK_METADATA_LOADED: "playbackMetaDataLoaded",
        PLAYBACK_PROGRESS: "playbackProgress",
        PLAYBACK_TIME_UPDATED: "playbackTimeUpdated",
        PLAYBACK_RATE_CHANGED: "playbackRateChanged",
        PLAYBACK_SEEKING: "playbackSeeking",
        PLAYBACK_SEEKED: "playbackSeeked",
        PLAYBACK_STARTED: "playbackStarted",
        CAN_PLAY: "canPlay",
        PLAYBACK_PLAYING: "playbackPlaying",
        PLAYBACK_PAUSED: "playbackPaused",
        PLAYBACK_ENDED: "playbackEnded",
        PLAYBACK_ERROR: "playbackError",
        TIMED_TEXT_REQUESTED: "timedTextRequested",
        WALLCLOCK_TIME_UPDATED: "wallclockTimeUpdated",
        // StreamController events
        STREAMS_COMPOSED: "streamsComposed",
        STREAM_TEARDOWN_COMPLETE: "streamTeardownComplete",
        STREAM_BUFFERING_COMPLETED: "streamBufferingCompleted",

        // XLinkController events,
        XLINK_ALLELEMENTSLOADED: "xlinkAllElementsLoaded",
        XLINK_READY: "xlinkReady",
        //FragmentLoader
        LOADING_COMPLETED: "loadingCompleted",
        LOADING_PROGRESS: "loadingProgress",
        CHECK_FOR_EXISTENCE_COMPLETED: "checkForExistenceCompleted",
        //SourceBuffer
        SOURCEBUFFER_APPEND_COMPLETED: "sourceBufferAppendCompleted",
        SOURCEBUFFER_REMOVE_COMPLETED: "sourceBufferRemoveCompleted"

    };
}());

export default Events;
