define(function(require) {

    var intern = require('intern');

    var osConfig = require('./config/os');
    var seleniumConfigs = require('./config/selenium');
    var applications = require('./config/applications');
    var testsConfig = require('./config/testsConfig');
    var testsSuites = require('./config/testsSuites');

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Selenium configuration
    var seleniumConfig = seleniumConfigs.local;

    var conf = {

        // Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
        maxConcurrency: 1,

        // Functional test suite(s) to run in each browser once non-functional tests are completed
        functionalSuites: testsSuites.all,

        // The amount of time, in milliseconds, an asynchronous test can run before it is considered timed out. By default this value is 30 seconds.
        defaultTimeout: 60000,

        // A regular expression matching URLs to files that should not be included in code coverage analysis
        excludeInstrumentation : /^tests|bower_components|node_modules|testIntern/,

        // to keep browser opened at the end of the test
        leaveRemoteOpen : false
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

    if (intern.args.browsers) {
        browsers = intern.args.browsers.split(',');
    }

    conf.environments = [];
    browsers.forEach(function(browser) {
        if (osConfig[os] && osConfig[os][browser]) {
            conf.environments = conf.environments.concat(osConfig[os][browser]);
        }
    });
    if (intern.args.tests) {
        var tests = intern.args.tests.split(',');
        conf.functionalSuites = [];
        tests.forEach(function(test) {
            conf.functionalSuites = conf.functionalSuites.concat(testsSuites[test]);
        });
    }

    conf = Object.assign(conf, seleniumConfig);
    // console.log("Selenium configuration:\n", conf);

    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Tests configuration parameters

    // Tests configuration from command line

    // application
    testsConfig.testPage = applications.local;
    if (intern.args.app) {
        testsConfig.testPage = applications[intern.args.app];
        testsConfig.smoothEnabled = decodeURIComponent((new RegExp('[?|&]mss=' + '([^&;]+?)(&|#|;|$)').exec(testsConfig.testPage)||[,""])[1].replace(/\+/g, '%20')) || 'false';
    }

    if (intern.args.appurl) {
        testsConfig.testPage = intern.args.appurl;
    }

    return conf;
});