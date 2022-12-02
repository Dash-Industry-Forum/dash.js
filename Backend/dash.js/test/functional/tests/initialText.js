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
const { suite, before, test} = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'INITIAL_TEXT';

// test constants
const SWITCH_WAIT = 3;
const SWITCH_TIMEOUT = 120;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(() => {
            if (!stream.available || stream.textTracks.length < 1) suite.skip();
            utils.log(NAME, 'Load stream');
        });

        test('switch text track', async (test) => {
            // Set test timeout
            test.timeout = SWITCH_TIMEOUT * 1000;

            for (let i = 0; i < stream.textTracks.length ; i++) {
                // reload page
                command = test.remote.get(intern.config.testPage);
                await command.execute(player.setAutoPlay, [false]);

                //Load needed elements into doc for Captions to function
                let ttml =  await command.findById('ttml-rendering-div');
                await command.execute(player.attachTTMLRenderingDiv, [ttml]);

                // set initial track
                utils.log(NAME, 'set initial text track: ' + stream.textTracks[i].lang);
                await command.execute(player.setInitialMediaSettingsFor, ['text', {
                    lang: stream.textTracks[i].lang,
                    index: stream.textTracks[i].index
                }]);
                await command.execute(player.loadStream, [stream]);
                await command.execute(player.play, []);

                // Wait
                await command.sleep(SWITCH_WAIT * 1000);

                // Check if initial track is correct
                const newTrack = await command.execute(player.getCurrentTrackFor, ['text']);
                utils.log(NAME, 'current text track: ' + newTrack.lang);
                assert.deepEqual(newTrack.lang, stream.textTracks[i].lang);
                assert.deepEqual(newTrack.index, stream.textTracks[i].index);

                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            }
        });
    });
};
