/**
 * Runner core — shared logic for both ESM and legacy runners.
 *
 * This file is loaded as a classic <script> (no ES modules) so it works
 * on all browsers including older Smart TVs. It provides:
 *
 * - Theme setup
 * - Query parameter parsing
 * - DOM references
 * - WebSocket connection
 * - UI update functions (stats, 2-level result groups, filtering)
 * - loadScript() helper for legacy mode
 * - runMocha() to wire up Mocha event handlers
 *
 * Results are grouped in two levels:
 *   1. Testcase (e.g. "playback/play")
 *   2. Testvector / stream (e.g. "Segment Base")
 *
 * Both levels are collapsible via click on the header.
 *
 * The actual run() function is defined in either runner.js (ESM) or
 * runner-legacy.js (classic), loaded after this file.
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
var isLegacy = params.get('legacy') === 'true';

// ---- DOM references ----
var configInfo = document.getElementById('test-config-info');
var statPassed = document.getElementById('stat-passed');
var statFailed = document.getElementById('stat-failed');
var statPending = document.getElementById('stat-pending');
var statRemaining = document.getElementById('stat-remaining');
var progressBar = document.getElementById('progress-bar');
var progressText = document.getElementById('progress-text');
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
var startTime = Date.now();

// ---- 2-level result group data ----
// testcaseGroups[testcaseName] = {
//   el: DOM element (.result-testcase-group),
//   headerCountEl: DOM element for aggregate count,
//   testvectors: {
//     [tvName]: { el, itemsEl, countEl, passed, failed, pending, total }
//   },
//   passed, failed, pending, total
// }
var testcaseGroups = {};

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

// ---- Script loader (used by legacy runner) ----

function loadScript(src) {
    return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = function () { reject(new Error('Failed to load: ' + src)); };
        document.head.appendChild(s);
    });
}

// ---- UI ----

function updateStats() {
    statPassed.textContent = counts.passed;
    statFailed.textContent = counts.failed;
    statPending.textContent = counts.pending;

    var executed = counts.passed + counts.failed + counts.pending;
    var remaining = counts.total - executed;
    statRemaining.textContent = remaining < 0 ? 0 : remaining;

    var pct = counts.total > 0 ? (executed / counts.total * 100) : 0;
    progressBar.style.width = pct + '%';
    progressText.textContent = executed + ' / ' + counts.total + ' executed';

    if (counts.failed > 0) {
        progressBar.classList.add('danger');
        progressBar.classList.remove('success');
    }

    // Update duration
    var elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    detailDuration.textContent = elapsed + 's';
}

// ---- Name extraction from Mocha suite names ----
// Suite names follow: "<testcase> - <testvector name> - <mpd url>"
// e.g. "playback/play - Segment Base - https://..."

function extractTestcase(suiteName) {
    if (!suiteName) { return 'unknown'; }
    var dashIdx = suiteName.indexOf(' - ');
    return dashIdx > 0 ? suiteName.substring(0, dashIdx) : suiteName;
}

function extractTestvectorName(suiteName) {
    if (!suiteName) { return 'unknown'; }
    var parts = suiteName.split(' - ');
    if (parts.length >= 3) {
        return parts[1];
    }
    if (parts.length === 2) {
        return parts[1];
    }
    return suiteName;
}

// ---- 2-level collapsible result groups ----

function getOrCreateTestcaseGroup(testcase) {
    if (testcaseGroups[testcase]) {
        return testcaseGroups[testcase];
    }

    if (resultsEmpty) {
        resultsEmpty.remove();
        resultsEmpty = null;
    }

    // Create outer testcase group
    var group = document.createElement('div');
    group.className = 'result-testcase-group';
    group.setAttribute('data-testcase', testcase);

    var header = document.createElement('div');
    header.className = 'result-testcase-header';

    var chevron = document.createElement('i');
    chevron.className = 'bi bi-chevron-down result-collapse-chevron';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'result-testcase-name';
    nameSpan.textContent = testcase;

    var countSpan = document.createElement('span');
    countSpan.className = 'result-testcase-count';
    countSpan.textContent = '0 / 0';

    header.appendChild(chevron);
    header.appendChild(nameSpan);
    header.appendChild(countSpan);

    var body = document.createElement('div');
    body.className = 'result-testcase-body';

    group.appendChild(header);
    group.appendChild(body);
    resultsList.appendChild(group);

    // Toggle collapse on header click
    header.addEventListener('click', function () {
        var isCollapsed = group.classList.toggle('collapsed');
        chevron.className = isCollapsed
            ? 'bi bi-chevron-right result-collapse-chevron'
            : 'bi bi-chevron-down result-collapse-chevron';
    });

    testcaseGroups[testcase] = {
        el: group,
        bodyEl: body,
        headerCountEl: countSpan,
        testvectors: {},
        passed: 0,
        failed: 0,
        pending: 0,
        total: 0
    };

    return testcaseGroups[testcase];
}

function getOrCreateTestvectorGroup(testcase, tvName) {
    var tcGroup = getOrCreateTestcaseGroup(testcase);

    if (tcGroup.testvectors[tvName]) {
        return tcGroup.testvectors[tvName];
    }

    var group = document.createElement('div');
    group.className = 'result-testvector-group';
    group.setAttribute('data-testvector', tvName);

    var header = document.createElement('div');
    header.className = 'result-testvector-header';

    var chevron = document.createElement('i');
    chevron.className = 'bi bi-chevron-down result-collapse-chevron-sm';

    var nameSpan = document.createElement('span');
    nameSpan.className = 'result-testvector-name';
    nameSpan.textContent = tvName;

    var countSpan = document.createElement('span');
    countSpan.className = 'result-testvector-count';
    countSpan.textContent = '0 / 0';

    header.appendChild(chevron);
    header.appendChild(nameSpan);
    header.appendChild(countSpan);

    var items = document.createElement('div');
    items.className = 'result-testvector-items';

    group.appendChild(header);
    group.appendChild(items);
    tcGroup.bodyEl.appendChild(group);

    // Toggle collapse on header click
    header.addEventListener('click', function (e) {
        e.stopPropagation();
        var isCollapsed = group.classList.toggle('collapsed');
        chevron.className = isCollapsed
            ? 'bi bi-chevron-right result-collapse-chevron-sm'
            : 'bi bi-chevron-down result-collapse-chevron-sm';
    });

    tcGroup.testvectors[tvName] = {
        el: group,
        itemsEl: items,
        countEl: countSpan,
        passed: 0,
        failed: 0,
        pending: 0,
        total: 0
    };

    return tcGroup.testvectors[tvName];
}

function updateGroupCounts(testcase, tvName) {
    var tcGroup = testcaseGroups[testcase];
    if (!tcGroup) { return; }

    var tvGroup = tcGroup.testvectors[tvName];
    if (tvGroup) {
        tvGroup.countEl.textContent = tvGroup.passed + ' / ' + tvGroup.total;
        if (tvGroup.failed > 0) {
            tvGroup.countEl.classList.add('has-failures');
        }
    }

    // Recalculate testcase totals from all testvectors
    tcGroup.passed = 0;
    tcGroup.failed = 0;
    tcGroup.pending = 0;
    tcGroup.total = 0;
    var keys = Object.keys(tcGroup.testvectors);
    for (var i = 0; i < keys.length; i++) {
        var tv = tcGroup.testvectors[keys[i]];
        tcGroup.passed += tv.passed;
        tcGroup.failed += tv.failed;
        tcGroup.pending += tv.pending;
        tcGroup.total += tv.total;
    }

    tcGroup.headerCountEl.textContent = tcGroup.passed + ' / ' + tcGroup.total;
    if (tcGroup.failed > 0) {
        tcGroup.headerCountEl.classList.add('has-failures');
    }
}

function addResultItem(title, status, duration, suiteName, errorMsg) {
    var testcase = extractTestcase(suiteName);
    var tvName = extractTestvectorName(suiteName);
    var tvGroup = getOrCreateTestvectorGroup(testcase, tvName);

    tvGroup.total++;
    if (status === 'pass') { tvGroup.passed++; }
    else if (status === 'fail') { tvGroup.failed++; }
    else { tvGroup.pending++; }

    updateGroupCounts(testcase, tvName);

    var wrapper = document.createElement('div');
    wrapper.className = 'result-item-wrapper';
    wrapper.setAttribute('data-status', status);

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

    wrapper.appendChild(item);

    // Show error message for failed tests
    if (status === 'fail' && errorMsg) {
        var errEl = document.createElement('div');
        errEl.className = 'result-error';
        errEl.textContent = errorMsg;
        wrapper.appendChild(errEl);
    }

    tvGroup.itemsEl.appendChild(wrapper);

    // Re-apply current filter
    if (activeFilter !== 'all') {
        applyFilter(activeFilter);
    }
}

// ---- Result filtering ----
var activeFilter = 'all';

function applyFilter(status) {
    activeFilter = status;

    // Update active button
    var btns = document.querySelectorAll('.result-filter-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].classList.toggle('active', btns[i].getAttribute('data-filter') === status);
    }

    // Filter: iterate testcase groups > testvector groups > items
    var tcGroups = document.querySelectorAll('.result-testcase-group');
    for (var tc = 0; tc < tcGroups.length; tc++) {
        var tcEl = tcGroups[tc];
        var tvGroups = tcEl.querySelectorAll('.result-testvector-group');
        var tcVisibleTvs = 0;

        for (var tv = 0; tv < tvGroups.length; tv++) {
            var tvEl = tvGroups[tv];
            var items = tvEl.querySelectorAll('.result-item-wrapper');
            var visibleCount = 0;

            for (var j = 0; j < items.length; j++) {
                var match = status === 'all' || items[j].getAttribute('data-status') === status;
                items[j].style.display = match ? '' : 'none';
                if (match) { visibleCount++; }
            }

            tvEl.style.display = visibleCount > 0 ? '' : 'none';
            if (visibleCount > 0) { tcVisibleTvs++; }
        }

        tcEl.style.display = tcVisibleTvs > 0 ? '' : 'none';
    }
}

// Bind filter buttons
(function () {
    var btns = document.querySelectorAll('.result-filter-btn');
    for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
            applyFilter(this.getAttribute('data-filter'));
        });
    }
})();

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

// ---- Mocha event wiring (shared between ESM and legacy runners) ----

function runMocha() {
    startTime = Date.now();

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
}
