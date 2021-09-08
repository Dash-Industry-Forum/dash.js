/**
SETUP:
- for each stream:
    - check if stream is available
**/
const intern = require('intern').default;
const { suite, test } = intern.getPlugin('interface.tdd');
const { assert } = intern.getPlugin('chai');

const utils = require('./scripts/utils.js');

// Suite name
var NAME = 'SETUP';

exports.register = function (stream) {

    suite(utils.testName(NAME, stream), (suite) => {

        test('setup', async ({ remote }) => {
            utils.info(NAME, 'Setup stream: ' + stream.name);

            // Check key systems support
            var browserName = remote.session.capabilities.browserName;
            var browsersConf = intern.config.environments.filter(conf => {
                // special case if chosen browser is msedge
                if((conf.browserName === "edge" || conf.browserName === "MicrosoftEdge") && browserName === "msedge") return true;
                return conf.browserName === browserName;     
            })[0];

            if (stream.protData) {
                stream.available = false;
                Object.keys(stream.protData).forEach(keySystem => {
                    stream.available |= browsersConf.keySystems[keySystem] === true;
                });
                if (!stream.available) {
                    suite.skip();
                }
            }

            // Check stream availability
            const exists = await remote.executeAsync(utils.checkIfFileExits, [stream.url]);
            stream.available = exists;
            assert.isTrue(exists);
        });
    });
};
