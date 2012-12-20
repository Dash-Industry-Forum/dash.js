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
window["streaming"] = window["streaming"] || {};
/**
 * @param {HTMLVideoElement} element
 * @constructor
 */
streaming.Stream = function (element, factory)
{
    //--------------------------
    // public variables
    //--------------------------
    
    /** @type {Boolean}
      * @private */
    this.autoplay = false; // TODO

    /** @type {Array}
      * @private */
    this.audios = null;

    //--------------------------
    // private variables
    //--------------------------

    /** @type {Array}
      * @private */
    this.autoSwitchBitrate = true;

    /** @type {int}
      * @private */
    this.audioIndex = 0;

    /** @type {Boolean}
      * @private */
    this.videoElementInitialized = false;
    
    /** @type {Boolean}
      * @private */
    this.mediaSourceInitialized = false;

    /** @type {streaming.BufferManager}
      * @private */
    this.videoManager = null;

    /** @type {streaming.BufferManager}
      * @private */
    this.audioManager = null;

    /** @type {String}
      * @private */
    this.manifestUrl = null;

    /** @type {XMLHttpRequest}
     * @private */
    this.xhr = new XMLHttpRequest();
    this.xhr.addEventListener("load", this.onManifestLoad.bind(this), false);
    this.xhr.addEventListener("error", this.onManifestLoadError.bind(this), false);

    /** @type {XMLHttpRequest}
     * @private */
    this.refresh = new XMLHttpRequest();
    this.refresh.addEventListener("load", this.onManifestRefresh.bind(this), false);
    this.refresh.addEventListener("error", this.onManifestLoadError.bind(this), false);

    /** @type {HTMLVideoElement}
      * @private */
    this.element = element;
    
    /** @type {stream.StreamFactory}
      * @private */
    this.factory = factory;

    /** @type {Array}
      * @private */
    this.buffers = {};
    
    /** @type {streaming.vo.DashManifest}
      * @private */
    this.manifest = null;
    
    /** @type {number}
      * @private */
    this.seekTarget = -1;
};

streaming.Stream.prototype =
{
    
    // TODO : EXPOSE METHODS TO CHANGE AUDIO TRACKS!

    //--------------------------
    // qualities and audio tracks
    //--------------------------

    setAutoSwitchQuality: function (value) {
        this.autoSwitchBitrate = value;
        
        if (this.videoManager)
            this.videoManager.autoSwitchBitrate = this.autoSwitchBitrate;
        
        if (this.audioManager)
            this.audioManager.autoSwitchBitrate = this.autoSwitchBitrate;
    },

    setVideoQuality: function (value) {
        if (this.videoManager)
            this.videoManager.setQuality(value);
    },

    getVideoQuality: function () {
        if (this.videoManager)
            return this.videoManager.getQuality();

        return 0;
    },

    setAudioQuality: function (value)
    {
        if (this.audioManager)
            this.audioManager.setQuality(value);
    },
    
    getAudioQuality: function ()
    {
        if (this.audioManager)
            return this.audioManager.getQuality();

        return 0;
    },

    setAudioIndex: function (value)
    {
        if (value < 0 || value >= audios.length)
            return;

        this.audioIndex = value;
        // TODO : Change data on buffer manager.
    },
    
    /**
     * @public
     * The index of the currently playing audio track.
     */
    getAudioIndex: function (value)
    {
        return this.audioIndex;
    },

    getVideoMetrics: function ()
    {
        if (this.videoManager)
            return this.videoManager.getMetrics();
        
        return null;
    },
    
    getAudioMetrics: function ()
    {
        if (this.audioManager)
            return this.audioManager.getMetrics();

        return null;
    },

    //--------------------------
    // playback
    //--------------------------

    initializePlayback: function()
    {
        console.log("Attempt to start playback for the first time...");
        if (!this.videoElementInitialized || !this.mediaSourceInitialized)
            return;

        if (this.manifest.getIsLive())
        {
            this.mediaSource.duration = Number.POSITIVE_INFINITY;
            console.log("Live event, set infinity duration.");

            var now = new Date();
            var start = this.manifest.availabilityStartTime;
            var liveOffset = (now.getTime() - start.getTime()) / 1000;

            console.log("Seek to live point and start playback: " + liveOffset);
            this.seek(liveOffset);
        }
        else {
            this.mediaSource.duration = this.manifest.getDuration();
            console.log("Set media duration: " + this.manifest.getDuration());

            this.play();
            console.log("Start stream playback.");
        }
    },

    /**
     * @public
     */
    play: function ()
    {
        console.log("Attempt play...");
        if (!this.videoElementInitialized || !this.mediaSourceInitialized)
            return;
        
        console.log("Do play.");
        this.element.play();
    },

    /**
     * @public
     * @param {Number} time
     */
    seek: function (time)
    {
        console.log("Attempt seek...");
        if (!this.videoElementInitialized || !this.mediaSourceInitialized)
            return;

        console.log("Do seek.");

        this.seekTarget = time;
        this.element.play();
    },

    finishSeek: function()
    {
        console.log("Finish seek.");

        if (this.videoManager) this.videoManager.seek(this.seekTarget);
        if (this.audioManager) this.audioManager.seek(this.seekTarget);
        this.seekTarget = -1;
    },

    /**
     * @private
     * @param {Event} e
     */
    onPlay: function (e)
    {
        console.log("Got onPlay event.");
        
        if (!this.videoElementInitialized || !this.mediaSourceInitialized)
            return;

        if (this.seekTarget != -1)
        {
            this.finishSeek();
        }
        else
        {
            console.log("Start playback.");
            if (this.videoManager) this.videoManager.play();
            if (this.audioManager) this.audioManager.play();
        }
    },
    
    /**
     * @private
     * @param {Event} e
     */
    onPause: function (e)
    {
        console.log("Pause");
    },

    /**
     * @private
     * @param {Event} e
     */
    onSeeking: function (e)
    {
        console.log("Process seek: " + this.element.currentTime);
        if (this.videoManager) this.videoManager.seek(this.element.currentTime);
        if (this.audioManager) this.audioManager.seek(this.element.currentTime);
    },

    /**
     * @private
     * @param {Event} e
     */
    onProgress: function (e)
    {
        
    },

    initElement: function ()
    {
        console.log("Initialize video element.");

        this.element.addEventListener("play", this.onPlay.bind(this), false);
        this.element.addEventListener("pause", this.onPause.bind(this), false);
        this.element.addEventListener("seeking", this.onSeeking.bind(this), false);
        this.element.addEventListener("timeupdate", this.onProgress.bind(this), false);

        this.videoElementInitialized = true;
        this.initializePlayback();
    },

    //--------------------------
    // mediasource
    //--------------------------

    /**
     * @private
     * @param {Event} e
     */
    onMediaSourceReady: function (e) {
        console.log("MediaSource initialized!");
        
        var data;
        var buffer;
        var indexHandler;

        var bufferTime = this.manifest.minBufferTime;
        if (isNaN(bufferTime) || bufferTime <= 0)
            bufferTime = 4;
        console.log("Buffer time: " + bufferTime);
        
        if(this.manifest.hasVideoStream())
        {
            console.log("Create video buffer.");
            // assume one video stream
            data = this.manifest.getVideoData();
            console.log("Video codec: " + data.getCodec());

            buffer = this.mediaSource.addSourceBuffer(data.getCodec());
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), this.manifest.getDuration(), this.manifest.getIsLive());
            this.videoManager = new streaming.BufferManager(this.element, buffer, indexHandler, bufferTime, "video");
            this.videoManager.autoSwitchBitrate = this.autoSwitchBitrate;
        }
        else
        {
            console.log("No video data.");
        }
        
        if (this.manifest.hasAudioStream())
        {
            console.log("Create audio buffer.");
            // assume multiple audio streams
            this.audios = this.manifest.getAudioDatas();
            console.log("Num audio streams: " + this.audios.length);

            // get primary audio stream to start
            data = this.manifest.getPrimaryAudioData();
            console.log("Audio codec: " + data.getCodec());
            
            // figure out index of main audio stream
            if (this.audios.length == 1)
            {
                this.audioIndex = 0;
            }
            else
            {
                for (var i = 0; i < this.audios.length; i++)
                {
                    if (this.audios[i] == data)
                    {
                        this.audioIndex = i;
                        break;
                    }
                }
            }

            buffer = this.mediaSource.addSourceBuffer(data.getCodec());
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), this.manifest.getDuration(), this.manifest.getIsLive());
            this.audioManager = new streaming.BufferManager(this.element, buffer, indexHandler, bufferTime, "audio");
            this.audioManager.autoSwitchBitrate = this.autoSwitchBitrate;
        }
        else
        {
            console.log("No audio data.");
        }
        
        this.mediaSourceInitialized = true;
        this.initializePlayback();
    },

    /**
     * @private
     * @param {Event} e
     */
    onMediaSourceClose: function (e)
    {
        console.log("Error initializing MediaSource.");
        console.log(e);
        alert("Media Source Close");
    },

    initMediaSource: function ()
    {
        console.log("Initialize MediaSource.");
        
        this.mediaSource = new WebKitMediaSource();
        this.mediaSource.addEventListener("sourceopen", this.onMediaSourceReady.bind(this), false);
        this.mediaSource.addEventListener("webkitsourceopen", this.onMediaSourceReady.bind(this), false);
        this.mediaSource.addEventListener("sourceclose", this.onMediaSourceClose.bind(this), false);
        this.mediaSource.addEventListener("webkitsourceclose", this.onMediaSourceClose.bind(this), false);
    },

    //--------------------------
    // manifest
    //--------------------------

    /**
     * @private
     * @param {Event} e
     */
    onManifestLoadError: function (e)
    {
        console.log("Error loading manifest.");
        console.log(e);
        alert("manifest failed to load");
    },
    
    /**
     * @private
     * @param {Event} e
     */
    onManifestLoad: function (e)
    {
        console.log("Manifest loaded.");

        var baseUrl = "";
        if (this.manifestUrl.indexOf("/") != -1)
            baseUrl = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf("/") + 1);

        var parser = this.factory.getManifestParser();
        this.manifest = parser.parse(this.xhr.responseText, baseUrl);
        console.log(this.manifest);

        this.initElement();
        this.initMediaSource();
        
        this.element.src = window.URL.createObjectURL(this.mediaSource);

        this.startManifestRefresh();
    },

    /**
     * @public
     * @param {String} url
     */
    load: function (url)
    {
        console.log("Start loading manifest.");
        
        this.manifestUrl = url;
        this.xhr.open("GET", this.manifestUrl, true);
        this.xhr.send(null);
    },
    
    /**
     * @private
     * @param {Event} e
     */
    onManifestRefresh: function (e)
    {
        console.log("Manifest refresh complete.");

        var baseUrl = "";
        if (this.manifestUrl.indexOf("/") != -1)
            baseUrl = this.manifestUrl.substring(0, this.manifestUrl.lastIndexOf("/") + 1);

        var parser = this.factory.getManifestParser();
        this.manifest = parser.parse(this.xhr.responseText, baseUrl);
        console.log(this.manifest);

        var data;

        if (this.videoManager)
        {
            data = this.manifest.getVideoData();
            this.videoManager.updateData(data);
        }
        
        if (this.audioManager)
        {
            data = this.manifest.getPrimaryAudioData(); // TODO : Need to get the data that matches the currently playing audio track!
            this.audioManager.updateData(data);
        }
        
        this.startManifestRefresh();
    },
    
    startManifestRefresh: function()
    {
        var refreshTime = (this.manifest.minimumUpdatePeriod * 1000);
        if (!isNaN(refreshTime) && refreshTime > 0) {
            console.log("Start manifest refresh.");

            var me = this;
            setTimeout(function() {
                me.refresh.open("GET", me.manifestUrl, true);
                me.refresh.send(null);
            }, refreshTime);
        }
    }
};