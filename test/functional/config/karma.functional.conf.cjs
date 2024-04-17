const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

module.exports = function (config) {

    const argv = yargs(hideBin(process.argv)).parse()
    // Find the settings JSON object in the command arguments
    const configFileName = argv.configfile
    const streamsFileName = argv.streamsfile

    if (!configFileName) {
        return
    }

    const testConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/${configFileName}.json`, 'utf-8'));
    const streamsConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/streams/${streamsFileName}.json`, 'utf-8'));
    const includedTestfiles = _getIncludedTestfiles(streamsConfiguration)
    const excludedTestfiles = _getExcludedTestfiles(streamsConfiguration)
    const customContextFile = testConfiguration.customContextFile ? testConfiguration.customContextFile : 'test/functional/view/index.html';
    const testvectors = streamsConfiguration.testvectors

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../../../',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-*',  // default plugins
            '@*/karma-*', // default scoped plugins
        ],

        // list of files / patterns to load in the browser
        // https://github.com/webpack-contrib/karma-webpack#alternative-usage
        files: [
            { pattern: 'https://imasdk.googleapis.com/js/sdkloader/ima3_dai.js', watched: false, nocache: true },
            { pattern: 'dist/dash.all.debug.js', watched: false, nocache: true },
            { pattern: 'dist/dash.mss.min.js', watched: false, nocache: true },
            { pattern: 'test/functional/content/**/*.mpd', watched: false, included: false, served: true }
        ].concat(includedTestfiles),


        // list of files / patterns to exclude
        exclude: ['test/functional/test/common/*.js'].concat(excludedTestfiles),

        customContextFile,

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: testConfiguration.reporters,

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'test/functional/test/**/*.js': ['webpack'],
            'dist/dash.all.debug.js': ['coverage'],
            'dist/dash.mss.min.js': ['coverage'],
        },

        junitReporter: {
            outputDir: `test/functional/results/test/karma/junit`, // results will be saved as $outputDir/$browserName.xml
            outputFile: `${Date.now()}.xml`, // if included, results will be saved as $outputDir/$browserName/$outputFile
            suite: '', // suite will become the package name attribute in xml testsuite element
            useBrowserName: false, // add browser name to report and classes names
            nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
            classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
            properties: {}, // key value pair of properties to add to the <properties> section of the report
            xmlVersion: null // use '1' if reporting to be per SonarQube 6.2 XML format
        },

        htmlReporter: {
            outputFile: `test/functional/results/test/karma/htmlreporter/${Date.now()}.html`,
            pageTitle: 'dash.js',
            subPageTitle: 'Functional Tests',
            groupSuites: true,
            useCompactStyle: true,
            useLegacyStyle: true,
            showOnlyFailed: false
        },

        // optionally, configure the reporter
        coverageReporter: {
            type: 'html',
            dir: 'test/functional/results/coverage/karma'
        },

        browserStack: {
            username: process.env.BROWSERSTACK_USER,
            accessKey: process.env.BROWSERSTACK_ACCESS_KEY,
            timeout: 1800,
            captureTimeout: 300
        },

        webpack: {},

        client: {
            useIframe: true,
            mocha: {
                timeout: 180000
            },
            testvectors
        },

        // web server port
        port: 9876,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        browserNoActivityTimeout: 180000,
        browserDisconnectTimeout: 20000,
        browserDisconnectTolerance: 3,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: testConfiguration.browsers,

        customLaunchers: {
            bs_chrome_win_11: {
                base: 'BrowserStack',
                browser: 'chrome',
                'browser_version': 'latest',
                os: 'Windows',
                'os_version': '11',
            },
            bs_firefox_win_11: {
                base: 'BrowserStack',
                browser: 'firefox',
                'browser_version': 'latest',
                os: 'Windows',
                'os_version': '11',
            },
            bs_safari_mac: {
                'base': 'BrowserStack',
                'browser_version': 'latest',
                'os': 'OS X',
                'os_version': 'Ventura',
                'browser': 'safari',
            },
            chrome_custom: {
                base: 'Chrome',
                flags: ['--disable-web-security', '--autoplay-policy=no-user-gesture-required', '--disable-popup-blocking']
            },
            firefox_custom: {
                base: 'Firefox',
                prefs: {}
            }
        },

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: 2
    })
}

function _getIncludedTestfiles(testConfiguration) {

    if (!testConfiguration || !testConfiguration.testfiles) {
        return []
    }

    if (!testConfiguration.testfiles.included || testConfiguration.testfiles.included.indexOf('all') >= 0) {
        return [{ pattern: `test/functional/test/**/*.js`, watched: false }]
    }

    return testConfiguration.testfiles.included.map((entry) => {
        return { pattern: `test/functional/test/${entry}.js`, watched: false }
    })
}

function _getExcludedTestfiles(testConfiguration) {
    if (!testConfiguration || !testConfiguration.testfiles || !testConfiguration.testfiles.excluded) {
        return []
    }

    return testConfiguration.testfiles.excluded.map((entry) => {
        return `test/functional/test/${entry}.js`
    })
}
