
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var isSearchStarted = false,
        rules,

        onSearchCompleted = function(req) {
            var liveEdge = req.value;

            if (liveEdge !== null) {
                this.notify(this.eventList.ENAME_LIVE_EDGE_FOUND, liveEdge);
            } else {
                this.notify(this.eventList.ENAME_LIVE_EDGE_SEARCH_ERROR);
            }
        },

        onStreamUpdated = function(/*sender*/) {
            if (!this.streamProcessor.isDynamic() || isSearchStarted) return;

            var self =this,
                streamType = this.streamProcessor.getType();

            rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES);
            isSearchStarted = true;

            this.rulesController.applyRules(rules, streamType, this.streamProcessor.getPeriodInfo().id, onSearchCompleted.bind(self), null, function(currentValue, newValue) {
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
            this.indexHandler = streamProcessor.indexHandler;
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