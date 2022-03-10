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
 * These are internal events that should not be needed at the player level.
 * If you find and event in here that you would like access to from MediaPlayer level
 * please add an issue at https://github.com/Dash-Industry-Forum/dash.js/issues/new
 * @class
 * @ignore
 */
class CoreEvents extends EventsBase {
    constructor () {
        super();
        this.ATTEMPT_BACKGROUND_SYNC = 'attemptBackgroundSync';
        this.BUFFERING_COMPLETED = 'bufferingCompleted';
        this.BUFFER_CLEARED = 'bufferCleared';
        this.BYTES_APPENDED_END_FRAGMENT = 'bytesAppendedEndFragment';
        this.BUFFER_REPLACEMENT_STARTED = 'bufferReplacementStarted';
        this.CHECK_FOR_EXISTENCE_COMPLETED = 'checkForExistenceCompleted';
        this.CURRENT_TRACK_CHANGED = 'currentTrackChanged';
        this.DATA_UPDATE_COMPLETED = 'dataUpdateCompleted';
        this.INBAND_EVENTS = 'inbandEvents';
        this.INITIAL_STREAM_SWITCH = 'initialStreamSwitch';
        this.INIT_FRAGMENT_LOADED = 'initFragmentLoaded';
        this.INIT_FRAGMENT_NEEDED = 'initFragmentNeeded';
        this.INTERNAL_MANIFEST_LOADED = 'internalManifestLoaded';
        this.ORIGINAL_MANIFEST_LOADED = 'originalManifestLoaded';
        this.LOADING_COMPLETED = 'loadingCompleted';
        this.LOADING_PROGRESS = 'loadingProgress';
        this.LOADING_DATA_PROGRESS = 'loadingDataProgress';
        this.LOADING_ABANDONED = 'loadingAborted';
        this.MANIFEST_UPDATED = 'manifestUpdated';
        this.MEDIA_FRAGMENT_LOADED = 'mediaFragmentLoaded';
        this.MEDIA_FRAGMENT_NEEDED = 'mediaFragmentNeeded';
        this.QUOTA_EXCEEDED = 'quotaExceeded';
        this.SEGMENT_LOCATION_BLACKLIST_ADD = 'segmentLocationBlacklistAdd';
        this.SEGMENT_LOCATION_BLACKLIST_CHANGED = 'segmentLocationBlacklistChanged';
        this.SERVICE_LOCATION_BLACKLIST_ADD = 'serviceLocationBlacklistAdd';
        this.SERVICE_LOCATION_BLACKLIST_CHANGED = 'serviceLocationBlacklistChanged';
        this.SET_FRAGMENTED_TEXT_AFTER_DISABLED = 'setFragmentedTextAfterDisabled';
        this.SET_NON_FRAGMENTED_TEXT = 'setNonFragmentedText';
        this.SOURCE_BUFFER_ERROR = 'sourceBufferError';
        this.STREAMS_COMPOSED = 'streamsComposed';
        this.STREAM_BUFFERING_COMPLETED = 'streamBufferingCompleted';
        this.STREAM_REQUESTING_COMPLETED = 'streamRequestingCompleted';
        this.TEXT_TRACKS_QUEUE_INITIALIZED = 'textTracksQueueInitialized';
        this.TIME_SYNCHRONIZATION_COMPLETED = 'timeSynchronizationComplete';
        this.UPDATE_TIME_SYNC_OFFSET = 'updateTimeSyncOffset';
        this.URL_RESOLUTION_FAILED = 'urlResolutionFailed';
        this.VIDEO_CHUNK_RECEIVED = 'videoChunkReceived';
        this.WALLCLOCK_TIME_UPDATED = 'wallclockTimeUpdated';
        this.XLINK_ELEMENT_LOADED = 'xlinkElementLoaded';
        this.XLINK_READY = 'xlinkReady';
        this.SEEK_TARGET = 'seekTarget';
    }
}

export default CoreEvents;
