/**
DEBUG flag must be set to read memory usage

AUTOHEAPSNAP:
- load test page
- load stream
- play stream
- get usedJSHeapSize
- wait
- check if playback progressing
- get usedJSHeapSize
**/
const intern = require('intern').default;
const { suite, before, test, after } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const constants = require('./scripts/constants.js');
const utils = require('./scripts/utils.js');
const player = require('./scripts/player.js');

// Suite name
const NAME = 'AUTOHEAPSNAP';

// test constants
const WAIT_DELAY = 50; // wait timeout in seconds
const TIMEOUT_BUFFER = WAIT_DELAY + 5; // test suite timeout (longer than wait timeout)

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        before(async ({ remote }) => {
            if (!stream.available) suite.skip();
            utils.log(NAME, 'Load stream');
            command = remote.get(intern.config.testPage);
            await command.execute(player.loadStream, [stream]);
        });

        test('play', async () => {
            // play stream and check progression
            utils.log(NAME, 'Play');
            const playing = await command.executeAsync(player.isPlaying, [constants.EVENT_TIMEOUT]);
            stream.available = playing;
            assert.isTrue(playing);
        });

        test('entryMemory', async (test) => {
            // get memory usage and wait
            test.timeout = TIMEOUT_BUFFER  * 1000;
            var usedJSHeapSize = await command.execute(player.getMemoryHeap,[])
            utils.log(NAME, 'Memory: '+usedJSHeapSize);
            await command.sleep(WAIT_DELAY * 1000);
        });

        test('progress', async () => {
            // check if progressing
            utils.log(NAME, 'Progress');
            const progressing = await command.executeAsync(player.isProgressing, [constants.PROGRESS_DELAY, constants.EVENT_TIMEOUT]);
            assert.isTrue(progressing);
        });
        
        test('exitMemory', async () => {
            // get memory usage
            var usedJSHeapSize = await command.execute(player.getMemoryHeap,[])
            utils.log(NAME, 'Memory: '+ usedJSHeapSize);
        });
    });
}