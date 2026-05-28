/**
 * NotificationPanel.js - Unified notification display for errors, warnings, and conformance violations
 */

import {$, $$, createElement} from './UIHelpers.js';

const SEVERITY = {
    ERROR: { key: 'error', label: 'Error', className: 'badge-error' },
    WARNING: { key: 'warning', label: 'Warning', className: 'badge-warning' },
    SUGGESTION: { key: 'suggestion', label: 'Suggestion', className: 'badge-suggestion' }
};

// Map dash.js log levels to notification severity
const LOG_LEVEL_MAP = {
    1: SEVERITY.ERROR,   // fatal
    2: SEVERITY.ERROR,   // error
    3: SEVERITY.WARNING  // warning
};

// Map conformance violation severity values
const CONFORMANCE_SEVERITY_MAP = {
    0: SEVERITY.SUGGESTION,
    1: SEVERITY.WARNING,
    2: SEVERITY.ERROR
};

const MAX_ITEMS = 100;
const DEDUP_WINDOW_MS = 2000;

export class NotificationPanel {
    constructor(playerController) {
        this.playerController = playerController;
        this._items = [];
        this._lastLogMessage = '';
        this._lastLogTime = 0;
        this._activeFilters = new Set(['error', 'warning', 'suggestion']);
        this._searchQuery = '';
    }

    /**
     * Initialize the panel and subscribe to player events
     */
    init() {
        // Clear button
        const clearBtn = $('#btn-notification-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this._clear());
        }

        // Filter buttons
        const filterBtns = $$('.notification-filter-btn');
        for (const btn of filterBtns) {
            btn.addEventListener('click', () => this._onFilterToggle(btn));
        }

        // Search input
        const searchInput = $('#notification-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this._searchQuery = searchInput.value.trim().toLowerCase();
                this._applyFilters();
            });
        }

        // Player error events (dashjs ERROR)
        this.playerController.on('error', (e) => this._onError(e));

        // Log events (warning and error level)
        this.playerController.on('log', (e) => this._onLog(e));

        // Conformance violations
        this.playerController.on('conformanceViolation', (e) => this._onConformanceViolation(e));

        // Session lifecycle
        this.playerController.on('sessionReset', () => this._clear());
        this.playerController.on('stopped', () => this._clear());
    }

    // ---- Event handlers ----

    _onError(e) {
        let message = 'An error occurred during playback.';
        if (e && e.error) {
            const err = e.error;
            if (err.message) {
                message = err.message;
            }
            if (err.code) {
                message = `[Error ${err.code}] ${message}`;
            }
        }
        this._addNotification(SEVERITY.ERROR, message);
    }

    _onLog(e) {
        if (!e || !e.message) {
            return;
        }

        // Deduplicate consecutive identical log messages within the time window
        const now = Date.now();
        if (e.message === this._lastLogMessage && (now - this._lastLogTime) < DEDUP_WINDOW_MS) {
            return;
        }
        this._lastLogMessage = e.message;
        this._lastLogTime = now;

        const severity = LOG_LEVEL_MAP[e.level] || SEVERITY.WARNING;
        this._addNotification(severity, e.message);
    }

    _onConformanceViolation(e) {
        const severityValue = e.event?.severity !== undefined ? e.event.severity : 1;
        const severity = CONFORMANCE_SEVERITY_MAP[severityValue] || SEVERITY.WARNING;
        const message = e.event?.message || 'Unknown conformance violation';
        this._addNotification(severity, `[Conformance] ${message}`);
    }

    // ---- Filter / search ----

    _onFilterToggle(btn) {
        const filter = btn.dataset.filter;
        if (!filter) {
            return;
        }

        btn.classList.toggle('active');

        if (this._activeFilters.has(filter)) {
            this._activeFilters.delete(filter);
        } else {
            this._activeFilters.add(filter);
        }

        this._applyFilters();
    }

    _applyFilters() {
        for (const item of this._items) {
            const severity = item.dataset.severity;
            const message = item.dataset.message;

            const matchesType = this._activeFilters.has(severity);
            const matchesSearch = !this._searchQuery || message.indexOf(this._searchQuery) !== -1;

            item.classList.toggle('d-none', !(matchesType && matchesSearch));
        }

        this._updateCount();
    }

    // ---- DOM manipulation ----

    _addNotification(severity, message) {
        const list = $('#notification-list');
        if (!list) {
            return;
        }

        // Remove empty-state placeholder on first item
        this._hideEmptyState();

        // Build timestamp from session time
        const sessionTime = this.playerController.getSessionTime();
        const timestamp = this._formatTimestamp(sessionTime);

        // Create the notification item
        const item = createElement('div', { className: 'notification-item' },
            createElement('span', {
                className: 'notification-timestamp',
                textContent: timestamp
            }),
            createElement('span', {
                className: `notification-badge ${severity.className}`,
                textContent: severity.label
            }),
            createElement('span', {
                className: 'notification-message',
                textContent: message
            })
        );

        // Store severity and lowercase message for filtering
        item.dataset.severity = severity.key;
        item.dataset.message = message.toLowerCase();

        // Check if the new item should be hidden based on current filters/search
        const matchesType = this._activeFilters.has(severity.key);
        const matchesSearch = !this._searchQuery || item.dataset.message.indexOf(this._searchQuery) !== -1;
        if (!(matchesType && matchesSearch)) {
            item.classList.add('d-none');
        }

        // Prepend (newest on top)
        list.insertBefore(item, list.firstChild);

        // Track items
        this._items.push(item);

        // Trim oldest if over the limit
        if (this._items.length > MAX_ITEMS) {
            const oldest = this._items.shift();
            if (oldest && oldest.parentNode) {
                oldest.parentNode.removeChild(oldest);
            }
        }

        // Update visible count
        this._updateCount();
    }

    _updateCount() {
        const countBadge = $('#notification-count');
        if (!countBadge) {
            return;
        }
        let visible = 0;
        for (const item of this._items) {
            if (!item.classList.contains('d-none')) {
                visible++;
            }
        }
        countBadge.textContent = String(visible);
    }

    _clear() {
        const list = $('#notification-list');
        const searchInput = $('#notification-search');

        if (list) {
            list.innerHTML = '';
        }
        if (searchInput) {
            searchInput.value = '';
        }

        this._items = [];
        this._lastLogMessage = '';
        this._lastLogTime = 0;
        this._searchQuery = '';

        this._showEmptyState();
        this._updateCount();
    }

    _hideEmptyState() {
        const empty = $('#notification-empty');
        if (empty) {
            empty.remove();
        }
    }

    _showEmptyState() {
        const list = $('#notification-list');
        if (!list || $('#notification-empty')) {
            return;
        }
        const el = createElement('div', {
            className: 'notification-empty',
            id: 'notification-empty',
            textContent: 'No messages'
        });
        list.appendChild(el);
    }

    _formatTimestamp(seconds) {
        if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
            return '00:00';
        }
        seconds = Math.floor(seconds);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(m)}:${pad(s)}`;
    }
}
