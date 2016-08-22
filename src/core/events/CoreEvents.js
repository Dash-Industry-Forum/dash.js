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
import EventsBase from './EventsBase';

/**
 * @class
 * @ignore
 */
class CoreEvents extends EventsBase {
    constructor () {
        super();
        this.AST_IN_FUTURE = 'astinfuture';
        this.BUFFERING_COMPLETED = 'bufferingCompleted';
        this.BUFFER_CLEARED = 'bufferCleared';
        this.BUFFER_LEVEL_UPDATED = 'bufferLevelUpdated';
        this.BYTES_APPENDED = 'bytesAppended';
        this.CHECK_FOR_EXISTENCE_COMPLETED = 'checkForExistenceCompleted';
        this.CHUNK_APPENDED = 'chunkAppended';
        this.CURRENT_TRACK_CHANGED = 'currenttrackchanged';
        this.DATA_UPDATE_COMPLETED = 'dataUpdateCompleted';
        this.DATA_UPDATE_STARTED = 'dataUpdateStarted';
        this.FRAGMENT_LOADING_COMPLETED = 'fragmentLoadingCompleted';
        this.FRAGMENT_LOADING_STARTED = 'fragmentLoadingStarted';
        this.FRAGMENT_LOADING_ABANDONED = 'fragmentLoadingAbandoned';
        this.INITIALIZATION_LOADED = 'initializationLoaded';
        this.INIT_FRAGMENT_LOADED = 'initFragmentLoaded';
        this.INIT_REQUESTED = 'initRequested';
        this.INTERNAL_MANIFEST_LOADED = 'internalManifestLoaded';
        this.LIVE_EDGE_SEARCH_COMPLETED = 'liveEdgeSearchCompleted';
        this.LOADING_COMPLETED = 'loadingCompleted';
        this.LOADING_PROGRESS = 'loadingProgress';
        this.MANIFEST_UPDATED = 'manifestUpdated';
        this.MEDIA_FRAGMENT_LOADED = 'mediaFragmentLoaded';
        this.QUOTA_EXCEEDED = 'quotaExceeded';
        this.REPRESENTATION_UPDATED = 'representationUpdated';
        this.SEGMENTS_LOADED = 'segmentsLoaded';
        this.SERVICE_LOCATION_BLACKLIST_CHANGED = 'serviceLocationBlacklistChanged';
        this.SOURCEBUFFER_APPEND_COMPLETED = 'sourceBufferAppendCompleted';
        this.SOURCEBUFFER_REMOVE_COMPLETED = 'sourceBufferRemoveCompleted';
        this.STREAMS_COMPOSED = 'streamsComposed';
        this.STREAM_BUFFERING_COMPLETED = 'streamBufferingCompleted';
        this.STREAM_COMPLETED = 'streamCompleted';
        this.STREAM_INITIALIZED = 'streaminitialized';
        this.STREAM_TEARDOWN_COMPLETE = 'streamTeardownComplete';
        this.TIMED_TEXT_REQUESTED = 'timedTextRequested';
        this.TIME_SYNCHRONIZATION_COMPLETED = 'timeSynchronizationComplete';
        this.URL_RESOLUTION_FAILED = 'urlResolutionFailed';
        this.WALLCLOCK_TIME_UPDATED = 'wallclockTimeUpdated';
        this.XLINK_ALL_ELEMENTS_LOADED = 'xlinkAllElementsLoaded';
        this.XLINK_ELEMENT_LOADED = 'xlinkElementLoaded';
        this.XLINK_READY = 'xlinkReady';
    }
}

export default CoreEvents;
