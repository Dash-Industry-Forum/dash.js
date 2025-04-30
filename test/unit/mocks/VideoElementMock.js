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
        this.readyState = 0;
        this.events = {};
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

    addEventListener(type, handler) {
        if (this.events.hasOwnProperty(type)) {
            this.events[type].push(handler);
        } else {
            this.events[type] = [handler];
        }
    }

    removeEventListener(type, handler) {
        if (!this.events.hasOwnProperty(type)) {
            return;
        }

        let index = this.events[type].indexOf(handler);
        if (index != -1) {
            this.events[type].splice(index, 1);
        }
    }

    dispatchEvent(event) {   
        const { type } = event;
        
        if (!this.events.hasOwnProperty(type)) {
            return;
        }

        let evs = this.events[type];
        let l = evs.length;
        for (let i = 0; i < l; i++) {
            evs[i]();
        }
    }

    reset() {
        this.setup();
    }
}

export default VideoElementMock;
