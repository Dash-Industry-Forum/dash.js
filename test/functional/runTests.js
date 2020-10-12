var intern = require('intern').default;
var browsers = require('./config/browsers.json');
var applications = require('./config/applications.json');
var yargs = require('yargs');
var args = yargs
    .usage('$0 --os [--type major|minor|patch] [--ver <version>] \n$0 --finish')
    .default('type', 'minor')
    .argv;

// console.log(args);

var config = {

    // The maximum number of sessions to drive concurrently
    maxConcurrency: 1,

    // Functional test suite(s) to run in each browser
    functionalSuites: ['test/functional/testSuites.js'],

    // The amount of time, in milliseconds, an asynchronous test can run before it is considered timed out. By default this value is 30 seconds.
    defaultTimeout: 30000,

    // to keep browser opened at the end of the test
    leaveRemoteOpen: false
};

///////////////////////////////////////////////////////////////////////////////////////////////
// Selenium configuration
var local = {
    proxyUrl: 'http://127.0.0.1:3555',
    proxyPort: 3555,
    tunnel: 'null',
    tunnelOptions: {
        hostname: '127.0.0.1',
        port: '4444',
        verbose: true
    },
    capabilities: {
        'selenium-version': '3.4.0'
    },
    leaveRemoteOpen:'fail'
};

var remote = {
    capabilities: {
        name: 'Tests DashJS',
        build: process.env.BROWSERSTACK_LOCAL_IDENTIFIER || 'BROWSERSTACK_LOCAL_IDENTIFIER',
        'browserstack.local': false,
        'browserstack.debug': true,
        fixSessionCapabilities: false
    },
    tunnel: 'browserstack',
    tunnelOptions: {
        username: process.env.BROWSERSTACK_USER || 'BROWSERSTACK_USER',
        accessKey: process.env.BROWSERSTACK_ACCESS_KEY || 'BROWSERSTACK_ACCESS_KEY',
        verbose: true
    }
};

var seleniumConfig = args.selenium === 'remote' ? remote : local;
config = Object.assign(config, seleniumConfig);

///////////////////////////////////////////////////////////////////////////////////////////////
// Browsers / OS configuration
var os = 'windows';
if (args.os) {
    os = args.os;
}

var browserNames = Object.keys(browsers[os]);
if (args.browsers) {
    browserNames = browserNames.filter(name => args.browsers.split(',').includes(name));
}

config.environments = [];
browserNames.forEach(name => {
    config.environments = config.environments.concat(browsers[os][name]);
});

///////////////////////////////////////////////////////////////////////////////////////////////
// Reporters
config.reporters = [];
var reportersNames = args.reporters ? args.reporters.split(',') : ['runner'];
reportersNames.forEach(name => {
    let reporter = {
        name: name
    };
    if (name === 'junit') {
        reporter.options = {
            filename: 'test/functional/reports/junit/results_' + (new Date().getFullYear())+'-'+(new Date().getMonth()+1)+'-'+(new Date().getDate())+'_'+(new Date().getHours())+'-'+(new Date().getMinutes()) + '.xml'
        }
    }
    config.reporters.push(reporter);
})

///////////////////////////////////////////////////////////////////////////////////////////////
// Tests configuration parameters

// Tests configuration from command line

// protocol
config.protocol = 'https';
if (args.protocol) {
    config.protocol = args.protocol;
}

// application
config.testPage = applications.local;
if (args.app) {
    config.testPage = applications[args.app];
    // config.smoothEnabled = decodeURIComponent((new RegExp('[?|&]mss=' + '([^&;]+?)(&|#|;|$)').exec(config.testPage)||[,''])[1].replace(/\+/g, '%20')) || 'false';
}

if (args.appurl) {
    config.testPage = args.appurl;
}

// Set application protocol
if (!config.testPage.startsWith('http')) {
    config.testPage = config.protocol + '://' + config.testPage
};


// tests suites
if (args.testSuites) {
    config.testSuites = args.testSuites;
}

// Test stream
if (args.stream) {
    config.stream = args.stream;
}

// Debug logs
config.debug = args.debug ? true : false;

// console.log(JSON.stringify(config, null, '  '));

// console.log(intern);
intern.configure(config);
intern.run();
