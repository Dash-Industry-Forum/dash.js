define(function () {

    var CHROME_CONFIG = {
        browserName: 'chrome',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10'
    };

    var EDGE_CONFIG = {
        browserName: 'MicrosoftEdge',
        platform: 'WINDOWS'
    };
    var FIREFOX_CONFIG = {
        browserName: 'firefox',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10'
    };

    return {
        all: [CHROME_CONFIG, EDGE_CONFIG, FIREFOX_CONFIG],

        chrome: [CHROME_CONFIG],

        edge: [EDGE_CONFIG],

        firefox: [FIREFOX_CONFIG]
    };
});
