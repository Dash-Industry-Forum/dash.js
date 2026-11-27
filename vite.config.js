/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

import { defineConfig, normalizePath } from 'vite-plus';
import { playwright } from '@vitest/browser-playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Vite module ids use forward slashes on every platform, also on Windows
const unitTestDir = normalizePath(fileURLToPath(new URL('./test/unit/', import.meta.url)));

// The unit tests import chai 4 as 'chai', while Vitest imports its own chai 6 under the same name.
// Vite pre-bundles both under the key 'chai', so only one of them can win, and a global alias would
// hand chai 4 to Vitest's expect as well. Rename the tests' import to chai4 (aliased below) before
// Vite resolves it; a resolveId hook would be too late, since Vite maps pre-bundled bare imports first.
function unitTestChai() {
    const chaiImport = /(\bfrom\s*|\bimport\s*\(?\s*)(['"])chai\2/g;
    return {
        name: 'dashjs:unit-test-chai',
        enforce: 'pre',
        transform(code, id) {
            if (!id.startsWith(unitTestDir) || !code.includes('chai')) {
                return null;
            }
            const renamed = code.replace(chaiImport, '$1$2chai4$2');
            return renamed === code ? null : { code: renamed, map: null };
        }
    };
}

export default defineConfig({
    plugins: [unitTestChai()],
    resolve: {
        alias: {
            // chai 4 from the root node_modules, see unitTestChai()
            chai4: require.resolve('chai'),
            // imsc uses sax, which expects the Node stream module. The webpack build has the same fallback.
            stream: require.resolve('stream-browserify'),
            // readable-stream (used by stream-browserify) maps util to false for browsers and falls back to
            // no-ops without it. Vite's default stand-in would log a warning on every access.
            util: fileURLToPath(new URL('./test/unit/config/empty-module.js', import.meta.url))
        }
    },
    optimizeDeps: {
        include: ['chai4', 'stream-browserify', 'imsc']
    },
    test: {
        include: ['test/unit/test/**/*.js'],
        exclude: ['test/unit/test/**/__screenshots__/**'],
        globals: true,
        restoreMocks: true,
        // Show console output only for failing tests
        silent: 'passed-only',
        setupFiles: ['test/unit/config/vitest.setup.js'],
        testTimeout: 90000,
        hookTimeout: 90000,
        reporters: ['default', ['junit', { outputFile: 'test/unit/results/junit/results.xml' }]],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }]
        },
        coverage: {
            provider: 'istanbul',
            // Every source file counts, including the ones no test loads.
            include: ['src/**/*.js'],
            reportsDirectory: 'test/unit/results/coverage',
            reporter: [
                'html',
                ['lcovonly', { file: 'lcov.info' }],
                ['json-summary', { file: 'coverage-summary.json' }],
                'text-summary'
            ],
            reportOnFailure: true,
            // Coverage floor: the run fails below these values. Pull requests that raise coverage raise
            // the floor as well (#5210); it never goes down.
            thresholds: {
                lines: 57.33,
                functions: 56.58,
                statements: 57.19,
                branches: 50.62
            }
        }
    }
});
