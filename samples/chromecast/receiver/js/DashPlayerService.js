angular.module('DashCastReceiverApp.services', [])
  .factory('dashPlayer', function() {

    let _state = null;
    let delegate;
    let videoElt;
    let captionElt;
    let player;
    let initialized = false;

    const noop = function () {};
    let _loadCallback = noop;
    let _errorCallback = noop;
    let _endedCallback = noop;

    let _convertTrack = function (dashTrack, type) {
      let track = new cast.receiver.media.Track(dashTrack.index, type);
      track.trackContentId = dashTrack.index;
      if (dashTrack.lang) {
        track.language = dashTrack.lang;
      }
      if (dashTrack.roles) {
        track.roles = [...dashTrack.roles];
      }
      if (dashTrack.mimeType) {
        track.trackContentType = dashTrack.mimeType;
      }
      // TODO convert that !!!
      track.name = track.language;
      return track;
    };

    return {

      initialize: function (cDelegate, video, caption) {
        delegate = cDelegate;
        videoElt = video;
        captionElt = caption;
      },

      loadMedia (url, protData) {
        initialized = false;
        _state = cast.receiver.media.PlayerState.BUFFERING;
        player = dashjs.MediaPlayer().create();
        player.initialize(videoElt, url, true);
        player.updateSettings({ 'streaming': { 'flushBufferAtTrackSwitch': true }});
        player.setProtectionData(protData);
        initialized = true;
        player.attachTTMLRenderingDiv(captionElt);
        videoElt.addEventListener("loadedmetadata", delegate.onLoadedMetadata.bind(delegate));
        videoElt.addEventListener("timeupdate", delegate.onVideoTime.bind(delegate));
        videoElt.addEventListener("durationchange", delegate.onVideoDuration.bind(delegate));
        videoElt.addEventListener("ended", this.onVideoEnded.bind(this));
        videoElt.addEventListener("player_error", this.onPlayerError.bind(this));
        delegate.startVideo(url);
        _state = cast.receiver.media.PlayerState.PLAYING;
      },

      getMetricsFor (type) {
        var dashMetrics = player.getDashMetrics(),
            dashAdapter = player.getDashAdapter(),
            repSwitch,
            activeStream,
            periodIdx,
            httpRequest,
            droppedFramesMetrics,
            bitrateIndexValue,
            bandwidthValue,
            pendingValue,
            numBitratesValue,
            bufferLengthValue = 0,
            lastFragmentDuration,
            lastFragmentDownloadTime,
            droppedFramesValue = 0;

        if (dashMetrics && initialized) {
            repSwitch = dashMetrics.getCurrentRepresentationSwitch(type, true);
            bufferLengthValue = dashMetrics.getCurrentBufferLevel(type, true);
            httpRequest = dashMetrics.getCurrentHttpRequest(type, true);
            droppedFramesMetrics = dashMetrics.getCurrentDroppedFrames();
            activeStream = player.getActiveStream();
            if (repSwitch !== null && activeStream) {
                periodIdx = activeStream.getStreamInfo().index;
                bitrateIndexValue = dashAdapter.getIndexForRepresentation(repSwitch.to, periodIdx);
                bandwidthValue = dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx);
                bandwidthValue = bandwidthValue / 1000;
                bandwidthValue = Math.round(bandwidthValue);
            }

            numBitratesValue = dashAdapter.getMaxIndexForBufferType(type, periodIdx);

            if (httpRequest !== null) {
                lastFragmentDuration = httpRequest._mediaduration;
                lastFragmentDownloadTime = httpRequest.tresponse.getTime() - httpRequest.trequest.getTime();

                // convert milliseconds to seconds
                lastFragmentDownloadTime = lastFragmentDownloadTime / 1000;
                lastFragmentDuration = lastFragmentDuration.toPrecision(4);
            }

            if (droppedFramesMetrics !== null) {
                droppedFramesValue = droppedFramesMetrics.droppedFrames;
            }

            if (isNaN(bandwidthValue) || bandwidthValue === undefined) {
                bandwidthValue = 0;
            }

            if (isNaN(bitrateIndexValue) || bitrateIndexValue === undefined) {
                bitrateIndexValue = 0;
            }

            if (isNaN(numBitratesValue) || numBitratesValue === undefined || numBitratesValue === -1) {
                numBitratesValue = 0;
            }

            if (isNaN(bufferLengthValue) || bufferLengthValue === undefined) {
                bufferLengthValue = 0;
            }

            pendingValue = player.getQualityFor(type);

            return {
                bandwidthValue: bandwidthValue + 1,
                bitrateIndexValue: bitrateIndexValue,
                pendingIndex: (pendingValue !== bitrateIndexValue) ? "(-> " + (pendingValue + 1) + ")" : "",
                numBitratesValue: numBitratesValue,
                bufferLengthValue: bufferLengthValue,
                droppedFramesValue: droppedFramesValue
            };
        }
        else {
            return null;
        }
      },

      getTracks () {
        let allTracks = [];
        if (player && initialized) {
          let audioTracks = player.getTracksFor('audio');
          let textTracks = player.getTracksFor('text');
          audioTracks.forEach(function (track) {
              allTracks.push(_convertTrack(track, cast.receiver.media.TrackType.AUDIO));
          });
          textTracks.forEach(function (track) {
              allTracks.push(_convertTrack(track, cast.receiver.media.TrackType.TEXT));
          });
        }
        return allTracks;
      },

      getActiveTrackIds () {
        let trackIds = [];
        if (player && initialized) {
          let currentAudioTrack = player.getCurrentTrackFor('audio');
          if (currentAudioTrack) {
            trackIds.push(currentAudioTrack.index);
          }
          let currentTextTrack = player.getCurrentTrackFor('text');
          if (currentTextTrack) {
            trackIds.push(currentTextTrack.index);
          }
        }
        return trackIds;
      },

      onVideoEnded () {
        delegate.onVideoEnded.bind(delegate);
        _state = cast.receiver.media.PlayerState.IDLE;
        _endedCallback();
      },

      onPlayerError (err) {
        player.stop();
        _state = cast.receiver.media.PlayerState.IDLE;
        _errorCallback(err);
      },

      // Generic Google Cast player interface. see https://developers.google.com/cast/docs/reference/receiver/cast.receiver.media.Player

      editTracksInfo (data) {
        let activeTrackIds = data.activeTrackIds;
        let audioTrack;
        let textTrack;

        if (player && initialized && activeTrackIds) {
          let textEnable = false;
          for (let i = 0; i < 2; i++) {
            if (activeTrackIds[i] !== undefined) {
              let audioTracks = player.getTracksFor('audio');
              audioTrack = audioTracks.find(function (track) { return track.index === activeTrackIds[i]; });
              if (audioTrack) {
                player.setCurrentTrack(audioTrack);
              } else {
                let textTracks = player.getTracksFor('text');
                textTrack = textTracks.find(function (track) { return track.index === activeTrackIds[i]; });
                if (textTrack) {
                  player.enableText(true);
                  textEnable = true;
                  player.setCurrentTrack(textTrack);
                }
              }
            }
          }
          if (!textEnable) {
            player.enableText(false);
          }
        }
      },

      getCurrentTimeSec () {
        if (delegate) {
          return delegate.getCurrentTime();
        } else {
          return 0;
        }
      },

      getDurationSec () {
        if (player) {
          return player.duration();
        } else {
          return 0;
        }
      },

      getState () {
        return _state;
      },

      load (contentId, autoplay, opt_time, opt_tracksInfo, opt_onlyLoadTracks) {
        initialized = false;
        player = dashjs.MediaPlayer().create();
        player.initialize(videoElt, contentId, autoplay);
        initialized = true;
        player.attachTTMLRenderingDiv(captionElt);
        videoElt.addEventListener("loadedmetadata", delegate.onLoadedMetadata.bind(delegate));
        videoElt.addEventListener("timeupdate", delegate.onVideoTime.bind(delegate));
        videoElt.addEventListener("durationchange", delegate.onVideoDuration.bind(delegate));
        videoElt.addEventListener("ended", this.onVideoEnded.bind(this));
        videoElt.addEventListener("player_error", this.onPlayerError.bind(this));
        delegate.startVideo(contentId);
        _state = cast.receiver.media.PlayerState.PLAYING;
        _loadCallback();
      },

      getVolume () {
        let volume = new cast.receiver.media.Volume();
        volume.level = videoElt.volume;
        volume.muted = videoElt.muted;
        return volume;
      },

      pause () {
        videoElt.pause();
        _state = cast.receiver.media.PlayerState.PAUSED;
      },

      play () {
        videoElt.play();
        _state = cast.receiver.media.PlayerState.PLAYING;
      },

      registerEndedCallback (callback) {
        _endedCallback = callback;
      },

      registerErrorCallback (callback) {
        _errorCallback = callback;
      },

      registerLoadCallback (callback) {
        _loadCallback = callback;
      },

      reset () {
        player.reset();
        initialized = false;
      },

      seek (time) {
        player.seek(time);
      },

      setVolume (volume) {
        videoElt.volume = volume.level;
        videoElt.muted = volume.muted;
      },

      unregisterEndedCallback (callback) {
        _endedCallback = noop;
      },

      unregisterErrorCallback (callback) {
        _errorCallback = noop;
      },

      unregisterLoadCallback (callback) {
        _loadCallback = noop;
      }
    }
});
