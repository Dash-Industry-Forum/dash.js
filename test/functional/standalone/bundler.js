/**
 * Rollup-based bundler for functional test files.
 *
 * Bundles each test file into a self-contained module that can be loaded
 * in a browser. Supports two output formats:
 *
 * - 'es' (default): ES modules loaded via dynamic import(). dash.js dist
 *   files are external imports rewritten to absolute server paths.
 *
 * - 'iife': Immediately-invoked function expressions loaded via <script>
 *   tags. dash.js dist files are mapped to the window.dashjs global (UMD).
 *   This mode works on browsers that do not support ES modules.
 *
 * This replicates the same Rollup configuration used by the WTR functional
 * test config (web-test-runner.functional.mjs) but runs standalone.
 */

import { rollup } from 'rollup';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import rollupCommonjs from '@rollup/plugin-commonjs';
import fs from 'fs';
import path from 'path';

/**
 * Walk a directory recursively and collect all .js files.
 * @param {string} dir - Directory to walk
 * @param {string[]} results - Accumulator array
 * @returns {string[]}
 */
function walkDir(dir, results = []) {
    if (!fs.existsSync(dir)) {
        return results;
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, results);
        } else if (entry.name.endsWith('.js')) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Simple glob matching for file include/exclude patterns.
 * @param {string} filePath - Relative file path
 * @param {string} pattern - Glob pattern (supports * and **)
 * @returns {boolean}
 */
function matchSimpleGlob(filePath, pattern) {
    if (pattern.includes('*')) {
        const regex = new RegExp(
            '^' + pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$'
        );
        return regex.test(filePath);
    }
    return filePath === pattern;
}

/**
 * Get the list of test files to bundle based on stream configuration.
 * @param {string} projectRoot - Absolute path to the project root
 * @param {object} streamsConfig - The parsed streams JSON configuration
 * @returns {string[]} Array of absolute file paths
 */
export function getTestFiles(projectRoot, streamsConfig) {
    const testDir = path.join(projectRoot, 'test/functional/test');

    // Determine included patterns
    let includedPatterns = ['test/functional/test/**/*.js'];
    if (
        streamsConfig &&
        streamsConfig.testfiles &&
        streamsConfig.testfiles.included &&
        streamsConfig.testfiles.included.indexOf('all') < 0
    ) {
        includedPatterns = streamsConfig.testfiles.included.map(
            (entry) => `test/functional/test/${entry}.js`
        );
    }

    // Determine excluded patterns (always exclude common/)
    const excludedPatterns = ['test/functional/test/common/*.js'];
    if (streamsConfig && streamsConfig.testfiles && streamsConfig.testfiles.excluded) {
        streamsConfig.testfiles.excluded.forEach((entry) => {
            excludedPatterns.push(`test/functional/test/${entry}.js`);
        });
    }

    // Collect all test files
    const allFiles = walkDir(testDir);

    // Filter by include/exclude
    const uniqueFiles = [...new Set(allFiles)].filter((file) => {
        const relPath = path.relative(projectRoot, file);
        // Must match at least one include pattern
        const isIncluded = includedPatterns.some((p) => matchSimpleGlob(relPath, p));
        // Must not match any exclude pattern
        const isExcluded = excludedPatterns.some((p) => matchSimpleGlob(relPath, p));
        return isIncluded && !isExcluded;
    });

    return uniqueFiles;
}

/**
 * Bundle test files using Rollup.
 *
 * Each test file is bundled into a self-contained ES module. The dash.js
 * dist files are marked as external since they are loaded separately.
 *
 * @param {string} projectRoot - Absolute path to the project root
 * @param {string[]} testFiles - Array of absolute test file paths
 * @param {string} outputDir - Directory to write bundled files to
 * @param {function} [onProgress] - Optional callback(file, index, total)
 * @param {'es'|'iife'} [format='es'] - Output format: 'es' for ESM, 'iife' for legacy
 * @returns {Promise<string[]>} Array of relative output paths
 */
export async function bundleTestFiles(projectRoot, testFiles, outputDir, onProgress, format = 'es') {
    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPaths = [];

    for (let i = 0; i < testFiles.length; i++) {
        const testFile = testFiles[i];
        const relPath = path.relative(path.join(projectRoot, 'test/functional/test'), testFile);

        if (onProgress) {
            onProgress(relPath, i, testFiles.length);
        }

        try {
            const bundle = await rollup({
                input: testFile,
                plugins: [
                    rollupNodeResolve({
                        browser: true,
                        preferBuiltins: false,
                        exportConditions: ['browser', 'import', 'default'],
                    }),
                    rollupCommonjs(),
                ],
                // Mark dash.js dist files as external - they're loaded via <script> tags.
                external: (id) => {
                    return id.includes('dist/modern/esm/');
                },
                // Prevent Rollup from making external paths relative (we want absolute server paths)
                makeAbsoluteExternalsRelative: false,
                onwarn: (warning) => {
                    // Suppress circular dependency warnings (common.js <-> DashJsAdapter.js)
                    // and IIFE missing name warnings (test files don't export anything)
                    if (warning.code === 'CIRCULAR_DEPENDENCY' || warning.code === 'MISSING_NAME_OPTION_FOR_IIFE_EXPORT') {
                        return;
                    }
                    console.warn(`  [rollup] ${warning.message}`);
                },
            });

            const outputPath = path.join(outputDir, relPath);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });

            var writeOptions;
            if (format === 'iife') {
                // IIFE mode: externals become global variable references.
                // dash.js UMD exposes window.dashjs with properties like
                // dashjs.MediaPlayer, dashjs.Debug, etc.
                writeOptions = {
                    file: outputPath,
                    format: 'iife',
                    globals: function (id) {
                        if (id.includes('dist/modern/esm/')) {
                            return 'dashjs';
                        }
                        return id;
                    },
                };
            } else {
                // ESM mode: rewrite external imports to absolute server paths.
                writeOptions = {
                    file: outputPath,
                    format: 'es',
                    paths: function (id) {
                        if (id.includes('dash.all.min.js')) {
                            return '/dist/modern/esm/dash.all.min.js';
                        }
                        if (id.includes('dash.mss.min.js')) {
                            return '/dist/modern/esm/dash.mss.min.js';
                        }
                        return id;
                    },
                };
            }

            await bundle.write(writeOptions);

            await bundle.close();
            outputPaths.push(relPath);
        } catch (err) {
            console.error(`  [bundler] Failed to bundle ${relPath}: ${err.message}`);
        }
    }

    return outputPaths;
}
