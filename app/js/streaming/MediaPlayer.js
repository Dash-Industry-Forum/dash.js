/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer = function (aContext) {
    "use strict";

/*
 * Initialization:
 *
 * 1) Check if MediaSource is available.
 * 2) Load manifest.
 * 3) Parse manifest.
 * 4) Check if Video Element can play codecs.
 * 5) Register MediaSource with Video Element.
 * 6) Create SourceBuffers.
 * 7) Do live stuff.
 *      a. Start manifest refresh.
 *      b. Calculate live point.
 *      c. Calculate offset between availabilityStartTime and initial video timestamp.
 * 8) Start buffer managers.
 *
 * Buffer Management:
 *
 * 1) Generate metrics.
 * 2) Check if fragments should be loaded.
 * 3) Check ABR for change in quality.
 * 4) Figure out which fragments to load.
 * 5) Load fragments.
 * 6) Transform fragments.
 * 7) Push fragmemt bytes into SourceBuffer.
 */
    var context = aContext,
        system,
        element,
        source,
        model,
        stream,
        initialized = false,
        playing = false,
        autoPlay = true,

        isReady = function () {
            return (element !== undefined && source !== undefined);
        },

        play = function () {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            if (!this.capabilities.supportsMediaSource()) {
                alert("Your browser does not support the MediaSource API.  Please try another browser, such as Chrome.");
                //throw "Media Source not supported.";
                return;
            }

            if (!element || !source) {
                throw "Missing view or source.";
            }

            playing = true;
            this.debug.log("Playback initiated!");
            stream = system.getObject("stream");
            stream.load(source);
        },

        doAutoPlay = function () {
            if (autoPlay && isReady()) {
                play.call(this);
            }
        };

    // Set up DI.
    system = new dijon.System();
    system.mapValue("system", system);
    system.mapOutlet("system");
    system.injectInto(context);

    return {
        debug: undefined,
        capabilities: undefined,
        videoModel: undefined,
        abrController: undefined,
        metricsModel: undefined,
        metricsConverter: undefined,
        metricsExt: undefined,

        startup: function () {
            if (!initialized) {
                system.injectInto(this);
                initialized = true;
            }
        },

        getMetricsConverter: function () {
            return this.metricsConverter;
        },

        getDebug: function () {
            return this.debug;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        getIsLive: function () {
            return this.videoModel.getIsLive();
        },

        setIsLive: function (value) {
            this.videoModel.setIsLive(value);
        },

        getMetricsExt: function () {
            return this.metricsExt;
        },

        getMetricsFor: function (type) {
            var metrics = this.metricsModel.getReadOnlyMetricsFor(type);
            return metrics;
        },

        getQualityFor: function (type) {
            return this.abrController.getQualityFor(type);
        },

        setQualityFor: function (type, value) {
            this.abrController.setPlaybackQuality(type, value);
        },

        getAutoSwitchQuality : function () {
            return this.abrController.getAutoSwitchBitrate();
        },

        setAutoSwitchQuality : function (value) {
            this.abrController.setAutoSwitchBitrate(value);
        },

        attachView: function (view) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            element = view;

            // Set the video to autoplay.
            // We'll tell it when to go.
            element.autoplay = true;

            model = new MediaPlayer.models.VideoModel(element);
            this.videoModel.setElement(element);

            // TODO : update

            if (!playing) {
                doAutoPlay.call(this);
            }
        },

        attachSource: function (url) {
            if (!initialized) {
                throw "MediaPlayer not initialized!";
            }

            source = url;

            // TODO : update

            if (playing) {
                stream.reset();
                stream = null;
            }

            doAutoPlay.call(this);
        },

        play: play
    };
};

MediaPlayer.prototype = {
    constructor: MediaPlayer
};

MediaPlayer.dependencies = {};
MediaPlayer.utils = {};
MediaPlayer.models = {};
MediaPlayer.vo = {};
MediaPlayer.vo.metrics = {};
MediaPlayer.rules = {};
MediaPlayer.di = {};
