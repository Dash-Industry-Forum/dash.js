define(function() {

    return {

        play: function() {
            document.querySelector('video').play();
        },

        pause: function() {
            document.querySelector('video').pause();
        },

        stop: function() {
            document.querySelector('video').stop();
        },

        getCurrentTime: function() {
            return document.querySelector('video').currentTime;
        },

        getDuration: function() {
            return document.querySelector('video').duration;
        },

        isPaused: function() {
            return document.querySelector('video').paused;
        },

        isPlaying: function(timeout, done) {
            var _video = document.querySelector('video');
                _timeout = null,
                _onComplete = function (res) {
                    clearTimeout(_timeout);
                    _video.removeEventListener('playing', _onPlaying);
                    done(res);
                },
                _onTimeout = function() {
                    _onComplete(false);
                };
                _onPlaying = function() {
                    _onComplete(true);
                };

            if (!_video.paused && _video.playbackRate > 0) {
                done(true);
            } else {
                _timeout = setTimeout(_onTimeout, timeout * 1000);
                _video.addEventListener('playing', _onPlaying);    
            }
        },

        isProgressing: function(progress, timeout, done) {
            var _video = document.querySelector('video'),
                _startTime = -1,
                _timeout = null,
                _onComplete = function (res) {
                    clearTimeout(_timeout);
                    _video.removeEventListener('timeupdate', _onTimeUpdate);
                    done(res);
                },
                _onTimeout = function() {
                    _onComplete(false);
                };
                _onTimeUpdate = function() {
                    if (_startTime < 0) {
                        _startTime = _video.currentTime;
                    } else {
                        if (_video.currentTime >= _startTime + progress) {
                            _onComplete(true);
                        }
                    }
                };

            _timeout = setTimeout(_onTimeout, timeout * 1000);
            _video.addEventListener('timeupdate', _onTimeUpdate);    
        },

        seek: function(time, timeout, done) {
            var _video = document.querySelector('video'),
                _timeout = null,
                _onComplete = function (res) {
                    clearTimeout(_timeout);
                    _video.removeEventListener('seeked', _onSeeked);
                    done(res);
                },
                _onTimeout = function() {
                    _onComplete(false);
                },
                _onSeeked = function() {
                    _onComplete(true);
                };

            _timeout = setTimeout(_onTimeout, timeout * 1000);
            _video.addEventListener('seeked', _onSeeked);
            _video.currentTime = time;
        },

        waitForEvent: function(event, done) {
            var video = document.querySelector('video'),
                onEventHandler = function() {
                    video.removeEventListener(event, onEventHandler);
                    done(true);
                };

            video.addEventListener(event, onEventHandler);
        },

        hastextTracks: function() {
            return (document.querySelector('video').textTracks.length > 0);
        },

        hasCues: function() {
            var textTracks = document.querySelector('video').textTracks;
            if (textTracks.length === 0) {
                return false;
            }
            return (textTracks[0].cues.length > 0);
        },

        waitForCues: function(done) {
            var video = document.querySelector('video'),
                textTrack = video.textTracks.length > 0 ? video.textTracks[0] : null,
                interval = null,
                hasCues = function() {
                    if (textTrack.cues.length > 0) {
                        done(true);
                    }
                };

            if (textTrack === null) {
                done(false);
            }

            interval = setInterval(hasCues, 1000);
        },


    };
});
