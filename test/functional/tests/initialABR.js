/**
initialABR:
- load test page
- update settings
- load stream
- repeat N times:
    - check bitrate
**/
const intern = require('intern').default;
const { suite, before, test} = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const lodash = require('lodash');

// Suite name
const NAME = 'INITIAL_ABR';

// Test constants
const CHECKBITRATE_COUNT = 2;  // Amount of times to check bitrate after updating initial bitrate
const INITIALBITRATE_VIDEO = 800; // initial bitrate value
const AUTOSWITCHBITRATE_VIDEO = false; // disable abr switching
const QUALITY_DEFAULT_INDEX = 0; // return lowest quality index, if the bitrate is too low
const WAIT_DURATION = 5; // time between bitrate checks
 
/** Initial Bitrate is being set and ABR is being disabled */
function getSettings(defaultSettings){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.abr.initialBitrate.video = INITIALBITRATE_VIDEO;
    settings.streaming.abr.autoSwitchBitrate.video = AUTOSWITCHBITRATE_VIDEO;

    return settings;
};

/** return expected Quality Index
 * @param {Array} bitrateInfoList The bitrateInfoList of the given stream
 * @param {number} bitrate The bitrate available for the player
*/
function expectedQualityIndex(bitrateInfoList, bitrate){
    for(let i = bitrateInfoList.length - 1; i >= 0; i--){
        if(bitrateInfoList[i].bitrate <= bitrate * 1000) return bitrateInfoList[i].qualityIndex;
    };
    return QUALITY_DEFAULT_INDEX;
};

// Test Suite
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

            // load stream
            await command.execute(player.loadStream, [stream]);
        });

        // repeat bitrate checks
        for(let i = 0; i < CHECKBITRATE_COUNT; i++){
            test('checkBitrate_' + i, async () => {
                await command.sleep(WAIT_DURATION * 1000);
                await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
                
                // get current quality and all possible qualities
                let bitrateInfoList = await command.execute(player.getBitrateInfoListFor,["video"]);
                let actualQuality = await command.execute(player.getQualityFor,["video"]);
                console.log(bitrateInfoList);
                console.log(actualQuality);
                // check if bitrate was chosen correctly
                let expectedQuality = expectedQualityIndex(bitrateInfoList, INITIALBITRATE_VIDEO);
                assert.equal(actualQuality,expectedQuality);
            });
        };
    });
}
