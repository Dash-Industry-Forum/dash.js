import VideoElementMock from './VideoElementMock';

class VideoModelMock {
    constructor() {
        this.isplaying = false;
        this.ispaused = false;
        this.isseeking = false;
        this.time = 0;
        this.playbackRate = 1;
        this.playedRange = 1;
        this.ended = false;
        this.State = 'ready';
        this.tracks = [];
        this.source = null;
        this.element = new VideoElementMock();

        this.events = {};
    }

    addEventListener(name, handler) {
        if (this.events.hasOwnProperty(name)) {
            this.events[name].push(handler);
        } else {
            this.events[name] = [handler];
        }
    }

    removeEventListener(name, handler) {
        if (!this.events.hasOwnProperty(name)) {
            return;
        }

        let index = this.events[name].indexOf(handler);
        if (index != -1) {
            this.events[name].splice(index, 1);
        }
    }

    fireEvent(name, args) {
        if (!this.events.hasOwnProperty(name)) {
            return;
        }

        if (!args || !args.length) {
            args = [];
        }

        let evs = this.events[name];
        let l = evs.length;
        for (let i = 0; i < l; i++) {
            evs[i].apply(null, args);
        }
    }

    getElement() {
        return 'element';
    }

    play() {
        this.isplaying = true;
        this.ispaused = false;
    }

    pause() {
        this.ispaused = true;
    }

    isPaused() {
        return this.ispaused;
    }

    isSeeking() {
        return this.isseeking;
    }

    setCurrentTime(time) {
        this.time = time;
    }

    getTime() {
        return this.time;
    }

    getPlaybackRate() {
        return this.playbackRate;
    }

    getPlayedRanges() {
        return this.playedRange;
    }

    getEnded() {
        return this.ended;
    }

    getReadyState() {
        return this.state;
    }

    getTextTracks() {
        return this.tracks;
    }

    getTextTrack(idx) {
        return this.element.textTracks[idx];
    }


    addTextTrack(kind, label, lang) {
        return this.element.addTextTrack(kind, label, lang);
    }

    getTTMLRenderingDiv() {
        return {};
    }

    setSource(source) {
        this.source = source;
    }

    getSource() {
        return this.source;
    }
}

export default VideoModelMock;