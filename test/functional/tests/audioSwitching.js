/**
PLAY:
- for each stream:
    - load test page
    - load stream
    - switch Audio Language
    - check Audio Language
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
    var NAME = 'AUDIOSWITCHING';

    var command = null;

    var mediaType = "audio";

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var PROGRESS_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress

    var load = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            load: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Load Stream');
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

    var recurse = function (mediaInf) {
         registerSuite({   

            recurse: function(){
                var curr = mediaInf.shift();
                return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT])
                .then(function(){
                    return command.sleep(2*1000).execute(player.setCurrentTrack, [curr])
                })
                .then(function(){
                    return command.execute(player.getCurrentTrackFor, [mediaType])
                })
                .then(function(currTrack){
                    assert.equal(curr.lang, currTrack.lang)
                })
                .then(function () {
                    if(mediaInf.length == 0) return;
                    else return recurse(mediaInf);
                });
            }
        })
    };

    var switchAudio = function(stream){
        registerSuite({
            name: utils.testName(NAME, stream),

            switchAudio: function(){
                if (!stream.available) this.skip();
                utils.log(NAME, 'SwitchAudio');
        
                return command.execute(player.getTracksFor,[mediaType])
                .then(function(mediaInf) {      
                    recurse(mediaInf);
                });
            }
        });
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

    return {
        register: function (stream) {
            load(stream);
            switchAudio(stream);
            play(stream);
        }
    }
});
