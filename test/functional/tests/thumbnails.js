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
const NAME = 'THUMBNAIL';

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
        });

        test('play', async () => {
            utils.log(NAME, 'Play');

            // check thumbnail at seekbar pos (in px)
            var currPixel = 7;
            
            // check if playing
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
            
            // setup values
            var element = await command.findById('seekbar');
            await command.moveMouseTo(element,currPixel,4);
            await command.sleep(5000);
            var size = await command.findById('seekbar').getSize();

            // get curr timestamp
            var timeLabelElement = await command.findById('thumbnail-time-label');
            actualTimeStamp = await currTimeStamp(timeLabelElement);
            console.log(actualTimeStamp);
            
            // expected timestamp
            const duration = await command.execute(player.getDuration);
            var expectedTimeStamp = currPixel/size.width * duration;
            console.log(expectedTimeStamp);

            // delta, if actual thumbnail is within a pixel range
            var delta = Math.abs(expectedTimeStamp - (currPixel+1)/size.width * duration);

            assert.approximately(actualTimeStamp,expectedTimeStamp,delta);
        });
    });
}
