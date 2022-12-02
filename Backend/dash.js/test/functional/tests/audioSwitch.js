/**
AUDIO_SWITCH:
- load test page
- load stream
- for each audio track:
    - switch audio track
    - check new current audio track
    - check if playback progressing
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'AUDIO_SWITCH';

// Test constants
const SWITCH_WAIT = 3;
const SWITCH_TIMEOUT = 120;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.audioTracks.length <= 1) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        test('switch audio track', async (test) => {
            test.timeout = SWITCH_TIMEOUT * 1000;
            // Wait
            await command.sleep(SWITCH_WAIT * 1000);
            // Select each other track and check if new selected track is correct
            for (let i = 1; i < stream.audioTracks.length; i++) {
                // Select audio track
                utils.log(NAME, 'switch audio track: ' + stream.audioTracks[i].lang);
                await command.execute(player.setCurrentTrack, [stream.audioTracks[i]]);

                // Wait
                await command.sleep(SWITCH_WAIT * 1000);

                // Check if new current track is correct
                const newTrack = await command.execute(player.getCurrentTrackFor, ['audio']);
                utils.log(NAME, 'current audio track: ' + newTrack.lang);
                assert.deepEqual(newTrack.lang, stream.audioTracks[i].lang);
                assert.deepEqual(newTrack.index, stream.audioTracks[i].index);
                assert.deepEqual(newTrack.bitrateList.bandwidth, stream.audioTracks[i].bitrateList.bandwidth);
                assert.deepEqual(newTrack.bitrateList.id, stream.audioTracks[i].bitrateList.id);

                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            }
        });
    });
}
