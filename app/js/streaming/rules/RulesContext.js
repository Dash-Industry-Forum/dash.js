MediaPlayer.rules.RulesContext = function (streamTypeValue, representationValue, currentValue) {
    "use strict";

    var streamType = streamTypeValue,
    representation = representationValue,
    current = currentValue;

    return {
        getPeriodInfo: function() {
            return representation.adaptation.period;
        },

        getAdaptationInfo: function() {
            return representation.adaptation;
        },

        getRepresentationInfo: function() {
            return representation;
        },

        getStreamType: function() {
            return streamType;
        },

        getCurrentValue: function() {
            return current;
        }
    };
};

MediaPlayer.rules.RulesContext.prototype = {
    constructor: MediaPlayer.rules.RulesContext
};