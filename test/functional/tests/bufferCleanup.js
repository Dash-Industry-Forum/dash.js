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
const lodash = require('lodash');

// Suite name
const NAME = 'BUFFER_CLEANUP';

// Test constants
const BUFFER_TO_KEEP = 10;
const BUFFER_PRUNING_INTERVAL = 3;
const SLEEP = 10;

/** Sets bufferToKeep and bufferPruningInterval */
function getSettings(defaultSettings){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.buffer.bufferToKeep = BUFFER_TO_KEEP;
    settings.streaming.buffer.bufferPruningInterval = BUFFER_PRUNING_INTERVAL;

    return settings;
};

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
        });

        test('updateSettings', async () => {
            utils.log(NAME, 'updateSettings');

            // update dash.js player settings
            let updateSettings = getSettings(stream.settings);
            await command.execute(player.updateSettings,[updateSettings]);

            // check if settings have been applied
            let actualSettings = await command.execute(player.getSettings, []);     
            assert.deepEqual(actualSettings,updateSettings);

        });

        test('play', async () => {
            utils.log(NAME, 'Play');
            // load stream
            await command.execute(player.loadStream, [stream]);
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            assert.isTrue(playing);
        });

        test('progress for '+ SLEEP + 's', async () => {
            utils.log(NAME, 'Progress');

            var progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
            await command.sleep(SLEEP * 1000);
            progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
        });

        test('Check BUffer', async () => {

        });

    });
}
