define(function (require) {

    var MAC = {};
    var WINDOWS = {};

    var getWindowsBrowers = function () {
        var browsers = require('./browsers/windows.js');

        for (var key in browsers) {
            WINDOWS[key] = browsers[key];
        }
    };

    var getMacBrowsers = function () {
        var browsers = require('./browsers/mac.js');

        for (var key in browsers) {
            MAC[key] = browsers[key];
        }
    };

    getWindowsBrowers();
    getMacBrowsers();

    return {
        mac: MAC,
        windows: WINDOWS
    };
});
