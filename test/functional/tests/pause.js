/**
PAUSE:
- load test page
- load stream
- repeat N times:
    - pause the player (player.pause())
    - check if playback is paused
    - check if playback is not progressing
    - resume the playback (player.play())
    - check if playback is progressing
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'PAUSE';

// Test constants
const PAUSE_DELAY = 5; // Delay (in s) for checking is player is still paused (= not progressing)
const PAUSE_COUNT = 3; // Number of pause tests

exports.register = function(stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.duration < 60) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        for (let i = 0; i < PAUSE_COUNT; i++) {
            test('pause_' + i, async () => {
                // Do play in case previous pause test has failed
                command.execute(player.play);

                const sleepTime = Math.round(Math.random() * 10);
                utils.log(NAME, 'Wait ' + sleepTime + ' sec. and pause playback');
                await command.sleep(sleepTime * 1000);

                utils.log(NAME, 'Pause playback');
                await command.execute(player.pause);
                const paused = await command.execute(player.isPaused);
                assert.isTrue(paused);
            });

            test('not progressing_' + i, async () => {
                // Check if the playback is really paused (not playing/progressing)
                utils.log(NAME, 'Check if not progressing');

                let pauseTime = await command.execute(player.getTime);
                utils.log(NAME, 'Playback time = ' + pauseTime);

                utils.log(NAME, 'Wait ' + PAUSE_DELAY + 's...');
                await command.sleep(PAUSE_DELAY * 1000);

                const time = await command.execute(player.getTime);
                const isDynamic = await command.execute(player.isDynamic);
                utils.log(NAME, 'Playback time = ' + time);
                if (isDynamic) {
                    // For dynamic streams, when paused, current time is progressing backward
                    assert.isAtMost(time, (pauseTime - PAUSE_DELAY + 1)); // +1 for 1 sec tolerance
                } else {
                    assert.strictEqual(time, pauseTime);
                }
            });

            test('resume_' + i, async () => {
                // Resume the player
                utils.log(NAME, 'Resume playback');
                await command.execute(player.play);

                // Check if playing
                utils.log(NAME, 'Check if playing');
                const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
                assert.isTrue(progressing);
            });
        }
    });
};
