/**
ENDED:
- load test page
- load stream
- check playing status
- get stream duration (player.getDuration())
- seek before end of stream
- wait for 'ended' event
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
    var NAME = 'ENDED';

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var SEEK_SHIFT = 5; // Timeout (in sec.) for checking playback progress
    var SEEK_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress
    var ENDED_TIMEOUT = SEEK_SHIFT + 10; // Timeout (in sec.) for checking seek to be completed

    var load = function(stream) {
        registerSuite({
            name: NAME,

            load: function() {
                if (!stream.available) this.skip();
                if (stream.dynamic) this.skip();
                utils.log(NAME, 'Setup');
                command = this.remote.get(require.toUrl(intern.config.testPage));
                return command.execute(player.loadStream, [stream])
                .then(function() {
                    // Check if playing
                    utils.log(NAME, 'Check if playing');
                    return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT]);
                })
                .then(function(playing) {
                    assert.isTrue(playing);
                });
            }
        })
    };

    var seek = function(stream) {
        registerSuite({
            name: NAME,

            seek: function() {
                if (!stream.available) this.skip();
                if (stream.dynamic) this.skip();
                // Seek the player before end
                return command.executeAsync(player.seek, [(stream.duration - SEEK_SHIFT), SEEK_TIMEOUT])
                .then(function(seeked) {
                    assert.isTrue(seeked);
                });
            }
        });
    }

    var ended = function(stream) {
        registerSuite({
            name: NAME,

            ended: function() {
                if (!stream.available) this.skip();
                if (stream.dynamic) this.skip();
                // Wait for 'ended' event
                return command.executeAsync(player.waitForEvent, ['playbackEnded', ENDED_TIMEOUT])
                .then(function(ended) {
                    assert.isTrue(ended);
                });
            }
        });
    };

    return {
        register: function (stream) {
            load(stream);
            seek(stream);
            ended(stream);
        }
    }

});
