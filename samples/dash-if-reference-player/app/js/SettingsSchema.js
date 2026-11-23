/**
 * SettingsSchema.js - Derives the list of editable settings from the player's settings object.
 *
 * Nothing in here touches the DOM. The schema is built by walking the object returned by
 * player.getSettings(): every leaf becomes one descriptor whose control type is inferred from
 * the default value. The overrides file only adds what cannot be inferred.
 */

export const SETTING_TYPES = {
    BOOLEAN: 'boolean',
    NULLABLE_BOOLEAN: 'nullableBoolean',
    NUMBER: 'number',
    STRING: 'string',
    ENUM: 'enum',
    LIST: 'list',
    JSON: 'json',
    READONLY: 'readonly'
};

const GENERAL_CATEGORY_ID = 'general';

export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof RegExp);
}

/**
 * Deep clone that keeps NaN (JSON round-tripping turns it into null).
 */
export function cloneValue(value) {
    if (Array.isArray(value)) {
        return value.map(cloneValue);
    }
    if (isPlainObject(value)) {
        const copy = {};
        for (const key of Object.keys(value)) {
            copy[key] = cloneValue(value[key]);
        }
        return copy;
    }
    return value;
}

export function isSameValue(a, b) {
    if (typeof a === 'number' && typeof b === 'number') {
        return a === b || (Number.isNaN(a) && Number.isNaN(b));
    }
    if (a === b) {
        return true;
    }
    if (a instanceof RegExp && b instanceof RegExp) {
        return String(a) === String(b);
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && a.every((item, index) => isSameValue(item, b[index]));
    }
    if (isPlainObject(a) && isPlainObject(b)) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        return keysA.length === keysB.length && keysA.every((key) => isSameValue(a[key], b[key]));
    }
    return false;
}

export function getValueAtPath(obj, path) {
    let current = obj;
    for (const key of path.split('.')) {
        if (current === null || current === undefined) {
            return undefined;
        }
        current = current[key];
    }
    return current;
}

// Path segments that would reach an object's prototype instead of a setting
const UNSAFE_PATH_SEGMENTS = ['__proto__', 'constructor', 'prototype'];

/**
 * Writes a value at a dotted path, creating the objects in between. Paths come from URLs and
 * imported files, so a path with a prototype segment is ignored and `obj` is returned unchanged.
 */
export function setValueAtPath(obj, path, value) {
    const keys = path.split('.');
    if (keys.some((key) => UNSAFE_PATH_SEGMENTS.includes(key))) {
        return obj;
    }
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!isPlainObject(current[keys[i]])) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
}

/**
 * Lists every leaf of a nested object as [path, value]. Arrays and RegExps count as leaves.
 */
export function listLeaves(obj, prefix = '') {
    const leaves = [];
    for (const key of Object.keys(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (isPlainObject(obj[key])) {
            leaves.push(...listLeaves(obj[key], path));
        } else {
            leaves.push([path, obj[key]]);
        }
    }
    return leaves;
}

/**
 * Returns the nested object of all leaves in `current` that differ from `baseline`.
 */
export function diffSettings(current, baseline) {
    const diff = {};
    for (const [path, value] of listLeaves(current)) {
        if (!isSameValue(value, getValueAtPath(baseline, path))) {
            setValueAtPath(diff, path, cloneValue(value));
        }
    }
    return diff;
}

export function inferType(value) {
    if (typeof value === 'boolean') {
        return SETTING_TYPES.BOOLEAN;
    }
    if (typeof value === 'number') {
        return SETTING_TYPES.NUMBER;
    }
    if (typeof value === 'string') {
        return SETTING_TYPES.STRING;
    }
    if (Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string')) {
        return SETTING_TYPES.LIST;
    }
    return null;
}

export function humanize(name) {
    const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function _locate(path) {
    const segments = path.split('.');
    const key = segments[segments.length - 1];

    if (segments[0] === 'streaming' && segments.length === 2) {
        return { key, categoryId: GENERAL_CATEGORY_ID, categoryPath: 'streaming', group: '' };
    }
    if (segments[0] === 'streaming') {
        return {
            key,
            categoryId: segments[1],
            categoryPath: `streaming.${segments[1]}`,
            group: segments.slice(2, -1).join('.')
        };
    }
    if (segments.length === 1) {
        return { key, categoryId: GENERAL_CATEGORY_ID, categoryPath: '', group: '' };
    }
    return { key, categoryId: segments[0], categoryPath: segments[0], group: segments.slice(1, -1).join('.') };
}

/**
 * @param {object} defaults - The settings object the page starts with
 * @param {object} [overrides] - { types, options, common, categoryLabels }
 * @param {object} [descriptions] - Setting path -> description text
 * @returns {Array<object>} One descriptor per leaf setting, in the order of the settings object
 */
export function buildSchema(defaults, overrides = {}, descriptions = {}) {
    const types = overrides.types || {};
    const options = overrides.options || {};
    const common = new Set(overrides.common || []);

    return listLeaves(defaults).map(([path, value]) => {
        const type = types[path] || (options[path] ? SETTING_TYPES.ENUM : inferType(value)) || SETTING_TYPES.JSON;
        const emptyIsDefault = (type === SETTING_TYPES.NUMBER || type === SETTING_TYPES.STRING) &&
            (value === null || Number.isNaN(value));

        return {
            path,
            ..._locate(path),
            type,
            options: options[path] || null,
            defaultValue: cloneValue(value),
            emptyIsDefault,
            description: descriptions[path] || '',
            common: common.has(path)
        };
    });
}

/**
 * Groups descriptors into categories: "General" first, the rest sorted by label.
 */
export function buildCategories(schema, categoryLabels = {}) {
    const byId = new Map();
    for (const descriptor of schema) {
        if (!byId.has(descriptor.categoryId)) {
            byId.set(descriptor.categoryId, {
                id: descriptor.categoryId,
                label: categoryLabels[descriptor.categoryId] || humanize(descriptor.categoryId),
                path: descriptor.categoryPath,
                settings: []
            });
        }
        byId.get(descriptor.categoryId).settings.push(descriptor);
    }

    return [...byId.values()].sort((a, b) => {
        if (a.id === GENERAL_CATEGORY_ID) {
            return -1;
        }
        if (b.id === GENERAL_CATEGORY_ID) {
            return 1;
        }
        return a.label.localeCompare(b.label);
    });
}

export function parseList(raw) {
    return String(raw).split(',').map((item) => item.trim()).filter(Boolean);
}

/**
 * Turns the text of a control into a settings value.
 * @returns {{ok: true, value: *}|{ok: false, error: string}}
 */
export function parseInput(descriptor, raw) {
    const text = String(raw);

    switch (descriptor.type) {
        case SETTING_TYPES.BOOLEAN:
            return { ok: true, value: raw === true || text === 'true' };

        case SETTING_TYPES.NULLABLE_BOOLEAN:
            return { ok: true, value: text === 'true' ? true : text === 'false' ? false : null };

        case SETTING_TYPES.NUMBER: {
            if (text.trim() === '') {
                return descriptor.emptyIsDefault
                    ? { ok: true, value: cloneValue(descriptor.defaultValue) }
                    : { ok: false, error: 'Enter a number.' };
            }
            const number = Number(text);
            return Number.isNaN(number) ? { ok: false, error: 'Enter a number.' } : { ok: true, value: number };
        }

        case SETTING_TYPES.STRING:
            if (text === '' && descriptor.emptyIsDefault) {
                return { ok: true, value: cloneValue(descriptor.defaultValue) };
            }
            return { ok: true, value: text };

        case SETTING_TYPES.ENUM: {
            const option = (descriptor.options || []).find((candidate) => String(candidate.value) === text);
            return option ? { ok: true, value: option.value } : { ok: false, error: 'Choose one of the listed values.' };
        }

        case SETTING_TYPES.LIST:
            return { ok: true, value: parseList(text) };

        case SETTING_TYPES.JSON: {
            let parsed;
            try {
                parsed = JSON.parse(text);
            } catch (e) {
                return { ok: false, error: `Invalid JSON: ${e.message}` };
            }
            if (Array.isArray(descriptor.defaultValue) && !Array.isArray(parsed)) {
                return { ok: false, error: 'Enter a JSON array, for example [].' };
            }
            if (isPlainObject(parsed)) {
                return { ok: false, error: 'Enter a JSON array or a single value, not an object.' };
            }
            return { ok: true, value: parsed };
        }

        default:
            return { ok: false, error: 'This setting cannot be edited here.' };
    }
}

/**
 * Turns the text of a settings URL parameter into a settings value. Same as parseInput(), but
 * booleans have to be spelled out, so a typo is skipped instead of being read as false or null.
 * @returns {{ok: true, value: *}|{ok: false, error: string}}
 */
export function parseUrlValue(descriptor, text) {
    if (descriptor.type === SETTING_TYPES.BOOLEAN && text !== 'true' && text !== 'false') {
        return { ok: false, error: 'Expected true or false.' };
    }
    if (descriptor.type === SETTING_TYPES.NULLABLE_BOOLEAN && !['true', 'false', 'null'].includes(text)) {
        return { ok: false, error: 'Expected true, false or null.' };
    }
    return parseInput(descriptor, text);
}

/**
 * Checks that a value from an imported file or a preset has the type of its setting.
 * A null for a number or string whose default is null or NaN stands for that default, because
 * JSON cannot hold NaN.
 * @returns {{ok: true, value: *}|{ok: false, error: string}}
 */
export function validateValue(descriptor, value) {
    const ok = { ok: true, value };

    switch (descriptor.type) {
        case SETTING_TYPES.BOOLEAN:
            return typeof value === 'boolean' ? ok : { ok: false, error: 'Expected a boolean.' };

        case SETTING_TYPES.NULLABLE_BOOLEAN:
            return typeof value === 'boolean' || value === null ? ok : { ok: false, error: 'Expected a boolean or null.' };

        case SETTING_TYPES.NUMBER:
            if (value === null && descriptor.emptyIsDefault) {
                return { ok: true, value: cloneValue(descriptor.defaultValue) };
            }
            return typeof value === 'number' ? ok : { ok: false, error: 'Expected a number.' };

        case SETTING_TYPES.STRING:
            if (value === null && descriptor.emptyIsDefault) {
                return { ok: true, value: cloneValue(descriptor.defaultValue) };
            }
            return typeof value === 'string' ? ok : { ok: false, error: 'Expected a string.' };

        case SETTING_TYPES.ENUM: {
            const option = (descriptor.options || []).find((candidate) => isSameValue(candidate.value, value));
            return option ? { ok: true, value: option.value } : { ok: false, error: 'Expected one of the listed values.' };
        }

        case SETTING_TYPES.LIST:
            return Array.isArray(value) && value.every((item) => typeof item === 'string')
                ? ok
                : { ok: false, error: 'Expected an array of strings.' };

        case SETTING_TYPES.JSON:
            if (Array.isArray(descriptor.defaultValue) && !Array.isArray(value)) {
                return { ok: false, error: 'Expected an array.' };
            }
            return ok;

        default:
            return { ok: false, error: 'This setting cannot be edited here.' };
    }
}

/**
 * Turns a settings value into the text shown in its control.
 */
export function formatValue(descriptor, value) {
    switch (descriptor.type) {
        case SETTING_TYPES.NULLABLE_BOOLEAN:
            return value === true ? 'true' : value === false ? 'false' : 'null';

        case SETTING_TYPES.NUMBER:
            return value === null || value === undefined || Number.isNaN(value) ? '' : String(value);

        case SETTING_TYPES.STRING:
            return value === null || value === undefined ? '' : String(value);

        case SETTING_TYPES.LIST:
            return Array.isArray(value) ? value.join(', ') : '';

        case SETTING_TYPES.JSON:
            return JSON.stringify(value, null, 2);

        default:
            return String(value);
    }
}

/**
 * Text for the "Default: …" hint of a modified setting.
 */
export function formatDefault(descriptor) {
    const value = descriptor.defaultValue;

    if (descriptor.type === SETTING_TYPES.NULLABLE_BOOLEAN && value === null) {
        return 'Auto (null)';
    }
    if (descriptor.type === SETTING_TYPES.ENUM) {
        const option = (descriptor.options || []).find((candidate) => isSameValue(candidate.value, value));
        return option && option.label !== String(option.value) ? `${option.label} (${value})` : String(value);
    }
    if (value === null || Number.isNaN(value)) {
        return `${value} (empty)`;
    }
    if (descriptor.type === SETTING_TYPES.LIST) {
        return value.join(', ');
    }
    if (descriptor.type === SETTING_TYPES.JSON) {
        return JSON.stringify(value);
    }
    if (value === '') {
        return '(empty)';
    }
    return String(value);
}

/**
 * True when every whitespace-separated term of the query occurs in the path or the description.
 */
export function matchesQuery(descriptor, query) {
    const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
        return true;
    }
    const haystack = `${descriptor.path} ${descriptor.description}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
}

/**
 * A single-quoted JavaScript string literal. JSON.stringify does the escaping (newlines, control
 * characters, backslashes); only the quote style is changed afterwards.
 */
function toJsString(text) {
    const escaped = JSON.stringify(text).slice(1, -1).replace(/\\"/g, '"').replace(/'/g, '\\\'');
    return `'${escaped}'`;
}

/**
 * Formats a value as a JavaScript literal for the "Copy as code" snippet.
 */
export function toJsLiteral(value, indent = '') {
    const inner = `${indent}    `;

    if (Array.isArray(value)) {
        return value.length === 0 ? '[]' : `[${value.map((item) => toJsLiteral(item, indent)).join(', ')}]`;
    }
    if (isPlainObject(value)) {
        const keys = Object.keys(value);
        if (keys.length === 0) {
            return '{}';
        }
        const lines = keys.map((key) => {
            const name = /^[A-Za-z_$][\w$]*$/.test(key) ? key : toJsString(key);
            return `${inner}${name}: ${toJsLiteral(value[key], inner)}`;
        });
        return `{\n${lines.join(',\n')}\n${indent}}`;
    }
    if (typeof value === 'string') {
        return toJsString(value);
    }
    return String(value);
}
