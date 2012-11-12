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
window["dash"] = window["dash"]||{};
/**
 *
 * @param {HTMLVideoElement} videoEl
 * @constructor
 */
dash.DashPlayer = function(videoEl) {
	var me=this;
    //--------------------------
    // public variables
    //--------------------------
    /** @type {boolean} */
    me.seeking= false;
    /** @type {boolean} */
    me.initialized= false;
    /** @type {number} */
    me.videoQuality = NaN;
    /** @type {number} */
    me.maxVideoQuality = 0;
    /** @type {number} */
    me.audioQuality = NaN;
    /** @type {number} */
    me.maxAudioQuality = 0;
    /** @type {number} */
    me.bufferTime = 4;
    /** @type {boolean} */
    me.hasVideo= false;
    /** @type {boolean} */
    me.hasAudio= false;

    //--------------------------
    // private variables
    //--------------------------
    /** @type {SourceBuffer}
     * @private */
    me.audioBuffer= null;
    /** @type {SourceBuffer}
     *  @private */
    me.videoBuffer= null;
    /** @type {MediaSource}
     * @private */
    me.mediaSource= null;
    /** @type {string|null}
     * @private */
    me.manifestURL= null;
    /** @type {dash.DashIndexHandler}
     * @private */
    me.videoIndexHandler= null;
    /** @type {dash.DashIndexHandler}
     * @private */
    me.audioIndexHandler= null;
    /** @type {dash.vo.DashManifest}
     * @private */
    me.manifest= null;
    /** @type {dash.SegmentLoader}
     * @private */
	me.videoLoader = new dash.SegmentLoader();
	me.videoLoader.onBytesLoaded = me.onVideoBytesLoaded.bind(me);
    /** @type {dash.SegmentLoader}
     * @private */
	me.audioLoader = new dash.SegmentLoader();
	me.audioLoader.onBytesLoaded = me.onAudioBytesLoaded.bind(me);
	/** @type {HTMLVideoElement}
     * @private */
	me.videoEl = videoEl;
    /** @type {XMLHttpRequest}
     * @private */
	me.xhr = new XMLHttpRequest();
    /** @type {dash.DashParser}
     * @private */
	me.parser = new dash.DashParser();
    me.audioQualityChanged=true;
    me.videoQualityChanged=true;

    me.seekingHandle=-1;

};

dash.DashPlayer.prototype = {
    /**
     *
     * @param {number} value
     */
    setVideoQualityIndex: function(value) {
        if (value < 0 || value > this.maxVideoQuality ||  this.videoQuality == value)
            return;

        this.videoQuality = value;
        this.videoQualityChanged=true;
        if(this.hasVideo)
        {
            this.videoIndexHandler.setQuality(this.videoQuality);
            this.videoLoader.abort();

        }
	},
    onVideoIndexHandlerReady:function()
    {
        this.videoLoader.load(this.videoIndexHandler.getSegmentRequestForTime(this.videoEl.currentTime));
    },
    /**
     *
     * @param {number} value
     */
    setAudioQualityIndex: function(value) {
        if (value < 0 || value > this.maxAudioQuality ||  this.audioQuality == value)
            return;

        this.audioQuality = value;
        this.audioQualityChanged=true;
        if(this.hasAudio)
        {
            this.audioIndexHandler.setQuality(this.audioQuality);
            this.audioLoader.abort();
        }
	},
    
    onAudioIndexHandlerReady:function()
    {
        this.audioLoader.load(this.audioIndexHandler.getSegmentRequestForTime(this.videoEl.currentTime));
    },
    /**
     * @private
     */
    checkBuffers: function() {

        if(this.audioQualityChanged && this.hasAudio)
        {
            this.audioQualityChanged=false;
            this.audioLoader.load(this.audioIndexHandler.getInitRequest());

            if(this.audioIndexHandler.ready)
                this.audioLoader.load(this.audioIndexHandler.getSegmentRequestForTime(this.videoEl.currentTime));
            else
                this.audioIndexHandler.onReady =  this.onAudioIndexHandlerReady.bind(this)
        }
        else if(!this.audioLoader.loading && this.hasAudio && this.audioIndexHandler.ready && !this.hasEnoughBuffered(this.audioBuffer))
        {
            this.audioLoader.load(this.audioIndexHandler.getNextSegmentRequest());
        }


        if(this.videoQualityChanged && this.hasVideo )
        {
            this.videoQualityChanged=false;
            this.videoLoader.load(this.videoIndexHandler.getInitRequest());
            if(this.videoIndexHandler.ready)
                this.videoLoader.load(this.videoIndexHandler.getSegmentRequestForTime(this.videoEl.currentTime));
            else
                this.videoIndexHandler.onReady =  this.onVideoIndexHandlerReady.bind(this)
        }
        else if(!this.videoLoader.loading && this.hasVideo && this.videoIndexHandler.ready && !this.hasEnoughBuffered(this.videoBuffer))
        {
            this.videoLoader.load(this.videoIndexHandler.getNextSegmentRequest());
        }


	},

    /**
     * @private
     * @param {TimeRanges} ranges
     * @param {number} currentTime
     * @return {number}
     */
    getCurrentBufferRangeIndex: function(ranges,currentTime) {
		var len = ranges.length;
		for(var i=0;i<len;i++)
		{
			if(currentTime >= ranges.start(i) && currentTime < ranges.end(i))
				return i;
		}
		return -1;
	},
    /**
     * @private
     * @param {SourceBuffer} buffer
     * @return {boolean}
     */
    hasEnoughBuffered: function(buffer) {
		var currentTime = this.videoEl.currentTime;
		var ranges = buffer.buffered;
		var rangeIndex = this.getCurrentBufferRangeIndex(ranges,currentTime);
		
		if(rangeIndex == -1)
			return false;
		
		if(ranges.end(rangeIndex) < currentTime + this.bufferTime)
			return false;
		
		return true;
	},
    /**
     * @private
     * @param {ArrayBuffer} bytes
     * @param {dash.vo.SegmentRequest} segment
     */
    onAudioBytesLoaded: function(bytes,segment) {
		this.audioBuffer.append(new Uint8Array(bytes));
        this.checkBuffers();
	},
    /**
     * @private
     * @param {ArrayBuffer} bytes
     * @param {dash.vo.SegmentRequest} segment
     */
    onVideoBytesLoaded: function(bytes,segment) {

		this.videoBuffer.append(new Uint8Array(bytes));
        this.checkBuffers();
	},
    /**
     * @private
     * @param {Event} e
     */
    onPlay: function(e) {
		var me = this;
		if(!me.initialized) {
			return;
		}

		// start buffers
        this.checkBuffers();
	},
    /**
     * @private
     * @param {Event} e
     */
    onPause: function(e) {
	},



    /**
     * @private
     * @param {Event} e
     */
    onSeeking: function(e) {

        var me=this;
        me.seeking = true;

        // clear buffers
        me.audioLoader.abort();
        me.videoLoader.abort();

        // start buffers again at the new time
        clearTimeout(this.seekingHandle);
        setTimeout(this.updateSeekTime.bind(this),300);

	},
    updateSeekTime:function(){
        console.log("seeked");
        var me=this;
        me.seeking = false;
        if(this.hasAudio && !me.hasEnoughBuffered(me.audioBuffer))
            me.audioLoader.load(me.audioIndexHandler.getSegmentRequestForTime(me.videoEl.currentTime));

        if(this.hasVideo && !me.hasEnoughBuffered(me.videoBuffer) )
            me.videoLoader.load(me.videoIndexHandler.getSegmentRequestForTime(me.videoEl.currentTime));

    },

    /**
     * @private
     * @param {Event} e
     */
    onProgress: function(e) {
		if(!this.seeking)
			this.checkBuffers();
    },
    /**
     * @private
     * @param {Event} e
     */
    onMediaSourceReady: function(e) {
        var me=this;
        var adaptation;
        adaptation = this.getAdaptationSet("video");
        if (adaptation) {
            this.hasVideo=true;
            this.maxVideoQuality = adaptation.medias.length-1;
            this.videoIndexHandler = new dash.DashIndexHandler(adaptation);

            if(isNaN(this.videoQuality))
                this.setVideoQualityIndex(0);
            else
                this.setVideoQualityIndex(this.videoQuality);

            this.videoBuffer = this.mediaSource.addSourceBuffer(this.videoIndexHandler.getCodec());
        }
        else
        {
            this.hasVideo=false;
        }

        adaptation = this.getAdaptationSet("audio");
        if (adaptation) {
            this.hasAudio=true;
            this.maxAudioQuality = adaptation.medias.length-1;
            this.audioIndexHandler = new dash.DashIndexHandler(adaptation);

            if(isNaN(this.audioQuality))
                this.setAudioQualityIndex(0);
            else
                this.setAudioQualityIndex(this.audioQuality);

            this.audioBuffer = this.mediaSource.addSourceBuffer(this.audioIndexHandler.getCodec());
        }
        else
        {
            this.hasAudio=false;
        }

		me.mediaSource.duration = me.manifest.getDuration();
		me.initialized = true;
	},
    /**
     * @private
     * @param {Event} e
     */
    onMediaSourceClose:function(e){
        console.log(e);
        alert("Media Source Close");
    },
    /**
     * @private
     */
    initVideo: function() {
		var me=this;
		me.videoEl.addEventListener("play",me.onPlay.bind(me),false);
		me.videoEl.addEventListener("pause",me.onPause.bind(me),false);
		me.videoEl.addEventListener("seeking",me.onSeeking.bind(me),false);
		me.videoEl.addEventListener("timeupdate",me.onProgress.bind(me),false);
		me.mediaSource = new WebKitMediaSource();
		me.mediaSource.addEventListener("sourceopen",me.onMediaSourceReady.bind(me),false);
		me.mediaSource.addEventListener("webkitsourceopen",me.onMediaSourceReady.bind(me),false);
        me.mediaSource.addEventListener("sourceclose",me.onMediaSourceClose.bind(me),false);
        me.mediaSource.addEventListener("webkitsourceclose",me.onMediaSourceClose.bind(me),false);
		me.videoEl.src = window.URL.createObjectURL(me.mediaSource);
	},
    /**
     * @private
     * @param {string} contentType
     * @return {dash.vo.AdaptationSet}
     */
    getAdaptationSet: function(contentType) {
		var adaptations = this.manifest.periods[0].adaptations;
		for(var i=0; i<adaptations.length;i++)
		{
			if(contentType == "video" && adaptations[i].getIsVideo())
				return adaptations[i];

			if(contentType == "audio" && adaptations[i].getIsAudio())
				return adaptations[i];
		}
		return null;
	},
    /**
     * @private
     * @param {Event} e
     */
    onManifestLoadError: function(e) {
		alert("manifest failed to load");
	},
    /**
     * @private
     * @param {Event} e
     */
    onManifestLoad: function(e) {

		var baseUrl = "";
		if(this.manifestURL.indexOf("/") != -1) 
			baseUrl = this.manifestURL.substring(0,this.manifestURL.lastIndexOf("/") + 1);
		this.manifest = this.parser.parse(this.xhr.responseText,baseUrl);

		this.initVideo();
	},
    /**
     *
     * @param {string} url
     */
    load: function(url) {

		this.manifestURL = url;
		this.xhr.open("GET",this.manifestURL,true);
		this.xhr.addEventListener("load",this.onManifestLoad.bind(this),false);
		this.xhr.addEventListener("error",this.onManifestLoadError.bind(this),false);
		this.xhr.send(null);
	}

};