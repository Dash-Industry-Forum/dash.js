define(function () {

    var CHROME_CONFIG = {
        browserName: 'chrome',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10',
        keySystems: {
            'com.widevine.alpha': true,
            'com.microsoft.playready': false,
            'org.w3.clearkey': true
        },
        'goog:chromeOptions': { w3c: false }
    };

    var FIREFOX_CONFIG = {
        browserName: 'firefox',
        platform: 'WINDOWS',
        os: 'WINDOWS',
        os_version: '10',
        keySystems: {
            'com.widevine.alpha': true,
            'com.microsoft.playready': false,
            'org.w3.clearkey': true
        }
    };

    var EDGE_CONFIG = {
        browserName: 'MicrosoftEdge',
        platform: 'WINDOWS',
        keySystems: {
            'com.widevine.alpha': false,
            'com.microsoft.playready': true,
            'org.w3.clearkey': true
        },
        'ms:edgeOptions': { w3c: false }
    };

    return {
        all: [CHROME_CONFIG, EDGE_CONFIG, FIREFOX_CONFIG],

        chrome: [CHROME_CONFIG],

        firefox: [FIREFOX_CONFIG],

        edge: [EDGE_CONFIG]
    };
});
