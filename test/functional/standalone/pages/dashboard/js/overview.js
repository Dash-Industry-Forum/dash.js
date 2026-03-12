/**
 * Dashboard overview page logic.
 *
 * - Loads recent runs
 * - Shows online devices
 * - Provides dispatch form
 */

(function () {
    'use strict';

    var recentRunsEl = document.getElementById('recent-runs');
    var onlineDevicesEl = document.getElementById('online-devices');
    var dispatchDevice = document.getElementById('dispatch-device');
    var dispatchPreset = document.getElementById('dispatch-preset');
    var dispatchBtn = document.getElementById('dispatch-btn');
    var dispatchForm = document.getElementById('dispatch-form');
    var dispatchFeedback = document.getElementById('dispatch-feedback');

    loadData();

    // ---- Load data ----

    function loadData() {
        loadRecentRuns();
        loadDevices();
        loadPresets();
    }

    function loadRecentRuns() {
        apiFetch('/api/dashboard/runs?limit=10')
            .then(function (data) {
                if (!data.runs || data.runs.length === 0) {
                    renderEmptyState(recentRunsEl, 'clock-history', 'No test runs yet. Run some tests to see results here.');
                    return;
                }
                renderRunsTable(data.runs);
            })
            .catch(function (err) {
                renderEmptyState(recentRunsEl, 'exclamation-triangle', 'Error loading runs: ' + err.message);
            });
    }

    function loadDevices() {
        apiFetch('/api/dashboard/devices')
            .then(function (devices) {
                var online = devices.filter(function (d) { return d.status === 'online'; });
                renderOnlineDevices(online);
                updateDispatchDeviceDropdown(online);
            })
            .catch(function (err) {
                renderEmptyState(onlineDevicesEl, 'exclamation-triangle', 'Error: ' + err.message);
            });
    }

    function loadPresets() {
        apiFetch('/api/dashboard/stream-presets')
            .then(function (presets) {
                dispatchPreset.innerHTML = '';
                if (presets.length === 0) {
                    dispatchPreset.innerHTML = '<option value="">No presets available</option>';
                    return;
                }
                presets.forEach(function (name) {
                    var opt = document.createElement('option');
                    opt.value = name;
                    opt.textContent = name;
                    dispatchPreset.appendChild(opt);
                });
            })
            .catch(function () {
                dispatchPreset.innerHTML = '<option value="">Error loading presets</option>';
            });
    }

    // ---- Render recent runs ----

    function renderRunsTable(runs) {
        var html = '<table class="runs-table">';
        html += '<thead><tr>';
        html += '<th>#</th><th>Device</th><th>Started</th>';
        html += '<th class="text-center">Passed</th><th class="text-center">Failed</th>';
        html += '<th class="text-center">Skipped</th><th>Duration</th><th>Status</th>';
        html += '<th style="width:36px"></th>';
        html += '</tr></thead><tbody>';

        runs.forEach(function (run) {
            html += '<tr class="runs-table-row" data-run-id="' + run.id + '">';
            html += '<td>' + run.id + '</td>';
            html += '<td>' + escapeHtml(run.deviceName || run.deviceId || '-') + '</td>';
            html += '<td>' + relativeTime(run.startedAt) + '</td>';
            html += '<td class="text-center text-success-themed">' + run.passes + '</td>';
            html += '<td class="text-center text-danger-themed">' + run.failures + '</td>';
            html += '<td class="text-center text-warning-themed">' + run.pending + '</td>';
            html += '<td>' + formatDuration(run.duration) + '</td>';
            html += '<td>' + runStatusBadge(run) + '</td>';
            html += '<td><button class="btn-delete-run" data-id="' + run.id + '" title="Delete run"><i class="bi bi-trash"></i></button></td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        recentRunsEl.innerHTML = html;

        // Click to navigate to run detail
        var rows = recentRunsEl.querySelectorAll('.runs-table-row');
        for (var i = 0; i < rows.length; i++) {
            rows[i].addEventListener('click', function (e) {
                if (e.target.closest('.btn-delete-run')) { return; }
                window.location.href = '/dashboard/run.html?id=' + this.getAttribute('data-run-id');
            });
        }

        // Delete buttons
        var delBtns = recentRunsEl.querySelectorAll('.btn-delete-run');
        for (var d = 0; d < delBtns.length; d++) {
            delBtns[d].addEventListener('click', function (e) {
                e.stopPropagation();
                var id = this.getAttribute('data-id');
                if (!window.confirm('Delete run #' + id + '? This cannot be undone.')) { return; }
                apiDelete('/api/dashboard/runs/' + id)
                    .then(function () {
                        showToast('Run #' + id + ' deleted', 'success');
                        loadRecentRuns();
                    })
                    .catch(function (err) {
                        showToast('Error deleting run: ' + err.message, 'danger');
                    });
            });
        }
    }

    // ---- Render online devices ----

    function renderOnlineDevices(devices) {
        if (devices.length === 0) {
            onlineDevicesEl.innerHTML =
                '<div class="empty-state">' +
                '<i class="bi bi-display"></i>' +
                'No devices currently online' +
                '<div class="empty-state-help">' +
                'Open the <a href="/standalone/index.html">Test Runner</a> on a target device to register it, ' +
                'or use the <a href="/dashboard/agent.html">Device Agent</a> for always-on availability.' +
                '</div>' +
                '</div>';
            return;
        }

        var html = '';
        devices.forEach(function (d) {
            html += '<div class="device-card">';
            html += deviceStatusDot('online');
            html += '<div class="device-card-info">';
            html += '<div class="device-card-name">' + escapeHtml(d.name || d.deviceId) + '</div>';
            html += '<div class="device-card-meta">' + escapeHtml(d.userAgent).substring(0, 60) + '</div>';
            html += '</div>';
            html += '<span class="device-card-runs">' + d.runCount + ' runs</span>';
            html += '</div>';
        });
        onlineDevicesEl.innerHTML = html;
    }

    function updateDispatchDeviceDropdown(online) {
        dispatchDevice.innerHTML = '';
        if (online.length === 0) {
            dispatchDevice.innerHTML = '<option value="">No devices online</option>';
            dispatchBtn.disabled = true;
            dispatchBtn.title = 'No devices online';
            return;
        }
        online.forEach(function (d) {
            var opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.name || d.deviceId;
            dispatchDevice.appendChild(opt);
        });
        dispatchBtn.disabled = false;
        dispatchBtn.title = '';
    }

    // ---- Dispatch ----

    dispatchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var targetDevice = dispatchDevice.value;
        var preset = dispatchPreset.value;
        if (!targetDevice || !preset) {
            showToast('Select a device and preset', 'warning');
            return;
        }

        dispatchBtn.disabled = true;
        dispatchBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
        dispatchFeedback.innerHTML = '';

        // Load the preset config, then dispatch
        apiFetch('/api/stream-config/' + encodeURIComponent(preset))
            .then(function (config) {
                return apiPost('/api/dashboard/dispatch', {
                    deviceId: targetDevice,
                    config: {
                        testvectors: config.testvectors || [],
                    },
                });
            })
            .then(function (result) {
                dispatchFeedback.innerHTML =
                    '<div class="alert alert-success py-1 px-2" style="font-size:0.8rem;">' +
                    '<i class="bi bi-check-circle"></i> Test dispatched! ' +
                    'Session: <code>' + escapeHtml(result.sessionId) + '</code>' +
                    '</div>';
                showToast('Test dispatched to device', 'success');
                // Refresh runs after a delay
                setTimeout(loadRecentRuns, 2000);
            })
            .catch(function (err) {
                dispatchFeedback.innerHTML =
                    '<div class="alert alert-danger py-1 px-2" style="font-size:0.8rem;">' +
                    '<i class="bi bi-exclamation-triangle"></i> ' + escapeHtml(err.message) +
                    '</div>';
            })
            .finally(function () {
                dispatchBtn.disabled = false;
                dispatchBtn.innerHTML = '<i class="bi bi-send"></i> Dispatch';
            });
    });

    // Auto-refresh devices every 30 seconds
    setInterval(function () {
        loadDevices();
    }, 30000);

})();
