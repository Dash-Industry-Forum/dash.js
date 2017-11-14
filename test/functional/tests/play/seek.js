/**
TEST_SEEK:

- load test page
- for each stream:
    - load stream
    - get stream duration (player.getDuration())
    - repeat N times:
        - seek at a random position (player.seek())
        - check if <video> is playing at new position
        - check if <video> is progressing
**/
define([
    'intern!object',
    'intern/chai!assert',
    'require',
    'test/functional/config/testsConfig',
    'test/functional/tests/player_functions',
    'test/functional/tests/video_functions',
    'test/functional/tests/tests_functions'
], function(registerSuite, assert, require, config, player, video, tests) {

    // Suite name
    var NAME = 'TEST_SEEK';

    // Test configuration (see config/testConfig.js)
    var testConfig = config.tests.seek,
        streams = tests.getTestStreams(config.tests.seek, function(stream) {
            if (stream.type === 'VOD') {
                if ((config.smoothEnabled === 'true' && stream.protocol === 'MSS') || (stream.protocol !== 'MSS')) {
                    return true;
                }
            }
            return false;
        });

    // Test constants
    var PROGRESS_DELAY = 10; // Delay for checking progressing (in s)
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null,
        streamDuration = 0,
        seekPos,
        i, j;

    var generateSeekPos = function() {
        var pos = Math.round(Math.random() * streamDuration * 100) / 100;
        if (pos > (streamDuration - PROGRESS_DELAY)) {
            pos -= PROGRESS_DELAY;
        }
        if (pos < PROGRESS_DELAY) {
            pos += PROGRESS_DELAY;
        }
        return pos;
    };

    var testSetup = function(stream) {
        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            },

            play: function() {
                // Load the stream
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream])
                .then(function() {
                    tests.log(NAME, 'Check if playing after ' + PROGRESS_DELAY + 's.');
                    return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT);
                })
                // Check if it's playing
                .then(function(playing) {
                    assert.isTrue(playing);
                    return command.execute(player.getDuration);
                })
                // Get the stream duration
                .then(function(duration) {
                    streamDuration = duration;
                    tests.log(NAME, 'Duration: ' + duration);
                });
            }
        });
    };

    var testSeek = function(checkPlaying) {
        registerSuite({
            name: NAME,

            seek: function() {
                // Generate randomly a seek position
                seekPos = generateSeekPos();
                tests.log(NAME, 'Seek: ' + seekPos);
                // Seek the player
                return  tests.executeAsync(command, player.seek, [seekPos], config.asyncTimeout)
                .then(function() {
                    if (checkPlaying) {
                        // Check if playing
                        command.execute(video.getCurrentTime)
                        .then(function(time) {
                            tests.log(NAME, 'Check current time ' + time);
                            assert.isTrue(time >= seekPos);
                        });
                    }
                });
            },

            playing: function() {
                if (checkPlaying) {
                    return tests.executeAsync(command, video.isPlaying, [0], ASYNC_TIMEOUT)
                    .then(function(playing) {
                        assert.isTrue(playing);
                        return  command.execute(video.getCurrentTime);
                    })
                    .then(function(time) {
                        tests.log(NAME, 'Check current time ' + time);
                        assert.isTrue(time >= seekPos);
                    });
                }
            }
        });
    };

    var testPlaying = function(progressDelay) {
        registerSuite({
            name: NAME,

            playing: function() {
                return tests.executeAsync(command, video.isPlaying, [progressDelay], (progressDelay * 2 /*+ config.asyncTimeout*/))
                .then(function(playing) {
                    assert.isTrue(playing);
                });
            }
        });
    };


    for (i = 0; i < streams.length; i++) {

        // Setup: load test page and stream
        testSetup(streams[i]);

        // Perform seeks and wait for playing
        for (j = 0; j < testConfig.seekCount; j++) {
            testSeek(true);
            // testPlaying(PROGRESS_DELAY);
        }

        // Performs (fast) seeks, do not wait for playing before each seek, check if playing after last seek
        for (j = 0; j < testConfig.seekCount; j++) {
            testSeek(j < (testConfig.seekCount - 1) ? false : true);
        }
        // testPlaying(PROGRESS_DELAY);
    }

});
