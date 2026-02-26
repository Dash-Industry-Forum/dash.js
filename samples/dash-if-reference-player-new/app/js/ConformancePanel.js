/**
 * ConformancePanel.js - Conformance violations display
 */

import {$, show, createElement} from './UIHelpers.js';

const SEVERITY_MAP = {
    0: { label: 'Suggestion', className: 'badge-suggestion' },
    1: { label: 'Warning', className: 'badge-warning' },
    2: { label: 'Error', className: 'badge-error' }
};

export class ConformancePanel {
    constructor(playerController) {
        this.playerController = playerController;
    }

    /**
     * Initialize and listen for conformance violations
     */
    init() {
        this.playerController.on('conformanceViolation', (data) => this._addViolation(data));
        this.playerController.on('sessionReset', () => this._clear());
        this.playerController.on('stopped', () => this._clear());
    }

    // ---- Private ----

    _addViolation(data) {
        const panel = $('#conformance-panel');
        const list = $('#conformance-list');
        if (!panel || !list) {
            return;
        }

        show(panel);

        const severity = data.event?.severity !== undefined ? data.event.severity : 1;
        const severityInfo = SEVERITY_MAP[severity] || SEVERITY_MAP[1];
        const message = data.event?.message || 'Unknown violation';

        const item = createElement('div', { className: 'conformance-item' },
            createElement('span', {
                className: `conformance-badge ${severityInfo.className}`,
                textContent: severityInfo.label
            }),
            createElement('span', { textContent: message })
        );

        list.appendChild(item);
    }

    _clear() {
        const panel = $('#conformance-panel');
        const list = $('#conformance-list');
        if (panel) {
            panel.classList.add('d-none');
        }
        if (list) {
            list.innerHTML = '';
        }
    }
}
