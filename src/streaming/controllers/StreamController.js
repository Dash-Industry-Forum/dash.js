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
     * StreamController aggregates all streams defined in the manifest file
     * and implements corresponding logic to switch between them.
     */

    var streams = [],
        activeStream,
        //TODO set correct value for threshold
        STREAM_BUFFER_END_THRESHOLD = 6,
        STREAM_END_THRESHOLD = 0.2,
        autoPlay = true,
        isStreamSwitchingInProgress = false,

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
        switchVideoModel = function (fromModel, toModel) {
            var activeVideoElement = fromModel.getElement(),
                newVideoElement = toModel.getElement();

            if (!newVideoElement.parentNode) {
                activeVideoElement.parentNode.insertBefore(newVideoElement, activeVideoElement);
            }

            // We use width property to hide/show video element because when using display="none"/"block" playback
            // sometimes stops after switching.
            activeVideoElement.style.width = "0px";
            newVideoElement.style.width = "100%";

            copyVideoProperties(activeVideoElement, newVideoElement);
        },

        attachVideoEvents = function (stream) {
            var playbackCtrl = stream.getPlaybackController();

            playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, this.manifestUpdater);
            playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED, this.manifestUpdater);
            playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, this);
            playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, this);
            playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, this);
        },

        detachVideoEvents = function (stream) {
            var self = this,
                playbackCtrl = stream.getPlaybackController();
            // setTimeout is used to avoid an exception caused by unsubscibing from PLAYBACK_TIME_UPDATED event
            // inside the event handler
            setTimeout(function(){
                playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, self.manifestUpdater);
                playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED, self.manifestUpdater);
                playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, self);
                playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, self);
                playbackCtrl.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, self);
            },1);
        },

        copyVideoProperties = function (fromVideoElement, toVideoElement) {
            ["controls", "loop", "muted", "volume"].forEach( function(prop) {
                toVideoElement[prop] = fromVideoElement[prop];
            });
        },

        fireSwitchEvent = function(fromStream, toStream) {
            this.eventBus.dispatchEvent({
                type: MediaPlayer.events.SWITCH_STREAM,
                data: {
                    fromStreamInfo: fromStream ? fromStream.getStreamInfo() : null,
                    toStreamInfo: toStream.getStreamInfo()
                }
            });
        },

        /*
         * Called when more data is buffered.
         * Used to determine the time current stream is almost buffered and we can start buffering of the next stream.
         * TODO move to ???Extensions class
         */
        onProgress = function(e) {
            if (!e.data.remainingUnbufferedDuration || (e.data.remainingUnbufferedDuration >= STREAM_BUFFER_END_THRESHOLD)) return;

            onStreamBufferingEnd();
        },

        /*
         * Called when current playback positon is changed.
         * Used to determine the time current stream is finished and we should switch to the next stream.
         * TODO move to ???Extensions class
         */
        onTimeupdate = function(e) {
            var self = this,
                playbackQuality = self.videoExt.getPlaybackQuality(activeStream.getVideoModel().getElement());

            if (playbackQuality) {
                self.metricsModel.addDroppedFrames("video", playbackQuality);
            }

            if (!getNextStream()) return;

            // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
            // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
            if (activeStream.getVideoModel().getElement().seeking) return;

            // check if stream end is reached
            if (e.data.timeToEnd < STREAM_END_THRESHOLD) {
                switchStream.call(this, activeStream, getNextStream());
            }
        },

        /*
         * Called when Seeking event is occured.
         * TODO move to ???Extensions class
         */
        onSeeking = function(e) {
            var seekingStream = getStreamForTime(e.data.seekTime);

            if (seekingStream && seekingStream !== activeStream) {
                switchStream.call(this, activeStream, seekingStream, e.data.seekTime);
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
            var nextIndex = activeStream.getStreamIndex() + 1;
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

            return null;
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

            if(isStreamSwitchingInProgress || !from || !to || from === to) return;

            isStreamSwitchingInProgress = true;

            from.pause();
            activeStream = to;

            switchVideoModel.call(this, from.getVideoModel(), to.getVideoModel());
            detachVideoEvents.call(this, from);
            attachVideoEvents.call(this, to);

            if (seekTo) {
                seek(from.getPlaybackController().getTime());
            } else {
                seek(to.getStartTime());
            }

            play();
            from.resetEventController();
            activeStream.startEventController();
            isStreamSwitchingInProgress = false;
            fireSwitchEvent.call(this, from, to);
        },

        composeStreams = function() {
            var self = this,
                manifest = self.manifestModel.getValue(),
                metrics = self.metricsModel.getMetricsFor("stream"),
                manifestUpdateInfo = self.metricsExt.getCurrentManifestUpdate(metrics),
                videoModel = activeStream ? activeStream.getVideoModel() : self.getVideoModel(),
                playbackCtrl,
                streamInfo,
                pLen,
                sLen,
                pIdx,
                sIdx,
                streamsInfo,
                stream;

            if (!manifest) return;

            streamsInfo = self.adapter.getStreamsInfo(manifest);

            try {
                if (streamsInfo.length === 0) {
                    throw new Error("There are no streams");
                }

                self.metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: videoModel.getCurrentTime(),
                    buffered: videoModel.getElement().buffered, presentationStartTime: streamsInfo[0].start,
                    clientTimeOffset: self.timelineConverter.getClientTimeOffset()});

                for (pIdx = 0, pLen = streamsInfo.length; pIdx < pLen; pIdx += 1) {
                    streamInfo = streamsInfo[pIdx];
                    for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
                        // If the stream already exists we just need to update the values we got from the updated manifest
                        if (streams[sIdx].getId() === streamInfo.id) {
                            stream = streams[sIdx];
                            stream.updateData(streamInfo);
                        }
                    }
                    // If the Stream object does not exist we probably loaded the manifest the first time or it was
                    // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                    if (!stream) {
                        stream = self.system.getObject("stream");
                        playbackCtrl = self.system.getObject("playbackController");
                        stream.setStreamInfo(streamInfo);
                        stream.setVideoModel(pIdx === 0 ? self.videoModel : createVideoModel.call(self));
                        stream.setPlaybackController(playbackCtrl);
                        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_ERROR, stream);
                        playbackCtrl.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_METADATA_LOADED, stream);
                        stream.initProtection();
                        stream.setAutoPlay(autoPlay);
                        stream.load(manifest);
                        stream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, self);
                        streams.push(stream);
                    }
                    self.metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
                    stream = null;
                }

                // If the active stream has not been set up yet, let it be the first Stream in the list
                if (!activeStream) {
                    activeStream = streams[0];
                    attachVideoEvents.call(self, activeStream);
                    activeStream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, this.liveEdgeFinder);
                    fireSwitchEvent.call(self, null, activeStream);
                }
            } catch(e) {
                self.errHandler.manifestError(e.message, "nostreamscomposed", self.manifestModel.getValue());
                self.reset();
            }
        },

        onStreamUpdated = function(/*e*/) {
            var self = this,
                ln = streams.length,
                i = 0;

            for (i; i < ln; i += 1) {
                if (streams[i].isUpdating()) return;
            }

            self.notify(MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED);
        },

        onTimeSyncAttemptCompleted = function (/*e*/) {
            composeStreams.call(this);
        },

        onManifestLoaded = function(e) {
            if (!e.error) {
                this.manifestModel.setValue(e.data.manifest);

                this.log("Manifest has loaded.");
                //self.log(self.manifestModel.getValue());

                // before composing streams, attempt to synchronize with some
                // time source (if there are any available)
                this.timeSyncController.initialize(this.manifestExt.getUTCTimingSources(e.data.manifest));
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
        adapter: undefined,
        log: undefined,
        metricsModel: undefined,
        metricsExt: undefined,
        videoExt: undefined,
        liveEdgeFinder: undefined,
        timelineConverter: undefined,
        protectionExt: undefined,
        timeSyncController: undefined,
        errHandler: undefined,
        eventBus: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = onManifestLoaded;
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated;

            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onSeeking;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS] = onProgress;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED] = onTimeupdate;

            this[MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED] = onTimeSyncAttemptCompleted;
        },

        setAutoPlay: function (value) {
            autoPlay = value;
        },

        getAutoPlay: function () {
            return autoPlay;
        },

        setProtectionData: function (value) {
            this.protectionExt.init(value);
        },

        getVideoModel: function () {
            return this.videoModel;
        },

        setVideoModel: function (value) {
            this.videoModel = value;
        },

        getActiveStreamInfo: function() {
            return activeStream ? activeStream.getStreamInfo() : null;
        },

        /**
         * @param id
         * @returns {object}
         * @memberof StreamController#
         */
        getStreamById: function(id) {
            return streams.filter(function(item){
                return item.getStreamInfo().id === id;
            })[0];
        },

        initialize: function () {
            this.timeSyncController.subscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this.timelineConverter);
            this.timeSyncController.subscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this.liveEdgeFinder);
            this.timeSyncController.subscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this);
        },

        load: function (url) {
            this.manifestLoader.load(url);
        },

        reset: function () {

            if (!!activeStream) {
                detachVideoEvents.call(this, activeStream);

                //switch back to the original video element
                if (activeStream.getVideoModel() !== this.getVideoModel()) {
                    switchVideoModel.call(this, activeStream.getVideoModel(), this.getVideoModel());
                }
            }

            this.timeSyncController.unsubscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this.timelineConverter);
            this.timeSyncController.unsubscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this.liveEdgeFinder);
            this.timeSyncController.unsubscribe(MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED, this);
            this.timeSyncController.reset();

            for (var i = 0, ln = streams.length; i < ln; i++) {
                var stream = streams[i];
                stream.unsubscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, this);
                stream.reset();
                // remove all video elements except the original one
                if (stream.getVideoModel() !== this.getVideoModel()) {
                    removeVideoElement(stream.getVideoModel().getElement());
                }
            }

            streams = [];
            this.manifestUpdater.stop();
            this.metricsModel.clearAllCurrentMetrics();
            this.manifestModel.setValue(null);
            this.timelineConverter.reset();
            this.adapter.reset();
            isStreamSwitchingInProgress = false;
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

MediaPlayer.dependencies.StreamController.eventList = {
    ENAME_STREAMS_COMPOSED: "streamsComposed"
};
