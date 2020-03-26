/**
PLAY:
- for each stream:
    - load test page
    - load stream from specific time
    - for VOD stream, check to seek at a specific time that can be in a different period
    - check playing state, and time
    - check if playback progressing
**/
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'require',
    'test/functional/tests/scripts/player',
    'test/functional/tests/scripts/utils'
], function(intern, registerSuite, assert, require, player, utils) {

    // Suite name
    var NAME = 'PLAYFROMTIME';

    var command = null;

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var PROGRESS_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress
    var SEEK_TIMEOUT = 10; // Timeout (in sec.) for checking seek to be completed
    var OFFSET_TO_START = 15; // time offset (in sec.) from the beginning of the period

    var loadAtRValue = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            load: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Load stream');
                command = this.remote.get(require.toUrl(intern.config.testPage));
                if (!stream.dynamic) {
                    let timeToStart = stream.periods[stream.periods.length - 1].start + OFFSET_TO_START;
                    stream.url += '#t=' + timeToStart;
                } else {
                    if (stream.dvrWindow > 0) {
                        let relativePosition = stream.dvrWindow / 2;
                        stream.url += '#r=' + relativePosition;
                    }
                }
                // load the player in the last period
                return command.execute(player.loadStream, [stream]);
            }
        })
    };

    var play = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            play: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Play');
                return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT])
                .then(function (playing) {
                    stream.available = playing;
                    assert.isTrue(playing);
                    return command.execute(player.getTime);
                })
                .then(function(time) {
                    utils.log(NAME, 'Playback time: ' + time);
                    assert.isAtLeast(time, stream.periods[stream.periods.length - 1].start + OFFSET_TO_START);
                });
            },

            seek: function () {
                if (!stream.available || stream.dynamic) this.skip();
                // Seek the player in the first period
                return command.executeAsync(player.seek, [stream.periods[0].start + OFFSET_TO_START, SEEK_TIMEOUT])
                .then(function(seeked) {
                    assert.isTrue(seeked);
                    // Check if correctly seeked
                    return command.execute(player.getTime);
                })
                .then(function(time) {
                    utils.log(NAME, 'Playback time: ' + time);
                    if(stream.periods.length > 1) {
                        assert.isBelow(time, stream.periods[stream.periods.length - 1].start);
                    }
                    return assert.isAtLeast(time, stream.periods[0].start + OFFSET_TO_START);
                });
            },

            progress: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Progress');
                return command.executeAsync(player.isProgressing, [PROGRESS_VALUE, PROGRESS_TIMEOUT])
                .then(function (progressing) {
                    stream.available = progressing;
                    return assert.isTrue(progressing);
                });
            }
        });
    };

    return {
        register: function (stream) {
            loadAtRValue(stream);
            play(stream);
        }
    }
});
