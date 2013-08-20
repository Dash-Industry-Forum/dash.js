Caster = (function () {
    "use strict";

    var APP_ID = "75215b49-c8b8-45ae-b0fb-afb39599204e", // "ChromeCast",
        NAMESPACE = "org.dashif.dashjs",
        CHANNEL = "org.dashif.dashjs.channel",
        delegate,
        cast_api,
        cv_activity,

        onReceiverList = function(list) {
            if (delegate.onReceiverList !== undefined) {
                delegate.onReceiverList(list);
            }
        },

        onLaunch = function(activity) {
            if (activity.status === "running") {
                console.log("Activity is running.");
                cv_activity = activity;
                cast_api.addMessageListener(activity.activityId, NAMESPACE, onMessageReceived);
            }
            else if (activity.status === "error") {
                console.log("Error launching activity.");
                cv_activity = null;
            }
        },

        onLoad = function(status) {
            console.log("Loaded.");
        },

        sendMessage = function(command, attrs, callback) {
            var msg = $.extend({ command: command }, attrs);

            cast_api.sendMessage(cv_activity.activityId, NAMESPACE, msg, callback);
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
            console.log(e);
            switch (e.event) {
                case "timeupdate":
                    delegate.onTimeUpdate(e.value);
                    break;

                case "durationchange":
                    delegate.onDurationChange(e.value);
                    break;

                case "ended":
                    delegate.onEnded();
                    break;
            }
        },

        onMessageSent = function (e) {
            console.log("Message sent.  Result...");
            console.log(e);
        };

    return {
        doLaunch: function(receiver) {
            var request = new cast.LaunchRequest(APP_ID, receiver);
            cast_api.launch(request, onLaunch);
        },

        loadMedia: function(url, live) {
            console.log("Send load media...");
            sendMessage("load", {
                manifest: url,
                isLive: live
            }, onMessageSent);
        },

        playMedia: function() {
            sendMessage("play", {}, onMessageSent);
        },

        pauseMedia: function () {
            sendMessage("pause", {}, onMessageSent);
        },

        seekMedia: function (time) {
            sendMessage("seek", {
                time: time
            }, onMessageSent);
        },

        muteMedia: function () {
            sendMessage("setMuted", {muted: true}, onMessageSent);
        },

        unmuteMedia: function () {
            sendMessage("setMuted", {muted: false}, onMessageSent);
        },

        setMediaVolume: function (volume) {
            sendMessage("setVolume", {volume: volume}, onMessageSent);
        },

        stopPlayback: function () {
            if (cv_activity) {
                cast_api.stopActivity(cv_activity.activityId);
            }
        },

        toggleStats: function () {
            sendMessage("toggleStats", onMessageSent);
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
