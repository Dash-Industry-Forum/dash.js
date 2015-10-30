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
import EventsBase from './EventsBase.js';

class CoreEvents extends EventsBase {
    constructor () {
        super();
        // Manifest events
        this.MANIFEST_UPDATED = "manifestUpdated";
        this.MANIFEST_LOADED = "manifestLoaded";
        // RepresentationController events
        this.DATA_UPDATE_COMPLETED = "dataUpdateCompleted";
        this.DATA_UPDATE_STARTED = "dataUpdateStarted";
        // BaseURLExtensions events
        this.INITIALIZATION_LOADED = "initializationLoaded";
        this.SEGMENTS_LOADED = "segmentsLoaded";
        // DashHandler events
        this.REPRESENTATION_UPDATED = "representationUpdated";
        // BufferController events
        this.BUFFER_LEVEL_STATE_CHANGED = "bufferStateChanged";
        this.BUFFER_LEVEL_UPDATED = "bufferLevelUpdated";
        this.QUOTA_EXCEEDED = "quotaExceeded";
        this.BYTES_APPENDED = "bytesAppended";
        this.BUFFERING_COMPLETED = "bufferingCompleted";
        this.BUFFER_CLEARED = "bufferCleared";
        this.INIT_REQUESTED = "initRequested";
        // ABRController events
        this.QUALITY_CHANGED = "qualityChanged";
        // LiveEdgeFinder events
        this.LIVE_EDGE_SEARCH_COMPLETED = "liveEdgeSearchCompleted";
        // FragmentController events
        this.INIT_FRAGMENT_LOADED = "initFragmentLoaded";
        this.MEDIA_FRAGMENT_LOADED = "mediaFragmentLoaded";
        this.FRAGMENT_LOADING_COMPLETED = "fragmentLoadingCompleted";
        // FramentModel events
        this.FRAGMENT_LOADING_STARTED = "fragmentLoadingStarted";
        // Stream events
        this.STREAM_COMPLETED = "streamCompleted";
        this.STREAM_INITIALIZED = "streaminitialized";
        // MediaController events
        this.CURRENT_TRACK_CHANGED = "currenttrackchanged";
        //Playback events.
        this.PLAYBACK_METADATA_LOADED = "playbackMetaDataLoaded";
        this.PLAYBACK_PROGRESS = "playbackProgress";
        this.PLAYBACK_TIME_UPDATED = "playbackTimeUpdated";
        this.PLAYBACK_RATE_CHANGED = "playbackRateChanged";
        this.PLAYBACK_SEEKING = "playbackSeeking";
        this.PLAYBACK_SEEKED = "playbackSeeked";
        this.PLAYBACK_STARTED = "playbackStarted";
        this.CAN_PLAY = "canPlay";
        this.PLAYBACK_PLAYING = "playbackPlaying";
        this.PLAYBACK_PAUSED = "playbackPaused";
        this.PLAYBACK_ENDED = "playbackEnded";
        this.PLAYBACK_ERROR = "playbackError";
        this.TIMED_TEXT_REQUESTED = "timedTextRequested";
        this.WALLCLOCK_TIME_UPDATED = "wallclockTimeUpdated";
        // StreamController events
        this.STREAMS_COMPOSED = "streamsComposed";
        this.STREAM_TEARDOWN_COMPLETE = "streamTeardownComplete";
        this.STREAM_BUFFERING_COMPLETED = "streamBufferingCompleted";
        // XLink events,
        this.XLINK_ALL_ELEMENTS_LOADED = "xlinkAllElementsLoaded";
        this.XLINK_ELEMENT_LOADED = "xlinkElementLoaded";
        this.XLINK_READY = "xlinkReady";
        //FragmentLoader
        this.LOADING_COMPLETED = "loadingCompleted";
        this.LOADING_PROGRESS = "loadingProgress";
        this.CHECK_FOR_EXISTENCE_COMPLETED = "checkForExistenceCompleted";
        //SourceBuffer
        this.SOURCEBUFFER_APPEND_COMPLETED = "sourceBufferAppendCompleted";
        this.SOURCEBUFFER_REMOVE_COMPLETED = "sourceBufferRemoveCompleted";
        //TimeSync
        this.TIME_SYNCHRONIZATION_COMPLETED = "timeSynchronizationComplete";
        //VirtualBuffer
        this.CHUNK_APPENDED = "chunkAppended";
    } 
}

export default CoreEvents;