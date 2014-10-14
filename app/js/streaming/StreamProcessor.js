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
        eventList: undefined,
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

            trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);
            bufferController.subscribe(bufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);

            if (type === "video" || type === "audio") {
                abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
                abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, trackController);
                abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

                liveEdgeFinder.subscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, this.timelineConverter);
                liveEdgeFinder.subscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, trackController);
                liveEdgeFinder.subscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, scheduleController);

                trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);

                trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
                trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController);
                trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);

                if (!playbackController.streamProcessor) {
                    playbackController.streamProcessor = self;
                    trackController.subscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);
                }

                fragmentController.subscribe(fragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
                fragmentController.subscribe(fragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
                fragmentController.subscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
                fragmentController.subscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
                fragmentController.subscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
                bufferController.subscribe(bufferController.eventList.ENAME_QUOTA_EXCEEDED, scheduleController);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);

                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
                playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);

                if (isDynamic) {
                    playbackController.subscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController);
                }

                playbackController.subscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
                playbackController.subscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);

                baseUrlExt.subscribe(baseUrlExt.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
                baseUrlExt.subscribe(baseUrlExt.eventList.ENAME_SEGMENTS_LOADED, indexHandler);
            }

            indexHandler.initialize(this);
            bufferController.initialize(type, buffer, mediaSource, self);
            scheduleController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_FAILED, scheduleController);
            fragmentLoader.subscribe(fragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);

            if (type === "video" || type === "audio") {
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
                bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
                bufferController.subscribe(bufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);
            }

            trackController.initialize(this);
        },

        isUpdating: function() {
            return this.trackController.isUpdating();
        },

        getType: function() {
            return type;
        },

        getFragmentModel: function() {
            return this.scheduleController.getFragmentModel();
        },

        getStreamInfo: function() {
            return stream.getStreamInfo();
        },

        setMediaInfo: function(value) {
            mediaInfo = value;
        },

        getMediaInfo: function() {
            return mediaInfo;
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

            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, trackController);
            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            liveEdgeFinder.unsubscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, this.timelineConverter);
            liveEdgeFinder.unsubscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, scheduleController);
            liveEdgeFinder.unsubscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, trackController);

            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController);
            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            trackController.unsubscribe(trackController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            fragmentController.unsubscribe(fragmentController.eventList.ENAME_INIT_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_MEDIA_FRAGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController.scheduleRulesCollection.bufferLevelRule);

            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BYTES_REJECTED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, trackController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.unsubscribe(bufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController.scheduleRulesCollection.bufferLevelRule);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, scheduleController.scheduleRulesCollection.bufferLevelRule);

            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, trackController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController.scheduleRulesCollection.playbackTimeRule);

            baseUrlExt.unsubscribe(baseUrlExt.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.unsubscribe(baseUrlExt.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BYTES_REJECTED, fragmentModel);

            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_FAILED, scheduleController);
            fragmentLoader.unsubscribe(fragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentController.resetModel(fragmentModel);

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