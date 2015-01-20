(function(global){
    var DEFAULT_QUALITY = 0,
        EVENT_NOTIFICATION_DELAY = 200,
        TIMEOUT_DELAY = 2000,
        isHtmlRunner = window.location.href.indexOf("runner.html") > 0,
        dummyUrl = "http://dummyUrl.com",
        dummyView = {},

    specHelper =  {
        isHtmlRunner: function() {
            return isHtmlRunner;
        },

        getDummyView: function() {
            return dummyView;
        },

        getDummyUrl: function() {
            return dummyUrl;
        },

        getExecutionDelay: function() {
            return EVENT_NOTIFICATION_DELAY;
        },

        getTimeoutDelay: function() {
            return TIMEOUT_DELAY;
        },

        getDefaultQuality: function() {
            return DEFAULT_QUALITY;
        },

        getUnixTime: function() {
            return new Date("01/01/1970 GMT");
        }
    };

    global.Helpers.setSpecHelper(specHelper);
}(window));