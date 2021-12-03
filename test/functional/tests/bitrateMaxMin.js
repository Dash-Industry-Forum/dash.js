/**
Bitrate_Max_Min:
- load test page
- update settings
- load stream
- check bitrate
- seek random position
- check bitrate again
**/
const intern = require('intern').default;
const { suite, before, test} = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');
const lodash = require('lodash');

// Suite name
const NAME = 'BITRATE_MAX_MIN';

// Test constants
const MAXBITRATE_VIDEO = 1700;
const MINBITRATE_VIDEO = 1100;
 
/** Initial Bitrate is being set and ABR is being disabled */
function getSettings(defaultSettings){
    let settings = lodash.cloneDeep(defaultSettings);
    settings.streaming.abr.maxBitrate.video = MAXBITRATE_VIDEO;
    settings.streaming.abr.minBitrate.video = MINBITRATE_VIDEO;

    return settings;
};

/** return if inside bitrate interval, considering exceptions
 * @param {Array} bitrateInfoList The bitrateInfoList of the given stream
 * @param {number} qualityIndex The current quality index of the stream
 * @param {number} maxBitrate The max. allowed bitrate available for the player
 * @param {number} minBitrate The min. allowed bitrate available for the player
 * 
 * @returns {boolean} returns true, if quality is inbetween the given interval
*/
function insideBitrateInterval(bitrateList,qualityIndex, maxBitrate, minBitrate){
    let quality = bitrateList[qualityIndex];

    // If minimum bitrate is higher than highest possible quality
    if(minBitrate * 1000 > bitrateList[bitrateList.length -1].bitrate && qualityIndex == bitrateList.length -1) return true;

    // If maximum bitrate is lower than lowest possible quality
    if(maxBitrate * 1000 < bitrateList[0].bitrate && qualityIndex == 0) return true;

    // If the current quality is inside the interval
    if(minBitrate * 1000 <= quality.bitrate && quality.bitrate <= maxBitrate * 1000) return true;

    // If there is no possible quality in the interval, check if current quality is closest to minimum and below minimum bitrate
    var insideInterval = false;
    var minIndex = 0;
    for(let i = bitrateList.length - 1; i >= 0; i--){
        // if any quality is inside the interval, the quality has been selected falsely
        if(minBitrate * 1000 <= bitrateList[i].bitrate && bitrateList[i].bitrate <= maxBitrate * 1000) insideInterval = true;
        if(bitrateList[i].bitrate <= minBitrate * 1000) {
            minIndex = bitrateList[i].qualityIndex;
            break;
        }
    };

    if(!insideInterval && minIndex === qualityIndex) return true;

    return false;
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
            await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
        });
        
        test('checkBitrate_0', async () => {
            // get current quality and all possible qualities
            let bitrateInfoList = await command.execute(player.getBitrateInfoListFor,["video"]);
            let actualQuality = await command.execute(player.getQualityFor,["video"]);
            
            //check if bitrate is inside interval 
            assert.isTrue(insideBitrateInterval(bitrateInfoList,actualQuality, MAXBITRATE_VIDEO, MINBITRATE_VIDEO));
        });

        test('seek', async () =>{
            // seek to random pos
            const duration = await command.execute(player.getDuration);
            seekPos = utils.generateSeekPos(duration);
            const seeked = await command.executeAsync(player.seek, [seekPos, constants.EVENT_TIMEOUT]);
            assert.isTrue(seeked);
        });

        test('checkBitrate_1', async () => {
            // get current quality and all possible qualities
            let bitrateInfoList = await command.execute(player.getBitrateInfoListFor,["video"]);
            let actualQuality = await command.execute(player.getQualityFor,["video"]);

            //check if bitrate is inside interval 
            assert.isTrue(insideBitrateInterval(bitrateInfoList,actualQuality, MAXBITRATE_VIDEO, MINBITRATE_VIDEO));
        });
    });
}
