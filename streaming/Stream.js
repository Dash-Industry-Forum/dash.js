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
    this.autoBitrateSwitch = null;

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
};

streaming.Stream.prototype =
{
    //--------------------------
    // qualities and audio tracks
    //--------------------------

    setVideoAutoSwitchQuality: function (value) {
        this.autoBitrateSwitch = value;
        
        if (this.videoManager)
            this.videoManager.autoSwitchBitrate = this.autoBitrateSwitch;

        if (this.videoManager)
            console.log("SET AUTO SWITCH 1: " + this.videoManager.autoSwitchBitrate);
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

    setVideoQuality: function (value)
    {
        if (this.videoManager)
            this.videoManager.setQuality(value);
    },
    
    getVideoQuality: function ()
    {
        if (this.videoManager)
            return this.videoManager.getQuality();

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

    /**
     * @public
     */
    play: function ()
    {
        // TODO : programatic
    },

    /**
     * @public
     * @param {Number} time
     */
    seek: function (time)
    {
        // TODO : programatic
    },

    /**
     * @private
     * @param {Event} e
     */
    onPlay: function (e)
    {
        console.log("Attempt play...");
        if (!this.videoElementInitialized || !this.mediaSourceInitialized)
        {
            return;
        }

        console.log("Start playback.");
        if (this.videoManager) this.videoManager.play();
        if (this.audioManager) this.audioManager.play();
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
        if (this.videoManager) this.videoManager.progress();
        if (this.audioManager) this.audioManager.progress();
    },

    initElement: function ()
    {
        console.log("Initialize video element.");

        this.element.addEventListener("play", this.onPlay.bind(this), false);
        this.element.addEventListener("pause", this.onPause.bind(this), false);
        this.element.addEventListener("seeking", this.onSeeking.bind(this), false);
        this.element.addEventListener("timeupdate", this.onProgress.bind(this), false);

        this.videoElementInitialized = true;
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
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), this.manifest.getDuration());
            this.videoManager = new streaming.BufferManager(this.element, buffer, indexHandler, bufferTime, "video");
            this.videoManager.autoSwitchBitrate = this.autoBitrateSwitch;
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
            indexHandler = this.factory.getIndexHandler(data, this.manifest.getStreamItems(data), this.manifest.getDuration());
            this.audioManager = new streaming.BufferManager(this.element, buffer, indexHandler, bufferTime, "audio");
            // TODO : Finish this like video.
            this.audioManager.autoSwitchBitrate = false;
        }
        else
        {
            console.log("No audio data.");
        }
        
        this.mediaSource.duration = this.manifest.getDuration();
        console.log("Media duration: " + this.manifest.getDuration());
        this.mediaSourceInitialized = true;
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
        this.xhr.addEventListener("load", this.onManifestLoad.bind(this), false);
        this.xhr.addEventListener("error", this.onManifestLoadError.bind(this), false);
        this.xhr.send(null);
    }
};