/**
 * Tests for the Reference Player SettingsController.
 *
 * Verifies that settings are applied to a real dash.js MediaPlayer instance, that modified
 * settings are tracked against the defaults, and that presets, JSON import/export, the code
 * snippet and the settings URL work.
 */

import MediaPlayer from '../../../../src/streaming/MediaPlayer.js';
import Settings from '../../../../src/core/Settings.js';
import { SettingsController } from '../../../../samples/dash-if-reference-player/app/js/SettingsController.js';
import { cloneValue } from '../../../../samples/dash-if-reference-player/app/js/SettingsSchema.js';
import SETTINGS_PRESETS from '../../../../samples/dash-if-reference-player/app/data/settingsPresets.js';

import { expect } from 'chai';

describe('Reference Player - SettingsController', function () {

    const context = {};
    let player, settings, settingsController, testContainer, playerController;

    // ---------------------------------------------------------------
    // DOM helpers: the page-level load options the controller reads
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

    function createLoadOptions() {
        createCheckbox('opt-autoload', false);
        createCheckbox('opt-autoplay', true);
        createCheckbox('opt-loop', true);
        createCheckbox('opt-muted', false);
        createCheckbox('opt-force-text-streaming', false);

        createInput('stream-url', '');
        createInput('opt-init-role-video', '');
        createInput('opt-init-lang-audio', '');
        createInput('opt-init-role-audio', '');
        createInput('opt-audio-accessibility-scheme', '');
        createInput('opt-audio-accessibility-value', '');
        createInput('opt-init-lang-text', '');
        createInput('opt-init-role-text', '');
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

        testContainer = document.createElement('div');
        document.body.appendChild(testContainer);
        createLoadOptions();

        playerController = {
            player: player,
            initialMediaSettings: {},
            setInitialMediaSettings: function (type, value) {
                this.initialMediaSettings[type] = value;
            },
            enableForcedTextStreaming: function () {}
        };
        settingsController = new SettingsController(playerController);
        settingsController.init();
    });

    afterEach(function () {
        testContainer.remove();
        settings.reset();
        player = null;
        settingsController = null;
    });

    // ---------------------------------------------------------------
    // Schema
    // ---------------------------------------------------------------

    describe('schema', function () {

        it('should expose every dash.js setting', function () {
            expect(settingsController.schema.length).to.be.greaterThan(150);
            expect(settingsController.getDescriptor('streaming.buffer.bufferTimeDefault')).to.include({
                key: 'bufferTimeDefault', type: 'number', defaultValue: 18
            });
            expect(settingsController.getDescriptor('streaming.doesNotExist')).to.be.null;
        });

        it('should attach the generated description to a setting', function () {
            const description = settingsController.getDescriptor('streaming.gaps.jumpGaps').description;
            expect(description).to.contain('jump small gaps');
        });

        it('should group the settings into categories', function () {
            const labels = settingsController.categories.map((category) => category.label);
            expect(labels[0]).to.equal('General');
            expect(labels).to.include.members(['ABR', 'Buffer', 'CMCD', 'Debug']);
        });
    });

    // ---------------------------------------------------------------
    // Changing settings
    // ---------------------------------------------------------------

    describe('setValue()', function () {

        it('should apply a boolean setting to the player', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
        });

        it('should apply a deeply nested setting without touching its siblings', function () {
            settingsController.setValue('streaming.abr.rules.bolaRule.active', false);
            const rules = player.getSettings().streaming.abr.rules;
            expect(rules.bolaRule.active).to.be.false;
            expect(rules.throughputRule.active).to.be.true;
        });

        it('should apply numbers, strings, lists and null', function () {
            settingsController.setValue('streaming.delay.liveDelay', 4);
            settingsController.setValue('streaming.cmcd.sid', 'session-1');
            settingsController.setValue('streaming.cmcd.includeInRequests', ['segment']);
            settingsController.setValue('streaming.buffer.fastSwitchEnabled', true);
            settingsController.setValue('streaming.buffer.fastSwitchEnabled', null);

            const s = player.getSettings().streaming;
            expect(s.delay.liveDelay).to.equal(4);
            expect(s.cmcd.sid).to.equal('session-1');
            expect(s.cmcd.includeInRequests).to.deep.equal(['segment']);
            expect(s.buffer.fastSwitchEnabled).to.be.null;
        });

        it('should apply a JSON array setting', function () {
            const targets = [{ url: 'https://example.com/cmcd' }];
            settingsController.setValue('streaming.cmcd.eventTargets', targets);
            expect(player.getSettings().streaming.cmcd.eventTargets).to.deep.equal(targets);
        });

        it('should reject unknown and read-only settings', function () {
            const before = cloneValue(player.getSettings());
            expect(settingsController.setValue('streaming.doesNotExist', 1)).to.be.false;
            expect(settingsController.setValue('streaming.capabilities.supportedEssentialProperties', [])).to.be.false;
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
            expect(player.getSettings().streaming.capabilities.supportedEssentialProperties.length)
                .to.equal(before.streaming.capabilities.supportedEssentialProperties.length);
        });

        it('should notify listeners after a change', function () {
            let calls = 0;
            settingsController.onChange(() => calls++);
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            expect(calls).to.equal(1);
        });
    });

    // ---------------------------------------------------------------
    // Modified state and reset
    // ---------------------------------------------------------------

    describe('syncWithPlayer()', function () {

        it('should notify listeners about a setting changed on the player directly', function () {
            let calls = 0;
            settingsController.onChange(() => calls++);
            player.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });

            expect(settingsController.syncWithPlayer()).to.be.true;
            expect(calls).to.equal(1);
            expect(settingsController.syncWithPlayer()).to.be.false;
            expect(calls).to.equal(1);
        });

        it('should not notify again about a change made through the controller', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            let calls = 0;
            settingsController.onChange(() => calls++);

            expect(settingsController.syncWithPlayer()).to.be.false;
            expect(calls).to.equal(0);
        });
    });

    describe('modified settings', function () {

        it('should report nothing as modified initially', function () {
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
            expect(settingsController.getModifiedSettings()).to.deep.equal({});
        });

        it('should track which settings differ from the defaults', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.delay.liveDelay', 4);

            expect(settingsController.isModified('streaming.buffer.stallThreshold')).to.be.true;
            expect(settingsController.isModified('streaming.buffer.bufferToKeep')).to.be.false;
            expect(settingsController.getModifiedPaths())
                .to.have.members(['streaming.buffer.stallThreshold', 'streaming.delay.liveDelay']);
            expect(settingsController.getModifiedSettings()).to.deep.equal({
                streaming: { delay: { liveDelay: 4 }, buffer: { stallThreshold: 0.5 } }
            });
        });

        it('should not report a setting as modified when it is set back to its default', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.buffer.stallThreshold', 0.3);
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
        });

        it('should treat the settings at init() as the defaults', function () {
            player.updateSettings({ debug: { logLevel: 5 } });
            const controller = new SettingsController(playerController);
            controller.init();

            expect(controller.getModifiedPaths()).to.deep.equal([]);
            expect(controller.getDescriptor('debug.logLevel').defaultValue).to.equal(5);
        });

        it('should reset a single setting, including one whose default is NaN', function () {
            settingsController.setValue('streaming.delay.liveDelay', 4);
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.resetSetting('streaming.delay.liveDelay');

            expect(player.getSettings().streaming.delay.liveDelay).to.be.NaN;
            expect(settingsController.getModifiedPaths()).to.deep.equal(['streaming.buffer.stallThreshold']);
        });

        it('should reset all settings', function () {
            settingsController.setValue('streaming.delay.liveDelay', 4);
            settingsController.setValue('streaming.abr.rules.bolaRule.active', false);
            settingsController.setValue('streaming.cmcd.includeInRequests', ['segment']);
            settingsController.resetAll();

            const s = player.getSettings().streaming;
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
            expect(s.delay.liveDelay).to.be.NaN;
            expect(s.abr.rules.bolaRule.active).to.be.true;
            expect(s.cmcd.includeInRequests).to.deep.equal(['segment', 'mpd', 'license']);
        });
    });

    // ---------------------------------------------------------------
    // Presets, import and export
    // ---------------------------------------------------------------

    describe('applySettings() and presets', function () {

        it('should reset everything before applying a settings object', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            const result = settingsController.applySettings({ streaming: { delay: { liveDelay: 3 } } });

            expect(result).to.deep.equal({ applied: 1, unknown: [], invalid: [] });
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.true;
            expect(settingsController.getModifiedPaths()).to.deep.equal(['streaming.delay.liveDelay']);
        });

        it('should report settings it does not know instead of applying them', function () {
            const result = settingsController.applySettings({
                streaming: { delay: { liveDelay: 3 }, notASetting: true },
                unknownRoot: { value: 1 }
            });

            expect(result.applied).to.equal(1);
            expect(result.unknown).to.have.members(['streaming.notASetting', 'unknownRoot.value']);
        });

        it('should report values of the wrong type instead of applying them', function () {
            const result = settingsController.applySettings({
                streaming: {
                    delay: { liveDelay: '3' },
                    buffer: { stallThreshold: 'abc', fastSwitchEnabled: 1 },
                    gaps: { jumpGaps: 'false' },
                    cmcd: { sid: 12345, mode: 'nope', includeInRequests: [1], eventTargets: 'x' },
                    abr: { maxBitrate: { video: 5000 } }
                }
            });

            expect(result.applied).to.equal(1);
            expect(result.unknown).to.deep.equal([]);
            expect(result.invalid).to.have.members([
                'streaming.delay.liveDelay', 'streaming.buffer.stallThreshold', 'streaming.buffer.fastSwitchEnabled',
                'streaming.gaps.jumpGaps', 'streaming.cmcd.sid', 'streaming.cmcd.mode',
                'streaming.cmcd.includeInRequests', 'streaming.cmcd.eventTargets'
            ]);
            expect(settingsController.getModifiedPaths()).to.deep.equal(['streaming.abr.maxBitrate.video']);
        });

        it('should read null as the default for settings whose default is null or NaN', function () {
            const result = settingsController.applySettings({
                streaming: { delay: { liveDelay: null }, cmcd: { sid: null, rtp: null } }
            });

            expect(result).to.deep.equal({ applied: 3, unknown: [], invalid: [] });
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
        });

        it('should apply every preset without rejecting a value', function () {
            for (const preset of SETTINGS_PRESETS) {
                const result = settingsController.applyPreset(preset.id);
                expect(result.unknown, preset.id).to.deep.equal([]);
                expect(result.invalid, preset.id).to.deep.equal([]);
            }
        });

        it('should apply the low latency preset', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsController.applyPreset('low-latency-live');

            const s = player.getSettings().streaming;
            expect(s.delay.liveDelay).to.equal(3);
            expect(s.liveCatchup.enabled).to.be.true;
            expect(s.liveCatchup.playbackRate).to.deep.equal({ min: -0.1, max: 0.1 });
            expect(s.gaps.jumpGaps).to.be.true;
        });

        it('should keep the settings when nothing in the object can be applied', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            let calls = 0;
            settingsController.onChange(() => calls++);
            const result = settingsController.applySettings({
                items: { name: 'not a settings file' },
                streaming: { delay: { liveDelay: 'soon' } }
            });

            expect(result).to.deep.equal({ applied: 0, unknown: ['items.name'], invalid: ['streaming.delay.liveDelay'] });
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
            expect(calls).to.equal(0);
        });

        it('should still reset everything for an empty settings object', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsController.applySettings({});
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
        });

        it('should return null for an unknown preset', function () {
            expect(settingsController.applyPreset('nope')).to.be.null;
        });
    });

    describe('JSON export and import', function () {

        it('should export the modified settings', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            expect(JSON.parse(settingsController.buildExportJson())).to.deep.equal({
                streaming: { buffer: { stallThreshold: 0.5 } }
            });
        });

        it('should restore an export after the settings were changed', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.cmcd.includeInRequests', ['segment']);
            const exported = settingsController.buildExportJson();

            settingsController.resetAll();
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            const result = settingsController.importJson(exported);

            expect(result).to.deep.equal({ ok: true, applied: 2, unknown: [], invalid: [] });
            expect(settingsController.getModifiedPaths())
                .to.have.members(['streaming.buffer.stallThreshold', 'streaming.cmcd.includeInRequests']);
        });

        it('should reject invalid JSON without changing settings', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);

            expect(settingsController.importJson('{ not json').ok).to.be.false;
            expect(settingsController.importJson('[1, 2]').ok).to.be.false;
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
        });
    });

    describe('buildCodeSnippet()', function () {

        it('should produce an updateSettings() call with the modified settings', function () {
            settingsController.setValue('streaming.delay.liveDelay', 4);
            expect(settingsController.buildCodeSnippet()).to.equal([
                'player.updateSettings({',
                '    streaming: {',
                '        delay: {',
                '            liveDelay: 4',
                '        }',
                '    }',
                '});'
            ].join('\n'));
        });

        it('should include the page\'s startup configuration when the dash.js defaults are given', function () {
            const libraryDefaults = cloneValue(player.getSettings());
            player.updateSettings({ debug: { logLevel: 5 } });
            const controller = new SettingsController(playerController, { libraryDefaults });
            controller.init();

            expect(controller.getModifiedPaths()).to.deep.equal([]);
            expect(controller.buildCodeSnippet()).to.contain('logLevel: 5');
        });
    });

    // ---------------------------------------------------------------
    // Load options
    // ---------------------------------------------------------------

    describe('copying to the clipboard', function () {

        afterEach(function () {
            delete navigator.clipboard;
            document.querySelector('.copy-notification')?.remove();
        });

        it('should fall back to a text field where navigator.clipboard does not exist', async function () {
            // As on a page served over plain HTTP
            Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
            const originalExecCommand = document.execCommand;
            let copied = null;
            document.execCommand = (command) => {
                copied = `${command}: ${document.activeElement.value}`;
                return true;
            };

            try {
                settingsController.setValue('streaming.gaps.jumpGaps', false);
                settingsController.copyCodeSnippet();
                await new Promise((resolve) => setTimeout(resolve, 0));
            } finally {
                document.execCommand = originalExecCommand;
            }

            expect(copied).to.equal(`copy: ${settingsController.buildCodeSnippet()}`);
            expect(document.querySelector('.copy-notification').textContent).to.contain('Code copied!');
        });
    });

    describe('load options', function () {

        it('should follow the auto play and loop checkboxes', function () {
            const autoplay = document.getElementById('opt-autoplay');
            autoplay.checked = false;
            autoplay.dispatchEvent(new Event('change'));
            const loop = document.getElementById('opt-loop');
            loop.checked = false;
            loop.dispatchEvent(new Event('change'));

            expect(settingsController.autoPlay).to.be.false;
            expect(settingsController.loop).to.be.false;
        });

        it('should pass the initial track fields to the player', function () {
            document.getElementById('opt-init-lang-audio').value = 'de';
            document.getElementById('opt-init-role-text').value = 'subtitle';
            settingsController.applyInitialMediaSettings();

            expect(playerController.initialMediaSettings.audio).to.deep.equal({ lang: 'de' });
            expect(playerController.initialMediaSettings.text).to.deep.equal({ role: 'subtitle' });
            expect(playerController.initialMediaSettings.video).to.be.undefined;
        });
    });

    // ---------------------------------------------------------------
    // Settings URL
    // ---------------------------------------------------------------

    describe('buildSettingsUrl()', function () {

        function paramsOf(url) {
            return new URL(url).searchParams;
        }

        it('should write modified settings as dotted query parameters', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsController.setValue('streaming.cmcd.includeInRequests', ['segment', 'mpd']);
            const params = paramsOf(settingsController.buildSettingsUrl());

            expect(params.get('streaming.buffer.stallThreshold')).to.equal('0.5');
            expect(params.get('streaming.gaps.jumpGaps')).to.equal('false');
            expect(params.get('streaming.cmcd.includeInRequests')).to.equal('segment,mpd');
        });

        it('should leave unmodified settings out', function () {
            const params = paramsOf(settingsController.buildSettingsUrl());
            expect([...params.keys()].filter((key) => key.includes('.'))).to.deep.equal([]);
        });

        it('should include the load options, the stream and the DRM data', function () {
            document.getElementById('stream-url').value = 'https://example.com/test.mpd';
            document.getElementById('opt-muted').checked = true;
            document.getElementById('opt-init-lang-audio').value = 'en';
            const protData = { 'com.widevine.alpha': { serverURL: 'https://license.example.com' } };
            const params = paramsOf(settingsController.buildSettingsUrl(protData));

            expect(params.get('stream')).to.equal('https://example.com/test.mpd');
            expect(params.get('autoplay')).to.equal('true');
            expect(params.get('loop')).to.equal('true');
            expect(params.get('muted')).to.equal('true');
            expect(params.has('autoLoad')).to.be.false;
            expect(params.get('initLangAudio')).to.equal('en');
            expect(JSON.parse(atob(params.get('protData')))).to.deep.equal(protData);
        });

        it('should write auto play and loop when they are switched off', function () {
            document.getElementById('opt-autoplay').checked = false;
            document.getElementById('opt-loop').checked = false;
            const params = paramsOf(settingsController.buildSettingsUrl());

            expect(params.get('autoplay')).to.equal('false');
            expect(params.get('loop')).to.equal('false');
        });
    });

    describe('applyFromUrl() - URL parameters', function () {

        // These tests use history.replaceState to set URL query parameters,
        // then call applyFromUrl() and verify the dash.js player settings and the load options.

        let originalSearch;

        beforeEach(function () {
            originalSearch = window.location.search;
        });

        afterEach(function () {
            // Restore original URL
            history.replaceState(null, '', window.location.pathname + originalSearch);
        });

        function setUrlAndApply(queryString) {
            history.replaceState(null, '', window.location.pathname + '?' + queryString);
            return settingsController.applyFromUrl();
        }

        // ---- Unknown and unsafe parameters ----

        it('should ignore parameters that do not name a setting', function () {
            const before = JSON.stringify(player.getSettings());
            setUrlAndApply('streaming.notASetting=1&__proto__.polluted=1&constructor.prototype.polluted=1');

            expect(JSON.stringify(player.getSettings())).to.equal(before);
            expect({}.polluted).to.be.undefined;
        });

        // ---- Stream URL ----

        it('should set stream-url input from URL parameter', function () {
            setUrlAndApply('stream=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(document.getElementById('stream-url').value).to.equal('https://example.com/test.mpd');
        });

        // ---- Load options (autoplay, loop, muted) ----

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

        it('should switch auto play and loop off from URL', function () {
            setUrlAndApply('autoplay=false&loop=false');
            expect(document.getElementById('opt-autoplay').checked).to.be.false;
            expect(settingsController.autoPlay).to.be.false;
            expect(document.getElementById('opt-loop').checked).to.be.false;
            expect(settingsController.loop).to.be.false;
        });

        it('should keep auto play and loop when the URL does not name them', function () {
            setUrlAndApply('muted=true&loop=maybe');
            expect(document.getElementById('opt-autoplay').checked).to.be.true;
            expect(settingsController.autoPlay).to.be.true;
            expect(document.getElementById('opt-loop').checked).to.be.true;
            expect(settingsController.loop).to.be.true;
        });

        it('should set opt-muted checked from URL', function () {
            document.getElementById('opt-muted').checked = false;
            setUrlAndApply('muted=true');
            expect(document.getElementById('opt-muted').checked).to.be.true;
        });

        it('should set opt-force-text-streaming checked from URL', function () {
            setUrlAndApply('forceTextStreaming=true');
            expect(document.getElementById('opt-force-text-streaming').checked).to.be.true;
        });

        it('should set the initial track fields from URL', function () {
            setUrlAndApply('initLangAudio=de&initRoleText=subtitle');
            expect(document.getElementById('opt-init-lang-audio').value).to.equal('de');
            expect(document.getElementById('opt-init-role-text').value).to.equal('subtitle');
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

        // ---- Legacy parameter backward compatibility ----

        it('should accept legacy mpd parameter as stream URL', function () {
            setUrlAndApply('mpd=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(document.getElementById('stream-url').value).to.equal('https://example.com/test.mpd');
        });

        it('should prefer stream over mpd when both are present', function () {
            setUrlAndApply('stream=https%3A%2F%2Fexample.com%2Fstream.mpd&mpd=https%3A%2F%2Fexample.com%2Flegacy.mpd');
            expect(document.getElementById('stream-url').value).to.equal('https://example.com/stream.mpd');
        });

        it('should return true when autoLoad=true and mpd is set', function () {
            const result = setUrlAndApply('autoLoad=true&mpd=https%3A%2F%2Fexample.com%2Ftest.mpd');
            expect(result).to.be.true;
        });

        it('should accept legacy autoPlay (camelCase) parameter', function () {
            document.getElementById('opt-autoplay').checked = false;
            setUrlAndApply('autoPlay=true');
            expect(document.getElementById('opt-autoplay').checked).to.be.true;
            expect(settingsController.autoPlay).to.be.true;
        });

        it('should set opt-autoload checked from URL', function () {
            document.getElementById('opt-autoload').checked = false;
            setUrlAndApply('autoLoad=true');
            expect(document.getElementById('opt-autoload').checked).to.be.true;
        });

        it('should not pass mpd or autoPlay to player.updateSettings()', function () {
            const settingsBefore = JSON.stringify(player.getSettings());
            setUrlAndApply('mpd=https%3A%2F%2Fexample.com%2Ftest.mpd&autoPlay=true');
            const settingsAfter = JSON.stringify(player.getSettings());
            expect(settingsBefore).to.equal(settingsAfter);
        });

        // ---- Boolean settings via URL ----

        it('should apply streaming.buffer.fastSwitchEnabled=true from URL', function () {
            setUrlAndApply('streaming.buffer.fastSwitchEnabled=true');
            expect(player.getSettings().streaming.buffer.fastSwitchEnabled).to.be.true;
        });

        it('should apply streaming.gaps.jumpGaps=false from URL', function () {
            setUrlAndApply('streaming.gaps.jumpGaps=false');
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
        });

        it('should apply streaming.abr.autoSwitchBitrate.video=false from URL', function () {
            setUrlAndApply('streaming.abr.autoSwitchBitrate.video=false');
            expect(player.getSettings().streaming.abr.autoSwitchBitrate.video).to.be.false;
        });

        it('should apply streaming.liveCatchup.enabled=true from URL', function () {
            setUrlAndApply('streaming.liveCatchup.enabled=true');
            expect(player.getSettings().streaming.liveCatchup.enabled).to.be.true;
        });

        it('should apply ABR rule settings from URL', function () {
            setUrlAndApply('streaming.abr.rules.throughputRule.active=false&streaming.abr.rules.l2ARule.active=true');
            const rules = player.getSettings().streaming.abr.rules;
            expect(rules.throughputRule.active).to.be.false;
            expect(rules.l2ARule.active).to.be.true;
        });

        it('should apply streaming.applyContentSteering=false from URL', function () {
            setUrlAndApply('streaming.applyContentSteering=false');
            expect(player.getSettings().streaming.applyContentSteering).to.be.false;
        });

        it('should apply streaming.text.defaultEnabled=false from URL', function () {
            setUrlAndApply('streaming.text.defaultEnabled=false');
            expect(player.getSettings().streaming.text.defaultEnabled).to.be.false;
        });

        it('should apply streaming.enhancement.enabled=true from URL', function () {
            setUrlAndApply('streaming.enhancement.enabled=true');
            expect(player.getSettings().streaming.enhancement.enabled).to.be.true;
        });

        // ---- Numeric settings via URL ----

        it('should apply the stall thresholds from URL', function () {
            setUrlAndApply('streaming.buffer.stallThreshold=1.5&streaming.buffer.lowLatencyStallThreshold=0.8');
            expect(player.getSettings().streaming.buffer.stallThreshold).to.equal(1.5);
            expect(player.getSettings().streaming.buffer.lowLatencyStallThreshold).to.equal(0.8);
        });

        it('should apply the video bitrate limits from URL', function () {
            setUrlAndApply('streaming.abr.initialBitrate.video=3000&streaming.abr.minBitrate.video=500' +
                '&streaming.abr.maxBitrate.video=8000');
            const abr = player.getSettings().streaming.abr;
            expect(abr.initialBitrate.video).to.equal(3000);
            expect(abr.minBitrate.video).to.equal(500);
            expect(abr.maxBitrate.video).to.equal(8000);
        });

        it('should apply the live delay settings from URL', function () {
            setUrlAndApply('streaming.delay.liveDelay=4&streaming.delay.liveDelayFragmentCount=3');
            expect(player.getSettings().streaming.delay.liveDelay).to.equal(4);
            expect(player.getSettings().streaming.delay.liveDelayFragmentCount).to.equal(3);
        });

        it('should apply the live catchup numbers from URL', function () {
            setUrlAndApply('streaming.liveCatchup.maxDrift=8&streaming.liveCatchup.liveThreshold=5' +
                '&streaming.liveCatchup.step.start.min=0.2&streaming.liveCatchup.step.start.max=1.5' +
                '&streaming.liveCatchup.step.stop.min=0.3&streaming.liveCatchup.step.stop.max=1.2');
            const liveCatchup = player.getSettings().streaming.liveCatchup;
            expect(liveCatchup.maxDrift).to.equal(8);
            expect(liveCatchup.liveThreshold).to.equal(5);
            expect(liveCatchup.step.start).to.deep.equal({ min: 0.2, max: 1.5 });
            expect(liveCatchup.step.stop).to.deep.equal({ min: 0.3, max: 1.2 });
        });

        // ---- String / enum settings via URL ----

        it('should apply debug.logLevel from URL', function () {
            setUrlAndApply('debug.logLevel=5');
            expect(player.getSettings().debug.logLevel).to.equal(5);
        });

        it('should apply streaming.liveCatchup.mode from URL', function () {
            setUrlAndApply('streaming.liveCatchup.mode=liveCatchupModeLoLP');
            expect(player.getSettings().streaming.liveCatchup.mode).to.equal('liveCatchupModeLoLP');
        });

        it('should apply the track switch modes from URL', function () {
            setUrlAndApply('streaming.trackSwitchMode.audio=neverReplace&streaming.trackSwitchMode.video=alwaysReplace');
            expect(player.getSettings().streaming.trackSwitchMode.audio).to.equal('neverReplace');
            expect(player.getSettings().streaming.trackSwitchMode.video).to.equal('alwaysReplace');
        });

        // ---- CMCD / CMSD settings via URL ----

        it('should apply CMCD settings from URL', function () {
            setUrlAndApply('streaming.cmcd.enabled=true&streaming.cmcd.mode=headers&streaming.cmcd.sid=test-session' +
                '&streaming.cmcd.cid=test-content&streaming.cmcd.rtp=5000&streaming.cmcd.rtpSafetyFactor=10');
            const cmcd = player.getSettings().streaming.cmcd;
            expect(cmcd.enabled).to.be.true;
            expect(cmcd.mode).to.equal('headers');
            expect(cmcd.sid).to.equal('test-session');
            expect(cmcd.cid).to.equal('test-content');
            expect(cmcd.rtp).to.equal(5000);
            expect(cmcd.rtpSafetyFactor).to.equal(10);
        });

        it('should keep string settings as strings when they look like numbers or booleans', function () {
            setUrlAndApply('streaming.cmcd.sid=12345&streaming.cmcd.cid=true&streaming.defaultSchemeIdUri.viewpoint=1e3');
            const s = player.getSettings().streaming;
            expect(s.cmcd.sid).to.equal('12345');
            expect(s.cmcd.cid).to.equal('true');
            expect(s.defaultSchemeIdUri.viewpoint).to.equal('1e3');
        });

        it('should skip URL values that do not fit the setting', function () {
            const before = JSON.stringify(player.getSettings());
            setUrlAndApply('streaming.buffer.stallThreshold=abc&streaming.gaps.jumpGaps=yes' +
                '&streaming.buffer.fastSwitchEnabled=maybe&debug.logLevel=9&streaming.cmcd.eventTargets={"url":"x"}');

            expect(JSON.stringify(player.getSettings())).to.equal(before);
        });

        it('should restore a string setting from a URL built by buildSettingsUrl()', function () {
            settingsController.setValue('streaming.cmcd.sid', '12345');
            const query = new URL(settingsController.buildSettingsUrl()).search.slice(1);

            settingsController.resetAll();
            setUrlAndApply(query);

            expect(player.getSettings().streaming.cmcd.sid).to.equal('12345');
        });

        it('should split list settings from URL', function () {
            setUrlAndApply('streaming.cmcd.enabledKeys=br,d,ot&streaming.cmcd.includeInRequests=segment');
            const cmcd = player.getSettings().streaming.cmcd;
            expect(cmcd.enabledKeys).to.deep.equal(['br', 'd', 'ot']);
            expect(cmcd.includeInRequests).to.deep.equal(['segment']);
        });

        it('should apply CMSD settings from URL', function () {
            setUrlAndApply('streaming.cmsd.enabled=true&streaming.cmsd.abr.applyMb=true' +
                '&streaming.cmsd.abr.etpWeightRatio=0.8');
            const cmsd = player.getSettings().streaming.cmsd;
            expect(cmsd.enabled).to.be.true;
            expect(cmsd.abr.applyMb).to.be.true;
            expect(cmsd.abr.etpWeightRatio).to.equal(0.8);
        });

        // ---- Round trip ----

        it('should restore everything from a URL built by buildSettingsUrl()', function () {
            const targets = [{ url: 'https://example.com/cmcd' }];
            settingsController.setValue('streaming.buffer.fastSwitchEnabled', true);
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsController.setValue('streaming.delay.liveDelay', 4);
            settingsController.setValue('streaming.cmcd.includeInRequests', ['segment']);
            settingsController.setValue('streaming.cmcd.eventTargets', targets);
            settingsController.setValue('debug.logLevel', 5);
            const query = new URL(settingsController.buildSettingsUrl()).search.slice(1);

            settingsController.resetAll();
            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
            setUrlAndApply(query);

            const s = player.getSettings();
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s.streaming.gaps.jumpGaps).to.be.false;
            expect(s.streaming.delay.liveDelay).to.equal(4);
            expect(s.streaming.cmcd.includeInRequests).to.deep.equal(['segment']);
            expect(s.streaming.cmcd.eventTargets).to.deep.equal(targets);
            expect(s.debug.logLevel).to.equal(5);
            expect(settingsController.getModifiedPaths()).to.have.lengthOf(6);
        });

        it('should notify listeners when the URL changed settings', function () {
            let calls = 0;
            settingsController.onChange(() => calls++);
            setUrlAndApply('streaming.gaps.jumpGaps=false');
            expect(calls).to.equal(1);
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
