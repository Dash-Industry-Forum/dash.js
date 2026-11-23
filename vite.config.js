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

import { defineConfig } from 'vite-plus';
import { playwright } from '@vitest/browser-playwright';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

// Vite+ is adopted one tool at a time, see docs/adr/0001-adopt-vite-plus-incrementally.md.
// Only the unit tests use it so far; build, lint and functional tests are unchanged.
export default defineConfig({
    resolve: {
        alias: {
            // The tests import chai 4 directly. Without the alias, Vite resolves the chai 6
            // that Vitest ships, which has no default export.
            chai: require.resolve('chai'),
            // imsc uses sax, which expects the Node stream module. The webpack build has the same fallback.
            stream: require.resolve('stream-browserify'),
            // readable-stream (used by stream-browserify) maps util to false for browsers and falls back to
            // no-ops without it. Vite's default stand-in would log a warning on every access.
            util: fileURLToPath(new URL('./test/unit/config/empty-module.js', import.meta.url))
        }
    },
    optimizeDeps: {
        include: ['chai', 'stream-browserify', 'imsc']
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
            reportOnFailure: true
        }
    }
});
