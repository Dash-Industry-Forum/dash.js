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
const TIME_OFFSET = 30; // time offset (in sec.) from the beginning of the period or before live edge (for live streams)

let startTime;
let originalUrl;

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            originalUrl = stream.url;
            if (!stream.dynamic) {
                let period = stream.periods[stream.periods.length - 1];
                startTime = period.start + Math.min(TIME_OFFSET, period.duration - 5);
                stream.url += '#t=' + startTime;
            } else {
                startTime = Math.floor(Date.now() / 1000) - TIME_OFFSET;
                stream.url += '#t=posix:' + startTime;
            }
            utils.log(NAME, 'Playback start time: ' + startTime);
            await command.execute(player.loadStream, [stream]);
        });

        after(() => {
            stream.url = originalUrl;
        })

        test('play from url anchor time', async () => {
            utils.log(NAME, 'Play');
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            assert.isTrue(playing);
            const time = await command.execute(stream.dynamic ? player.getTimeAsUTC : player.getTime);
            utils.log(NAME, 'Playback time: ' + time);
            assert.isAtLeast(time, startTime);
            assert.isAtMost(time, (startTime + 5));
        });
    });
}
