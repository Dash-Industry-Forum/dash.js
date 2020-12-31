/**
TEXT_SWITCH:
- for each stream:
    - load test page
    - load stream
    - for each text track
        - switch text track
        - check new current text track
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
const NAME = 'TEXTSWITCH';

// test constants

const SWITCH_WAIT = 3; 

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.textTracks['text'].length < 1 && stream.textTracks['fragmentedText'].length < 1) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);

            //Load needed elements into doc for Captions to function
            let ttml =  await command.findById('ttml-rendering-div');
            await command.execute(player.attachTTMLRenderingDiv, [ttml]);
            await command.execute(player.setTextDefaultEnabled, [true]);
            
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);     
        });
        
        //Check for every media type (VTT, etc..)
        
        test('switch text track', async() =>{

            for(let textType in stream.textTracks){
                for(let i = 0; i < stream.textTracks[textType].length; i++){
                    utils.log(NAME, 'switch '+ textType+' track: ' + stream.textTracks[textType][i].lang);
                    await command.execute(player.setCurrentTrack,[stream.textTracks[textType][i]]);
                    
                    //Wait
                    await command.sleep(SWITCH_WAIT*1000);
                    
                    // Check if new current track is correct
                    var newTrack = await command.execute(player.getCurrentTrackFor, [textType]);
                    utils.log(NAME, 'current text track: ' + newTrack.lang);
                    assert.deepEqual(newTrack, stream.textTracks[textType][i]);  
                    
                    utils.log(NAME, 'Check if playing');
                    const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                    assert.isTrue(progressing);
                }         
            }
        });
    });
}