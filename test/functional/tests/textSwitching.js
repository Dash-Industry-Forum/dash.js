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
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const { beforeEach } = require('intern/lib/interfaces/tdd');
const { default: Test, SKIP } = require('intern/lib/Test');

// Suite name
const NAME = 'TEXTSWITCHING';

// test constants
const mediaTypes  = ['text','fragmentedText']; //Caption types do be tested "text" for VTT and "fragmentedText" for TTML
const SWITCH_DURATION = 3; // Number of seconds between text switches

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);

            //Load needed elements into doc for Captions to function
            let ttml =  await command.findById('ttml-rendering-div');
            await command.execute(player.attachTTMLRenderingDiv, [ttml]);
            await command.execute(player.setTextDefaultEnabled, [true]);
            
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);     
        });
        
        let Tracks = [] // all Tracks will be added during the test
        //Check for every media type (VTT, etc..)
        for(let i = 0; i < mediaTypes.length; i++){
            
            test('switchMediaTypes_' + mediaTypes[i], async(test) =>{
                utils.log(NAME, 'switchType');
                Tracks.push(await command.execute(player.getTracksFor,[mediaTypes[i]]));
                if(Tracks[i].length == 0) test.skip();

                //Set Track and check if correct
                for(let j = 0; j < Tracks[i].length; j++){  
                    utils.log(NAME, 'switchTrack');
                    await command.execute(player.setCurrentTrack, [Tracks[i][j]]).sleep(SWITCH_DURATION*1000);
                    var curr = await command.execute(player.getCurrentTrackFor, [mediaTypes[i]]);
                    assert.deepEqual(curr, Tracks[i][j]);        
                }         
            });
            test('playing_' + i, async (test) => {
                //Check if progressing
                if(Tracks[i].length == 0) test.skip();
                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            });
        } ;
    });
}