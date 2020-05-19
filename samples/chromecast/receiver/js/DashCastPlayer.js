class DashCastPlayer {
    constructor(dashService) {
      this._state = cast.receiver.media.PlayerState.BUFFERING;
      this._dashService = dashService;
    }

    editTracksInfo (data) {
      console.info('editTracksInfo');
    }

    getCurrentTimeSec () {
      if (this._dashService) {
        return this._dashService.getCurrentTime();
      } else {
        return 0;
      }
    }
    
    getDurationSec () {
      console.info('getDurationSec');
      if (this._dashService) {
        return this._dashService.getDuration();
      } else {
        return 0;
      }
    }

    getState () {
      return this._state;
    }

    load (contentId, autoplay, opt_time, opt_tracksInfo, opt_onlyLoadTracks) {
      console.info(contentId);
      this._dashService.startVideo(contentId);
      this._state = cast.receiver.media.PlayerState.PLAYING;
    }

    getVolume () {
      console.info('getVolume');
    }

    pause () {
      this._dashService.pause();
      this._state = cast.receiver.media.PlayerState.PAUSED;
    }

    play () {
      this._dashService.play();
      this._state = cast.receiver.media.PlayerState.PLAYING;
    }

    registerEndedCallback (callback) {

    }

    registerErrorCallback (callback) {

    }

    registerLoadCallback (callback) {

    }

    reset () {
      this._dashService.reset();
    }

    seek (time) {
      this._dashService.seek(time);
    }

    unregisterEndedCallback (callback) {

    }

    unregisterErrorCallback (callback) {

    }

    unregisterLoadCallback (callback) {

    }



}