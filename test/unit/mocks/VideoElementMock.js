class TextTrackMock {
    constructor() {
        this.kind = null;
        this.label = null;
    }
}

class VideoElementMock {

    setup() {
        this.muted = false;
        this.volume = 0;
        this.currentTime = 0;
        this.duration = 0;
        this.textTracks = [];
    }

    constructor() {
        this.setup();
    }   

    addTextTrack(kind, label) {
        let textTrack = new TextTrackMock();
        textTrack.kind = kind;
        textTrack.label = label;
        this.textTracks.push(textTrack);

        return textTrack;
    }

    reset() {
        this.setup();
    }
}

export default VideoElementMock;
