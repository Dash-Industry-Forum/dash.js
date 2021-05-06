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
import EventsBase from '../core/events/EventsBase';

/**
 * @class
 * @implements EventsBase
 */
class MediaPlayerEvents extends EventsBase {

    /**
     * @description Public facing external events to be used when developing a player that implements dash.js.
     */
    constructor() {
        super();
        /**
         * Triggered when playback will not start yet
         * as the MPD's availabilityStartTime is in the future.
         * Check delay property in payload to determine time before playback will start.
         * @event MediaPlayerEvents#AST_IN_FUTURE
         */
        this.AST_IN_FUTURE = 'astInFuture';

        /**
         * Triggered when the video element's buffer state changes to stalled.
         * Check mediaType in payload to determine type (Video, Audio, FragmentedText).
         * @event MediaPlayerEvents#BUFFER_EMPTY
         */
        this.BUFFER_EMPTY = 'bufferStalled';

        /**
         * Triggered when the video element's buffer state changes to loaded.
         * Check mediaType in payload to determine type (Video, Audio, FragmentedText).
         * @event MediaPlayerEvents#BUFFER_LOADED
         */
        this.BUFFER_LOADED = 'bufferLoaded';

        /**
         * Triggered when the video element's buffer state changes, either stalled or loaded. Check payload for state.
         * @event MediaPlayerEvents#BUFFER_LEVEL_STATE_CHANGED
         */
        this.BUFFER_LEVEL_STATE_CHANGED = 'bufferStateChanged';

        /**
         * Triggered when the buffer level of a media type has been updated
         * @event MediaPlayerEvents#BUFFER_LEVEL_UPDATED
         */
        this.BUFFER_LEVEL_UPDATED = 'bufferLevelUpdated';

        /**
         * Triggered when a dynamic stream changed to static (transition phase between Live and On-Demand).
         * @event MediaPlayerEvents#DYNAMIC_TO_STATIC
         */
        this.DYNAMIC_TO_STATIC = 'dynamicToStatic';

        /**
         * Triggered when there is an error from the element or MSE source buffer.
         * @event MediaPlayerEvents#ERROR
         */
        this.ERROR = 'error';
        /**
         * Triggered when a fragment download has completed.
         * @event MediaPlayerEvents#FRAGMENT_LOADING_COMPLETED
         */
        this.FRAGMENT_LOADING_COMPLETED = 'fragmentLoadingCompleted';

        /**
         * Triggered when a partial fragment download has completed.
         * @event MediaPlayerEvents#FRAGMENT_LOADING_PROGRESS
         */
        this.FRAGMENT_LOADING_PROGRESS = 'fragmentLoadingProgress';
        /**
         * Triggered when a fragment download has started.
         * @event MediaPlayerEvents#FRAGMENT_LOADING_STARTED
         */
        this.FRAGMENT_LOADING_STARTED = 'fragmentLoadingStarted';

        /**
         * Triggered when a fragment download is abandoned due to detection of slow download base on the ABR abandon rule..
         * @event MediaPlayerEvents#FRAGMENT_LOADING_ABANDONED
         */
        this.FRAGMENT_LOADING_ABANDONED = 'fragmentLoadingAbandoned';

        /**
         * Triggered when {@link module:Debug} logger methods are called.
         * @event MediaPlayerEvents#LOG
         */
        this.LOG = 'log';

        /**
         * Triggered when the manifest load is complete
         * @event MediaPlayerEvents#MANIFEST_LOADED
         */
        this.MANIFEST_LOADED = 'manifestLoaded';

        /**
         * Triggered anytime there is a change to the overall metrics.
         * @event MediaPlayerEvents#METRICS_CHANGED
         */
        this.METRICS_CHANGED = 'metricsChanged';

        /**
         * Triggered when an individual metric is added, updated or cleared.
         * @event MediaPlayerEvents#METRIC_CHANGED
         */
        this.METRIC_CHANGED = 'metricChanged';

        /**
         * Triggered every time a new metric is added.
         * @event MediaPlayerEvents#METRIC_ADDED
         */
        this.METRIC_ADDED = 'metricAdded';

        /**
         * Triggered every time a metric is updated.
         * @event MediaPlayerEvents#METRIC_UPDATED
         */
        this.METRIC_UPDATED = 'metricUpdated';

        /**
         * Triggered at the stream end of a period.
         * @event MediaPlayerEvents#PERIOD_SWITCH_COMPLETED
         */
        this.PERIOD_SWITCH_COMPLETED = 'periodSwitchCompleted';

        /**
         * Triggered when a new stream (period) starts.
         * @event MediaPlayerEvents#STREAM_SWITCH_STARTED
         */
        this.STREAM_SWITCH_STARTED = 'streamSwitchStarted';

        /**
         * Triggered when an ABR up /down switch is initiated; either by user in manual mode or auto mode via ABR rules.
         * @event MediaPlayerEvents#QUALITY_CHANGE_REQUESTED
         */
        this.QUALITY_CHANGE_REQUESTED = 'qualityChangeRequested';

        /**
         * Triggered when the new ABR quality is being rendered on-screen.
         * @event MediaPlayerEvents#QUALITY_CHANGE_RENDERED
         */
        this.QUALITY_CHANGE_RENDERED = 'qualityChangeRendered';

        /**
         * Triggered when the new track is being rendered.
         * @event MediaPlayerEvents#TRACK_CHANGE_RENDERED
         */
        this.TRACK_CHANGE_RENDERED = 'trackChangeRendered';

        /**
         * Triggered when a stream (period) is being loaded
         * @event MediaPlayerEvents#STREAM_INITIALIZING
         */
        this.STREAM_INITIALIZING = 'streamInitializing';

        /**
         * Triggered when a stream (period) is loaded
         * @event MediaPlayerEvents#STREAM_UPDATED
         */
        this.STREAM_UPDATED = 'streamUpdated';

        /**
         * Triggered when a stream (period) is activated
         * @event MediaPlayerEvents#STREAM_ACTIVATED
         */
        this.STREAM_ACTIVATED = 'streamActivated';

        /**
         * Triggered when a stream (period) is deactivated
         * @event MediaPlayerEvents#STREAM_DEACTIVATED
         */
        this.STREAM_DEACTIVATED = 'streamDeactivated';

        /**
         * Triggered when a stream (period) is activated
         * @event MediaPlayerEvents#STREAM_INITIALIZED
         */
        this.STREAM_INITIALIZED = 'streamInitialized';

        /**
         * Triggered when the player has been reset.
         * @event MediaPlayerEvents#STREAM_TEARDOWN_COMPLETE
         */
        this.STREAM_TEARDOWN_COMPLETE = 'streamTeardownComplete';

        /**
         * Triggered once all text tracks detected in the MPD are added to the video element.
         * @event MediaPlayerEvents#TEXT_TRACKS_ADDED
         */
        this.TEXT_TRACKS_ADDED = 'allTextTracksAdded';

        /**
         * Triggered when a text track is added to the video element's TextTrackList
         * @event MediaPlayerEvents#TEXT_TRACK_ADDED
         */
        this.TEXT_TRACK_ADDED = 'textTrackAdded';

        /**
         * Triggered when a ttml chunk is parsed.
         * @event MediaPlayerEvents#TTML_PARSED
         */
        this.TTML_PARSED = 'ttmlParsed';

        /**
         * Triggered when a ttml chunk has to be parsed.
         * @event MediaPlayerEvents#TTML_TO_PARSE
         */
        this.TTML_TO_PARSE = 'ttmlToParse';

        /**
         * Triggered when a caption is rendered.
         * @event MediaPlayerEvents#CAPTION_RENDERED
         */
        this.CAPTION_RENDERED = 'captionRendered';

        /**
         * Triggered when the caption container is resized.
         * @event MediaPlayerEvents#CAPTION_CONTAINER_RESIZE
         */
        this.CAPTION_CONTAINER_RESIZE = 'captionContainerResize';

        /**
         * Sent when enough data is available that the media can be played,
         * at least for a couple of frames.  This corresponds to the
         * HAVE_ENOUGH_DATA readyState.
         * @event MediaPlayerEvents#CAN_PLAY
         */
        this.CAN_PLAY = 'canPlay';

        /**
         * This corresponds to the CAN_PLAY_THROUGH readyState.
         * @event MediaPlayerEvents#CAN_PLAY_THROUGH
         */
        this.CAN_PLAY_THROUGH = 'canPlayThrough';

        /**
         * Sent when playback completes.
         * @event MediaPlayerEvents#PLAYBACK_ENDED
         */
        this.PLAYBACK_ENDED = 'playbackEnded';

        /**
         * Sent when an error occurs.  The element's error
         * attribute contains more information.
         * @event MediaPlayerEvents#PLAYBACK_ERROR
         */
        this.PLAYBACK_ERROR = 'playbackError';

        /**
         * Sent when playback is not allowed (for example if user gesture is needed).
         * @event MediaPlayerEvents#PLAYBACK_NOT_ALLOWED
         */
        this.PLAYBACK_NOT_ALLOWED = 'playbackNotAllowed';

        /**
         * The media's metadata has finished loading; all attributes now
         * contain as much useful information as they're going to.
         * @event MediaPlayerEvents#PLAYBACK_METADATA_LOADED
         */
        this.PLAYBACK_METADATA_LOADED = 'playbackMetaDataLoaded';

        /**
         * The media's metadata has finished loading; all attributes now
         * contain as much useful information as they're going to.
         * @event MediaPlayerEvents#PLAYBACK_METADATA_LOADED
         */
        this.PLAYBACK_LOADED_DATA = 'playbackLoadedData';

        /**
         * Sent when playback is paused.
         * @event MediaPlayerEvents#PLAYBACK_PAUSED
         */
        this.PLAYBACK_PAUSED = 'playbackPaused';

        /**
         * Sent when the media begins to play (either for the first time, after having been paused,
         * or after ending and then restarting).
         *
         * @event MediaPlayerEvents#PLAYBACK_PLAYING
         */
        this.PLAYBACK_PLAYING = 'playbackPlaying';

        /**
         * Sent periodically to inform interested parties of progress downloading
         * the media. Information about the current amount of the media that has
         * been downloaded is available in the media element's buffered attribute.
         * @event MediaPlayerEvents#PLAYBACK_PROGRESS
         */
        this.PLAYBACK_PROGRESS = 'playbackProgress';

        /**
         * Sent when the playback speed changes.
         * @event MediaPlayerEvents#PLAYBACK_RATE_CHANGED
         */
        this.PLAYBACK_RATE_CHANGED = 'playbackRateChanged';

        /**
         * Sent when a seek operation completes.
         * @event MediaPlayerEvents#PLAYBACK_SEEKED
         */
        this.PLAYBACK_SEEKED = 'playbackSeeked';

        /**
         * Sent when a seek operation begins.
         * @event MediaPlayerEvents#PLAYBACK_SEEKING
         */
        this.PLAYBACK_SEEKING = 'playbackSeeking';

        /**
         * Sent when a seek operation has been asked.
         * @event MediaPlayerEvents#PLAYBACK_SEEK_ASKED
         */
        this.PLAYBACK_SEEK_ASKED = 'playbackSeekAsked';

        /**
         * Sent when the video element reports stalled
         * @event MediaPlayerEvents#PLAYBACK_STALLED
         */
        this.PLAYBACK_STALLED = 'playbackStalled';

        /**
         * Sent when playback of the media starts after having been paused;
         * that is, when playback is resumed after a prior pause event.
         *
         * @event MediaPlayerEvents#PLAYBACK_STARTED
         */
        this.PLAYBACK_STARTED = 'playbackStarted';

        /**
         * The time indicated by the element's currentTime attribute has changed.
         * @event MediaPlayerEvents#PLAYBACK_TIME_UPDATED
         */
        this.PLAYBACK_TIME_UPDATED = 'playbackTimeUpdated';

        /**
         * Sent when the media playback has stopped because of a temporary lack of data.
         *
         * @event MediaPlayerEvents#PLAYBACK_WAITING
         */
        this.PLAYBACK_WAITING = 'playbackWaiting';

        /**
         * Manifest validity changed - As a result of an MPD validity expiration event.
         * @event MediaPlayerEvents#MANIFEST_VALIDITY_CHANGED
         */
        this.MANIFEST_VALIDITY_CHANGED = 'manifestValidityChanged';

        /**
         * Dash events are triggered at their respective start points on the timeline.
         * @event MediaPlayerEvents#EVENT_MODE_ON_START
         */
        this.EVENT_MODE_ON_START = 'eventModeOnStart';

        /**
         * Dash events are triggered as soon as they were parsed.
         * @event MediaPlayerEvents#EVENT_MODE_ON_RECEIVE
         */
        this.EVENT_MODE_ON_RECEIVE = 'eventModeOnReceive';

        /**
         * Event that is dispatched whenever the player encounters a potential conformance validation that might lead to unexpected/not optimal behavior
         * @event MediaPlayerEvents#CONFORMANCE_VIOLATION
         */
        this.CONFORMANCE_VIOLATION = 'conformanceViolation';

        /**
         * Event that is dispatched whenever the player switches to a different representation
         * @event MediaPlayerEvents#REPRESENTATION_SWITCH
         */
        this.REPRESENTATION_SWITCH = 'representationSwitch';
    }
}

let mediaPlayerEvents = new MediaPlayerEvents();
export default mediaPlayerEvents;
