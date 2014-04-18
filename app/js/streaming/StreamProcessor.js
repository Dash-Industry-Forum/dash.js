MediaPlayer.dependencies.StreamProcessor = function () {
    "use strict";

    var isDynamic,
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
        notifier: undefined,
        timelineConverter: undefined,

        initialize: function (typeValue, buffer, videoModel, scheduler, fragmentController, mediaSource, data, periodInfo, stream) {

            var self = this,
                manifest = self.manifestModel.getValue(),
                representationController = self.system.getObject("representationController"),
                scheduleController = self.system.getObject("scheduleController"),
                bufferController = createBufferControllerForType.call(self, typeValue);

            type = typeValue;
            isDynamic = self.manifestExt.getIsDynamic(manifest);
            self.indexHandler.setType(type);
            self.indexHandler.setIsDynamic(isDynamic);
            self.bufferController = bufferController;
            self.scheduleController = scheduleController;
            self.representationController = representationController;
            self.videoModel = videoModel;
            self.fragmentController = fragmentController;
            self.requestScheduler = scheduler;
            self.liveEdgeFinder.initialize(this);

            scheduleController.subscribe(self.notifier.ENAME_QUALITY_CHANGED, bufferController);
            scheduleController.subscribe(self.notifier.ENAME_QUALITY_CHANGED, representationController);
            scheduleController.subscribe(self.notifier.ENAME_VALIDATION_STARTED, bufferController);

            self.liveEdgeFinder.subscribe(self.notifier.ENAME_LIVE_EDGE_FOUND, self.timelineConverter);
            self.liveEdgeFinder.subscribe(self.notifier.ENAME_LIVE_EDGE_FOUND, bufferController);
            self.liveEdgeFinder.subscribe(self.notifier.ENAME_LIVE_EDGE_FOUND, scheduleController);

            representationController.subscribe(self.notifier.ENAME_DATA_UPDATE_STARTED, scheduleController);
            representationController.subscribe(self.notifier.ENAME_DATA_UPDATE_COMPLETED, bufferController);
            representationController.subscribe(self.notifier.ENAME_DATA_UPDATE_COMPLETED, scheduleController);

            fragmentController.subscribe(self.notifier.ENAME_INIT_SEGMENT_LOADED, bufferController);
            fragmentController.subscribe(self.notifier.ENAME_MEDIA_SEGMENT_LOADED, bufferController);
            fragmentController.subscribe(self.notifier.ENAME_INIT_SEGMENT_LOADING_START, scheduleController);
            fragmentController.subscribe(self.notifier.ENAME_MEDIA_SEGMENT_LOADING_START, scheduleController);

            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_STATE_CHANGED, videoModel);
            bufferController.subscribe(self.notifier.ENAME_MIN_BUFFER_TIME_UPDATED, scheduler);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_CONTROLLER_INITIALIZED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_CLEARED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFERING_COMPLETED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BYTES_APPENDED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_OUTRUN, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_UPDATED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_STATE_CHANGED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_INIT_REQUESTED, scheduleController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_OUTRUN, fragmentController);
            bufferController.subscribe(self.notifier.ENAME_BUFFER_LEVEL_BALANCED, fragmentController);
            bufferController.subscribe(self.notifier.ENAME_BUFFERING_COMPLETED, stream);

            bufferController.initialize(type, buffer, mediaSource, self);
            scheduleController.initialize(type, this);
            representationController.initialize(this);
            representationController.updateData(data, periodInfo, type);

        },

        getData: function() {
            return this.representationController.getData();
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

        updateStalledState: function() {
            this.bufferController.updateStalledState();
        },

        updateBufferState: function() {
            this.bufferController.updateBufferState();
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