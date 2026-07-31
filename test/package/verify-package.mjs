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

/**
 * Verifies the npm package before publishing:
 * 1. Packs the tarball (npm pack) and asserts all required files are inside it.
 * 2. Installs the tarball into the vite consumer app (exercises the "files" allowlist,
 *    unlike its regular "file:" dependency which copies the whole repo).
 * 3. Builds the consumer app with Vite (resolves dashjs through the package exports map).
 * 4. Runs a playback smoke test in headless Chrome against the installed tarball.
 *
 * Usage: node test/package/verify-package.mjs [--no-build]
 *   --no-build  Skip the build step (use the existing dist/ as-is, for CI jobs that
 *               already built the bundles).
 */

import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const consumerDir = path.join(repoRoot, 'test/compliance/vite-consumer');
const noBuild = process.argv.includes('--no-build');

const REQUIRED_FILES = [
    'dist/modern/esm/dash.all.min.js',
    'dist/modern/umd/dash.all.min.js',
    'dist/modern/esm/dash.mss.min.js',
    'dist/modern/umd/dash.mss.min.js',
    'dist/legacy/umd/dash.all.min.js',
    'index.d.ts',
    'githook.cjs',
    'contrib/akamai/controlbar/ControlBar.js',
    'contrib/controlbar/ControlBar.js',
    'contrib/controlbar/controlbar.css',
    'contrib/videojs-vtt.js/vtt.min.js',
];

function run(command, args, options = {}) {
    console.log(`\n> ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, { cwd: repoRoot, stdio: 'inherit', ...options });
    if (result.status !== 0) {
        fail(`"${command} ${args.join(' ')}" exited with status ${result.status}`);
    }
    return result;
}

function fail(message) {
    console.error(`\nPackage verification FAILED: ${message}`);
    process.exit(1);
}

// 1. Build the bundles, then pack. The pack itself runs with --ignore-scripts so the
// prepack output cannot pollute the --json output on stdout.
if (!noBuild) {
    run('npm', ['run', 'build:dist']);
}
const packArgs = ['pack', '--json', '--ignore-scripts'];
console.log(`\n> npm ${packArgs.join(' ')}`);
const pack = spawnSync('npm', packArgs, { cwd: repoRoot, encoding: 'utf8' });
if (pack.status !== 0) {
    console.error(pack.stderr);
    fail(`npm pack exited with status ${pack.status}`);
}
const packInfo = JSON.parse(pack.stdout)[0];
const tarball = path.join(repoRoot, packInfo.filename);
console.log(`Packed ${packInfo.filename} (${packInfo.entryCount} files)`);

// 2. Assert required files are inside the tarball (catches "files" allowlist regressions).
const packedPaths = new Set(packInfo.files.map((file) => file.path));
const missing = REQUIRED_FILES.filter((file) => !packedPaths.has(file));
if (missing.length > 0) {
    fail(`tarball is missing required files:\n  ${missing.join('\n  ')}`);
}
console.log('All required files present in tarball.');

// 3. Install the tarball into the consumer app (also installs its vite devDependency).
run('npm', ['install', '--no-save', '--no-audit', '--no-fund', tarball], { cwd: consumerDir });

// Guard: a "file:" directory dependency would be a symlink; the tarball install must not be.
const installedPackage = path.join(consumerDir, 'node_modules/dashjs');
if (fs.lstatSync(installedPackage).isSymbolicLink()) {
    fail('node_modules/dashjs in the consumer app is a symlink - the tarball was not installed');
}

// 4. Bundle the consumer app - resolves dashjs through the real package exports map.
run('npm', ['run', 'build'], { cwd: consumerDir });

// 5. Playback smoke test in headless Chrome against the tarball-installed package.
run('npx', ['karma', 'start', 'test/package/karma.package.conf.cjs']);

console.log(`\nPackage verification PASSED: ${packInfo.filename}`);
