import Constants from '../src/Constants.js';

class DashJsAdapter {

    constructor() {
        this.player = null;
        this.videoElement = document.getElementById('video-element');
        this.ttmlRenderingDiv = document.getElementById('ttml-rendering-div');
        this.startedFragmentDownloads = [];
        this.logEvents = {};
        this._onFragmentLoadedHandler = this._onFragmentLoaded.bind(this);
        this._onLogEvent = this._onLogEvent.bind(this);
    }

    /**
     * Initialize the player
     * @param autoplay
     */
    init(autoplay = true) {
        this.logEvents[dashjs.Debug.LOG_LEVEL_NONE] = [];
        this.logEvents[dashjs.Debug.LOG_LEVEL_FATAL] = [];
        this.logEvents[dashjs.Debug.LOG_LEVEL_ERROR] = [];
        this.logEvents[dashjs.Debug.LOG_LEVEL_WARNING] = [];
        this.logEvents[dashjs.Debug.LOG_LEVEL_INFO] = [];
        this.logEvents[dashjs.Debug.LOG_LEVEL_DEBUG] = [];
        this.player = dashjs.MediaPlayer().create();
        this.player.updateSettings({
            debug: {
                logLevel: 3,
                dispatchEvent: true
            }
        })
        this.player.initialize(this.videoElement, null, autoplay);
        this.attachTtmlRenderingDiv();
        this._registerInternalEvents();
    }

    getLogEvents() {
        return this.logEvents;
    }

    getVideoElement() {
        return this.videoElement
    }

    attachTtmlRenderingDiv() {
        this.player.attachTTMLRenderingDiv(this.ttmlRenderingDiv);
    }

    destroy() {
        this.logEvents = {};
        if (this.player) {
            this.player.resetSettings();
            this.player.destroy();
        }
    }

    updateSettings(settings) {
        if (this.player) {
            this.player.updateSettings(settings);
        }
    }

    getSettings() {
        return this.player.getSettings();
    }

    /**
     *
     * @private
     */
    _registerInternalEvents() {
        this.player.on(dashjs.MediaPlayer.events.FRAGMENT_LOADING_STARTED, this._onFragmentLoadedHandler)
        this.player.on(dashjs.MediaPlayer.events.LOG, this._onLogEvent)
    }

    /**
     *
     * @private
     */
    _unregisterInternalEvents() {
        this.player.off(dashjs.MediaPlayer.events.FRAGMENT_LOADING_STARTED, this._onFragmentLoadedHandler)
        this.player.off(dashjs.MediaPlayer.events.LOG, this._onLogEvent)
    }

    /**
     *
     * @param type
     * @param callback
     */
    registerEvent(type, callback) {
        this.player.on(type, callback)
    }

    /**
     *
     * @param type
     * @param callback
     */
    unregisterEvent(type, callback) {
        this.player.off(type, callback)
    }

    _onFragmentLoaded(e) {
        if (e && e.request && e.request.type === Constants.SEGMENT_TYPES.MEDIA) {
            let targetString = e.request.url;
            if (e.request.range && e.request.range !== '') {
                targetString += e.request.range;
            }
            this.startedFragmentDownloads.push(targetString);
        }
    }

    _onLogEvent(e) {
        this.logEvents[e.level].push(e.message);
    }

    /**
     * Attach a new MPD for playback
     * @param mpd
     * @param startTime
     */
    attachSource(mpd, startTime = null) {
        this.startedFragmentDownloads = [];
        this.player.attachSource(mpd, startTime);
    }

    setDrmData(data) {
        if (data) {
            this.player.setProtectionData(data);
        }
    }

    /**
     * Pause playback
     */
    pause() {
        this.player.pause();
    }

    /**
     *
     */
    play() {
        this.player.play();
    }

    /**
     *
     */
    getCurrentTime() {
        return this.player.time();
    }

    getBufferLengthByType(type) {
        return this.player.getBufferLength(type);
    }

    getTargetLiveDelay() {
        return this.player.getTargetLiveDelay();
    }

    seek(value) {
        this.player.seek(value);
    }

    getCurrentTextTrackIndex() {
        return this.player.getCurrentTextTrackIndex();
    }

    setTextTrack(idx) {
        this.player.setTextTrack(idx)
    }

    /**
     * Returns the target buffer level that the player keeps in the backwards buffer
     * @return {number|*}
     */
    getTargetBackwardsBuffer() {
        return this.player.getSettings().streaming.buffer.bufferToKeep;
    }

    /**
     * Checks whether the provided time is within a threshold compared to the current playback time
     * @param time
     * @param threshold
     * @return {boolean}
     */
    timeIsWithinThreshold(time, threshold) {
        const currentTime = this.getCurrentTime();
        return currentTime + threshold > time && currentTime - threshold < time;
    }

    /**
     * Check if any segment downloads have been triggered multiple times
     * @returns {boolean}
     */
    hasDuplicateFragmentDownloads() {
        return new Set(this.startedFragmentDownloads).size !== this.startedFragmentDownloads.length;
    }

    generateValidSeekPosition(duration = NaN) {
        duration = isNaN(duration) ? this.player.duration() : duration;
        const targetDuration = this.player.isDynamic() ? duration - this.getCurrentLiveLatency() : duration - Constants.TEST_INPUTS.SEEK.VOD_RANDOM_SEEK_DURATION_SUBTRACT_OFFSET;
        return Math.random() * targetDuration;
    }

    generateValidStartPosition() {
        if (this.isDynamic()) {
            // getDVRSeekOffset of 0 gives us the start of the DVR window relative to AST. To that number we add a random start time within the DVR window
            return (Math.random() * (this.player.getDVRWindowSize() - this.player.getTargetLiveDelay())) + this.player.getDVRSeekOffset(0);
        } else {
            return Math.random() * this.getDuration();
        }
    }

    getDuration() {
        return this.player.duration();
    }

    getDvrSeekOffset(value) {
        return this.player.getDVRSeekOffset(value);
    }

    getCurrentLiveLatency() {
        return this.player.getCurrentLiveLatency();
    }

    isDynamic() {
        return this.player.isDynamic();
    }

    getTracksFor(type) {
        return this.player.getTracksFor(type);
    }

    getCurrentTrackFor(type) {
        return this.player.getCurrentTrackFor(type);
    }

    setCurrentTrack(track) {
        this.player.setCurrentTrack(track);
    }

    /**
     * Checks if the player is in playing state when calling this function or after the configured threshold has been reached
     * @return {Promise<boolean>}
     */
    async isInPlayingState(timeoutValue) {
        return new Promise((resolve) => {
            if (!this.player.isPaused()) {
                resolve(true);
            } else {
                let timeout = null;
                const _onComplete = (res) => {
                    clearTimeout(timeout);
                    timeout = null;
                    this.player.off(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, _onPlaying);
                    resolve(res);
                }
                const _onTimeout = () => {
                    _onComplete(false);
                }
                const _onPlaying = () => {
                    _onComplete(true);
                }
                timeout = setTimeout(_onTimeout, timeoutValue);
                this.player.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, _onPlaying);
            }
        })
    }

    /**
     * Checks if the player is progressing by the provided minimum time in the provided timeout value
     * @param timeoutValue
     * @param minimumProgress
     * @return {Promise<boolean>}
     */
    async isProgressing(timeoutValue, minimumProgress) {
        return new Promise((resolve) => {
            let startTime = -1;
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(false);
            }
            const _onPlaybackTimeUpdated = (e) => {
                if (startTime < 0) {
                    startTime = e.time;
                } else {
                    if (e.time > startTime + minimumProgress) {
                        _onComplete(true);
                    }
                }
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
        })
    }

    async reachedPlaybackPosition(timeoutValue, targetTime) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(false);
            }
            const _onPlaybackTimeUpdated = (e) => {
                if (e.time >= targetTime) {
                    _onComplete(true);
                }
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
        })
    }

    async performedPeriodTransitions(timeoutValue) {
        return new Promise((resolve) => {
            let timeout = null;
            let periodSwitches = 0;

            const _onComplete = () => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, _onPeriodSwitched);
                resolve(periodSwitches);
            }
            const _onTimeout = () => {
                _onComplete();
            }
            const _onPeriodSwitched = () => {
                periodSwitches += 1;
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, _onPeriodSwitched);
        })
    }

    async isKeepingBackwardsBufferTarget(timeoutValue, target, tolerance) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(dashjs.MediaPlayer.events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(true);
            }
            const _onBufferLevelUpdated = (e) => {
                if (e.mediaType === Constants.DASH_JS.MEDIA_TYPES.VIDEO || e.mediaType === Constants.DASH_JS.MEDIA_TYPES.AUDIO) {
                    try {
                        const currentTime = this.videoElement.currentTime;
                        const bufferStart = this.videoElement.buffered.start(0);
                        if (currentTime - bufferStart > target + tolerance) {
                            _onComplete(false);
                        }
                    } catch (e) {
                    }
                }
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(dashjs.MediaPlayer.events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated);
        })
    }

    async emsgEvents(timeoutValue, schemeIdUri) {
        return new Promise((resolve) => {
            let timeout = null;
            let eventCounter = { onReceive: 0, onStart: 0 };

            const _onComplete = () => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(schemeIdUri, _onStartEvent);
                this.player.off(schemeIdUri, _onReceiveEvent);
                resolve(eventCounter);
            }
            const _onTimeout = () => {
                _onComplete();
            }
            const _onStartEvent = () => {
                eventCounter.onStart += 1;
            }
            const _onReceiveEvent = () => {
                eventCounter.onReceive += 1;
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(schemeIdUri, _onStartEvent, null); /* Default mode is onStart, no need to specify a mode */
            this.player.on(schemeIdUri, _onReceiveEvent, null, { mode: dashjs.MediaPlayer.events.EVENT_MODE_ON_RECEIVE });
        })
    }

    async waitForEvent(timeoutValue, event) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(event, _onEvent);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(false);
            }
            const _onEvent = (e) => {
                _onComplete(true);
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(event, _onEvent);
        })
    }

    async reachedTargetDelay(timeoutValue, targetDelay, tolerance) {
        return new Promise((resolve) => {
            let timeout = null;
            let delayPollInterval = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                clearInterval(delayPollInterval);
                delayPollInterval = null;
                timeout = null;
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(false);
            }
            const _onEvent = (e) => {
                _onComplete(true);
            }

            const _checkDelay = () => {
                const delay = this.getCurrentLiveLatency();
                if (Math.abs(delay - targetDelay) <= tolerance) {
                    _onComplete(true);
                }
            };
            timeout = setTimeout(_onTimeout, timeoutValue);
            delayPollInterval = setInterval(_checkDelay, 100);
        })
    }
}

export default DashJsAdapter;
