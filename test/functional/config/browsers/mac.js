define(function () {

    var CHROME_CONFIG = {
        browserName: 'chrome',
        platform: 'MAC'
    };

    var FIREFOX_CONFIG = {
        browserName: 'firefox',
        platform: 'MAC'
    };

    return {
        all: [CHROME_CONFIG, FIREFOX_CONFIG],

        chrome: [CHROME_CONFIG],

        firefox: [FIREFOX_CONFIG]
    };
});
