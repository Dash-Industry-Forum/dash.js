
const llSegmentMiddleware = require('./helpers/LLsegment.js');

function CustomMiddlewareFactory(/*config*/) {
  return function (request, response, next ) {
    if (`${request.url}`.startsWith('/ll')) {
      return llSegmentMiddleware(request, response);
    }
    next();
  }
}

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai', 'webpack'],

    plugins: [
      'karma-webpack',
      'karma-mocha',
      'karma-chai',
      'karma-mocha-reporter',
      'karma-chrome-launcher',
      { 'middleware:custom': ['factory', CustomMiddlewareFactory] }
    ],

    middleware: ['custom'],

    // list of files / patterns to load in the browser
    // https://github.com/webpack-contrib/karma-webpack#alternative-usage
    files: [
      { pattern: '../test/browserunit/**/*.js', watched: false },
      { pattern: '../src/**/*.js', watched: false, included: false },
    ],

    // list of files / patterns to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      // add webpack as preprocessor
      '../test/browserunit/**/*.js': ['webpack']
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha'],

    webpack: {

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


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['ChromeHeadless'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
