/**
PLAY:
- for each stream:
    - load test page
    - load stream
    - switch Text Language
    - check Text Language
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
    var NAME = 'TEXTSWITCHING';

    var command = null;

    var mediaTypes = [
        "text",
        "fragmentedText"
    ]

    // Test constants
    var PLAYING_TIMEOUT = 10; // Timeout (in sec.) for checking playing status
    var PROGRESS_VALUE = 5; // Playback progress value (in sec.) to be checked
    var PROGRESS_TIMEOUT = 10; // Timeout (in sec.) for checking playback progress
    var SWITCH_DURATION = 3; // Time between track switches
    var SKIPPABLE = false; // if there is only one track skipp this test suite

    var load = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            load: function() {
                if (!stream.available) this.skip();
                utils.log(NAME, 'Load stream');
                command = this.remote.get(require.toUrl(intern.config.testPage));
                
                return command.execute(player.setTextDefaultEnabled, [true])
                .then(function (){
                    return command.findById("ttml-rendering-div")
                })
                .then(function(TTMLRenderingDiv){
                    return command.execute(player.attachTTMLRenderingDiv, [TTMLRenderingDiv])
                })
                .then(function(){
                    return command.execute(player.loadStream, [stream])
                })
                .then(function() {
                    // Check if playing
                    utils.log(NAME, 'Check if playing');
                    return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT]);
                });
            }
        })
    };

    var switchType = function(stream, types) {

        type = types.shift();

        return command.execute(player.getTracksFor,[type])
        .then(function(mediaInf) {     
            if(mediaInf.length != 0) return switchTrack(stream, mediaInf, type);
        })
        .then(function(){
            if(types.length > 0) return switchType(stream, types)
        });
    }

    var switchTrack = function (stream, mediaInf, type) {
            
        var curr = mediaInf.shift();

        return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT])
        .then(function(){
            //switch track
            return command.execute(player.setCurrentTrack, [curr]).sleep(SWITCH_DURATION*1000)
        })
        .then(function(){
            return command.execute(player.getCurrentTrackFor, [type])
        })
        .then(function(currTrack){
            // check if correct text track
            assert.equal(curr.lang, currTrack.lang)
        })
        .then(function(){
            if(mediaInf.length > 0) return switchTrack(stream, mediaInf, type);
            else return;
        });
    };

    var switchText = function(stream){
        registerSuite({
            name: utils.testName(NAME, stream),

            switchText: function(){
                if (!stream.available) this.skip();
                utils.log(NAME, 'SwitchText');
                var thisRef = this;

                return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT])
                .then(function(){
                    return switchType(stream, mediaTypes.slice()); 
                });
                
            }
        });
    };

    var play = function(stream) {
        registerSuite({
            name: utils.testName(NAME, stream),

            play: function() {
                if (!stream.available || SKIPPABLE) this.skip();
                utils.log(NAME, 'Play');
                return command.executeAsync(player.isPlaying, [PLAYING_TIMEOUT])
                .then(function (playing) {
                    stream.available = playing;
                    return assert.isTrue(playing);
                });
            },

            progress: function() {
                if (!stream.available || SKIPPABLE) this.skip();
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
            switchText(stream);
            play(stream);
        }
    }
});
