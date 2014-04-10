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

        initialize: function (typeValue, buffer, videoModel, scheduler, fragmentController, mediaSource, data, periodInfo) {

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