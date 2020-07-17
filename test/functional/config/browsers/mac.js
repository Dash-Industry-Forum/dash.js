define(function () {

    var CHROME_CONFIG = {
        browserName: 'chrome',
        platform: 'MAC',
        keySystems: {
            'com.widevine.alpha': true,
            'com.microsoft.playready': false,
            'org.w3.clearkey': true
        },
    };

    var FIREFOX_CONFIG = {
        browserName: 'firefox',
        platform: 'MAC',
        keySystems: {
            'com.widevine.alpha': true,
            'com.microsoft.playready': false,
            'org.w3.clearkey': true
        },
    };

    return {
        all: [CHROME_CONFIG, FIREFOX_CONFIG],

        chrome: [CHROME_CONFIG],

        firefox: [FIREFOX_CONFIG]
    };
});
