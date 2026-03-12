/**
 * Dashboard run detail page logic.
 *
 * - Single run view with 2-level collapsible grouping (testcase > testvector)
 * - MPD URL display in testvector headers
 * - Filter bar (All / Passed / Failed / Skipped)
 * - Comparison mode (?compare=id1,id2)
 */

(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var runId = params.get('id');
    var compareParam = params.get('compare');
    var pageTitle = document.getElementById('page-title');
    var runMeta = document.getElementById('run-meta');
    var runMetaGrid = document.getElementById('run-meta-grid');
    var statCards = document.getElementById('stat-cards');
    var filterBar = document.getElementById('filter-bar');
    var resultsContainer = document.getElementById('results-container');

    if (compareParam) {
        loadComparison(compareParam);
    } else if (runId) {
        loadRun(parseInt(runId, 10));
    } else {
        renderEmptyState(resultsContainer, 'question-circle', 'No run ID or compare parameter specified.');
    }

    // ---- Load single run ----

    function loadRun(id) {
        apiFetch('/api/dashboard/runs/' + id)
            .then(function (run) {
                pageTitle.textContent = 'Run #' + run.id;
                document.title = 'Run #' + run.id + ' — dash.js Test Dashboard';
                renderRunMeta(run);
                renderStatCards(run);
                renderResults(run.results);
                filterBar.style.display = '';
                bindFilterButtons();
            })
            .catch(function (err) {
                renderEmptyState(resultsContainer, 'exclamation-triangle', 'Error: ' + err.message);
            });
    }

    // ---- Render run metadata ----

    function renderRunMeta(run) {
        var shortDeviceId = run.deviceId ? run.deviceId.substring(0, 8) : '-';
        runMeta.style.display = '';
        runMetaGrid.innerHTML =
            '<div class="run-meta-item"><span class="run-meta-label">Device</span><span class="run-meta-value">' + escapeHtml(run.deviceName || run.deviceId || '-') + '</span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Device ID</span><span class="run-meta-value"><code>' + escapeHtml(shortDeviceId) + '</code>' + (run.deviceId ? ' <button class="btn btn-outline-secondary btn-sm btn-copy-id" data-copy="' + escapeHtml(run.deviceId) + '" title="Copy full Device ID"><i class="bi bi-clipboard"></i></button>' : '') + '</span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Session ID</span><span class="run-meta-value"><code>' + escapeHtml(run.sessionId) + '</code> <button class="btn btn-outline-secondary btn-sm btn-copy-id" data-copy="' + escapeHtml(run.sessionId) + '" title="Copy Session ID"><i class="bi bi-clipboard"></i></button></span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Started</span><span class="run-meta-value">' + formatTimestamp(run.startedAt) + '</span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Duration</span><span class="run-meta-value">' + formatDuration(run.duration) + '</span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Status</span><span class="run-meta-value">' + runStatusBadge(run) + '</span></div>' +
            '<div class="run-meta-item run-meta-actions"><button class="btn btn-outline-danger btn-sm" id="btn-delete-run"><i class="bi bi-trash"></i> Delete Run</button></div>';

        runMetaGrid.querySelectorAll('.btn-copy-id').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var text = btn.getAttribute('data-copy');
                navigator.clipboard.writeText(text).then(function () {
                    showToast('Copied to clipboard', 'success');
                }).catch(function () {
                    showToast('Failed to copy', 'danger');
                });
            });
        });

        document.getElementById('btn-delete-run').addEventListener('click', function () {
            if (!window.confirm('Delete run #' + run.id + '? This cannot be undone.')) { return; }
            apiDelete('/api/dashboard/runs/' + run.id)
                .then(function () {
                    showToast('Run #' + run.id + ' deleted', 'success');
                    window.location.href = '/dashboard/runs.html';
                })
                .catch(function (err) {
                    showToast('Error deleting run: ' + err.message, 'danger');
                });
        });
    }

    // ---- Stat cards ----

    function renderStatCards(run) {
        statCards.style.display = '';
        document.getElementById('sc-passed').textContent = run.passes;
        document.getElementById('sc-failed').textContent = run.failures;
        document.getElementById('sc-skipped').textContent = run.pending;
        document.getElementById('sc-total').textContent = run.total;
    }

    // ---- 2-level result rendering ----

    function renderResults(results) {
        if (!results || results.length === 0) {
            renderEmptyState(resultsContainer, 'inbox', 'No test results.');
            return;
        }

        // Group: testcase → testvector → tests[]
        var testcases = {};
        var tcOrder = [];
        var tvOrders = {};

        results.forEach(function (r) {
            var tc = extractTestcase(r.suite);
            var tv = extractTestvectorName(r.suite);
            var mpdUrl = extractMpdUrl(r.suite);

            if (!testcases[tc]) {
                testcases[tc] = { testvectors: {}, passes: 0, failures: 0, pending: 0 };
                tcOrder.push(tc);
                tvOrders[tc] = [];
            }
            if (!testcases[tc].testvectors[tv]) {
                testcases[tc].testvectors[tv] = { tests: [], passes: 0, failures: 0, pending: 0, mpdUrl: mpdUrl };
                tvOrders[tc].push(tv);
            }

            testcases[tc].testvectors[tv].tests.push(r);
            if (r.status === 'passed') {
                testcases[tc].passes++;
                testcases[tc].testvectors[tv].passes++;
            } else if (r.status === 'failed') {
                testcases[tc].failures++;
                testcases[tc].testvectors[tv].failures++;
            } else {
                testcases[tc].pending++;
                testcases[tc].testvectors[tv].pending++;
            }
        });

        var html = '';
        tcOrder.forEach(function (tcName) {
            var tc = testcases[tcName];
            var tcTotal = tc.passes + tc.failures + tc.pending;
            var hasFail = tc.failures > 0;

            html += '<div class="result-testcase-group" data-testcase="' + escapeHtml(tcName) + '">';
            html += '<div class="result-testcase-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
            html += '<i class="bi bi-chevron-down result-collapse-chevron"></i>';
            html += '<span class="result-testcase-name">' + escapeHtml(tcName) + '</span>';
            html += '<span class="result-testcase-count' + (hasFail ? ' has-failures' : '') + '">' + tc.passes + ' / ' + tcTotal + '</span>';
            html += '</div>';
            html += '<div class="result-testcase-body">';

            tvOrders[tcName].forEach(function (tvName) {
                var tvData = tc.testvectors[tvName];
                var tvTotal = tvData.tests.length;
                var tvHasFail = tvData.failures > 0;

                html += '<div class="result-testvector-group" data-testvector="' + escapeHtml(tvName) + '">';
                html += '<div class="result-testvector-header" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
                html += '<i class="bi bi-chevron-down result-collapse-chevron-sm"></i>';
                html += '<div class="result-testvector-header-text">';
                html += '<span class="result-testvector-name">' + escapeHtml(tvName) + '</span>';
                if (tvData.mpdUrl) {
                    html += '<span class="result-testvector-url">' + escapeHtml(tvData.mpdUrl) + '</span>';
                }
                html += '</div>';
                html += '<span class="result-testvector-count' + (tvHasFail ? ' has-failures' : '') + '">' + tvData.passes + ' / ' + tvTotal + '</span>';
                html += '</div>';
                html += '<div class="result-testvector-items">';

                tvData.tests.forEach(function (test) {
                    var statusClass = test.status === 'passed' ? 'pass' : (test.status === 'failed' ? 'fail' : 'pending');
                    var icon = test.status === 'passed' ? 'check-circle-fill' : (test.status === 'failed' ? 'x-circle-fill' : 'skip-forward-circle');

                    html += '<div class="result-item-wrapper" data-status="' + statusClass + '">';
                    html += '<div class="result-item result-' + statusClass + '">';
                    html += '<span class="result-icon"><i class="bi bi-' + icon + '"></i></span>';
                    html += '<span class="result-title" title="' + escapeHtml(test.fullTitle || test.title) + '">' + escapeHtml(test.title) + '</span>';
                    html += '<span class="result-duration">' + (test.duration ? (test.duration / 1000).toFixed(1) + 's' : '') + '</span>';
                    html += '</div>';
                    if (test.status === 'failed' && test.error) {
                        html += '<div class="result-error">' + escapeHtml(test.error) + '</div>';
                    }
                    html += '</div>';
                });

                html += '</div></div>';
            });

            html += '</div></div>';
        });

        resultsContainer.innerHTML = html;
    }

    // ---- Filter ----

    function bindFilterButtons() {
        var btns = filterBar.querySelectorAll('.result-filter-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', function () {
                var status = this.getAttribute('data-filter');
                for (var b = 0; b < btns.length; b++) {
                    btns[b].classList.toggle('active', btns[b].getAttribute('data-filter') === status);
                }
                applyFilter(status);
            });
        }
    }

    function applyFilter(status) {
        var tcGroups = resultsContainer.querySelectorAll('.result-testcase-group');
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
                if (visibleCount > 0) {
                    tcVisibleTvs++;
                    if (status !== 'all') { tvEl.classList.remove('collapsed'); }
                }
            }

            tcEl.style.display = tcVisibleTvs > 0 ? '' : 'none';
            if (tcVisibleTvs > 0 && status !== 'all') {
                tcEl.classList.remove('collapsed');
            }
        }
    }

    // ---- Comparison mode ----

    function loadComparison(param) {
        var ids = param.split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(Boolean);
        if (ids.length !== 2) {
            renderEmptyState(resultsContainer, 'question-circle', 'Provide exactly two run IDs to compare.');
            return;
        }

        pageTitle.textContent = 'Compare Run #' + ids[0] + ' vs #' + ids[1];
        document.title = 'Compare Runs — dash.js Test Dashboard';

        apiFetch('/api/dashboard/compare?runs=' + ids.join(','))
            .then(function (data) {
                renderComparisonMeta(data.run1, data.run2);
                renderComparisonTable(data.comparison, data.run1, data.run2);
            })
            .catch(function (err) {
                renderEmptyState(resultsContainer, 'exclamation-triangle', 'Error: ' + err.message);
            });
    }

    function renderComparisonMeta(run1, run2) {
        runMeta.style.display = '';
        statCards.style.display = '';

        runMetaGrid.innerHTML =
            '<div class="run-meta-item"><span class="run-meta-label">Run #' + run1.id + '</span><span class="run-meta-value">' + escapeHtml(run1.deviceName || '-') + ' — ' + formatTimestamp(run1.startedAt) + '</span></div>' +
            '<div class="run-meta-item"><span class="run-meta-label">Run #' + run2.id + '</span><span class="run-meta-value">' + escapeHtml(run2.deviceName || '-') + ' — ' + formatTimestamp(run2.startedAt) + '</span></div>';

        document.getElementById('sc-passed').textContent = run1.passes + ' / ' + run2.passes;
        document.getElementById('sc-failed').textContent = run1.failures + ' / ' + run2.failures;
        document.getElementById('sc-skipped').textContent = run1.pending + ' / ' + run2.pending;
        document.getElementById('sc-total').textContent = run1.total + ' / ' + run2.total;
    }

    function renderComparisonTable(comparison, run1, run2) {
        if (!comparison || comparison.length === 0) {
            renderEmptyState(resultsContainer, 'inbox', 'No test results to compare.');
            return;
        }

        var html = '<table class="compare-table">';
        html += '<thead><tr>';
        html += '<th>Test</th>';
        html += '<th class="text-center">Run #' + run1.id + '</th>';
        html += '<th class="text-center">Run #' + run2.id + '</th>';
        html += '<th>Change</th>';
        html += '</tr></thead><tbody>';

        comparison.forEach(function (row) {
            var s1 = row.run1Status;
            var s2 = row.run2Status;
            var change = '';
            var rowClass = '';

            if (s1 === 'passed' && s2 === 'failed') {
                change = '<span class="text-danger-themed"><i class="bi bi-arrow-down-circle"></i> Regression</span>';
                rowClass = ' class="compare-regression"';
            } else if (s1 === 'failed' && s2 === 'passed') {
                change = '<span class="text-success-themed"><i class="bi bi-arrow-up-circle"></i> Fixed</span>';
                rowClass = ' class="compare-fixed"';
            } else if (s1 === null) {
                change = '<span class="text-muted">New in #' + run2.id + '</span>';
            } else if (s2 === null) {
                change = '<span class="text-muted">Removed in #' + run2.id + '</span>';
            } else {
                change = '<span class="text-muted">—</span>';
            }

            html += '<tr' + rowClass + '>';
            html += '<td class="compare-test-name" title="' + escapeHtml(row.fullTitle) + '">' + escapeHtml(row.title) + '</td>';
            html += '<td class="text-center">' + statusIcon(s1) + '</td>';
            html += '<td class="text-center">' + statusIcon(s2) + '</td>';
            html += '<td>' + change + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        resultsContainer.innerHTML = html;
    }

    function statusIcon(status) {
        if (status === 'passed') { return '<i class="bi bi-check-circle-fill text-success-themed"></i>'; }
        if (status === 'failed') { return '<i class="bi bi-x-circle-fill text-danger-themed"></i>'; }
        if (status === 'pending') { return '<i class="bi bi-skip-forward-circle text-warning-themed"></i>'; }
        return '<span class="text-muted">—</span>';
    }

})();
