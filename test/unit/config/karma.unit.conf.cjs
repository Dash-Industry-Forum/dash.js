module.exports = function (config) {
    // Coverage instrumentation slows down compilation and execution considerably,
    // so it is only enabled when the COVERAGE environment variable is set.
    const useCoverage = !!process.env.COVERAGE;

    config.set({

        // base path that will be used to resolve all patterns (eg. files, exclude)
        basePath: '../../../',


        // frameworks to use
        // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-*', // default plugins
            '@*/karma-*', // default scoped plugins
        ],

        middleware: [],

        // list of files / patterns to load in the browser
        // https://github.com/webpack-contrib/karma-webpack#alternative-usage
        files: [
            { pattern: 'test/unit/test/**/*.js', watched: false },
            { pattern: 'src/**/*.js', watched: false, included: false, nocache: true },
            { pattern: 'test/unit/data/**/*', watched: false, included: false, served: true }
        ],

        // list of files / patterns to exclude
        exclude: ['test/unit/test/**/__screenshots__/**'],

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
            'test/unit/**/*.js': ['webpack'],
        },


        // test results reporter to use
        // possible values: 'dots', 'progress'
        // available reporters: https://npmjs.org/browse/keyword/karma-reporter
        reporters: useCoverage ? ['mocha', 'coverage', 'junit'] : ['mocha', 'junit'],

        junitReporter: {
            outputDir: 'test/unit/results/junit', // results will be saved as $outputDir/$browserName.xml
            outputFile: undefined, // if included, results will be saved as $outputDir/$browserName/$outputFile
            suite: '', // suite will become the package name attribute in xml testsuite element
            useBrowserName: true, // add browser name to report and classes names
            nameFormatter: undefined, // function (browser, result) to customize the name attribute in xml testcase element
            classNameFormatter: undefined, // function (browser, result) to customize the classname attribute in xml testcase element
            properties: {}, // key value pair of properties to add to the <properties> section of the report
            xmlVersion: null // use '1' if reporting to be per SonarQube 6.2 XML format
        },

        // optionally, configure the reporter
        coverageReporter: {
            type: 'html',
            dir: 'test/unit/results/coverage/'
        },


        webpack: {
            module: {
                rules: [
                    {
                        test: /\.js$/,
                        use: [
                            {
                                loader: 'babel-loader',
                                options: {
                                    plugins: useCoverage ? ['istanbul'] : []
                                }
                            }
                        ]
                    }
                ]
            },
            mode: 'development',
            cache: {
                type: 'filesystem'
            },
            resolve: {
                fallback: {
                    stream: require.resolve('stream-browserify'),
                    timers: require.resolve('timers-browserify'),
                },
            },
            devtool: 'eval-cheap-module-source-map', // Enable source maps for debugging
        },

        // web server port
        port: 9999,


        // enable / disable colors in the output (reporters and logs)
        colors: true,


        // level of logging
        // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
        logLevel: config.LOG_WARN,


        // enable / disable watching file and executing tests whenever any file changes
        autoWatch: false,

        customLaunchers: {
            // Firefox throttles timers in background windows (tests run in a popup because
            // useIframe is false), which stalls async tests for seconds at a time.
            // These prefs disable the throttling.
            FirefoxHeadlessNoThrottling: {
                base: 'FirefoxHeadless',
                prefs: {
                    'dom.min_background_timeout_value': 4,
                    'dom.min_background_timeout_value_without_budget_throttling': 4,
                    'dom.timeout.enable_budget_timer_throttling': false
                }
            }
        },

        // start these browsers
        // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
        browsers: ['ChromeHeadless', 'FirefoxHeadlessNoThrottling'],

        // Continuous Integration mode
        // if true, Karma captures browsers, runs the tests and exits
        singleRun: true,

        // Concurrency level
        // how many browser should be started simultaneous
        concurrency: Infinity
    })
}
