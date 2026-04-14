/**
 * DrmController.js - DRM configuration UI logic
 */

import {$, createElement} from './UIHelpers.js';

export class DrmController {
    constructor() {
        this._prHeaders = [];
        this._wvHeaders = [];
        this._fpHeaders = [];
        this._ckHeaders = [];
        this._ckPairs = [];
    }

    /**
     * Initialize DRM UI bindings
     */
    init() {
        // Advanced DRM modal trigger
        const advBtn = $('#drm-advanced-btn');
        if (advBtn) {
            advBtn.addEventListener('click', () => {
                const modal = new bootstrap.Modal($('#drmAdvancedModal'));
                modal.show();
            });
        }

        // Add header buttons
        this._bindAddHeader('drm-pr-add-header', 'drm-pr-headers', this._prHeaders);
        this._bindAddHeader('drm-wv-add-header', 'drm-wv-headers', this._wvHeaders);
        this._bindAddHeader('drm-fp-add-header', 'drm-fp-headers', this._fpHeaders);
        this._bindAddHeader('drm-ck-add-header', 'drm-ck-headers', this._ckHeaders);

        // Add ClearKey pair button
        const addPairBtn = $('#drm-ck-add-pair');
        if (addPairBtn) {
            addPairBtn.addEventListener('click', () => {
                this._addKeyPairRow('drm-ck-pairs', this._ckPairs);
            });
        }
    }

    /**
     * Build protection data object from UI state
     * @returns {Object|null}
     */
    buildProtectionData() {
        const protData = {};
        let hasData = false;

        // PlayReady
        const prUrl = $('#drm-pr-url')?.value.trim();
        if (prUrl) {
            protData['com.microsoft.playready'] = {
                serverURL: prUrl
            };
            this._addAdvancedDrmFields(protData['com.microsoft.playready'], 'pr');
            hasData = true;
        }

        // Widevine
        const wvUrl = $('#drm-wv-url')?.value.trim();
        if (wvUrl) {
            protData['com.widevine.alpha'] = {
                serverURL: wvUrl
            };
            this._addAdvancedDrmFields(protData['com.widevine.alpha'], 'wv');
            hasData = true;
        }

        // FairPlay
        const fpUrl = $('#drm-fp-url')?.value.trim();
        if (fpUrl) {
            protData['com.apple.fps'] = {
                serverURL: fpUrl
            };
            this._addAdvancedDrmFields(protData['com.apple.fps'], 'fp');
            hasData = true;
        }

        // ClearKey
        const ckUrl = $('#drm-ck-url')?.value.trim();
        if (ckUrl) {
            if (ckUrl.includes(':') && !ckUrl.startsWith('http')) {
                // KID:KEY format
                const clearkeys = {};
                const [kid, key] = ckUrl.split(':');
                if (kid && key) {
                    clearkeys[kid.trim()] = key.trim();
                }
                // Add additional pairs
                for (const pair of this._ckPairs) {
                    if (pair.kid && pair.key) {
                        clearkeys[pair.kid] = pair.key;
                    }
                }
                protData['org.w3.clearkey'] = { clearkeys };
            } else {
                // License server URL
                protData['org.w3.clearkey'] = { serverURL: ckUrl };
            }
            this._addHeaders(protData['org.w3.clearkey'], this._ckHeaders);
            hasData = true;
        }

        // DRM prioritization — apply automatically if any priority has been adjusted
        const prPriority = parseInt($('#drm-pr-priority')?.value);
        const wvPriority = parseInt($('#drm-wv-priority')?.value);
        const fpPriority = parseInt($('#drm-fp-priority')?.value);
        const hasPriority = [prPriority, wvPriority, fpPriority].some(p => !isNaN(p) && p > 0);
        if (hasPriority) {
            if (protData['com.microsoft.playready'] && !isNaN(prPriority)) {
                protData['com.microsoft.playready'].priority = prPriority;
            }
            if (protData['com.widevine.alpha'] && !isNaN(wvPriority)) {
                protData['com.widevine.alpha'].priority = wvPriority;
            }
            if (protData['com.apple.fps'] && !isNaN(fpPriority)) {
                protData['com.apple.fps'].priority = fpPriority;
            }
        }

        return hasData ? protData : null;
    }

    /**
     * Set DRM fields from a stream item's protData
     * @param {Object} protData
     */
    setFromProtData(protData) {
        this.clearAll();

        if (!protData) {
            return;
        }

        // PlayReady
        const pr = protData['com.microsoft.playready'] || protData['com.microsoft.playready.recommendation'];
        if (pr) {
            this._setVal('drm-pr-url', pr.serverURL);
            this._setVal('drm-pr-cert-url', this._getCertUrlFromArray(pr.certUrls));
            this._setVal('drm-pr-timeout', pr.httpTimeout);
            this._setVal('drm-pr-video-robustness', pr.videoRobustness);
            this._setVal('drm-pr-audio-robustness', pr.audioRobustness);
            this._setVal('drm-pr-persistent-state', pr.persistentState);
            this._setVal('drm-pr-distinctive-identifier', pr.distinctiveIdentifier);
            this._extractHeaders(pr.httpRequestHeaders, this._prHeaders, 'drm-pr-headers');
            this._applyPriority('drm-pr-priority', pr.priority);
        }

        // Widevine
        const wv = protData['com.widevine.alpha'];
        if (wv) {
            this._setVal('drm-wv-url', wv.serverURL);
            this._setVal('drm-wv-cert-url', this._getCertUrlFromArray(wv.certUrls));
            this._setVal('drm-wv-timeout', wv.httpTimeout);
            this._setVal('drm-wv-video-robustness', wv.videoRobustness);
            this._setVal('drm-wv-audio-robustness', wv.audioRobustness);
            this._setVal('drm-wv-persistent-state', wv.persistentState);
            this._setVal('drm-wv-distinctive-identifier', wv.distinctiveIdentifier);
            this._extractHeaders(wv.httpRequestHeaders, this._wvHeaders, 'drm-wv-headers');
            this._applyPriority('drm-wv-priority', wv.priority);
        }

        // FairPlay
        const fp = protData['com.apple.fps'];
        if (fp) {
            this._setVal('drm-fp-url', fp.serverURL);
            this._setVal('drm-fp-cert-url', this._getCertUrlFromArray(fp.certUrls));
            this._setVal('drm-fp-timeout', fp.httpTimeout);
            this._setVal('drm-fp-video-robustness', fp.videoRobustness);
            this._setVal('drm-fp-audio-robustness', fp.audioRobustness);
            this._setVal('drm-fp-persistent-state', fp.persistentState);
            this._setVal('drm-fp-distinctive-identifier', fp.distinctiveIdentifier);
            this._extractHeaders(fp.httpRequestHeaders, this._fpHeaders, 'drm-fp-headers');
            this._applyPriority('drm-fp-priority', fp.priority);
        }

        // ClearKey
        const ck = protData['org.w3.clearkey'];
        if (ck) {
            if (ck.serverURL) {
                this._setVal('drm-ck-url', ck.serverURL);
            } else if (ck.clearkeys) {
                const entries = Object.entries(ck.clearkeys);
                if (entries.length > 0) {
                    this._setVal('drm-ck-url', `${entries[0][0]}:${entries[0][1]}`);
                    for (let i = 1; i < entries.length; i++) {
                        this._ckPairs.push({ kid: entries[i][0], key: entries[i][1] });
                    }
                    this._renderKeyPairs();
                }
            }
            this._extractHeaders(ck.httpRequestHeaders, this._ckHeaders, 'drm-ck-headers');
        }


    }

    /**
     * Clear all DRM fields
     */
    clearAll() {
        const fields = ['drm-pr-url', 'drm-wv-url', 'drm-fp-url', 'drm-ck-url',
            'drm-pr-cert-url', 'drm-wv-cert-url', 'drm-fp-cert-url',
            'drm-pr-timeout', 'drm-wv-timeout', 'drm-fp-timeout',
            'drm-pr-video-robustness', 'drm-pr-audio-robustness',
            'drm-fp-video-robustness', 'drm-fp-audio-robustness'];

        for (const id of fields) {
            const el = $(`#${id}`);
            if (el) {
                el.value = '';
            }
        }

        const selects = ['drm-wv-video-robustness', 'drm-wv-audio-robustness',
            'drm-pr-persistent-state', 'drm-pr-distinctive-identifier',
            'drm-wv-persistent-state', 'drm-wv-distinctive-identifier',
            'drm-fp-persistent-state', 'drm-fp-distinctive-identifier'];
        for (const id of selects) {
            const el = $(`#${id}`);
            if (el) {
                el.value = '';
            }
        }

        this._prHeaders = [];
        this._wvHeaders = [];
        this._fpHeaders = [];
        this._ckHeaders = [];
        this._ckPairs = [];
        this._renderHeaders('drm-pr-headers', this._prHeaders);
        this._renderHeaders('drm-wv-headers', this._wvHeaders);
        this._renderHeaders('drm-fp-headers', this._fpHeaders);
        this._renderHeaders('drm-ck-headers', this._ckHeaders);
        this._renderKeyPairs();

        $('#drm-pr-priority').value = '0';
        $('#drm-wv-priority').value = '0';
        $('#drm-fp-priority').value = '0';
    }

    // ---- Private ----

    _setVal(id, value) {
        const el = $(`#${id}`);
        if (el && value !== undefined && value !== null) {
            el.value = String(value);
        }
    }

    _extractHeaders(headersObj, headerArray, containerId) {
        if (!headersObj || typeof headersObj !== 'object') {
            return;
        }
        for (const [key, value] of Object.entries(headersObj)) {
            headerArray.push({ key, value: String(value) });
        }
        this._renderHeaders(containerId, headerArray);
    }

    _getCertUrlFromArray(certUrls) {
        if (!Array.isArray(certUrls) || certUrls.length === 0) {
            return undefined;
        }
        const first = certUrls[0];
        if (typeof first === 'string') {
            return first;
        }
        if (first && typeof first === 'object') {
            return first.url || first.__text || undefined;
        }
        return undefined;
    }

    _applyPriority(inputId, value) {
        if (value !== undefined && value !== null) {
            this._setVal(inputId, value);
        }
    }

    _addAdvancedDrmFields(target, prefix) {
        const certUrl = $(`#drm-${prefix}-cert-url`)?.value.trim();
        if (certUrl) {
            target.certUrls = [certUrl];
        }

        const timeout = parseInt($(`#drm-${prefix}-timeout`)?.value);
        if (!isNaN(timeout) && timeout > 0) {
            target.httpTimeout = timeout;
        }

        const videoRobustness = $(`#drm-${prefix}-video-robustness`)?.value.trim();
        if (videoRobustness) {
            target.videoRobustness = videoRobustness;
        }

        const audioRobustness = $(`#drm-${prefix}-audio-robustness`)?.value.trim();
        if (audioRobustness) {
            target.audioRobustness = audioRobustness;
        }

        const persistentState = $(`#drm-${prefix}-persistent-state`)?.value;
        if (persistentState) {
            target.persistentState = persistentState;
        }

        const distinctiveIdentifier = $(`#drm-${prefix}-distinctive-identifier`)?.value;
        if (distinctiveIdentifier) {
            target.distinctiveIdentifier = distinctiveIdentifier;
        }

        // Headers
        const headerArray = prefix === 'pr' ? this._prHeaders : prefix === 'wv' ? this._wvHeaders : this._fpHeaders;
        this._addHeaders(target, headerArray);
    }

    _addHeaders(target, headerArray) {
        const validHeaders = headerArray.filter(h => h.key && h.value);
        if (validHeaders.length > 0) {
            target.httpRequestHeaders = {};
            for (const h of validHeaders) {
                target.httpRequestHeaders[h.key] = h.value;
            }
        }
    }

    _bindAddHeader(btnId, containerId, headerArray) {
        const btn = $(`#${btnId}`);
        if (btn) {
            btn.addEventListener('click', () => {
                headerArray.push({ key: '', value: '' });
                this._renderHeaders(containerId, headerArray);
            });
        }
    }

    _renderHeaders(containerId, headerArray) {
        const container = $(`#${containerId}`);
        if (!container) {
            return;
        }
        container.innerHTML = '';

        headerArray.forEach((header, idx) => {
            const row = createElement('div', { className: 'drm-header-row' });

            const keyInput = createElement('input', {
                type: 'text',
                className: 'form-control form-control-sm',
                placeholder: 'Header name',
                value: header.key || ''
            });
            keyInput.addEventListener('input', () => {
                header.key = keyInput.value;
            });

            const valInput = createElement('input', {
                type: 'text',
                className: 'form-control form-control-sm',
                placeholder: 'Header value',
                value: header.value || ''
            });
            valInput.addEventListener('input', () => {
                header.value = valInput.value;
            });

            const removeBtn = createElement('button', {
                className: 'btn btn-sm btn-outline-danger',
                innerHTML: '<i class="bi bi-x"></i>',
                onClick: () => {
                    headerArray.splice(idx, 1);
                    this._renderHeaders(containerId, headerArray);
                }
            });

            row.appendChild(keyInput);
            row.appendChild(valInput);
            row.appendChild(removeBtn);
            container.appendChild(row);
        });
    }

    _addKeyPairRow(containerId, pairArray) {
        pairArray.push({ kid: '', key: '' });
        this._renderKeyPairs();
    }

    _renderKeyPairs() {
        const container = $('#drm-ck-pairs');
        if (!container) {
            return;
        }
        container.innerHTML = '';

        this._ckPairs.forEach((pair, idx) => {
            const row = createElement('div', { className: 'drm-header-row' });

            const kidInput = createElement('input', {
                type: 'text',
                className: 'form-control form-control-sm',
                placeholder: 'KID',
                value: pair.kid || ''
            });
            kidInput.addEventListener('input', () => {
                pair.kid = kidInput.value;
            });

            const keyInput = createElement('input', {
                type: 'text',
                className: 'form-control form-control-sm',
                placeholder: 'KEY',
                value: pair.key || ''
            });
            keyInput.addEventListener('input', () => {
                pair.key = keyInput.value;
            });

            const removeBtn = createElement('button', {
                className: 'btn btn-sm btn-outline-danger',
                innerHTML: '<i class="bi bi-x"></i>',
                onClick: () => {
                    this._ckPairs.splice(idx, 1);
                    this._renderKeyPairs();
                }
            });

            row.appendChild(kidInput);
            row.appendChild(keyInput);
            row.appendChild(removeBtn);
            container.appendChild(row);
        });
    }
}
