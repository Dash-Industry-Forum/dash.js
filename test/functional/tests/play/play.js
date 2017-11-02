/**
TEST_PLAY:

- for each stream:
    - load test page
    - load stream
    - check if <video> is playing
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
    var NAME = 'TEST_PLAY';

    // Test configuration (see config/testConfig.js)
    var testConfig = config.tests.play,
        streams = tests.getTestStreams(config.tests.play, function (stream) {
            if ((config.smoothEnabled === 'true' && stream.protocol === 'MSS') || (stream.protocol !== 'MSS')) {
                return true;
            }
            return false;
        });


    // Test constants
    var PROGRESS_DELAY = 5;
    var ASYNC_TIMEOUT = PROGRESS_DELAY + config.asyncTimeout;

    // Test variables
    var command = null;

    var test = function(stream) {

        registerSuite({
            name: NAME,

            setup: function() {
                tests.log(NAME, 'Setup');
                command = this.remote.get(require.toUrl(config.testPage));
                command = tests.setup(command);
                return command;
            },

            loadStream: function() {
                tests.logLoadStream(NAME, stream);
                return command.execute(player.loadStream, [stream]);
            },

            playing: function() {
                return tests.executeAsync(command, video.isPlaying, [PROGRESS_DELAY], ASYNC_TIMEOUT)
                    .then(function(playing) {
                        assert.isTrue(playing);
                    });
            }
        });
    };

    for (var i = 0; i < streams.length; i++) {
        test(streams[i]);
    }
});
