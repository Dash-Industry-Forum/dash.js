MediaPlayer.dependencies.StreamProcessor = function () {
    "use strict";

    var isDynamic,
        stream,
        type,

        createBufferControllerForType = function(type) {
            var self = this,
            controllerName = (type === "video" || type === "audio") ? "bufferController" : "textController";

            return self.system.getObject(controllerName);
        };

    return {
        system : undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        indexHandler: undefined,
        liveEdgeFinder: undefined,
        eventList: undefined,
        timelineConverter: undefined,
        abrController: undefined,
        baseURLExt: undefined,

        initialize: function (typeValue, buffer, videoModel, requestScheduler, fragmentController, playbackController, mediaSource, data, periodInfo, streamValue) {

            var self = this,
                manifest = self.manifestModel.getValue(),
                representationController = self.system.getObject("representationController"),
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
            isDynamic = self.manifestExt.getIsDynamic(manifest);
            indexHandler.setType(type);
            indexHandler.setIsDynamic(isDynamic);
            self.bufferController = bufferController;
            self.playbackController = playbackController;
            self.scheduleController = scheduleController;
            self.representationController = representationController;
            self.videoModel = videoModel;
            self.fragmentController = fragmentController;
            self.requestScheduler = requestScheduler;
            self.fragmentLoader = fragmentLoader;
            self.liveEdgeFinder.initialize(this);

            abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, representationController);
            abrController.subscribe(abrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            requestScheduler.subscribe(requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, bufferController);
            requestScheduler.subscribe(requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, scheduleController);

            liveEdgeFinder.subscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, self.timelineConverter);
            liveEdgeFinder.subscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, scheduleController);

            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, liveEdgeFinder);
            representationController.subscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            fragmentController.subscribe(fragmentController.eventList.ENAME_INIT_SEGMENT_LOADED, bufferController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_MEDIA_SEGMENT_LOADED, bufferController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_INIT_SEGMENT_LOADING_START, scheduleController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_MEDIA_SEGMENT_LOADING_START, scheduleController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.subscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);

            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
            bufferController.subscribe(bufferController.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, requestScheduler);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BYTES_REJECTED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentController);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.subscribe(bufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);

            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_PAUSED, scheduleController);
            playbackController.subscribe(playbackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);

            if (isDynamic) {
                playbackController.subscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);
            }

            indexHandler.subscribe(indexHandler.eventList.ENAME_REPRESENTATION_UPDATED, representationController);
            baseUrlExt.subscribe(baseUrlExt.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.subscribe(baseUrlExt.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            bufferController.initialize(type, buffer, mediaSource, self);
            scheduleController.initialize(type, this);

            fragmentModel = this.getFragmentModel();
            fragmentModel.setLoader(fragmentLoader);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.subscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_FAILED, scheduleController);
            fragmentLoader.subscribe(fragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);

            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
            bufferController.subscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);

            representationController.initialize(this);
            representationController.updateData(data, periodInfo, type);
        },

        getData: function() {
            return this.representationController.getData();
        },

        getDataIndex: function() {
            return this.representationController.getDataIndex();
        },

        isUpdating: function() {
            return this.representationController.isUpdating();
        },

        getType: function() {
            return type;
        },

        getFragmentModel: function() {
            return this.scheduleController.getFragmentModel();
        },

        updateData: function(data, periodInfo) {
            return this.representationController.updateData(data, periodInfo, type);
        },

        start: function() {
            this.scheduleController.start();
        },

        seek: function(time) {
            this.scheduleController.seek(time);
        },

        stop: function() {
            this.scheduleController.stop();
        },

        getCurrentRepresentation: function() {
            return this.representationController.getCurrentRepresentation();
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
                representationController = self.representationController,
                scheduleController = self.scheduleController,
                liveEdgeFinder = self.liveEdgeFinder,
                fragmentController = self.fragmentController,
                requestScheduler = self.requestScheduler,
                abrController = self.abrController,
                playbackController = self.playbackController,
                indexHandler = this.indexHandler,
                baseUrlExt = this.baseURLExt,
                fragmentModel = this.getFragmentModel(),
                fragmentLoader = this.fragmentLoader,
                videoModel = self.videoModel;

            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, bufferController);
            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, representationController);
            abrController.unsubscribe(abrController.eventList.ENAME_QUALITY_CHANGED, scheduleController);

            requestScheduler.unsubscribe(requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, bufferController);
            requestScheduler.unsubscribe(requestScheduler.eventList.ENAME_SCHEDULED_TIME_OCCURED, scheduleController);

            liveEdgeFinder.unsubscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, self.timelineConverter);
            liveEdgeFinder.unsubscribe(liveEdgeFinder.eventList.ENAME_LIVE_EDGE_FOUND, scheduleController);

            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_STARTED, scheduleController);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, scheduleController);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, abrController);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, stream);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, liveEdgeFinder);
            representationController.unsubscribe(representationController.eventList.ENAME_DATA_UPDATE_COMPLETED, playbackController);

            fragmentController.unsubscribe(fragmentController.eventList.ENAME_INIT_SEGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_MEDIA_SEGMENT_LOADED, bufferController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_INIT_SEGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_MEDIA_SEGMENT_LOADING_START, scheduleController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, scheduleController);
            fragmentController.unsubscribe(fragmentController.eventList.ENAME_STREAM_COMPLETED, bufferController);

            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
            bufferController.unsubscribe(bufferController.eventList.ENAME_MIN_BUFFER_TIME_UPDATED, requestScheduler);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BYTES_REJECTED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentController);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFERING_COMPLETED, stream);
            bufferController.unsubscribe(bufferController.eventList.ENAME_CLOSED_CAPTIONING_REQUESTED, scheduleController);

            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_PROGRESS, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_TIME_UPDATED, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_RATE_CHANGED, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, bufferController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_SEEKING, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_PAUSED, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_PLAYBACK_STARTED, scheduleController);
            playbackController.unsubscribe(playbackController.eventList.ENAME_WALLCLOCK_TIME_UPDATED, representationController);

            indexHandler.unsubscribe(indexHandler.eventList.ENAME_REPRESENTATION_UPDATED, representationController);
            baseUrlExt.unsubscribe(baseUrlExt.eventList.ENAME_INITIALIZATION_LOADED, indexHandler);
            baseUrlExt.unsubscribe(baseUrlExt.eventList.ENAME_SEGMENTS_LOADED, indexHandler);

            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_OUTRUN, fragmentModel);
            bufferController.unsubscribe(bufferController.eventList.ENAME_BUFFER_LEVEL_BALANCED, fragmentModel);

            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_STARTED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_STREAM_COMPLETED, fragmentController);
            fragmentModel.unsubscribe(fragmentModel.eventList.ENAME_FRAGMENT_LOADING_FAILED, scheduleController);
            fragmentLoader.unsubscribe(fragmentLoader.eventList.ENAME_LOADING_COMPLETED, fragmentModel);
            fragmentController.resetModel(fragmentModel);

            this.liveEdgeFinder.abortSearch();
            this.bufferController.reset(errored);
            this.scheduleController.reset();
            this.bufferController = null;
            this.scheduleController = null;
            this.representationController = null;
            this.videoModel = null;
            this.fragmentController = null;
            this.requestScheduler = null;
        }

    };
};

MediaPlayer.dependencies.StreamProcessor.prototype = {
    constructor: MediaPlayer.dependencies.StreamProcessor
};