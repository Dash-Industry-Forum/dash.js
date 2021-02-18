let CastPlayer = function (player, playerController) {
  let remotePlayer = player;
  let remotePlayerController = playerController;
  let duration = 0;
  let handlers = {};
  let tracksAdded = false;
  let fakePlayer = dashjs.MediaPlayer().create();
  let castSession;

  function setCastSession(session) {
      castSession = session;
  }

  function on(type, listener, scope) {

    if (!type) {
        throw new Error('event type cannot be null or undefined');
    }
    if (!listener || typeof (listener) !== 'function') {
        throw new Error('listener must be a function: ' + listener);
    }

    if (getHandlerIdx(type, listener, scope) >= 0) return;

    handlers[type] = handlers[type] || [];

    const handler = {
        callback: listener,
        scope: scope
    };

    handlers[type].push(handler);
  }

  function off(type, listener, scope) {
      if (!type || !listener || !handlers[type]) return;
      const idx = getHandlerIdx(type, listener, scope);
      if (idx < 0) return;
      handlers[type][idx] = null;
  }

  function trigger(type, payload) {
      if (!type || !handlers[type]) return;

      payload = payload || {};

      if (payload.hasOwnProperty('type')) throw new Error('\'type\' is a reserved word for event dispatching');

      payload.type = type;

      handlers[type] = handlers[type].filter(function (item) { return item });
      handlers[type].forEach(function (handler) { handler && handler.callback.call(handler.scope, payload) });
  }

  function getHandlerIdx(type, listener, scope) {

    let idx = -1;

    if (!handlers[type]) return idx;

    handlers[type].some(function (item, index) {
        if (item && item.callback === listener && (!scope || scope === item.scope)) {
            idx = index;
            return true;
        }
    });
    return idx;
  }

  function reset() {
    tracksAdded = false;
  }

  (function () {
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.CURRENT_TIME_CHANGED, function (e) {
        if (remotePlayer && remotePlayer.isMediaLoaded) {
            trigger(dashjs.MediaPlayer.events.PLAYBACK_TIME_UPDATED);
        }
    });
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.DURATION_CHANGED, function () {
        if (remotePlayer && remotePlayer.duration) {
            duration = remotePlayer.duration;
        }
    });
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.MEDIA_INFO_CHANGED, function () {
        if (remotePlayer && remotePlayer.mediaInfo) {
            if (!tracksAdded && remotePlayer.mediaInfo.tracks) {
                let tracks = remotePlayer.mediaInfo.tracks.map(function (track) {
                    track.labels = [];
                    track.lang = track.language;
                    track.kind = track.roles && track.roles[0];
                    return track;
                });
                trigger(dashjs.MediaPlayer.events.STREAM_INITIALIZED);
                let textTracks = tracks.filter(function (track) { return track.type === 'TEXT' });
                if (textTracks.length > 0) {
                    trigger(dashjs.MediaPlayer.events.TEXT_TRACKS_ADDED, { tracks: textTracks });
                }
            }
        }
    });
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.PLAYER_STATE_CHANGED, function () {
        if (remotePlayer) {
            // trigger same events than dashjs MediaPlayer in order to update ControlBar
            switch (remotePlayer.playerState) {
                case chrome.cast.media.PlayerState.PAUSED:
                    trigger(dashjs.MediaPlayer.events.PLAYBACK_PAUSED);
                    break;
                case chrome.cast.media.PlayerState.PLAYING:
                    trigger(dashjs.MediaPlayer.events.PLAYBACK_STARTED);
                    break;
                case chrome.cast.media.PlayerState.IDLE:
                    trigger(dashjs.MediaPlayer.events.STREAM_TEARDOWN_COMPLETE);
                    break;
            }
        }
    });
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.IS_MUTED_CHANGED, function () {
        if (remotePlayer) {
            console.info(remotePlayer.isMuted);
        }
    });
    remotePlayerController.addEventListener(cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED, function () {
        if (remotePlayer) {
            console.info(remotePlayer.volumeLevel);
        }
    });
  })();

  return {
    on: on,
    off: off,
    trigger: trigger,
    reset: reset,
    setCastSession: setCastSession,
/// PLAYBACK FUNCTIONS
    play: function () {
        if (remotePlayer.isPaused) {
            remotePlayerController.playOrPause();
        }
    },
    pause: function () {
        if (!remotePlayer.isPaused) {
            remotePlayerController.playOrPause();
        }
    },
    seek: function (time) {
        remotePlayer.currentTime = time;
        remotePlayerController.seek();
    },
    isDynamic: function () {
        return remotePlayer && remotePlayer.mediaInfo && remotePlayer.mediaInfo.streamType === chrome.cast.media.StreamType.LIVE;
    },
    isPaused: function () {
        return remotePlayer.isPaused;
    },
    duration: function () {
        return remotePlayer.duration;
    },
    time: function () {
        return remotePlayer.currentTime;
    },
/// VOLUME FUNCTIONS
    getVolume: function () {
        return remotePlayer.volumeLevel;
    },
    setVolume: function (value) {
        remotePlayer.volumeLevel = value;
        remotePlayerController.setVolumeLevel();
    },
    isMuted: function () {
        return remotePlayer.isMuted;
    },
    setMute: function (value) {
        if (remotePlayer.isMuted && value === false || !remotePlayer.isMuted && value === true) {
            remotePlayerController.muteOrUnmute();
        }
    },
    convertToTimeCode: function (value) {
        return fakePlayer.convertToTimeCode(value);
    },
//TRACK MANAGEMENT
    getActiveTrackIds: function () {
        let mediaSession = castSession.getMediaSession();
        if (mediaSession && mediaSession.activeTrackIds && mediaSession.activeTrackIds.length > 1) {
            return mediaSession.activeTrackIds;
        }
        return [];
    },
    getTracksFor: function (type) {
        let mediaSession = castSession.getMediaSession();
        if (mediaSession && mediaSession.media && mediaSession.media.tracks) {
            let tracks = mediaSession.media.tracks.filter(function (track) { return track.type.toLowerCase() === type });
            return tracks;
        }
    },
    getCurrentTextTrackIndex: function () {
        let mediaSession = castSession.getMediaSession();
        if (mediaSession && mediaSession.activeTrackIds && mediaSession.activeTrackIds.length > 1) {
            return this.getTracksFor('text').findIndex(function (track) { return track.trackId === mediaSession.activeTrackIds[1] });
        }
        return -1;
    },
    setTextTrack: function (index) {
        let activeTrackIds = this.getActiveTrackIds();
        if (index === -1 && activeTrackIds.length === 2) {
            activeTrackIds.pop();
        } else {
            let textTrack = this.getTracksFor('text')[index];
            if (activeTrackIds.length === 1 && index !== -1) {
                activeTrackIds.push(textTrack.trackId);
            } else {
                activeTrackIds[1] = textTrack.trackId;
            }
        }
        let tracksInfoRequest = new chrome.cast.media.EditTracksInfoRequest(activeTrackIds);
        let mediaSession = castSession.getMediaSession();
        mediaSession.editTracksInfo(tracksInfoRequest, function () {
            console.log('track changed');
        }, function () {
            console.error('error track changed');
        });
    },
    getCurrentTrackFor: function (type) {
        let mediaSession = castSession.getMediaSession();
        if (mediaSession && mediaSession.activeTrackIds && mediaSession.media && mediaSession.media.tracks) {
            return mediaSession.media.tracks.find(function (track) { return track.trackId === mediaSession.activeTrackIds[0] });
        }
    },
    setCurrentTrack: function (track) {
        let activeTrackIds = this.getActiveTrackIds();
        activeTrackIds[0] = track.trackId;
        let tracksInfoRequest = new chrome.cast.media.EditTracksInfoRequest(activeTrackIds);
        let mediaSession = castSession.getMediaSession();
        mediaSession.editTracksInfo(tracksInfoRequest, function () {
            console.log('track changed');
        }, function () {
            console.error('error track changed');
        });
    }
  }
};
