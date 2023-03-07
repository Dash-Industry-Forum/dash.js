const intern = require('intern').default;
const browsers = require('./config/browsers.json');
const applications = require('./config/applications.json');
const yargs = require('yargs');
const os = require('os');

const DEFAULT_SOURCE_PATH = './samples/dash-if-reference-player/app/sources.json';

var args = yargs
    .usage('$0 [options]')
    .alias('h', 'help')
    .help(true)
    .options({
        'selenium': {
            describe: 'The selenium configuration preset name',
            choices: ['local', 'remote'],
            default: 'local'
        },
        'reporters': {
            describe: 'Reporters types (separated by \",\", see intern.io documentation)',
            default: 'pretty'
        },
        'os': {
            describe: 'The OS platform on which tests must be executed (for test on local desktop, os is detected)',
            choices: ['windows', 'mac'],
            default: 'windows'
        },
        'browsers': {
            describe: 'Browser names among \"chrome\", \"firefox\" and \"edge\" (separated by \",\")',
            default: 'chrome'
        },
        'app': {
            describe: 'Application names',
            choices: ['local', 'remote'],
            default: 'local'
        },
        'protocol': {
            describe: 'The http protocol for loading application',
            choices: ['https', 'http'],
            default: 'https'
        },
        'testSuites': {
            describe: 'The test suites names (\"play\", \"playFromTime\", \"pause\", ...) to execute (separated by \",\")',
            default: 'all'
        },
        'streams': {
            describe: 'Name filter for streams to be tested',
            default: 'all'
        },
        'source': {
            describe: 'Path to the JSON file containing the testvectors',
            default: DEFAULT_SOURCE_PATH
        },
        'mpd': {
            describe: 'Manifest url of the stream to be tested',
            default: ''
        },
        'debug': {
            describe: 'Output log/debug messages',
            type: 'boolean',
            default: 'false'
        },
        'groupname': {
            describe: 'Group name that the stream needs to belong to. Only applied if a groupname is present such as in the list of reference vectors.',
            default: ''
        }
    })
    .parse();

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
var seleniumConfig = {
    local: {
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
    },
    remote: {
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
    }
};

config = Object.assign(config, seleniumConfig[args.selenium]);

///////////////////////////////////////////////////////////////////////////////////////////////
// Browsers / OS configuration

var osName = args.os;

// For local testing, detect the OS
if (args.selenium === 'local') {
    const platform = os.platform();
    switch (platform) {
        case 'win32':
        case 'win64':
            osName = 'windows';
            break;
        case 'darwin':
            osName = 'mac';
            break;
        default:
            console.log('Unsupported platform: ' + platform);
            process.exit();
    }
}

var browserNames = Object.keys(browsers[osName]);
if (args.browsers) {
    browserNames = browserNames.filter(name => args.browsers.split(',').includes(name));
}

config.environments = [];
browserNames.forEach(name => {
    config.environments = config.environments.concat(browsers[osName][name]);
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
        };
    }
    config.reporters.push(reporter);
});

///////////////////////////////////////////////////////////////////////////////////////////////
// Tests configuration parameters

// Tests configuration from command line

// protocol
config.protocol = args.protocol;

// application
config.testPage = applications[args.app];

if (args.appurl) {
    config.testPage = args.appurl;
}

// Set application protocol
if (!config.testPage.startsWith('http')) {
    config.testPage = config.protocol + '://' + config.testPage;
}


// tests suites
if (args.testSuites !== 'all') {
    config.testSuites = args.testSuites;
}

// Test streams
if (args.streams !== 'all') {
    config.streams = args.streams;
}

if (args.mpd !== '') {
    config.mpd = args.mpd;
}

if (args.groupname !== '') {
    config.groupname = args.groupname;
}

config.source = args.source;

// Debug logs
config.debug = args.debug;

// console.log(JSON.stringify(config, null, '  '));

// console.log(intern);
intern.configure(config);
intern.run();
