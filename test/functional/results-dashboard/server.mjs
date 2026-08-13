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
 * Zero-dependency dashboard server for functional test results.
 *
 * Serves dashboard.html and two JSON endpoints over the JUnit XML output that
 * karma-junit-reporter writes to test/functional/results/test/karma/junit/<browser>/<timestamp>.xml.
 * A test session is identified by the shared <timestamp>.xml basename across browser directories.
 *
 * Usage: npm run test-functional-dashboard  (or: node test/functional/results-dashboard/server.mjs)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JUNIT_DIR = path.resolve(__dirname, '../results/test/karma/junit');
const PORT = process.env.PORT || 8310;

/**
 * Reads only the first bytes of a JUnit file — enough for the <testsuite> root
 * element attributes — so listing sessions does not load every full XML.
 */
function readHeader(filePath, bytes = 2048) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const buffer = Buffer.alloc(bytes);
        const bytesRead = fs.readSync(fd, buffer, 0, bytes, 0);
        return buffer.toString('utf8', 0, bytesRead);
    } finally {
        fs.closeSync(fd);
    }
}

function parseSuiteAttributes(header) {
    const match = header.match(/<testsuite\s([^>]*)>/);
    if (!match) {
        return null;
    }
    const attrs = {};
    for (const [, key, value] of match[1].matchAll(/([\w.]+)="([^"]*)"/g)) {
        attrs[key] = value;
    }
    return attrs;
}

function listSessions() {
    const sessions = new Map();
    if (!fs.existsSync(JUNIT_DIR)) {
        return [];
    }
    for (const browserDir of fs.readdirSync(JUNIT_DIR)) {
        const dirPath = path.join(JUNIT_DIR, browserDir);
        if (!fs.statSync(dirPath).isDirectory()) {
            continue;
        }
        for (const file of fs.readdirSync(dirPath)) {
            const idMatch = file.match(/^(\d+)\.xml$/);
            if (!idMatch) {
                continue;
            }
            const id = idMatch[1];
            const attrs = parseSuiteAttributes(readHeader(path.join(dirPath, file)));
            if (!attrs) {
                continue;
            }
            if (!sessions.has(id)) {
                sessions.set(id, { id, browsers: [] });
            }
            sessions.get(id).browsers.push({
                browser: attrs.name || browserDir,
                tests: Number(attrs.tests) || 0,
                failures: (Number(attrs.failures) || 0) + (Number(attrs.errors) || 0),
                time: Number(attrs.time) || 0,
                timestamp: attrs.timestamp || null,
            });
        }
    }
    return [...sessions.values()].sort((a, b) => Number(b.id) - Number(a.id));
}

function loadSession(id) {
    if (!/^\d+$/.test(id)) {
        return null;
    }
    const result = [];
    for (const browserDir of fs.readdirSync(JUNIT_DIR)) {
        const filePath = path.join(JUNIT_DIR, browserDir, `${id}.xml`);
        if (fs.existsSync(filePath)) {
            result.push({ browserDir, xml: fs.readFileSync(filePath, 'utf8') });
        }
    }
    return result.length ? result : null;
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
        if (url.pathname === '/' || url.pathname === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(fs.readFileSync(path.join(__dirname, 'dashboard.html')));
        } else if (url.pathname === '/api/sessions') {
            sendJson(res, 200, listSessions());
        } else if (url.pathname === '/api/session') {
            const session = loadSession(url.searchParams.get('id') || '');
            if (session) {
                sendJson(res, 200, session);
            } else {
                sendJson(res, 404, { error: 'session not found' });
            }
        } else {
            sendJson(res, 404, { error: 'not found' });
        }
    } catch (e) {
        sendJson(res, 500, { error: e.message });
    }
});

server.listen(PORT, () => {
    console.log(`Functional test results dashboard: http://localhost:${PORT}`);
    console.log(`Reading JUnit results from: ${JUNIT_DIR}`);
});
