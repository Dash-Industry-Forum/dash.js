
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var isSearchStarted = false,
        searchStartTime = NaN,
        rules,

        onSearchCompleted = function(req) {
            var liveEdge = req.value,
                searchTime = (new Date().getTime() - searchStartTime) / 1000;

                this.notify(MediaPlayer.dependencies.LiveEdgeFinder.eventList.ENAME_LIVE_EDGE_SEARCH_COMPLETED, {liveEdge: liveEdge, searchTime: searchTime},
                    liveEdge === null ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.LiveEdgeFinder.LIVE_EDGE_NOT_FOUND_ERROR_CODE, "live edge has not been found", null) : null);
        },

        onStreamUpdated = function(e) {
            if (!this.streamProcessor.isDynamic() || isSearchStarted || e.error) return;

            var self = this;

            rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES);
            isSearchStarted = true;
            searchStartTime = new Date().getTime();

            this.rulesController.applyRules(rules, self.streamProcessor, onSearchCompleted.bind(self), null, function(currentValue, newValue) {
                return newValue;
            });
        };

    return {
        system: undefined,
        scheduleRulesCollection: undefined,
        rulesController: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this[MediaPlayer.dependencies.Stream.eventList.ENAME_STREAM_UPDATED] = onStreamUpdated;
        },

        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor;
            this.fragmentLoader = streamProcessor.fragmentLoader;

            if (this.scheduleRulesCollection.liveEdgeBinarySearchRule) {
                this.scheduleRulesCollection.liveEdgeBinarySearchRule.setFinder(this);
            }
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