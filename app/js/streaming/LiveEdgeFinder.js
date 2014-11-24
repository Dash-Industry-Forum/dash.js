
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var isSearchStarted = false,
        rules,

        onSearchCompleted = function(req) {
            var liveEdge = req.value,
                searchTime = (new Date().getTime() - this.streamProcessor.getStreamInfo().manifestInfo.loadedTime.getTime()) / 1000;

            if (liveEdge !== null) {
                this.notify(this.eventList.ENAME_LIVE_EDGE_FOUND, liveEdge, searchTime);
            } else {
                this.notify(this.eventList.ENAME_LIVE_EDGE_SEARCH_ERROR, searchTime);
            }
        },

        onStreamUpdated = function(sender, error) {
            if (!this.streamProcessor.isDynamic() || isSearchStarted || error) return;

            var self = this;

            rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES);
            isSearchStarted = true;

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
        eventList: {
            ENAME_LIVE_EDGE_FOUND: "liveEdgeFound",
            ENAME_LIVE_EDGE_SEARCH_ERROR: "liveEdgeSearchError"
        },

        setup: function() {
            this.streamUpdated = onStreamUpdated;
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

            if (!rules) return;

            for (var i = 0, ln = rules.length; i < ln; i += 1) {
                rules[i].reset();
            }
        }
    };
};

MediaPlayer.dependencies.LiveEdgeFinder.prototype = {
    constructor: MediaPlayer.dependencies.LiveEdgeFinder
};