/**
 * SettingsPanel.js - The settings drawer: one place for everything configurable
 *
 * The drawer holds two kinds of sections:
 *   - page options (Playback, Initial tracks, DRM) with hand-written rows in index.html,
 *   - the dash.js settings, rendered here from the schema held by SettingsController. No
 *     dash.js setting has hand-written markup; its control is chosen by the descriptor's type.
 *
 * Every setting is one line: name on the left, control on the right. Clicking the name opens
 * the description, the default and the full path underneath.
 *
 * The panel has two layouts showing the same sections and rows:
 *   - drawer: a side drawer with collapsible sections (the default),
 *   - classic: a strip under the URL bar with one card per section, scrolled horizontally.
 */

import {$, $$} from './UIHelpers.js';
import {formatDefault, formatValue, matchesQuery, parseInput, SETTING_TYPES} from './SettingsSchema.js';

const FILTERS = { COMMON: 'common', ALL: 'all', MODIFIED: 'modified' };
const FILTER_LABELS = { [FILTERS.COMMON]: 'Common', [FILTERS.ALL]: 'All', [FILTERS.MODIFIED]: 'Modified' };
const OVERLAY_QUERY = '(max-width: 1199.98px)';
const EXPORT_FILE_NAME = 'dashjs-settings.json';
const EXPORT_URL_LIFETIME_MS = 10000;
const LAYOUTS = { DRAWER: 'drawer', CLASSIC: 'classic' };
const LAYOUT_STORAGE_KEY = 'rp-settings-layout';
const PAGE_CATEGORY_PREFIX = 'page-';
const INITIALLY_EXPANDED = ['page-playback'];

function el(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function icon(name) {
    const element = el('i', `bi ${name}`);
    element.setAttribute('aria-hidden', 'true');
    return element;
}

export class SettingsPanel {
    constructor(settingsController) {
        this.controller = settingsController;
        this._filter = FILTERS.COMMON;
        this._query = '';
        this._layout = LAYOUTS.DRAWER;
        this._expanded = new Set(INITIALLY_EXPANDED);
        this._openDetails = new Set();
        this._rows = new Map();
        this._categoryBadges = new Map();
        // True while a row applies its own value, see _onSettingsChanged()
        this._changingFromRow = false;
    }

    init() {
        this._drawer = $('#settings-drawer');
        this._list = $('#settings-list');
        this._generated = $('#settings-generated');
        this._status = $('#settings-status');
        this._search = $('#settings-search');
        this._filterSelect = $('#settings-filter');
        this._optionsButton = $('#btn-options');

        this._bindDrawer();
        this._bindLayout();
        this._bindHeader();
        this._bindList();
        this._renderPresets();

        this.controller.onChange(() => this._onSettingsChanged());
        this.render();
    }

    // ---- Drawer ----

    open() {
        this._drawer.hidden = false;
        document.body.classList.add('settings-open');
        this._optionsButton.setAttribute('aria-expanded', 'true');
        this._optionsButton.classList.add('active');
        this._search.focus();
    }

    close() {
        this._drawer.hidden = true;
        document.body.classList.remove('settings-open');
        this._optionsButton.setAttribute('aria-expanded', 'false');
        this._optionsButton.classList.remove('active');
    }

    toggle() {
        if (this._drawer.hidden) {
            this.open();
        } else {
            this.close();
        }
    }

    _bindDrawer() {
        this._optionsButton.addEventListener('click', () => this.toggle());
        $('#settings-close').addEventListener('click', () => this.close());
        $('#settings-backdrop').addEventListener('click', () => this.close());

        // Escape closes the drawer only where it covers the page
        this._drawer.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape' || this._layout !== LAYOUTS.DRAWER || !window.matchMedia(OVERLAY_QUERY).matches) {
                return;
            }
            // Escape first belongs to what is open inside the drawer. An open menu closes itself:
            // Bootstrap handles the key on the document, after this listener.
            if ($('.dropdown-menu.show', this._drawer)) {
                return;
            }
            // Not every browser clears a search field on Escape, so it is done here
            if (e.target === this._search && this._search.value !== '') {
                e.preventDefault();
                this._search.value = '';
                this._query = '';
                this.render();
                return;
            }
            this.close();
            this._optionsButton.focus();
        });
    }

    // ---- Layout: side drawer or classic strip ----

    get layout() {
        return this._layout;
    }

    /**
     * Switch between the side drawer and the classic strip under the URL bar
     * @param {string} layout - 'drawer' or 'classic'
     */
    setLayout(layout) {
        this._layout = layout === LAYOUTS.CLASSIC ? LAYOUTS.CLASSIC : LAYOUTS.DRAWER;
        try {
            localStorage.setItem(LAYOUT_STORAGE_KEY, this._layout);
        } catch (e) {
            // The layout is a convenience: without storage it lasts until the page is reloaded
        }
        this._applyLayout();
        this.render();
    }

    _bindLayout() {
        this._classicSlot = $('#settings-classic-slot');
        this._drawerHome = this._drawer.parentNode;
        this._layoutToggle = $('#settings-layout-toggle');
        this._layoutToggle.addEventListener('click', () => {
            this.setLayout(this._layout === LAYOUTS.CLASSIC ? LAYOUTS.DRAWER : LAYOUTS.CLASSIC);
        });

        try {
            if (localStorage.getItem(LAYOUT_STORAGE_KEY) === LAYOUTS.CLASSIC) {
                this._layout = LAYOUTS.CLASSIC;
            }
        } catch (e) {
            // Keep the default layout
        }
        this._applyLayout();
    }

    _applyLayout() {
        const classic = this._layout === LAYOUTS.CLASSIC;

        // The same element is shown in both layouts, so the inputs keep their values
        (classic ? this._classicSlot : this._drawerHome).append(this._drawer);
        this._drawer.classList.toggle('is-classic', classic);
        document.body.classList.toggle('settings-classic', classic);

        this._layoutToggle.replaceChildren(
            icon(classic ? 'bi-layout-sidebar-inset-reverse' : 'bi-layout-three-columns'),
            classic ? ' Drawer view' : ' Classic view'
        );
        this._layoutToggle.title = classic
            ? 'Show the settings in a side drawer'
            : 'Show the settings as a strip under the URL bar, like the previous reference player';
    }

    // ---- Header: search, filter, export and the "more" menu (presets, import, reset) ----

    _bindHeader() {
        this._search.addEventListener('input', () => {
            this._query = this._search.value.trim();
            this.render();
        });

        this._filterSelect.addEventListener('change', () => {
            this._filter = this._filterSelect.value;
            this.render();
        });

        $('#settings-reset-all').addEventListener('click', () => {
            if (this._confirmDiscard('Reset all settings to their defaults?')) {
                this.controller.resetAll();
                this._discardEdits();
            }
        });

        $('#settings-copy-code').addEventListener('click', () => this.controller.copyCodeSnippet());
        $('#settings-export').addEventListener('click', () => this._export());

        const fileInput = $('#settings-import-file');
        $('#settings-import').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            const file = fileInput.files[0];
            fileInput.value = '';
            if (file) {
                file.text().then((text) => this._import(text));
            }
        });
    }

    _renderPresets() {
        let anchor = $('#settings-presets-header').closest('li');

        for (const preset of this.controller.presets) {
            const button = el('button', 'dropdown-item settings-menu-item');
            button.type = 'button';
            button.dataset.preset = preset.id;
            button.append(el('span', 'settings-menu-title', preset.name), el('span', 'settings-menu-text', preset.description));
            button.addEventListener('click', () => {
                if (this._confirmDiscard(`Apply the preset "${preset.name}"?`)) {
                    this.controller.applyPreset(preset.id);
                    this._discardEdits();
                    this.controller.showNotification('Preset applied');
                }
            });

            const item = el('li');
            item.append(button);
            anchor.after(item);
            anchor = item;
        }

        anchor.after(el('li', 'settings-menu-note', 'A preset resets all settings to their defaults first.'));
    }

    /**
     * Presets, import and "Reset all" discard the current changes: ask first if there are any.
     */
    _confirmDiscard(question) {
        const count = this.controller.getModifiedPaths().length;
        if (count === 0) {
            return true;
        }
        const noun = count === 1 ? 'setting' : 'settings';
        return window.confirm(`${question}\n\nThis discards your changes to ${count} ${noun}.`);
    }

    _export() {
        // The file holds the modified settings only: without any it would be an empty object
        if (this.controller.getModifiedPaths().length === 0) {
            this.controller.showNotification('Nothing to export: no setting is modified');
            return;
        }

        const blob = new Blob([this.controller.buildExportJson()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = el('a');
        link.href = url;
        link.download = EXPORT_FILE_NAME;
        document.body.append(link);
        link.click();
        link.remove();
        // Some browsers start the download after the click returns: keep the URL alive until then
        setTimeout(() => URL.revokeObjectURL(url), EXPORT_URL_LIFETIME_MS);
    }

    _import(text) {
        if (!this._confirmDiscard('Import settings from this file?')) {
            return;
        }
        const result = this.controller.importJson(text);
        if (!result.ok) {
            this._setStatus(`Import failed. ${result.error}`, true);
            return;
        }
        const ignored = [];
        if (result.unknown.length > 0) {
            ignored.push(`Ignored unknown: ${result.unknown.join(', ')}.`);
        }
        if (result.invalid.length > 0) {
            ignored.push(`Ignored values of the wrong type: ${result.invalid.join(', ')}.`);
        }
        if (result.applied === 0 && ignored.length > 0) {
            this._setStatus(`Import failed. Nothing in the file could be applied, the settings are unchanged. ${ignored.join(' ')}`, true);
            return;
        }
        this._discardEdits();
        if (ignored.length > 0) {
            this._setStatus(`Imported ${result.applied} settings. ${ignored.join(' ')}`, true);
        } else {
            this.controller.showNotification(`Imported ${result.applied} settings`);
        }
    }

    _setStatus(text, isError) {
        this._status.textContent = text;
        this._status.classList.toggle('is-error', !!isError);
        this._status.hidden = text === '';
    }

    // ---- List ----

    _visibleDescriptors() {
        const schema = this.controller.schema;
        if (this._query) {
            return schema.filter((descriptor) => matchesQuery(descriptor, this._query));
        }
        if (this._filter === FILTERS.COMMON) {
            return schema.filter((descriptor) => descriptor.common);
        }
        if (this._filter === FILTERS.MODIFIED) {
            return schema.filter((descriptor) => this.controller.isModified(descriptor.path));
        }
        return schema;
    }

    render() {
        const visible = new Set(this._visibleDescriptors());
        // Search results and the Modified view are short: show them fully expanded.
        // The classic layout has one card per section, always open.
        const forceOpen = this._layout === LAYOUTS.CLASSIC || !!this._query || this._filter === FILTERS.MODIFIED;

        this._rows.clear();
        this._categoryBadges.clear();

        const fragment = document.createDocumentFragment();
        for (const category of this.controller.categories) {
            const descriptors = category.settings.filter((descriptor) => visible.has(descriptor));
            if (descriptors.length > 0) {
                fragment.append(this._renderCategory(category, descriptors, forceOpen));
            }
        }
        this._generated.replaceChildren(fragment);

        const pageMatches = this._syncPageSections(forceOpen);
        const total = visible.size + pageMatches;

        let empty = $('.settings-empty', this._list);
        if (total === 0) {
            empty = empty || this._list.appendChild(el('p', 'settings-empty'));
            empty.textContent = this._emptyText();
        } else if (empty) {
            empty.remove();
        }

        if (this._query) {
            this._setStatus(`${total} ${total === 1 ? 'result' : 'results'}`);
        } else {
            this._setStatus('');
        }

        this._updateCounts();
    }

    /**
     * Show, hide and filter the hand-written page option sections
     * @returns {number} How many page option rows are listed
     */
    _syncPageSections(forceOpen) {
        const terms = this._query.toLowerCase().split(/\s+/).filter(Boolean);
        // Page options are not dash.js settings, so they have no "modified" state
        const hideAll = !this._query && this._filter === FILTERS.MODIFIED;
        let listed = 0;

        for (const section of $$('[data-page-section]', this._list)) {
            const header = $('.settings-category-header', section);
            const sectionText = $('.settings-category-label', section).textContent.toLowerCase();
            let matches = 0;

            for (const row of $$('[data-page-row]', section)) {
                const text = `${sectionText} ${row.textContent.toLowerCase()}`;
                const match = terms.every((term) => text.includes(term));
                row.hidden = !match;
                matches += match ? 1 : 0;
            }

            const open = forceOpen || this._expanded.has(header.dataset.category);
            section.hidden = hideAll || matches === 0;
            header.disabled = forceOpen;
            header.setAttribute('aria-expanded', String(open));
            $('.bi', header).className = `bi ${open ? 'bi-chevron-down' : 'bi-chevron-right'}`;
            $('.settings-category-count', header).textContent = String(matches);
            $('.settings-page-rows', section).hidden = !open;

            if (!section.hidden) {
                listed += matches;
            }
        }

        return this._query ? listed : 0;
    }

    _emptyText() {
        if (this._query) {
            return `Nothing matches "${this._query}".`;
        }
        if (this._filter === FILTERS.MODIFIED) {
            return 'No setting differs from its default.';
        }
        return 'No settings.';
    }

    _renderCategory(category, descriptors, forceOpen) {
        const open = forceOpen || this._expanded.has(category.id);
        const section = el('section', 'settings-category');

        const header = el('button', 'settings-category-header');
        header.type = 'button';
        header.dataset.action = 'toggle-category';
        header.dataset.category = category.id;
        header.setAttribute('aria-expanded', String(open));
        header.disabled = forceOpen;

        const badge = el('span', 'settings-category-badge');
        header.append(
            icon(open ? 'bi-chevron-down' : 'bi-chevron-right'),
            el('span', 'settings-category-label', category.label),
            badge,
            el('span', 'settings-category-count', String(descriptors.length))
        );
        header.title = category.path;
        section.append(header);
        this._categoryBadges.set(category.id, { badge, settings: category.settings });

        if (open) {
            let group = '';
            for (const descriptor of descriptors) {
                if (descriptor.group !== group) {
                    group = descriptor.group;
                    if (group) {
                        section.append(el('div', 'settings-group', group));
                    }
                }
                section.append(this._renderRow(descriptor));
            }
        }

        return section;
    }

    _renderRow(descriptor) {
        const id = `setting-${descriptor.path.replace(/\./g, '-')}`;
        const detailsOpen = this._openDetails.has(descriptor.path);
        const row = el('div', 'setting-row');
        row.dataset.path = descriptor.path;

        // Line: modified dot, name (toggles the details), reset, control
        const line = el('div', 'setting-line');
        const dot = el('span', 'setting-dot');
        dot.title = 'Modified';

        const name = el('button', 'setting-name');
        name.type = 'button';
        name.dataset.action = 'details';
        name.title = descriptor.path;
        name.setAttribute('aria-expanded', String(detailsOpen));
        name.setAttribute('aria-controls', `${id}-details`);
        const key = el('code');
        this._appendHighlighted(key, descriptor.key);
        name.append(key);

        const reset = el('button', 'setting-reset');
        reset.type = 'button';
        reset.dataset.action = 'reset';
        reset.title = 'Reset to default';
        reset.setAttribute('aria-label', `Reset ${descriptor.key} to its default`);
        reset.append(icon('bi-arrow-counterclockwise'));

        const control = this._createControl(descriptor, id);
        line.append(dot, name, reset);

        const error = el('div', 'setting-error');
        error.setAttribute('role', 'alert');

        if (descriptor.type === SETTING_TYPES.JSON) {
            // A JSON value needs the full width: it goes on its own line
            line.append(el('span', 'setting-tag', 'JSON'));
            row.append(line, control.wrapper, error);
        } else {
            line.append(control.wrapper);
            row.append(line, error);
        }

        const details = this._renderDetails(descriptor);
        details.id = `${id}-details`;
        details.hidden = !detailsOpen;
        row.append(details);

        const entry = { row, descriptor, input: control.input, error };
        this._rows.set(descriptor.path, entry);
        this._syncRow(entry, true);

        return row;
    }

    _renderDetails(descriptor) {
        const details = el('div', 'setting-details');

        if (descriptor.description) {
            details.append(el('div', 'setting-desc', descriptor.description));
        }
        if (descriptor.emptyIsDefault) {
            details.append(el('div', 'setting-hint', 'Leave empty to use the default.'));
        } else if (descriptor.type === SETTING_TYPES.LIST) {
            details.append(el('div', 'setting-hint', 'Separate values with commas.'));
        }

        const meta = el('div', 'setting-meta', 'Default ');
        meta.append(el('code', '', formatDefault(descriptor)), ' · ', el('code', '', descriptor.path));
        details.append(meta);

        return details;
    }

    _createControl(descriptor, id) {
        let input;
        let wrapper;

        switch (descriptor.type) {
            case SETTING_TYPES.BOOLEAN:
                input = el('input', 'form-check-input');
                input.type = 'checkbox';
                input.setAttribute('role', 'switch');
                wrapper = el('div', 'form-check form-switch setting-switch');
                wrapper.append(input);
                break;

            case SETTING_TYPES.NULLABLE_BOOLEAN:
                input = this._createSelect([
                    { value: 'null', label: 'Auto' },
                    { value: 'true', label: 'On' },
                    { value: 'false', label: 'Off' }
                ]);
                break;

            case SETTING_TYPES.ENUM:
                input = this._createSelect(descriptor.options);
                break;

            case SETTING_TYPES.NUMBER:
                input = el('input', 'form-control form-control-sm setting-number');
                input.type = 'number';
                input.step = 'any';
                break;

            case SETTING_TYPES.JSON:
                input = el('textarea', 'form-control form-control-sm setting-json');
                input.rows = 2;
                input.spellcheck = false;
                break;

            case SETTING_TYPES.READONLY:
                wrapper = el('span', 'setting-readonly', 'read-only');
                wrapper.title = 'Cannot be edited in the reference player';
                return { wrapper, input: null };

            default:
                input = el('input', 'form-control form-control-sm setting-text');
                input.type = 'text';
                input.spellcheck = false;
        }

        if (descriptor.emptyIsDefault) {
            input.placeholder = 'default';
        }
        input.id = id;
        input.dataset.path = descriptor.path;
        input.setAttribute('aria-label', descriptor.path);
        input.classList.add('setting-input');

        return { wrapper: wrapper || input, input };
    }

    _createSelect(options) {
        const select = el('select', 'form-select form-select-sm setting-select');
        for (const option of options) {
            const optionEl = el('option', '', option.label);
            optionEl.value = String(option.value);
            select.append(optionEl);
        }
        return select;
    }

    _appendHighlighted(target, text) {
        const lower = text.toLowerCase();
        const term = this._query.toLowerCase().split(/\s+/).filter(Boolean).find((candidate) => lower.includes(candidate));
        if (!term) {
            target.textContent = text;
            return;
        }
        const start = lower.indexOf(term);
        target.append(text.slice(0, start), el('mark', '', text.slice(start, start + term.length)), text.slice(start + term.length));
    }

    _bindList() {
        this._list.addEventListener('change', (e) => {
            const entry = this._rows.get(e.target.dataset?.path);
            if (entry) {
                this._commit(entry);
            }
        });

        this._list.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-action]');
            if (!trigger) {
                return;
            }
            if (trigger.dataset.action === 'toggle-category') {
                this._toggleCategory(trigger.dataset.category);
            } else if (trigger.dataset.action === 'details') {
                this._toggleDetails(trigger);
            } else if (trigger.dataset.action === 'reset') {
                const entry = this._rows.get(trigger.closest('.setting-row').dataset.path);
                this._clearError(entry);
                this._applyFromRow(() => this.controller.resetSetting(entry.descriptor.path));
            }
        });
    }

    _toggleCategory(id) {
        if (this._expanded.has(id)) {
            this._expanded.delete(id);
        } else {
            this._expanded.add(id);
        }

        if (id.startsWith(PAGE_CATEGORY_PREFIX)) {
            // Page option rows are static markup: nothing to render again
            this._syncPageSections(false);
            return;
        }

        const scrollTop = this._list.scrollTop;
        this.render();
        this._list.scrollTop = scrollTop;
        this._list.querySelector(`[data-category="${id}"]`)?.focus();
    }

    _toggleDetails(trigger) {
        const row = trigger.closest('.setting-row');
        const details = $('.setting-details', row);
        details.hidden = !details.hidden;
        trigger.setAttribute('aria-expanded', String(!details.hidden));

        if (details.hidden) {
            this._openDetails.delete(row.dataset.path);
        } else {
            this._openDetails.add(row.dataset.path);
        }
    }

    /**
     * Read a control, validate it and apply the value to the player
     */
    _commit(entry) {
        const { descriptor, input } = entry;
        const raw = input.type === 'checkbox' ? input.checked : input.value;
        // A number field reports text it cannot parse ("3e", "1-") as '', which would read as "use the default"
        const result = input.validity?.badInput ? { ok: false, error: 'Enter a number.' } : parseInput(descriptor, raw);

        if (!result.ok) {
            entry.row.classList.add('has-error');
            entry.error.textContent = `${result.error} Not applied; the player keeps the last valid value.`;
            input.setAttribute('aria-invalid', 'true');
            return;
        }

        this._clearError(entry);
        this._applyFromRow(() => this.controller.setValue(descriptor.path, result.value));
    }

    _applyFromRow(apply) {
        this._changingFromRow = true;
        try {
            apply();
        } finally {
            this._changingFromRow = false;
        }
    }

    _clearError(entry) {
        entry.row.classList.remove('has-error');
        entry.error.textContent = '';
        entry.input?.removeAttribute('aria-invalid');
    }

    _syncRow(entry, force) {
        const { row, descriptor, input } = entry;
        row.classList.toggle('is-modified', this.controller.isModified(descriptor.path));

        // Leave a control alone while it holds invalid text or is being edited
        if (!input || row.classList.contains('has-error') || (!force && input === document.activeElement)) {
            return;
        }
        const value = this.controller.getValue(descriptor.path);
        if (input.type === 'checkbox') {
            input.checked = !!value;
        } else {
            input.value = formatValue(descriptor, value);
        }
    }

    /**
     * After "Reset all", a preset or an import every control shows the player's value again,
     * including the ones that still held rejected text.
     */
    _discardEdits() {
        for (const entry of this._rows.values()) {
            this._clearError(entry);
            this._syncRow(entry, true);
        }
    }

    _onSettingsChanged() {
        // Which rows the Modified view lists depends on what is modified. A change made in a row
        // updates the rows in place instead: rebuilding the list would destroy the focused control,
        // and a row set back to its default would vanish while it is in use. The list catches up
        // on the next render (filter, search, or a change from outside the rows).
        if (this._filter === FILTERS.MODIFIED && !this._query && !this._changingFromRow) {
            this.render();
            return;
        }
        for (const entry of this._rows.values()) {
            this._syncRow(entry, false);
        }
        this._updateCounts();
    }

    _updateCounts() {
        const schema = this.controller.schema;
        const modified = this.controller.getModifiedPaths().length;
        const counts = {
            [FILTERS.COMMON]: schema.filter((descriptor) => descriptor.common).length,
            [FILTERS.ALL]: schema.length,
            [FILTERS.MODIFIED]: modified
        };

        for (const option of this._filterSelect.options) {
            option.textContent = `${FILTER_LABELS[option.value]} (${counts[option.value]})`;
        }
        this._filterSelect.value = this._filter;
        // A search always covers everything, so the filter does not apply while searching
        this._filterSelect.disabled = !!this._query;

        for (const { badge, settings } of this._categoryBadges.values()) {
            const count = settings.filter((descriptor) => this.controller.isModified(descriptor.path)).length;
            badge.textContent = count > 0 ? `${count} modified` : '';
        }

        const chip = $('#settings-modified-chip');
        chip.textContent = `${modified} modified`;
        chip.hidden = modified === 0;

        const badge = $('#settings-modified-badge');
        badge.textContent = String(modified);
        badge.hidden = modified === 0;
        const noun = modified === 1 ? 'setting' : 'settings';
        this._optionsButton.title = modified === 0
            ? 'Show or hide the settings'
            : `Show or hide the settings (${modified} ${noun} modified)`;
        $('#settings-reset-all').disabled = modified === 0;
    }
}
