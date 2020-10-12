/**
PLAY:
- load test page
- load stream at start time ithing last period
- check playing time
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const constants = require('./scripts/constants.js');

// Suite name
const NAME = 'PLAY_FROM_TIME';

// Test constants
const OFFSET_TO_START = 15; // time offset (in sec.) from the beginning of the period

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            let stream_ = stream;
            if (!stream.dynamic) {
                let timeToStart = stream.periods[stream.periods.length - 1].start + OFFSET_TO_START;
                stream_.url += '#t=' + timeToStart;
            } else {
                if (stream.dvrWindow > 0) {
                    let relativePosition = stream.dvrWindow / 2;
                    stream_.url += '#r=' + relativePosition;
                }
            }
            await command.execute(player.loadStream, [stream_]);
        });

        test('play from url anchor time', async () => {
            utils.log(NAME, 'Play');
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            assert.isTrue(playing);
            const time = await command.execute(player.getTime);
            utils.log(NAME, 'Playback time: ' + time);
            assert.isAtLeast(time, stream.periods[stream.periods.length - 1].start + OFFSET_TO_START);
        });
    });
}
