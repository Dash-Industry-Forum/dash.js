/**
SEEK:
- load test page
- load stream
- repeat N times:
    - seek at a random position (player.seek())
    - check if playback is seeked at new position
    - check if playback is progressing
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'SEEK';

// Test constants
const SEEK_COUNT = 3; // Number of seek tests

// Test variables
var seekPos;

exports.register = function(stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.dynamic) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        for (let i = 0; i < SEEK_COUNT; i++) {
            test('seek_' + i, async () => {
                // Get the stream duration (applies for static and dynamic streams)
                const duration = await command.execute(player.getDuration);
                utils.log(NAME, 'Duration: ' + stream.duration);

                // Generate randomly a seek position
                seekPos = utils.generateSeekPos(duration);
                utils.log(NAME, 'Seek: ' + seekPos);

                // Seek the player
                const seeked = await command.executeAsync(player.seek, [seekPos, constants.EVENT_TIMEOUT]);
                assert.isTrue(seeked);

                // Check if seeked at seeking time
                const time = await command.execute(player.getTime);
                utils.log(NAME, 'Playback time: ' + time);
                assert.isAtLeast(time, seekPos);
            });

            test('playing_' + i, async () => {
                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            });
        }
    });
}
