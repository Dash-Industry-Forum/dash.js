module.exports = {

    loadStream: function (stream) {
        loadStream(stream);
    },

    getDuration: function () {
        return player.duration();
    },

    getTime: function() {
        return player.time();
    },

    getTimeAsUTC: function() {
        return player.timeAsUTC();
    },

    isDynamic: function () {
        return player.isDynamic();
    },

    isPaused: function() {
        return player.isPaused();
    },

    play: function () {
        player.play();
    },

    pause: function () {
        player.pause();
    },

    stop: function () {
        player.stop();
    },

    getStreams: function () {
        return player.getStreamsFromManifest();
    },

    getDVRWindowSize: function () {
        return player.getDVRWindowSize();
    },

    isPlaying: function(timeout, done) {
        var _timeout = null,
            _onComplete = function (res) {
                clearTimeout(_timeout);
                player.off('playbackPlaying', _onPlaying);
                done(res);
            },
            _onTimeout = function() {
                _onComplete(false);
            },
            _onPlaying = function() {
                _onComplete(true);
            };

        console.log('is playing?');
        // if (!player.isPaused() && player.getPlaybackRate() > 0) {
        if (isPlaying()) {
            console.log('already playing');
            done(true);
        } else {
            console.log('timeout = ', timeout);
            _timeout = setTimeout(_onTimeout, timeout * 1000);
            player.on('playbackPlaying', _onPlaying);
        }
    },

    isProgressing: function(progress, timeout, done) {
        var _startTime = -1,
            _timeout = null,
            _onComplete = function (res) {
                clearTimeout(_timeout);
                player.off('playbackTimeUpdated', _onTimeUpdate);
                done(res);
            },
            _onTimeout = function() {
                _onComplete(false);
            },
            _onTimeUpdate = function(e) {
                if (_startTime < 0) {
                    _startTime = e.time;
                } else {
                    if (e.time >= _startTime + progress) {
                        _onComplete(true);
                    }
                }
            };

        console.log('is progressing?');
        console.log('timeout = ', timeout);
        _timeout = setTimeout(_onTimeout, timeout * 1000);
        player.on('playbackTimeUpdated', _onTimeUpdate);
    },

    seek: function(time, timeout, done) {
        var _timeout = null,
            _onComplete = function (res) {
                clearTimeout(_timeout);
                player.off('playbackSeeked', _onSeeked);
                console.log('seeked: ', res);
                done(res);
            },
            _onTimeout = function() {
                _onComplete(false);
            },
            _onSeeked = function() {
                _onComplete(true);
            };

        _timeout = setTimeout(_onTimeout, timeout * 1000);
        player.on('playbackSeeked', _onSeeked);
        player.seek(time);
    },

    waitForEvent: function(event, timeout, done) {
        var _timeout = null,
            _onComplete = function (res) {
                clearTimeout(_timeout);
                player.off(event, _onEvent);
                done(res);
            },
            _onTimeout = function() {
                _onComplete(false);
            },
            _onEvent = function() {
                _onComplete(true);
            };

        _timeout = setTimeout(_onTimeout, timeout * 1000);
        player.on(event, _onEvent);
    },

    getTracksFor: function(mediaType){
        return player.getTracksFor(mediaType);
    },

    setCurrentTrack: function(track){
        player.setCurrentTrack(track);
    },

    getCurrentTrackFor: function(type){
        return player.getCurrentTrackFor(type);
    },
    setAutoPlay: function(value){
        player.setAutoPlay(value);
    },

    setInitialMediaSettingsFor: function(type, value){
        player.setInitialMediaSettingsFor(type, value);
    },

    attachTTMLRenderingDiv: function(ttmlDiv){
        player.attachTTMLRenderingDiv(ttmlDiv);
    }


};
