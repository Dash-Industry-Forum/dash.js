/**
INITIAL_AUDIO:

- for each audio track:
    - load test page
    - set initial audio track
    - load stream
    - play stream
    - check new current audio track
    - check if playback progressing
**/
const intern = require('intern').default;
const { suite, before, test} = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'INITIAL_AUDIO';

// test constants
const SWITCH_WAIT = 3;
const SWITCH_TIMEOUT = 120;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(() => {
            if (!stream.available || stream.audioTracks.length <= 1) suite.skip();
            utils.log(NAME, 'Load stream');

        });

        test('switch audio track', async (test) => {
            test.timeout = SWITCH_TIMEOUT * 1000;

            for (let i = 0; i < stream.audioTracks.length ; i++) {
                // reload page
                command = test.remote.get(intern.config.testPage);
                await command.execute(player.setAutoPlay, [false]);

                // set initial track
                utils.log(NAME, 'set initial audio track: ' + stream.audioTracks[i].lang);
                await command.execute(player.setInitialMediaSettingsFor, ['audio', {
                    lang: stream.audioTracks[i].lang ,
                    index: stream.audioTracks[i].index
                }]);
                await command.execute(player.loadStream, [stream]);
                await command.execute(player.play, []);

                // Wait
                await command.sleep(SWITCH_WAIT * 1000);

                // Check if initial track is correct
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
