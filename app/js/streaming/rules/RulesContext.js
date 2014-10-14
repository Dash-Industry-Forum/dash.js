MediaPlayer.rules.RulesContext = function (streamProcessor, currentValue) {
    "use strict";
    var trackInfo = streamProcessor.getCurrentTrack();

    return {
        getStreamInfo: function() {
            return trackInfo.mediaInfo.streamInfo;
        },

        getMediaInfo: function() {
            return trackInfo.mediaInfo;
        },

        getTrackInfo: function() {
            return trackInfo;
        },

        getCurrentValue: function() {
            return currentValue;
        },

        getManifestInfo: function() {
            return trackInfo.mediaInfo.streamInfo.manifestInfo;
        }
    };
};

MediaPlayer.rules.RulesContext.prototype = {
    constructor: MediaPlayer.rules.RulesContext
};