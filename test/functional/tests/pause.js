/**
PAUSE:
- load test page
- load stream
- check playing status
- wait for N seconds
- repeat N times:
    - pause the player (player.pause())
    - check if playback is paused
    - check if playback is not progressing
    - resume the playback (player.play())
    - check if playback is progressing
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
    var NAME = 'PAUSE';

    var command = null;

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var PROGRESS_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress
    var PAUSE_DELAY = 5; // Delay (in s) for checking is player is still paused (= not progressing)
    var PAUSE_COUNT = 3; // Number of pause tests

    var load = function(stream) {
        registerSuite({
            name: NAME,

            load: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Load stream');
                command = this.remote.get(require.toUrl(intern.config.testPage));
                return command.execute(player.loadStream, [stream])
                .then(function() {
                    // Check if playing
                    utils.log(NAME, 'Check if playing');
                    return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT]);
                });
            }
        })
    };

    var pause = function(stream) {

        registerSuite({
            name: NAME,

            pause: function() {
                if (!stream.available) this.skip();
                var pauseTime = 0;
                // Execute a play in case previous pause test has failed
                utils.log(NAME, 'Play');
                return command.execute(player.play)
                .then(function () {
                    var sleepTime = PAUSE_DELAY + Math.round(Math.random() * 10);
                    utils.log(NAME, 'Wait ' + sleepTime + ' sec. and pause playback');
                    // Wait and pause the player
                    return command.sleep(sleepTime * 1000).execute(player.pause)                        
                })
                .then(function() {
                    // Pause the player
                    utils.log(NAME, 'Check if paused');
                    return command.execute(player.isPaused);
                })
                .then(function(paused) {
                    assert.isTrue(paused);
                    // Get current time
                    return command.execute(player.getTime);
                })
                .then(function(time) {
                    pauseTime = time;
                    utils.log(NAME, 'Check if not progressing');
                    utils.log(NAME, 'Playback time = ' + time);
                    utils.log(NAME, 'Wait ' + PAUSE_DELAY + 's...');
                    return command.sleep(PAUSE_DELAY * 1000).execute(player.getTime);
                })
                .then(function(time) {
                    // Check if the playback is really paused (not playing/progressing)
                    utils.log(NAME, 'Playback time = ' + time);
                    if (stream.dynamic) {
                        // For dynamic streams, when paused, current time is progressing backward
                        assert.isAtMost(time, (pauseTime - PAUSE_DELAY + 1)); // +1 for 1 sec tolerance
                    } else {
                        assert.strictEqual(time, pauseTime);
                    }
                    // Resume the player
                    utils.log(NAME, 'Resume playback');
                    return command.execute(player.play);
                })
                .then(function() {
                    // Check if playing
                    utils.log(NAME, 'Check if playing');
                    return command.executeAsync(player.isProgressing, [PROGRESS_VALUE, PROGRESS_TIMEOUT])
                })
                .then(function (progressing) {
                    return assert.isTrue(progressing);
                });
            }
        });
    };

    return {
        register: function (stream) {
            load(stream);
            for (var i = 0; i < PAUSE_COUNT; i++) {
                pause(stream);
            }
        }
    }
});
