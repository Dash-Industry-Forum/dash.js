/**
SEEK_PERIODS:
- load test page
- load stream
- seek to last period
- check if playback is seeked at new position
- seek to first period
- check if playback is seeked at new position
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'SEEK_PERIODS';

// Test variables
var seekPos;

exports.register = function(stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.dynamic || stream.periods.length <= 1) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        test('seek to last period', async () => {
            // Get last period
            const period = stream.periods[stream.periods.length - 1];

            // Generate randomly a seek position
            seekPos = utils.generateSeekPos(period.duration) + period.start;
            utils.log(NAME, 'Seek to last period at time: ' + seekPos);

            // Seek the player
            const seeked = await command.executeAsync(player.seek, [seekPos, constants.EVENT_TIMEOUT]);
            assert.isTrue(seeked);

            // Check if seeked at seeking time
            const time = await command.execute(player.getTime);
            utils.log(NAME, 'Playback time: ' + time);
            assert.isAtLeast(time, seekPos);
        });

        test('seek to first period', async () => {
            // Get last period
            const period = stream.periods[0];

            // Generate randomly a seek position
            seekPos = utils.generateSeekPos(period.duration) + period.start;
            utils.log(NAME, 'Seek to last period at time: ' + seekPos);

            // Seek the player
            const seeked = await command.executeAsync(player.seek, [seekPos, constants.EVENT_TIMEOUT]);
            assert.isTrue(seeked);

            // Check if seeked at seeking time
            const time = await command.execute(player.getTime);
            utils.log(NAME, 'Playback time: ' + time);
            assert.isAtLeast(time, seekPos);
        });
    });
}
