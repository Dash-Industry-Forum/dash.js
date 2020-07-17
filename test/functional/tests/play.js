/**
PLAY:
- for each stream:
    - load test page
    - load stream
    - check playing state
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
    var NAME = 'PLAY';

    var command = null;

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var PROGRESS_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress

    var load = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            load: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Load stream');
                command = this.remote.get(require.toUrl(intern.config.testPage));
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
                    return assert.isTrue(playing);
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

    var getInfos = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            isDynamic: function() {
                if (!stream.available) this.skip();
                return command.execute(player.isDynamic)
                .then(function (dynamic) {
                    utils.log(NAME, 'dynamic: ' + dynamic);
                    stream.dynamic = dynamic;
                    return command.execute(player.getDVRWindowSize)
                })
                .then(function (dvrWindow) {
                    if (dvrWindow > 0) {
                        stream.dvrWindow = dvrWindow;
                    }
                });
            },

            getDuration: function() {
                if (!stream.available) {
                    this.skip();
                }
                return command.execute(player.getDuration)
                .then(function (duration) {
                    utils.log(NAME, 'duration: ' + duration);
                    stream.duration = duration;
                });
            },

            getPeriods: function() {
                if (!stream.available) {
                    this.skip();
                }
                return command.execute(player.getStreams)
                .then(function (streams) {
                    utils.log(NAME, 'Nb periods: ' + streams.length);
                    stream.periods = [];
                    for(let i=0; i < streams.length; i++ ){
                        stream.periods.push({start: streams[i].start});
                    }
                });
            }
        });
    };


    return {
        register: function (stream) {
            load(stream);
            play(stream);
            getInfos(stream);
        }
    }
});
