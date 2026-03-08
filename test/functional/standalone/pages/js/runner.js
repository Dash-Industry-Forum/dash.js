/**
 * Runner orchestrator for the standalone test runner.
 *
 * 1. Parse query params (session, streams, categories)
 * 2. Load testvectors from the server
 * 3. Import dash.js dist files (sets window.dashjs)
 * 4. Import bundled test files (registers Mocha describe/it blocks)
 * 5. Run Mocha and report results via WebSocket + UI
 */

// ---- Theme ----
(function () {
    var saved = localStorage.getItem('rp-theme');
    if (saved) {
        document.documentElement.setAttribute('data-bs-theme', saved);
    }
    var sel = document.getElementById('theme-select');
    if (sel && saved) { sel.value = saved; }
    if (sel) {
        sel.addEventListener('change', function () {
            document.documentElement.setAttribute('data-bs-theme', this.value);
            localStorage.setItem('rp-theme', this.value);
        });
    }
})();

// ---- Parse query parameters ----
var params = new URLSearchParams(window.location.search);
var sessionId = params.get('session') || 'default';
var streamsName = params.get('streams') || 'smoke';
var mode = params.get('mode') || 'preset';
var categoriesParam = params.get('categories') || '';
var selectedCategories = categoriesParam ? categoriesParam.split(',') : [];

// ---- DOM references ----
var configInfo = document.getElementById('test-config-info');
var statPassed = document.getElementById('stat-passed');
var statFailed = document.getElementById('stat-failed');
var statPending = document.getElementById('stat-pending');
var statTotal = document.getElementById('stat-total');
var progressBar = document.getElementById('progress-bar');
var currentTestEl = document.getElementById('current-test');
var statusIcon = document.getElementById('status-icon');
var resultsList = document.getElementById('results-list');
var resultsEmpty = document.getElementById('results-empty');
var detailStreams = document.getElementById('detail-streams');
var detailSession = document.getElementById('detail-session');
var detailFiles = document.getElementById('detail-files');
var detailDuration = document.getElementById('detail-duration');
var toastContainer = document.getElementById('toast-container');

// Set details
configInfo.textContent = mode === 'custom' ? 'Custom' : streamsName;
detailStreams.textContent = mode === 'custom' ? 'Custom' : streamsName;
detailSession.textContent = sessionId;

// ---- Counters ----
var counts = { passed: 0, failed: 0, pending: 0, total: 0 };
var resultGroups = {};
var startTime = Date.now();

// ---- WebSocket ----
var ws = null;

function connectWebSocket() {
    return new Promise(function (resolve) {
        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + location.host + '/ws');
        ws.onopen = function () {
            ws.send(JSON.stringify({ type: 'tv', sessionId: sessionId }));
            resolve();
        };
        ws.onmessage = function (event) {
            var msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }
            if (msg.action === 'report-ready' && msg.data && msg.data.url) {
                showReportLink(msg.data.url);
            }
        };
        ws.onerror = function () { resolve(); };
        setTimeout(resolve, 3000);
    });
}

function wsSend(msg) {
    if (ws && ws.readyState === 1) {
        ws.send(JSON.stringify(msg));
    }
}

// ---- UI ----

function updateStats() {
    statPassed.textContent = counts.passed;
    statFailed.textContent = counts.failed;
    statPending.textContent = counts.pending;
    statTotal.textContent = counts.total;

    var completed = counts.passed + counts.failed + counts.pending;
    var pct = counts.total > 0 ? (completed / counts.total * 100) : 0;
    progressBar.style.width = pct + '%';

    if (counts.failed > 0) {
        progressBar.classList.add('danger');
        progressBar.classList.remove('success');
    }

    // Update duration
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    detailDuration.textContent = elapsed + 's';
}

function getOrCreateGroup(category) {
    if (resultGroups[category]) {
        return resultGroups[category];
    }

    if (resultsEmpty) {
        resultsEmpty.remove();
        resultsEmpty = null;
    }

    var group = document.createElement('div');
    group.className = 'result-group';

    var header = document.createElement('div');
    header.className = 'result-group-header';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'result-group-name';
    nameSpan.textContent = category;

    var countSpan = document.createElement('span');
    countSpan.className = 'result-group-count';
    countSpan.textContent = '0 / 0';

    header.appendChild(nameSpan);
    header.appendChild(countSpan);

    var items = document.createElement('div');
    items.className = 'result-group-items';

    group.appendChild(header);
    group.appendChild(items);
    resultsList.appendChild(group);

    resultGroups[category] = { el: group, items: items, countEl: countSpan, passed: 0, failed: 0, pending: 0, total: 0 };
    return resultGroups[category];
}

function addResultItem(title, status, duration, suiteName, errorMsg) {
    var category = suiteName ? suiteName.split('/')[0] : 'unknown';
    var grp = getOrCreateGroup(category);

    grp.total++;
    if (status === 'pass') { grp.passed++; }
    else if (status === 'fail') { grp.failed++; }
    else { grp.pending++; }
    grp.countEl.textContent = grp.passed + ' / ' + grp.total;
    if (grp.failed > 0) {
        grp.countEl.classList.add('has-failures');
    }

    var item = document.createElement('div');
    item.className = 'result-item result-' + status;

    var icon = document.createElement('span');
    icon.className = 'result-icon';
    if (status === 'pass') {
        icon.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
    } else if (status === 'fail') {
        icon.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
    } else {
        icon.innerHTML = '<i class="bi bi-skip-forward-circle"></i>';
    }

    var titleSpan = document.createElement('span');
    titleSpan.className = 'result-title';
    titleSpan.textContent = title;
    titleSpan.title = title;

    var durationSpan = document.createElement('span');
    durationSpan.className = 'result-duration';
    durationSpan.textContent = duration ? (duration / 1000).toFixed(1) + 's' : '';

    item.appendChild(icon);
    item.appendChild(titleSpan);
    item.appendChild(durationSpan);

    grp.items.appendChild(item);

    // Show error message for failed tests
    if (status === 'fail' && errorMsg) {
        var errEl = document.createElement('div');
        errEl.className = 'result-error';
        errEl.textContent = errorMsg;
        grp.items.appendChild(errEl);
    }
}

function showToast(message, type) {
    var el = document.createElement('div');
    el.className = 'copy-notification alert alert-' + (type || 'info') + ' py-2 px-3';
    el.style.fontSize = '0.8rem';
    el.innerHTML = '<i class="bi bi-check-circle"></i> ' + message;
    toastContainer.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
}

function showReportLink(url) {
    // Add a "View Report" link below the current-test-bar
    var bar = document.querySelector('.current-test-bar');
    if (!bar || document.getElementById('report-link')) { return; }

    var link = document.createElement('a');
    link.id = 'report-link';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'report-link';
    link.innerHTML = '<i class="bi bi-file-earmark-bar-graph"></i> View Report';
    bar.parentNode.insertBefore(link, bar.nextSibling);
}

// ---- Main ----

async function run() {
    try {
        currentTestEl.textContent = 'Connecting to server...';
        await connectWebSocket();

        // Step 1: Load testvectors
        currentTestEl.textContent = 'Loading testvectors...';
        if (mode === 'custom') {
            // Custom config mode: fetch from session API
            var configResponse = await fetch('/api/custom-config/' + encodeURIComponent(sessionId));
            if (!configResponse.ok) {
                currentTestEl.textContent = 'Error: Custom config not found for session';
                statusIcon.className = 'bi bi-exclamation-triangle';
                return;
            }
            var customCfg = await configResponse.json();
            window.__testvectors__ = customCfg.testvectors;
        } else {
            // Preset mode: load via testvectors.js script
            var tvResponse = await fetch('/testvectors.js?streams=' + encodeURIComponent(streamsName));
            var tvScript = await tvResponse.text();
            var scriptEl = document.createElement('script');
            scriptEl.textContent = tvScript;
            document.head.appendChild(scriptEl);
        }

        if (!window.__testvectors__ || window.__testvectors__.length === 0) {
            currentTestEl.textContent = 'Error: No testvectors loaded' + (mode === 'custom' ? '' : ' for "' + streamsName + '"');
            statusIcon.className = 'bi bi-exclamation-triangle';
            return;
        }

        if (mode === 'custom') {
            detailStreams.textContent = 'Custom (' + window.__testvectors__.length + ' streams)';
        }
        currentTestEl.textContent = 'Loaded ' + window.__testvectors__.length + ' testvectors. Loading dash.js...';

        // Step 2: Import dash.js
        await import('/dist/modern/esm/dash.all.min.js');
        await import('/dist/modern/esm/dash.mss.min.js');

        if (!window.dashjs) {
            currentTestEl.textContent = 'Error: dash.js did not initialize. Run npm run build first.';
            statusIcon.className = 'bi bi-exclamation-triangle';
            return;
        }

        currentTestEl.textContent = 'dash.js loaded. Loading test files...';

        // Step 3: Get test files
        var testFilesResponse = await fetch('/api/test-files?streams=' + encodeURIComponent(streamsName));
        var testFiles = await testFilesResponse.json();

        if (selectedCategories.length > 0) {
            testFiles = testFiles.filter(function (f) {
                return selectedCategories.indexOf(f.split('/')[0]) >= 0;
            });
        }

        detailFiles.textContent = testFiles.length;
        currentTestEl.textContent = 'Loading ' + testFiles.length + ' test files...';

        // Step 4: Import bundled test files
        var loadedCount = 0;
        for (var i = 0; i < testFiles.length; i++) {
            try {
                await import('/bundled-tests/' + testFiles[i]);
            } catch (err) {
                console.error('Failed to load:', testFiles[i], err);
            }
            loadedCount++;
            if (loadedCount % 5 === 0 || loadedCount === testFiles.length) {
                currentTestEl.textContent = 'Loaded ' + loadedCount + '/' + testFiles.length + ' test files...';
            }
        }

        currentTestEl.textContent = 'Starting Mocha...';
        startTime = Date.now();

        // Step 5: Run Mocha
        var runner = mocha.run();
        counts.total = runner.total;
        updateStats();

        runner.on('test', function (test) {
            currentTestEl.textContent = test.fullTitle();
        });

        runner.on('pass', function (test) {
            try {
                counts.passed++;
                updateStats();
                var suite = test.parent ? test.parent.fullTitle() : '';
                addResultItem(test.fullTitle(), 'pass', test.duration, suite);
                wsSend({ action: 'result', data: { title: test.title, fullTitle: test.fullTitle(), suite: suite, status: 'passed', duration: test.duration } });
                wsSend({ action: 'progress', data: { passed: counts.passed, failed: counts.failed, pending: counts.pending, total: counts.total, currentTest: test.fullTitle() } });
            } catch (e) {
                console.error('Error handling pass event:', e);
            }
        });

        runner.on('fail', function (test, err) {
            try {
                counts.failed++;
                updateStats();
                var suite = test.parent ? test.parent.fullTitle() : '';
                var errorMsg = err ? err.message : 'Unknown error';
                addResultItem(test.fullTitle(), 'fail', test.duration, suite, errorMsg);
                wsSend({ action: 'result', data: { title: test.title, fullTitle: test.fullTitle(), suite: suite, status: 'failed', duration: test.duration, error: errorMsg } });
                wsSend({ action: 'progress', data: { passed: counts.passed, failed: counts.failed, pending: counts.pending, total: counts.total, currentTest: test.fullTitle() } });
            } catch (e) {
                console.error('Error handling fail event:', e);
            }
        });

        runner.on('pending', function (test) {
            try {
                counts.pending++;
                updateStats();
                var suite = test.parent ? test.parent.fullTitle() : '';
                addResultItem(test.fullTitle(), 'pending', 0, suite);
                wsSend({ action: 'result', data: { title: test.title, fullTitle: test.fullTitle(), suite: suite, status: 'pending', duration: 0 } });
            } catch (e) {
                console.error('Error handling pending event:', e);
            }
        });

        runner.on('end', function () {
            var duration = Date.now() - startTime;
            statusIcon.className = counts.failed > 0 ? 'bi bi-x-circle text-danger-themed' : 'bi bi-check-circle text-success-themed';
            currentTestEl.textContent = 'Complete! ' + counts.passed + ' passed, ' + counts.failed + ' failed' + (counts.pending > 0 ? ', ' + counts.pending + ' pending' : '') + ' in ' + (duration / 1000).toFixed(1) + 's';

            progressBar.style.width = '100%';
            if (counts.failed > 0) {
                progressBar.classList.add('danger');
            } else {
                progressBar.classList.add('success');
            }

            detailDuration.textContent = (duration / 1000).toFixed(1) + 's';

            wsSend({ action: 'complete', data: { passes: counts.passed, failures: counts.failed, pending: counts.pending, total: counts.total, duration: duration } });
            showToast('Tests complete! Results saved to server.', 'success');
        });

    } catch (err) {
        statusIcon.className = 'bi bi-exclamation-triangle';
        currentTestEl.textContent = 'Error: ' + err.message;
        console.error('Runner error:', err);
    }
}

run();
