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
 *
 * @constructor
 */
streaming.BufferManager = function (element, buffer, indexHandler, bufferTime, type)
{
    //--------------------------
    // private variables
    //--------------------------

    /**
     * @private
     * @type {HTMLVideoElement}
     */
    this.element = element;

    /**
     * @private
     * @type {dash.vo.DashManifest}
     */
    this.buffer = buffer;
    
    /**
     * @private
     * @type {streaming.IndexHandler}
     */
    this.indexHandler = indexHandler;
    this.indexHandler.onReady = this.onIndexHandlerReady.bind(this);

    /**
     * @public
     * @type {boolean}
     */
    this.autoSwitchBitrate = true;
    
    /**
     * @private
     * @type {streaming.MbrManager}
     */
    this.mbr = new streaming.MbrManager();
    this.mbr.init();

    /**
     * @private
     * @type {String}
     */
    this.type = type;

    /**
     * @private
     * @type {Boolean}
     */
    this.playing = false;
    
    /**
     * @private
     * @type {Boolean}
     */
    this.initialPlayback = false;

    /**
     * @private
     * @type {Boolean}
     */
    this.hasPlayed = false;

    /**
     * @private
     * @type {Boolean}
     */
    this.seeking = false;
    
    /**
     * @private
     * @type {Number}
     */
    this.seekTarget = -1;

    /**
     * @private
     * @type {Number}
     */
    this.quality = 0;

    /**
     * @private
     * @type {Boolean}
     */
    this.qualityChanged = false;

    /** @type {streaming.Loader}
     * @private */
    this.loader = new streaming.Loader();
    this.loader.onBytesLoaded = this.onBytesLoaded.bind(this);
    this.lastFragmentDuration = NaN;
    this.lastDownloadTime = NaN;

    /**
     * @private
     * @type {Number}
     */
    this.bufferTime = bufferTime;
};

streaming.BufferManager.prototype =
{
    updateData: function(value)
    {
        if (this.indexHandler)
        {
            this.indexHandler.setData(value);
        }
    },

    onBytesLoaded: function (bytes, segment)
    {
        this.lastFragmentDuration = segment.duration;
        this.lastDownloadTime = (segment.requestEndDate.getTime() - segment.requestStartDate.getTime()) / 1000;

        console.log("Bytes loaded: " + this.type + " | " + this.lastFragmentDuration + " | " + this.lastDownloadTime);

        if (bytes != null && bytes.byteLength > 0)
        {
            console.log("Push bytes: " + bytes.byteLength);
            this.buffer.append(new Uint8Array(bytes));
        }
        else
        {
            console.log("No bytes to push.");
        }
        
        this.checkBuffers();
    },

    getMaxQuality: function ()
    {
        if (this.indexHandler)
            return this.indexHandler.getMaxQuality();

        return 0;
    },

    getQuality: function ()
    {
        return this.quality;
    },

    setQuality: function (value)
    {
        console.log("Try to set quality: " + value + " | " + this.quality + " | " + this.getMaxQuality());

        if (this.quality == value)
            return;
        
        if (value < 0)
            return;

        if (value >= this.getMaxQuality()) // zero indexed
            return;

        this.quality = value;
        this.qualityChanged = true;
        
        console.log("Change quality: " + this.quality);
    },

    onIndexHandlerReady: function ()
    {
        console.log("Index Handler is ready now.");
        this.checkBuffers();
    },

    checkBuffers: function()
    {
        console.log("checkBuffers start");

        if (!this.playing)
        {
            console.log("Not playing - bail.");
            return;
        }

        if (this.loader.loading)
        {
            console.log("Already loading - bail.");
            return;
        }

        if (this.hasEnoughBuffered())
        {
            console.log("Have enough buffer - bail.");
            return;
        }

        if (this.autoSwitchBitrate)
        {
            console.log("Check MBR rules.");
            var metrics = this.getMetrics();
            var items = this.indexHandler.items;
            this.setQuality(this.mbr.checkRules(metrics, items));
        }

        console.log("Populate buffers.");

        // TODO : Perform a seek on quality changed.

        // Do this so that if segmentAlignment="false" we will get the right fragment.
        // This doesn't work right now because when we request, currentTime will not
        // reflect the next fragment, so we just request the currently playing fragment again.

        // Maybe keep track internally of the 'buffered time' so that we can seek to the latest
        // buffered time?

        if (this.initialPlayback)
        {
            console.log("Marking a special seek due to quality change or initial playback.");

            // set up a seek just in case the fragment index will change
            if (!this.seeking)
            {
                this.seeking = true;
            }

            this.initialPlayback = false;
        }
        
        var request;

        // load the initialization segment now
        // this could trigger a load
        if (this.seeking || this.qualityChanged)
        {
            // we might not have an initialization!
            request = this.indexHandler.getInitRequest(this.quality);
            if (request != null)
            {
                console.log("Loading initialization: " + request.url);
                this.loader.load(request);
            }
            
            this.qualityChanged = false;
        }
        
        if (this.indexHandler.ready)
        {
            if (this.seeking)
            {
                var st = -1;
                
                // If switching bitrates, go to the current time.
                if (this.seekTarget == -1)
                {
                    st = this.element.currentTime;
                }
                // This is an actual seek, so go to the requested time.
                else
                {
                    st = this.seekTarget;
                }

                request = this.indexHandler.getSegmentRequestForTime(st, this.quality);
                
                console.log("Loading a seek at time: " + st);

                this.seeking = false;
                this.seekTarget = -1;
                
                /*
                // TODO : This should be delayed.  See branch live_1.
                if (this.element.currentTime != st)
                {
                    this.element.currentTime = st;
                    this.seekTarget = -1;
                }
                */
            }
            else
            {
                request = this.indexHandler.getNextSegmentRequest(this.quality);
            }

            if (request == null)
            {
                throw ("Error finding segment!");
            }
            
            switch (request.action)
            {
                case "stall":
                    console.log("Stream is stalling.");
                    // do nothing
                    break;
                   
                case "complete":
                    console.log("Stream is complete.");
                    this.handleStreamComplete();
                    break;
                    
                case "download":
                    console.log("Loading a segment: " + request.url);
                    this.loader.load(request);
                    break;
                    
                default:
                    console.log("Unknown request action.");
            }
        }
        else
        {
            console.log("Index Handler isn't ready.");
        }
    },

    /**
     * @private
     * @param {TimeRanges} ranges
     * @param {number} currentTime
     * @return {number}
     */
    getCurrentBufferRangeIndex: function (ranges, currentTime)
    {
        var len = ranges.length;
        for (var i = 0; i < len; i++)
        {
            if (currentTime >= ranges.start(i) && currentTime < ranges.end(i))
                return i;
        }
        return -1;
    },

    getBufferLength: function ()
    {
        var currentTime = this.element.currentTime;
        var ranges = this.buffer.buffered;
        var rangeIndex = this.getCurrentBufferRangeIndex(ranges, currentTime);
        
        if (rangeIndex == -1)
            return 0;

        return (ranges.end(rangeIndex) - currentTime);
    },

    /**
     * @private
     * @param {SourceBuffer} buffer
     * @return {boolean}
     */
    hasEnoughBuffered: function ()
    {
        var currentTime = this.element.currentTime;
        var ranges = this.buffer.buffered;
        var rangeIndex = this.getCurrentBufferRangeIndex(ranges, currentTime);
        /*
        console.log("Checking if enough is buffered.");
        console.log(currentTime);
        console.log(ranges);
        console.log(rangeIndex);
        */
        if (rangeIndex == -1)
            return false;

        var start = ranges.end(rangeIndex);
        var end = currentTime + this.bufferTime;
        
        if (start < end)
            return false;

        return true;
    },

    /**
     * @public
     */
    play: function ()
    {
        console.log("Buffer play.");
        
        // Mark that we haven't played before.
        // Special stuff happens on initial playback.
        // But if we're just unpausing we don't need to care.
        if (!this.hasPlayed)
        {
            console.log("Marking first playback.");
            this.initialPlayback = true;
            this.hasPlayed = true;
        }

        this.playing = true;
        this.checkBuffers();

        setInterval(this.onTimer, 500, this);
    },
    
    pause: function ()
    {
        console.log("Buffer pause.");

        this.playing = false;
    },

    /**
     * @public
     */
    seek: function (time)
    {
        console.log("Buffer seek.");

        this.seeking = true;
        this.seekTarget = time;

        if (!this.hasPlayed)
        {
            this.play();
        }
        else
        {
            this.loader.abort();
        }

        this.checkBuffers();
    },
    
    /**
     * @public
     */
    stop: function ()
    {
        console.log("Buffer stop.");
        
        this.playing = false;
        this.hasPlayed = false;
    },
    
    handleStreamComplete: function ()
    {
        this.playing = false;
    },
    
    getBitrateForIndex: function(index)
    {
        return this.indexHandler.getBandwidthForIndex(index);
    },

    getMetrics: function ()
    {
        var metrics = new streaming.vo.StreamMetrics();

        metrics.bitrateIndex = this.getQuality();
        metrics.bitrateValue = this.getBitrateForIndex(metrics.bitrateIndex);
        metrics.maxBitrateIndex = this.getMaxQuality();
        metrics.bufferLength = this.getBufferLength();
        metrics.lastFragmentDuration = this.lastFragmentDuration;
        metrics.lastFragmentDownloadTime = this.lastDownloadTime;
       
        metrics.getBitrateForIndex = this.getBitrateForIndex.bind(this);

        return metrics;
    },
    
    onTimer: function(mgr)
    {
        mgr.checkBuffers();
    }
};