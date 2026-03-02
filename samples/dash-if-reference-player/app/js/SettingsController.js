/**
 * SettingsController.js - Options panel state management and URL export/import
 */

import {$} from './UIHelpers.js';
import SETTINGS_DESCRIPTIONS from '../data/settingsDescriptions.js';

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
        this._addTooltips();
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
                logLevel: !isNaN(parseInt($('#opt-log-level').value)) ? parseInt($('#opt-log-level').value) : 3
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

        // Live catchup numeric settings
        const maxDrift = parseFloat($('#opt-catchup-max-drift').value);
        if (!isNaN(maxDrift)) {
            config.streaming.liveCatchup.maxDrift = maxDrift;
        }
        const liveThreshold = parseFloat($('#opt-catchup-live-threshold').value);
        if (!isNaN(liveThreshold)) {
            config.streaming.liveCatchup.liveThreshold = liveThreshold;
        }

        // Live catchup step tuning
        const stepStartMin = parseFloat($('#opt-catchup-step-start-min').value);
        const stepStartMax = parseFloat($('#opt-catchup-step-start-max').value);
        const stepStopMin = parseFloat($('#opt-catchup-step-stop-min').value);
        const stepStopMax = parseFloat($('#opt-catchup-step-stop-max').value);
        if (!isNaN(stepStartMin) || !isNaN(stepStartMax) || !isNaN(stepStopMin) || !isNaN(stepStopMax)) {
            config.streaming.liveCatchup.step = {
                start: {},
                stop: {}
            };
            if (!isNaN(stepStartMin)) {
                config.streaming.liveCatchup.step.start.min = stepStartMin;
            }
            if (!isNaN(stepStartMax)) {
                config.streaming.liveCatchup.step.start.max = stepStartMax;
            }
            if (!isNaN(stepStopMin)) {
                config.streaming.liveCatchup.step.stop.min = stepStopMin;
            }
            if (!isNaN(stepStopMax)) {
                config.streaming.liveCatchup.step.stop.max = stepStopMax;
            }
        }

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

        // Enhancement (LCEVC)
        config.streaming.enhancement = {
            enabled: this._isChecked('opt-enhancement-enabled')
        };

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
            'opt-fast-switch', 'opt-auto-switch-video',
            'opt-rule-throughput', 'opt-rule-bola', 'opt-rule-insufficient-buffer',
            'opt-rule-switch-history', 'opt-rule-dropped-frames', 'opt-rule-abandon',
            'opt-rule-l2a', 'opt-rule-lolp',
            'opt-text-default-enabled', 'opt-force-text-streaming',
            'opt-imsc-rollup', 'opt-imsc-forced-only',
            'opt-apply-service-desc', 'opt-use-suggested-pd',
            'opt-cmcd-enabled', 'opt-cmsd-enabled', 'opt-cmsd-apply-mb',
            'opt-enhancement-enabled'
        ];

        for (const id of settingsCheckboxes) {
            this._bindCheckbox(id, () => this._applySettings());
        }

        const settingsInputs = [
            'opt-log-level', 'opt-catchup-mode',
            'opt-catchup-max-drift', 'opt-catchup-live-threshold',
            'opt-catchup-step-start-min', 'opt-catchup-step-start-max',
            'opt-catchup-step-stop-min', 'opt-catchup-step-stop-max',
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

    _addTooltips() {
        for (const [id, description] of Object.entries(SETTINGS_DESCRIPTIONS)) {
            const el = document.getElementById(id);
            if (!el) {
                continue;
            }

            // Find the label associated with this control
            let label;
            if (el.type === 'checkbox' || el.type === 'radio') {
                label = document.querySelector(`label[for="${id}"]`);
            } else {
                // For inputs and selects the label is the preceding .option-label span
                let sibling = el.previousElementSibling;
                while (sibling) {
                    if (sibling.classList && sibling.classList.contains('option-label')) {
                        label = sibling;
                        break;
                    }
                    sibling = sibling.previousElementSibling;
                }
            }

            if (!label) {
                continue;
            }

            const icon = document.createElement('i');
            icon.className = 'bi bi-info-circle option-tooltip-icon';
            icon.setAttribute('data-bs-toggle', 'tooltip');
            icon.setAttribute('data-bs-placement', 'top');
            icon.setAttribute('data-bs-title', description);
            label.appendChild(icon);
        }

        // Initialize all Bootstrap tooltips
        if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
            for (const el of tooltipTriggerList) {
                new bootstrap.Tooltip(el, { html: false });
            }
        }
    }

    _syncFromPlayer() {
        const s = this.player.getSettings();

        // ---- General ----
        this._setChecked('opt-schedule-while-paused', s?.streaming?.scheduling?.scheduleWhilePaused);
        this._setChecked('opt-calc-seg-avail', s?.streaming?.timeShiftBuffer?.calcFromSegmentTimeline);
        this._setChecked('opt-reuse-sourcebuffers', s?.streaming?.buffer?.reuseExistingSourceBuffers);
        this._setChecked('opt-mediasource-duration-inf', s?.streaming?.buffer?.mediaSourceDurationInfinity);
        this._setChecked('opt-reset-sb-track-switch', s?.streaming?.buffer?.resetSourceBuffersForTrackSwitch);
        this._setChecked('opt-save-last-media', s?.streaming?.saveLastMediaSettingsForCurrentStreamingSession);
        this._setChecked('opt-local-storage', s?.streaming?.lastBitrateCachingInfo?.enabled);
        this._setChecked('opt-jump-gaps', s?.streaming?.gaps?.jumpGaps);
        this._setChecked('opt-content-steering', s?.streaming?.applyContentSteering);
        this._setChecked('opt-catchup-enabled', !!s?.streaming?.liveCatchup?.enabled);

        // ---- ABR ----
        this._setChecked('opt-fast-switch', !!s?.streaming?.buffer?.fastSwitchEnabled);
        this._setChecked('opt-auto-switch-video', s?.streaming?.abr?.autoSwitchBitrate?.video);

        // ABR rules
        this._setChecked('opt-rule-throughput', s?.streaming?.abr?.rules?.throughputRule?.active);
        this._setChecked('opt-rule-bola', s?.streaming?.abr?.rules?.bolaRule?.active);
        this._setChecked('opt-rule-insufficient-buffer', s?.streaming?.abr?.rules?.insufficientBufferRule?.active);
        this._setChecked('opt-rule-switch-history', s?.streaming?.abr?.rules?.switchHistoryRule?.active);
        this._setChecked('opt-rule-dropped-frames', s?.streaming?.abr?.rules?.droppedFramesRule?.active);
        this._setChecked('opt-rule-abandon', s?.streaming?.abr?.rules?.abandonRequestsRule?.active);
        this._setChecked('opt-rule-l2a', s?.streaming?.abr?.rules?.l2ARule?.active);
        this._setChecked('opt-rule-lolp', s?.streaming?.abr?.rules?.loLPRule?.active);

        // ---- Live Delay ----
        this._setChecked('opt-apply-service-desc', s?.streaming?.applyServiceDescription);
        this._setChecked('opt-use-suggested-pd', s?.streaming?.delay?.useSuggestedPresentationDelay);

        // ---- Text / IMSC ----
        this._setChecked('opt-text-default-enabled', s?.streaming?.text?.defaultEnabled);
        this._setChecked('opt-imsc-rollup', s?.streaming?.text?.imsc?.enableRollUp);
        this._setChecked('opt-imsc-forced-only', s?.streaming?.text?.imsc?.displayForcedOnlyMode);

        // ---- CMCD ----
        this._setChecked('opt-cmcd-enabled', s?.streaming?.cmcd?.enabled);

        // ---- CMSD ----
        this._setChecked('opt-cmsd-enabled', s?.streaming?.cmsd?.enabled);
        this._setChecked('opt-cmsd-apply-mb', s?.streaming?.cmsd?.abr?.applyMb);

        // ---- Enhancement ----
        this._setChecked('opt-enhancement-enabled', s?.streaming?.enhancement?.enabled);

        // ---- Log level ----
        const logLevel = $(`#opt-log-level`);
        if (logLevel && s?.debug?.logLevel !== undefined) {
            logLevel.value = String(s.debug.logLevel);
        }

        // ---- Catchup mode ----
        const catchupMode = $('#opt-catchup-mode');
        if (catchupMode && s?.streaming?.liveCatchup?.mode) {
            catchupMode.value = s.streaming.liveCatchup.mode;
        }

        // ---- Catchup numeric inputs ----
        const maxDrift = $('#opt-catchup-max-drift');
        if (maxDrift) {
            const v = s?.streaming?.liveCatchup?.maxDrift;
            maxDrift.value = (v !== undefined && !isNaN(v)) ? v : '';
        }
        const liveThreshold = $('#opt-catchup-live-threshold');
        if (liveThreshold) {
            const v = s?.streaming?.liveCatchup?.liveThreshold;
            liveThreshold.value = (v !== undefined && v !== -1) ? v : '';
        }
        const stepStartMin = $('#opt-catchup-step-start-min');
        if (stepStartMin) {
            const v = s?.streaming?.liveCatchup?.step?.start?.min;
            stepStartMin.value = (v !== undefined && !isNaN(v)) ? v : '';
        }
        const stepStartMax = $('#opt-catchup-step-start-max');
        if (stepStartMax) {
            const v = s?.streaming?.liveCatchup?.step?.start?.max;
            stepStartMax.value = (v !== undefined && !isNaN(v)) ? v : '';
        }
        const stepStopMin = $('#opt-catchup-step-stop-min');
        if (stepStopMin) {
            const v = s?.streaming?.liveCatchup?.step?.stop?.min;
            stepStopMin.value = (v !== undefined && !isNaN(v)) ? v : '';
        }
        const stepStopMax = $('#opt-catchup-step-stop-max');
        if (stepStopMax) {
            const v = s?.streaming?.liveCatchup?.step?.stop?.max;
            stepStopMax.value = (v !== undefined && !isNaN(v)) ? v : '';
        }

        // ---- Buffer numeric inputs ----
        const stallThreshold = $('#opt-stall-threshold');
        if (stallThreshold && s?.streaming?.buffer?.stallThreshold !== undefined) {
            stallThreshold.value = s.streaming.buffer.stallThreshold;
        }
        const llStallThreshold = $('#opt-ll-stall-threshold');
        if (llStallThreshold && s?.streaming?.buffer?.lowLatencyStallThreshold !== undefined) {
            llStallThreshold.value = s.streaming.buffer.lowLatencyStallThreshold;
        }

        // ---- CMCD numeric inputs ----
        const cmcdRtpSafety = $('#opt-cmcd-rtp-safety');
        if (cmcdRtpSafety && s?.streaming?.cmcd?.rtpSafetyFactor !== undefined) {
            cmcdRtpSafety.value = s.streaming.cmcd.rtpSafetyFactor;
        }

        // ---- CMSD numeric inputs ----
        const cmsdEtpWeight = $('#opt-cmsd-etp-weight');
        if (cmsdEtpWeight && s?.streaming?.cmsd?.abr?.etpWeightRatio !== undefined) {
            cmsdEtpWeight.value = s.streaming.cmsd.abr.etpWeightRatio;
        }

        // ---- Track switch mode radios ----
        const audioMode = s?.streaming?.trackSwitchMode?.audio;
        if (audioMode) {
            const audioRadio = document.querySelector(`input[name="track-audio"][value="${audioMode}"]`);
            if (audioRadio) {
                audioRadio.checked = true;
            }
        }
        const videoMode = s?.streaming?.trackSwitchMode?.video;
        if (videoMode) {
            const videoRadio = document.querySelector(`input[name="track-video"][value="${videoMode}"]`);
            if (videoRadio) {
                videoRadio.checked = true;
            }
        }

        // ---- ABR bitrate inputs ----
        const initBitrate = $('#opt-init-bitrate-video');
        if (initBitrate) {
            const v = s?.streaming?.abr?.initialBitrate?.video;
            initBitrate.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }
        const minBitrate = $('#opt-min-bitrate-video');
        if (minBitrate) {
            const v = s?.streaming?.abr?.minBitrate?.video;
            minBitrate.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }
        const maxBitrate = $('#opt-max-bitrate-video');
        if (maxBitrate) {
            const v = s?.streaming?.abr?.maxBitrate?.video;
            maxBitrate.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }

        // ---- Live delay inputs ----
        const liveDelay = $('#opt-live-delay');
        if (liveDelay) {
            const v = s?.streaming?.delay?.liveDelay;
            liveDelay.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }
        const fragCount = $('#opt-live-delay-frag-count');
        if (fragCount) {
            const v = s?.streaming?.delay?.liveDelayFragmentCount;
            fragCount.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }

        // ---- UTC offset ----
        const utcOffset = $('#opt-utc-offset');
        if (utcOffset) {
            const v = s?.streaming?.utcSynchronization?.defaultTimingSource?.value;
            utcOffset.value = (v !== undefined && !isNaN(v) && v !== 0) ? v : '';
        }

        // ---- CMCD inputs ----
        const cmcdMode = $('#opt-cmcd-mode');
        if (cmcdMode && s?.streaming?.cmcd?.mode) {
            cmcdMode.value = s.streaming.cmcd.mode;
        }
        const cmcdSid = $('#opt-cmcd-session-id');
        if (cmcdSid) {
            cmcdSid.value = s?.streaming?.cmcd?.sid || '';
        }
        const cmcdCid = $('#opt-cmcd-content-id');
        if (cmcdCid) {
            cmcdCid.value = s?.streaming?.cmcd?.cid || '';
        }
        const cmcdRtp = $('#opt-cmcd-rtp');
        if (cmcdRtp) {
            const v = s?.streaming?.cmcd?.rtp;
            cmcdRtp.value = (v !== undefined && !isNaN(v) && v > 0) ? v : '';
        }
        const cmcdEnabledKeys = $('#opt-cmcd-enabled-keys');
        if (cmcdEnabledKeys) {
            const v = s?.streaming?.cmcd?.enabledKeys;
            cmcdEnabledKeys.value = Array.isArray(v) ? v.join(', ') : '';
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
