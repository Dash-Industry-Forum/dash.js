/**
 * SettingsController.js - Settings state, presets, import/export and URL export/import
 *
 * Holds no markup for individual settings: the list of settings is derived from the player's
 * settings object (see SettingsSchema.js) and rendered by SettingsPanel.js.
 */

import {$} from './UIHelpers.js';
import SETTINGS_DESCRIPTIONS from '../data/settingsDescriptions.js';
import SETTINGS_OVERRIDES from '../data/settingsOverrides.js';
import SETTINGS_PRESETS from '../data/settingsPresets.js';
import {
    buildCategories,
    buildSchema,
    cloneValue,
    diffSettings,
    getValueAtPath,
    isPlainObject,
    isSameValue,
    listLeaves,
    parseUrlValue,
    setValueAtPath,
    SETTING_TYPES,
    toJsLiteral,
    validateValue
} from './SettingsSchema.js';

export class SettingsController {
    /**
     * @param {PlayerController} playerController
     * @param {object} [options]
     * @param {object} [options.libraryDefaults] - The dash.js defaults, captured before the reference
     * player applied its own startup configuration. Used for "Copy as code".
     */
    constructor(playerController, options = {}) {
        this.playerController = playerController;
        this.player = playerController.player;
        this._libraryDefaults = options.libraryDefaults ? cloneValue(options.libraryDefaults) : null;
        this._defaultSettings = null;
        this._schema = [];
        this._categories = [];
        this._byPath = new Map();
        this._listeners = [];
        this._autoPlay = true;
        this._loop = true;
        this._restoredProtData = null;
        this._lastSignature = '';
    }

    // UI-only initial track fields (not dash.js settings): URL param -> input id
    static get _INITIAL_MEDIA_PARAMS() {
        return {
            initRoleVideo: 'opt-init-role-video',
            initLangAudio: 'opt-init-lang-audio',
            initRoleAudio: 'opt-init-role-audio',
            audioAccessibilityScheme: 'opt-audio-accessibility-scheme',
            audioAccessibilityValue: 'opt-audio-accessibility-value',
            initLangText: 'opt-init-lang-text',
            initRoleText: 'opt-init-role-text'
        };
    }

    /**
     * Capture the defaults, derive the schema and bind the page-level load options
     */
    init() {
        this._defaultSettings = cloneValue(this.player.getSettings());
        if (!this._libraryDefaults) {
            this._libraryDefaults = this._defaultSettings;
        }

        this._schema = buildSchema(this._defaultSettings, SETTINGS_OVERRIDES, SETTINGS_DESCRIPTIONS);
        this._categories = buildCategories(this._schema, SETTINGS_OVERRIDES.categoryLabels);
        this._byPath = new Map(this._schema.map((descriptor) => [descriptor.path, descriptor]));

        this._lastSignature = this._signature();
        this._bindLoadOptions();
    }

    get schema() {
        return this._schema;
    }

    get categories() {
        return this._categories;
    }

    get presets() {
        return SETTINGS_PRESETS;
    }

    get autoPlay() {
        return this._autoPlay;
    }

    get loop() {
        return this._loop;
    }

    /**
     * Get DRM protection data restored from URL (or null)
     */
    get restoredProtData() {
        return this._restoredProtData || null;
    }

    // ---- Reading and changing settings ----

    getDescriptor(path) {
        return this._byPath.get(path) || null;
    }

    getValue(path) {
        return getValueAtPath(this.player.getSettings(), path);
    }

    isModified(path) {
        const descriptor = this._byPath.get(path);
        return !!descriptor && !isSameValue(this.getValue(path), descriptor.defaultValue);
    }

    getModifiedPaths() {
        return this._schema.map((descriptor) => descriptor.path).filter((path) => this.isModified(path));
    }

    /**
     * Apply one setting to the player immediately
     */
    setValue(path, value) {
        if (!this._isEditable(path)) {
            return false;
        }
        this.player.updateSettings(setValueAtPath({}, path, cloneValue(value)));
        this._emitChange();
        return true;
    }

    resetSetting(path) {
        const descriptor = this._byPath.get(path);
        return descriptor ? this.setValue(path, descriptor.defaultValue) : false;
    }

    resetAll() {
        this._resetAllSilently();
        this._emitChange();
    }

    /**
     * Reset everything to the defaults, then apply a partial settings object. Used by presets
     * and by JSON import, so the result never depends on what was set before.
     * An object that holds values but none that can be applied (a wrong file, a misspelled
     * top-level key) changes nothing: the current settings are kept.
     * @param {object} settingsObj
     * @returns {{applied: number, unknown: string[], invalid: string[]}} `unknown` lists the paths that
     * name no editable setting, `invalid` the paths whose value does not have the setting's type.
     * Neither is applied.
     */
    applySettings(settingsObj) {
        const accepted = {};
        const unknown = [];
        const invalid = [];
        let applied = 0;

        for (const [path, value] of listLeaves(settingsObj)) {
            if (!this._isEditable(path)) {
                unknown.push(path);
                continue;
            }
            const result = validateValue(this._byPath.get(path), value);
            if (!result.ok) {
                invalid.push(path);
                continue;
            }
            setValueAtPath(accepted, path, cloneValue(result.value));
            applied++;
        }

        if (applied === 0 && (unknown.length > 0 || invalid.length > 0)) {
            return { applied, unknown, invalid };
        }

        this._resetAllSilently();
        this.player.updateSettings(accepted);
        this._emitChange();

        return { applied, unknown, invalid };
    }

    applyPreset(id) {
        const preset = SETTINGS_PRESETS.find((candidate) => candidate.id === id);
        return preset ? this.applySettings(preset.settings) : null;
    }

    /**
     * Register a listener that is called after any setting changed
     */
    onChange(listener) {
        this._listeners.push(listener);
    }

    /**
     * Notify the listeners if settings changed without going through this controller. The control
     * bar and dash.js itself update settings too, and dash.js has no event for a changed setting,
     * so the page calls this periodically.
     * @returns {boolean} Whether a change was found
     */
    syncWithPlayer() {
        if (this._signature() === this._lastSignature) {
            return false;
        }
        this._emitChange();
        return true;
    }

    // ---- Export and import ----

    /**
     * @returns {object} Nested object of the settings that differ from the reference player's defaults
     */
    getModifiedSettings() {
        return diffSettings(this.player.getSettings(), this._defaultSettings);
    }

    /**
     * A player.updateSettings() call holding everything that differs from the dash.js defaults.
     * This includes the reference player's own startup configuration, which an application
     * has to set itself to behave the same.
     */
    buildCodeSnippet() {
        const diff = diffSettings(this.player.getSettings(), this._libraryDefaults);
        return `player.updateSettings(${toJsLiteral(diff)});`;
    }

    buildExportJson() {
        return JSON.stringify(this.getModifiedSettings(), null, 2);
    }

    /**
     * @param {string} text - JSON as written by buildExportJson()
     * @returns {{ok: true, applied: number, unknown: string[], invalid: string[]}|{ok: false, error: string}}
     */
    importJson(text) {
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (e) {
            return { ok: false, error: `Invalid JSON: ${e.message}` };
        }
        if (!isPlainObject(parsed)) {
            return { ok: false, error: 'The file has to hold a settings object.' };
        }
        return { ok: true, ...this.applySettings(parsed) };
    }

    copyCodeSnippet() {
        this._copyText(this.buildCodeSnippet(), 'Code copied!');
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
    }

    /**
     * Build the URL that restores the current settings, load options and stream
     * @param {Object|null} [protectionData] - DRM protection data to include
     * @returns {string}
     */
    buildSettingsUrl(protectionData) {
        const params = new URLSearchParams();

        for (const [path, value] of listLeaves(this.getModifiedSettings())) {
            params.set(path, this._toUrlValue(path, value));
        }

        // Add load options (not part of dash.js settings). Auto play and loop are on by default,
        // so they are always written: leaving them out could not say "off".
        params.set('autoplay', String(this._isChecked('opt-autoplay')));
        params.set('loop', String(this._isChecked('opt-loop')));
        if (this._isChecked('opt-muted')) {
            params.set('muted', 'true');
        }
        if (this._isChecked('opt-autoload')) {
            params.set('autoLoad', 'true');
        }
        if (this._isChecked('opt-force-text-streaming')) {
            params.set('forceTextStreaming', 'true');
        }
        for (const [param, id] of Object.entries(SettingsController._INITIAL_MEDIA_PARAMS)) {
            const value = $(`#${id}`).value.trim();
            if (value) {
                params.set(param, value);
            }
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

        return url.toString();
    }

    /**
     * Copy the current settings URL to clipboard
     * @param {Object|null} [protectionData] - DRM protection data to include
     */
    copySettingsUrl(protectionData) {
        this._copyText(this.buildSettingsUrl(protectionData), 'URL Copied!');
    }

    /**
     * Parse URL query parameters and apply settings
     */
    applyFromUrl() {
        const params = new URLSearchParams(window.location.search);
        if (params.size === 0) {
            return;
        }

        // Handle stream URL (support legacy 'mpd' parameter as well)
        const streamUrl = params.get('stream') || params.get('mpd');
        if (streamUrl) {
            $('#stream-url').value = streamUrl;
        }

        // Handle load options
        const autoPlay = this._booleanParam(params.get('autoplay') ?? params.get('autoPlay'));
        if (autoPlay !== null) {
            $('#opt-autoplay').checked = autoPlay;
            this._autoPlay = autoPlay;
        }
        const loop = this._booleanParam(params.get('loop'));
        if (loop !== null) {
            $('#opt-loop').checked = loop;
            this._loop = loop;
        }
        if (params.get('muted') === 'true') {
            $('#opt-muted').checked = true;
        }
        if (params.get('autoLoad') === 'true') {
            $('#opt-autoload').checked = true;
        }
        if (params.get('forceTextStreaming') === 'true') {
            $('#opt-force-text-streaming').checked = true;
        }
        for (const [param, id] of Object.entries(SettingsController._INITIAL_MEDIA_PARAMS)) {
            if (params.has(param)) {
                $(`#${id}`).value = params.get(param);
            }
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
            // Only parameters that name a known, editable setting are applied. This also skips
            // the page options handled above: none of them is a setting path.
            if (!this._isEditable(key)) {
                continue;
            }
            const parsed = this._fromUrlValue(key, value);
            if (parsed !== undefined) {
                setValueAtPath(settingsObj, key, parsed);
            }
        }

        if (Object.keys(settingsObj).length > 0) {
            this.player.updateSettings(settingsObj);
            this._emitChange();
        }

        // Auto-load if stream is set
        const autoLoad = params.get('autoLoad');
        if (autoLoad === 'true' && streamUrl) {
            return true;
        }
        return false;
    }

    // ---- Private ----

    _bindLoadOptions() {
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

        // Auto load and force text streaming are read when a stream is loaded, no runtime action needed
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

    _isEditable(path) {
        const descriptor = this._byPath.get(path);
        return !!descriptor && descriptor.type !== SETTING_TYPES.READONLY;
    }

    _resetAllSilently() {
        const defaults = {};
        for (const path of this.getModifiedPaths()) {
            setValueAtPath(defaults, path, cloneValue(this._byPath.get(path).defaultValue));
        }
        this.player.updateSettings(defaults);
    }

    /**
     * @param {string|null} value - A URL parameter value
     * @returns {boolean|null} null if the parameter is absent or neither 'true' nor 'false'
     */
    _booleanParam(value) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }
        return null;
    }

    _signature() {
        return JSON.stringify(this.getModifiedSettings());
    }

    _emitChange() {
        this._lastSignature = this._signature();
        for (const listener of this._listeners) {
            listener();
        }
    }

    _toUrlValue(path, value) {
        const descriptor = this._byPath.get(path);
        if (descriptor && descriptor.type === SETTING_TYPES.JSON) {
            return JSON.stringify(value);
        }
        return Array.isArray(value) ? value.join(',') : String(value);
    }

    _fromUrlValue(path, value) {
        const result = parseUrlValue(this._byPath.get(path), value);
        return result.ok ? result.value : undefined;
    }

    _copyText(text, message) {
        // navigator.clipboard exists in secure contexts only: over plain HTTP the fallback copies
        const written = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject();
        written.then(() => {
            this.showNotification(message);
        }).catch(() => {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showNotification(message);
        });
    }

    showNotification(message) {
        const existing = document.querySelector('.copy-notification');
        if (existing) {
            existing.remove();
        }
        const notif = document.createElement('div');
        notif.className = 'copy-notification alert alert-success py-2 px-3';
        const icon = document.createElement('i');
        icon.className = 'bi bi-check-circle';
        notif.append(icon, ` ${message}`);
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 2200);
    }
}
