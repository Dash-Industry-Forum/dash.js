angular.module('DashCastSenderApp.services', [])
    .factory('caster', function() {
    let APP_ID = "9210B4FF", // "App id example of receiver. To be changed by your own AppId ",
        NAMESPACE = "urn:x-cast:org.dashif.dashjs",
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
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED, function (e) {
                if (remotePlayer && remotePlayer.isMediaLoaded) {
                    delegate.onTimeUpdate(remotePlayer.currentTime);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.DURATION_CHANGED, function () {
                if (remotePlayer && remotePlayer.duration) {
                    delegate.onDurationChange(remotePlayer.duration);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED, function () {
                if (remotePlayer && remotePlayer.mediaInfo) {
                    delegate.onDurationChange(remotePlayer.mediaInfo.duration);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.IS_PAUSED_CHANGED, function () {
                if (remotePlayer) {
                    delegate.onPausedChange(remotePlayer.isPaused);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED, function () {
                if (remotePlayer) {
                    delegate.onMutedChange(remotePlayer.isMuted);
                }
            });
            remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED, function () {
                if (remotePlayer) {
                    delegate.onVolumeChange(remotePlayer.volumeLevel);
                }
            });
        },

        sendMessage = function(command, attrs, callback) {
            if (castSession) {
                castSession.sendMessage(NAMESPACE, {
                    type: 'TOGGLE_STATS'
                }).then(function (err) {
                    onMessageSent(err);
                });
            }
        },

        onMessageSent = function (err) {
            console.log("Message sent.  Result...");
            if (err) {
                console.error(err);
            }
        };

    return {
        loadMedia: function(url, live) {
            console.log("Send load media...");
            var mediaInfo = new chrome.cast.media.MediaInfo(url);
            var request = new chrome.cast.media.LoadRequest(mediaInfo);
            if (castSession) {
                castSession.loadMedia(request).then(
                    function() { 
                        let media = castSession.getMediaSession();
                        if (media) {
                            console.info(media);
                        }
                    },
                    function(errorCode) { console.log('Error code: ' + errorCode); }
                );
            }
        },

        playOrPause: function() {
            remotePlayerController.playOrPause();
        },

        seekMedia: function (time) {
            remotePlayer.currentTime = time;
            remotePlayerController.seek();
        },

        muteOrUnmute: function () {
            remotePlayerController.muteOrUnmute();
        },

        setMediaVolume: function (volume) {
            remotePlayer.volumeLevel = volume;
            remotePlayerController.setVolumeLevel();
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
            castContext.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, function (e) {
                console.log('[Cast]', e);
                if (e.castState === cast.framework.CastState.CONNECTED && onReady) {
                    onReady();
                    castSession = cast.framework.CastContext.getInstance().getCurrentSession();
                    if (castSession.getSessionState() === cast.framework.SessionState.SESSION_RESUMED) {
                        let mediaSession = castSession.getMediaSession();
                        if (mediaSession) {
                            // call getStatus in order to retrieve data of the media when the session is resumed
                            mediaSession.getStatus(null, function () {
                                if (mediaSession.media) {
                                    delegate.resumeMediaSession(mediaSession);
                                }
                            }, function (err) {
                                console.error('Error getting status', err);
                            });
                        }
                    } 
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
});
