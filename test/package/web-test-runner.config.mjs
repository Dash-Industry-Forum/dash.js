import { playwrightLauncher } from '@web/test-runner-playwright';
import { defaultReporter } from '@web/test-runner';
import { rollupBundlePlugin } from '@web/dev-server-rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import path from 'path';

// Runs the package smoke test in headless Chromium. The spec imports 'dashjs', which is
// resolved from the tarball installed into test/compliance/vite-consumer/node_modules
// by test/package/verify-package.mjs - run that script instead of this config directly.
const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../');

export default {
    files: ['test/package/smoke.spec.js'],

    rootDir: '../../',

    testFramework: {
        config: {
            ui: 'bdd',
            timeout: '60000',
        },
    },

    browsers: [
        playwrightLauncher({
            product: 'chromium',
            launchOptions: {
                args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
            },
        }),
    ],

    concurrency: 1,

    browserStartTimeout: 60000,
    testsStartTimeout: 30000,
    testsFinishTimeout: 120000,

    coverage: false,

    reporters: [
        defaultReporter({ reportTestResults: true, reportTestProgress: true }),
    ],

    plugins: [
        rollupBundlePlugin({
            rollupConfig: {
                input: ['test/package/smoke.spec.js'],
                plugins: [
                    rollupNodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        exportConditions: ['browser', 'import', 'default'],
                        // Resolve 'dashjs' from the consumer app's node_modules, i.e. the
                        // tarball install, through the package's real exports map.
                        modulePaths: [
                            path.join(projectRoot, 'test/compliance/vite-consumer/node_modules'),
                            path.join(projectRoot, 'node_modules'),
                        ],
                    }),
                    rollupCommonjs(),
                ],
                output: {
                    format: 'es',
                },
            },
        }),
    ],

    browserLogs: true,
    filterBrowserLogs: (log) => log.type === 'error' || log.type === 'warn',
};
