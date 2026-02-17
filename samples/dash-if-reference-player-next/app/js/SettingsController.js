/**
 * SettingsController.js - Options panel state management and URL export/import
 */

import { $ } from './UIHelpers.js';

export class SettingsController {
    constructor(playerController) {
        this.playerController = playerController;
        this.player = playerController.player;
        this._defaultSettings = null;
        this._autoPlay = true;
        this._loop = true;
        this._restoredProtData = null;
    }

    /**
     * Initialize all settings bindings and save defaults
     */
    init() {
        this._defaultSettings = JSON.parse(JSON.stringify(this.player.getSettings()));
        this._bindAll();
        this._syncFromPlayer();
    }

    /**
     * Get autoPlay state
     */
    get autoPlay() {
        return this._autoPlay;
    }

    /**
     * Get loop state
     */
    get loop() {
        return this._loop;
    }

    /**
     * Get DRM protection data restored from URL (or null)
     */
    get restoredProtData() {
        return this._restoredProtData || null;
    }

    /**
     * Build a config object from all current UI settings
     * @returns {Object}
     */
    buildConfig() {
        const config = {
            debug: {
                logLevel: parseInt($('#opt-log-level').value) || 3
            },
            streaming: {
                scheduling: {
                    scheduleWhilePaused: this._isChecked('opt-schedule-while-paused')
                },
                gaps: {
                    jumpGaps: this._isChecked('opt-jump-gaps')
                },
                buffer: {
                    stallThreshold: parseFloat($('#opt-stall-threshold').value) || 0.5,
                    lowLatencyStallThreshold: parseFloat($('#opt-ll-stall-threshold').value) || 0.3,
                    fastSwitchEnabled: this._isChecked('opt-fast-switch'),
                    reuseExistingSourceBuffers: this._isChecked('opt-reuse-sourcebuffers'),
                    mediaSourceDurationInfinity: this._isChecked('opt-mediasource-duration-inf'),
                    resetSourceBuffersForTrackSwitch: this._isChecked('opt-reset-sb-track-switch')
                },
                abr: {
                    autoSwitchBitrate: {
                        video: this._isChecked('opt-auto-switch-video')
                    },
                    rules: {
                        throughputRule: { active: this._isChecked('opt-rule-throughput') },
                        bolaRule: { active: this._isChecked('opt-rule-bola') },
                        insufficientBufferRule: { active: this._isChecked('opt-rule-insufficient-buffer') },
                        switchHistoryRule: { active: this._isChecked('opt-rule-switch-history') },
                        droppedFramesRule: { active: this._isChecked('opt-rule-dropped-frames') },
                        abandonRequestsRule: { active: this._isChecked('opt-rule-abandon') },
                        l2ARule: { active: this._isChecked('opt-rule-l2a') },
                        loLPRule: { active: this._isChecked('opt-rule-lolp') }
                    }
                },
                text: {
                    defaultEnabled: this._isChecked('opt-text-default-enabled'),
                    imsc: {
                        enableRollUp: this._isChecked('opt-imsc-rollup'),
                        displayForcedOnlyMode: this._isChecked('opt-imsc-forced-only')
                    }
                },
                trackSwitchMode: {
                    audio: this._getRadioValue('track-audio'),
                    video: this._getRadioValue('track-video')
                },
                timeShiftBuffer: {
                    calcFromSegmentTimeline: this._isChecked('opt-calc-seg-avail')
                },
                delay: {
                    useSuggestedPresentationDelay: this._isChecked('opt-use-suggested-pd')
                },
                saveLastMediaSettingsForCurrentStreamingSession: this._isChecked('opt-save-last-media'),
                lastBitrateCachingInfo: {
                    enabled: this._isChecked('opt-local-storage')
                },
                lastMediaSettingsCachingInfo: {
                    enabled: this._isChecked('opt-local-storage')
                },
                applyContentSteering: this._isChecked('opt-content-steering'),
                liveCatchup: {
                    enabled: this._isChecked('opt-catchup-enabled'),
                    mode: $('#opt-catchup-mode').value
                },
                applyServiceDescription: this._isChecked('opt-apply-service-desc')
            }
        };

        // Live delay (merge into existing delay object)
        const liveDelay = parseFloat($('#opt-live-delay').value);
        if (!isNaN(liveDelay) && liveDelay > 0) {
            config.streaming.delay.liveDelay = liveDelay;
        }
        const fragCount = parseInt($('#opt-live-delay-frag-count').value);
        if (!isNaN(fragCount) && fragCount > 0) {
            config.streaming.delay.liveDelayFragmentCount = fragCount;
        }

        // UTC offset
        const utcOffset = parseInt($('#opt-utc-offset').value);
        if (utcOffset !== 0 && !isNaN(utcOffset)) {
            config.streaming.utcSynchronization = config.streaming.utcSynchronization || {};
            config.streaming.utcSynchronization.defaultTimingSource = {
                value: utcOffset
            };
        }

        // Initial bitrate
        const initBitrate = parseInt($('#opt-init-bitrate-video').value);
        if (!isNaN(initBitrate) && initBitrate > 0) {
            config.streaming.abr.initialBitrate = { video: initBitrate };
        }
        const minBitrate = parseInt($('#opt-min-bitrate-video').value);
        if (!isNaN(minBitrate) && minBitrate > 0) {
            config.streaming.abr.minBitrate = { video: minBitrate };
        }
        const maxBitrate = parseInt($('#opt-max-bitrate-video').value);
        if (!isNaN(maxBitrate) && maxBitrate > 0) {
            config.streaming.abr.maxBitrate = { video: maxBitrate };
        }

        // CMCD
        if (this._isChecked('opt-cmcd-enabled')) {
            config.streaming.cmcd = {
                enabled: true,
                mode: $('#opt-cmcd-mode').value,
                rtpSafetyFactor: parseFloat($('#opt-cmcd-rtp-safety').value) || 5
            };
            const sid = $('#opt-cmcd-session-id').value.trim();
            if (sid) {
                config.streaming.cmcd.sid = sid;
            }
            const cid = $('#opt-cmcd-content-id').value.trim();
            if (cid) {
                config.streaming.cmcd.cid = cid;
            }
            const rtp = parseInt($('#opt-cmcd-rtp').value);
            if (!isNaN(rtp) && rtp > 0) {
                config.streaming.cmcd.rtp = rtp;
            }
            const keys = $('#opt-cmcd-enabled-keys').value.trim();
            if (keys) {
                config.streaming.cmcd.enabledKeys = keys.split(',').map(k => k.trim());
            }
        }

        // CMSD
        if (this._isChecked('opt-cmsd-enabled')) {
            config.streaming.cmsd = {
                enabled: true,
                abr: {
                    applyMb: this._isChecked('opt-cmsd-apply-mb'),
                    etpWeightRatio: parseFloat($('#opt-cmsd-etp-weight').value) || 0.5
                }
            };
        }

        return config;
    }

    /**
     * Apply initial media settings from the UI to the player
     */
    applyInitialMediaSettings() {
        // Video
        const videoRole = $('#opt-init-role-video').value.trim();
        if (videoRole) {
            this.playerController.setInitialMediaSettings('video', { role: videoRole });
        }

        // Audio
        const audioLang = $('#opt-init-lang-audio').value.trim();
        const audioRole = $('#opt-init-role-audio').value.trim();
        const audioSettings = {};
        if (audioLang) {
            audioSettings.lang = audioLang;
        }
        if (audioRole) {
            audioSettings.role = audioRole;
        }

        const accessScheme = $('#opt-audio-accessibility-scheme').value;
        const accessValue = $('#opt-audio-accessibility-value').value.trim();
        if (accessScheme && accessValue) {
            let schemeId = '';
            if (accessScheme === 'mpeg') {
                schemeId = 'urn:mpeg:dash:role:2011';
            } else if (accessScheme === 'dvb') {
                schemeId = 'urn:tva:metadata:cs:AudioPurposeCS:2007';
            }
            audioSettings.accessibility = {
                schemeIdUri: schemeId,
                value: accessValue
            };
        }

        if (Object.keys(audioSettings).length > 0) {
            this.playerController.setInitialMediaSettings('audio', audioSettings);
        }

        // Text
        const textLang = $('#opt-init-lang-text').value.trim();
        const textRole = $('#opt-init-role-text').value.trim();
        const textSettings = {};
        if (textLang) {
            textSettings.lang = textLang;
        }
        if (textRole) {
            textSettings.role = textRole;
        }
        if (Object.keys(textSettings).length > 0) {
            this.playerController.setInitialMediaSettings('text', textSettings);
        }

        // Forced text streaming
        this.playerController.enableForcedTextStreaming(this._isChecked('opt-force-text-streaming'));
    }

    /**
     * Copy the current settings URL to clipboard
     * @param {Object|null} [protectionData] - DRM protection data to include
     */
    copySettingsUrl(protectionData) {
        const currentSettings = this.player.getSettings();
        const diff = this._makeSettingsDiff(currentSettings, this._defaultSettings);
        const params = new URLSearchParams();

        this._flattenObject(diff, '', params);

        // Add external settings (not part of dash.js settings)
        if (this._isChecked('opt-autoplay')) {
            params.set('autoplay', 'true');
        }
        if (this._isChecked('opt-loop')) {
            params.set('loop', 'true');
        }
        if (this._isChecked('opt-muted')) {
            params.set('muted', 'true');
        }

        const url = new URL(window.location.href.split('?')[0]);
        url.search = params.toString();

        // Add stream URL
        const streamUrl = $('#stream-url').value.trim();
        if (streamUrl) {
            url.searchParams.set('stream', streamUrl);
        }

        // Add DRM protection data (base64-encoded JSON)
        if (protectionData && Object.keys(protectionData).length > 0) {
            try {
                const json = JSON.stringify(protectionData);
                url.searchParams.set('protData', btoa(json));
            } catch (e) {
                // Skip DRM data if encoding fails
            }
        }

        navigator.clipboard.writeText(url.toString()).then(() => {
            this._showCopyNotification();
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = url.toString();
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this._showCopyNotification();
        });
    }

    /**
     * Parse URL query parameters and apply settings
     */
    applyFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.size === 0) {
            return;
        }

        // Handle stream URL
        const streamUrl = params.get('stream');
        if (streamUrl) {
            $('#stream-url').value = streamUrl;
        }

        // Handle external settings
        if (params.get('autoplay') === 'true') {
            $('#opt-autoplay').checked = true;
            this._autoPlay = true;
        }
        if (params.get('loop') === 'true') {
            $('#opt-loop').checked = true;
            this._loop = true;
        }
        if (params.get('muted') === 'true') {
            $('#opt-muted').checked = true;
        }

        // Handle DRM protection data
        const protDataParam = params.get('protData');
        if (protDataParam) {
            try {
                this._restoredProtData = JSON.parse(atob(protDataParam));
            } catch (e) {
                // Invalid protData — ignore
            }
        }

        // Handle dash.js settings
        const settingsObj = {};
        for (const [key, value] of params.entries()) {
            if (['stream', 'autoplay', 'loop', 'muted', 'autoLoad', 'protData'].includes(key)) {
                continue;
            }
            this._setNestedValue(settingsObj, key, this._coerceType(value));
        }

        if (Object.keys(settingsObj).length > 0) {
            this.player.updateSettings(settingsObj);
            this._syncFromPlayer();
        }

        // Auto-load if stream is set
        const autoLoad = params.get('autoLoad');
        if (autoLoad === 'true' && streamUrl) {
            return true;
        }
        return false;
    }

    // ---- Private ----

    _bindAll() {
        // Options toggle
        $('#btn-options').addEventListener('click', () => {
            const panel = $('#options-panel');
            panel.classList.toggle('collapsed');
            const btn = $('#btn-options');
            const isCollapsed = panel.classList.contains('collapsed');
            btn.innerHTML = isCollapsed
                ? '<i class="bi bi-gear"></i> Options'
                : '<i class="bi bi-gear-fill"></i> Hide';
        });

        // Auto-play, loop, muted
        this._bindCheckbox('opt-autoplay', () => {
            this._autoPlay = this._isChecked('opt-autoplay');
            this.player.setAutoPlay(this._autoPlay);
        });

        this._bindCheckbox('opt-loop', () => {
            this._loop = this._isChecked('opt-loop');
        });

        this._bindCheckbox('opt-muted', () => {
            this.player.setMute(this._isChecked('opt-muted'));
        });

        // All streaming settings - bind change events
        const settingsCheckboxes = [
            'opt-schedule-while-paused', 'opt-calc-seg-avail', 'opt-reuse-sourcebuffers',
            'opt-mediasource-duration-inf', 'opt-reset-sb-track-switch', 'opt-save-last-media',
            'opt-local-storage', 'opt-jump-gaps', 'opt-content-steering', 'opt-catchup-enabled',
            'opt-fast-switch', 'opt-auto-switch-video', 'opt-force-quality-switch',
            'opt-rule-throughput', 'opt-rule-bola', 'opt-rule-insufficient-buffer',
            'opt-rule-switch-history', 'opt-rule-dropped-frames', 'opt-rule-abandon',
            'opt-rule-l2a', 'opt-rule-lolp',
            'opt-text-default-enabled', 'opt-force-text-streaming',
            'opt-imsc-rollup', 'opt-imsc-forced-only',
            'opt-apply-service-desc', 'opt-use-suggested-pd',
            'opt-cmcd-enabled', 'opt-cmsd-enabled', 'opt-cmsd-apply-mb'
        ];

        for (const id of settingsCheckboxes) {
            this._bindCheckbox(id, () => this._applySettings());
        }

        const settingsInputs = [
            'opt-log-level', 'opt-catchup-mode',
            'opt-stall-threshold', 'opt-ll-stall-threshold',
            'opt-live-delay', 'opt-live-delay-frag-count', 'opt-utc-offset',
            'opt-init-bitrate-video', 'opt-min-bitrate-video', 'opt-max-bitrate-video',
            'opt-cmcd-session-id', 'opt-cmcd-content-id', 'opt-cmcd-rtp',
            'opt-cmcd-rtp-safety', 'opt-cmcd-mode', 'opt-cmcd-enabled-keys',
            'opt-cmsd-etp-weight'
        ];

        for (const id of settingsInputs) {
            const el = $(`#${id}`);
            if (el) {
                el.addEventListener('change', () => this._applySettings());
            }
        }

        // Track switch mode radios
        for (const radio of document.querySelectorAll('input[name="track-audio"], input[name="track-video"]')) {
            radio.addEventListener('change', () => this._applySettings());
        }

        // Copy URL button is wired in main.js (needs access to DrmController)
    }

    _bindCheckbox(id, handler) {
        const el = $(`#${id}`);
        if (el) {
            el.addEventListener('change', handler);
        }
    }

    _isChecked(id) {
        const el = $(`#${id}`);
        return el ? el.checked : false;
    }

    _getRadioValue(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? el.value : 'alwaysReplace';
    }

    _applySettings() {
        const config = this.buildConfig();
        this.player.updateSettings(config);
    }

    _syncFromPlayer() {
        const s = this.player.getSettings();

        // Sync checkboxes from player state
        this._setChecked('opt-schedule-while-paused', s?.streaming?.scheduling?.scheduleWhilePaused);
        this._setChecked('opt-jump-gaps', s?.streaming?.gaps?.jumpGaps);
        this._setChecked('opt-fast-switch', s?.streaming?.buffer?.fastSwitchEnabled);
        this._setChecked('opt-auto-switch-video', s?.streaming?.abr?.autoSwitchBitrate?.video);
        this._setChecked('opt-reuse-sourcebuffers', s?.streaming?.buffer?.reuseExistingSourceBuffers);
        this._setChecked('opt-apply-service-desc', s?.streaming?.applyServiceDescription);
        this._setChecked('opt-content-steering', s?.streaming?.applyContentSteering);

        // Log level
        const logLevel = $(`#opt-log-level`);
        if (logLevel && s?.debug?.logLevel !== undefined) {
            logLevel.value = String(s.debug.logLevel);
        }
    }

    _setChecked(id, value) {
        const el = $(`#${id}`);
        if (el && value !== undefined) {
            el.checked = !!value;
        }
    }

    _makeSettingsDiff(current, defaults, path = '') {
        const diff = {};
        for (const key of Object.keys(current)) {
            const currentVal = current[key];
            const defaultVal = defaults ? defaults[key] : undefined;

            if (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal)) {
                const subDiff = this._makeSettingsDiff(currentVal, defaultVal || {}, `${path}${key}.`);
                if (Object.keys(subDiff).length > 0) {
                    diff[key] = subDiff;
                }
            } else if (JSON.stringify(currentVal) !== JSON.stringify(defaultVal)) {
                diff[key] = currentVal;
            }
        }
        return diff;
    }

    _flattenObject(obj, prefix, params) {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this._flattenObject(value, fullKey, params);
            } else {
                params.set(fullKey, String(value));
            }
        }
    }

    _setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }

    _coerceType(value) {
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
        if (value === 'null') {
            return null;
        }
        const num = Number(value);
        if (!isNaN(num) && value.trim() !== '') {
            return num;
        }
        return value;
    }

    _showCopyNotification() {
        const existing = document.querySelector('.copy-notification');
        if (existing) {
            existing.remove();
        }
        const notif = document.createElement('div');
        notif.className = 'copy-notification alert alert-success py-2 px-3';
        notif.innerHTML = '<i class="bi bi-check-circle"></i> URL Copied!';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 2200);
    }
}
