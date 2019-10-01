define(function(require) {

    var intern = require('intern');
    var osConfig = require('./config/os');
    var seleniumConfigs = require('./config/selenium');
    var applications = require('./config/applications');

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Selenium configuration
    var seleniumConfig = seleniumConfigs.local;

    var conf = {

        // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
        maxConcurrency: 1,

        // Functional test suite(s) to run in each browser once non-functional tests are completed
        functionalSuites: ['test/functional/tests'],

        // The amount of time, in milliseconds, an asynchronous test can run before it is considered timed out. By default this value is 30 seconds.
        defaultTimeout: 30000,

        // A regular expression matching URLs to files that should not be included in code coverage analysis
        excludeInstrumentation: /^tests|bower_components|node_modules|testIntern/,

        // to keep browser opened at the end of the test
        leaveRemoteOpen: false
    };

    // Selenium configuration from command line
    if (intern.args.selenium) {
        seleniumConfig = seleniumConfigs[intern.args.selenium];
    }

    // Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
    // OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
    // capabilities options specified for an environment will be copied as-is
    var os = 'windows';
    var browsers = ['all'];
    if (intern.args.os) {
        os = intern.args.os;
    }

    conf.environments = [];
    if (intern.args.browsers) {
        browsers = intern.args.browsers.split(',');
    }
    browsers.forEach(function(browser) {
        if (osConfig[os] && osConfig[os][browser]) {
            conf.environments = conf.environments.concat(osConfig[os][browser]);
        }
    });

    conf.functionalSuites = ['test/functional/tests'];

    conf = Object.assign(conf, seleniumConfig);
    // console.log("Selenium configuration:\n", JSON.stringify(conf, null, '  '));

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Tests configuration parameters

    // Tests configuration from command line

    // protocol
    conf.protocol = 'https';
    if (intern.args.protocol) {
        conf.protocol = intern.args.protocol;
    }

    // application
    conf.testPage = applications.local;
    if (intern.args.app) {
        conf.testPage = applications[intern.args.app];
        // conf.smoothEnabled = decodeURIComponent((new RegExp('[?|&]mss=' + '([^&;]+?)(&|#|;|$)').exec(conf.testPage)||[,""])[1].replace(/\+/g, '%20')) || 'false';
    }

    if (intern.args.appurl) {
        conf.testPage = intern.args.appurl;
    }

    // Set application protocol
    conf.testPage = conf.protocol + '://' + conf.testPage

    console.log('conf.testPage: ' + conf.testPage);

    // tests suites
    if (intern.args.testSuites) {
        conf.testSuites = intern.args.testSuites;
    }

    // Test stream
    if (intern.args.stream) {
        conf.testStream = intern.args.stream;
    }

    // Debug logs
    conf.debug = intern.args.debug ? true : false;

    // console.log(JSON.stringify(conf, null, '  '));

    return conf;
});