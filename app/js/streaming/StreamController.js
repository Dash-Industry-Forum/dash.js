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
        STREAM_BUFFER_END_THRESHOLD = 6,
        STREAM_END_THRESHOLD = 0.2,
        autoPlay = true,
        isPeriodSwitchingInProgress = false,

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
        switchVideoModel = function (fromStream, toStream) {
            var activeVideoElement = fromStream.getVideoModel().getElement(),
                newVideoElement = toStream.getVideoModel().getElement();

            if (!newVideoElement.parentNode) {
                activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
            }

            // We use width property to hide/show video element because when using display="none"/"block" playback
            // sometimes stops after switching.
            activeVideoElement.style.width = "0px";
            newVideoElement.style.width = "100%";

            copyVideoProperties(activeVideoElement, newVideoElement);
            detachVideoEvents.call(this, fromStream);
            attachVideoEvents.call(this, toStream);
        },

        attachVideoEvents = function (stream) {
            var playbackCtrl = stream.getPlaybackController();

            playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_STARTED, this.manifestUpdater);
            playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_PAUSED, this.manifestUpdater);
            playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_SEEKING, this);
            playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_TIME_UPDATED, this);
            playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_PROGRESS, this);
        },

        detachVideoEvents = function (stream) {
            var playbackCtrl = stream.getPlaybackController();

            playbackCtrl.unsubscribe(playbackCtrl.eventList.ENAME_PLAYBACK_STARTED, this.manifestUpdater);
            playbackCtrl.unsubscribe(playbackCtrl.eventList.ENAME_PLAYBACK_PAUSED, this.manifestUpdater);
            playbackCtrl.unsubscribe(playbackCtrl.eventList.ENAME_PLAYBACK_SEEKING, this);
            playbackCtrl.unsubscribe(playbackCtrl.eventList.ENAME_PLAYBACK_TIME_UPDATED, this);
            playbackCtrl.unsubscribe(playbackCtrl.eventList.ENAME_PLAYBACK_PROGRESS, this);
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
        onProgress = function(sender, ranges, remainingUnbufferedDuration) {
            if (!remainingUnbufferedDuration || (remainingUnbufferedDuration >= STREAM_BUFFER_END_THRESHOLD)) return;

            onStreamBufferingEnd();
        },

        /*
         * Called when current playback positon is changed.
         * Used to determine the time current stream is finished and we should switch to the next stream.
         * TODO move to ???Extensions class
         */
        onTimeupdate = function(sender, timeToPeriodEnd) {
            var self = this;

            self.metricsModel.addDroppedFrames("video", self.videoExt.getPlaybackQuality(activeStream.getVideoModel().getElement()));

            if (!getNextStream()) return;

            // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new period starts
            // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
            if (activeStream.getVideoModel().getElement().seeking) return;

            // check if stream end is reached
            if (timeToPeriodEnd < STREAM_END_THRESHOLD) {
                switchStream.call(this, activeStream, getNextStream());
            }
        },

        /*
         * Called when Seeking event is occured.
         * TODO move to ???Extensions class
         */
        onSeeking = function(sender, seekingTime/*, isProgrammatic*/) {
            var seekingStream = getStreamForTime(seekingTime);

            if (seekingStream && seekingStream !== activeStream) {
                switchStream.call(this, activeStream, seekingStream, seekingTime);
            }
        },

        /*
         * Handles the current stream buffering end moment to start the next stream buffering
         */
        onStreamBufferingEnd = function() {
            var nextStream = getNextStream();
            if (nextStream) {
                nextStream.seek(nextStream.getStartTime());
            }
        },

        getNextStream = function() {
            var nextIndex = activeStream.getPeriodIndex() + 1;
            return (nextIndex < streams.length) ? streams[nextIndex] : null;
        },

        getStreamForTime = function(time) {
            var duration = 0,
                stream = null,
                ln = streams.length;

            if (ln > 0) {
                duration += streams[0].getStartTime();
            }

            for (var i = 0; i < ln; i++) {
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

        removeVideoElement = function(element) {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        },

        switchStream = function(from, to, seekTo) {

            if(isPeriodSwitchingInProgress || !from || !to || from === to) return;

            isPeriodSwitchingInProgress = true;

            from.pause();
            activeStream = to;

            switchVideoModel.call(this, from, to);

            if (seekTo) {
                seek(from.getPlaybackController().getTime());
            } else {
                seek(to.getStartTime());
            }

            play();
            from.resetEventController();
            activeStream.startEventController();
            isPeriodSwitchingInProgress = false;
        },

        composeStreams = function() {
            var self = this,
                manifest = self.manifestModel.getValue(),
                playbackCtrl,
                pLen,
                sLen,
                pIdx,
                sIdx,
                period,
                periods,
                mpd,
                stream;

            if (!manifest) return;

            mpd = self.manifestExt.getMpd(manifest);
            periods = self.manifestExt.getRegularPeriods(manifest, mpd);

            try {
                if (periods.length === 0) {
                    throw new Error("There are no regular periods");
                }

                for (pIdx = 0, pLen = periods.length; pIdx < pLen; pIdx += 1) {
                    period = periods[pIdx];
                    for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                        // If the stream already exists we just need to update the values we got from the updated manifest
                        if (streams[sIdx].getId() === period.id) {
                            stream = streams[sIdx];
                            stream.updateData(period);
                        }
                    }
                    // If the Stream object does not exist we probably loaded the manifest the first time or it was
                    // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                    if (!stream) {
                        stream = self.system.getObject("stream");
                        playbackCtrl = self.system.getObject("playbackController");
                        stream.setPeriodInfo(period);
                        stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                        stream.setPlaybackController(playbackCtrl);
                        playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_ERROR, stream);
                        playbackCtrl.subscribe(playbackCtrl.eventList.ENAME_PLAYBACK_METADATA_LOADED, stream);
                        stream.initProtection();
                        stream.setAutoPlay(autoPlay);
                        stream.load(manifest);
                        stream.subscribe(stream.eventList.ENAME_STREAM_UPDATED, self);
                        streams.push(stream);
                    }
                    stream = null;
                }

                // If the active stream has not been set up yet, let it be the first Stream in the list
                if (!activeStream) {
                    activeStream = streams[0];
                    attachVideoEvents.call(self, activeStream);
                }
            } catch(e) {
                self.errHandler.manifestError(e.message, "nostreamscomposed", self.manifestModel.getValue());
                self.reset();
            }
        },

        onStreamUpdated = function() {
            var self = this,
                ln = streams.length,
                i = 0;

            for (i; i < ln; i += 1) {
                if (streams[i].isUpdating()) return;
            }

            self.notify(self.eventList.ENAME_STREAMS_COMPOSED);
        },

        onManifestLoaded = function(sender, manifest, error) {
            if (!error) {
                this.manifestModel.setValue(manifest);
                this.debug.log("Manifest has loaded.");
                //self.debug.log(self.manifestModel.getValue());
                composeStreams.call(this);
            } else {
                this.reset();
            }
        };

    return {
        system: undefined,
        videoModel: undefined,
        manifestLoader: undefined,
        manifestUpdater: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        debug: undefined,
        metricsModel: undefined,
        videoExt: undefined,
        errHandler: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_STREAMS_COMPOSED: "streamsComposed"
        },

        setup: function() {
            this.manifestLoaded = onManifestLoaded;
            this.streamUpdated = onStreamUpdated;

            this.playbackSeeking = onSeeking;
            this.playbackProgress = onProgress;
            this.playbackTimeUpdated = onTimeupdate;
        },

        getManifestExt: function () {
            return activeStream.getManifestExt();
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        load: function (url) {
            this.manifestLoader.load(url);
        },

        reset: function () {

            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream);
            }

            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.unsubscribe(stream.eventList.ENAME_STREAM_UPDATED, this);
                stream.reset();
                // we should not remove the video element for the active stream since it is the element users see at the page
                if (stream !== activeStream) {
                    removeVideoElement(stream.getVideoModel().getElement());
                }
            }

            streams = [];
            this.manifestUpdater.stop();
            this.manifestModel.setValue(null);
            isPeriodSwitchingInProgress = false;
            activeStream = null;
        },

        play: play,
        seek: seek,
        pause: pause
    };
};

MediaPlayer.dependencies.StreamController.prototype = {
    constructor: MediaPlayer.dependencies.StreamController
};
