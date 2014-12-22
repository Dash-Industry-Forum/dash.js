
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var isSearchStarted = false,
        searchStartTime = NaN,
        rules,
        ruleSet = MediaPlayer.rules.SynchronizationRulesCollection.prototype.BEST_GUESS_RULES,

        onSearchCompleted = function(req) {
            var liveEdge = req.value,
                searchTime = (new Date().getTime() - searchStartTime) / 1000;

                this.notify(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, {liveEdge: liveEdge, searchTime: searchTime},
                    liveEdge === null ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE, "live edge has not been found", null) : null);
        },

        onStreamUpdated = function(e) {
            var self = this;

            if (!self.streamProcessor.isDynamic() || isSearchStarted || e.error) {
                return;
            }

            rules = self.synchronizationRulesCollection.getRules(ruleSet);
            isSearchStarted = true;
            searchStartTime = new Date().getTime();

            self.rulesController.applyRules(rules, self.streamProcessor, onSearchCompleted.bind(self), null, function(currentValue, newValue) {
                return newValue;
            });
        },

        onTimeSyncComplete = function (e) {
            if (e.error) {
                ruleSet = MediaPlayer.rules.SynchronizationRulesCollection.prototype.BEST_GUESS_RULES;
            } else {
                ruleSet = MediaPlayer.rules.SynchronizationRulesCollection.prototype.TIME_SYNCHRONIZED_RULES;
            }
        };

    return {
        system: undefined,
        synchronizationRulesCollection: undefined,
        rulesController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated;
            this[MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED] = onTimeSyncComplete;
        },

        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor;
            this.fragmentLoader = streamProcessor.fragmentLoader;
        },

        abortSearch: function() {
            isSearchStarted = false;
            searchStartTime = NaN;
        }
    };
};

MediaPlayer.dependencies.LiveEdgeFinder.prototype = {
    constructor: MediaPlayer.dependencies.LiveEdgeFinder
};

MediaPlayer.dependencies.LiveEdgeFinder.eventList = {
    ENAME_LIVE_EDGE_SEARCH_COMPLETED: "liveEdgeFound"
};

MediaPlayer.dependencies.LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE = 1;
