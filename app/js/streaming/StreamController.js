/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 MediaPlayer.dependencies.StreamController = function () {
    "use strict";

    /*
     * StreamController aggregates all streams defined as Period sections in the manifest file
     * and implements corresponding logic to switch between them.
     */

    var streams = [],
        activeStream,
        //TODO set correct value for threshold
        STREAM_BUFFER_END_THRESHOLD = 4,
        STREAM_END_THRESHOLD = 3,
        deferredSwitch= null,

        play = function () {
            activeStream.play();
        },

        pause = function () {
            activeStream.pause();
        },

        seek = function (time) {
            activeStream.seek(time);
        },

        /*
         * Replaces the currently displayed <video> with a new data and corresponding <video> element.
         *
         * @param fromVideoModel Currently used video data
         * @param toVideoModel New video data to be displayed
         * 
         * TODO - move method to appropriate place - VideoModelExtensions??
         */
        switchVideoModel = function (fromVideoModel, toVideoModel) {
            var activeVideoElement = fromVideoModel.getElement(),
                newVideoElement = toVideoModel.getElement();

            if (!newVideoElement.parentNode) {
                activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
            }

            // We use width property to hide/show video element because when using display="none"/"block" playback
            // sometimes stops after switching.
            activeVideoElement.style.width = "0px";
            newVideoElement.style.width = "100%";

            copyVideoProperties(activeVideoElement, newVideoElement);
            detachVideoEvents(fromVideoModel);
            attachVideoEvents(toVideoModel);

            return Q.when(true);
        },

        attachVideoEvents = function (videoModel) {
            videoModel.listen("seeking", seekingHandler);
            videoModel.listen("progress", progressHandler);

            if (getNextStream()) {
                videoModel.listen("timeupdate", timeUpdateHandler);
            }
        },

        detachVideoEvents = function (videoModel) {
            videoModel.unlisten("seeking", seekingHandler);
            videoModel.unlisten("progress", progressHandler);
            videoModel.unlisten("timeupdate", timeUpdateHandler);
        },

        copyVideoProperties = function (fromVideoElement, toVideoElement) {
            ["controls", "loop", "muted", "playbackRate", "volume"].forEach( function(prop) {
                toVideoElement[prop] = fromVideoElement[prop];
            });
        },

        /*
         * Called when more data is buffered. 
         * Used to determine the time current stream is almost buffered and we can start buffering of the next stream.
         * TODO move to ???Extensions class
         */
        progressHandler = function() {

            var ranges = activeStream.getVideoModel().getElement().buffered;

            // nothing is buffered
            if (!ranges.length) {
                return;
            }

            // In case a real buffered value exceeds current position move it to be able to start playback after period switching
            if (activeStream.getVideoModel().getCurrentTime() < ranges.start(0)) {
                activeStream.getVideoModel().setCurrentTime(ranges.start(0));
            }

            var lastRange = ranges.length -1,
                bufferEndTime = ranges.end(lastRange) - activeStream.getTimestampOffset(),
                remainingBufferDuration = activeStream.getDuration() - bufferEndTime;

            if (remainingBufferDuration < STREAM_BUFFER_END_THRESHOLD) {
                activeStream.getVideoModel().unlisten("progress", progressHandler);
                onStreamBufferingEnd();
            }
        },

        /*
         * Called when current playback positon is changed.
         * Used to determine the time current stream is finished and we should switch to the next stream.
         * TODO move to ???Extensions class
         */
        timeUpdateHandler = function() {
            // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new period starts
            // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
            if (activeStream.getVideoModel().getElement().seeking) return;

            var streamEndTime  = activeStream.getDuration() + activeStream.getTimestampOffset() + activeStream.getLiveOffset(),
                currentTime = activeStream.getVideoModel().getCurrentTime();

            // check if stream end is reached
            if (streamEndTime - currentTime < STREAM_END_THRESHOLD) {
                switchStream(activeStream, getNextStream());
            }
        },

        /*
         * Called when Seeking event is occured.
         * TODO move to ???Extensions class
         */
        seekingHandler = function() {
            var seekingTime = activeStream.getVideoModel().getCurrentTime(),
                seekingStream = getStreamForTime(seekingTime);

            if (seekingStream && seekingStream !== activeStream) {
                switchStream(activeStream, seekingStream, seekingTime);
            }
        },

        /*
         * Handles the current stream buffering end moment to start the next stream buffering
         */
        onStreamBufferingEnd = function() {
            var nextStream = getNextStream();
            if (nextStream) {
                nextStream.initPlayback();
            }
        },

        getNextStream = function() {
            var nextIndex = activeStream.getPeriodIndex() + 1;
            return (nextIndex < streams.length) ? streams[nextIndex] : null;
        },

        getStreamForTime = function(time) {
            var duration = 0,
                stream = null;

            for (var i = 0, ln = streams.length; i < ln; i++) {
                stream = streams[i];
                duration += stream.getDuration();

                if (time < duration) {
                    return stream;
                }
            }
        },

        //  TODO move to ???Extensions class
        createVideoModel = function() {
            var model = this.system.getObject("videoModel"),
                video = document.createElement("video");
            model.setElement(video);
            return model;
        },

        switchStream = function(from, to, seekTo) {

            if(!from || !to || from === to) return;

            Q.when(deferredSwitch || true).then(
                function() {
                    from.pause();
                    activeStream = to;

                    deferredSwitch = switchVideoModel(from.getVideoModel(), to.getVideoModel());

                    if (seekTo) {
                        seek(from.getVideoModel().getCurrentTime());
                    } else {
                        activeStream.initPlayback();
                    }

                    play();
                }
            );
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        mediaSourceExt: undefined,
        sourceBufferExt: undefined,
        bufferExt: undefined,
        manifestExt: undefined,
        fragmentController: undefined,
        abrController: undefined,
        fragmentExt: undefined,
        capabilities: undefined,
        debug: undefined,
        metricsExt: undefined,
        errHandler: undefined,

        getManifestExt: function () {
            return activeStream.getManifestExt();
        },

        setAutoPlay: function (value) {
            activeStream.setAutoPlay(value);
        },

        getAutoPlay: function () {
            return activeStream.getAutoPlay();
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        load: function (url) {

            var self = this,
                stream;

            self.manifestLoader.load(url).then(
                function(manifest) {
                    self.manifestExt.getPeriodCount(manifest).then(
                        function(lenght) {
                            for (var i = 0; i < lenght; i++) {
                                stream = self.system.getObject("stream");
                                stream.setVideoModel(i === 0 ? self.videoModel : createVideoModel.call(self));
                                stream.initProtection();
                                stream.load(manifest, i);
                                streams.push(stream);
                            }

                            activeStream = streams[0];
                            attachVideoEvents(activeStream.getVideoModel());
                        }
                    );
                }
            );
        },

        reset: function () {

            if (!!activeStream) {
                detachVideoEvents(activeStream.getVideoModel());
            }

            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.reset();
            }

            streams = [];
        },

        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};