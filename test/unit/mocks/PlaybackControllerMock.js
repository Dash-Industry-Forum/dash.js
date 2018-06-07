class PlaybackControllerMock {

    constructor() {
        this.setup();
    }

    setup() {
        this.paused = false;
        this.playing = false;
        this.seeking = false;
        this.isDynamic = false;
        this.catchUpPlaybackRate = 0.05;
    }

    initialize() {}

    getTimeToStreamEnd() {
        return 0;
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

    computeLiveDelay() {
        return 16;
    }

    reset() {
        this.setup();
    }

    setConfig() {
    }

    getStreamStartTime() {
        return 0;
    }

    setCatchUpPlaybackRate(value) {
        this.catchUpPlaybackRate = value;
    }

    getCatchUpPlaybackRate() {
        return this.catchUpPlaybackRate;
    }
}

export default PlaybackControllerMock;
