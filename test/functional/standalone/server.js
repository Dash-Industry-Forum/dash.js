/**
 * Standalone Functional Test Runner Server
 *
 * A self-contained Express server that hosts a landing page for configuring
 * and running dash.js functional tests directly in any browser — including
 * Smart TVs, game consoles, and other devices that don't support Selenium
 * or WebDriver.
 *
 * Features:
 * - Pre-bundles test files with Rollup on startup
 * - Serves a landing page with test configuration UI
 * - WebSocket server for test device <-> Remote device communication
 * - QR code for remote configuration from a second device
 * - Results stored as JSON + JUnit XML on the server
 *
 * Usage:
 *   node test/functional/standalone/server.js [options]
 *   npm run test-standalone
 *
 * Options:
 *   --port=<number>       Server port (default: 3001)
 *   --streams=<name>      Stream config file name without .json (default: smoke)
 *   --host=<address>      Bind address (default: 0.0.0.0)
 *   --skip-bundle         Skip test file bundling (use previously bundled files)
 *   --https               Enable HTTPS (auto-generates self-signed cert if no cert/key provided)
 *   --cert=<path>         Path to PEM certificate file (requires --https)
 *   --key=<path>          Path to PEM private key file (requires --https)
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { fileURLToPath } from 'url';
import { getTestFiles, bundleTestFiles } from './bundler.js';
import db from './db.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const configDir = path.resolve(__dirname, '../config/test-configurations');
const streamsDir = path.join(configDir, 'streams');
const standaloneDir = __dirname;
const bundleOutputDir = path.join(standaloneDir, '.bundled-tests');
const bundleOutputDirLegacy = path.join(standaloneDir, '.bundled-tests-legacy');
const resultsDir = path.join(standaloneDir, 'results');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
function parseArgs() {
    const args = {
        port: 3001,
        streams: 'smoke',
        host: '0.0.0.0',
        skipBundle: false,
        https: false,
        cert: null,
        key: null,
    };

    for (const arg of process.argv.slice(2)) {
        if (arg.startsWith('--port=')) {
            args.port = parseInt(arg.split('=')[1], 10);
        } else if (arg.startsWith('--streams=')) {
            args.streams = arg.split('=')[1];
        } else if (arg.startsWith('--host=')) {
            args.host = arg.split('=')[1];
        } else if (arg === '--skip-bundle') {
            args.skipBundle = true;
        } else if (arg === '--https') {
            args.https = true;
        } else if (arg.startsWith('--cert=')) {
            args.cert = arg.split('=')[1];
        } else if (arg.startsWith('--key=')) {
            args.key = arg.split('=')[1];
        }
    }

    return args;
}

const cliArgs = parseArgs();

// ---------------------------------------------------------------------------
// HTTPS / TLS support
// ---------------------------------------------------------------------------

/**
 * Generate a self-signed certificate with SAN entries for localhost and all
 * local network IPs.  The generated key/cert are cached in the data directory
 * so the browser only needs to trust the certificate once.
 *
 * Uses only Node.js built-in crypto APIs (no external dependencies).
 */
function generateSelfSignedCert(dataDir) {
    const certPath = path.join(dataDir, 'server.cert');
    const keyPath = path.join(dataDir, 'server.key');

    // Reuse cached cert if it exists
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
        console.log('[https] Reusing cached self-signed certificate from data/');
        return {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            generated: false,
        };
    }

    console.log('[https] Generating self-signed certificate...');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // Collect SAN IPs
    const interfaces = os.networkInterfaces();
    const ipAddresses = ['127.0.0.1'];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ipAddresses.push(iface.address);
            }
        }
    }

    // Generate RSA key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    // Build SAN extension value (DER-encoded)
    // Each SAN entry: dNSName [2] or iPAddress [7]
    const sanEntries = [];

    // DNS names
    const dnsNames = ['localhost'];
    for (const dns of dnsNames) {
        const buf = Buffer.from(dns, 'ascii');
        // Context tag [2] (dNSName), length, value
        sanEntries.push(Buffer.from([0x82, buf.length]), buf);
    }

    // IP addresses
    for (const ip of ipAddresses) {
        const octets = ip.split('.').map(Number);
        // Context tag [7] (iPAddress), length 4, 4 octets
        sanEntries.push(Buffer.from([0x87, 0x04, ...octets]));
    }

    const sanBody = Buffer.concat(sanEntries);

    // Wrap in SEQUENCE
    const sanSequence = Buffer.concat([
        Buffer.from([0x30, ...derLength(sanBody.length)]),
        sanBody,
    ]);

    // Build the subjectAltName extension:
    //   SEQUENCE { OID 2.5.29.17, OCTET STRING { sanSequence } }
    const sanOid = Buffer.from([0x06, 0x03, 0x55, 0x1d, 0x11]); // OID 2.5.29.17
    const sanOctetString = Buffer.concat([
        Buffer.from([0x04, ...derLength(sanSequence.length)]),
        sanSequence,
    ]);
    const sanExtension = Buffer.concat([
        Buffer.from([0x30, ...derLength(sanOid.length + sanOctetString.length)]),
        sanOid,
        sanOctetString,
    ]);

    // Build basicConstraints extension (CA:FALSE)
    const bcOid = Buffer.from([0x06, 0x03, 0x55, 0x1d, 0x13]); // OID 2.5.29.19
    const bcValue = Buffer.from([0x30, 0x00]); // empty SEQUENCE = CA:FALSE
    const bcOctetString = Buffer.concat([
        Buffer.from([0x04, ...derLength(bcValue.length)]),
        bcValue,
    ]);
    const bcExtension = Buffer.concat([
        Buffer.from([0x30, ...derLength(bcOid.length + bcOctetString.length)]),
        bcOid,
        bcOctetString,
    ]);

    // Extensions wrapper: [3] { SEQUENCE { extensions... } }
    const extensionsBody = Buffer.concat([sanExtension, bcExtension]);
    const extensionsSequence = Buffer.concat([
        Buffer.from([0x30, ...derLength(extensionsBody.length)]),
        extensionsBody,
    ]);
    const extensionsContext = Buffer.concat([
        Buffer.from([0xa3, ...derLength(extensionsSequence.length)]),
        extensionsSequence,
    ]);

    // Subject / Issuer: CN=dash.js Test Server
    const cnValue = Buffer.from('dash.js Test Server', 'utf8');
    const cnAttrValue = Buffer.concat([
        Buffer.from([0x13, cnValue.length]), // PrintableString
        cnValue,
    ]);
    const cnOid = Buffer.from([0x06, 0x03, 0x55, 0x04, 0x03]); // OID 2.5.4.3 (commonName)
    const cnAttrTypeAndValue = Buffer.concat([
        Buffer.from([0x30, ...derLength(cnOid.length + cnAttrValue.length)]),
        cnOid,
        cnAttrValue,
    ]);
    const cnRdn = Buffer.concat([
        Buffer.from([0x31, ...derLength(cnAttrTypeAndValue.length)]),
        cnAttrTypeAndValue,
    ]);
    const subject = Buffer.concat([
        Buffer.from([0x30, ...derLength(cnRdn.length)]),
        cnRdn,
    ]);

    // Serial number (random 16 bytes)
    const serial = crypto.randomBytes(16);
    serial[0] &= 0x7f; // ensure positive
    const serialDer = Buffer.concat([
        Buffer.from([0x02, serial.length]),
        serial,
    ]);

    // Validity: notBefore = now, notAfter = now + 365 days
    const now = new Date();
    const notAfter = new Date(now);
    notAfter.setFullYear(notAfter.getFullYear() + 1);
    const validity = Buffer.concat([
        Buffer.from([0x30, ...derLength(30)]), // 2 x UTCTime(15 bytes each)
        encodeUTCTime(now),
        encodeUTCTime(notAfter),
    ]);

    // Algorithm identifier: sha256WithRSAEncryption (OID 1.2.840.113549.1.1.11)
    const algOid = Buffer.from([
        0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x0b,
    ]);
    const algId = Buffer.concat([
        Buffer.from([0x30, ...derLength(algOid.length + 2)]),
        algOid,
        Buffer.from([0x05, 0x00]), // NULL parameters
    ]);

    // SubjectPublicKeyInfo (from the PEM public key)
    const spkiDer = pemToDer(publicKey);

    // Version: v3 (explicitly tagged [0] INTEGER 2)
    const version = Buffer.from([0xa0, 0x03, 0x02, 0x01, 0x02]);

    // TBSCertificate
    const tbsBody = Buffer.concat([
        version, serialDer, algId, subject, validity, subject, spkiDer, extensionsContext,
    ]);
    const tbsCertificate = Buffer.concat([
        Buffer.from([0x30, ...derLength(tbsBody.length)]),
        tbsBody,
    ]);

    // Sign
    const signer = crypto.createSign('SHA256');
    signer.update(tbsCertificate);
    const signature = signer.sign(privateKey);

    // Wrap signature in BIT STRING (prepend 0x00 unused-bits byte)
    const sigBitString = Buffer.concat([
        Buffer.from([0x03, ...derLength(signature.length + 1), 0x00]),
        signature,
    ]);

    // Final Certificate: SEQUENCE { tbsCertificate, algId, signature }
    const certBody = Buffer.concat([tbsCertificate, algId, sigBitString]);
    const certDer = Buffer.concat([
        Buffer.from([0x30, ...derLength(certBody.length)]),
        certBody,
    ]);

    // PEM-encode
    const certPem = derToPem(certDer, 'CERTIFICATE');

    // Write to data directory
    fs.writeFileSync(keyPath, privateKey);
    fs.writeFileSync(certPath, certPem);

    const sanDesc = [...dnsNames, ...ipAddresses].join(', ');
    console.log(`[https] Self-signed certificate generated (SAN: ${sanDesc})`);
    console.log(`[https] Certificate cached at: ${certPath}`);

    return {
        cert: certPem,
        key: privateKey,
        generated: true,
    };
}

/** Encode a DER length (supports lengths > 127). */
function derLength(len) {
    if (len < 0x80) {
        return [len];
    }
    const bytes = [];
    let tmp = len;
    while (tmp > 0) {
        bytes.unshift(tmp & 0xff);
        tmp >>= 8;
    }
    return [0x80 | bytes.length, ...bytes];
}

/** Encode a Date as DER UTCTime (YYMMDDHHMMSSZ). */
function encodeUTCTime(date) {
    const str =
        String(date.getUTCFullYear()).slice(-2).padStart(2, '0') +
        String(date.getUTCMonth() + 1).padStart(2, '0') +
        String(date.getUTCDate()).padStart(2, '0') +
        String(date.getUTCHours()).padStart(2, '0') +
        String(date.getUTCMinutes()).padStart(2, '0') +
        String(date.getUTCSeconds()).padStart(2, '0') +
        'Z';
    const buf = Buffer.from(str, 'ascii');
    return Buffer.concat([Buffer.from([0x17, buf.length]), buf]);
}

/** Strip PEM headers and base64-decode to DER Buffer. */
function pemToDer(pem) {
    const b64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
    return Buffer.from(b64, 'base64');
}

/** DER Buffer to PEM string. */
function derToPem(der, label) {
    const b64 = der.toString('base64');
    const lines = [];
    for (let i = 0; i < b64.length; i += 64) {
        lines.push(b64.slice(i, i + 64));
    }
    return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
}

/**
 * Resolve TLS options from CLI args.
 * - If --cert and --key are provided, use those files.
 * - Otherwise, auto-generate a self-signed certificate.
 * Returns { key, cert } suitable for https.createServer().
 */
function getTlsOptions(dataDir) {
    if (cliArgs.cert && cliArgs.key) {
        const certPath = path.resolve(cliArgs.cert);
        const keyPath = path.resolve(cliArgs.key);
        if (!fs.existsSync(certPath)) {
            throw new Error(`Certificate file not found: ${certPath}`);
        }
        if (!fs.existsSync(keyPath)) {
            throw new Error(`Key file not found: ${keyPath}`);
        }
        console.log(`[https] Using provided certificate: ${certPath}`);
        console.log(`[https] Using provided key: ${keyPath}`);
        return {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
        };
    }

    const result = generateSelfSignedCert(dataDir);
    return { cert: result.cert, key: result.key };
}

// ---------------------------------------------------------------------------
// Load stream configurations
// ---------------------------------------------------------------------------
function loadStreamsConfig(name) {
    const filePath = path.join(streamsDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`Stream config not found: ${filePath}`);
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function getAvailableStreamConfigs() {
    if (!fs.existsSync(streamsDir)) {
        return [];
    }
    return fs.readdirSync(streamsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace('.json', ''));
}

function getAvailableTestCategories() {
    const testDir = path.join(projectRoot, 'test/functional/test');
    if (!fs.existsSync(testDir)) {
        return [];
    }
    return fs.readdirSync(testDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name !== 'common')
        .map((d) => d.name);
}

// ---------------------------------------------------------------------------
// Session management (TV <-> Remote device pairing)
// ---------------------------------------------------------------------------
const sessions = new Map();
const deviceSockets = new Map();  // deviceId → WebSocket

function createSession(sessionId) {
    const session = {
        id: sessionId,
        tvSocket: null,
        remoteSocket: null,
        config: null,
        customConfig: null,
        results: [],
        summary: null,
        createdAt: Date.now(),
        deviceId: null,
        dbRunId: null,
    };
    sessions.set(sessionId, session);
    return session;
}

function getOrCreateSession(sessionId) {
    if (!sessions.has(sessionId)) {
        return createSession(sessionId);
    }
    return sessions.get(sessionId);
}

// ---------------------------------------------------------------------------
// Result storage
// ---------------------------------------------------------------------------
function generateJUnitXml(results, summary) {
    const suites = {};

    // Group results by suite
    for (const result of results) {
        const suiteName = result.suite || 'Unknown Suite';
        if (!suites[suiteName]) {
            suites[suiteName] = { tests: [], failures: 0, passes: 0, time: 0 };
        }
        suites[suiteName].tests.push(result);
        if (result.status === 'failed') {
            suites[suiteName].failures++;
        } else {
            suites[suiteName].passes++;
        }
        suites[suiteName].time += (result.duration || 0) / 1000;
    }

    const escapeXml = (str) => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<testsuites tests="${summary.total}" failures="${summary.failures}" time="${(summary.duration / 1000).toFixed(3)}">\n`;

    for (const [suiteName, suite] of Object.entries(suites)) {
        xml += `  <testsuite name="${escapeXml(suiteName)}" tests="${suite.tests.length}" failures="${suite.failures}" time="${suite.time.toFixed(3)}">\n`;

        for (const test of suite.tests) {
            xml += `    <testcase name="${escapeXml(test.title)}" classname="${escapeXml(suiteName)}" time="${((test.duration || 0) / 1000).toFixed(3)}"`;

            if (test.status === 'failed') {
                xml += '>\n';
                xml += `      <failure message="${escapeXml(test.error || 'Test failed')}">${escapeXml(test.error || '')}</failure>\n`;
                xml += '    </testcase>\n';
            } else if (test.status === 'pending') {
                xml += '>\n';
                xml += '      <skipped />\n';
                xml += '    </testcase>\n';
            } else {
                xml += ' />\n';
            }
        }

        xml += '  </testsuite>\n';
    }

    xml += '</testsuites>\n';
    return xml;
}

function saveResults(session) {
    const jsonDir = path.join(resultsDir, 'json');
    const xmlDir = path.join(resultsDir, 'xml');
    const htmlDir = path.join(resultsDir, 'html');

    fs.mkdirSync(jsonDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(htmlDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `results-${timestamp}`;

    // Save JSON
    const jsonData = {
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        summary: session.summary,
        results: session.results,
    };
    fs.writeFileSync(
        path.join(jsonDir, `${baseName}.json`),
        JSON.stringify(jsonData, null, 2)
    );

    // Save JUnit XML
    if (session.summary) {
        const xml = generateJUnitXml(session.results, session.summary);
        fs.writeFileSync(path.join(xmlDir, `${baseName}.xml`), xml);
    }

    // Save HTML report
    const html = generateHtmlReport(session.results, session.summary, session.id);
    fs.writeFileSync(path.join(htmlDir, `${baseName}.html`), html);

    const reportUrl = `/results/${baseName}.html`;
    console.log(`[server] Results saved:`);
    console.log(`  JSON: ${jsonDir}/${baseName}.json`);
    console.log(`  XML:  ${xmlDir}/${baseName}.xml`);
    console.log(`  HTML: ${htmlDir}/${baseName}.html`);

    return reportUrl;
}

/**
 * Generate a fully self-contained HTML report.
 * All CSS is inlined — the file works standalone (filesystem, email, CI artifact).
 * Fixed light theme. No external dependencies.
 *
 * Results are grouped in two levels:
 *   1. Testcase (e.g. playback/play, buffer/initial-buffer-target)
 *   2. Testvector / stream (e.g. "Segment Base", "1080p with PlayReady")
 *
 * Features:
 *   - Interactive filter bar (All / Passed / Failed / Skipped)
 *   - Filters auto-open relevant <details> so results are immediately visible
 *   - Expand All / Collapse All buttons
 *   - Clear arrow (chevron) indicators on collapsible sections
 *   - Both testcase and testvector levels are collapsible
 */
function generateHtmlReport(results, summary, sessionId) {
    const escapeHtml = (str) => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    const timestamp = new Date().toISOString();
    const passes = summary ? summary.passes : 0;
    const failures = summary ? summary.failures : 0;
    const pending = summary ? (summary.pending || 0) : 0;
    const total = summary ? (summary.total || (passes + failures + pending)) : 0;
    const duration = summary ? ((summary.duration || 0) / 1000).toFixed(1) : '0.0';
    const pct = total > 0 ? ((passes + failures + pending) / total * 100).toFixed(1) : '0.0';
    const barColor = failures > 0 ? '#dc3545' : '#198754';

    // Extract testcase and testvector from suite name:
    // "playback/play - Segment Base - https://..." → testcase: "playback/play", tv: "Segment Base"
    function extractTestcase(suite) {
        if (!suite) return 'unknown';
        const idx = suite.indexOf(' - ');
        return idx > 0 ? suite.substring(0, idx) : suite;
    }

    function extractTestvector(suite) {
        if (!suite) return 'unknown';
        const parts = suite.split(' - ');
        return parts.length >= 2 ? parts[1] : suite;
    }

    // Group results: testcase → testvector → tests[]
    // Preserves insertion order for both levels
    const testcases = {};        // { [tc]: { testvectors: { [tv]: { tests, passes, failures, pending } }, passes, failures, pending } }
    const testcaseOrder = [];
    const testvectorOrders = {}; // { [tc]: [tvName, ...] }

    for (const result of results) {
        const tc = extractTestcase(result.suite);
        const tv = extractTestvector(result.suite);

        if (!testcases[tc]) {
            testcases[tc] = { testvectors: {}, passes: 0, failures: 0, pending: 0 };
            testcaseOrder.push(tc);
            testvectorOrders[tc] = [];
        }

        if (!testcases[tc].testvectors[tv]) {
            testcases[tc].testvectors[tv] = { tests: [], passes: 0, failures: 0, pending: 0 };
            testvectorOrders[tc].push(tv);
        }

        testcases[tc].testvectors[tv].tests.push(result);

        if (result.status === 'passed') {
            testcases[tc].passes++;
            testcases[tc].testvectors[tv].passes++;
        } else if (result.status === 'failed') {
            testcases[tc].failures++;
            testcases[tc].testvectors[tv].failures++;
        } else {
            testcases[tc].pending++;
            testcases[tc].testvectors[tv].pending++;
        }
    }

    // Build 2-level HTML
    let testcasesHtml = '';
    for (const tcName of testcaseOrder) {
        const tc = testcases[tcName];
        const tcTotal = tc.passes + tc.failures + tc.pending;
        const tcIconColor = tc.failures > 0 ? '#dc3545' : '#198754';
        const tcCountColor = tc.failures > 0 ? '#dc3545' : 'var(--text-muted)';
        const tcOpenAttr = tc.failures > 0 ? ' open' : '';

        let testvectorsHtml = '';
        for (const tvName of testvectorOrders[tcName]) {
            const tvData = tc.testvectors[tvName];
            const tvTotal = tvData.tests.length;
            const tvIconColor = tvData.failures > 0 ? '#dc3545' : '#198754';
            const tvCountColor = tvData.failures > 0 ? '#dc3545' : 'var(--text-muted)';
            const tvOpenAttr = tvData.failures > 0 ? ' open' : '';

            let testsHtml = '';
            for (const test of tvData.tests) {
                let icon, iconColor, statusClass;
                if (test.status === 'passed') {
                    icon = '\u2713'; iconColor = '#198754'; statusClass = 'passed';
                } else if (test.status === 'failed') {
                    icon = '\u2717'; iconColor = '#dc3545'; statusClass = 'failed';
                } else {
                    icon = '\u2014'; iconColor = '#ffc107'; statusClass = 'pending';
                }
                const dur = test.duration ? ((test.duration || 0) / 1000).toFixed(1) + 's' : '';

                testsHtml += `            <div class="test-item" data-status="${statusClass}">
              <div class="test-row">
                <span class="test-icon" style="color:${iconColor}">${icon}</span>
                <span class="test-title">${escapeHtml(test.fullTitle || test.title)}</span>
                <span class="test-duration">${dur}</span>
              </div>\n`;

                if (test.status === 'failed' && test.error) {
                    testsHtml += `              <div class="test-error">${escapeHtml(test.error)}</div>\n`;
                }
                testsHtml += '            </div>\n';
            }

            testvectorsHtml += `        <details class="tv-suite" data-tv="${escapeHtml(tvName)}"${tvOpenAttr}>
          <summary class="tv-header">
            <span class="tv-icon" style="color:${tvIconColor}">${tvData.failures > 0 ? '\u2717' : '\u2713'}</span>
            <span class="tv-name">${escapeHtml(tvName)}</span>
            <span class="tv-count" style="color:${tvCountColor}">${tvData.passes}/${tvTotal}</span>
          </summary>
          <div class="tv-body">
${testsHtml}          </div>
        </details>\n`;
        }

        testcasesHtml += `    <details class="tc-suite" data-tc="${escapeHtml(tcName)}"${tcOpenAttr}>
      <summary class="tc-header">
        <span class="tc-icon" style="color:${tcIconColor}">${tc.failures > 0 ? '\u2717' : '\u2713'}</span>
        <span class="tc-name">${escapeHtml(tcName)}</span>
        <span class="tc-count" style="color:${tcCountColor}">${tc.passes}/${tcTotal}</span>
      </summary>
      <div class="tc-body">
${testvectorsHtml}      </div>
    </details>\n`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>dash.js Test Report \u2014 ${escapeHtml(timestamp)}</title>
<style>
:root {
  --bg-primary: #f5f6fa;
  --bg-secondary: #ffffff;
  --bg-card: #ffffff;
  --bg-card-header: #f0f1f5;
  --bg-tv-header: #f8f9fb;
  --accent: #0d6efd;
  --text: #1a1a2e;
  --text-muted: #6c757d;
  --border: #dee2e6;
  --success: #198754;
  --danger: #dc3545;
  --warning: #ffc107;
  --separator: rgba(0, 0, 0, 0.06);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text);
  line-height: 1.5;
  min-height: 100vh;
}
.container { max-width: 1200px; margin: 0 auto; padding: 0 1rem 2rem; }

/* Header */
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0.75rem 0; border-bottom: 1px solid var(--border); margin-bottom: 1rem;
}
.header h1 { font-size: 1.25rem; font-weight: 600; }
.header .meta { font-size: 0.75rem; color: var(--text-muted); }

/* Stat cards */
.stat-cards {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1rem;
}
.stat-card {
  text-align: center; padding: 0.75rem 0.25rem;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px;
}
.stat-card-value { font-size: 2rem; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.2; }
.stat-card-label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.c-pass { color: var(--success); }
.c-fail { color: var(--danger); }
.c-pend { color: var(--warning); }
.c-accent { color: var(--accent); }

/* Progress bar */
.progress-bar-track {
  width: 100%; height: 8px; background: rgba(0,0,0,0.08); border-radius: 4px;
  overflow: hidden; margin-bottom: 0.25rem;
}
.progress-bar-fill { height: 100%; border-radius: 4px; }

/* Info row */
.info-row {
  display: flex; justify-content: space-between; font-size: 0.75rem;
  color: var(--text-muted); margin-bottom: 1.25rem;
}

/* Filter & controls bar */
.filter-bar {
  display: flex; align-items: center; gap: 0.25rem; margin-bottom: 1rem;
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.5rem 0.75rem; flex-wrap: wrap;
}
.filter-bar-label {
  font-size: 0.75rem; font-weight: 600; color: var(--text-muted);
  margin-right: 0.5rem; text-transform: uppercase; letter-spacing: 0.03em;
}
.filter-btn {
  background: transparent; border: 1px solid var(--border); color: var(--text-muted);
  font-size: 0.7rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 4px;
  cursor: pointer; text-transform: uppercase; letter-spacing: 0.03em;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.filter-btn:hover { background: rgba(0,0,0,0.04); color: var(--text); }
.filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; }
.filter-btn[data-filter="passed"].active { background: var(--success); border-color: var(--success); }
.filter-btn[data-filter="failed"].active { background: var(--danger); border-color: var(--danger); }
.filter-btn[data-filter="pending"].active { background: var(--warning); border-color: var(--warning); color: #000; }
.expand-controls {
  margin-left: auto; display: flex; gap: 0.25rem;
}
.expand-btn {
  background: transparent; border: 1px solid var(--border); color: var(--text-muted);
  font-size: 0.7rem; font-weight: 500; padding: 0.2rem 0.6rem; border-radius: 4px;
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.expand-btn:hover { background: rgba(0,0,0,0.04); color: var(--text); }

/* ---- Outer level: Testcase groups ---- */
.tc-suite {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px;
  margin-bottom: 0.5rem; overflow: hidden;
  border-left: 3px solid var(--accent);
}
.tc-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.55rem 0.75rem; font-size: 0.85rem; cursor: pointer;
  background: var(--bg-card-header); user-select: none; list-style: none;
  transition: background 0.15s;
}
.tc-header:hover { background: rgba(0,0,0,0.06); }
.tc-header::-webkit-details-marker { display: none; }
.tc-header::before {
  content: '\\25B8'; font-size: 1rem; color: var(--accent);
  transition: transform 0.2s ease; display: inline-block; width: 16px; text-align: center;
  flex-shrink: 0;
}
details.tc-suite[open] > .tc-header::before { transform: rotate(90deg); }
.tc-icon { font-weight: 700; flex-shrink: 0; font-size: 0.85rem; }
.tc-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
.tc-count {
  font-size: 0.7rem; flex-shrink: 0; font-variant-numeric: tabular-nums; font-weight: 600;
  background: rgba(0,0,0,0.06); padding: 0.1rem 0.5rem; border-radius: 3px;
}
.tc-body { padding: 0.25rem 0.5rem 0.5rem; }

/* ---- Inner level: Testvector groups ---- */
.tv-suite {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px;
  margin-bottom: 0.35rem; overflow: hidden;
}
.tv-suite:last-child { margin-bottom: 0; }
.tv-header {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.6rem; font-size: 0.8rem; cursor: pointer;
  background: var(--bg-tv-header); user-select: none; list-style: none;
  transition: background 0.15s;
}
.tv-header:hover { background: rgba(0,0,0,0.04); }
.tv-header::-webkit-details-marker { display: none; }
.tv-header::before {
  content: '\\25B8'; font-size: 0.8rem; color: var(--text-muted);
  transition: transform 0.2s ease; display: inline-block; width: 14px; text-align: center;
  flex-shrink: 0;
}
details.tv-suite[open] > .tv-header::before { transform: rotate(90deg); }
.tv-icon { font-weight: 700; flex-shrink: 0; font-size: 0.75rem; }
.tv-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.tv-count {
  font-size: 0.65rem; flex-shrink: 0; font-variant-numeric: tabular-nums; font-weight: 600;
}
.tv-body { padding: 0 0.6rem 0.35rem; }

/* Test rows */
.test-row {
  display: flex; align-items: center; padding: 0.25rem 0;
  border-bottom: 1px solid var(--separator); font-size: 0.8rem;
}
.test-item:last-child .test-row { border-bottom: none; }
.test-icon { width: 18px; text-align: center; font-weight: 700; flex-shrink: 0; margin-right: 0.5rem; font-size: 0.75rem; }
.test-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.test-duration { color: var(--text-muted); font-size: 0.7rem; margin-left: 0.5rem; flex-shrink: 0; font-variant-numeric: tabular-nums; }
.test-error {
  margin: 0.15rem 0 0.35rem 26px; padding: 0.35rem 0.6rem;
  background: rgba(220, 53, 69, 0.08); border-left: 3px solid var(--danger);
  border-radius: 0 4px 4px 0; font-size: 0.75rem; color: var(--danger);
  white-space: pre-wrap; word-break: break-word;
}

/* Footer */
.report-footer {
  margin-top: 2rem; padding: 0.75rem 0; border-top: 1px solid var(--border);
  text-align: center; font-size: 0.75rem; color: var(--text-muted);
}
.report-footer a { color: var(--accent); text-decoration: none; font-weight: 500; }
.report-footer a:hover { text-decoration: underline; }

/* Responsive */
@media (max-width: 600px) {
  .stat-card-value { font-size: 1.5rem; }
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
}
</style>
</head>
<body>
<div class="container">

  <div class="header">
    <h1>dash.js Functional Test Report</h1>
    <div class="meta">${escapeHtml(timestamp)}</div>
  </div>

  <div class="stat-cards">
    <div class="stat-card">
      <div class="stat-card-value c-pass">${passes}</div>
      <div class="stat-card-label">Passed</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value c-fail">${failures}</div>
      <div class="stat-card-label">Failed</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value c-pend">${pending}</div>
      <div class="stat-card-label">Skipped</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value c-accent">${total}</div>
      <div class="stat-card-label">Total</div>
    </div>
  </div>

  <div class="progress-bar-track">
    <div class="progress-bar-fill" style="width:${pct}%;background:${barColor}"></div>
  </div>
  <div class="info-row">
    <span>Session: ${escapeHtml(sessionId || '-')}</span>
    <span>Duration: ${duration}s</span>
  </div>

  <div class="filter-bar">
    <span class="filter-bar-label">Filter:</span>
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="passed">Passed</button>
    <button class="filter-btn" data-filter="failed">Failed</button>
    <button class="filter-btn" data-filter="pending">Skipped</button>
    <div class="expand-controls">
      <button class="expand-btn" id="btn-expand-all">Expand All</button>
      <button class="expand-btn" id="btn-collapse-all">Collapse All</button>
    </div>
  </div>

${testcasesHtml}
  <div class="report-footer">
    dash.js &mdash; DASH Industry Forum Reference Client
    &middot; <a href="https://dashif.org" target="_blank" rel="noopener">dashif.org</a>
    &middot; <a href="https://github.com/Dash-Industry-Forum/dash.js" target="_blank" rel="noopener">GitHub</a>
  </div>

</div>
<script>
(function () {
  // Filter logic — works on both testcase (.tc-suite) and testvector (.tv-suite) levels
  var btns = document.querySelectorAll('.filter-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var filter = this.getAttribute('data-filter');

      // Update active button
      for (var b = 0; b < btns.length; b++) {
        btns[b].classList.toggle('active', btns[b].getAttribute('data-filter') === filter);
      }

      // Iterate: tc-suite > tv-suite > test-item
      var tcSuites = document.querySelectorAll('.tc-suite');
      for (var tc = 0; tc < tcSuites.length; tc++) {
        var tcEl = tcSuites[tc];
        var tvSuites = tcEl.querySelectorAll('.tv-suite');
        var tcVisibleTvs = 0;

        for (var tv = 0; tv < tvSuites.length; tv++) {
          var tvEl = tvSuites[tv];
          var items = tvEl.querySelectorAll('.test-item');
          var visibleCount = 0;

          for (var t = 0; t < items.length; t++) {
            var match = filter === 'all' || items[t].getAttribute('data-status') === filter;
            items[t].style.display = match ? '' : 'none';
            if (match) { visibleCount++; }
          }

          // Hide empty testvector groups; auto-open those with visible items when filtering
          if (visibleCount > 0) {
            tvEl.style.display = '';
            tcVisibleTvs++;
            if (filter !== 'all') { tvEl.open = true; }
          } else {
            tvEl.style.display = 'none';
          }
        }

        // Hide empty testcase groups; auto-open those with visible testvectors when filtering
        if (tcVisibleTvs > 0) {
          tcEl.style.display = '';
          if (filter !== 'all') { tcEl.open = true; }
        } else {
          tcEl.style.display = 'none';
        }
      }
    });
  }

  // Expand All — opens all tc-suite and tv-suite details
  document.getElementById('btn-expand-all').addEventListener('click', function () {
    var all = document.querySelectorAll('.tc-suite, .tv-suite');
    for (var i = 0; i < all.length; i++) { all[i].open = true; }
  });

  // Collapse All — closes all tc-suite and tv-suite details
  document.getElementById('btn-collapse-all').addEventListener('click', function () {
    var all = document.querySelectorAll('.tc-suite, .tv-suite');
    for (var i = 0; i < all.length; i++) { all[i].open = false; }
  });
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();

let tlsOptions = null;
if (cliArgs.https) {
    const dataDir = path.join(standaloneDir, 'data');
    tlsOptions = getTlsOptions(dataDir);
}

const server = tlsOptions
    ? https.createServer(tlsOptions, app)
    : http.createServer(app);
const protocol = tlsOptions ? 'https' : 'http';

// Parse JSON bodies for API routes
app.use(express.json());

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

// List available stream configurations
app.get('/api/streams', (req, res) => {
    res.json(getAvailableStreamConfigs());
});

// Get a specific stream configuration
app.get('/api/stream-config/:name', (req, res) => {
    try {
        const config = loadStreamsConfig(req.params.name);
        res.json(config);
    } catch (err) {
        res.status(404).json({ error: err.message });
    }
});

// List available test categories
app.get('/api/test-categories', (req, res) => {
    res.json(getAvailableTestCategories());
});

// List all testcase identifiers grouped by category
app.get('/api/all-testcases', (req, res) => {
    const testDir = path.join(projectRoot, 'test/functional/test');
    const categories = {};
    if (!fs.existsSync(testDir)) {
        res.json(categories);
        return;
    }
    const dirs = fs.readdirSync(testDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name !== 'common');
    for (const dir of dirs) {
        const catDir = path.join(testDir, dir.name);
        const files = fs.readdirSync(catDir)
            .filter((f) => f.endsWith('.js'))
            .map((f) => dir.name + '/' + f.replace('.js', ''));
        if (files.length > 0) {
            categories[dir.name] = files;
        }
    }
    res.json(categories);
});

// Get the list of bundled test files for a given stream config
app.get('/api/test-files', (req, res) => {
    const streamsName = req.query.streams || cliArgs.streams;
    try {
        const streamsConfig = loadStreamsConfig(streamsName);
        const testFiles = getTestFiles(projectRoot, streamsConfig);
        const relPaths = testFiles.map((f) =>
            path.relative(path.join(projectRoot, 'test/functional/test'), f)
        );
        res.json(relPaths);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get server info (for QR code generation)
app.get('/api/server-info', async (req, res) => {
    const host = req.hostname;
    const port = cliArgs.port;
    const interfaces = await getNetworkInterfaces();
    res.json({
        host,
        port,
        interfaces,
        baseUrl: `${protocol}://${host}:${port}`,
    });
});

// Store custom test configuration for a session
app.post('/api/custom-config/:sessionId', (req, res) => {
    const session = getOrCreateSession(req.params.sessionId);
    session.customConfig = req.body;
    res.json({ ok: true });
});

// Retrieve custom test configuration for a session
app.get('/api/custom-config/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session || !session.customConfig) {
        res.status(404).json({ error: 'No custom config for session' });
        return;
    }
    res.json(session.customConfig);
});

// Get results for a session
app.get('/api/results/:sessionId', (req, res) => {
    const session = sessions.get(req.params.sessionId);
    if (!session) {
        res.status(404).json({ error: 'Session not found' });
        return;
    }
    res.json({
        summary: session.summary,
        results: session.results,
    });
});

// List saved HTML reports
app.get('/api/reports', (req, res) => {
    const htmlDir = path.join(resultsDir, 'html');
    if (!fs.existsSync(htmlDir)) {
        res.json([]);
        return;
    }
    const files = fs.readdirSync(htmlDir)
        .filter((f) => f.endsWith('.html'))
        .sort()
        .reverse()
        .map((f) => ({
            name: f,
            url: `/results/${f}`,
            timestamp: f.replace('results-', '').replace('.html', '').replace(/-/g, (m, i) => {
                // Restore ISO timestamp from the filename for display
                return i < 23 ? (i === 10 ? 'T' : (i === 13 || i === 16 ? ':' : (i === 19 ? '.' : '-'))) : m;
            }),
        }));
    res.json(files);
});

// ---------------------------------------------------------------------------
// Serve saved HTML reports
// ---------------------------------------------------------------------------
app.use('/results', express.static(path.join(resultsDir, 'html')));

// ---------------------------------------------------------------------------
// Serve testvectors as a JavaScript file (dynamic based on query param)
// ---------------------------------------------------------------------------
app.get('/testvectors.js', (req, res) => {
    // Custom config mode: serve testvectors from session
    if (req.query.session) {
        const session = sessions.get(req.query.session);
        if (session && session.customConfig) {
            res.type('application/javascript');
            res.send(`window.__testvectors__ = ${JSON.stringify(session.customConfig.testvectors)};`);
            return;
        }
    }

    // Preset mode
    const streamsName = req.query.streams || cliArgs.streams;
    try {
        const streamsConfig = loadStreamsConfig(streamsName);
        res.type('application/javascript');
        res.send(`window.__testvectors__ = ${JSON.stringify(streamsConfig.testvectors)};`);
    } catch (err) {
        res.type('application/javascript');
        res.send(`window.__testvectors__ = []; console.error(${JSON.stringify(err.message)});`);
    }
});

// ---------------------------------------------------------------------------
// Serve bundled test files
// ---------------------------------------------------------------------------
app.use('/bundled-tests', express.static(bundleOutputDir, {
    setHeaders: (res) => {
        res.set('Content-Type', 'application/javascript');
    },
}));

// Serve legacy IIFE-bundled test files
app.use('/bundled-tests-legacy', express.static(bundleOutputDirLegacy, {
    setHeaders: (res) => {
        res.set('Content-Type', 'application/javascript');
    },
}));

// ---------------------------------------------------------------------------
// Serve standalone pages
// ---------------------------------------------------------------------------
app.use('/standalone', express.static(path.join(standaloneDir, 'pages')));

// ---------------------------------------------------------------------------
// Serve reference player vendor assets (Bootstrap, Bootstrap Icons)
// and images (DASH-IF logo) — shared with the reference player
// ---------------------------------------------------------------------------
app.use('/vendor', express.static(path.join(projectRoot, 'samples/dash-if-reference-player/vendor')));
app.use('/img', express.static(path.join(projectRoot, 'samples/dash-if-reference-player/img')));

// ---------------------------------------------------------------------------
// Serve node_modules (for Mocha browser bundle)
// ---------------------------------------------------------------------------
app.use('/node_modules', express.static(path.join(projectRoot, 'node_modules'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
    },
}));

// ---------------------------------------------------------------------------
// Serve project root files (dist/, test/functional/lib/, test/functional/content/)
// ---------------------------------------------------------------------------
app.use('/dist', express.static(path.join(projectRoot, 'dist')));
app.use('/test/functional', express.static(path.join(projectRoot, 'test/functional'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.mpd')) {
            res.set('Content-Type', 'application/dash+xml');
        } else if (filePath.endsWith('.mp4')) {
            res.set('Content-Type', 'video/mp4');
        } else if (filePath.endsWith('.m4s')) {
            res.set('Content-Type', 'video/iso.segment');
        }
    },
}));

// ---------------------------------------------------------------------------
// Dashboard API routes
// ---------------------------------------------------------------------------

// Middleware: check DB availability
function requireDb(req, res, next) {
    if (!db.isAvailable()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    next();
}

// List test runs with pagination and filters
app.get('/api/dashboard/runs', requireDb, (req, res) => {
    const result = db.getRuns({
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        deviceId: req.query.deviceId || undefined,
        from: req.query.from || undefined,
        to: req.query.to || undefined,
        status: req.query.status || undefined,
    });
    res.json(result);
});

// Delete a test run (and cascaded results)
app.delete('/api/dashboard/runs/:id', requireDb, (req, res) => {
    const deleted = db.deleteRun(parseInt(req.params.id, 10));
    if (!deleted) {
        return res.status(404).json({ error: 'Run not found' });
    }
    res.json({ ok: true });
});

// Get a single run with all test results
app.get('/api/dashboard/runs/:id', requireDb, (req, res) => {
    const run = db.getRunById(parseInt(req.params.id, 10));
    if (!run) {
        return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
});

// Delete a device and all its test runs
app.delete('/api/dashboard/devices/:deviceId', requireDb, (req, res) => {
    const deleted = db.deleteDevice(req.params.deviceId);
    if (!deleted) {
        return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ ok: true });
});

// List all devices with computed status and run counts
app.get('/api/dashboard/devices', requireDb, (req, res) => {
    res.json(db.getDevices());
});

// Compare two runs side-by-side
app.get('/api/dashboard/compare', requireDb, (req, res) => {
    const ids = (req.query.runs || '').split(',').map((s) => parseInt(s.trim(), 10)).filter(Boolean);
    if (ids.length !== 2) {
        return res.status(400).json({ error: 'Provide exactly two run IDs: ?runs=id1,id2' });
    }
    const comparison = db.compareRuns(ids[0], ids[1]);
    if (!comparison) {
        return res.status(404).json({ error: 'One or both runs not found' });
    }
    res.json(comparison);
});

// Dispatch a test configuration to a connected device
app.post('/api/dashboard/dispatch', requireDb, (req, res) => {
    const { deviceId, config } = req.body;
    if (!deviceId || !config) {
        return res.status(400).json({ error: 'deviceId and config are required' });
    }

    // Check if the device exists
    const devices = db.getDevices();
    const device = devices.find((d) => d.deviceId === deviceId);
    if (!device) {
        return res.status(404).json({ error: 'Device not found' });
    }

    // Check if the device is connected
    const deviceWs = deviceSockets.get(deviceId);
    if (!deviceWs || deviceWs.readyState !== 1) {
        return res.status(409).json({ error: 'Device is not connected' });
    }

    // Create a new session for this dispatch
    const dispatchSessionId = `dispatch-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const session = getOrCreateSession(dispatchSessionId);
    session.deviceId = deviceId;
    session.customConfig = config;

    // Create a DB run record with status 'dispatched'
    const configStr = JSON.stringify(config);
    const runId = db.insertRun(dispatchSessionId, deviceId, configStr, 'dispatched');
    session.dbRunId = runId;

    // Send dispatch message to the device
    deviceWs.send(JSON.stringify({
        action: 'dispatch',
        data: { sessionId: dispatchSessionId, config },
    }));

    console.log(`[dispatch] Sent test config to device ${deviceId} (session: ${dispatchSessionId})`);
    res.json({ ok: true, sessionId: dispatchSessionId, runId });
});

// List available stream presets (reuse existing logic)
app.get('/api/dashboard/stream-presets', (req, res) => {
    res.json(getAvailableStreamConfigs());
});

// ---------------------------------------------------------------------------
// Serve dashboard pages
// ---------------------------------------------------------------------------
app.use('/dashboard', express.static(path.join(standaloneDir, 'pages/dashboard')));

// ---------------------------------------------------------------------------
// Landing page redirect
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
    res.redirect('/standalone/index.html');
});

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    let sessionId = null;
    let clientType = null;

    ws.on('message', (data) => {
        let msg;
        try {
            msg = JSON.parse(data.toString());
        } catch (e) {
            return;
        }

        // Handle registration
        if (msg.type === 'tv' || msg.type === 'remote') {
            sessionId = msg.sessionId;
            clientType = msg.type;
            const session = getOrCreateSession(sessionId);

            if (clientType === 'tv') {
                session.tvSocket = ws;
                console.log(`[ws] TV connected to session ${sessionId}`);
                // Notify remote if already connected
                if (session.remoteSocket && session.remoteSocket.readyState === 1) {
                    session.remoteSocket.send(JSON.stringify({ action: 'tv-connected' }));
                }
            } else {
                session.remoteSocket = ws;
                console.log(`[ws] Remote connected to session ${sessionId}`);
                // Notify TV if already connected
                if (session.tvSocket && session.tvSocket.readyState === 1) {
                    session.tvSocket.send(JSON.stringify({ action: 'remote-connected' }));
                }
                // Send current results if test is already running
                if (session.results.length > 0) {
                    ws.send(JSON.stringify({
                        action: 'sync-results',
                        data: {
                            results: session.results,
                            summary: session.summary,
                        },
                    }));
                }
            }
            return;
        }

        // Handle actions
        if (!sessionId) return;
        const session = sessions.get(sessionId);
        if (!session) return;

        switch (msg.action) {
            case 'register-device': {
                // Device registers with persistent ID
                const devId = msg.data && msg.data.deviceId;
                if (devId) {
                    session.deviceId = devId;
                    db.upsertDevice(devId, msg.data.name || '', msg.data.userAgent || '');
                    deviceSockets.set(devId, ws);
                    ws._deviceId = devId;
                    console.log(`[ws] Device registered: ${devId} (${msg.data.name || 'unnamed'})`);
                }
                break;
            }

            case 'heartbeat': {
                const hbDevId = msg.data && msg.data.deviceId;
                if (hbDevId) {
                    db.updateDeviceHeartbeat(hbDevId);
                }
                break;
            }

            case 'configure':
                // Remote -> Server -> TV: send configuration
                session.config = msg.data;
                if (session.tvSocket && session.tvSocket.readyState === 1) {
                    session.tvSocket.send(JSON.stringify({
                        action: 'configure',
                        data: msg.data,
                    }));
                }
                break;

            case 'start':
                // Remote -> Server -> TV: start tests
                if (session.tvSocket && session.tvSocket.readyState === 1) {
                    session.tvSocket.send(JSON.stringify({ action: 'start', data: msg.data }));
                }
                break;

            case 'result':
                // TV -> Server: individual test result
                session.results.push(msg.data);

                // Create DB run record on first result if not yet created
                if (!session.dbRunId && db.isAvailable()) {
                    const configStr = session.customConfig ? JSON.stringify(session.customConfig) : null;
                    session.dbRunId = db.insertRun(session.id, session.deviceId, configStr, 'running');
                }
                // Persist individual result to DB and update running counts
                if (session.dbRunId) {
                    db.insertResult(session.dbRunId, msg.data);

                    // Track running counts on the session (O(1) per result)
                    if (!session.runCounts) {
                        session.runCounts = { passes: 0, failures: 0, pending: 0 };
                    }
                    if (msg.data.status === 'passed') { session.runCounts.passes++; }
                    else if (msg.data.status === 'failed') { session.runCounts.failures++; }
                    else { session.runCounts.pending++; }

                    db.updateRunProgress(session.dbRunId, {
                        passes: session.runCounts.passes,
                        failures: session.runCounts.failures,
                        pending: session.runCounts.pending,
                        total: session.runCounts.passes + session.runCounts.failures + session.runCounts.pending,
                    });
                }

                // Relay to remote
                if (session.remoteSocket && session.remoteSocket.readyState === 1) {
                    session.remoteSocket.send(JSON.stringify({
                        action: 'result',
                        data: msg.data,
                    }));
                }
                break;

            case 'progress':
                // TV -> Server -> Remote: progress update
                if (session.remoteSocket && session.remoteSocket.readyState === 1) {
                    session.remoteSocket.send(JSON.stringify({
                        action: 'progress',
                        data: msg.data,
                    }));
                }
                break;

            case 'complete':
                // TV -> Server: tests complete
                session.summary = msg.data;
                // Persist completion to DB
                if (session.dbRunId) {
                    db.completeRun(session.dbRunId, msg.data);
                }
                const reportUrl = saveResults(session);
                // Send report URL back to TV
                if (session.tvSocket && session.tvSocket.readyState === 1) {
                    session.tvSocket.send(JSON.stringify({
                        action: 'report-ready',
                        data: { url: reportUrl },
                    }));
                }
                // Relay to remote (include report URL)
                if (session.remoteSocket && session.remoteSocket.readyState === 1) {
                    session.remoteSocket.send(JSON.stringify({
                        action: 'complete',
                        data: { ...msg.data, reportUrl },
                    }));
                }
                console.log(`[server] Session ${sessionId} complete: ${msg.data.passes} passed, ${msg.data.failures} failed`);
                break;
        }
    });

    ws.on('close', () => {
        // Handle device offline tracking
        if (ws._deviceId) {
            db.setDeviceOffline(ws._deviceId);
            deviceSockets.delete(ws._deviceId);
            console.log(`[ws] Device offline: ${ws._deviceId}`);
        }

        if (sessionId && sessions.has(sessionId)) {
            const session = sessions.get(sessionId);
            if (clientType === 'tv') {
                session.tvSocket = null;
                console.log(`[ws] TV disconnected from session ${sessionId}`);
                if (session.remoteSocket && session.remoteSocket.readyState === 1) {
                    session.remoteSocket.send(JSON.stringify({ action: 'tv-disconnected' }));
                }
            } else if (clientType === 'remote') {
                session.remoteSocket = null;
                console.log(`[ws] Remote disconnected from session ${sessionId}`);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function start() {
    console.log('=== dash.js Standalone Functional Test Runner ===');
    console.log(`Project root: ${projectRoot}`);
    console.log(`Stream config: ${cliArgs.streams}`);

    // Initialise database
    const dataDir = path.join(standaloneDir, 'data');
    const dbReady = db.init(dataDir);
    if (!dbReady) {
        console.warn('[server] Database unavailable — dashboard features will be limited');
    }

    // Bundle test files (both ESM and IIFE formats)
    if (!cliArgs.skipBundle) {
        console.log('\n[bundler] Bundling test files...');
        const streamsConfig = loadStreamsConfig(cliArgs.streams);
        const testFiles = getTestFiles(projectRoot, streamsConfig);
        console.log(`[bundler] Found ${testFiles.length} test files to bundle`);

        // ESM bundles (for modern browsers)
        console.log('[bundler] Bundling ESM format...');
        const bundledEsm = await bundleTestFiles(
            projectRoot,
            testFiles,
            bundleOutputDir,
            (file, index, total) => {
                process.stdout.write(`\r[bundler] ESM ${index + 1}/${total}: ${file}          `);
            },
            'es'
        );
        console.log(`\n[bundler] ESM: ${bundledEsm.length} files bundled`);

        // IIFE bundles (for legacy browsers / Smart TVs without ESM support)
        console.log('[bundler] Bundling IIFE format (legacy)...');
        const bundledIife = await bundleTestFiles(
            projectRoot,
            testFiles,
            bundleOutputDirLegacy,
            (file, index, total) => {
                process.stdout.write(`\r[bundler] IIFE ${index + 1}/${total}: ${file}          `);
            },
            'iife'
        );
        console.log(`\n[bundler] IIFE: ${bundledIife.length} files bundled`);
    } else {
        console.log('\n[bundler] Skipping bundling (--skip-bundle)');
    }

    // Start server
    const interfaces = await getNetworkInterfaces();
    server.listen(cliArgs.port, cliArgs.host, () => {
        console.log(`\n[server] Server running on (${protocol.toUpperCase()}):`);
        console.log(`  Local:   ${protocol}://localhost:${cliArgs.port}`);
        for (const iface of interfaces) {
            console.log(`  Network: ${protocol}://${iface}:${cliArgs.port}`);
        }
        if (tlsOptions) {
            console.log(`\n[https] Browsers will show a certificate warning for self-signed certs.`);
            console.log(`[https] Click "Advanced" > "Proceed" to accept (one-time per device).`);
            console.log(`[https] To avoid warnings, use --cert and --key with a trusted certificate (e.g. from mkcert).`);
        }
        console.log(`\nOpen ${protocol}://localhost:${cliArgs.port} in your browser to start.`);
    });
}

/**
 * Get LAN IP addresses for display.
 */
async function getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                addresses.push(iface.address);
            }
        }
    }
    return addresses;
}

start().catch((err) => {
    console.error('[server] Fatal error:', err);
    process.exit(1);
});
