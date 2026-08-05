const path = require('path');

// Runs the package smoke test in headless Chrome. The spec imports 'dashjs', which is
// resolved from the tarball installed into test/compliance/vite-consumer/node_modules
// by test/package/verify-package.mjs - run that script instead of this config directly.
module.exports = function (config) {
    config.set({

        basePath: '../../',

        frameworks: ['mocha', 'chai', 'webpack'],

        plugins: [
            'karma-*',
            '@*/karma-*',
        ],

        files: [
            { pattern: 'test/package/smoke.spec.js', watched: false },
        ],

        client: {
            useIframe: false,
            mocha: {
                timeout: 60000
            }
        },

        preprocessors: {
            'test/package/smoke.spec.js': ['webpack'],
        },

        reporters: ['mocha'],

        webpack: {
            mode: 'development',
            resolve: {
                // Resolve 'dashjs' from the consumer app's node_modules, i.e. the
                // tarball install, through the package's real exports map.
                modules: [
                    path.resolve(__dirname, '../compliance/vite-consumer/node_modules'),
                    'node_modules',
                ],
            },
        },

        port: 9998,

        colors: true,

        logLevel: config.LOG_WARN,

        autoWatch: false,

        customLaunchers: {
            ChromeHeadlessAutoplay: {
                base: 'ChromeHeadless',
                flags: ['--autoplay-policy=no-user-gesture-required', '--mute-audio']
            }
        },

        browsers: ['ChromeHeadlessAutoplay'],

        singleRun: true,

        browserNoActivityTimeout: 90000,

        concurrency: 1
    })
}
