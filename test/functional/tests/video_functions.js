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

        seek: function(time, done) {
            var video = document.querySelector('video'),
                onSeeked = function() {
                    video.removeEventListener('seeked', onSeeked);
                    done(true);
                };

            video.addEventListener('seeked', onSeeked);
            video.currentTime = time;
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

        waitForEvent: function(event, done) {
            var video = document.querySelector('video'),
                onEventHandler = function() {
                    video.removeEventListener(event, onEventHandler);
                    done(true);
                };

            video.addEventListener(event, onEventHandler);
        },

        isPlaying: function(delay, done) {
            var video = document.querySelector('video'),
                startTime = -1,
                onPlaying = function() {
                    video.removeEventListener('playing', onPlaying);
                    isProgressing(delay, done);
                },
                onTimeUpdate = function() {
                    if (startTime < 0) {
                        startTime = video.currentTime;
                    } else {
                        if (video.currentTime >= startTime + delay) {
                            video.removeEventListener('timeupdate', onTimeUpdate);
                            done(true);
                        }
                    }
                },
                isProgressing = function(delay, done) {
                    if (delay <= 0) {
                        done(true);
                    } else {
                        video.addEventListener('timeupdate', onTimeUpdate);
                    }
                };

            if (!video.paused) {
                isProgressing(delay, done);
            } else {
                video.addEventListener('playing', onPlaying);
            }
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
