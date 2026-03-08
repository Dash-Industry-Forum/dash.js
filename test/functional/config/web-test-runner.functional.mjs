import { webdriverLauncher } from '@web/test-runner-webdriver';
import { playwrightLauncher } from '@web/test-runner-playwright';
import { defaultReporter } from '@web/test-runner';
import { junitReporter } from '@web/test-runner-junit-reporter';
import { rollupBundlePlugin } from '@web/dev-server-rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Configuration selection via environment variables:
//   CONFIGFILE=local STREAMSFILE=smoke npm run test-functional
//   CONFIGFILE=lambdatest STREAMSFILE=single npx web-test-runner --config <this-file>
// ---------------------------------------------------------------------------
const configfile = process.env.CONFIGFILE || 'local';
const streamsfile = process.env.STREAMSFILE || 'smoke';

// ---------------------------------------------------------------------------
// Load configuration JSONs
// ---------------------------------------------------------------------------
const configDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(configDir, '../../../');

const testConfiguration = JSON.parse(
    fs.readFileSync(path.join(configDir, `test-configurations/${configfile}.json`), 'utf-8')
);
const streamsConfiguration = JSON.parse(
    fs.readFileSync(path.join(configDir, `test-configurations/streams/${streamsfile}.json`), 'utf-8')
);

const testvectors = streamsConfiguration.testvectors;

// ---------------------------------------------------------------------------
// Determine which test files to include/exclude
// ---------------------------------------------------------------------------
function _getIncludedTestfiles(streamsConfig) {
    if (!streamsConfig || !streamsConfig.testfiles) {
        return [];
    }

    if (!streamsConfig.testfiles.included || streamsConfig.testfiles.included.indexOf('all') >= 0) {
        return ['test/functional/test/**/*.js'];
    }

    return streamsConfig.testfiles.included.map((entry) => `test/functional/test/${entry}.js`);
}

function _getExcludedTestfiles(streamsConfig) {
    const excluded = ['test/functional/test/common/*.js'];

    if (streamsConfig && streamsConfig.testfiles && streamsConfig.testfiles.excluded) {
        streamsConfig.testfiles.excluded.forEach((entry) => {
            excluded.push(`test/functional/test/${entry}.js`);
        });
    }

    return excluded;
}

const includedFiles = _getIncludedTestfiles(streamsConfiguration);
const excludedFiles = _getExcludedTestfiles(streamsConfiguration);

// ---------------------------------------------------------------------------
// Discover test files for rollup input (rollupBundlePlugin needs explicit paths)
// ---------------------------------------------------------------------------
function _walkDir(dir, filePattern, results) {
    if (!fs.existsSync(dir)) {
        return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            _walkDir(fullPath, filePattern, results);
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
}

function _matchSimpleGlob(filePath, pattern) {
    // Handle patterns like 'test/functional/test/common/*.js'
    // and 'test/functional/test/vendor/google-ad-manager-emsg.js'
    if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$');
        return regex.test(filePath);
    }
    return filePath === pattern;
}

// Collect test files
const testFilesList = [];
includedFiles.forEach((pattern) => {
    const dir = path.join(projectRoot, 'test/functional/test');
    _walkDir(dir, '*.js', testFilesList);
});

// Deduplicate and filter
const uniqueTestFiles = [...new Set(testFilesList)].filter((file) => {
    const relPath = path.relative(projectRoot, file);
    return !excludedFiles.some((exPattern) => _matchSimpleGlob(relPath, exPattern));
});

// For rollup input we need relative paths from projectRoot
const rollupInputFiles = uniqueTestFiles.map((f) => path.relative(projectRoot, f));

// ---------------------------------------------------------------------------
// Build browser launchers from test configuration
// ---------------------------------------------------------------------------

// Map WebDriver browserName values to Playwright product names
const BROWSER_TO_PLAYWRIGHT = {
    'chrome': 'chromium',
    'chromium': 'chromium',
    'microsoftedge': 'chromium',
    'firefox': 'firefox',
    'safari': 'webkit',
    'webkit': 'webkit',
};

function _buildBrowserLaunchers(config) {
    const launchers = [];

    if (!config.browsers || config.browsers.length === 0) {
        throw new Error('No browsers defined in test configuration');
    }

    if (config.type === 'lambdatest') {
        // ---------------------------------------------------------------
        // Remote (LambdaTest): use webdriverLauncher via WebDriver protocol
        // ---------------------------------------------------------------
        config.browsers.forEach((browser) => {
            const wdioOptions = {
                capabilities: { ...browser.capabilities },
            };

            wdioOptions.hostname = config.hostname || 'hub.lambdatest.com';
            wdioOptions.port = config.port || 80;
            wdioOptions.path = '/wd/hub';
            wdioOptions.protocol = config.protocol || 'http';

            // Inject LT credentials into capabilities
            if (!wdioOptions.capabilities['LT:Options']) {
                wdioOptions.capabilities['LT:Options'] = {};
            }
            wdioOptions.capabilities['LT:Options'].user = process.env.LT_USERNAME;
            wdioOptions.capabilities['LT:Options'].accessKey = process.env.LT_ACCESS_KEY;

            launchers.push(webdriverLauncher(wdioOptions));
        });
    } else {
        // ---------------------------------------------------------------
        // Local: use playwrightLauncher (auto-manages browser lifecycle)
        // ---------------------------------------------------------------
        config.browsers.forEach((browser) => {
            const browserName = (browser.capabilities.browserName || '').toLowerCase();
            const product = BROWSER_TO_PLAYWRIGHT[browserName];

            if (!product) {
                console.warn(
                    `[WTR] Skipping browser "${browser.name}" — unsupported browserName "${browserName}" for Playwright.`
                );
                return;
            }

            // Extract browser-specific launch options from capabilities
            const args = [];
            let channel;
            if (product === 'chromium') {
                const chromeOpts = browser.capabilities['goog:chromeOptions']
                    || browser.capabilities['ms:edgeOptions']
                    || {};
                if (Array.isArray(chromeOpts.args)) {
                    args.push(...chromeOpts.args);
                }
                // Use channel to launch system-installed browser (e.g. "chrome", "msedge")
                // instead of Playwright's bundled Chromium which lacks proprietary codecs (H.264/AAC)
                if (chromeOpts.channel) {
                    channel = chromeOpts.channel;
                }
            }

            const launchOptions = {
                headless,
                channel,
                args: args.length > 0 ? args : undefined,
            };

            // Playwright adds --disable-component-update by default, which prevents
            // Chrome from loading the Widevine CDM component. This causes all DRM
            // content codec checks (via navigator.mediaCapabilities.decodingInfo with
            // keySystemConfiguration) to fail, filtering out all Representations.
            // Remove this flag so Widevine loads and DRM content plays correctly.
            if (product === 'chromium') {
                launchOptions.ignoreDefaultArgs = ['--disable-component-update'];
            }

            launchers.push(
                playwrightLauncher({
                    product,
                    launchOptions,
                })
            );
        });

        if (launchers.length === 0) {
            throw new Error('No supported browsers found in test configuration for Playwright.');
        }
    }

    return launchers;
}

// Headless mode: default true, set to false in local JSON to see browser windows.
// Only relevant for local (Playwright) runs; LambdaTest always runs remotely.
const headless = testConfiguration.headless !== false;

const browsers = _buildBrowserLaunchers(testConfiguration);

// ---------------------------------------------------------------------------
// Custom HTML template with <video> element and Google IMA DAI SDK
// ---------------------------------------------------------------------------
function testRunnerHtml(testFramework) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>dash.js functional test</title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</head>
<body>
    <div id="ttml-rendering-div"></div>
    <div id="ad-ui"></div>
    <video id="video-element" controls style="width: 640px; height: 480px; background-color: black" muted></video>
    <script src="/test/functional/lib/ima3_dai.js"></script>
    <script src="/testvectors.js"></script>
    <script type="module" src="${testFramework}"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// MIME types for static files
// ---------------------------------------------------------------------------
const MIME_TYPES = {
    '.mpd': 'application/dash+xml',
    '.mp4': 'video/mp4',
    '.m4s': 'video/iso.segment',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
};

// ---------------------------------------------------------------------------
// Export configuration
// ---------------------------------------------------------------------------
export default {
    // Test file patterns
    files: includedFiles,
    excludeFiles: excludedFiles,

    // Root directory for serving files (project root)
    rootDir: '../../../',

    // Test framework configuration (Mocha)
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '100000',
        },
    },

    // Browser launchers (built from test configuration JSON)
    browsers,

    // Concurrency settings
    // - parallelTestFiles: how many test files run simultaneously within each browser
    //   (auto-capped to 1 when headless is false to avoid window explosion)
    // - parallelBrowsers: how many browser types run simultaneously
    concurrency: (!headless) ? 1 : (testConfiguration.parallelTestFiles || 1),
    concurrentBrowsers: testConfiguration.parallelBrowsers || (testConfiguration.browsers ? testConfiguration.browsers.length : 1),

    // Timeouts
    browserStartTimeout: 600000,
    testsStartTimeout: 60000,
    testsFinishTimeout: 600000,

    // No coverage for functional tests
    coverage: false,

    // Reporters
    reporters: [
        defaultReporter({ reportTestResults: true, reportTestProgress: true }),
        junitReporter({
            outputPath: 'test/functional/results/test/junit/test-results.xml',
            reportLogs: true,
        }),
    ],

    // Custom HTML template with <video> element
    testRunnerHtml,

    // Middleware: serve testvectors as a JS module + static files
    middleware: [
        // Serve testvectors as a global script
        function serveTestvectors(context, next) {
            if (context.url === '/testvectors.js') {
                context.type = 'application/javascript';
                context.body = `window.__testvectors__ = ${JSON.stringify(testvectors)};`;
                return;
            }
            return next();
        },

        // Serve static test files (MPDs, JS libs, etc.)
        function serveStaticFiles(context, next) {
            const url = context.url;
            if (url.startsWith('/test/functional/')) {
                const filePath = path.join(projectRoot, url);
                if (fs.existsSync(filePath)) {
                    const ext = path.extname(filePath);
                    context.type = MIME_TYPES[ext] || 'application/octet-stream';
                    context.body = fs.readFileSync(filePath);
                    return;
                }
            }
            return next();
        },
    ],

    // Use rollupBundlePlugin to bundle test files with their dependencies.
    // Functional tests import from pre-built dist/ files (ESM) but also need
    // chai and ua-parser-js which may require CJS-to-ESM conversion.
    plugins: [
        rollupBundlePlugin({
            rollupConfig: {
                input: rollupInputFiles,
                plugins: [
                    rollupNodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        exportConditions: ['browser', 'import', 'default'],
                    }),
                    rollupCommonjs(),
                ],
                output: {
                    format: 'es',
                },
            },
        }),
    ],

    // Browser logs
    browserLogs: true,
    filterBrowserLogs: (log) => log.type === 'error' || log.type === 'warn',
};
