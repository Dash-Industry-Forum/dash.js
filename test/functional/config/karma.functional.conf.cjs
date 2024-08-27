const fs = require('fs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require('path');

module.exports = function (config) {

    const argv = yargs(hideBin(process.argv)).parse()
    // Find the settings JSON object in the command arguments
    const configFileName = argv.configfile
    const streamsFileName = argv.streamsfile

    if (!configFileName) {
        return
    }

    let testConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/${configFileName}.json`, 'utf-8'));
    const streamsConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/streams/${streamsFileName}.json`, 'utf-8'));
    const includedTestfiles = _getIncludedTestfiles(streamsConfiguration)
    const excludedTestfiles = _getExcludedTestfiles(streamsConfiguration)
    const customContextFile = testConfiguration.customContextFile ? testConfiguration.customContextFile : 'test/functional/view/index.html';
    const testvectors = streamsConfiguration.testvectors

    if (testConfiguration && testConfiguration.type && testConfiguration.type === 'lambdatest') {
        testConfiguration = _adjustConfigurationForLambdatest(testConfiguration)
    }

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../../../',

        // web server port
        hostname: testConfiguration.hostname ? testConfiguration.hostname : 'localhost',
        port: testConfiguration.port ? testConfiguration.port : 9876,
        protocol: testConfiguration.protocol ? testConfiguration.protocol : 'http',

        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-*',  // default plugins
            '@*/karma-*', // default scoped plugins
            require('./launchers/karma-webos-launcher.cjs'),
            require('./launchers/karma-tizen-launcher.cjs')
        ],

        // list of files / patterns to load in the browser
        // https://github.com/webpack-contrib/karma-webpack#alternative-usage
        files: [
            { pattern: 'test/functional/lib/ima3_dai.js', watched: false, nocache: true },
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
            useBrowserName: true, // add browser name to report and classes names
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
            useIframe: testConfiguration && testConfiguration.hasOwnProperty('useIframe') ? testConfiguration.useIframe : false,
            mocha: {
                timeout: 100000
            },
            testvectors
        },

        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        captureTimeout: 600000,
        browserNoActivityTimeout: 400000,
        browserDisconnectTimeout: 20000,
        browserDisconnectTolerance: 2,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: testConfiguration.browsers,

        customLaunchers: testConfiguration.customLaunchers,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: !isNaN(testConfiguration.concurrency) ? testConfiguration.concurrency : 2
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

function _adjustConfigurationForLambdatest(testConfiguration) {
    if (testConfiguration && testConfiguration.customLaunchers) {
        Object.keys(testConfiguration.customLaunchers).forEach((key) => {
            testConfiguration.customLaunchers[key].user = process.env.LAMBDATEST_USER;
            testConfiguration.customLaunchers[key].accessKey = process.env.LAMBDATEST_ACCESS_KEY;
            testConfiguration.customLaunchers[key].config = {
                hostname: 'hub.lambdatest.com',
                port: 80
            };
        })
    }

    return testConfiguration
}
