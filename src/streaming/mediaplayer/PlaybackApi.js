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
import Constants from '../constants/Constants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import { checkParameterType } from '../utils/SupervisorTools.js';
import { MEDIA_PLAYER_NOT_INITIALIZED_ERROR, PLAYBACK_NOT_INITIALIZED_ERROR } from './MediaPlayerApiErrors.js';

function PlaybackApi() {
    let instance,
        state,
        mediaPlayer;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
        if (config.mediaPlayer) {
            mediaPlayer = config.mediaPlayer;
        }
    }

    /**
     * The play method initiates playback of the media defined by the {@link module:MediaPlayer#attachSource attachSource()} method.
     * This method will call play on the native Video Element.
     *
     * @see {@link module:MediaPlayer#attachSource attachSource()}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function play() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        if (!state.autoPlay || (isPaused() && state.playbackInitialized)) {
            state.playbackController.play(true);
        }
    }

    /**
     * This method will call pause on the native Video Element.
     *
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function pause() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        state.playbackController.pause();
    }

    /**
     * Returns a Boolean that indicates whether the Video Element is paused.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isPaused() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return state.playbackController.isPaused();
    }

    /**
     * Sets the currentTime property of the attached video element.  If it is a live stream with a
     * timeShiftBufferLength, then the DVR window offset will be automatically calculated.
     *
     * @param {number} value - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected.
     * For dynamic streams duration() returns DVRWindow.end - DVRWindow.start. Consequently, the value provided to this function should be relative to DVRWindow.start.
     * @see {@link module:MediaPlayer#getDvrSeekOffset getDvrSeekOffset()}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type or is NaN.
     * @memberof module:MediaPlayer
     * @instance
     */
    function seek(value) {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        checkParameterType(value, 'number');

        if (isNaN(value)) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }

        if (value < 0) {
            value = 0;
        }

        let s = state.playbackController.getIsDynamic() ? getDvrSeekOffset(value) : value;

        // For VoD limit the seek to the duration of the content
        const videoElement = mediaPlayer.getVideoElement();
        if (!state.playbackController.getIsDynamic() && videoElement.duration) {
            s = Math.min(videoElement.duration, s);
        }

        state.playbackController.seek(s, false, false, true);
    }

    /**
     * Sets the currentTime property of the attached video element. Compared to the seek() function this function does not add the DVR window offset. Instead, it takes a presentation time relative to the availability start time.
     * For VoD this function behaves similar to the seek() function.

     * @param {number} value - A presentation time in seconds
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type or is NaN.
     * @memberof module:MediaPlayer
     * @instance
     */
    function seekToPresentationTime(seektime) {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        checkParameterType(seektime, 'number');

        if (isNaN(seektime)) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }

        if (seektime < 0) {
            seektime = 0;
        }

        // For VoD limit the seek to the duration of the content
        const videoElement = mediaPlayer.getVideoElement();
        if (!state.playbackController.getIsDynamic() && videoElement.duration) {
            seektime = Math.min(videoElement.duration, seektime);
        }

        // For live, take live delay into account
        if (state.playbackController.getIsDynamic()) {
            const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
            let metric = state.dashMetrics.getCurrentDVRInfo(type);
            if (!metric) {
                return;
            }
            seektime = _adjustSeekTimeBasedOnLiveDelay(seektime, metric)
            if (seektime < metric.range.start) {
                seektime = metric.range.start
            }
        }

        state.playbackController.seek(seektime, false, false, true);
    }

    /**
     * Seeks back to the original live edge (live edge as calculated at playback start). Only applies to live streams, for VoD streams this call will be ignored.
     */
    function seekToOriginalLive() {
        if (!state.playbackInitialized || !isDynamic()) {
            return;
        }

        state.playbackController.seekToOriginalLive();
    }

    /**
     * Returns a Boolean that indicates whether the media is in the process of seeking to a new position.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isSeeking() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return state.playbackController.isSeeking();
    }

    /**
     * Returns a Boolean that indicates whether the media is in the process of dynamic.
     * @return {boolean}
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function isDynamic() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return state.playbackController.getIsDynamic();
    }

    /**
     * Returns a boolean that indicates whether the player is operating in low latency mode.
     * @return {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getLowLatencyModeEnabled() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        return state.playbackController.getLowLatencyModeEnabled();
    }

    /**
     * Use this method to set the native Video Element's playback rate.
     * @param {number} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function setPlaybackRate(value) {
        mediaPlayer.getVideoElement().playbackRate = value;
    }

    /**
     * Returns the current playback rate.
     * @returns {number}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getPlaybackRate() {
        return mediaPlayer.getVideoElement().playbackRate;
    }

    /**
     * Use this method to set the native Video Element's muted state. Takes a Boolean that determines whether audio is muted. true if the audio is muted and false otherwise.
     * @param {boolean} value
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not boolean type.
     * @instance
     */
    function setMute(value) {
        checkParameterType(value, 'boolean');
        mediaPlayer.getVideoElement().muted = value;
    }

    /**
     * A Boolean that determines whether audio is muted.
     * @returns {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function isMuted() {
        return mediaPlayer.getVideoElement().muted;
    }

    /**
     * A double indicating the audio volume, from 0.0 (silent) to 1.0 (loudest).
     * @param {number} value
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not number type, or is NaN or not between 0 and 1.
     * @instance
     */
    function setVolume(value) {
        if (typeof value !== 'number' || isNaN(value) || value < 0.0 || value > 1.0) {
            throw Constants.BAD_ARGUMENT_ERROR;
        }
        mediaPlayer.getVideoElement().volume = value;
    }

    /**
     * Returns the current audio volume, from 0.0 (silent) to 1.0 (loudest).
     * @returns {number}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getVolume() {
        return mediaPlayer.getVideoElement().volume;
    }

    /**
     * The length of the buffer for a given media type, in seconds. Valid media
     * types are "video", "audio" and "text". If no type is passed
     * in, then the minimum of video, audio and text buffer length is
     * returned. NaN is returned if an invalid type is requested, the
     * presentation does not contain that type, or if no arguments are passed
     * and the presentation does not include any adaption sets of valid media
     * type.
     *
     * @param {MediaType} type - 'video', 'audio' or 'text'
     * @returns {number} The length of the buffer for the given media type, in
     *  seconds, or NaN
     * @memberof module:MediaPlayer
     * @instance
     */
    function getBufferLength(type) {
        const types = [Constants.VIDEO, Constants.AUDIO, Constants.TEXT];
        if (!type) {
            const buffer = types.map(
                t => mediaPlayer.getTracksFor(t).length > 0 ? state.dashMetrics.getCurrentBufferLevel(t) : Number.MAX_VALUE
            ).reduce(
                (p, c) => Math.min(p, c)
            );
            return buffer === Number.MAX_VALUE ? NaN : buffer;
        } else {
            if (types.indexOf(type) !== -1) {
                const buffer = state.dashMetrics.getCurrentBufferLevel(type);
                return buffer ? buffer : NaN;
            } else {
                state.logger.warn('getBufferLength requested for invalid type');
                return NaN;
            }
        }
    }

    /**
     * This method should only be used with a live stream that has a valid timeShiftBufferLength (DVR Window).
     * NOTE - If you do not need the raw offset value (i.e. media analytics, tracking, etc) consider using the {@link module:MediaPlayer#seek seek()} method
     * which will calculate this value for you and set the video element's currentTime property all in one simple call.
     *
     * @param {number} value - A relative time, in seconds, based on the return value of the {@link module:MediaPlayer#duration duration()} method is expected.
     * @returns {number} A value that is relative the available range within the timeShiftBufferLength (DVR Window).
     * @see {@link module:MediaPlayer#seek seek()}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getDvrSeekOffset(value) {
        const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = state.dashMetrics.getCurrentDVRInfo(type);
        if (!metric) {
            return 0;
        }

        let val = metric.range.start + value;

        return _adjustSeekTimeBasedOnLiveDelay(val, metric);
    }

    function _adjustSeekTimeBasedOnLiveDelay(seektime, metric) {
        let liveDelay = state.playbackController.getOriginalLiveDelay();
        if (seektime > (metric.range.end - liveDelay)) {
            seektime = metric.range.end - liveDelay;
        }

        return seektime;
    }

    /**
     * Returns the target live delay
     * @returns {number} The target live delay
     * @memberof module:MediaPlayer
     * @instance
     */
    function getTargetLiveDelay() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        return state.playbackController.getOriginalLiveDelay();
    }

    /**
     * Current playhead time in seconds.
     *
     * If called with no arguments then the returned value is the current time of the video element.
     * However, if a period ID is supplied then time is relative to the start of that period, or is null if there is no such period id in the manifest.
     *
     * @param {string} periodId - The ID of a period that the returned playhead time must be relative to the start of. If undefined, then playhead time is relative to the first period or the AST.
     * @returns {number} The current playhead time of the media, or null.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function time(periodId = '') {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        let t = mediaPlayer.getVideoElement().currentTime;

        if (periodId !== '') {
            t = state.streamController.getTimeRelativeToStreamId(t, periodId);
        }

        return t;
    }

    /**
     * Returns the current playhead time relative to the start of the DVR window.
     * For VoD this method returns the same value as time()
     * @returns {number} The current playhead time of the media relative to the start of the DVR window
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function timeInDvrWindow() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        if (!state.playbackController.getIsDynamic()) {
            return time()
        }

        let t = mediaPlayer.getVideoElement().currentTime;
        const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = state.dashMetrics.getCurrentDVRInfo(type);
        t = (metric === null || t === 0) ? 0 : Math.max(0, (t - metric.range.start));

        return t
    }

    /**
     * Returns information about the current DVR window including the start time, the end time, the window size.
     * @returns {{startAsUtc: (*|number), size: number, endAsUtc: (*|number), start, end}|{}}
     */
    function getDvrWindow() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = state.dashMetrics.getCurrentDVRInfo(type);

        if (!metric) {
            return {}
        }

        let offset = 0;
        const isDynamic = state.playbackController.getIsDynamic();
        if (isDynamic) {
            offset = metric.manifestInfo.availableFrom.getTime() / 1000;
        }
        return {
            start: metric.range.start,
            end: metric.range.end,
            startAsUtc: isDynamic ? offset + metric.range.start : NaN,
            endAsUtc: isDynamic ? offset + metric.range.end : NaN,
            size: metric.range.end - metric.range.start
        }
    }

    /**
     * Total duration of the media in seconds.
     *
     * @returns {number} The total duration of the media. For a dynamic stream this will return DVRWindow.end - DVRWindow.start
     * @memberof module:MediaPlayer
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @instance
     */
    function duration() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }
        let d = mediaPlayer.getVideoElement().duration;

        if (state.playbackController.getIsDynamic()) {
            const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
            let metric = state.dashMetrics.getCurrentDVRInfo(type);
            d = metric ? (metric.range.end - metric.range.start) : 0;
        }
        return d;
    }

    /**
     * Use this method to get the current playhead time as an absolute value in seconds since midnight UTC, Jan 1 1970.
     * Note - this property only has meaning for live streams and is NaN for VoD content. If called before play() has begun, it will return a value of NaN.
     *
     * @returns {number} The current playhead time as UTC timestamp.
     * @throws {@link module:MediaPlayer~PLAYBACK_NOT_INITIALIZED_ERROR PLAYBACK_NOT_INITIALIZED_ERROR} if called before initializePlayback function
     * @memberof module:MediaPlayer
     * @instance
     */
    function timeAsUTC() {
        if (!state.playbackInitialized) {
            throw PLAYBACK_NOT_INITIALIZED_ERROR;
        }

        if (!state.playbackController.getIsDynamic() || time() < 0) {
            return NaN
        }

        const type = state.streamController && state.streamController.hasVideoTrack() ? Constants.VIDEO : Constants.AUDIO;
        let metric = state.dashMetrics.getCurrentDVRInfo(type);
        let availabilityStartTime,
            utcValue;

        if (!metric) {
            return 0;
        }
        availabilityStartTime = metric.manifestInfo.availableFrom.getTime() / 1000;
        utcValue = availabilityStartTime + time()
        return utcValue;
    }

    /**
     * <p>Set to false to prevent stream from auto-playing when the view is attached.</p>
     *
     * @param {boolean} value
     * @default true
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#attachView attachView()}
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with an invalid argument, not boolean type.
     * @instance
     *
     */
    function setAutoPlay(value) {
        checkParameterType(value, 'boolean');
        state.autoPlay = value;
    }

    /**
     * @returns {boolean} The current autoPlay state.
     * @memberof module:MediaPlayer
     * @instance
     */
    function getAutoPlay() {
        return state.autoPlay;
    }

    /**
     * @memberof module:MediaPlayer
     * @instance
     * @returns {number|NaN} Current live stream latency in seconds. It is the difference between now time and time position at the playback head.
     * @throws {@link module:MediaPlayer~MEDIA_PLAYER_NOT_INITIALIZED_ERROR MEDIA_PLAYER_NOT_INITIALIZED_ERROR} if called before initialize function
     */
    function getCurrentLiveLatency() {
        if (!state.mediaPlayerInitialized) {
            throw MEDIA_PLAYER_NOT_INITIALIZED_ERROR;
        }

        if (!state.playbackInitialized) {
            return NaN;
        }

        return state.playbackController.getCurrentLiveLatency();
    }

    instance = {
        duration,
        getAutoPlay,
        getBufferLength,
        getCurrentLiveLatency,
        getDvrSeekOffset,
        getDvrWindow,
        getLowLatencyModeEnabled,
        getPlaybackRate,
        getTargetLiveDelay,
        getVolume,
        isDynamic,
        isMuted,
        isPaused,
        isSeeking,
        pause,
        play,
        seek,
        seekToOriginalLive,
        seekToPresentationTime,
        setAutoPlay,
        setConfig,
        setMute,
        setPlaybackRate,
        setVolume,
        time,
        timeAsUTC,
        timeInDvrWindow,
    };

    return instance;
}

PlaybackApi.__dashjs_factory_name = 'PlaybackApi';
export default FactoryMaker.getClassFactory(PlaybackApi);
