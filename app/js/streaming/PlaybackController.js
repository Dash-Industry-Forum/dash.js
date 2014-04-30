MediaPlayer.dependencies.PlaybackController = function () {
    "use strict";

    var period,

        onDataUpdateCompleted = function(sender, data, representation) {
            period = representation.adaptation.period;
        };

    return {
        eventList: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        setup: function() {
            this.dataUpdateCompleted = onDataUpdateCompleted;
        },

        initialize: function(periodInfo, videoModel) {
            period = periodInfo;
            this.videoModel = videoModel;
        },

        getTimeToPeriodEnd: function() {
            var currentTime = this.videoModel.getCurrentTime();

            return ((period.start + period.duration) - currentTime);
        },

        getPeriodDuration: function() {
            return period.duration;
        }
    };
};

MediaPlayer.dependencies.PlaybackController.prototype = {
    constructor: MediaPlayer.dependencies.PlaybackController
};