module.exports = function (config) {
    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../../../',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-webpack',
            'karma-mocha',
            'karma-chai',
            'karma-coverage',
            'karma-mocha-reporter',
            'karma-chrome-launcher',
            'karma-firefox-launcher',
        ],

        middleware: [],

        // list of files / patterns to load in the browser
        // https://github.com/webpack-contrib/karma-webpack#alternative-usage
        files: [
            {pattern: 'test/unit/test/**/*.js', watched: false},
            {pattern: 'src/**/*.js', watched: false, included: false, nocache: true},
            {pattern: 'test/unit/data/**/*', watched: false, included: false, served: true}
        ],

        // list of files / patterns to exclude
        exclude: [],

        client: {
            useIframe: false,
            mocha: {
                timeout: 90000,
                grep: config.grep
            }
        },


        // preprocess matching files before serving them to the browser
        // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
        preprocessors: {
            // add webpack as preprocessor
            'src/**/*.js': ['coverage'],
            'test/unit/**/*.js': ['webpack'],
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: ['mocha', 'coverage'],

        // optionally, configure the reporter
        coverageReporter: {
            type: 'html',
            dir: 'test/unit/results/coverage/'
        },


        webpack: {
            cache: false,
            resolve: {
                fallback: {
                    stream: require.resolve('stream-browserify'),
                },
            },
        },

        // web server port
        port: 9999,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_INFO,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,


        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['ChromeHeadless'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: 1
    })
}
