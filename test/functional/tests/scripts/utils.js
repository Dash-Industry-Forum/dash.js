const intern = require('intern').default;
const constants = require('./constants.js');

module.exports = {

    testName: function (name, stream) {
        return stream.name + ' # ' + name;
    },


    info: function (tag, message) {
        console.info('[' + tag + ']', message);
    },

    log: function (tag, message) {
        if (intern.config.debug) {
            console.log('[' + tag + ']', message);
        }
    },

    executeAsync: function (command, script, args, timeout) {
        return new Promise(function (resolve, reject) {
            command.executeAsync(script, args)
            .then(function (res) {
                resolve(res);
            })
            .catch(function (err) {
                reject(err);
            })
        });
    },

    checkIfFileExits: function (url, done) {
        try {
            var xhr = new XMLHttpRequest();

            xhr.addEventListener("load", transferComplete);
            xhr.addEventListener("error", transferFailed);
            xhr.addEventListener("abort", transferCanceled);

            xhr.open("GET", url);
            xhr.send();


            function transferComplete() {
                done(true);
            }

            function transferFailed() {
                done(false);
            }

            function transferCanceled() {
                done(false);
            }
        } catch (e) {
            done(false);
        }
    },

    generateSeekPos: function(duration) {
        return Number.parseFloat((Math.random() * (duration - constants.PROGRESS_DELAY - constants.DURATION_TOLERANCE)).toFixed(2));
    }
};
