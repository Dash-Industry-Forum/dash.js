

class InternalEventTarget {

    constructor() {
        this.listeners = {};
    }

    addEventListener(type, callback) {
        if (!(type in this.listeners)) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    removeEventListener(type, callback) {
        if (!(type in this.listeners)) {
            return;
        }
        var stack = this.listeners[type];
        for (var i = 0, l = stack.length; i < l; i++) {
            if (stack[i] === callback) {
                stack.splice(i, 1);
                return;
            }
        }
    }

    dispatchEvent(event) {
        if (!(event.type in this.listeners)) {
            return true;
        }
        var stack = this.listeners[event.type].slice();
        for (var i = 0, l = stack.length; i < l; i++) {
            stack[i].call(this, event);
        }
        return !event.defaultPrevented;
    }
}

class FakeTextTrack extends InternalEventTarget {

    constructor(kind, label, lang, isTTML, isEmbedded) {
        super();
        this.kind_ = kind;
        this.label_ = label;
        this.lang_ = lang;
        this.isTTML_ = isTTML;
        this.isEmbedded_ = isEmbedded;
        this.cues_ = [];
        this.activeCues_ = [];
        this.currentVideoTime_ = -1;
        this.mode_ = 'disabled';
        this.log('New text track', label, lang);
    }

    log(...params) {
        let message = '[FakeTextTrack][' + this.lang_ + '] ';
        Array.apply(null, params).forEach(function (item) {
            message += item + ' ';
        });
        console.log(message);
    }

    get kind() { return this.kind_; }
    get label() { return this.label_; }
    get lang() { return this.lang_; }
    get language() { return this.lang_; }
    get isTTML() { return this.isTTML_; }
    get isEmbedded() { return this.isEmbedded_; }
    get mode() { return this.mode_; }
    get active() { return this.mode_ === 'showing'; }

    set isTTML(value) { this.isTTML_ = value; }
    set isEmbedded(value) { this.isEmbedded_ = value; }

    set mode(mode) {
        this.log('mode =', mode);
        this.mode_ = mode;
    }

    get activeCues() { return this.activeCues_; }
    get cues() { return this.cues_; }

    addCue(cue) {
        this.log('add cue', cue, cue.startTime);
        if (this.cues_.indexOf(cue) === -1) {
            this.cues_.push(cue);
        }
    }

    removeCue(cue) {
        this.log('remove cue', cue);
        let cueIndex = this.cues_.indexOf(cue);
        if (cueIndex > -1) {
            this.cues_.splice(cueIndex, 1);
        }
    }

    clearCues() {
        this.cues_ = [];
        this.log('cue changed', this.cues_);
    }

    notifyTimeChange(newTime) {

        if (!this.active) { return; }

        this.log('timechanged', newTime);

        // debounce time updates
        var deltaVTime = newTime - this.currentVideoTime_;
        if (deltaVTime < 0.01 && deltaVTime > -0.01) {
            return;
        }
        this.currentVideoTime_ = newTime;

        const previousActivesCues = this.activeCues_.slice();
        this.activeCues_ = this.cues_.filter(cue => this.isCueActive(cue, this.currentVideoTime_));

        // For each old cue, exit cue
        previousActivesCues.forEach(cue => {
            if (this.activeCues_.indexOf(cue) === -1 && cue.onexit) {
                this.log('exit cue:', cue);
                cue.onexit();
            }
        });

        // For each new cue, enter cue
        this.activeCues_.forEach(cue => {
            if (previousActivesCues.indexOf(cue) === -1 && cue.onenter) {
                this.log('enter cue:', cue);
                cue.onenter();
            }
        });
    }

    isCueActive(cue, time) {
        // this.log('isCueActive cue:', cue);
        return time >= cue.startTime && time <= cue.endTime;
    }
}

class FakeMediaSource extends InternalEventTarget {

    constructor () {
        super();
        this._readyState = '';
    }

    get readyState() { return this._readyState; }
    get sourceBuffers() { return []; }

    open() {
        this._readyState = 'open';
        this.dispatchEvent(new Event('sourceopen'));
    }

    endOfStream() {}
}


class FakeHTMLMediaElement extends InternalEventTarget {

    constructor (parentNode) {
        super();
        this._parentNode = parentNode;
        this.init();
    }

    init () {
        if (this._textTracks) {
            this._textTracks.forEach(track => track.clearCues());
        }
        this._textTracks = [];
        this._paused = true;
        this._readyState = 0;
        this._duration = 0;
        this._currentTime = 0;
        this._playbackRate = 0;
        this._ended = false;
        this._clientWidth = 500;
        this._clientHeight = 300;
        this._videoWidth = 500;
        this._videoHeight = 300;
        this._preload = '';
    }

    // HTMLMediaElement API

    get nodeName() { return 'FAKE'; }
    get parentNode() { return this._parentNode; }
    get classList() { return []; }

    get readyState() { return this._readyState; }
    get paused() { return this._paused; }
    get duration() { return this._duration; }
    get currentTime() { return this._currentTime; }
    get playbackRate() { return this._playbackRate; }
    get ended() { return this._ended; }
    get textTracks() { return this._textTracks; }
    get clientWidth() { return this._parentNode.getBoundingClientRect().width; }
    get clientHeight() { return this._parentNode.getBoundingClientRect().height; }
    get videoWidth() { return this._parentNode.getBoundingClientRect().width;; }
    get videoHeight() { return this._parentNode.getBoundingClientRect().height; }

    set readyState(value) {
        if (this._readyState === value) return;
        this._readyState = value;
    }

    set duration(value) {
        if (this._duration === value) return;
        this._duration = value;
        this.dispatchEvent(new Event('durationchange'));
    }

    set playbackRate(value) {
        if (this._playbackRate === value) return;
        this._playbackRate = value;
        this.dispatchEvent(new Event('ratechange'));
    }

    set currentTime(value) {
        this.updateCurrentTime(value, false);
        this.dispatchEvent(new Event('seeking'));
        this.dispatchEvent(new Event('seeked'));
    }

    pause() {
        if (this.paused) return;
        this._paused = true;
        this.dispatchEvent(new Event('pause'));
    }

    play() {
        if (!this.paused) return;
        this._paused = false;
        this.dispatchEvent(new Event('playing'));
    }

    addTextTrack(kind, label, lang) {
        let track = new FakeTextTrack(kind, label, lang);
        this._textTracks.push(track);
        return track;
    }

    load() {}
    removeAttribute() {}
    appendChild() {}
    removeChild() {}

    getBoundingClientRect() {
        return this._parentNode.getBoundingClientRect();
    }

    // Specific methods

    updateCurrentTime(value, fireTimeupdate = true) {
        if (this._currentTime === value) return;
        this._currentTime = value;
        if (fireTimeupdate) {
            this.dispatchEvent(new Event('timeupdate'));
        }
        this._textTracks.forEach(track => track.notifyTimeChange(this._currentTime));
    }
}
