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
Stream.modules.BufferManager = (function () {
    "use strict";

    var Constr;

    Constr = function (element, buffer, indexHandler, bufferTime, type) {
        if (!element || !buffer || !indexHandler) {
            throw "Null argument passed to BufferManagaer.";
        }

        this.mbr = new Stream.modules.MbrManager();

        this.loader = new Stream.modules.Loader();
        this.loader.setOnBytesLoadedHandler(this.onBytesLoaded.bind(this));

        this.element = element;
        this.buffer = buffer;
        this.bufferTime = bufferTime;
        this.type = type;
        this.autoSwitchBitrate = true;
        this.playing = false;
        this.initialPlayback = false;
        this.hasPlayed = false;
        this.seeking = false;
        this.seekTarget = -1;
        this.quality = 0;
        this.qualityChanged = false;
        this.timer = null;
        this.lastFragmentDuration = NaN;
        this.lastDownloadTime = NaN;

        this.handler = indexHandler;
        this.handler.setOnReadyHandler(this.onIndexHandlerReady.bind(this));
    };

    Constr.prototype = {
        constructor: Stream.modules.BufferManager,

        updateData: function (value) {
            if (this.handler) {
                this.handler.setData(value);
            }
        },

        getMaxQuality: function () {
            if (this.handler) {
                return this.handler.getMaxQuality();
            }

            return 0;
        },

        getQuality: function () {
            return this.quality;
        },

        setQuality: function (value) {
            var debug = Stream.modules.debug;
            debug.log("Try to set quality: " + value + " | " + this.quality + " | " + this.getMaxQuality());

            if (this.quality === value) {
                return;
            }

            if (value < 0) {
                return;
            }

            // zero indexed
            if (value >= this.getMaxQuality()) {
                return;
            }

            this.quality = value;
            this.qualityChanged = true;

            debug.log("Change quality: " + this.quality);
        },

        getCurrentBufferRangeIndex: function (ranges, currentTime) {
            var len,
                i;

            for (i = 0, len = ranges.length; i < len; i += 1) {
                if (currentTime >= ranges.start(i) && currentTime < ranges.end(i)) {
                    return i;
                }
            }

            return -1;
        },

        getBufferLength: function () {
            var currentTime = this.element.currentTime,
                ranges = this.buffer.buffered,
                rangeIndex = this.getCurrentBufferRangeIndex.call(this, ranges, currentTime);

            if (rangeIndex === -1) {
                return 0;
            }

            return (ranges.end(rangeIndex) - currentTime);
        },

        hasEnoughBuffered: function () {
            var currentTime = this.element.currentTime,
                ranges = this.buffer.buffered,
                rangeIndex,
                start,
                end;

            if (ranges.length === 0) {
                return false;
            }

            rangeIndex = this.getCurrentBufferRangeIndex(ranges, currentTime);
            
            if (rangeIndex === -1) {
                return false;
            }
            
            start = ranges.end(rangeIndex);
            end = currentTime + this.bufferTime;

            if (start < end) {
                return false;
            }

            return true;
        },

        getBitrateForIndex: function (index) {
            return this.handler.getBandwidthForIndex(index);
        },

        getMetrics: function () {
            var metrics = new Stream.vo.StreamMetrics();

            metrics.type = this.type;
            metrics.bitrateIndex = this.getQuality();
            metrics.bitrateValue = this.getBitrateForIndex.call(this, metrics.bitrateIndex);
            metrics.maxBitrateIndex = this.getMaxQuality();
            metrics.bufferLength = this.getBufferLength();
            metrics.lastFragmentDuration = this.lastFragmentDuration;
            metrics.lastFragmentDownloadTime = this.lastDownloadTime;
            metrics.getBitrateForIndex = this.getBitrateForIndex.bind(this);

            return metrics;
        },

        onStreamComplete: function () {
            this.playing = false;
        },

        checkBuffers: function () {
            var debug = Stream.modules.debug,
                metrics,
                items,
                request,
                st;

            //debug.log("checkBuffers start (" + this.type + ")");

            if (!this.playing) {
                //debug.log("Not playing - bail.");
                return;
            }

            if (this.loader.loading) {
                //debug.log("Already loading - bail.");
                return;
            }

            if (this.hasEnoughBuffered.call(this)) {
                //debug.log("Have enough buffer - bail.");
                return;
            }

            if (this.autoSwitchBitrate) {
                debug.log("Check MBR rules.");
                metrics = this.getMetrics();
                items = this.handler.items;
                this.setQuality(this.mbr.checkRules(metrics, items));
            }

            debug.log("Populate buffers.");

            if (this.initialPlayback) {
                debug.log("Marking a special seek due to quality change or initial playback.");
                // set up a seek just in case the fragment index will change
                if (!this.seeking) {
                    this.seeking = true;
                }
                this.initialPlayback = false;
            }

            // load the initialization segment now
            // this could trigger a load
            if (this.seeking || this.qualityChanged) {
                // we might not have an initialization!
                request = this.handler.getInitRequest(this.quality);
                if (request !== null) {
                    debug.log("Loading initialization: " + request.url);
                    this.loader.load(request);
                }
                this.qualityChanged = false;
            }

            if (this.handler.ready) {
                if (this.seeking) {
                    st = -1;

                    // If switching bitrates, go to the current time.
                    if (this.seekTarget === -1) {
                        st = this.element.currentTime;
                    } else {
                        // This is an actual seek, so go to the requested time.
                        st = this.seekTarget;
                    }

                    request = this.handler.getSegmentRequestForTime(st, this.quality);

                    debug.log("Loading a seek at time: " + st);
                    this.seeking = false;
                    this.seekTarget = -1;

                    /*
                    // TODO : This should be delayed.  See branch live_1.
                    if (element.currentTime !== st)
                    {
                        element.currentTime = st;
                        seekTarget = -1;
                    }
                    */
                } else {
                    request = this.handler.getNextSegmentRequest(this.quality);
                }

                if (request === null) {
                    throw ("Error finding segment!");
                }

                switch (request.action) {
                    case "stall": // do nothing
                        debug.log("Stream is stalling.");
                        break;

                    case "complete":
                        debug.log("Stream is complete.");
                        this.onStreamComplete();
                        break;

                    case "download":
                        debug.log("Loading a segment: " + request.url);
                        this.loader.load(request);
                        break;

                    default:
                        debug.log("Unknown request action.");
                }
            } else {
                debug.log("Index Handler isn't ready.");
            }
        },

        onTimer: function (mgr) {
            if (this.playing) {
                this.checkBuffers();
            }
        },

        play: function () {
            var debug = Stream.modules.debug;
            debug.log("Buffer play (" + this.type + ").");

            // Mark that we haven't played before.
            // Special stuff happens on initial playback.
            // But if we're just unpausing we don't need to care.
            if (!this.hasPlayed) {
                debug.log("Marking first playback.");
                this.initialPlayback = true;
                this.hasPlayed = true;
            }

            this.playing = true;
            this.checkBuffers.call(this);

            this.timer = setInterval(this.onTimer.bind(this), 500, this);
        },

        pause: function () {
            var debug = Stream.modules.debug;
            debug.log("Buffer pause.");
            this.playing = false;
        },

        seek: function (time) {
            var debug = Stream.modules.debug;
            debug.log("Buffer seek.");

            this.seeking = true;
            this.seekTarget = time;

            if (!this.hasPlayed) {
                this.play();
            } else {
                this.loader.abort();
            }

            this.checkBuffers.call(this);
        },

        stop: function () {
            var debug = Stream.modules.debug;
            debug.log("Buffer stop.");
            this.playing = false;
            this.hasPlayed = false;
            clearInterval(this.timer);
        },
            
        onIndexHandlerReady: function () {
            var debug = Stream.modules.debug;
            debug.log("Index Handler is ready now.");
            this.checkBuffers.call(this);
        },

        onBytesLoaded: function (bytes, segment) {
            var debug = Stream.modules.debug;

            this.lastFragmentDuration = segment.duration;
            this.lastDownloadTime = (segment.requestEndDate.getTime() - segment.requestStartDate.getTime()) / 1000;

            debug.log("Bytes loaded: " + this.type + " | " + this.lastFragmentDuration + " | " + this.lastDownloadTime);

            if (bytes !== null && bytes.byteLength > 0) {
                debug.log("Push bytes: " + bytes.byteLength);
                this.buffer.append(new Uint8Array(bytes));
            } else {
                debug.log("No bytes to push.");
            }

            this.checkBuffers.call(this);
        }
    };

    return Constr;
}());