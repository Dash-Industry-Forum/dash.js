Caster = (function () {
    "use strict";

    let APP_ID = "9885395F", // "To be changed by your own AppId ",
        NAMESPACE = "org.dashif.dashjs",
        delegate,
        cast_api,
        castContext,
        castSession,
        remotePlayer,
        remotePlayerController,
        cv_activity,

        onReady = function(errorMsg) {
            if (delegate.onReady !== undefined) {
                delegate.onReady(errorMsg);
            }
        },

        addListeners = function() {
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED, e => {
                if (remotePlayer && remotePlayer.isMediaLoaded) {
                    delegate.onTimeUpdate(remotePlayer.currentTime);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.DURATION_CHANGED, () => {
                if (remotePlayer && remotePlayer.duration) {
                    delegate.onDurationChange(remotePlayer.duration);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED, () => {
                if (remotePlayer && remotePlayer.mediaInfo) {
                    delegate.onDurationChange(remotePlayer.mediaInfo.duration);
                }
            });
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
        loadMedia: function(url, live) {
            console.log("Send load media...");
            var mediaInfo = new chrome.cast.media.MediaInfo(url);
            var request = new chrome.cast.media.LoadRequest(mediaInfo);
            castSession.loadMedia(request).then(
                function() { 
                    let media = castSession.getMediaSession();
                    if (media) {
                        console.info(media);
                    }
                 },
                function(errorCode) { console.log('Error code: ' + errorCode); }
            );
        },

        playMedia: function() {
            remotePlayerController.playOrPause();
        },

        pauseMedia: function () {
            remotePlayerController.playOrPause();
        },

        seekMedia: function (time) {
            remotePlayer.currentTime = time;
            remotePlayerController.seek();
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
            castContext = cast.framework.CastContext.getInstance();
            castContext.setOptions({
              receiverApplicationId: APP_ID,
              autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
            });
            castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, e => {
                console.log('[Cast]', e);
                if (e.castState === cast.framework.CastState.CONNECTED && onReady) {
                    onReady();
                    castSession = cast.framework.CastContext.getInstance().getCurrentSession();
                } else {
                    onReady(e.castState);
                }
            });
            remotePlayer = new cast.framework.RemotePlayer();
            remotePlayerController = new cast.framework.RemotePlayerController(remotePlayer);
            addListeners();
        },

        initialize: function (cDelegate) {
            delegate = cDelegate;
            this.startup();
        }
    };
}());
