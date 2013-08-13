Caster = (function () {
    "use strict";

    var APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e", // "ChromeCast",
        NAMESPACE = "org.dashif.dashjs",
        delegate,
        cast_api,
        cv_activity,

        onReceiverList = function(list) {
            if (delegate.onReceiverList !== undefined) {
                delegate.onReceiverList(list);
            }
        },

        onLaunch = function(activity) {
            if (activity.status == "running") {
                console.log("Activity is running.");
                cv_activity = activity;
                cast_api.addMessageListener(activity.activityId, NAMESPACE, onMessageReceived);
            }
            else if (activity.status == "error") {
                console.log("Error launching activity.");
                cv_activity = null;
            }
        },

        onLoad = function(status) {
            console.log("Loaded.");
        },

        sendMessage = function(command, attrs, callback) {
            cast_api.sendMessage(cv_activity.activityId, NAMESPACE, $.extend({ command: command }, attrs), callback);
        },

        onMediaPlay = function (s) {
            console.log("Media play.");
        },

        onMediaPause = function (s) {
            console.log("Media paused.");
        },

        onMediaVolumeChanged = function (s) {
            console.log("Media volume changed.");
        },

        onMessageReceived = function (e) {
            console.log("Message received.");
        },

        onMessageSent = function (e) {
            console.log("Message sent.");
        };

    return {
        doLaunch: function(receiver, params) {
            var request = new cast.LaunchRequest(APP_ID, receiver);
            request.parameters = params;
            cast_api.launch(request, onLaunch);
        },

        loadMedia: function(url) {
            console.log("Send load media...");
            sendMessage("load", {manifest: url}, onMessageSent);
        },

        playMedia: function() {
            cast_api.playMedia(cv_activity.activityId, new cast.MediaPlayRequest(), onMediaPlay);
        },

        pauseMedia: function () {
            cast_api.pauseMedia(cv_activity.activityId, onMediaPlay);
        },

        muteMedia: function () {
            setMediaVolume(0);
        },

        unmuteMedia: function () {
            setMediaVolume(1);
        },

        setMediaVolume: function (volume) {
            cast_api.setMediaVolume(cv_activity.activityId, new cast.MediaVolumeRequest(volume, false), onMediaVolumeChanged);
        },

        stopPlayback: function() {
            if (cv_activity) {
                cast_api.stopActivity(cv_activity.activityId);
            }
        },

        isCastInitMessage: function(event) {
            return (event.source == window && event.data &&
                    event.data.source == "CastApi" &&
                    event.data.event == "Hello");
        },

        startup: function () {
            cast_api = new cast.Api();
            cast_api.addReceiverListener(APP_ID, onReceiverList);
        },

        initialize: function (cDelegate) {
            delegate = cDelegate;
            this.startup();
        }
    };
}());
