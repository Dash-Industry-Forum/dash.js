/**
 * Dashboard shared logic.
 *
 * Provides:
 * - Theme handling (matches standalone runner)
 * - Navigation rendering
 * - Fetch helpers with error handling
 * - Empty state rendering
 * - Relative time formatting
 * - Toast notifications
 */

/* global document, localStorage, fetch, location, window */

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

// ---- Toast ----

function showToast(message, type) {
    var container = document.getElementById('toast-container');
    if (!container) { return; }
    var el = document.createElement('div');
    el.className = 'copy-notification alert alert-' + (type || 'info') + ' py-2 px-3';
    el.style.fontSize = '0.8rem';
    el.innerHTML = '<i class="bi bi-check-circle"></i> ' + message;
    container.appendChild(el);
    el.addEventListener('animationend', function () { el.remove(); });
}

// ---- Fetch helpers ----

function apiFetch(url) {
    return fetch(url).then(function (r) {
        if (!r.ok) {
            if (r.status === 503) {
                throw new Error('Database not available');
            }
            throw new Error('HTTP ' + r.status);
        }
        return r.json();
    });
}

function apiDelete(url) {
    return fetch(url, { method: 'DELETE' }).then(function (r) {
        if (!r.ok) {
            return r.json().then(function (data) {
                throw new Error(data.error || 'HTTP ' + r.status);
            });
        }
        return r.json();
    });
}

function apiPost(url, body) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    }).then(function (r) {
        if (!r.ok) {
            return r.json().then(function (data) {
                throw new Error(data.error || 'HTTP ' + r.status);
            });
        }
        return r.json();
    });
}

// ---- Relative time ----

function relativeTime(timestamp) {
    if (!timestamp) { return 'never'; }
    var diff = Date.now() - timestamp;
    if (diff < 0) { diff = 0; }
    var seconds = Math.floor(diff / 1000);
    if (seconds < 60) { return seconds + 's ago'; }
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) { return minutes + 'm ago'; }
    var hours = Math.floor(minutes / 60);
    if (hours < 24) { return hours + 'h ago'; }
    var days = Math.floor(hours / 24);
    if (days < 30) { return days + 'd ago'; }
    return new Date(timestamp).toLocaleDateString();
}

function formatTimestamp(timestamp) {
    if (!timestamp) { return '-'; }
    var d = new Date(timestamp);
    return d.toLocaleString();
}

function formatDuration(ms) {
    if (!ms) { return '-'; }
    var seconds = ms / 1000;
    if (seconds < 60) { return seconds.toFixed(1) + 's'; }
    var minutes = Math.floor(seconds / 60);
    var secs = Math.floor(seconds % 60);
    return minutes + 'm ' + secs + 's';
}

// ---- Empty state ----

function renderEmptyState(container, icon, message) {
    container.innerHTML =
        '<div class="empty-state">' +
        '<i class="bi bi-' + icon + '"></i>' +
        message +
        '</div>';
}

// ---- Status badge ----

function runStatusBadge(run) {
    if (run.failures > 0) {
        return '<span class="badge bg-danger">Failed</span>';
    }
    if (run.status === 'completed') {
        return '<span class="badge bg-success">Passed</span>';
    }
    if (run.status === 'running') {
        return '<span class="badge bg-primary">Running</span>';
    }
    if (run.status === 'dispatched') {
        return '<span class="badge bg-info">Dispatched</span>';
    }
    return '<span class="badge bg-secondary">' + (run.status || 'unknown') + '</span>';
}

function deviceStatusDot(status) {
    var cls = status === 'online' ? 'device-status-online' : 'device-status-offline';
    return '<span class="device-status-dot ' + cls + '"></span>';
}

// ---- Escape HTML ----

function escapeHtml(str) {
    if (!str) { return ''; }
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ---- Suite name parsing (reused from runner-core.js) ----

function extractTestcase(suiteName) {
    if (!suiteName) { return 'unknown'; }
    var dashIdx = suiteName.indexOf(' - ');
    return dashIdx > 0 ? suiteName.substring(0, dashIdx) : suiteName;
}

function extractTestvectorName(suiteName) {
    if (!suiteName) { return 'unknown'; }
    var parts = suiteName.split(' - ');
    if (parts.length >= 2) { return parts[1]; }
    return suiteName;
}

function extractMpdUrl(suiteName) {
    if (!suiteName) { return ''; }
    var parts = suiteName.split(' - ');
    if (parts.length >= 3) { return parts.slice(2).join(' - '); }
    return '';
}
