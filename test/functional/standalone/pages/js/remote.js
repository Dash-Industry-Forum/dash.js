/**
 * Remote control page logic for the standalone test runner.
 *
 * Accessed by scanning the QR code on the TV screen.
 * Communicates with the TV via WebSocket relay through the server.
 */

(function () {
    'use strict';

    // ---- Theme ----
    var saved = localStorage.getItem('rp-theme');
    if (saved) {
        document.documentElement.setAttribute('data-bs-theme', saved);
    }
    var themeSelect = document.getElementById('theme-select');
    if (themeSelect && saved) { themeSelect.value = saved; }
    if (themeSelect) {
        themeSelect.addEventListener('change', function () {
            document.documentElement.setAttribute('data-bs-theme', this.value);
            localStorage.setItem('rp-theme', this.value);
        });
    }

    // ---- State ----
    var params = new URLSearchParams(window.location.search);
    var sessionId = params.get('session') || 'default';
    var ws = null;
    var testsStarted = false;
    var counts = { passed: 0, failed: 0, pending: 0, total: 0 };

    // ---- DOM elements ----
    var sessionDisplay = document.getElementById('session-display');
    var statusDot = document.getElementById('status-dot');
    var statusText = document.getElementById('status-text');
    var configSection = document.getElementById('config-section');
    var resultsSection = document.getElementById('results-section');
    var streamConfigSelect = document.getElementById('stream-config');
    var testCategoriesDiv = document.getElementById('test-categories');
    var btnSendConfig = document.getElementById('btn-send-config');
    var btnStart = document.getElementById('btn-start');
    var statPassed = document.getElementById('stat-passed');
    var statFailed = document.getElementById('stat-failed');
    var statPending = document.getElementById('stat-pending');
    var statTotal = document.getElementById('stat-total');
    var progressBar = document.getElementById('progress-bar');
    var currentTestEl = document.getElementById('current-test');
    var resultsList = document.getElementById('results-list');
    var resultsEmpty = document.getElementById('results-empty');
    var toastContainer = document.getElementById('toast-container');

    // ---- Init ----
    sessionDisplay.textContent = sessionId;
    loadStreamConfigs();
    loadTestCategories();
    connectWebSocket();

    // ---- Event listeners ----
    streamConfigSelect.addEventListener('change', function () {
        btnSendConfig.disabled = !this.value;
        btnStart.disabled = !this.value;
    });

    btnSendConfig.addEventListener('click', function () { sendConfiguration(); });
    btnStart.addEventListener('click', function () { startTests(); });

    // ---- API ----

    function loadStreamConfigs() {
        fetch('/api/streams')
            .then(function (r) { return r.json(); })
            .then(function (configs) {
                streamConfigSelect.innerHTML = '<option value="">Select stream config...</option>';
                configs.forEach(function (name) {
                    var opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    streamConfigSelect.appendChild(opt);
                });
            })
            .catch(function () {
                streamConfigSelect.innerHTML = '<option value="">Error</option>';
            });
    }

    function loadTestCategories() {
        fetch('/api/test-categories')
            .then(function (r) { return r.json(); })
            .then(function (categories) {
                testCategoriesDiv.innerHTML = '';
                categories.forEach(function (cat) {
                    var check = document.createElement('div');
                    check.className = 'form-check form-check-inline';
                    check.style.fontSize = '0.8rem';

                    var cb = document.createElement('input');
                    cb.className = 'form-check-input';
                    cb.type = 'checkbox';
                    cb.id = 'cat-' + cat;
                    cb.value = cat;
                    cb.checked = true;

                    var label = document.createElement('label');
                    label.className = 'form-check-label';
                    label.htmlFor = 'cat-' + cat;
                    label.textContent = cat;

                    check.appendChild(cb);
                    check.appendChild(label);
                    testCategoriesDiv.appendChild(check);
                });
            })
            .catch(function () {});
    }

    function getSelectedCategories() {
        var cats = [];
        testCategoriesDiv.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            if (cb.checked) { cats.push(cb.value); }
        });
        return cats;
    }

    function sendConfiguration() {
        wsSend({ action: 'configure', data: { streams: streamConfigSelect.value, categories: getSelectedCategories() } });
        showToast('Configuration sent to Device', 'info');
    }

    function startTests() {
        wsSend({ action: 'start', data: { streams: streamConfigSelect.value, categories: getSelectedCategories() } });
        testsStarted = true;
        configSection.classList.add('d-none');
        resultsSection.classList.remove('d-none');
        currentTestEl.textContent = 'Starting tests on TV...';
        showToast('Test start command sent', 'success');
    }

    // ---- WebSocket ----

    function connectWebSocket() {
        var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(protocol + '//' + location.host + '/ws');

        ws.onopen = function () {
            ws.send(JSON.stringify({ type: 'remote', sessionId: sessionId }));
            statusDot.className = 'status-dot status-connected';
            statusText.textContent = 'Connected to server';
        };

        ws.onmessage = function (event) {
            var msg;
            try { msg = JSON.parse(event.data); } catch (e) { return; }

            switch (msg.action) {
                case 'tv-connected':
                    statusDot.className = 'status-dot status-connected';
                    statusText.textContent = 'TV connected';
                    showToast('TV device connected', 'success');
                    break;
                case 'tv-disconnected':
                    statusDot.className = 'status-dot status-disconnected';
                    statusText.textContent = 'TV disconnected';
                    showToast('TV disconnected', 'warning');
                    break;
                case 'result':
                    onTestResult(msg.data);
                    break;
                case 'progress':
                    onProgress(msg.data);
                    break;
                case 'complete':
                    onComplete(msg.data);
                    break;
                case 'sync-results':
                    if (msg.data && msg.data.results) {
                        configSection.classList.add('d-none');
                        resultsSection.classList.remove('d-none');
                        testsStarted = true;
                        msg.data.results.forEach(function (r) { onTestResult(r); });
                    }
                    if (msg.data && msg.data.summary) { onComplete(msg.data.summary); }
                    break;
            }
        };

        ws.onclose = function () {
            statusDot.className = 'status-dot status-disconnected';
            statusText.textContent = 'Disconnected. Reconnecting...';
            setTimeout(connectWebSocket, 3000);
        };
    }

    function wsSend(msg) {
        if (ws && ws.readyState === 1) { ws.send(JSON.stringify(msg)); }
    }

    // ---- Result handling ----

    function onTestResult(data) {
        if (!testsStarted) {
            configSection.classList.add('d-none');
            resultsSection.classList.remove('d-none');
            testsStarted = true;
        }

        var status;
        if (data.status === 'passed') { counts.passed++; status = 'pass'; }
        else if (data.status === 'failed') { counts.failed++; status = 'fail'; }
        else { counts.pending++; status = 'pending'; }

        updateStats();
        addResultItem(data.fullTitle || data.title, status, data.duration);
    }

    function onProgress(data) {
        if (data.currentTest) { currentTestEl.textContent = data.currentTest; }
        if (data.total) { counts.total = data.total; }
        if (typeof data.passed === 'number') { counts.passed = data.passed; }
        if (typeof data.failed === 'number') { counts.failed = data.failed; }
        if (typeof data.pending === 'number') { counts.pending = data.pending; }
        updateStats();
    }

    function onComplete(data) {
        counts.passed = data.passes || 0;
        counts.failed = data.failures || 0;
        counts.pending = data.pending || 0;
        counts.total = data.total || (counts.passed + counts.failed + counts.pending);
        updateStats();

        progressBar.style.width = '100%';
        progressBar.classList.add(counts.failed > 0 ? 'danger' : 'success');

        var duration = data.duration ? (data.duration / 1000).toFixed(1) + 's' : '';
        currentTestEl.textContent = 'Complete! ' + counts.passed + ' passed, ' + counts.failed + ' failed' + (duration ? ' in ' + duration : '');
        showToast('Tests complete!', 'success');

        if (data.reportUrl) {
            showReportLink(data.reportUrl);
        }
    }

    function showReportLink(url) {
        if (document.getElementById('report-link')) { return; }

        var container = currentTestEl.parentNode;
        if (!container) { return; }

        var link = document.createElement('a');
        link.id = 'report-link';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'report-link';
        link.innerHTML = '<i class="bi bi-file-earmark-bar-graph"></i> View Report';
        container.parentNode.insertBefore(link, container.nextSibling);
    }

    // ---- UI helpers ----

    function updateStats() {
        statPassed.textContent = counts.passed;
        statFailed.textContent = counts.failed;
        statPending.textContent = counts.pending;
        statTotal.textContent = counts.total;

        var completed = counts.passed + counts.failed + counts.pending;
        var pct = counts.total > 0 ? (completed / counts.total * 100) : 0;
        progressBar.style.width = pct + '%';
        if (counts.failed > 0) { progressBar.classList.add('danger'); }
    }

    function addResultItem(title, status, duration) {
        if (resultsEmpty) { resultsEmpty.remove(); resultsEmpty = null; }

        var item = document.createElement('div');
        item.className = 'result-item result-' + status;

        var icon = document.createElement('span');
        icon.className = 'result-icon';
        if (status === 'pass') { icon.innerHTML = '<i class="bi bi-check-circle-fill"></i>'; }
        else if (status === 'fail') { icon.innerHTML = '<i class="bi bi-x-circle-fill"></i>'; }
        else { icon.innerHTML = '<i class="bi bi-dash-circle"></i>'; }

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
        resultsList.insertBefore(item, resultsList.firstChild);
    }

    function showToast(message, type) {
        var el = document.createElement('div');
        el.className = 'copy-notification alert alert-' + (type || 'info') + ' py-2 px-3';
        el.style.fontSize = '0.8rem';
        el.innerHTML = '<i class="bi bi-check-circle"></i> ' + message;
        toastContainer.appendChild(el);
        el.addEventListener('animationend', function () { el.remove(); });
    }

})();
