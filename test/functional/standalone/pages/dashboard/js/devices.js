/**
 * Dashboard devices page logic.
 *
 * - Displays all registered devices with status
 * - Auto-refreshes every 30 seconds
 * - Click to view device's run history
 */

(function () {
    'use strict';

    var devicesContainer = document.getElementById('devices-container');
    var deviceCount = document.getElementById('device-count');

    loadDevices();

    function loadDevices() {
        apiFetch('/api/dashboard/devices')
            .then(function (devices) {
                deviceCount.textContent = devices.length;
                if (devices.length === 0) {
                    devicesContainer.innerHTML =
                        '<div class="empty-state">' +
                        '<i class="bi bi-display"></i>' +
                        'No devices have connected yet' +
                        '<div class="empty-state-help">' +
                        'Open the <a href="/standalone/index.html">Test Runner</a> on a target device to register it, ' +
                        'or use the <a href="/dashboard/agent.html">Device Agent</a> page for always-on devices like Smart TVs.' +
                        '</div>' +
                        '</div>';
                    return;
                }
                renderDevicesTable(devices);
            })
            .catch(function (err) {
                renderEmptyState(devicesContainer, 'exclamation-triangle', 'Error: ' + err.message);
            });
    }

    function renderDevicesTable(devices) {
        var html = '<table class="runs-table">';
        html += '<thead><tr>';
        html += '<th style="width:40px">Status</th>';
        html += '<th>Name</th>';
        html += '<th>User Agent</th>';
        html += '<th>Last Seen</th>';
        html += '<th class="text-center">Runs</th>';
        html += '</tr></thead><tbody>';

        devices.forEach(function (d) {
            html += '<tr class="runs-table-row" data-device-id="' + escapeHtml(d.deviceId) + '">';
            html += '<td class="text-center">' + deviceStatusDot(d.status) + '</td>';
            html += '<td><strong>' + escapeHtml(d.name || 'Unnamed') + '</strong></td>';
            html += '<td class="text-muted" style="font-size:0.75rem;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(d.userAgent) + '</td>';
            html += '<td title="' + formatTimestamp(d.lastSeen) + '">' + relativeTime(d.lastSeen) + '</td>';
            html += '<td class="text-center">' + d.runCount + '</td>';
            html += '</tr>';
        });

        html += '</tbody></table>';
        devicesContainer.innerHTML = html;

        // Click to view device runs
        var rows = devicesContainer.querySelectorAll('.runs-table-row');
        for (var i = 0; i < rows.length; i++) {
            rows[i].addEventListener('click', function () {
                var devId = this.getAttribute('data-device-id');
                window.location.href = '/dashboard/runs.html?deviceId=' + encodeURIComponent(devId);
            });
        }
    }

    // Auto-refresh every 30 seconds
    setInterval(loadDevices, 30000);

})();
