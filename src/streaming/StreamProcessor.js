MediaPlayer.dependencies.StreamProcessor = function () {
    "use strict";

    var isDynamic,
        stream,
        mediaInfo,
        type,
        eventController,

        createBufferControllerForType = function(type) {
            var self = this,
            controllerName = (type === "video" || type === "audio") ? "bufferController" : "textController";

            return self.system.getObject(controllerName);
        };

    return {
        system : undefined,
        indexHandler: undefined,
        liveEdgeFinder: undefined,
        timelineConverter: undefined,
        abrController: undefined,
        baseURLExt: undefined,
        adapter: undefined,

        initialize: function (typeValue, buffer, videoModel, fragmentController, playbackController, mediaSource, streamValue, eventControllerValue) {

            var self = this,
                trackController = self.system.getObject("trackController"),
                scheduleController = self.system.getObject("scheduleController"),
                liveEdgeFinder = self.liveEdgeFinder,
                abrController = self.abrController,
                indexHandler = self.indexHandler,
                baseUrlExt = self.baseURLExt,
                fragmentModel,
                fragmentLoader = this.system.getObject("fragmentLoader"),
                bufferController = createBufferControllerForType.call(self, typeValue);

            stream = streamValue;
            type = typeValue;
            eventController = eventControllerValue;

            isDynamic = stream.getStreamInfo().manifestInfo.isDynamic;
            self.bufferController = bufferController;
            self.playbackController = playbackController;
            self.scheduleController = scheduleController;
            self.trackController = trackController;
            self.videoModel = videoModel;
            self.fragmentController = fragmentController;
            self.fragmentLoader = fragmentLoader;

            trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);

            if (type === "video" || type === "audio") {
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, trackController);
                abrController.subscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, trackController);
                liveEdgeFinder.subscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);

                trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);

                trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
                trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
                stream.subscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

                if (!playbackController.streamProcessor) {
                    playbackController.streamProcessor = self;
                    trackController.subscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);
                }

                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
                fragmentController.subscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_QUOTA_EXCEEDED, scheduleController);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);

                if (isDynamic) {
                    playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController);
                }

                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
                playbackController.subscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);

                baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
                baseUrlExt.subscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);
            } else {
                bufferController.subscribe(MediaPlayer.dependencies.TextController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            }

            indexHandler.initialize(this);
            bufferController.initialize(type, buffer, mediaSource, self);
            scheduleController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.subscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.subscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);

            if (type === "video" || type === "audio") {
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
                bufferController.subscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);
            }

            trackController.initialize(this);
        },

        isUpdating: function() {
            return this.trackController.isUpdating();
        },

        getType: function() {
            return type;
        },

        getFragmentLoader: function () {
            return this.fragmentLoader;
        },

        getFragmentModel: function() {
            return this.scheduleController.getFragmentModel();
        },
        getPlaybackController:function() {
            return this.playbackController;
        },
        getStreamInfo: function() {
            return stream.getStreamInfo();
        },

        setMediaInfo: function(value) {
            if (value === mediaInfo || (value && mediaInfo && (value.id !== mediaInfo.id))) return;

            mediaInfo = value;
        },

        getMediaInfo: function() {
            return mediaInfo;
        },

        getScheduleController:function () {
            return this.scheduleController;
        },

        getEventController: function() {
            return eventController;
        },

        start: function() {
            this.scheduleController.start();
        },

        stop: function() {
            this.scheduleController.stop();
        },

        getCurrentTrack: function() {
            return this.adapter.getCurrentTrackInfo(this.trackController);
        },

        getTrackForQuality: function(quality) {
            return this.adapter.getTrackInfoForQuality(this.trackController, quality);
        },

        isBufferingCompleted: function() {
            return this.bufferController.isBufferingCompleted();
        },

        isDynamic: function(){
            return isDynamic;
        },

        reset: function(errored) {
            var self = this,
                bufferController = self.bufferController,
                trackController = self.trackController,
                scheduleController = self.scheduleController,
                liveEdgeFinder = self.liveEdgeFinder,
                fragmentController = self.fragmentController,
                abrController = self.abrController,
                playbackController = self.playbackController,
                indexHandler = this.indexHandler,
                baseUrlExt = this.baseURLExt,
                fragmentModel = this.getFragmentModel(),
                fragmentLoader = this.fragmentLoader,
                videoModel = self.videoModel;

            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, trackController);
            abrController.unsubscribe(MediaPlayer.dependencies.AbrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, this.timelineConverter);
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, scheduleController);
            liveEdgeFinder.unsubscribe(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, trackController);

            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            trackController.unsubscribe(Dash.dependencies.RepresentationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            stream.unsubscribe(MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED, scheduleController);

            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
            fragmentController.unsubscribe(MediaPlayer.dependencies.FragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_APPENDED, playbackController);

            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);
            playbackController.unsubscribe(MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);

            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.unsubscribe(Dash.dependencies.BaseURLExtensions.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
            bufferController.unsubscribe(MediaPlayer.dependencies.BufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);

            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(MediaPlayer.dependencies.FragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, scheduleController);
            fragmentLoader.unsubscribe(MediaPlayer.dependencies.FragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentModel.reset();

            indexHandler.reset();
            this.bufferController.reset(errored);
            this.scheduleController.reset();
            this.bufferController = null;
            this.scheduleController = null;
            this.trackController = null;
            this.videoModel = null;
            this.fragmentController = null;
        }

    };
};

MediaPlayer.dependencies.StreamProcessor.prototype = {
    constructor: MediaPlayer.dependencies.StreamProcessor
};
