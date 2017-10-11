class TextTrackMock {
    constructor() {
        this.kind = null;
        this.label = null;
        this.lang = null;
    }
}

class VideoElementMock {

    setup() {
        this.playbackRate = 0;
        this.muted = false;
        this.volume = 0;
        this.currentTime = 0;
        this.duration = 0;
        this.textTracks = [];
    }

    constructor() {
        this.setup();
    }

    addTextTrack(kind, label, lang) {
        let textTrack = new TextTrackMock();
        textTrack.kind = kind;
        textTrack.label = label;
        textTrack.lang = lang;
        this.textTracks.push(textTrack);

        return textTrack;
    }

    reset() {
        this.setup();
    }
}

export default VideoElementMock;
