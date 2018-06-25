define([
    'test/functional/config/testsConfig'
    ], function (testsConfig) {
    var defaultTimeout = 15000;

    return {

        setup: function (command) {
            command.setExecuteAsyncTimeout(defaultTimeout);
            return command;
        },

        getTestStreams: function (config, filter) {
            var streams = (config && config.streams && config.streams.length > 0) ? config.streams : testsConfig.tests.default.streams;
            if (filter === undefined) {
                filter = function () {
                    return true;
                };
            }

            return streams.filter(filter);
        },

        log: function (tag, message) {
            console.log('[' + tag + '] ', message);
        },

        logLoadStream: function (tag, stream) {
            this.log(tag, 'Load stream "' + stream.name + '" [' + stream.protocol + '/' + stream.type + ']');
        },

        executeAsync: function (command, scripts, args, timeout) {

            var p = new Promise(function (resolve, reject) {
                var originalTimeout = defaultTimeout;
                if (timeout) {
                    originalTimeout = command.getExecuteAsyncTimeout();
                    command.setExecuteAsyncTimeout(timeout * 1000);
                }
                command.executeAsync(scripts, args).then(
                    function (result) {
                        if (timeout) {
                            command.setExecuteAsyncTimeout(originalTimeout);
                        }
                        resolve(result);
                    },
                    function (result) {
                        if (timeout) {
                            command.setExecuteAsyncTimeout(originalTimeout);
                        }
                        reject(result);
                    }
                );
            });
            return p;
        }

    };
});
