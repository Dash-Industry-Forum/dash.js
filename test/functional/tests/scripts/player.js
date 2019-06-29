define([], function () {

    return {

        loadStream: function (stream) {
            loadStream(stream);
        },

        getDuration: function () {
            return player.duration();
        },

        getTime: function() {
            return player.time();
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

            // if (!player.isPaused() && player.getPlaybackRate() > 0) {
            if (isPlaying()) {
                    console.log('already playing');
                done(true);
            } else {
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

            _timeout = setTimeout(_onTimeout, timeout * 1000);
            player.on('playbackTimeUpdated', _onTimeUpdate);    
        },

        seek: function(time, timeout, done) {
            var _timeout = null,
                _onComplete = function (res) {
                    clearTimeout(_timeout);
                    player.off('playbackSeeked', _onSeeked);
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
        }
    };
});
