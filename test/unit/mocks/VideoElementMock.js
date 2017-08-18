class VideoElementMock {

    setup() {
		this.playbackRate = 0;
        this.muted = false;
        this.volume = 0;
        this.currentTime = 0;
        this.duration = 0;
    }

    constructor() {
        this.setup();
    }

    reset() {
        this.setup();
    }
}

export default VideoElementMock;
