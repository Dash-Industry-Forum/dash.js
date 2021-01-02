/**
INITIAL_Text:
- for each text track:
    - load test page
    - load elements
    - set initial text track
    - load stream
    - play stream
    - check new current text track
    - check if playback progressing
**/
const intern = require('intern').default;
const { suite, before, test, after} = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'INITIAL_TEXT';

// test constants
const SWITCH_WAIT = 3;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async () => {
            if (!stream.available || stream.textTracks["text"].length < 1 && stream.textTracks["fragmentedText"].length < 1) suite.skip();
            utils.log(NAME, 'Load stream');

        });

        test('switch text track', async ({ remote }) => {
            for(let textType in stream.textTracks){
                for (let i = 0; i < stream.textTracks[textType].length ; i++) {
                    // reload page
                    command = remote.get(intern.config.testPage);
                    await command.execute(player.setAutoPlay, [false]);

                    //Load needed elements into doc for Captions to function
                    let ttml =  await command.findById('ttml-rendering-div');
                    await command.execute(player.attachTTMLRenderingDiv, [ttml]);
                    await command.execute(player.setTextDefaultEnabled, [true]);
                    
                    // set initial track
                    utils.log(NAME, 'set initial text track: ' + stream.textTracks[textType][i].lang);
                    await command.execute(player.setInitialMediaSettingsFor, [textType, {
                        lang: stream.textTracks[textType][i].lang 
                    }]);
                    await command.execute(player.loadStream, [stream]);
                    await command.execute(player.play, []);

                    // Wait
                    await command.sleep(SWITCH_WAIT * 1000);

                    // Check if initial track is correct
                    const newTrack = await command.execute(player.getCurrentTrackFor, [textType]);
                    utils.log(NAME, 'current audio track: ' + newTrack.lang);
                    assert.deepEqual(newTrack.lang, stream.textTracks[textType][i].lang);
                }    
            }
        });
    });
} 