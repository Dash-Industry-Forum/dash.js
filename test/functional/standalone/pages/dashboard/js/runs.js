/**
 * Dashboard runs list page logic.
 *
 * - Paginated table of test runs
 * - Filtering by device, status, date range
 * - Compare mode (select two runs)
 */

(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var runsContainer = document.getElementById('runs-container');
    var paginationEl = document.getElementById('pagination');
    var filterForm = document.getElementById('filter-form');
    var filterDevice = document.getElementById('filter-device');
    var filterStatus = document.getElementById('filter-status');
    var filterFrom = document.getElementById('filter-from');
    var filterTo = document.getElementById('filter-to');
    var btnReset = document.getElementById('btn-reset');
    var btnCompare = document.getElementById('btn-compare');

    var currentPage = parseInt(params.get('page'), 10) || 1;
    var selectedForCompare = [];

    // Pre-fill filters from URL params
    if (params.get('deviceId')) { filterDevice.value = params.get('deviceId'); }
    if (params.get('status')) { filterStatus.value = params.get('status'); }
    if (params.get('from')) { filterFrom.value = params.get('from'); }
    if (params.get('to')) { filterTo.value = params.get('to'); }

    // Load devices for filter dropdown
    apiFetch('/api/dashboard/devices')
        .then(function (devices) {
            devices.forEach(function (d) {
                var opt = document.createElement('option');
                opt.value = d.deviceId;
                opt.textContent = d.name || d.deviceId;
                filterDevice.appendChild(opt);
            });
            // Re-apply from URL
            if (params.get('deviceId')) { filterDevice.value = params.get('deviceId'); }
        })
        .catch(function () { /* ignore */ });

    loadRuns(currentPage);

    // ---- Events ----

    filterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        currentPage = 1;
        loadRuns(currentPage);
    });

    btnReset.addEventListener('click', function () {
        filterDevice.value = '';
        filterStatus.value = '';
        filterFrom.value = '';
        filterTo.value = '';
        currentPage = 1;
        loadRuns(currentPage);
    });

    btnCompare.addEventListener('click', function () {
        if (selectedForCompare.length === 2) {
            window.location.href = '/dashboard/run.html?compare=' + selectedForCompare.join(',');
        }
    });

    // ---- Load runs ----

    function buildQueryString(page) {
        var q = ['page=' + page, 'limit=20'];
        if (filterDevice.value) { q.push('deviceId=' + encodeURIComponent(filterDevice.value)); }
        if (filterStatus.value) { q.push('status=' + encodeURIComponent(filterStatus.value)); }
        if (filterFrom.value) { q.push('from=' + encodeURIComponent(filterFrom.value)); }
        if (filterTo.value) { q.push('to=' + encodeURIComponent(filterTo.value)); }
        return q.join('&');
    }

    function loadRuns(page) {
        runsContainer.innerHTML = '<div class="empty-state"><i class="bi bi-hourglass-split spin"></i>Loading...</div>';

        apiFetch('/api/dashboard/runs?' + buildQueryString(page))
            .then(function (data) {
                if (!data.runs || data.runs.length === 0) {
                    renderEmptyState(runsContainer, 'inbox', 'No runs match the current filters.');
                    paginationEl.innerHTML = '';
                    return;
                }
                renderRunsTable(data.runs);
                renderPagination(data.total, data.page, data.limit);
            })
            .catch(function (err) {
                renderEmptyState(runsContainer, 'exclamation-triangle', 'Error: ' + err.message);
            });
    }

    // ---- Render ----

    function renderRunsTable(runs) {
        var html = '<table class="runs-table">';
        html += '<thead><tr>';
        html += '<th style="width:30px"></th>';
        html += '<th>#</th><th>Device</th><th>Started</th>';
        html += '<th class="text-center">Passed</th><th class="text-center">Failed</th>';
        html += '<th class="text-center">Skipped</th><th>Duration</th><th>Status</th>';
        html += '<th style="width:36px"></th>';
        html += '</tr></thead><tbody>';

        runs.forEach(function (run) {
            var checked = selectedForCompare.indexOf(run.id) >= 0 ? ' checked' : '';
            html += '<tr class="runs-table-row" data-run-id="' + run.id + '">';
            html += '<td><input type="checkbox" class="form-check-input compare-cb" data-id="' + run.id + '"' + checked + '></td>';
            html += '<td>' + run.id + '</td>';
            html += '<td>' + escapeHtml(run.deviceName || run.deviceId || '-') + '</td>';
            html += '<td title="' + formatTimestamp(run.startedAt) + '">' + relativeTime(run.startedAt) + '</td>';
            html += '<td class="text-center text-success-themed">' + run.passes + '</td>';
            html += '<td class="text-center text-danger-themed">' + run.failures + '</td>';
            html += '<td class="text-center text-warning-themed">' + run.pending + '</td>';
            html += '<td>' + formatDuration(run.duration) + '</td>';
            html += '<td>' + runStatusBadge(run) + '</td>';
            html += '<td><button class="btn-delete-run" data-id="' + run.id + '" title="Delete run"><i class="bi bi-trash"></i></button></td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        runsContainer.innerHTML = html;

        // Row click (navigate to detail)
        var rows = runsContainer.querySelectorAll('.runs-table-row');
        for (var i = 0; i < rows.length; i++) {
            rows[i].addEventListener('click', function (e) {
                if (e.target.classList.contains('compare-cb') || e.target.closest('.btn-delete-run')) { return; }
                window.location.href = '/dashboard/run.html?id=' + this.getAttribute('data-run-id');
            });
        }

        // Delete buttons
        var delBtns = runsContainer.querySelectorAll('.btn-delete-run');
        for (var d = 0; d < delBtns.length; d++) {
            delBtns[d].addEventListener('click', function (e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                if (!window.confirm('Delete run #' + id + '? This cannot be undone.')) { return; }
                apiDelete('/api/dashboard/runs/' + id)
                    .then(function () {
                        showToast('Run #' + id + ' deleted', 'success');
                        loadRuns(currentPage);
                    })
                    .catch(function (err) {
                        showToast('Error deleting run: ' + err.message, 'danger');
                    });
            });
        }

        // Compare checkboxes
        var cbs = runsContainer.querySelectorAll('.compare-cb');
        for (var j = 0; j < cbs.length; j++) {
            cbs[j].addEventListener('change', function () {
                var id = parseInt(this.getAttribute('data-id'), 10);
                if (this.checked) {
                    if (selectedForCompare.length >= 2) {
                        // Uncheck the first one
                        var firstId = selectedForCompare.shift();
                        var firstCb = runsContainer.querySelector('.compare-cb[data-id="' + firstId + '"]');
                        if (firstCb) { firstCb.checked = false; }
                    }
                    selectedForCompare.push(id);
                } else {
                    var idx = selectedForCompare.indexOf(id);
                    if (idx >= 0) { selectedForCompare.splice(idx, 1); }
                }
                btnCompare.disabled = selectedForCompare.length !== 2;
            });
        }
    }

    function renderPagination(total, page, limit) {
        var totalPages = Math.ceil(total / limit);
        if (totalPages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        var html = '<div class="d-flex justify-content-between align-items-center">';
        html += '<span class="pagination-info">' + total + ' runs total, page ' + page + ' of ' + totalPages + '</span>';
        html += '<div class="btn-group btn-group-sm">';

        if (page > 1) {
            html += '<button class="btn btn-outline-secondary" data-page="' + (page - 1) + '"><i class="bi bi-chevron-left"></i></button>';
        }

        var startPage = Math.max(1, page - 2);
        var endPage = Math.min(totalPages, page + 2);
        for (var p = startPage; p <= endPage; p++) {
            html += '<button class="btn btn-outline-secondary' + (p === page ? ' active' : '') + '" data-page="' + p + '">' + p + '</button>';
        }

        if (page < totalPages) {
            html += '<button class="btn btn-outline-secondary" data-page="' + (page + 1) + '"><i class="bi bi-chevron-right"></i></button>';
        }

        html += '</div></div>';
        paginationEl.innerHTML = html;

        // Bind page buttons
        var buttons = paginationEl.querySelectorAll('[data-page]');
        for (var i = 0; i < buttons.length; i++) {
            buttons[i].addEventListener('click', function () {
                currentPage = parseInt(this.getAttribute('data-page'), 10);
                loadRuns(currentPage);
                window.scrollTo(0, 0);
            });
        }
    }

})();
