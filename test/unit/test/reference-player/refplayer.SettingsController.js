/**
 * Tests for the Reference Player SettingsController.
 *
 * Verifies that UI control states are correctly translated into dash.js
 * player settings via SettingsController.buildConfig() + player.updateSettings().
 *
 * Each test:
 *   1. Sets a DOM element to a known state (checkbox checked/unchecked, input value, etc.)
 *   2. Calls settingsController.buildConfig() to produce a config object
 *   3. Calls player.updateSettings(config) on a real dash.js MediaPlayer instance
 *   4. Asserts that player.getSettings() reflects the expected value
 */

import MediaPlayer from '../../../../src/streaming/MediaPlayer.js';
import Settings from '../../../../src/core/Settings.js';
import { SettingsController } from '../../../../samples/dash-if-reference-player/app/js/SettingsController.js';

import { expect } from 'chai';

describe('Reference Player - SettingsController', function () {

    const context = {};
    let player, settings, settingsController, testContainer;

    // ---------------------------------------------------------------
    // DOM helpers
    // ---------------------------------------------------------------

    function createCheckbox(id, checked) {
        const el = document.createElement('input');
        el.type = 'checkbox';
        el.id = id;
        el.checked = !!checked;
        testContainer.appendChild(el);
        return el;
    }

    function createInput(id, value) {
        const el = document.createElement('input');
        el.type = 'text';
        el.id = id;
        el.value = value !== undefined ? String(value) : '';
        testContainer.appendChild(el);
        return el;
    }

    function createSelect(id, options, selectedValue) {
        const el = document.createElement('select');
        el.id = id;
        for (const opt of options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            if (opt === selectedValue) {
                o.selected = true;
            }
            el.appendChild(o);
        }
        testContainer.appendChild(el);
        return el;
    }

    function createRadio(name, id, value, checked) {
        const el = document.createElement('input');
        el.type = 'radio';
        el.name = name;
        el.id = id;
        el.value = value;
        el.checked = !!checked;
        testContainer.appendChild(el);
        return el;
    }

    /**
     * Create all DOM elements that SettingsController.buildConfig() and init() reference.
     */
    function createAllDomElements() {
        // --- Checkboxes consumed by buildConfig() ---
        createCheckbox('opt-schedule-while-paused', true);
        createCheckbox('opt-calc-seg-avail', false);
        createCheckbox('opt-reuse-sourcebuffers', true);
        createCheckbox('opt-mediasource-duration-inf', true);
        createCheckbox('opt-reset-sb-track-switch', false);
        createCheckbox('opt-save-last-media', true);
        createCheckbox('opt-local-storage', true);
        createCheckbox('opt-jump-gaps', true);
        createCheckbox('opt-content-steering', true);
        createCheckbox('opt-catchup-enabled', false);
        createCheckbox('opt-fast-switch', false);
        createCheckbox('opt-auto-switch-video', true);
        createCheckbox('opt-rule-throughput', true);
        createCheckbox('opt-rule-bola', true);
        createCheckbox('opt-rule-insufficient-buffer', true);
        createCheckbox('opt-rule-switch-history', true);
        createCheckbox('opt-rule-dropped-frames', false);
        createCheckbox('opt-rule-abandon', true);
        createCheckbox('opt-rule-l2a', false);
        createCheckbox('opt-rule-lolp', false);
        createCheckbox('opt-text-default-enabled', true);
        createCheckbox('opt-force-text-streaming', false);
        createCheckbox('opt-imsc-rollup', true);
        createCheckbox('opt-imsc-forced-only', false);
        createCheckbox('opt-apply-service-desc', true);
        createCheckbox('opt-use-suggested-pd', true);
        createCheckbox('opt-cmcd-enabled', false);
        createCheckbox('opt-cmsd-enabled', false);
        createCheckbox('opt-cmsd-apply-mb', false);
        createCheckbox('opt-enhancement-enabled', false);

        // Checkboxes consumed by _bindAll() only (not buildConfig), but needed for init()
        createCheckbox('opt-autoplay', true);
        createCheckbox('opt-loop', true);
        createCheckbox('opt-muted', false);

        // --- Selects / dropdowns ---
        createSelect('opt-log-level', ['0', '1', '2', '3', '4', '5'], '3');
        createSelect('opt-catchup-mode', ['liveCatchupModeDefault', 'liveCatchupModeLoLP', 'liveCatchupModeStep'], 'liveCatchupModeDefault');
        createSelect('opt-cmcd-mode', ['query', 'header'], 'query');

        // --- Number / text inputs ---
        createInput('opt-stall-threshold', '0.5');
        createInput('opt-ll-stall-threshold', '0.3');
        createInput('opt-live-delay', '');
        createInput('opt-live-delay-frag-count', '');
        createInput('opt-utc-offset', '0');
        createInput('opt-init-bitrate-video', '');
        createInput('opt-min-bitrate-video', '');
        createInput('opt-max-bitrate-video', '');
        createInput('opt-cmcd-session-id', '');
        createInput('opt-cmcd-content-id', '');
        createInput('opt-cmcd-rtp', '');
        createInput('opt-cmcd-rtp-safety', '5');
        createInput('opt-cmcd-enabled-keys', '');
        createInput('opt-cmsd-etp-weight', '0.5');
        createInput('opt-catchup-max-drift', '');
        createInput('opt-catchup-live-threshold', '');
        createInput('opt-catchup-step-start-min', '');
        createInput('opt-catchup-step-start-max', '');
        createInput('opt-catchup-step-stop-min', '');
        createInput('opt-catchup-step-stop-max', '');

        // --- Radio buttons ---
        createRadio('track-audio', 'opt-track-audio-replace', 'alwaysReplace', true);
        createRadio('track-audio', 'opt-track-audio-never', 'neverReplace', false);
        createRadio('track-video', 'opt-track-video-replace', 'alwaysReplace', true);
        createRadio('track-video', 'opt-track-video-never', 'neverReplace', false);

        // --- Structural elements needed by _bindAll() ---
        const btnOptions = document.createElement('button');
        btnOptions.id = 'btn-options';
        testContainer.appendChild(btnOptions);

        const optionsPanel = document.createElement('div');
        optionsPanel.id = 'options-panel';
        testContainer.appendChild(optionsPanel);

        // --- Elements needed by applyFromUrl() ---
        createInput('stream-url', '');

        // --- Elements needed by _syncFromPlayer() / applyInitialMediaSettings() ---
        createInput('opt-init-role-video', '');
        createInput('opt-init-lang-audio', '');
        createInput('opt-init-role-audio', '');
        createSelect('opt-audio-accessibility-scheme', ['', 'mpeg', 'dvb'], '');
        createInput('opt-audio-accessibility-value', '');
        createInput('opt-init-lang-text', '');
        createInput('opt-init-role-text', '');
    }

    // ---------------------------------------------------------------
    // Helper: set checkbox + build + update + return settings
    // ---------------------------------------------------------------

    function applyConfig() {
        const config = settingsController.buildConfig();
        player.updateSettings(config);
        return player.getSettings();
    }

    function setCheckboxAndApply(id, checked) {
        document.getElementById(id).checked = checked;
        return applyConfig();
    }

    function setInputAndApply(id, value) {
        document.getElementById(id).value = String(value);
        return applyConfig();
    }

    function setSelectAndApply(id, value) {
        document.getElementById(id).value = value;
        return applyConfig();
    }

    function setRadioAndApply(name, value) {
        const radios = document.querySelectorAll(`input[name="${name}"]`);
        for (const r of radios) {
            r.checked = (r.value === value);
        }
        return applyConfig();
    }

    // ---------------------------------------------------------------
    // Setup / teardown
    // ---------------------------------------------------------------

    beforeEach(function () {
        // Real dash.js player (no initialize needed for settings)
        settings = Settings(context).getInstance();
        settings.reset();
        player = MediaPlayer().create();
        player.setConfig({ settings });

        // DOM
        testContainer = document.createElement('div');
        document.body.appendChild(testContainer);
        createAllDomElements();

        // SettingsController with a minimal playerController wrapper
        const playerController = {
            player: player,
            setInitialMediaSettings: function () {},
            enableForcedTextStreaming: function () {}
        };
        settingsController = new SettingsController(playerController);
        // We intentionally skip settingsController.init() in most tests
        // to avoid side effects from _bindAll. We test buildConfig() directly.
    });

    afterEach(function () {
        testContainer.remove();
        settings.reset();
        player = null;
        settingsController = null;
    });

    // ---------------------------------------------------------------
    // Tests: Checkbox → boolean settings
    // ---------------------------------------------------------------

    describe('Checkbox boolean settings', function () {

        it('should apply streaming.buffer.fastSwitchEnabled when checked', function () {
            let s = setCheckboxAndApply('opt-fast-switch', true);
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
        });

        it('should apply streaming.buffer.fastSwitchEnabled when unchecked', function () {
            let s = setCheckboxAndApply('opt-fast-switch', false);
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.false;
        });

        it('should apply streaming.scheduling.scheduleWhilePaused', function () {
            let s = setCheckboxAndApply('opt-schedule-while-paused', false);
            expect(s.streaming.scheduling.scheduleWhilePaused).to.be.false;

            s = setCheckboxAndApply('opt-schedule-while-paused', true);
            expect(s.streaming.scheduling.scheduleWhilePaused).to.be.true;
        });

        it('should apply streaming.gaps.jumpGaps', function () {
            let s = setCheckboxAndApply('opt-jump-gaps', false);
            expect(s.streaming.gaps.jumpGaps).to.be.false;

            s = setCheckboxAndApply('opt-jump-gaps', true);
            expect(s.streaming.gaps.jumpGaps).to.be.true;
        });

        it('should apply streaming.buffer.reuseExistingSourceBuffers', function () {
            let s = setCheckboxAndApply('opt-reuse-sourcebuffers', false);
            expect(s.streaming.buffer.reuseExistingSourceBuffers).to.be.false;

            s = setCheckboxAndApply('opt-reuse-sourcebuffers', true);
            expect(s.streaming.buffer.reuseExistingSourceBuffers).to.be.true;
        });

        it('should apply streaming.buffer.mediaSourceDurationInfinity', function () {
            let s = setCheckboxAndApply('opt-mediasource-duration-inf', false);
            expect(s.streaming.buffer.mediaSourceDurationInfinity).to.be.false;

            s = setCheckboxAndApply('opt-mediasource-duration-inf', true);
            expect(s.streaming.buffer.mediaSourceDurationInfinity).to.be.true;
        });

        it('should apply streaming.buffer.resetSourceBuffersForTrackSwitch', function () {
            let s = setCheckboxAndApply('opt-reset-sb-track-switch', true);
            expect(s.streaming.buffer.resetSourceBuffersForTrackSwitch).to.be.true;

            s = setCheckboxAndApply('opt-reset-sb-track-switch', false);
            expect(s.streaming.buffer.resetSourceBuffersForTrackSwitch).to.be.false;
        });

        it('should apply streaming.saveLastMediaSettingsForCurrentStreamingSession', function () {
            let s = setCheckboxAndApply('opt-save-last-media', false);
            expect(s.streaming.saveLastMediaSettingsForCurrentStreamingSession).to.be.false;

            s = setCheckboxAndApply('opt-save-last-media', true);
            expect(s.streaming.saveLastMediaSettingsForCurrentStreamingSession).to.be.true;
        });

        it('should apply both lastBitrateCachingInfo.enabled and lastMediaSettingsCachingInfo.enabled from opt-local-storage', function () {
            let s = setCheckboxAndApply('opt-local-storage', false);
            expect(s.streaming.lastBitrateCachingInfo.enabled).to.be.false;
            expect(s.streaming.lastMediaSettingsCachingInfo.enabled).to.be.false;

            s = setCheckboxAndApply('opt-local-storage', true);
            expect(s.streaming.lastBitrateCachingInfo.enabled).to.be.true;
            expect(s.streaming.lastMediaSettingsCachingInfo.enabled).to.be.true;
        });

        it('should apply streaming.applyContentSteering', function () {
            let s = setCheckboxAndApply('opt-content-steering', false);
            expect(s.streaming.applyContentSteering).to.be.false;

            s = setCheckboxAndApply('opt-content-steering', true);
            expect(s.streaming.applyContentSteering).to.be.true;
        });

        it('should apply streaming.liveCatchup.enabled', function () {
            let s = setCheckboxAndApply('opt-catchup-enabled', true);
            expect(s.streaming.liveCatchup.enabled).to.be.true;

            s = setCheckboxAndApply('opt-catchup-enabled', false);
            expect(s.streaming.liveCatchup.enabled).to.be.false;
        });

        it('should apply streaming.abr.autoSwitchBitrate.video', function () {
            let s = setCheckboxAndApply('opt-auto-switch-video', false);
            expect(s.streaming.abr.autoSwitchBitrate.video).to.be.false;

            s = setCheckboxAndApply('opt-auto-switch-video', true);
            expect(s.streaming.abr.autoSwitchBitrate.video).to.be.true;
        });

        it('should apply streaming.timeShiftBuffer.calcFromSegmentTimeline', function () {
            let s = setCheckboxAndApply('opt-calc-seg-avail', true);
            expect(s.streaming.timeShiftBuffer.calcFromSegmentTimeline).to.be.true;

            s = setCheckboxAndApply('opt-calc-seg-avail', false);
            expect(s.streaming.timeShiftBuffer.calcFromSegmentTimeline).to.be.false;
        });

        it('should apply streaming.delay.useSuggestedPresentationDelay', function () {
            let s = setCheckboxAndApply('opt-use-suggested-pd', false);
            expect(s.streaming.delay.useSuggestedPresentationDelay).to.be.false;

            s = setCheckboxAndApply('opt-use-suggested-pd', true);
            expect(s.streaming.delay.useSuggestedPresentationDelay).to.be.true;
        });

        it('should apply streaming.text.defaultEnabled', function () {
            let s = setCheckboxAndApply('opt-text-default-enabled', false);
            expect(s.streaming.text.defaultEnabled).to.be.false;

            s = setCheckboxAndApply('opt-text-default-enabled', true);
            expect(s.streaming.text.defaultEnabled).to.be.true;
        });

        it('should apply streaming.text.imsc.enableRollUp', function () {
            let s = setCheckboxAndApply('opt-imsc-rollup', false);
            expect(s.streaming.text.imsc.enableRollUp).to.be.false;

            s = setCheckboxAndApply('opt-imsc-rollup', true);
            expect(s.streaming.text.imsc.enableRollUp).to.be.true;
        });

        it('should apply streaming.text.imsc.displayForcedOnlyMode', function () {
            let s = setCheckboxAndApply('opt-imsc-forced-only', true);
            expect(s.streaming.text.imsc.displayForcedOnlyMode).to.be.true;

            s = setCheckboxAndApply('opt-imsc-forced-only', false);
            expect(s.streaming.text.imsc.displayForcedOnlyMode).to.be.false;
        });

        it('should apply streaming.applyServiceDescription', function () {
            let s = setCheckboxAndApply('opt-apply-service-desc', false);
            expect(s.streaming.applyServiceDescription).to.be.false;

            s = setCheckboxAndApply('opt-apply-service-desc', true);
            expect(s.streaming.applyServiceDescription).to.be.true;
        });

        it('should apply streaming.enhancement.enabled', function () {
            let s = setCheckboxAndApply('opt-enhancement-enabled', true);
            expect(s.streaming.enhancement.enabled).to.be.true;

            s = setCheckboxAndApply('opt-enhancement-enabled', false);
            expect(s.streaming.enhancement.enabled).to.be.false;
        });
    });

    // ---------------------------------------------------------------
    // Tests: ABR rules
    // ---------------------------------------------------------------

    describe('ABR rule settings', function () {

        it('should apply streaming.abr.rules.throughputRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-throughput', false);
            expect(s.streaming.abr.rules.throughputRule.active).to.be.false;

            s = setCheckboxAndApply('opt-rule-throughput', true);
            expect(s.streaming.abr.rules.throughputRule.active).to.be.true;
        });

        it('should apply streaming.abr.rules.bolaRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-bola', false);
            expect(s.streaming.abr.rules.bolaRule.active).to.be.false;

            s = setCheckboxAndApply('opt-rule-bola', true);
            expect(s.streaming.abr.rules.bolaRule.active).to.be.true;
        });

        it('should apply streaming.abr.rules.insufficientBufferRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-insufficient-buffer', false);
            expect(s.streaming.abr.rules.insufficientBufferRule.active).to.be.false;

            s = setCheckboxAndApply('opt-rule-insufficient-buffer', true);
            expect(s.streaming.abr.rules.insufficientBufferRule.active).to.be.true;
        });

        it('should apply streaming.abr.rules.switchHistoryRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-switch-history', false);
            expect(s.streaming.abr.rules.switchHistoryRule.active).to.be.false;

            s = setCheckboxAndApply('opt-rule-switch-history', true);
            expect(s.streaming.abr.rules.switchHistoryRule.active).to.be.true;
        });

        it('should apply streaming.abr.rules.droppedFramesRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-dropped-frames', true);
            expect(s.streaming.abr.rules.droppedFramesRule.active).to.be.true;

            s = setCheckboxAndApply('opt-rule-dropped-frames', false);
            expect(s.streaming.abr.rules.droppedFramesRule.active).to.be.false;
        });

        it('should apply streaming.abr.rules.abandonRequestsRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-abandon', false);
            expect(s.streaming.abr.rules.abandonRequestsRule.active).to.be.false;

            s = setCheckboxAndApply('opt-rule-abandon', true);
            expect(s.streaming.abr.rules.abandonRequestsRule.active).to.be.true;
        });

        it('should apply streaming.abr.rules.l2ARule.active', function () {
            let s = setCheckboxAndApply('opt-rule-l2a', true);
            expect(s.streaming.abr.rules.l2ARule.active).to.be.true;

            s = setCheckboxAndApply('opt-rule-l2a', false);
            expect(s.streaming.abr.rules.l2ARule.active).to.be.false;
        });

        it('should apply streaming.abr.rules.loLPRule.active', function () {
            let s = setCheckboxAndApply('opt-rule-lolp', true);
            expect(s.streaming.abr.rules.loLPRule.active).to.be.true;

            s = setCheckboxAndApply('opt-rule-lolp', false);
            expect(s.streaming.abr.rules.loLPRule.active).to.be.false;
        });
    });

    // ---------------------------------------------------------------
    // Tests: Numeric / text input settings
    // ---------------------------------------------------------------

    describe('Numeric and text input settings', function () {

        it('should apply debug.logLevel from dropdown', function () {
            let s = setSelectAndApply('opt-log-level', '5');
            expect(s.debug.logLevel).to.equal(5);

            s = setSelectAndApply('opt-log-level', '1');
            expect(s.debug.logLevel).to.equal(1);

            s = setSelectAndApply('opt-log-level', '3');
            expect(s.debug.logLevel).to.equal(3);
        });

        it('should apply debug.logLevel 0 (NONE) from dropdown', function () {
            let s = setSelectAndApply('opt-log-level', '0');
            expect(s.debug.logLevel).to.equal(0);
        });

        it('should apply streaming.buffer.stallThreshold', function () {
            let s = setInputAndApply('opt-stall-threshold', '1.2');
            expect(s.streaming.buffer.stallThreshold).to.equal(1.2);

            s = setInputAndApply('opt-stall-threshold', '0.1');
            expect(s.streaming.buffer.stallThreshold).to.equal(0.1);
        });

        it('should apply streaming.buffer.lowLatencyStallThreshold', function () {
            let s = setInputAndApply('opt-ll-stall-threshold', '0.8');
            expect(s.streaming.buffer.lowLatencyStallThreshold).to.equal(0.8);
        });

        it('should apply streaming.delay.liveDelay when value is greater than 0', function () {
            let s = setInputAndApply('opt-live-delay', '4');
            expect(s.streaming.delay.liveDelay).to.equal(4);
        });

        it('should not set streaming.delay.liveDelay when value is empty or 0', function () {
            // Start with the default (NaN)
            let defaultVal = player.getSettings().streaming.delay.liveDelay;
            expect(defaultVal).to.be.NaN;

            // Empty input should not change the setting (buildConfig omits it)
            setInputAndApply('opt-live-delay', '');
            let s = player.getSettings();
            // The config won't include liveDelay, so the original default (NaN) remains
            expect(s.streaming.delay.liveDelay).to.be.NaN;
        });

        it('should apply streaming.delay.liveDelayFragmentCount when value is greater than 0', function () {
            let s = setInputAndApply('opt-live-delay-frag-count', '3');
            expect(s.streaming.delay.liveDelayFragmentCount).to.equal(3);
        });

        it('should not set streaming.delay.liveDelayFragmentCount when value is empty', function () {
            let defaultVal = player.getSettings().streaming.delay.liveDelayFragmentCount;
            expect(defaultVal).to.be.NaN;

            setInputAndApply('opt-live-delay-frag-count', '');
            let s = player.getSettings();
            expect(s.streaming.delay.liveDelayFragmentCount).to.be.NaN;
        });

        it('should apply streaming.abr.initialBitrate.video when value is greater than 0', function () {
            let s = setInputAndApply('opt-init-bitrate-video', '2000');
            expect(s.streaming.abr.initialBitrate.video).to.equal(2000);
        });

        it('should not set streaming.abr.initialBitrate.video when value is empty', function () {
            let defaultVal = player.getSettings().streaming.abr.initialBitrate.video;
            expect(defaultVal).to.equal(-1);

            setInputAndApply('opt-init-bitrate-video', '');
            let s = player.getSettings();
            expect(s.streaming.abr.initialBitrate.video).to.equal(-1);
        });

        it('should apply streaming.abr.minBitrate.video when value is greater than 0', function () {
            let s = setInputAndApply('opt-min-bitrate-video', '500');
            expect(s.streaming.abr.minBitrate.video).to.equal(500);
        });

        it('should apply streaming.abr.maxBitrate.video when value is greater than 0', function () {
            let s = setInputAndApply('opt-max-bitrate-video', '8000');
            expect(s.streaming.abr.maxBitrate.video).to.equal(8000);
        });

        it('should apply streaming.utcSynchronization.defaultTimingSource when utc offset is non-zero', function () {
            let s = setInputAndApply('opt-utc-offset', '5000');
            expect(s.streaming.utcSynchronization.defaultTimingSource.value).to.equal(5000);
        });

        it('should not set streaming.utcSynchronization.defaultTimingSource when utc offset is 0', function () {
            // Default: the utcSynchronization object exists but we should not override it with offset 0
            let defaultSource = player.getSettings().streaming.utcSynchronization.defaultTimingSource;

            setInputAndApply('opt-utc-offset', '0');
            let s = player.getSettings();
            // The original default timing source should remain unchanged
            expect(s.streaming.utcSynchronization.defaultTimingSource.value).to.equal(defaultSource.value);
        });
    });

    // ---------------------------------------------------------------
    // Tests: Radio buttons
    // ---------------------------------------------------------------

    describe('Radio button settings', function () {

        it('should apply streaming.trackSwitchMode.audio from radio buttons', function () {
            let s = setRadioAndApply('track-audio', 'neverReplace');
            expect(s.streaming.trackSwitchMode.audio).to.equal('neverReplace');

            s = setRadioAndApply('track-audio', 'alwaysReplace');
            expect(s.streaming.trackSwitchMode.audio).to.equal('alwaysReplace');
        });

        it('should apply streaming.trackSwitchMode.video from radio buttons', function () {
            let s = setRadioAndApply('track-video', 'neverReplace');
            expect(s.streaming.trackSwitchMode.video).to.equal('neverReplace');

            s = setRadioAndApply('track-video', 'alwaysReplace');
            expect(s.streaming.trackSwitchMode.video).to.equal('alwaysReplace');
        });
    });

    // ---------------------------------------------------------------
    // Tests: Dropdown select settings
    // ---------------------------------------------------------------

    describe('Dropdown select settings', function () {

        it('should apply streaming.liveCatchup.mode from dropdown', function () {
            let s = setSelectAndApply('opt-catchup-mode', 'liveCatchupModeLoLP');
            expect(s.streaming.liveCatchup.mode).to.equal('liveCatchupModeLoLP');

            s = setSelectAndApply('opt-catchup-mode', 'liveCatchupModeDefault');
            expect(s.streaming.liveCatchup.mode).to.equal('liveCatchupModeDefault');
        });

        it('should apply streaming.liveCatchup.mode Step from dropdown', function () {
            let s = setSelectAndApply('opt-catchup-mode', 'liveCatchupModeStep');
            expect(s.streaming.liveCatchup.mode).to.equal('liveCatchupModeStep');
        });
    });

    // ---------------------------------------------------------------
    // Tests: Live Catchup numeric settings
    // ---------------------------------------------------------------

    describe('Live Catchup numeric settings', function () {

        it('should apply streaming.liveCatchup.maxDrift', function () {
            let s = setInputAndApply('opt-catchup-max-drift', '8');
            expect(s.streaming.liveCatchup.maxDrift).to.equal(8);
        });

        it('should not set streaming.liveCatchup.maxDrift when input is empty', function () {
            document.getElementById('opt-catchup-max-drift').value = '';
            let s = applyConfig();
            expect(isNaN(s.streaming.liveCatchup.maxDrift)).to.be.true;
        });

        it('should apply streaming.liveCatchup.liveThreshold', function () {
            let s = setInputAndApply('opt-catchup-live-threshold', '5');
            expect(s.streaming.liveCatchup.liveThreshold).to.equal(5);
        });

        it('should not set streaming.liveCatchup.liveThreshold when input is empty', function () {
            document.getElementById('opt-catchup-live-threshold').value = '';
            let s = applyConfig();
            expect(s.streaming.liveCatchup.liveThreshold).to.equal(-1);
        });

        it('should apply streaming.liveCatchup.step.start.min and start.max', function () {
            document.getElementById('opt-catchup-step-start-min').value = '0.2';
            document.getElementById('opt-catchup-step-start-max').value = '1.5';
            let s = applyConfig();
            expect(s.streaming.liveCatchup.step.start.min).to.equal(0.2);
            expect(s.streaming.liveCatchup.step.start.max).to.equal(1.5);
        });

        it('should apply streaming.liveCatchup.step.stop.min and stop.max', function () {
            document.getElementById('opt-catchup-step-stop-min').value = '0.3';
            document.getElementById('opt-catchup-step-stop-max').value = '1.2';
            let s = applyConfig();
            expect(s.streaming.liveCatchup.step.stop.min).to.equal(0.3);
            expect(s.streaming.liveCatchup.step.stop.max).to.equal(1.2);
        });

        it('should not set streaming.liveCatchup.step when all step inputs are empty', function () {
            document.getElementById('opt-catchup-step-start-min').value = '';
            document.getElementById('opt-catchup-step-start-max').value = '';
            document.getElementById('opt-catchup-step-stop-min').value = '';
            document.getElementById('opt-catchup-step-stop-max').value = '';
            let s = applyConfig();
            // Step settings should remain at their defaults (NaN)
            expect(isNaN(s.streaming.liveCatchup.step.start.min)).to.be.true;
            expect(isNaN(s.streaming.liveCatchup.step.start.max)).to.be.true;
        });
    });

    // ---------------------------------------------------------------
    // Tests: CMCD conditional block
    // ---------------------------------------------------------------

    describe('CMCD settings', function () {

        it('should apply streaming.cmcd settings when opt-cmcd-enabled is checked', function () {
            document.getElementById('opt-cmcd-enabled').checked = true;
            document.getElementById('opt-cmcd-mode').value = 'header';
            document.getElementById('opt-cmcd-session-id').value = 'test-session';
            document.getElementById('opt-cmcd-content-id').value = 'test-content';
            document.getElementById('opt-cmcd-rtp').value = '5000';
            document.getElementById('opt-cmcd-rtp-safety').value = '3';
            document.getElementById('opt-cmcd-enabled-keys').value = 'br,bl,dl';

            let s = applyConfig();

            expect(s.streaming.cmcd.enabled).to.be.true;
            expect(s.streaming.cmcd.mode).to.equal('header');
            expect(s.streaming.cmcd.sid).to.equal('test-session');
            expect(s.streaming.cmcd.cid).to.equal('test-content');
            expect(s.streaming.cmcd.rtp).to.equal(5000);
            expect(s.streaming.cmcd.rtpSafetyFactor).to.equal(3);
            expect(s.streaming.cmcd.enabledKeys).to.deep.equal(['br', 'bl', 'dl']);
        });

        it('should not override streaming.cmcd when opt-cmcd-enabled is unchecked', function () {
            document.getElementById('opt-cmcd-enabled').checked = false;

            let s = applyConfig();

            // When unchecked, buildConfig() does not include a cmcd block,
            // so the player's default cmcd settings remain.
            expect(s.streaming.cmcd.enabled).to.be.false;
        });
    });

    // ---------------------------------------------------------------
    // Tests: CMSD conditional block
    // ---------------------------------------------------------------

    describe('CMSD settings', function () {

        it('should apply streaming.cmsd settings when opt-cmsd-enabled is checked', function () {
            document.getElementById('opt-cmsd-enabled').checked = true;
            document.getElementById('opt-cmsd-apply-mb').checked = true;
            document.getElementById('opt-cmsd-etp-weight').value = '0.8';

            let s = applyConfig();

            expect(s.streaming.cmsd.enabled).to.be.true;
            expect(s.streaming.cmsd.abr.applyMb).to.be.true;
            expect(s.streaming.cmsd.abr.etpWeightRatio).to.equal(0.8);
        });

        it('should not override streaming.cmsd when opt-cmsd-enabled is unchecked', function () {
            document.getElementById('opt-cmsd-enabled').checked = false;

            let s = applyConfig();

            expect(s.streaming.cmsd.enabled).to.be.false;
        });
    });

    // ---------------------------------------------------------------
    // Tests: Combined / integration scenarios
    // ---------------------------------------------------------------

    describe('Combined settings scenarios', function () {

        it('should apply multiple checkbox settings simultaneously', function () {
            document.getElementById('opt-fast-switch').checked = true;
            document.getElementById('opt-jump-gaps').checked = false;
            document.getElementById('opt-auto-switch-video').checked = false;
            document.getElementById('opt-rule-throughput').checked = false;
            document.getElementById('opt-rule-l2a').checked = true;

            let s = applyConfig();

            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s.streaming.gaps.jumpGaps).to.be.false;
            expect(s.streaming.abr.autoSwitchBitrate.video).to.be.false;
            expect(s.streaming.abr.rules.throughputRule.active).to.be.false;
            expect(s.streaming.abr.rules.l2ARule.active).to.be.true;
        });

        it('should apply a mix of checkbox and numeric settings', function () {
            document.getElementById('opt-fast-switch').checked = true;
            document.getElementById('opt-stall-threshold').value = '2.0';
            document.getElementById('opt-init-bitrate-video').value = '3000';
            document.getElementById('opt-log-level').value = '5';

            let s = applyConfig();

            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s.streaming.buffer.stallThreshold).to.equal(2.0);
            expect(s.streaming.abr.initialBitrate.video).to.equal(3000);
            expect(s.debug.logLevel).to.equal(5);
        });

        it('should correctly update settings on repeated applies with different values', function () {
            // First apply
            document.getElementById('opt-fast-switch').checked = true;
            let s = applyConfig();
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;

            // Second apply with opposite value
            document.getElementById('opt-fast-switch').checked = false;
            s = applyConfig();
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.false;

            // Third apply reverting back
            document.getElementById('opt-fast-switch').checked = true;
            s = applyConfig();
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
        });
    });

    // ---------------------------------------------------------------
    // Tests: _syncFromPlayer() populates UI from dash.js defaults
    // ---------------------------------------------------------------

    describe('Sync from player defaults via init()', function () {

        // These tests call settingsController.init(), which triggers
        // _syncFromPlayer() and should populate all UI elements from
        // the actual dash.js player settings — regardless of what
        // the HTML hardcodes as defaults.

        it('should sync checkbox states from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();

            // Spot-check checkboxes that are true by default in Settings.js
            expect(document.getElementById('opt-schedule-while-paused').checked).to.equal(s.streaming.scheduling.scheduleWhilePaused);
            expect(document.getElementById('opt-jump-gaps').checked).to.equal(s.streaming.gaps.jumpGaps);
            expect(document.getElementById('opt-reuse-sourcebuffers').checked).to.equal(s.streaming.buffer.reuseExistingSourceBuffers);
            expect(document.getElementById('opt-mediasource-duration-inf').checked).to.equal(s.streaming.buffer.mediaSourceDurationInfinity);
            expect(document.getElementById('opt-auto-switch-video').checked).to.equal(s.streaming.abr.autoSwitchBitrate.video);
            expect(document.getElementById('opt-content-steering').checked).to.equal(s.streaming.applyContentSteering);
            expect(document.getElementById('opt-save-last-media').checked).to.equal(s.streaming.saveLastMediaSettingsForCurrentStreamingSession);
            expect(document.getElementById('opt-local-storage').checked).to.equal(s.streaming.lastBitrateCachingInfo.enabled);
            expect(document.getElementById('opt-apply-service-desc').checked).to.equal(s.streaming.applyServiceDescription);
            expect(document.getElementById('opt-use-suggested-pd').checked).to.equal(s.streaming.delay.useSuggestedPresentationDelay);
            expect(document.getElementById('opt-text-default-enabled').checked).to.equal(s.streaming.text.defaultEnabled);
            expect(document.getElementById('opt-imsc-rollup').checked).to.equal(s.streaming.text.imsc.enableRollUp);

            // Spot-check checkboxes that are false by default
            expect(document.getElementById('opt-reset-sb-track-switch').checked).to.equal(s.streaming.buffer.resetSourceBuffersForTrackSwitch);
            expect(document.getElementById('opt-imsc-forced-only').checked).to.equal(s.streaming.text.imsc.displayForcedOnlyMode);
            expect(document.getElementById('opt-enhancement-enabled').checked).to.equal(s.streaming.enhancement.enabled);
        });

        it('should sync ABR rule checkboxes from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();

            expect(document.getElementById('opt-rule-throughput').checked).to.equal(s.streaming.abr.rules.throughputRule.active);
            expect(document.getElementById('opt-rule-bola').checked).to.equal(s.streaming.abr.rules.bolaRule.active);
            expect(document.getElementById('opt-rule-insufficient-buffer').checked).to.equal(s.streaming.abr.rules.insufficientBufferRule.active);
            expect(document.getElementById('opt-rule-switch-history').checked).to.equal(s.streaming.abr.rules.switchHistoryRule.active);
            expect(document.getElementById('opt-rule-dropped-frames').checked).to.equal(s.streaming.abr.rules.droppedFramesRule.active);
            expect(document.getElementById('opt-rule-abandon').checked).to.equal(s.streaming.abr.rules.abandonRequestsRule.active);
            expect(document.getElementById('opt-rule-l2a').checked).to.equal(s.streaming.abr.rules.l2ARule.active);
            expect(document.getElementById('opt-rule-lolp').checked).to.equal(s.streaming.abr.rules.loLPRule.active);
        });

        it('should sync opt-stall-threshold from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-stall-threshold');
            expect(parseFloat(el.value)).to.equal(s.streaming.buffer.stallThreshold);
        });

        it('should sync opt-ll-stall-threshold from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-ll-stall-threshold');
            expect(parseFloat(el.value)).to.equal(s.streaming.buffer.lowLatencyStallThreshold);
        });

        it('should sync opt-cmcd-rtp-safety from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-cmcd-rtp-safety');
            expect(parseFloat(el.value)).to.equal(s.streaming.cmcd.rtpSafetyFactor);
        });

        it('should sync opt-cmsd-etp-weight from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-cmsd-etp-weight');
            expect(parseFloat(el.value)).to.equal(s.streaming.cmsd.abr.etpWeightRatio);
        });

        it('should sync opt-log-level from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-log-level');
            expect(parseInt(el.value)).to.equal(s.debug.logLevel);
        });

        it('should sync opt-catchup-mode from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const el = document.getElementById('opt-catchup-mode');
            expect(el.value).to.equal(s.streaming.liveCatchup.mode);
        });

        it('should sync catchup numeric inputs as empty when defaults are NaN', function () {
            settingsController.init();

            // maxDrift default is NaN, should sync as empty
            expect(document.getElementById('opt-catchup-max-drift').value).to.equal('');
            // liveThreshold default is -1, should sync as empty
            expect(document.getElementById('opt-catchup-live-threshold').value).to.equal('');
            // step defaults are NaN, should sync as empty
            expect(document.getElementById('opt-catchup-step-start-min').value).to.equal('');
            expect(document.getElementById('opt-catchup-step-start-max').value).to.equal('');
            expect(document.getElementById('opt-catchup-step-stop-min').value).to.equal('');
            expect(document.getElementById('opt-catchup-step-stop-max').value).to.equal('');
        });

        it('should sync catchup numeric inputs from non-default player settings on init', function () {
            player.updateSettings({
                streaming: {
                    liveCatchup: {
                        maxDrift: 8,
                        liveThreshold: 5,
                        step: {
                            start: { min: 0.2, max: 1.5 },
                            stop: { min: 0.3, max: 1.2 }
                        }
                    }
                }
            });

            settingsController.init();

            expect(document.getElementById('opt-catchup-max-drift').value).to.equal('8');
            expect(document.getElementById('opt-catchup-live-threshold').value).to.equal('5');
            expect(document.getElementById('opt-catchup-step-start-min').value).to.equal('0.2');
            expect(document.getElementById('opt-catchup-step-start-max').value).to.equal('1.5');
            expect(document.getElementById('opt-catchup-step-stop-min').value).to.equal('0.3');
            expect(document.getElementById('opt-catchup-step-stop-max').value).to.equal('1.2');
        });

        it('should sync track-audio radio from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const checked = document.querySelector('input[name="track-audio"]:checked');
            expect(checked.value).to.equal(s.streaming.trackSwitchMode.audio);
        });

        it('should sync track-video radio from player defaults on init', function () {
            settingsController.init();

            const s = player.getSettings();
            const checked = document.querySelector('input[name="track-video"]:checked');
            expect(checked.value).to.equal(s.streaming.trackSwitchMode.video);
        });

        it('should sync UI from non-default player settings on init', function () {
            // Set non-default values on the player before init
            player.updateSettings({
                debug: { logLevel: 5 },
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true,
                        stallThreshold: 1.5,
                        reuseExistingSourceBuffers: false
                    },
                    gaps: { jumpGaps: false },
                    abr: {
                        autoSwitchBitrate: { video: false },
                        rules: {
                            throughputRule: { active: false },
                            l2ARule: { active: true }
                        }
                    },
                    trackSwitchMode: {
                        audio: 'neverReplace',
                        video: 'alwaysReplace'
                    },
                    liveCatchup: {
                        enabled: true,
                        mode: 'liveCatchupModeLoLP',
                        maxDrift: 6,
                        liveThreshold: 3,
                        step: {
                            start: { min: 0.1, max: 1.8 },
                            stop: { min: 0.4, max: 1.1 }
                        }
                    },
                    cmcd: { rtpSafetyFactor: 10 },
                    cmsd: { abr: { etpWeightRatio: 0.9 } }
                }
            });

            settingsController.init();

            // Checkboxes
            expect(document.getElementById('opt-fast-switch').checked).to.be.true;
            expect(document.getElementById('opt-reuse-sourcebuffers').checked).to.be.false;
            expect(document.getElementById('opt-jump-gaps').checked).to.be.false;
            expect(document.getElementById('opt-auto-switch-video').checked).to.be.false;
            expect(document.getElementById('opt-rule-throughput').checked).to.be.false;
            expect(document.getElementById('opt-rule-l2a').checked).to.be.true;
            expect(document.getElementById('opt-catchup-enabled').checked).to.be.true;

            // Numeric inputs
            expect(parseFloat(document.getElementById('opt-stall-threshold').value)).to.equal(1.5);
            expect(parseFloat(document.getElementById('opt-cmcd-rtp-safety').value)).to.equal(10);
            expect(parseFloat(document.getElementById('opt-cmsd-etp-weight').value)).to.equal(0.9);
            expect(document.getElementById('opt-catchup-max-drift').value).to.equal('6');
            expect(document.getElementById('opt-catchup-live-threshold').value).to.equal('3');
            expect(document.getElementById('opt-catchup-step-start-min').value).to.equal('0.1');
            expect(document.getElementById('opt-catchup-step-start-max').value).to.equal('1.8');
            expect(document.getElementById('opt-catchup-step-stop-min').value).to.equal('0.4');
            expect(document.getElementById('opt-catchup-step-stop-max').value).to.equal('1.1');

            // Selects
            expect(parseInt(document.getElementById('opt-log-level').value)).to.equal(5);
            expect(document.getElementById('opt-catchup-mode').value).to.equal('liveCatchupModeLoLP');

            // Radios
            expect(document.querySelector('input[name="track-audio"]:checked').value).to.equal('neverReplace');
            expect(document.querySelector('input[name="track-video"]:checked').value).to.equal('alwaysReplace');
        });
    });

    // ---------------------------------------------------------------
    // Tests: applyFromUrl() - URL parameters update player + UI
    // ---------------------------------------------------------------

    describe('applyFromUrl() - URL parameters to UI fields', function () {

        // These tests use history.replaceState to set URL query parameters,
        // then call applyFromUrl() and verify that both the dash.js player
        // settings and the corresponding UI elements are updated correctly.

        let originalSearch;

        beforeEach(function () {
            originalSearch = window.location.search;
            settingsController.init();
        });

        afterEach(function () {
            // Restore original URL
            history.replaceState(null, '', window.location.pathname + originalSearch);
        });

        function setUrlAndApply(queryString) {
            history.replaceState(null, '', window.location.pathname + '?' + queryString);
            return settingsController.applyFromUrl();
        }

        // ---- Stream URL ----

        it('should set stream-url input from URL parameter', function () {
            setUrlAndApply('stream=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(document.getElementById('stream-url').value).to.equal('https://example.com/test.mpd');
        });

        // ---- External settings (autoplay, loop, muted) ----

        it('should set opt-autoplay checked and _autoPlay from URL', function () {
            document.getElementById('opt-autoplay').checked = false;
            setUrlAndApply('autoplay=true');
            expect(document.getElementById('opt-autoplay').checked).to.be.true;
            expect(settingsController.autoPlay).to.be.true;
        });

        it('should set opt-loop checked and _loop from URL', function () {
            document.getElementById('opt-loop').checked = false;
            setUrlAndApply('loop=true');
            expect(document.getElementById('opt-loop').checked).to.be.true;
            expect(settingsController.loop).to.be.true;
        });

        it('should set opt-muted checked from URL', function () {
            document.getElementById('opt-muted').checked = false;
            setUrlAndApply('muted=true');
            expect(document.getElementById('opt-muted').checked).to.be.true;
        });

        // ---- DRM protection data ----

        it('should decode and store restoredProtData from URL', function () {
            const protData = { 'com.widevine.alpha': { serverURL: 'https://license.example.com' } };
            const encoded = btoa(JSON.stringify(protData));
            setUrlAndApply('protData=' + encodeURIComponent(encoded));
            expect(settingsController.restoredProtData).to.deep.equal(protData);
        });

        it('should ignore invalid base64 protData gracefully', function () {
            setUrlAndApply('protData=not-valid-base64!!!');
            expect(settingsController.restoredProtData).to.be.null;
        });

        // ---- autoLoad return value ----

        it('should return true when autoLoad=true and stream is set', function () {
            const result = setUrlAndApply('autoLoad=true&stream=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(result).to.be.true;
        });

        it('should return false when autoLoad is not set', function () {
            const result = setUrlAndApply('stream=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(result).to.be.false;
        });

        it('should return false when autoLoad=true but no stream', function () {
            const result = setUrlAndApply('autoLoad=true');
            expect(result).to.be.false;
        });

        // ---- Boolean checkbox settings via URL ----

        it('should apply and sync streaming.buffer.fastSwitchEnabled=true from URL', function () {
            setUrlAndApply('streaming.buffer.fastSwitchEnabled=true');
            expect(player.getSettings().streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(document.getElementById('opt-fast-switch').checked).to.be.true;
        });

        it('should apply and sync streaming.gaps.jumpGaps=false from URL', function () {
            setUrlAndApply('streaming.gaps.jumpGaps=false');
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
            expect(document.getElementById('opt-jump-gaps').checked).to.be.false;
        });

        it('should apply and sync streaming.abr.autoSwitchBitrate.video=false from URL', function () {
            setUrlAndApply('streaming.abr.autoSwitchBitrate.video=false');
            expect(player.getSettings().streaming.abr.autoSwitchBitrate.video).to.be.false;
            expect(document.getElementById('opt-auto-switch-video').checked).to.be.false;
        });

        it('should apply and sync streaming.liveCatchup.enabled=true from URL', function () {
            setUrlAndApply('streaming.liveCatchup.enabled=true');
            expect(player.getSettings().streaming.liveCatchup.enabled).to.be.true;
            expect(document.getElementById('opt-catchup-enabled').checked).to.be.true;
        });

        it('should apply and sync streaming.abr.rules.throughputRule.active=false from URL', function () {
            setUrlAndApply('streaming.abr.rules.throughputRule.active=false');
            expect(player.getSettings().streaming.abr.rules.throughputRule.active).to.be.false;
            expect(document.getElementById('opt-rule-throughput').checked).to.be.false;
        });

        it('should apply and sync streaming.abr.rules.l2ARule.active=true from URL', function () {
            setUrlAndApply('streaming.abr.rules.l2ARule.active=true');
            expect(player.getSettings().streaming.abr.rules.l2ARule.active).to.be.true;
            expect(document.getElementById('opt-rule-l2a').checked).to.be.true;
        });

        it('should apply and sync streaming.applyContentSteering=false from URL', function () {
            setUrlAndApply('streaming.applyContentSteering=false');
            expect(player.getSettings().streaming.applyContentSteering).to.be.false;
            expect(document.getElementById('opt-content-steering').checked).to.be.false;
        });

        it('should apply and sync streaming.text.defaultEnabled=false from URL', function () {
            setUrlAndApply('streaming.text.defaultEnabled=false');
            expect(player.getSettings().streaming.text.defaultEnabled).to.be.false;
            expect(document.getElementById('opt-text-default-enabled').checked).to.be.false;
        });

        it('should apply and sync streaming.enhancement.enabled=true from URL', function () {
            setUrlAndApply('streaming.enhancement.enabled=true');
            expect(player.getSettings().streaming.enhancement.enabled).to.be.true;
            expect(document.getElementById('opt-enhancement-enabled').checked).to.be.true;
        });

        // ---- Numeric settings via URL ----

        it('should apply and sync streaming.buffer.stallThreshold from URL', function () {
            setUrlAndApply('streaming.buffer.stallThreshold=1.5');
            expect(player.getSettings().streaming.buffer.stallThreshold).to.equal(1.5);
            expect(parseFloat(document.getElementById('opt-stall-threshold').value)).to.equal(1.5);
        });

        it('should apply and sync streaming.buffer.lowLatencyStallThreshold from URL', function () {
            setUrlAndApply('streaming.buffer.lowLatencyStallThreshold=0.8');
            expect(player.getSettings().streaming.buffer.lowLatencyStallThreshold).to.equal(0.8);
            expect(parseFloat(document.getElementById('opt-ll-stall-threshold').value)).to.equal(0.8);
        });

        it('should apply and sync streaming.abr.initialBitrate.video from URL', function () {
            setUrlAndApply('streaming.abr.initialBitrate.video=3000');
            expect(player.getSettings().streaming.abr.initialBitrate.video).to.equal(3000);
            expect(document.getElementById('opt-init-bitrate-video').value).to.equal('3000');
        });

        it('should apply and sync streaming.abr.minBitrate.video from URL', function () {
            setUrlAndApply('streaming.abr.minBitrate.video=500');
            expect(player.getSettings().streaming.abr.minBitrate.video).to.equal(500);
            expect(document.getElementById('opt-min-bitrate-video').value).to.equal('500');
        });

        it('should apply and sync streaming.abr.maxBitrate.video from URL', function () {
            setUrlAndApply('streaming.abr.maxBitrate.video=8000');
            expect(player.getSettings().streaming.abr.maxBitrate.video).to.equal(8000);
            expect(document.getElementById('opt-max-bitrate-video').value).to.equal('8000');
        });

        it('should apply and sync streaming.delay.liveDelay from URL', function () {
            setUrlAndApply('streaming.delay.liveDelay=4');
            expect(player.getSettings().streaming.delay.liveDelay).to.equal(4);
            expect(document.getElementById('opt-live-delay').value).to.equal('4');
        });

        it('should apply and sync streaming.delay.liveDelayFragmentCount from URL', function () {
            setUrlAndApply('streaming.delay.liveDelayFragmentCount=3');
            expect(player.getSettings().streaming.delay.liveDelayFragmentCount).to.equal(3);
            expect(document.getElementById('opt-live-delay-frag-count').value).to.equal('3');
        });

        it('should apply and sync streaming.liveCatchup.maxDrift from URL', function () {
            setUrlAndApply('streaming.liveCatchup.maxDrift=8');
            expect(player.getSettings().streaming.liveCatchup.maxDrift).to.equal(8);
            expect(document.getElementById('opt-catchup-max-drift').value).to.equal('8');
        });

        it('should apply and sync streaming.liveCatchup.liveThreshold from URL', function () {
            setUrlAndApply('streaming.liveCatchup.liveThreshold=5');
            expect(player.getSettings().streaming.liveCatchup.liveThreshold).to.equal(5);
            expect(document.getElementById('opt-catchup-live-threshold').value).to.equal('5');
        });

        it('should apply and sync streaming.liveCatchup.step values from URL', function () {
            setUrlAndApply('streaming.liveCatchup.step.start.min=0.2&streaming.liveCatchup.step.start.max=1.5&streaming.liveCatchup.step.stop.min=0.3&streaming.liveCatchup.step.stop.max=1.2');
            const s = player.getSettings();
            expect(s.streaming.liveCatchup.step.start.min).to.equal(0.2);
            expect(s.streaming.liveCatchup.step.start.max).to.equal(1.5);
            expect(s.streaming.liveCatchup.step.stop.min).to.equal(0.3);
            expect(s.streaming.liveCatchup.step.stop.max).to.equal(1.2);
            expect(document.getElementById('opt-catchup-step-start-min').value).to.equal('0.2');
            expect(document.getElementById('opt-catchup-step-start-max').value).to.equal('1.5');
            expect(document.getElementById('opt-catchup-step-stop-min').value).to.equal('0.3');
            expect(document.getElementById('opt-catchup-step-stop-max').value).to.equal('1.2');
        });

        // ---- String / select / dropdown settings via URL ----

        it('should apply and sync debug.logLevel from URL', function () {
            setUrlAndApply('debug.logLevel=5');
            expect(player.getSettings().debug.logLevel).to.equal(5);
            expect(parseInt(document.getElementById('opt-log-level').value)).to.equal(5);
        });

        it('should apply and sync streaming.liveCatchup.mode from URL', function () {
            setUrlAndApply('streaming.liveCatchup.mode=liveCatchupModeLoLP');
            expect(player.getSettings().streaming.liveCatchup.mode).to.equal('liveCatchupModeLoLP');
            expect(document.getElementById('opt-catchup-mode').value).to.equal('liveCatchupModeLoLP');
        });

        it('should apply and sync streaming.trackSwitchMode.audio from URL', function () {
            setUrlAndApply('streaming.trackSwitchMode.audio=neverReplace');
            expect(player.getSettings().streaming.trackSwitchMode.audio).to.equal('neverReplace');
            expect(document.querySelector('input[name="track-audio"]:checked').value).to.equal('neverReplace');
        });

        it('should apply and sync streaming.trackSwitchMode.video from URL', function () {
            setUrlAndApply('streaming.trackSwitchMode.video=neverReplace');
            expect(player.getSettings().streaming.trackSwitchMode.video).to.equal('neverReplace');
            expect(document.querySelector('input[name="track-video"]:checked').value).to.equal('neverReplace');
        });

        // ---- CMCD settings via URL ----

        it('should apply and sync CMCD settings from URL', function () {
            setUrlAndApply('streaming.cmcd.enabled=true&streaming.cmcd.mode=header&streaming.cmcd.sid=test-session&streaming.cmcd.cid=test-content&streaming.cmcd.rtp=5000');
            const s = player.getSettings();
            expect(s.streaming.cmcd.enabled).to.be.true;
            expect(s.streaming.cmcd.mode).to.equal('header');
            expect(s.streaming.cmcd.sid).to.equal('test-session');
            expect(s.streaming.cmcd.cid).to.equal('test-content');
            expect(s.streaming.cmcd.rtp).to.equal(5000);

            expect(document.getElementById('opt-cmcd-enabled').checked).to.be.true;
            expect(document.getElementById('opt-cmcd-mode').value).to.equal('header');
            expect(document.getElementById('opt-cmcd-session-id').value).to.equal('test-session');
            expect(document.getElementById('opt-cmcd-content-id').value).to.equal('test-content');
            expect(document.getElementById('opt-cmcd-rtp').value).to.equal('5000');
        });

        it('should apply and sync streaming.cmcd.rtpSafetyFactor from URL', function () {
            setUrlAndApply('streaming.cmcd.rtpSafetyFactor=10');
            expect(player.getSettings().streaming.cmcd.rtpSafetyFactor).to.equal(10);
            expect(parseFloat(document.getElementById('opt-cmcd-rtp-safety').value)).to.equal(10);
        });

        // ---- CMSD settings via URL ----

        it('should apply and sync CMSD settings from URL', function () {
            setUrlAndApply('streaming.cmsd.enabled=true&streaming.cmsd.abr.applyMb=true&streaming.cmsd.abr.etpWeightRatio=0.8');
            const s = player.getSettings();
            expect(s.streaming.cmsd.enabled).to.be.true;
            expect(s.streaming.cmsd.abr.applyMb).to.be.true;
            expect(s.streaming.cmsd.abr.etpWeightRatio).to.equal(0.8);

            expect(document.getElementById('opt-cmsd-enabled').checked).to.be.true;
            expect(document.getElementById('opt-cmsd-apply-mb').checked).to.be.true;
            expect(parseFloat(document.getElementById('opt-cmsd-etp-weight').value)).to.equal(0.8);
        });

        // ---- Combined / round-trip scenario ----

        it('should correctly apply multiple settings from URL and preserve them on subsequent buildConfig', function () {
            setUrlAndApply(
                'streaming.buffer.fastSwitchEnabled=true' +
                '&streaming.gaps.jumpGaps=false' +
                '&streaming.abr.initialBitrate.video=3000' +
                '&streaming.delay.liveDelay=4' +
                '&streaming.liveCatchup.mode=liveCatchupModeLoLP' +
                '&debug.logLevel=5' +
                '&streaming.trackSwitchMode.audio=neverReplace'
            );

            // Verify player state
            const s = player.getSettings();
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s.streaming.gaps.jumpGaps).to.be.false;
            expect(s.streaming.abr.initialBitrate.video).to.equal(3000);
            expect(s.streaming.delay.liveDelay).to.equal(4);
            expect(s.streaming.liveCatchup.mode).to.equal('liveCatchupModeLoLP');
            expect(s.debug.logLevel).to.equal(5);
            expect(s.streaming.trackSwitchMode.audio).to.equal('neverReplace');

            // Verify UI state
            expect(document.getElementById('opt-fast-switch').checked).to.be.true;
            expect(document.getElementById('opt-jump-gaps').checked).to.be.false;
            expect(document.getElementById('opt-init-bitrate-video').value).to.equal('3000');
            expect(document.getElementById('opt-live-delay').value).to.equal('4');
            expect(document.getElementById('opt-catchup-mode').value).to.equal('liveCatchupModeLoLP');
            expect(parseInt(document.getElementById('opt-log-level').value)).to.equal(5);
            expect(document.querySelector('input[name="track-audio"]:checked').value).to.equal('neverReplace');

            // Now simulate a subsequent UI interaction: buildConfig + updateSettings
            // This verifies that _syncFromPlayer() correctly populated the UI so that
            // a later buildConfig() preserves the URL-provided values.
            const config = settingsController.buildConfig();
            player.updateSettings(config);
            const s2 = player.getSettings();

            expect(s2.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s2.streaming.gaps.jumpGaps).to.be.false;
            expect(s2.streaming.abr.initialBitrate.video).to.equal(3000);
            expect(s2.streaming.delay.liveDelay).to.equal(4);
            expect(s2.streaming.liveCatchup.mode).to.equal('liveCatchupModeLoLP');
            expect(s2.debug.logLevel).to.equal(5);
            expect(s2.streaming.trackSwitchMode.audio).to.equal('neverReplace');
        });

        it('should not modify player settings when URL has no recognized parameters', function () {
            const before = JSON.stringify(player.getSettings());
            setUrlAndApply('stream=https%3A%2F%2Fexample.com%2Ftest.mpd');
            const after = JSON.stringify(player.getSettings());
            expect(after).to.equal(before);
        });

        it('should handle empty query string without errors', function () {
            history.replaceState(null, '', window.location.pathname);
            const result = settingsController.applyFromUrl();
            expect(result).to.be.undefined;
        });
    });
});
