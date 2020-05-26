angular.module('DashCastReceiverApp.services', [])
  .factory('dashPlayer', function() {

    let _state = null;
    let delegate;
    let videoElt;
    let player;

    const noop = () => {};
    let _loadCallback = noop;
    let _errorCallback = noop;
    let _endedCallback = noop;

    return {

      initialize: function (cDelegate, video) {
        delegate = cDelegate;
        videoElt = video;
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

        if (dashMetrics) {
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
            }
        }
        else {
            return null;
        }
      },

      onVideoEnded () {
        delegate.onVideoEnded.bind(delegate);
        _endedCallback();
      },

      onPlayerError (err) {
        player.stop();
        _errorCallback(err);
      },

      // Generic Google Cast player interface. see https://developers.google.com/cast/docs/reference/receiver/cast.receiver.media.Player

      editTracksInfo (data) {
        console.info('editTracksInfo');
      },

      getCurrentTimeSec () {
        if (delegate) {
          return delegate.getCurrentTime();
        } else {
          return 0;
        }
      },
      
      getDurationSec () {
        console.info('getDurationSec');
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
        player = dashjs.MediaPlayer().create();
        player.initialize(videoElt, contentId, true);
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
      },

      seek (time) {
        player.seek(time);
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