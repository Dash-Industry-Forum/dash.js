define(function () {

    var CHROME_CONFIG = {
        browserName: 'chrome',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10',
        keySystems: ['com.widevine.alpha', 'org.w3.clearkey'],
        'goog:chromeOptions': { w3c: false }
    };

    var FIREFOX_CONFIG = {
        browserName: 'firefox',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10',
        keySystems: ['com.widevine.alpha', 'org.w3.clearkey']
    };

    var EDGE_CONFIG = {
        browserName: 'MicrosoftEdge',
        platform: 'WINDOWS',
        keySystems: ['com.microsoft.playready', 'org.w3.clearkey']
    };

    return {
        all: [CHROME_CONFIG, EDGE_CONFIG, FIREFOX_CONFIG],

        chrome: [CHROME_CONFIG],

        firefox: [FIREFOX_CONFIG],

        edge: [EDGE_CONFIG]
    };
});
