MediaPlayer.dependencies.Notifier = function () {
    "use strict";

    var system;

    return {
        system : undefined,

        setup: function() {
            system = this.system;
            system.mapValue('notify', this.notify);
        },

        ENAME_INIT_SEGMENT_LOADING_START: "initSegmentLoadingStart",
        ENAME_MEDIA_SEGMENT_LOADING_START: "mediaSegmentLoadingStart",
        ENAME_INIT_SEGMENT_LOADED: "initSegmentLoaded",
        ENAME_MEDIA_SEGMENT_LOADED: "mediaSegmentLoaded",
        ENAME_STREAM_COMPLETED: "streamCompleted",

        ENAME_FRAGMENT_LOADING_STARTED: "fragmentLoadingStarted",
        ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted",
        ENAME_FRAGMENT_LOADING_FAILED: "segmentLoadingFailed",

        ENAME_MANIFEST_UPDATED: "manifestUpdated",

        ENAME_SET_CURRENT_TIME: "setCurrentTime",

        ENAME_LIVE_EDGE_FOUND: "liveEdgeFound",

        ENAME_SCHEDULED_TIME_OCCURRED: "scheduledTimeOccurred",

        ENAME_STREAMS_COMPOSED: "streamsComposed",

        ENAME_DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
        ENAME_DATA_UPDATE_STARTED: "dataUpdateStarted",

        ENAME_QUALITY_CHANGED: "qualityChanged",
        ENAME_VALIDATION_STARTED: "validationStarted",

        ENAME_BUFFER_LEVEL_STATE_CHANGED: "bufferLevelStateChanged",
        ENAME_BUFFER_LEVEL_UPDATED: "bufferLevelUpdated",
        ENAME_BYTES_APPENDED: "bytesAppended",
        ENAME_QUOTA_EXCEEDED: "quotaExceeded",
        ENAME_BUFFERING_COMPLETED: "bufferingCompleted",
        ENAME_BUFFER_CLEARED: "bufferCleared",
        ENAME_BUFFER_CONTROLLER_INITIALIZED: "bufferControllerInitialized",
        ENAME_INIT_REQUESTED: "initRequested",
        ENAME_BUFFER_LEVEL_OUTRUN: "bufferLevelOutrun",
        ENAME_BUFFER_LEVEL_BALANCED: "bufferLevelBalanced",
        ENAME_MIN_BUFFER_TIME_UPDATED: "minBufferTimeUpdated",

        notify: function (/*eventName, sender[, args]*/) {
            var args = [].slice.call(arguments);
            args.splice(1, 0, this);

            system.notify.apply(system, args);
        }
    };
};

MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
};