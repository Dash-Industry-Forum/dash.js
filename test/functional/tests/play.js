/**
PLAY:
- load test page
- load stream
- check playing state
- check if playback progressing
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'PLAY';

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
        });

        test('play', async () => {
            utils.log(NAME, 'Play');
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
        });

        test('progress', async () => {
            utils.log(NAME, 'Progress');
            const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
        });

        after(async () => {
            stream.settings = await command.execute(player.getSettings);
            stream.dynamic = await command.execute(player.isDynamic);
            stream.duration = await command.execute(player.getDuration);
            stream.audioTracks = await command.execute(player.getTracksFor, ['audio']);
            stream.textTracks = await command.execute(player.getTracksFor, ['text']);
            stream.periods = [];
            let streams = await command.execute(player.getStreams);
            for (let i = 0; i < streams.length; i++ ) {
                stream.periods.push({
                    start: streams[i].start,
                    duration: streams[i].duration
                });
            }
        });
    });
}
