const fs = require('fs');
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { playwrightLauncher } = require('@web/test-runner-playwright');
const { chromeLauncher } = require('@web/test-runner-chrome');
const { esbuildPlugin } = require('@web/dev-server-esbuild');
const rollupCommonjs = require('@rollup/plugin-commonjs');
const { fromRollup } = require('@web/dev-server-rollup');
const commonjs = fromRollup(rollupCommonjs);


const argv = yargs(hideBin(process.argv)).parse()
// Find the settings JSON object in the command arguments
const configFileName = argv.configfile
const streamsFileName = argv.streamsfile

if (!configFileName) {
    return
}

let testConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/${configFileName}.json`, 'utf-8'));
const streamsConfiguration = JSON.parse(fs.readFileSync(`test/functional/config/test-configurations/streams/${streamsFileName}.json`, 'utf-8'));
const includedTestfiles = _getIncludedTestfiles(streamsConfiguration);
const excludedTestfiles = _getExcludedTestfiles(streamsConfiguration);
const testvectors = streamsConfiguration.testvectors;

if (testConfiguration && testConfiguration.type && testConfiguration.type === 'lambdatest') {
    testConfiguration = _adjustConfigurationForLambdatest(testConfiguration)
}

module.exports = {

    // base path that will be used to resolve all patterns (eg. files, exclude)
    rootDir: '../../../',

    // web server port
    //hostname: testConfiguration.hostname ? testConfiguration.hostname : 'localhost',
    //port: testConfiguration.port ? testConfiguration.port : 9876,
    //protocol: testConfiguration.protocol ? testConfiguration.protocol : 'http',


    // list of files / patterns to load in the browser
    files: [
        '!test/functional/test/common/*.js',
    ].concat(includedTestfiles).concat(excludedTestfiles),

    // JS language target to compile down to using esbuild. Recommended value is "auto", which compiles based on user-agent.
    esbuildTarget: 'auto',

    // whether to analyze code coverage
    coverage: true,

    // amount of browsers to run concurrently
    concurrentBrowsers: 1,

    //whether to run tests with @web/test-runner-playwright
    playwright: true,

    // 	Resolve bare module imports using node resolution.
    nodeResolve: true,

    browsers: [
        chromeLauncher({
            launchOptions: {
                headless: false,
                devtools: false,
                args: [
                    "--disable-web-security",
                    "--autoplay-policy=no-user-gesture-required",
                    "--disable-popup-blocking",
                    "--disable-background-timer-throttling"
                ]
            }
        })
    ],

    plugins: [
        commonjs({
            include: [
                'dist/dash.all.min.js',
            ],
        })
    ],

    testFramework: {
        config: {
            timeout: '90000'
        }
    },

    debug: true,

    testRunnerHtml: function (testFramework) {
        return `<html>
            <head>
                <title>dash.js test</title>
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            </head>
          <body>
            <div id="ttml-rendering-div"></div>
            <div id="ad-ui"></div>
            <video id="video-element" controls style="width: 640px; height: 480px; background-color: black" muted></video>
            <script>
                window.testrunnerConfig = ${JSON.stringify({ 'testvectors': testvectors })};
            </script>
            <script type="module" src="${testFramework}"></script>
          </body>
        </html>`
    },
}

function _getIncludedTestfiles(testConfiguration) {

    if (!testConfiguration || !testConfiguration.testfiles) {
        return []
    }

    if (!testConfiguration.testfiles.included || testConfiguration.testfiles.included.indexOf('all') >= 0) {
        return [`test/functional/test/**/*.js`]
    }

    return testConfiguration.testfiles.included.map((entry) => {
        return `test/functional/test/${entry}.js`
    })
}

function _getExcludedTestfiles(testConfiguration) {
    if (!testConfiguration || !testConfiguration.testfiles || !testConfiguration.testfiles.excluded) {
        return []
    }

    return testConfiguration.testfiles.excluded.map((entry) => {
        return `!test/functional/test/${entry}.js`
    })
}

function _adjustConfigurationForLambdatest(testConfiguration) {
    if (testConfiguration && testConfiguration.customLaunchers) {
        Object.keys(testConfiguration.customLaunchers).forEach((key) => {
            testConfiguration.customLaunchers[key].user = process.env.LAMBDATEST_USER;
            testConfiguration.customLaunchers[key].accessKey = process.env.LAMBDATEST_ACCESS_KEY;
            testConfiguration.customLaunchers[key].config = {
                hostname: 'hub.lambdatest.com',
                port: 80
            };
        })
    }

    return testConfiguration
}
