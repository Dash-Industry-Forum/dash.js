/**
PLAY:
- load test page
- set settings
- load stream
- check playing state
- check if playback progressing
- check live delay
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const lodash = require('lodash');

// Suite name
const NAME = 'LIVE_DELAY';

// Test constants
const LIVE_DELAY = 20; // Live delay in seconds

/** Live Delay is being set in dash.js settings object */
function getSettings(defaultSettings){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.delay.liveDelay = LIVE_DELAY;

    return settings;
};
exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || !stream.dynamic) suite.skip();
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
            // load stream
            await command.execute(player.loadStream, [stream]);
        });

        test('play', async () => {
            utils.log(NAME, 'Play');

            // check if playing
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
        });

        test('progress', async () => {
            utils.log(NAME, 'Progress');
            
            // check if progressing
            const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
        });

        test('checkLiveDelay', async () => {
            utils.log(NAME, 'Check live delay');

            // check if live delay is approx. correct
            var timestampStream = await command.execute(player.timeAsUTC,[]);
            var timestampClient = new Date().getTime()/1000;
            let liveDelay = Math.floor(timestampClient - timestampStream);
            console.log(liveDelay);
        });
    });
}
