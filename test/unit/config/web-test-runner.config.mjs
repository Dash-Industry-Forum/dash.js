import { playwrightLauncher } from '@web/test-runner-playwright';
import { defaultReporter } from '@web/test-runner';
import { junitReporter } from '@web/test-runner-junit-reporter';
import { rollupBundlePlugin } from '@web/dev-server-rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import rollupBabel from '@rollup/plugin-babel';
import fs from 'fs';
import path from 'path';

// Parse grep pattern from GREP environment variable.
// Usage: GREP="EventBus" npm test
// The npm scripts for filtered runs (e.g. test-refplayer) set this automatically.
const grep = process.env.GREP || undefined;

// Discover all test files for the rollup bundle plugin input
function _findTestFiles(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(..._findTestFiles(fullPath));
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}
const testFiles = _findTestFiles('test/unit/test');

// Resolve project root directory (the rootDir is relative to this config file)
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../');

// MIME types for static test data files
const MIME_TYPES = {
    '.xml': 'application/xml',
    '.mpd': 'application/dash+xml',
    '.mp4': 'video/mp4',
    '.m4s': 'video/iso.segment',
    '.vtt': 'text/vtt',
    '.ttml': 'application/ttml+xml',
    '.txt': 'text/plain',
    '.json': 'application/json',
};

export default {
    // Test file patterns
    files: ['test/unit/test/**/*.js'],

    // Root directory for serving files (project root so src/ and test/ are accessible)
    rootDir: '../../../',

    // Test framework configuration
    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '90000',
            ...(grep ? { grep } : {}),
        },
    },

    // Browser launchers
    browsers: [
        playwrightLauncher({ product: 'chromium' }),
        playwrightLauncher({ product: 'firefox' }),
        playwrightLauncher({ product: 'webkit' }),
    ],

    // Concurrency settings
    concurrency: 1,
    concurrentBrowsers: 2,

    // Timeouts
    browserStartTimeout: 60000,
    testsStartTimeout: 30000,
    testsFinishTimeout: 120000,

    // Coverage configuration
    coverage: true,
    coverageConfig: {
        include: ['src/**/*.js'],
        exclude: ['**/node_modules/**', 'test/**'],
        report: true,
        reportDir: 'test/unit/results/coverage',
        reporters: ['html', 'lcov'],
        nativeInstrumentation: true, // Playwright launcher checks window.__coverage__ (from babel-plugin-istanbul) first, then falls back to V8 native
    },

    // Reporters
    reporters: [
        defaultReporter({ reportTestResults: true, reportTestProgress: true }),
        junitReporter({
            outputPath: 'test/unit/results/junit/test-results.xml',
            reportLogs: true,
        }),
    ],

    // Custom middleware to serve static test data files (XML, MP4, VTT, etc.)
    // These are not processed by rollup but need to be accessible via fetch() in tests.
    middleware: [
        function serveTestData(context, next) {
            const url = context.url;
            if (url.startsWith('/test/unit/data/')) {
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

    // Use rollupBundlePlugin to properly bundle each test file with its dependencies.
    // This handles CJS-to-ESM conversion for packages like imsc, codem-isoboxer,
    // fast-deep-equal, path-browserify, and chai that only provide CommonJS exports.
    plugins: [
        rollupBundlePlugin({
            rollupConfig: {
                input: testFiles,
                plugins: [
                    rollupNodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        exportConditions: ['browser', 'import', 'default'],
                    }),
                    rollupCommonjs(),
                    rollupBabel({
                        include: ['src/**/*.js'],
                        babelHelpers: 'bundled',
                        plugins: ['istanbul'],
                    }),
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
