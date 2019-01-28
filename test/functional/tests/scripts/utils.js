define([
    'intern'
    ], function (intern) {

    var defaultTimeout = intern.config.defaultTimeout;
    
    return {

        log: function (tag, message) {
            console.log('[' + tag + ']', message);
        },

        executeAsync: function (command, script, args, timeout) {
            return new Promise(function (resolve, reject) {
                // command.setExecuteAsyncTimeout(9000/*timeout ? timeout : defaultTimeout*/).then(function () {
                    command.executeAsync(script, args)
                    .then(function (res) {
                        resolve(res);
                    })    
                    .catch(function (err) {
                        reject(err);
                    })
                // })
            });
        },

        checkIfFileExits: function (url, done) {
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status <= 299) {
                    done(true);
                } else {
                    done(false);
                }
            }
            xhr.send();
        }

    };
});
