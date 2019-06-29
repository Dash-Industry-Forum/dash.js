class TextTrackMock {
    constructor() {
        this.kind = null;
        this.label = null;
        this.lang = null;
    }

    addCue(cue) {
        this.cue = cue;
    }

    getCurrentCue() {
        return this.cue;
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
        this.nodeName = 'VIDEO';
        this.videoWidth = 800;
        this.videoHeight = 600;
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

    getCurrentCue(textTrack) {
        return textTrack.getCurrentCue();
    }

    reset() {
        this.setup();
    }
}

export default VideoElementMock;
