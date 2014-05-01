MediaPlayer.dependencies.Notifier = function () {
    "use strict";

    var system,
        id = 0,

        getId = function() {
            if (!this.id) {
                id += 1;
                this.id = "_id_" + id;
            }

            return this.id;
        },

        isEventSupported = function(eventName) {
            var event,
                events = this.eventList;

            for (event in events) {
                if (events[event] === eventName) return true;
            }

            return false;
        };

    return {
        system : undefined,

        setup: function() {
            var bufferControllerEvents = {
                    ENAME_CLOSED_CAPTIONING_REQUESTED: "closedCaptioningRequested",
                    ENAME_BUFFER_LEVEL_STATE_CHANGED: "bufferLevelStateChanged",
                    ENAME_BUFFER_LEVEL_UPDATED: "bufferLevelUpdated",
                    ENAME_QUOTA_EXCEEDED: "quotaExceeded",
                    ENAME_BYTES_APPENDED: "bytesAppended",
                    ENAME_BUFFERING_COMPLETED: "bufferingCompleted",
                    ENAME_BUFFER_CLEARED: "bufferCleared",
                    ENAME_INIT_REQUESTED: "initRequested",
                    ENAME_BUFFER_LEVEL_OUTRUN: "bufferLevelOutrun",
                    ENAME_BUFFER_LEVEL_BALANCED: "bufferLevelBalanced",
                    ENAME_MIN_BUFFER_TIME_UPDATED: "minBufferTimeUpdated"
                },

                abrControllerEvents = {
                    ENAME_QUALITY_CHANGED: "qualityChanged",
                    ENAME_TOP_QUALITY_INDEX_CHANGED: "topQualityIndexChanged"
                },

                requestSchedulerEvents = {
                    ENAME_SCHEDULED_TIME_OCCURED: "scheduledTimeOccurred"
                },

                streamEvents = {
                    ENAME_STREAM_UPDATED: "streamUpdated"
                },

                representationControllerEvents = {
                    ENAME_DATA_UPDATE_COMPLETED: "dataUpdateCompleted",
                    ENAME_DATA_UPDATE_STARTED: "dataUpdateStarted"},

                fragmentModelEvents = {
                    ENAME_STREAM_COMPLETED: "streamCompleted",
                    ENAME_FRAGMENT_LOADING_STARTED: "fragmentLoadingStarted",
                    ENAME_FRAGMENT_LOADING_COMPLETED: "fragmentLoadingCompleted",
                    ENAME_FRAGMENT_LOADING_FAILED: "segmentLoadingFailed"
                },

                fragmentControllerEvents = {
                    ENAME_STREAM_COMPLETED: "streamCompleted",
                    ENAME_INIT_SEGMENT_LOADING_START: "initSegmentLoadingStart",
                    ENAME_MEDIA_SEGMENT_LOADING_START: "mediaSegmentLoadingStart",
                    ENAME_INIT_SEGMENT_LOADED: "initSegmentLoaded",
                    ENAME_MEDIA_SEGMENT_LOADED: "mediaSegmentLoaded"
                },

                streamControllerEvents = {
                    ENAME_STREAMS_COMPOSED: "streamsComposed"
                },

                playbackControllerEvents = {
                    ENAME_PLAYBACK_STARTED: "playbackStarted",
                    ENAME_PLAYBACK_STOPPED: "playbackStopped",
                    ENAME_PLAYBACK_PAUSED: "playbackPaused",
                    ENAME_PLAYBACK_SEEKING: "playbackSeeking",
                    ENAME_PLAYBACK_SEEKED: "playbackSeeked",
                    ENAME_PLAYBACK_TIME_UPDATED: "playbackTimeUpdated",
                    ENAME_PLAYBACK_PROGRESS: "playbackProgress",
                    ENAME_PLAYBACK_RATE_CHANGED: "playbackRateChanged",
                    ENAME_PLAYBACK_METADATA_LOADED: "playbackMetaDataLoaded",
                    ENAME_PLAYBACK_ERROR: "playbackError"
                },

                liveEdgeFinderEvents = {
                    ENAME_LIVE_EDGE_FOUND: "liveEdgeFound"
                },

                manifestModelEvents = {
                    ENAME_MANIFEST_UPDATED: "manifestUpdated"
                };

            system = this.system;
            system.mapValue('notify', this.notify);
            system.mapValue('subscribe', this.subscribe);
            system.mapValue('unsubscribe', this.unsubscribe);

            system.mapValue('bufferControllerEvents', bufferControllerEvents);
            system.mapOutlet('bufferControllerEvents', "bufferController", "eventList");
            system.mapOutlet('bufferControllerEvents', "textController", "eventList");

            system.mapValue('manifestModelEvents', manifestModelEvents);
            system.mapOutlet('manifestModelEvents', "manifestModel", "eventList");

            system.mapValue('liveEdgeFinderEvents', liveEdgeFinderEvents);
            system.mapOutlet('liveEdgeFinderEvents', "liveEdgeFinder", "eventList");

            system.mapValue('representationControllerEvents', representationControllerEvents);
            system.mapOutlet('representationControllerEvents', "representationController", "eventList");

            system.mapValue('requestSchedulerEvents', requestSchedulerEvents);
            system.mapOutlet('requestSchedulerEvents', "requestScheduler", "eventList");

            system.mapValue('fragmentModelEvents', fragmentModelEvents);
            system.mapOutlet('fragmentModelEvents', "fragmentModel", "eventList");

            system.mapValue('fragmentControllerEvents', fragmentControllerEvents);
            system.mapOutlet('fragmentControllerEvents', "fragmentController", "eventList");

            system.mapValue('streamControllerEvents', streamControllerEvents);
            system.mapOutlet('streamControllerEvents', "streamController", "eventList");

            system.mapValue('playbackControllerEvents', playbackControllerEvents);
            system.mapOutlet('playbackControllerEvents', "playbackController", "eventList");

            system.mapValue('abrControllerEvents', abrControllerEvents);
            system.mapOutlet('abrControllerEvents', "abrController", "eventList");

            system.mapValue('streamEvents', streamEvents);
            system.mapOutlet('streamEvents', "stream", "eventList");
        },

        notify: function (/*eventName[, args]*/) {
            var args = [].slice.call(arguments);
            args.splice(1, 0, this);

            args[0] += getId.call(this);

            system.notify.apply(system, args);
        },

        subscribe: function(eventName, observer, handler) {
            if (!handler && observer[eventName]) {
                handler = observer[eventName] = observer[eventName].bind(observer);
            }

            if(!isEventSupported.call(this, eventName)) throw ("object does not support given event " + eventName);

            if(!observer) throw "observer object cannot be null or undefined";

            if(!handler) throw "event handler cannot be null or undefined";

            eventName += getId.call(this);

            system.mapHandler(eventName, undefined, handler);
        },

        unsubscribe: function(eventName, observer, handler) {
            handler = handler || observer[eventName];
            eventName += getId.call(this);

            system.unmapHandler(eventName, undefined, handler);
        }
    };
};

MediaPlayer.dependencies.Notifier.prototype = {
    constructor: MediaPlayer.dependencies.Notifier
};