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
        this.height = 600;
        this.width = 800;
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

    getPlaybackQuality() {
        let element = this.element;
        if (!element) { return null; }
        let hasWebKit = ('webkitDroppedFrameCount' in element) && ('webkitDecodedFrameCount' in element);
        let hasQuality = ('getVideoPlaybackQuality' in element);
        let result = null;

        if (hasQuality) {
            result = element.getVideoPlaybackQuality();
        }
        else if (hasWebKit) {
            result = {
                droppedVideoFrames: element.webkitDroppedFrameCount,
                totalVideoFrames: element.webkitDroppedFrameCount + element.webkitDecodedFrameCount,
                creationTime: new Date()
            };
        }

        return result;
    }

    getClientWidth() {
        return this.width;
    }

    setClientWidth(newWidth) {
        this.width = newWidth;
    }

    getClientHeight() {
        return this.height;
    }

    getVideoWidth() {
        return this.element.videoWidth;
    }

    getVideoHeight() {
        return this.element.videoHeight;
    }

    getVideoRelativeOffsetTop() {
        return 0;
    }

    getVideoRelativeOffsetLeft() {
        return 0;
    }

    getElement() {
        return this.element;
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

    getTextTrack(kind, label/*, lang, isTTML, isEmbedded*/) {
        for (let i = 0; i < this.element.textTracks.length; i++) {

            if (this.element.textTracks[i].kind === kind && (label ? this.element.textTracks[i].label == label : true)) {
                return this.element.textTracks[i];
            }
        }
        return null;
    }


    addTextTrack(kind, label, lang) {
        return this.element.addTextTrack(kind, label, lang);
    }

    getCurrentCue(textTrack) {
        return this.element.getCurrentCue(textTrack);
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
