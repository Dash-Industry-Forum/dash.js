
MediaPlayer.dependencies.LiveEdgeFinder = function () {
    "use strict";

    var rulesCount,
        isSearchStarted = false,
        rules,
        values = {},

        onSearchCompleted = function(req) {
            var liveEdge = null,
                confidence;

            if (req.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                values[req.priority] = req.value;
            }

            if (--rulesCount) return;

            if (values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.WEAK;
                liveEdge = values[MediaPlayer.rules.SwitchRequest.prototype.WEAK];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
                liveEdge = values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT];
            }

            if (values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.STRONG;
                liveEdge = values[MediaPlayer.rules.SwitchRequest.prototype.STRONG];
            }

            if (confidence != MediaPlayer.rules.SwitchRequest.prototype.STRONG &&
                confidence != MediaPlayer.rules.SwitchRequest.prototype.WEAK) {
                confidence = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT;
            }

            if (liveEdge !== null) {
                this.notify(this.eventList.ENAME_LIVE_EDGE_FOUND, liveEdge, this.streamProcessor.getCurrentRepresentation().adaptation.period);
            } else {
                this.notify(this.eventList.ENAME_LIVE_EDGE_SEARCH_ERROR);
            }
        },

        onDataUpdateCompleted = function(/*sender, data, representation*/) {
            if (!this.streamProcessor.isDynamic() || isSearchStarted) return;

            var self =this,
                metrics = this.metricsModel.getReadOnlyMetricsFor(this.streamProcessor.getType()),
                ln,
                i;

            rules = self.scheduleRulesCollection.getRules(MediaPlayer.rules.ScheduleRulesCollection.prototype.LIVE_EDGE_RULES);
            isSearchStarted = true;
            rulesCount = ln = rules.length;
            values[MediaPlayer.rules.SwitchRequest.prototype.STRONG] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.WEAK] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;
            values[MediaPlayer.rules.SwitchRequest.prototype.DEFAULT] = MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE;

            for (i = 0; i < ln; i += 1) {
                rules[i].searchForLiveEdge(self, metrics, onSearchCompleted.bind(self));
            }
        };

    return {
        system: undefined,
        metricsModel: undefined,
        scheduleRulesCollection: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        eventList: {
            ENAME_LIVE_EDGE_FOUND: "liveEdgeFound",
            ENAME_LIVE_EDGE_SEARCH_ERROR: "liveEdgeSearchError"
        },

        setup: function() {
            this.dataUpdateCompleted = onDataUpdateCompleted;
        },

        initialize: function(streamProcessor) {
            this.streamProcessor = streamProcessor;
            this.indexHandler = streamProcessor.indexHandler;
            this.fragmentLoader = streamProcessor.fragmentLoader;
        },

        abortSearch: function() {
            isSearchStarted = false;

            for (var i = 0, ln = rules.length; i < ln; i += 1) {
                rules[i].abortSearch();
            }
        }
    };
};

MediaPlayer.dependencies.LiveEdgeFinder.prototype = {
    constructor: MediaPlayer.dependencies.LiveEdgeFinder
};