module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: 'test/functional-karma',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-webpack',
            'karma-mocha',
            'karma-chai',
            'karma-coverage',
            'karma-mocha-reporter',
            'karma-junit-reporter',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
            'karma-htmlfile-reporter'
        ],

        // list of files / patterns to load in the browser
        // https://github.com/webpack-contrib/karma-webpack#alternative-usage
        files: [
            { pattern: 'https://imasdk.googleapis.com/js/sdkloader/ima3_dai.js', watched: false, nocache: true },
            { pattern: '../../dist/dash.all.debug.js', watched: false, nocache: true },
            { pattern: '../../dist/dash.mss.min.js', watched: false, nocache: true },
            { pattern: 'test/**/*.js', watched: false },
            { pattern: 'content/**/*.mpd', watched: false, included: false, served: true }
        ],

        // list of files / patterns to exclude
        // exclude: ['test/vendor/*.js'],

        customContextFile: 'view/index.html',

        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['mocha', 'html', 'progress', 'junit'],

        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'test/**/*.js': ['webpack']
        },

        junitReporter: {
            outputDir: 'results/karma/junit', // results will be saved as $outputDir/$browserName.xml
            outputFile: undefined, // if included, results will be saved as $outputDir/$browserName/$outputFile
            suite: '', // suite will become the package name attribute in xml testsuite element
            useBrowserName: true, // add browser name to report and classes names
            nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
            classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
            properties: {}, // key value pair of properties to add to the <properties> section of the report
            xmlVersion: null // use '1' if reporting to be per SonarQube 6.2 XML format
        },

        htmlReporter: {
            outputFile: 'results/karma/htmlreporter/out.html',

            // Optional
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
                timeout: 180000
            }
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

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['chrome_custom'],

        customLaunchers: {
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
