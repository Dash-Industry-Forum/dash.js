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
 * - WebSocket server for TV <-> Remote device communication
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
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTestFiles, bundleTestFiles } from './bundler.js';

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
        }
    }

    return args;
}

const cliArgs = parseArgs();

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

function createSession(sessionId) {
    const session = {
        id: sessionId,
        tvSocket: null,
        remoteSocket: null,
        config: null,
        results: [],
        summary: null,
        createdAt: Date.now(),
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
 * Results grouped by testcase (e.g. playback/play, buffer/initial-buffer-target).
 * Includes an interactive filter bar (All / Passed / Failed / Skipped).
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

    // Extract testcase from suite name: "playback/play - stream - url" → "playback/play"
    function extractTestcase(suite) {
        if (!suite) return 'unknown';
        const idx = suite.indexOf(' - ');
        return idx > 0 ? suite.substring(0, idx) : suite;
    }

    // Group results by testcase
    const testcases = {};
    const testcaseOrder = [];
    for (const result of results) {
        const tc = extractTestcase(result.suite);
        if (!testcases[tc]) {
            testcases[tc] = { tests: [], passes: 0, failures: 0, pending: 0 };
            testcaseOrder.push(tc);
        }
        testcases[tc].tests.push(result);
        if (result.status === 'passed') testcases[tc].passes++;
        else if (result.status === 'failed') testcases[tc].failures++;
        else testcases[tc].pending++;
    }

    // Build testcase HTML
    let testcasesHtml = '';
    for (const tcName of testcaseOrder) {
        const tc = testcases[tcName];
        const tcIcon = tc.failures > 0 ? '\u2717' : '\u2713';
        const tcIconColor = tc.failures > 0 ? '#dc3545' : '#198754';
        const tcTestCount = tc.tests.length;
        const openAttr = tc.failures > 0 ? ' open' : '';
        const countColor = tc.failures > 0 ? 'var(--danger)' : 'var(--text-muted)';

        let testsHtml = '';
        for (const test of tc.tests) {
            let icon, iconColor, statusClass;
            if (test.status === 'passed') {
                icon = '\u2713'; iconColor = '#198754'; statusClass = 'passed';
            } else if (test.status === 'failed') {
                icon = '\u2717'; iconColor = '#dc3545'; statusClass = 'failed';
            } else {
                icon = '\u2014'; iconColor = '#ffc107'; statusClass = 'pending';
            }
            const dur = test.duration ? ((test.duration || 0) / 1000).toFixed(1) + 's' : '';

            testsHtml += `        <div class="test-item" data-status="${statusClass}">
          <div class="test-row">
            <span class="test-icon" style="color:${iconColor}">${icon}</span>
            <span class="test-title">${escapeHtml(test.fullTitle || test.title)}</span>
            <span class="test-duration">${dur}</span>
          </div>\n`;

            if (test.status === 'failed' && test.error) {
                testsHtml += `          <div class="test-error">${escapeHtml(test.error)}</div>\n`;
            }
            testsHtml += '        </div>\n';
        }

        testcasesHtml += `    <details class="suite" data-tc="${escapeHtml(tcName)}"${openAttr}>
      <summary class="suite-header">
        <span class="suite-icon" style="color:${tcIconColor}">${tcIcon}</span>
        <span class="suite-name">${escapeHtml(tcName)}</span>
        <span class="suite-count" style="color:${countColor}">${tc.passes}/${tcTestCount}</span>
      </summary>
      <div class="suite-body">
${testsHtml}      </div>
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

/* Filter bar */
.filter-bar {
  display: flex; align-items: center; gap: 0.25rem; margin-bottom: 1rem;
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

/* Suites (testcase groups) */
.suite {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px;
  margin-bottom: 0.5rem; overflow: hidden;
}
.suite-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.5rem 0.75rem; font-size: 0.8rem; cursor: pointer;
  background: var(--bg-card-header); user-select: none; list-style: none;
}
.suite-header::-webkit-details-marker { display: none; }
.suite-header::before {
  content: '\u25B8'; font-size: 0.7rem; color: var(--text-muted);
  transition: transform 0.15s; display: inline-block; width: 12px; text-align: center;
}
details[open] > .suite-header::before { transform: rotate(90deg); }
.suite-icon { font-weight: 700; flex-shrink: 0; }
.suite-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.suite-count { font-size: 0.7rem; flex-shrink: 0; font-variant-numeric: tabular-nums; font-weight: 600; }
.suite-body { padding: 0 0.75rem 0.5rem; }

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
  var activeFilter = 'all';
  var btns = document.querySelectorAll('.filter-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var filter = this.getAttribute('data-filter');
      activeFilter = filter;
      for (var b = 0; b < btns.length; b++) {
        btns[b].classList.toggle('active', btns[b].getAttribute('data-filter') === filter);
      }
      var suites = document.querySelectorAll('.suite');
      for (var s = 0; s < suites.length; s++) {
        var items = suites[s].querySelectorAll('.test-item');
        var visible = 0;
        for (var t = 0; t < items.length; t++) {
          var match = filter === 'all' || items[t].getAttribute('data-status') === filter;
          items[t].style.display = match ? '' : 'none';
          if (match) visible++;
        }
        suites[s].style.display = visible > 0 ? '' : 'none';
      }
    });
  }
})();
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();
const server = http.createServer(app);

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
        baseUrl: `http://${host}:${port}`,
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

    // Bundle test files
    if (!cliArgs.skipBundle) {
        console.log('\n[bundler] Bundling test files...');
        const streamsConfig = loadStreamsConfig(cliArgs.streams);
        const testFiles = getTestFiles(projectRoot, streamsConfig);
        console.log(`[bundler] Found ${testFiles.length} test files to bundle`);

        const bundled = await bundleTestFiles(
            projectRoot,
            testFiles,
            bundleOutputDir,
            (file, index, total) => {
                process.stdout.write(`\r[bundler] Bundling ${index + 1}/${total}: ${file}          `);
            }
        );

        console.log(`\n[bundler] Successfully bundled ${bundled.length} test files`);
    } else {
        console.log('\n[bundler] Skipping bundling (--skip-bundle)');
    }

    // Start server
    const interfaces = await getNetworkInterfaces();
    server.listen(cliArgs.port, cliArgs.host, () => {
        console.log(`\n[server] Server running on:`);
        console.log(`  Local:   http://localhost:${cliArgs.port}`);
        for (const iface of interfaces) {
            console.log(`  Network: http://${iface}:${cliArgs.port}`);
        }
        console.log(`\nOpen http://localhost:${cliArgs.port} in your browser to start.`);
    });
}

/**
 * Get LAN IP addresses for display.
 */
async function getNetworkInterfaces() {
    const os = await import('os');
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
