import StreamControllerMock from './StreamControllerMock';

class PlaybackControllerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.paused = false;
        this.playing = false;
        this.seeking = false;
        this.isDynamic = false;
        this.time = 0;
        this.streamController = new StreamControllerMock();
        this.streamController.setup();
    }

    initialize() {
    }

    getTimeToStreamEnd() {
        return 0;
    }

    getStreamController() {
        return this.streamController;
    }

    isPlaybackStarted() {
        return this.getTime() > 0;
    }

    getStreamId() {
        return 0;
    }

    play() {
        this.playing = true;
        this.paused = false;
        this.seeking = false;
    }

    isPlaying() {
        return this.playing;
    }

    isPaused() {
        return this.paused;
    }

    pause() {
        this.paused = true;
    }

    isSeeking() {
        return this.seeking;
    }

    seek() {
        this.seeking = true;
    }

    getTime() {
        return this.time;
    }

    setTime(time) {
        this.time = time;
    }

    getNormalizedTime() {
        return null;
    }

    getPlaybackRate() {
        return null;
    }

    getPlayedRanges() {
        return null;
    }

    getEnded() {
        return null;
    }

    setIsDynamic(value) {
        this.isDynamic = value;
    }

    getIsDynamic() {
        return this.isDynamic;
    }

    setLiveStartTime(value) {
        this.liveStartTime = value;
    }

    getLiveStartTime() {
        return this.liveStartTime;
    }

    computeAndSetLiveDelay() {
        return 15;
    }

    getLiveDelay() {
        return 15;
    }

    reset() {
        this.setup();
    }

    setConfig() {
    }

    getStreamStartTime() {
        return 0;
    }

    getAvailabilityStartTime() {
        return 0;
    }

}

export default PlaybackControllerMock;
