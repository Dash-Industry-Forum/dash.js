import Constants from '../src/Constants.js';
import {getRandomNumber} from '../test/common/common.js';
import {MediaPlayer, Debug} from '../../../dist/esm/dash.all.min.esm.js';
import '../../../dist/dash.mss.min.js';

class DashJsAdapter {

    constructor() {
        this.player = null;
        this.videoElement = document.getElementById('video-element');
        this.ttmlRenderingDiv = document.getElementById('ttml-rendering-div');
        this.startedFragmentDownloads = [];
        this.logEvents = {};
        this.errorEvents = [];
        this._onFragmentLoadedHandler = this._onFragmentLoaded.bind(this);
        this._onLogEvent = this._onLogEvent.bind(this);
        this._onErrorEvent = this._onErrorEvent.bind(this);
    }

    /**
     * Initialize the player
     * @param autoplay
     */
    init(autoplay = true) {
        this._initLogEvents();
        this._createPlayerInstance();

        this.player.initialize(this.videoElement, null, autoplay);
        this.attachTtmlRenderingDiv();
        this._registerInternalEvents();
    }

    initForPreload(mpd) {
        this._initLogEvents();
        this._createPlayerInstance();
        this.player.initialize(null, mpd, true);
        this.player.updateSettings({
            streaming: {
                cacheInitSegments: true
            }
        })
    }

    _initLogEvents() {
        this.logEvents[Debug.LOG_LEVEL_NONE] = [];
        this.logEvents[Debug.LOG_LEVEL_FATAL] = [];
        this.logEvents[Debug.LOG_LEVEL_ERROR] = [];
        this.logEvents[Debug.LOG_LEVEL_WARNING] = [];
        this.logEvents[Debug.LOG_LEVEL_INFO] = [];
        this.logEvents[Debug.LOG_LEVEL_DEBUG] = [];
    }

    _createPlayerInstance() {
        this.player = MediaPlayer().create();
        this.player.updateSettings({
            debug: {
                logLevel: 3,
                dispatchEvent: true
            }
        })
    }

    attachView() {
        this.player.attachView(this.videoElement)
    }

    getLogEvents() {
        return this.logEvents;
    }

    getErrorEvents() {
        return this.errorEvents;
    }

    getVideoElement() {
        return this.videoElement
    }

    attachTtmlRenderingDiv() {
        this.player.attachTTMLRenderingDiv(this.ttmlRenderingDiv);
    }

    destroy() {
        this.logEvents = {};
        this.errorEvents = [];
        if (this.player) {
            this._unregisterInternalEvents();
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

    setInitialMediaSettingsFor(type, value) {
        this.player.setInitialMediaSettingsFor(type, value)
    }

    /**
     *
     * @private
     */
    _registerInternalEvents() {
        this.player.on(MediaPlayer.events.FRAGMENT_LOADING_STARTED, this._onFragmentLoadedHandler);
        this.player.on(MediaPlayer.events.LOG, this._onLogEvent);
        this.player.on(MediaPlayer.events.ERROR, this._onErrorEvent);
    }

    /**
     *
     * @private
     */
    _unregisterInternalEvents() {
        this.player.off(MediaPlayer.events.FRAGMENT_LOADING_STARTED, this._onFragmentLoadedHandler)
        this.player.off(MediaPlayer.events.LOG, this._onLogEvent)
        this.player.off(MediaPlayer.events.ERROR, this._onErrorEvent);

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

    _onErrorEvent(e) {
        this.errorEvents.push(e);
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

    preload() {
        this.player.preload()
    }

    /**
     *
     */
    getCurrentTime() {
        return this.player.time();
    }

    getCurrentTimeWithinDvrWindow() {
        return this.player.timeInDvrWindow();
    }

    getBufferLengthByType(type) {
        return this.player.getBufferLength(type);
    }

    getTargetLiveDelay() {
        return this.player.getTargetLiveDelay();
    }

    getManifest() {
        return this.player.getManifest();
    }

    seek(value) {
        this.player.seek(value);
    }

    seekToPresentationTime(value) {
        this.player.seekToPresentationTime(value);
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
     * Checks whether the provided time is within a threshold compared to the current playback time within the DVR window
     * @param time
     * @param threshold
     * @return {boolean}
     */
    timeWithinThresholdForDvrWindow(time, threshold) {
        const currentTime = this.getCurrentTimeWithinDvrWindow();
        return currentTime + threshold > time && currentTime - threshold < time;
    }

    /**
     * Checks whether the provided time is within a threshold compared to the current playback time. Works with absolute presentation times
     * @param time
     * @param threshold
     * @return {boolean}
     */
    timeWithinThreshold(time, threshold) {
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
        duration = isNaN(duration) ? this.getDuration() : duration;
        const targetDuration = this.isDynamic() ? duration - this.getCurrentLiveLatency() : duration - Constants.TEST_INPUTS.SEEK.VOD_RANDOM_SEEK_DURATION_SUBTRACT_OFFSET;
        return Math.random() * targetDuration;
    }

    generateValidPresentationTimeSeekPosition() {
        let min;
        let max;

        if (this.isDynamic()) {
            const dvrWindow = this.getDvrWindow();
            min = dvrWindow.start
            max = dvrWindow.end - this.getTargetLiveDelay();
        } else {
            min = 0;
            max = this.getDuration() - Constants.TEST_INPUTS.SEEK.VOD_RANDOM_SEEK_DURATION_SUBTRACT_OFFSET;
        }

        return getRandomNumber(min, max);
    }

    generateValidStartPosition() {
        if (this.isDynamic()) {
            // getDvrSeekOffset of 0 gives us the start of the DVR window relative to AST. To that number we add a random start time within the DVR window
            return (Math.random() * (this.player.getDvrWindow().size - this.player.getTargetLiveDelay())) + this.player.getDvrSeekOffset(0);
        } else {
            return Math.random() * this.getDuration();
        }
    }

    getDuration() {
        return this.player.duration();
    }

    getDvrSeekOffset(value) {
        return this.player.getDvrSeekOffset(value);
    }

    getDvrWindow() {
        return this.player.getDvrWindow();
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

    getRepresentationsByType(type) {
        return this.player.getRepresentationsByType(type);
    }

    getCurrentRepresentationForType(type) {
        return this.player.getCurrentRepresentationForType(type);
    }

    setRepresentationForTypeById(type, id) {
        this.player.setRepresentationForTypeById(type, id);
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
                    this.player.off(MediaPlayer.events.PLAYBACK_PLAYING, _onPlaying);
                    resolve(res);
                }
                const _onTimeout = () => {
                    _onComplete(false);
                }
                const _onPlaying = () => {
                    _onComplete(true);
                }
                timeout = setTimeout(_onTimeout, timeoutValue);
                this.player.on(MediaPlayer.events.PLAYBACK_PLAYING, _onPlaying);
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
                this.player.off(MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
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
            this.player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
        })
    }

    async reachedPlaybackPosition(timeoutValue, targetTime) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
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
            this.player.on(MediaPlayer.events.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated);
        })
    }

    async performedPeriodTransitions(timeoutValue) {
        return new Promise((resolve) => {
            let timeout = null;
            let periodSwitches = 0;

            const _onComplete = () => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(MediaPlayer.events.PERIOD_SWITCH_COMPLETED, _onPeriodSwitched);
                resolve(periodSwitches);
            }
            const _onTimeout = () => {
                _onComplete();
            }
            const _onPeriodSwitched = () => {
                periodSwitches += 1;
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(MediaPlayer.events.PERIOD_SWITCH_COMPLETED, _onPeriodSwitched);
        })
    }

    async isKeepingBackwardsBufferTarget(timeoutValue, target, tolerance) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(MediaPlayer.events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(true);
            }
            const _onBufferLevelUpdated = (e) => {
                if (e.mediaType === Constants.DASH_JS.MEDIA_TYPES.VIDEO || e.mediaType === Constants.DASH_JS.MEDIA_TYPES.AUDIO) {
                    try {
                        const currentTime = this.videoElement.currentTime;
                        const bufferStart = this.getBufferStartForCurrentTime(currentTime);
                        if (currentTime - bufferStart > target + tolerance) {
                            _onComplete(false);
                        }
                    } catch (e) {
                    }
                }
            }

            const _onBufferingCompleted = () => {
                const currentTime = this.videoElement.currentTime;
                if (currentTime > 0) {
                    _onComplete(true);
                }
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(MediaPlayer.events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated);
            this.player.on('bufferingCompleted', _onBufferingCompleted);
        })
    }

    getBufferStartForCurrentTime(currentTime) {
        const ranges = this.videoElement.buffered;
        for (let i = 0; i < ranges.length; i++) {
            if (ranges.start(i) <= currentTime && ranges.end(i) >= currentTime) {
                return ranges.start(i)
            }
        }

        return ranges.start(0);
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
            this.player.on(schemeIdUri, _onReceiveEvent, null, { mode: MediaPlayer.events.EVENT_MODE_ON_RECEIVE });
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

    async waitForEventAndGetPayload(timeoutValue, event) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(event, _onEvent);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete(null);
            }
            const _onEvent = (e) => {
                _onComplete(e);
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(event, _onEvent);
        })
    }

    async waitForMediaSegmentDownload(timeoutValue) {
        return new Promise((resolve) => {
            let timeout = null;

            const _onComplete = (res) => {
                clearTimeout(timeout);
                timeout = null;
                this.player.off(event, _onEvent);
                resolve(res);
            }
            const _onTimeout = () => {
                _onComplete({});
            }
            const _onEvent = (e) => {
                if (e.request.type === 'MediaSegment') {
                    _onComplete(e);
                }
            }
            timeout = setTimeout(_onTimeout, timeoutValue);
            this.player.on(MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, _onEvent);
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

    async reachedTargetForwardBuffer(timeoutValue, targetBuffer, tolerance) {
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

            const _checkBuffer = () => {
                const buffer = this.getBufferLengthByType();
                if (buffer >= targetBuffer) {
                    _onComplete(true);
                }
            };
            timeout = setTimeout(_onTimeout, timeoutValue);
            delayPollInterval = setInterval(_checkBuffer, 100);
        })
    }

    async sleep(timeoutValue) {
        return new Promise((resolve) => {
            setTimeout(resolve, timeoutValue)
        });
    }
}

export default DashJsAdapter;
