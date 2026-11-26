/**
 * Tests for the Reference Player SettingsPanel.
 *
 * Renders the settings drawer into a test container and verifies that the generated controls
 * read from and write to a real dash.js MediaPlayer instance.
 */

import MediaPlayer from '../../../../src/streaming/MediaPlayer.js';
import Settings from '../../../../src/core/Settings.js';
import { SettingsController } from '../../../../samples/dash-if-reference-player/app/js/SettingsController.js';
import { SettingsPanel } from '../../../../samples/dash-if-reference-player/app/js/SettingsPanel.js';
import SETTINGS_OVERRIDES from '../../../../samples/dash-if-reference-player/app/data/settingsOverrides.js';

import { expect } from 'chai';

describe('Reference Player - SettingsPanel', function () {

    const context = {};
    let player, settings, settingsController, settingsPanel, testContainer, originalConfirm, confirmAnswer;

    const LAYOUT_STORAGE_KEY = 'rp-settings-layout';

    const DRAWER_MARKUP = `
        <button id="btn-options"><span id="settings-modified-badge" hidden>0</span></button>
        <div id="settings-classic-slot"></div>
        <div id="settings-backdrop"></div>
        <aside id="settings-drawer" hidden>
            <button id="settings-layout-toggle"></button>
            <span id="settings-modified-chip" hidden></span>
            <ul>
                <li><h6 id="settings-presets-header">Presets</h6></li>
                <li><button id="btn-copy-url"></button></li>
                <li><button id="settings-copy-code"></button></li>
                <li><button id="settings-export"></button></li>
                <li><button id="settings-import"></button></li>
                <li><button id="settings-reset-all"></button></li>
            </ul>
            <button id="settings-close"></button>
            <input type="file" id="settings-import-file">
            <input type="search" id="settings-search">
            <select id="settings-filter">
                <option value="common">Common</option>
                <option value="all">All</option>
                <option value="modified">Modified</option>
            </select>
            <div id="settings-status" hidden></div>
            <div id="settings-list">
                <section data-page-section="playback">
                    <button class="settings-category-header" data-action="toggle-category"
                            data-category="page-playback" aria-expanded="false">
                        <i class="bi"></i>
                        <span class="settings-category-label">Playback</span>
                        <span class="settings-category-count"></span>
                    </button>
                    <div class="settings-page-rows" hidden>
                        <div data-page-row><label for="opt-autoplay">Auto play</label><input id="opt-autoplay"></div>
                        <div data-page-row><label for="opt-muted">Muted</label><input id="opt-muted"></div>
                    </div>
                </section>
                <section data-page-section="drm">
                    <button class="settings-category-header" data-action="toggle-category"
                            data-category="page-drm" aria-expanded="false">
                        <i class="bi"></i>
                        <span class="settings-category-label">DRM</span>
                        <span class="settings-category-count"></span>
                    </button>
                    <div class="settings-page-rows" hidden>
                        <div data-page-row><label for="drm-wv-url">Widevine license URL</label>
                            <input id="drm-wv-url"></div>
                    </div>
                </section>
                <div id="settings-generated"></div>
            </div>
        </aside>`;

    function pageSection(key) {
        return testContainer.querySelector(`[data-page-section="${key}"]`);
    }

    function visiblePageRows(key) {
        return [...pageSection(key).querySelectorAll('[data-page-row]')]
            .filter((element) => !element.hidden)
            .map((element) => element.querySelector('label').textContent);
    }

    function row(path) {
        return testContainer.querySelector(`.setting-row[data-path="${path}"]`);
    }

    function input(path) {
        return testContainer.querySelector(`.setting-input[data-path="${path}"]`);
    }

    function categoryHeader(id) {
        return testContainer.querySelector(`.settings-category-header[data-category="${id}"]`);
    }

    function selectFilter(name) {
        const select = document.getElementById('settings-filter');
        select.value = name;
        select.dispatchEvent(new Event('change'));
    }

    function filterCount(name) {
        const option = testContainer.querySelector(`#settings-filter option[value="${name}"]`);
        return option.textContent.match(/\((\d+)\)/)[1];
    }

    function search(text) {
        const field = document.getElementById('settings-search');
        field.value = text;
        field.dispatchEvent(new Event('input'));
    }

    function change(path, value) {
        const field = input(path);
        if (field.type === 'checkbox') {
            field.checked = value;
        } else {
            field.value = value;
        }
        field.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function listedPaths() {
        return [...testContainer.querySelectorAll('.setting-row[data-path]')].map((element) => element.dataset.path);
    }

    beforeEach(function () {
        settings = Settings(context).getInstance();
        settings.reset();
        player = MediaPlayer().create();
        player.setConfig({ settings });

        localStorage.removeItem(LAYOUT_STORAGE_KEY);
        testContainer = document.createElement('div');
        testContainer.innerHTML = DRAWER_MARKUP;
        document.body.appendChild(testContainer);

        confirmAnswer = true;
        originalConfirm = window.confirm;
        window.confirm = () => confirmAnswer;

        settingsController = new SettingsController({ player, setInitialMediaSettings: function () {} });
        settingsController.init();
        settingsPanel = new SettingsPanel(settingsController);
        settingsPanel.init();
    });

    afterEach(function () {
        window.confirm = originalConfirm;
        document.body.classList.remove('settings-open', 'settings-classic');
        localStorage.removeItem(LAYOUT_STORAGE_KEY);
        document.querySelector('.copy-notification')?.remove();
        testContainer.remove();
        settings.reset();
    });

    describe('drawer', function () {

        it('should open and close from the Options button', function () {
            const drawer = document.getElementById('settings-drawer');
            const button = document.getElementById('btn-options');

            button.click();
            expect(drawer.hidden).to.be.false;
            expect(button.getAttribute('aria-expanded')).to.equal('true');
            expect(document.body.classList.contains('settings-open')).to.be.true;

            button.click();
            expect(drawer.hidden).to.be.true;
            expect(button.getAttribute('aria-expanded')).to.equal('false');
            expect(document.body.classList.contains('settings-open')).to.be.false;
        });

        describe('Escape where the drawer covers the page', function () {

            let originalMatchMedia;

            function pressEscape(target) {
                target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
            }

            beforeEach(function () {
                originalMatchMedia = window.matchMedia;
                window.matchMedia = () => ({ matches: true });
                settingsPanel.open();
            });

            afterEach(function () {
                window.matchMedia = originalMatchMedia;
            });

            it('should close the drawer', function () {
                pressEscape(document.getElementById('settings-close'));
                expect(document.getElementById('settings-drawer').hidden).to.be.true;
            });

            it('should leave the drawer open while a menu inside it is open', function () {
                const menu = document.createElement('ul');
                menu.className = 'dropdown-menu show';
                const item = menu.appendChild(document.createElement('button'));
                document.getElementById('settings-drawer').append(menu);

                pressEscape(item);
                expect(document.getElementById('settings-drawer').hidden).to.be.false;
            });

            it('should clear the search first and close the drawer on the next press', function () {
                const field = document.getElementById('settings-search');
                search('jumpGaps');

                pressEscape(field);
                expect(document.getElementById('settings-drawer').hidden).to.be.false;
                expect(field.value).to.equal('');
                expect(document.getElementById('settings-status').hidden).to.be.true;

                pressEscape(field);
                expect(document.getElementById('settings-drawer').hidden).to.be.true;
            });
        });
    });

    describe('layout', function () {

        function createPanel() {
            const panel = new SettingsPanel(settingsController);
            panel.init();
            return panel;
        }

        it('should start as a drawer with collapsed categories', function () {
            const drawer = document.getElementById('settings-drawer');

            expect(settingsPanel.layout).to.equal('drawer');
            expect(drawer.classList.contains('is-classic')).to.be.false;
            expect(drawer.parentNode.id).to.not.equal('settings-classic-slot');
        });

        it('should move the panel under the URL bar and open every section in the classic layout', function () {
            const drawer = document.getElementById('settings-drawer');
            const common = SETTINGS_OVERRIDES.common;

            document.getElementById('settings-layout-toggle').click();

            expect(settingsPanel.layout).to.equal('classic');
            expect(drawer.parentNode.id).to.equal('settings-classic-slot');
            expect(drawer.classList.contains('is-classic')).to.be.true;
            expect(document.body.classList.contains('settings-classic')).to.be.true;
            expect(listedPaths()).to.have.members(common);
            expect(pageSection('drm').querySelector('.settings-page-rows').hidden).to.be.false;
        });

        it('should return to the drawer and collapse the categories again', function () {
            const toggle = document.getElementById('settings-layout-toggle');
            const drawer = document.getElementById('settings-drawer');

            toggle.click();
            toggle.click();

            expect(settingsPanel.layout).to.equal('drawer');
            expect(drawer.parentNode).to.equal(testContainer);
            expect(document.body.classList.contains('settings-classic')).to.be.false;
            expect(listedPaths()).to.deep.equal([]);
        });

        it('should keep the value of a page option when the layout changes', function () {
            document.getElementById('opt-muted').value = 'kept';
            settingsPanel.setLayout('classic');

            expect(document.getElementById('opt-muted').value).to.equal('kept');
        });

        it('should apply settings in the classic layout', function () {
            settingsPanel.setLayout('classic');
            change('streaming.buffer.fastSwitchEnabled', 'false');

            expect(player.getSettings().streaming.buffer.fastSwitchEnabled).to.be.false;
            expect(row('streaming.buffer.fastSwitchEnabled').classList.contains('is-modified')).to.be.true;
        });

        it('should remember the layout', function () {
            settingsPanel.setLayout('classic');
            expect(localStorage.getItem(LAYOUT_STORAGE_KEY)).to.equal('classic');

            // A second panel on the same markup stands in for a page reload
            expect(createPanel().layout).to.equal('classic');
        });
    });

    describe('categories and filters', function () {

        it('should start in the Common view with every dash.js category collapsed', function () {
            expect(testContainer.querySelectorAll('#settings-generated .settings-category').length).to.be.greaterThan(5);
            expect(listedPaths()).to.deep.equal([]);
            expect(filterCount('common')).to.equal(String(SETTINGS_OVERRIDES.common.length));
            expect(filterCount('all')).to.equal(String(settingsController.schema.length));
            expect(filterCount('modified')).to.equal('0');
        });

        it('should list only the common settings of a category in the Common view', function () {
            categoryHeader('buffer').click();
            expect(listedPaths()).to.have.members([
                'streaming.buffer.fastSwitchEnabled',
                'streaming.buffer.reuseExistingSourceBuffers',
                'streaming.buffer.mediaSourceDurationInfinity',
                'streaming.buffer.resetSourceBuffersForTrackSwitch',
                'streaming.buffer.stallThreshold',
                'streaming.buffer.lowLatencyStallThreshold'
            ]);
            expect(categoryHeader('buffer').getAttribute('aria-expanded')).to.equal('true');
        });

        it('should list every setting of a category in the All view', function () {
            selectFilter('all');
            categoryHeader('buffer').click();
            const expected = settingsController.schema
                .filter((descriptor) => descriptor.categoryId === 'buffer')
                .map((descriptor) => descriptor.path);
            expect(listedPaths()).to.deep.equal(expected);
            expect(testContainer.querySelector('.settings-group').textContent).to.equal('syntheticStallEvents');
        });

        it('should collapse a category again', function () {
            categoryHeader('buffer').click();
            categoryHeader('buffer').click();
            expect(listedPaths()).to.deep.equal([]);
        });

        it('should show the Modified view expanded, with only modified settings', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.abr.rules.bolaRule.active', false);
            selectFilter('modified');

            expect(listedPaths()).to.have.members([
                'streaming.buffer.stallThreshold', 'streaming.abr.rules.bolaRule.active'
            ]);
            expect(filterCount('modified')).to.equal('2');
        });

        it('should keep the focused control when a row changes a setting in the Modified view', function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            selectFilter('modified');
            settingsPanel.open();

            const field = input('streaming.buffer.stallThreshold');
            field.focus();
            expect(document.activeElement).to.equal(field);
            change('streaming.buffer.stallThreshold', '0.7');

            expect(player.getSettings().streaming.buffer.stallThreshold).to.equal(0.7);
            expect(input('streaming.buffer.stallThreshold')).to.equal(field);
            expect(document.activeElement).to.equal(field);
        });

        it('should keep a row set back to its default listed until the next render', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            selectFilter('modified');

            change('streaming.gaps.jumpGaps', true);
            expect(listedPaths()).to.deep.equal(['streaming.gaps.jumpGaps']);
            expect(row('streaming.gaps.jumpGaps').classList.contains('is-modified')).to.be.false;
            expect(filterCount('modified')).to.equal('0');

            selectFilter('modified');
            expect(listedPaths()).to.deep.equal([]);
        });

        it('should list settings changed outside the rows in the Modified view', function () {
            selectFilter('modified');
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            expect(listedPaths()).to.deep.equal(['streaming.buffer.stallThreshold']);
        });

        it('should say so when nothing is modified', function () {
            selectFilter('modified');
            expect(testContainer.querySelector('.settings-empty').textContent).to.contain('No setting differs');
        });
    });

    describe('controls', function () {

        beforeEach(function () {
            selectFilter('all');
            for (const id of ['buffer', 'delay', 'cmcd', 'debug', 'capabilities']) {
                categoryHeader(id).click();
            }
        });

        it('should show the current value of each control type', function () {
            expect(input('streaming.buffer.reuseExistingSourceBuffers').checked).to.be.true;
            expect(input('streaming.buffer.fastSwitchEnabled').value).to.equal('null');
            expect(input('streaming.buffer.bufferTimeDefault').value).to.equal('18');
            expect(input('streaming.delay.liveDelay').value).to.equal('');
            expect(input('streaming.cmcd.includeInRequests').value).to.equal('segment, mpd, license');
            expect(input('streaming.cmcd.eventTargets').value).to.equal('[]');
            expect(input('debug.logLevel').value).to.equal('3');
            expect(input('streaming.capabilities.supportedEssentialProperties')).to.be.null;
        });

        it('should apply a switch to the player', function () {
            change('streaming.buffer.reuseExistingSourceBuffers', false);
            expect(player.getSettings().streaming.buffer.reuseExistingSourceBuffers).to.be.false;
        });

        it('should apply number, select, list and JSON controls to the player', function () {
            change('streaming.buffer.bufferTimeDefault', '25');
            change('streaming.buffer.fastSwitchEnabled', 'true');
            change('debug.logLevel', '5');
            change('streaming.cmcd.includeInRequests', 'segment, mpd');
            change('streaming.cmcd.eventTargets', '[{"url": "https://example.com/cmcd"}]');

            const s = player.getSettings();
            expect(s.streaming.buffer.bufferTimeDefault).to.equal(25);
            expect(s.streaming.buffer.fastSwitchEnabled).to.be.true;
            expect(s.debug.logLevel).to.equal(5);
            expect(s.streaming.cmcd.includeInRequests).to.deep.equal(['segment', 'mpd']);
            expect(s.streaming.cmcd.eventTargets).to.deep.equal([{ url: 'https://example.com/cmcd' }]);
        });

        it('should treat an emptied number field as the default when the default is NaN', function () {
            change('streaming.delay.liveDelay', '4');
            expect(player.getSettings().streaming.delay.liveDelay).to.equal(4);
            change('streaming.delay.liveDelay', '');
            expect(player.getSettings().streaming.delay.liveDelay).to.be.NaN;
            expect(row('streaming.delay.liveDelay').classList.contains('is-modified')).to.be.false;
        });

        it('should not apply number text the browser cannot parse', function () {
            change('streaming.delay.liveDelay', '5');
            const field = input('streaming.delay.liveDelay');
            // An <input type="number"> reports unparseable text such as "3e" as '' with validity.badInput set
            field.value = '';
            Object.defineProperty(field, 'validity', { value: { badInput: true } });
            field.dispatchEvent(new Event('change', { bubbles: true }));

            expect(player.getSettings().streaming.delay.liveDelay).to.equal(5);
            expect(row('streaming.delay.liveDelay').classList.contains('has-error')).to.be.true;
            expect(row('streaming.delay.liveDelay').querySelector('.setting-error').textContent)
                .to.contain('Enter a number.');
        });

        it('should mark a changed setting as modified and count it', function () {
            change('streaming.buffer.bufferTimeDefault', '25');

            expect(row('streaming.buffer.bufferTimeDefault').classList.contains('is-modified')).to.be.true;
            expect(row('streaming.buffer.bufferToKeep').classList.contains('is-modified')).to.be.false;
            expect(filterCount('modified')).to.equal('1');
            expect(categoryHeader('buffer').querySelector('.settings-category-badge').textContent)
                .to.equal('1 modified');

            const badge = document.getElementById('settings-modified-badge');
            expect(badge.hidden).to.be.false;
            expect(badge.textContent).to.equal('1');
            expect(document.getElementById('settings-modified-chip').textContent).to.equal('1 modified');
        });

        it('should reset a setting from its row', function () {
            change('streaming.buffer.bufferTimeDefault', '25');
            row('streaming.buffer.bufferTimeDefault').querySelector('.setting-reset').click();

            expect(player.getSettings().streaming.buffer.bufferTimeDefault).to.equal(18);
            expect(input('streaming.buffer.bufferTimeDefault').value).to.equal('18');
            expect(row('streaming.buffer.bufferTimeDefault').classList.contains('is-modified')).to.be.false;
            expect(document.getElementById('settings-modified-badge').hidden).to.be.true;
        });

        it('should not apply invalid JSON and should say why', function () {
            change('streaming.cmcd.eventTargets', '[{"url": "x",}]');

            const targetRow = row('streaming.cmcd.eventTargets');
            expect(player.getSettings().streaming.cmcd.eventTargets).to.deep.equal([]);
            expect(targetRow.classList.contains('has-error')).to.be.true;
            expect(targetRow.querySelector('.setting-error').textContent).to.contain('Invalid JSON');
            expect(input('streaming.cmcd.eventTargets').getAttribute('aria-invalid')).to.equal('true');

            change('streaming.cmcd.eventTargets', '[]');
            expect(targetRow.classList.contains('has-error')).to.be.false;
            expect(targetRow.querySelector('.setting-error').textContent).to.equal('');
        });

        it('should not apply an emptied number that has a real default', function () {
            change('streaming.buffer.bufferTimeDefault', '');
            expect(player.getSettings().streaming.buffer.bufferTimeDefault).to.equal(18);
            expect(row('streaming.buffer.bufferTimeDefault').classList.contains('has-error')).to.be.true;
        });

        it('should follow settings that change on the player, without the controller', function () {
            player.updateSettings({ streaming: { buffer: { bufferTimeDefault: 30 } } });
            settingsController.syncWithPlayer();

            expect(input('streaming.buffer.bufferTimeDefault').value).to.equal('30');
            expect(row('streaming.buffer.bufferTimeDefault').classList.contains('is-modified')).to.be.true;
            expect(document.getElementById('settings-modified-badge').textContent).to.equal('1');
        });

        it('should follow settings that change outside the panel', function () {
            settingsController.setValue('streaming.buffer.bufferTimeDefault', 30);
            expect(input('streaming.buffer.bufferTimeDefault').value).to.equal('30');
            expect(row('streaming.buffer.bufferTimeDefault').classList.contains('is-modified')).to.be.true;
        });

        it('should keep each setting to one line until its name is clicked', function () {
            const targetRow = row('streaming.buffer.stallThreshold');
            const name = targetRow.querySelector('.setting-name');
            const details = targetRow.querySelector('.setting-details');

            expect(details.hidden).to.be.true;
            name.click();
            expect(details.hidden).to.be.false;
            expect(name.getAttribute('aria-expanded')).to.equal('true');
            expect(details.textContent).to.contain('Stall threshold used in BufferController');
            expect(details.textContent).to.contain('Default 0.3');
            expect(details.textContent).to.contain('streaming.buffer.stallThreshold');

            name.click();
            expect(details.hidden).to.be.true;
        });

        it('should keep the details of a setting open when the list is rendered again', function () {
            row('streaming.buffer.stallThreshold').querySelector('.setting-name').click();
            categoryHeader('gaps').click();
            expect(row('streaming.buffer.stallThreshold').querySelector('.setting-details').hidden).to.be.false;
        });
    });

    describe('search', function () {

        it('should search all settings, whichever filter is selected', function () {
            search('stall');

            expect(listedPaths()).to.include.members([
                'streaming.buffer.stallThreshold',
                'streaming.buffer.setStallState',
                'streaming.buffer.syntheticStallEvents.enabled',
                'streaming.gaps.enableStallFix',
                'streaming.gaps.stallSeek'
            ]);
            expect(document.getElementById('settings-status').textContent).to.match(/^\d+ results$/);
            expect(document.getElementById('settings-filter').disabled).to.be.true;
        });

        it('should highlight the match in the setting name', function () {
            search('stall');
            const mark = row('streaming.gaps.enableStallFix').querySelector('.setting-name mark');
            expect(mark.textContent).to.equal('Stall');
        });

        it('should find a setting by its full path', function () {
            search('streaming.delay.liveDelayFragmentCount');
            expect(listedPaths()).to.deep.equal(['streaming.delay.liveDelayFragmentCount']);
        });

        it('should say so when nothing matches, and return to the filter when cleared', function () {
            search('no-such-setting');
            expect(testContainer.querySelector('.settings-empty').textContent).to.contain('Nothing matches');

            search('');
            expect(testContainer.querySelector('.settings-empty')).to.be.null;
            expect(document.getElementById('settings-status').hidden).to.be.true;
            expect(document.getElementById('settings-filter').disabled).to.be.false;
        });
    });

    describe('page option sections', function () {

        it('should show the Playback section open and the others collapsed', function () {
            expect(pageSection('playback').querySelector('.settings-page-rows').hidden).to.be.false;
            expect(pageSection('drm').querySelector('.settings-page-rows').hidden).to.be.true;
            expect(pageSection('playback').querySelector('.settings-category-count').textContent).to.equal('2');
        });

        it('should expand and collapse a page section without rendering the dash.js settings again', function () {
            categoryHeader('buffer').click();
            const bufferRow = row('streaming.buffer.stallThreshold');

            pageSection('drm').querySelector('.settings-category-header').click();
            expect(pageSection('drm').querySelector('.settings-page-rows').hidden).to.be.false;
            expect(row('streaming.buffer.stallThreshold')).to.equal(bufferRow);

            pageSection('drm').querySelector('.settings-category-header').click();
            expect(pageSection('drm').querySelector('.settings-page-rows').hidden).to.be.true;
        });

        it('should include page options in a search', function () {
            search('muted');
            expect(pageSection('playback').hidden).to.be.false;
            expect(visiblePageRows('playback')).to.deep.equal(['Muted']);
            expect(pageSection('drm').hidden).to.be.true;
            expect(document.getElementById('settings-status').textContent).to.equal('1 result');
        });

        it('should find every option of a section by the section name', function () {
            search('drm');
            expect(pageSection('drm').hidden).to.be.false;
            expect(pageSection('drm').querySelector('.settings-page-rows').hidden).to.be.false;
            expect(visiblePageRows('drm')).to.deep.equal(['Widevine license URL']);
        });

        it('should keep the page option inputs in the document while they are filtered out', function () {
            search('no-such-setting');
            expect(document.getElementById('opt-muted')).to.not.be.null;
            expect(document.getElementById('drm-wv-url')).to.not.be.null;
        });

        it('should leave page options out of the Modified view', function () {
            selectFilter('modified');
            expect(pageSection('playback').hidden).to.be.true;
            expect(pageSection('drm').hidden).to.be.true;

            selectFilter('common');
            expect(pageSection('playback').hidden).to.be.false;
        });
    });

    describe('export', function () {

        let downloads, originalClick;

        beforeEach(function () {
            downloads = [];
            originalClick = HTMLAnchorElement.prototype.click;
            HTMLAnchorElement.prototype.click = function () {
                downloads.push({ name: this.download, href: this.href });
            };
        });

        afterEach(function () {
            HTMLAnchorElement.prototype.click = originalClick;
        });

        it('should not download a file while nothing is modified, and say why', function () {
            document.getElementById('settings-export').click();

            expect(downloads).to.deep.equal([]);
            expect(document.querySelector('.copy-notification').textContent).to.contain('Nothing to export');
        });

        it('should download the modified settings as a JSON file', async function () {
            settingsController.setValue('streaming.buffer.stallThreshold', 0.5);
            document.getElementById('settings-export').click();

            expect(downloads.length).to.equal(1);
            expect(downloads[0].name).to.equal('dashjs-settings.json');
            // The URL has to outlive the click, or the browser saves an empty file
            const text = await (await fetch(downloads[0].href)).text();
            expect(JSON.parse(text)).to.deep.equal({ streaming: { buffer: { stallThreshold: 0.5 } } });
        });
    });

    describe('presets and reset all', function () {

        function leaveInvalid(path) {
            selectFilter('all');
            categoryHeader('buffer').click();
            change(path, '25');
            change(path, '');
            expect(row(path).classList.contains('has-error')).to.be.true;
        }

        function expectInSync(path, text) {
            expect(input(path).value).to.equal(text);
            expect(row(path).classList.contains('has-error')).to.be.false;
            expect(row(path).querySelector('.setting-error').textContent).to.equal('');
            expect(input(path).hasAttribute('aria-invalid')).to.be.false;
        }

        it('should show the default again in a field that held invalid text when all is reset', function () {
            const path = 'streaming.buffer.bufferTimeDefault';
            leaveInvalid(path);
            document.getElementById('settings-reset-all').click();

            expect(player.getSettings().streaming.buffer.bufferTimeDefault).to.equal(18);
            expectInSync(path, '18');
            expect(row(path).classList.contains('is-modified')).to.be.false;
        });

        it('should clear invalid text when a preset is applied', function () {
            const path = 'streaming.buffer.bufferTimeDefault';
            leaveInvalid(path);
            testContainer.querySelector('[data-preset="low-latency-live"]').click();

            expectInSync(path, '18');
        });

        it('should keep the settings and say so when a file holds nothing that can be applied', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsPanel._import('{"items":[{"name":"A stream"}],"note":"not settings"}');

            const status = document.getElementById('settings-status');
            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
            expect(status.textContent).to.contain('Import failed').and.to.contain('note');
            expect(status.classList.contains('is-error')).to.be.true;
        });

        it('should clear invalid text when a file is imported', function () {
            const path = 'streaming.buffer.bufferTimeDefault';
            leaveInvalid(path);
            settingsPanel._import('{"streaming":{"buffer":{"bufferTimeDefault":30}}}');

            expectInSync(path, '30');
        });

        it('should list the presets and apply one', function () {
            const item = testContainer.querySelector('[data-preset="low-latency-live"]');
            expect(item.textContent).to.contain('Low latency live');

            item.click();
            expect(player.getSettings().streaming.delay.liveDelay).to.equal(3);
            expect(Number(filterCount('modified'))).to.be.greaterThan(0);
        });

        it('should keep the current changes when the confirmation is declined', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            confirmAnswer = false;

            testContainer.querySelector('[data-preset="low-latency-live"]').click();
            document.getElementById('settings-reset-all').click();

            expect(player.getSettings().streaming.gaps.jumpGaps).to.be.false;
            expect(player.getSettings().streaming.delay.liveDelay).to.be.NaN;
        });

        it('should reset all settings', function () {
            settingsController.setValue('streaming.gaps.jumpGaps', false);
            settingsController.setValue('streaming.delay.liveDelay', 4);
            document.getElementById('settings-reset-all').click();

            expect(settingsController.getModifiedPaths()).to.deep.equal([]);
            expect(filterCount('modified')).to.equal('0');
            expect(document.getElementById('settings-reset-all').disabled).to.be.true;
        });
    });
});
