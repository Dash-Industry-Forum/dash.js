Caster = (function () {
    "use strict";

    var delegate,
        cast_api,
        cv_activity,

        onReceiverList = function(list) {
            if (delegate.onReceiverList !== undefined) {
                delegate.onReceiverList(list);
            }
        },

        doLaunch = function(receiver, manifest) {
            var request = new cast.LaunchRequest("YouTube", receiver);
            request.parameters = "manifest=" + manifest;
            request.description = new cast.LaunchDescription();
            request.description.text = "My Cat Video";
            request.description.url = "...";
            cast_api.launch(request, onLaunch);
        },

        onLaunch = function(activity) {
            if (activity.status == "running") {
                cv_activity = activity;
            }
            else if (activity.status == "error") {
                cv_activity = null;
            }
        },

        stopPlayback = function() {
            if (cv_activity) {
                cast_api.stopActivity(cv_activity.activityId);
            }
        },

        isCastInitMessage = function(event) {
            return (event.source == window && event.data &&
                    event.data.source == "CastApi" &&
                    event.data.event == "Hello");
        },

        startup = function () {
            cast_api = new cast.Api();
            cast_api.addReceiverListener("ChromeCast", onReceiverList);
        };

    return {
        initialize: function (cDelegate) {
            delegate = cDelegate;
            startup.call(this);
        },

        launch: doLaunch,
        stop: stopPlayback,
        isCastInitMessage: isCastInitMessage
    };
}());
