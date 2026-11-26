/**
 * Extracts the description of every setting from the JSDoc in src/core/Settings.js and writes
 * them to app/data/settingsDescriptions.js, keyed by setting path.
 *
 * Run it by hand after changing the JSDoc of a setting, and commit the result:
 *
 *     node samples/dash-if-reference-player/tools/generate-settings-descriptions.mjs
 *
 * The reference player itself needs no build step: it only reads the generated file. A setting
 * that this script has not caught up with still shows in the UI, without a description.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(here, '../../../src/core/Settings.js');
const TARGET = resolve(here, '../app/data/settingsDescriptions.js');
const ROOT_TYPEDEF = 'PlayerSettings';

// Typedefs shared by several settings: their properties only say "audio" or "video", so the
// description of the setting that uses the typedef is put in front.
const SHARED_TYPEDEFS = new Set(['AudioVideoSettings', 'RequestTypeSettings', 'CachingInfoSettings']);

// RequestTypeSettings documents both low latency factors, but each of the two settings that use
// the typedef holds only one of them.
const NOT_A_SETTING = new Set([
    'streaming.retryIntervals.lowLatencyMultiplyFactor',
    'streaming.retryAttempts.lowLatencyReductionFactor'
]);

function stripPrefix(name) {
    return name.replace(/^module:Settings~/, '');
}

function splitNameAndText(rest) {
    if (!rest.startsWith('[')) {
        const [name, ...text] = rest.split(/\s+/);
        return { name, text: text.join(' ') };
    }

    let depth = 0;
    for (let i = 0; i < rest.length; i++) {
        if (rest[i] === '[') {
            depth++;
        } else if (rest[i] === ']') {
            depth--;
            if (depth === 0) {
                return { name: rest.slice(1, i).split('=')[0].trim(), text: rest.slice(i + 1).trim() };
            }
        }
    }
    return { name: rest.slice(1).split('=')[0].trim(), text: '' };
}

function tidy(lines) {
    const paragraphs = [];
    let current = [];

    const flush = () => {
        if (current.length > 0) {
            paragraphs.push(current.join(' '));
            current = [];
        }
    };

    for (const line of lines) {
        const text = line.trim();
        if (text === '') {
            flush();
        } else if (/^(-|\d+\.)\s/.test(text)) {
            // List items stay on their own line
            current.push(`\n${text}`);
        } else {
            current.push(text);
        }
    }
    flush();

    return paragraphs
        .join('\n\n')
        .replace(/ \n/g, '\n')
        .replace(/\s*<br\s*\/?>\s*/g, '\n')
        .replace(/\\([<>])/g, '$1')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function parseTypedefs(source) {
    const typedefs = new Map();

    for (const block of source.match(/\/\*\*[\s\S]*?\*\//g) || []) {
        const lines = block
            .split('\n')
            .map((line) => line.replace(/^\s*\/?\*+\/?\s?/, '').replace(/\s*\*\/\s*$/, ''));

        const typedefLine = lines.find((line) => line.startsWith('@typedef'));
        const typedefMatch = typedefLine && typedefLine.match(/@typedef\s+\{[^}]*\}\s+(\S+)/);
        if (!typedefMatch) {
            continue;
        }

        const properties = [];
        let property = null;

        for (const line of lines.slice(lines.indexOf(typedefLine) + 1)) {
            const propertyMatch = line.match(/^@property\s+\{([^}]*)\}\s*(.*)$/);
            if (propertyMatch) {
                const { name, text } = splitNameAndText(propertyMatch[2].trim());
                property = { name, type: stripPrefix(propertyMatch[1].trim()), lines: [text] };
                properties.push(property);
            } else if (line.startsWith('@')) {
                // @example and other tags end the description
                property = null;
            } else if (property) {
                property.lines.push(line);
            }
        }

        typedefs.set(stripPrefix(typedefMatch[1]), properties.map((entry) => ({
            name: entry.name,
            type: entry.type,
            description: tidy(entry.lines)
        })));
    }

    return typedefs;
}

function collect(typedefs, typedefName, prefix, ownerDescription, out) {
    for (const property of typedefs.get(typedefName) || []) {
        const path = `${prefix}${property.name}`;
        if (NOT_A_SETTING.has(path)) {
            continue;
        }
        const description = ownerDescription && property.description
            ? `${ownerDescription}\n\n${property.name}: ${property.description}`
            : property.description || ownerDescription;

        if (description) {
            out[path] = description;
        }
        if (typedefs.has(property.type)) {
            const passDown = SHARED_TYPEDEFS.has(property.type) ? property.description : '';
            collect(typedefs, property.type, `${path}.`, passDown, out);
        }
    }
}

const typedefs = parseTypedefs(readFileSync(SOURCE, 'utf8'));
if (!typedefs.has(ROOT_TYPEDEF)) {
    throw new Error(`Typedef ${ROOT_TYPEDEF} not found in ${SOURCE}`);
}

const descriptions = {};
collect(typedefs, ROOT_TYPEDEF, '', '', descriptions);

const body = Object.entries(descriptions)
    .map(([path, text]) => `    ${JSON.stringify(path)}:\n        ${JSON.stringify(text)}`)
    .join(',\n\n');

writeFileSync(TARGET, `/**
 * Setting descriptions, keyed by setting path.
 *
 * GENERATED FILE - do not edit. It is extracted from the JSDoc in src/core/Settings.js by
 * tools/generate-settings-descriptions.mjs. Change the JSDoc and run the script again.
 */

const SETTINGS_DESCRIPTIONS = {

${body}
};

export default SETTINGS_DESCRIPTIONS;
`);

console.log(`Wrote ${Object.keys(descriptions).length} descriptions to ${TARGET}`);
