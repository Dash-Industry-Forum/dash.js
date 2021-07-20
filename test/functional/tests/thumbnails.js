/**
PLAY:
- load test page
- load stream
- check playing state
- skip if no thumbnail stream
- check position of thumbnail
**/
const intern = require('intern').default;
const { suite, before, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'THUMBNAIL';

// Test constants
const SLEEP = 3; // sleep duration in sec

/** return the current timestamp of the thumbnail in sec */
async function currTimeStamp(thumbnail_time_label){
    var timestamp = await thumbnail_time_label.getVisibleText();
    var timestampArr = timestamp.split(":");
    return parseInt(timestampArr[0])*60 + parseInt(timestampArr[1]);
};

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available || stream.dynamic) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);

            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
            
            var hasThumbnail = await command.execute(player.containsThumbnails, []);
            if(!hasThumbnail) suite.skip();
        });

        test('check position', async () => {
            utils.log(NAME, 'Check Position');

            // check thumbnail at seekbar rand pos not too close to the left and right end (in px)
            var currPixel = Math.floor(Math.random() * (constants.SEEKBAR.width - constants.SEEKBAR.thumbnailPaddingLeftRight * 2)) + constants.SEEKBAR.thumbnailPaddingLeftRight;
            
            // setup values
            await command.sleep(SLEEP * 1000);
            var element = await command.findById('seekbar');
            await command.moveMouseTo(element,currPixel,Math.floor(constants.SEEKBAR.height/2));
            await command.sleep(SLEEP * 1000);

            // get curr timestamp
            var timeLabelElement = await command.findById('thumbnail-time-label');
            actualTimeStamp = await currTimeStamp(timeLabelElement);
            
            // expected timestamp
            const duration = await command.execute(player.getDuration);
            var expectedTimeStamp = currPixel/constants.SEEKBAR.width * duration;

            // delta, if actual thumbnail is within a pixel range
            var delta = Math.abs(expectedTimeStamp - (currPixel+1)/constants.SEEKBAR.width * duration);

            assert.approximately(actualTimeStamp,expectedTimeStamp,delta);
        });
    });
}
