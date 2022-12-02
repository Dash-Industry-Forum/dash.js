/**
ENDED:
- load test page
- load stream
- seek before end of stream
- wait for 'ended' event
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
var NAME = 'ENDED';

exports.register = function(stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.dynamic) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });

        test('seek', async () => {
            // Seek the player before end
            let seekTime = Math.max(0, (stream.duration - constants.SEEK_END_SHIFT));
            utils.log(NAME, 'Seek before end: ' + seekTime);
            const seeked = await command.executeAsync(player.seek, [seekTime, constants.EVENT_TIMEOUT]);
            assert.isTrue(seeked)
        });

        test('ended', async () => {
            // Wait for 'ended' event
            const ended = await command.executeAsync(player.waitForEvent, ['playbackEnded', constants.SEEK_END_SHIFT + constants.EVENT_TIMEOUT]);
            assert.isTrue(ended);
        });
    });
};

