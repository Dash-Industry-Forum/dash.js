const yaml = require('js-yaml');
const fs = require('fs');

module.exports = function (config) {

    const seleniumConfig =
        yaml.load(fs.readFileSync('test/functional/selenium/config/grid.conf.yaml', 'utf8'));
    const browsers = [];
    const customLaunchers = {};
    const gridConfig = seleniumConfig.general.gridConfig;

    const settings = getSettings()
    for (const [key, value] of Object.entries(seleniumConfig.browsers)) {
        if (value.included) {
            browsers.push(key);
            customLaunchers[key] = {};
            customLaunchers[key].base = 'WebDriver';
            customLaunchers[key].config = gridConfig;
            customLaunchers[key].browserName = value.browser;
            customLaunchers[key].platform = value.os;
            if (value.parameters) {
                Object.assign(customLaunchers[key], value.parameters);
            }
            if (value.version) {
                customLaunchers[key].version = value.version;
            }
        }
    }


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
            { pattern: 'test/functional/test/**/*.js', watched: false },
            { pattern: 'test/functional/content/**/*.mpd', watched: false, included: false, served: true }
        ],


        // list of files / patterns to exclude
        exclude: ['test/functional/test/vendor/*.js'],

        customContextFile: 'test/functional/view/index.html',

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['mocha', 'html', 'progress', 'junit'],


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'test/functional/test/**/*.js': ['webpack']
        },

        junitReporter: {
            outputDir: 'test/functional/results/test/selenium/junit', // results will be saved as $outputDir/$browserName.xml
            outputFile: undefined, // if included, results will be saved as $outputDir/$browserName/$outputFile
            suite: '', // suite will become the package name attribute in xml testsuite element
            useBrowserName: true, // add browser name to report and classes names
            nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
            classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
            properties: {}, // key value pair of properties to add to the <properties> section of the report
            xmlVersion: null // use '1' if reporting to be per SonarQube 6.2 XML format
        },

        htmlReporter: {
            outputFile: 'test/functional/results/test/selenium/htmlreporter/out.html',
            pageTitle: 'dash.js',
            subPageTitle: 'Functional Tests',
            groupSuites: true,
            useCompactStyle: true,
            useLegacyStyle: true,
            showOnlyFailed: false
        },

        webpack: {},

        client: {
            useIframe: false,
            mocha: {
                timeout: 90000
            },
            settings
        },

        // web server port
        port: 9876,

        protocol: 'http',

        //hostname: '194.95.174.67',
        //hostname: '10.147.67.104',
        hostname: gridConfig.hostname,

        // enable / disable colors in the output (reporters and logs)
        colors: true,

        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,

        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        browserNoActivityTimeout: 180000,

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers,

        customLaunchers,

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: 20
    })
}

function getSettings() {
    const args = process.argv;
    const settingsIndex = args.indexOf('--settings');

    return settingsIndex >= 0 ? JSON.parse(args[settingsIndex + 1]) : {}
}
