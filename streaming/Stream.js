/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * copyright Digital Primates 2012
 */
function Stream(element, factory, callback) {
    "use strict";

    if (!(this instanceof Stream)) {
        return new Stream(element, factory, callback);
    }

    this.mediaSource = null;
    this.manifestUrl = null;
    this.manifest = null;
    this.audios = null;

    this.autoSwitchBitrate = true;
    this.audioIndex = 0;

    this.videoManager = null;
    this.audioManager = null;

    this.videoElementInitialized = false;
    this.mediaSourceInitialized = false;

    this.element = element;
    this.factory = factory;
    this.seekTarget = -1;
    
    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener("load", this.onManifestLoad.bind(this), false);
    this.xhr.addEventListener("error", this.onManifestLoadError.bind(this), false);

    this.refresh = new XMLHttpRequest();
    this.refresh.addEventListener("load", this.onManifestRefresh.bind(this), false);
    this.refresh.addEventListener("error", this.onManifestLoadError.bind(this), false);

    callback(this);
}

Stream.modules = {};
Stream.rules = {};
Stream.vo = {};
Stream.utils = {};

Stream.utils.inherit = function (C, P) {
    "use strict";
    var F = function () { };
    F.prototype = P.prototype;
    C.prototype = new F();
    C.uber = P.prototype;
    C.prototype.constructor = C;
};

// default implementation
Stream.modules.debug = (function () {
    "use strict";
    return {
        log: function (message) {
            console.log(message);
        }
    };
}());

Stream.prototype = {
    play: function () {
        var debug = Stream.modules.debug;
        debug.log("Attempt play...");

        if (!this.videoElementInitialized || !this.mediaSourceInitialized) {
            return;
        }

        debug.log("Do play.");
        this.element.play();
    },

    pause: function () {
        var debug = Stream.modules.debug;
        debug.log("Attempt pause...");

        if (!this.videoElementInitialized || !this.mediaSourceInitialized) {
            return;
        }

        debug.log("Do pause.");
        this.element.pause();
    },

    seek: function (time) {
        var debug = Stream.modules.debug;
        debug.log("Attempt seek...");

        if (!this.videoElementInitialized || !this.mediaSourceInitialized) {
            return;
        }

        debug.log("Do seek.");

        this.seekTarget = time;
        this.element.play();
    },

    load: function (url) {
        var debug = Stream.modules.debug;
        debug.log("Start loading manifest.");

        this.manifestUrl = url;
        this.xhr.open("GET", this.manifestUrl, true);
        this.xhr.send(null);
    },

    startManifestRefresh: function () {
        var refreshTime = (this.manifest.minimumUpdatePeriod * 1000),
            debug = Stream.modules.debug,
            me = this;

        if (!isNaN(refreshTime) && refreshTime > 0) {
            debug.log("Start manifest refresh.");
            setTimeout(function () {
                me.refresh.open("GET", me.manifestUrl, true);
                me.refresh.send(null);
            }, refreshTime);
        }
    },

    // INITIALIZATION

    initializePlayback: function () {
        if (!this.videoElementInitialized || !this.mediaSourceInitialized) {
            return;
        }

        var debug = Stream.modules.debug,
            now = new Date(),
            start = this.manifest.availabilityStartTime,
            liveOffset = (now.getTime() - start.getTime()) / 1000;

        debug.log("Attempt to start playback for the first time...");

        if (this.manifest.getIsLive()) {
            this.mediaSource.duration = Number.POSITIVE_INFINITY;
            debug.log("Live event, set infinity duration.");
            debug.log("Seek to live point and start playback: " + this.liveOffset);
            this.seek(this.liveOffset);
        } else {
            this.mediaSource.duration = this.manifest.getDuration();
            debug.log("Set media duration: " + this.manifest.getDuration());
            this.play();
            debug.log("Start stream playback.");
        }
    },

    // HANDLERS

    finishSeek: function () {
        var debug = Stream.modules.debug;
        debug.log("Finish seek.");

        if (this.videoManager) {
            this.videoManager.seek(this.seekTarget);
        }
        if (this.audioManager) {
            this.audioManager.seek(this.seekTarget);
        }
        this.seekTarget = -1;
    },

    onPlay: function (e) {
        var debug = Stream.modules.debug;
        debug.log("Got onPlay event.");

        if (!this.videoElementInitialized || !this.mediaSourceInitialized) {
            return;
        }

        if (this.seekTarget !== -1) {
            this.finishSeek();
        } else {
            debug.log("Start playback.");

            if (this.videoManager) {
                this.videoManager.play();
            }
            if (this.audioManager) {
                this.audioManager.play();
            }
        }
    },

    onPause: function (e) {
        var debug = Stream.modules.debug;
        debug.log("Pause playback.");

        if (this.videoManager) {
            this.videoManager.pause();
        }
        if (this.audioManager) {
            this.audioManager.pause();
        }
    },

    onSeeking: function (e) {
        var debug = Stream.modules.debug;
        debug.log("Process seek: " + this.element.currentTime);

        if (this.videoManager) {
            this.videoManager.seek(this.element.currentTime);
        }
        if (this.audioManager) {
            this.audioManager.seek(this.element.currentTime);
        }
    },

    onProgress: function (e) {

    },

    onMediaSourceReady: function (e) {
        var debug = Stream.modules.debug,
            data,
            buffer,
            indexHandler,
            bufferTime = this.manifest.minBufferTime,
            i,
            max,
            manifestDuration = this.manifest.getDuration(),
            manifestIsLive = this.manifest.getIsLive();

        debug.log("MediaSource initialized!");

        if (isNaN(this.bufferTime) || this.bufferTime <= 0) {
            this.bufferTime = 4;
        }

        debug.log("Buffer time: " + this.bufferTime);

        if (this.manifest.hasVideoStream()) {
            debug.log("Create video buffer.");

            // assume one video stream
            data = this.manifest.getVideoData();
            debug.log("Video codec: " + data.getCodec());

            buffer = this.mediaSource.addSourceBuffer(data.getCodec());
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), manifestDuration, manifestIsLive);
            this.videoManager = new Stream.modules.BufferManager(this.element, buffer, indexHandler, this.bufferTime, "video");
            this.videoManager.autoSwitchBitrate = this.autoSwitchBitrate;
        } else {
            debug.log("No video data.");
        }

        if (this.manifest.hasAudioStream()) {
            debug.log("Create audio buffer.");
            // assume multiple audio streams
            audios = this.manifest.getAudioDatas();
            debug.log("Num audio streams: " + audios.length);

            // get primary audio stream to start
            data = this.manifest.getPrimaryAudioData();
            debug.log("Audio codec: " + data.getCodec());

            // figure out index of main audio stream
            if (audios.length === 1) {
                audioIndex = 0;
            } else {
                for (i = 0, max = audios.length; i < max; i += 1) {
                    if (audios[i] === data) {
                        audioIndex = i;
                        break;
                    }
                }
            }

            buffer = this.mediaSource.addSourceBuffer(data.getCodec());
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), manifestDuration, manifestIsLive);
            this.audioManager = new Stream.modules.BufferManager(this.element, buffer, indexHandler, this.bufferTime, "audio");
            this.audioManager.autoSwitchBitrate = this.autoSwitchBitrate;
        } else {
            debug.log("No audio data.");
        }

        this.mediaSourceInitialized = true;
        this.initializePlayback();
    },

    onMediaSourceClose: function (e) {
        var debug = Stream.modules.debug;
        debug.log("Error initializing MediaSource.");
        debug.log(e);
        alert("Error: Media Source Close.");
    },

    addElementHandlers: function () {
        var debug = Stream.modules.debug;
        debug.log("Initialize video element.");

        this.element.addEventListener("play", this.onPlay.bind(this), false);
        this.element.addEventListener("pause", this.onPause.bind(this), false);
        this.element.addEventListener("seeking", this.onSeeking.bind(this), false);
        this.element.addEventListener("timeupdate", this.onProgress.bind(this), false);

        this.videoElementInitialized = true;
        this.initializePlayback();
    },

    addMediaSourceHandlers: function () {
        var debug = Stream.modules.debug;
        debug.log("Initialize MediaSource.");

        this.mediaSource = new WebKitMediaSource();
        this.mediaSource.addEventListener("sourceopen", this.onMediaSourceReady.bind(this), false);
        this.mediaSource.addEventListener("webkitsourceopen", this.onMediaSourceReady.bind(this), false);
        this.mediaSource.addEventListener("sourceclose", this.onMediaSourceClose.bind(this), false);
        this.mediaSource.addEventListener("webkitsourceclose", this.onMediaSourceClose.bind(this), false);
    },

    onManifestLoadError: function (e) {
        var debug = Stream.modules.debug;
        debug.log("Error loading manifest.");
        debug.log(e);
        alert("Manifest failed to load!");
    },

    onManifestLoad: function (e) {
        var debug = Stream.modules.debug,
            baseUrl = "",
            parser = this.factory.getManifestParser();

        debug.log("Manifest loaded.");

        if (this.manifestUrl.indexOf("/") !== -1) {
            this.baseUrl = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf("/") + 1);
        }

        this.manifest = parser.parse(this.xhr.responseText, this.baseUrl);
        debug.log(this.manifest);

        this.addElementHandlers();
        this.addMediaSourceHandlers();

        this.element.src = window.URL.createObjectURL(this.mediaSource);

        this.startManifestRefresh();
    },

    onManifestRefresh: function (e) {
        var debug = Stream.modules.debug,
            baseUrl = "",
            parser = this.factory.getManifestParser(),
            data;

        debug.log("Manifest refresh complete.");

        if (this.manifestUrl.indexOf("/") !== -1) {
            this.baseUrl = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf("/") + 1);
        }

        this.manifest = this.parser.parse(this.xhr.responseText, this.baseUrl);
        debug.log(this.manifest);

        if (this.videoManager) {
            data = this.manifest.getVideoData();
            this.videoManager.updateData(data);
        }

        if (this.audioManager) {
            // TODO : Need to get the data that matches the currently playing audio track!
            data = this.manifest.getPrimaryAudioData();
            this.audioManager.updateData(data);
        }

        this.startManifestRefresh();
    },

    getAutoSwitchQuality: function () {
        return this.autoSwitchBitrate;
    },

    setAutoSwitchQuality: function (value) {
        var debug = Stream.modules.debug;
        debug.log("Set auto switch quality: " + this.autoSwitchBitrate);

        this.autoSwitchBitrate = value;
        if (this.videoManager) {
            this.videoManager.autoSwitchBitrate = this.autoSwitchBitrate;
        }
        if (this.audioManager) {
            this.audioManager.autoSwitchBitrate = this.autoSwitchBitrate;
        }
    },

    setVideoQuality: function (value) {
        if (this.videoManager) {
            this.videoManager.setQuality(value);
        }
    },

    getVideoQuality: function () {
        if (this.videoManager) {
            return this.videoManager.getQuality();
        }
        return 0;
    },

    setAudioQuality: function (value) {
        if (this.audioManager) {
            this.audioManager.setQuality(value);
        }
    },

    getAudioQuality: function () {
        if (this.audioManager) {
            return this.audioManager.getQuality();
        }
        return 0;
    },

    setAudioTrackIndex: function (value) {
        if (value < 0 || value >= audios.length) {
            return;
        }

        this.audioIndex = value;
        // TODO : Change data on buffer manager.
    },

    getAudioTrackIndex: function (value) {
        return this.audioIndex;
    },

    getVideoMetrics: function () {
        if (this.videoManager) {
            return this.videoManager.getMetrics();
        }
        return null;
    },

    getAudioMetrics: function () {
        if (this.audioManager) {
            return this.audioManager.getMetrics();
        }
        return null;
    }
};