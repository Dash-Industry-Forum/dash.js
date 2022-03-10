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
const NAME = 'TEXT_SWITCH';

// Test constants

const SWITCH_WAIT = 3;
const SWITCH_TIMEOUT = 120;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.textTracks.length < 1) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);

            //Load needed elements into doc for Captions to function
            let ttml =  await command.findById('ttml-rendering-div');
            await command.execute(player.attachTTMLRenderingDiv, [ttml]);

            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        test('switch text track', async(test) =>{
            // Set test timeout
            test.timeout = SWITCH_TIMEOUT * 1000;

            // Select each track and check if new selected track is correct
            for(let i = 0; i < stream.textTracks.length; i++) {
                // Select text track
                utils.log(NAME, 'switch text track: ' + stream.textTracks[i].lang);
                await command.execute(player.setCurrentTrack, [stream.textTracks[i]]);

                //Wait
                await command.sleep(SWITCH_WAIT*1000);

                // Check if new current track is correct
                var newTrack = await command.execute(player.getCurrentTrackFor, ['text']);
                utils.log(NAME, 'current text track: ' + newTrack.lang);
                assert.deepEqual(newTrack.lang, stream.textTracks[i].lang);
                assert.deepEqual(newTrack.index, stream.textTracks[i].index);

                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            }
        });
    });
}
