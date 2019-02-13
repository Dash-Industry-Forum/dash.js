/**
SETUP:
- for each stream:
    - check if stream is available
**/
define([
    'intern!object',
    'intern/chai!assert',
    'test/functional/tests/scripts/utils'
], function(registerSuite, assert, utils) {

    // Suite name
    var NAME = 'SETUP';

    var setup = function (stream) {
        registerSuite({
            name: NAME,

            setup: function () {
                utils.info(NAME, 'Setup stream: ' + stream.name);
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
