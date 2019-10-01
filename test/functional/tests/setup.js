/**
SETUP:
- for each stream:
    - check if stream is available
**/
define([
    'intern',
    'intern!object',
    'intern/chai!assert',
    'test/functional/tests/scripts/utils'
], function(intern, registerSuite, assert, utils) {

    // Suite name
    var NAME = 'SETUP';

    var setup = function (stream) {
        registerSuite({
            name: NAME,

            setup: function () {
                utils.info(NAME, 'Setup stream: ' + stream.name);

                // Check key systems support
                var browserName = this.remote.session.capabilities.browserName;
                var browsersConf = intern.config.environments.filter(conf => conf.browserName === browserName)[0];

                if (stream.protData) {
                    stream.available = false;
                    Object.keys(stream.protData).forEach(keySystem => {
                        stream.available |= browsersConf.keySystems.includes(keySystem);
                    });
                    if (!stream.available) {
                        this.skip();
                    }
                }

                // Check stream availability
                return this.remote.executeAsync(utils.checkIfFileExits, [stream.url])
                .then(function (exists) {
                    stream.available = exists;
                    return assert.isTrue(exists);
                });
            }
        });
    };    

    return {
        register: function (stream) {
            setup(stream);
        }
    }
});
