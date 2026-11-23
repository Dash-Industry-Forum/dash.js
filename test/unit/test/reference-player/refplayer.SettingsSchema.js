/**
 * Tests for the Reference Player SettingsSchema.
 *
 * The schema is derived from the real dash.js default settings, so these tests also guard the
 * overrides file: an override that points at a setting that no longer exists, or a setting whose
 * control type cannot be inferred and has no override, fails here.
 */

import Settings from '../../../../src/core/Settings.js';
import SETTINGS_OVERRIDES from '../../../../samples/dash-if-reference-player/app/data/settingsOverrides.js';
import SETTINGS_DESCRIPTIONS from '../../../../samples/dash-if-reference-player/app/data/settingsDescriptions.js';
import SETTINGS_PRESETS from '../../../../samples/dash-if-reference-player/app/data/settingsPresets.js';
import {
    buildCategories,
    buildSchema,
    cloneValue,
    diffSettings,
    formatDefault,
    formatValue,
    getValueAtPath,
    inferType,
    isSameValue,
    listLeaves,
    matchesQuery,
    parseInput,
    parseUrlValue,
    setValueAtPath,
    SETTING_TYPES,
    toJsLiteral,
    validateValue
} from '../../../../samples/dash-if-reference-player/app/js/SettingsSchema.js';

import { expect } from 'chai';

describe('Reference Player - SettingsSchema', function () {

    const context = {};
    let defaults, schema, byPath;

    beforeEach(function () {
        const settings = Settings(context).getInstance();
        settings.reset();
        defaults = cloneValue(settings.get());
        schema = buildSchema(defaults, SETTINGS_OVERRIDES, { 'streaming.buffer': 'Buffer related settings' });
        byPath = new Map(schema.map((descriptor) => [descriptor.path, descriptor]));
    });

    describe('schema built from the dash.js defaults', function () {

        it('should hold one descriptor for every leaf setting', function () {
            const leafPaths = listLeaves(defaults).map(([path]) => path);
            expect(schema.map((descriptor) => descriptor.path)).to.deep.equal(leafPaths);
            expect(schema.length).to.be.greaterThan(150);
        });

        it('should infer the control type from the default value', function () {
            expect(byPath.get('streaming.cacheInitSegments').type).to.equal(SETTING_TYPES.BOOLEAN);
            expect(byPath.get('streaming.buffer.bufferTimeDefault').type).to.equal(SETTING_TYPES.NUMBER);
            expect(byPath.get('streaming.delay.liveDelay').type).to.equal(SETTING_TYPES.NUMBER);
            expect(byPath.get('streaming.defaultSchemeIdUri.role').type).to.equal(SETTING_TYPES.STRING);
            expect(byPath.get('streaming.cmcd.includeInRequests').type).to.equal(SETTING_TYPES.LIST);
        });

        it('should not need the JSON fallback for any setting without an explicit override', function () {
            const fallbacks = schema
                .filter((descriptor) => descriptor.type === SETTING_TYPES.JSON)
                .filter((descriptor) => !SETTINGS_OVERRIDES.types[descriptor.path])
                .map((descriptor) => descriptor.path);
            expect(fallbacks, 'add these to "types" in settingsOverrides.js').to.deep.equal([]);
        });

        it('should have every override point at an existing setting', function () {
            const overridePaths = [
                ...Object.keys(SETTINGS_OVERRIDES.types),
                ...Object.keys(SETTINGS_OVERRIDES.options),
                ...SETTINGS_OVERRIDES.common
            ];
            const missing = overridePaths.filter((path) => !byPath.has(path));
            expect(missing).to.deep.equal([]);
        });

        it('should list the default of every enum setting among its options', function () {
            for (const descriptor of schema.filter((entry) => entry.type === SETTING_TYPES.ENUM)) {
                const values = descriptor.options.map((option) => option.value);
                expect(values, descriptor.path).to.include(descriptor.defaultValue);
            }
        });

        it('should mark numbers and strings without a default value as "empty means default"', function () {
            expect(byPath.get('streaming.delay.liveDelay').emptyIsDefault).to.be.true;
            expect(byPath.get('streaming.cmcd.rtp').emptyIsDefault).to.be.true;
            expect(byPath.get('streaming.cmcd.sid').emptyIsDefault).to.be.true;
            expect(byPath.get('streaming.buffer.bufferTimeDefault').emptyIsDefault).to.be.false;
        });

        it('should flag the common settings', function () {
            const common = schema.filter((descriptor) => descriptor.common).map((descriptor) => descriptor.path);
            expect(common).to.have.members(SETTINGS_OVERRIDES.common);
        });

        it('should file every description under a setting or a parent of one', function () {
            const paths = schema.map((descriptor) => descriptor.path);
            const misplaced = Object.keys(SETTINGS_DESCRIPTIONS)
                .filter((key) => !paths.some((path) => path === key || path.startsWith(`${key}.`)));

            expect(misplaced.join(', ')).to.equal('');
        });

        it('should describe capabilities and scheduling settings with their own text', function () {
            const described = new Map(buildSchema(defaults, SETTINGS_OVERRIDES, SETTINGS_DESCRIPTIONS)
                .map((descriptor) => [descriptor.path, descriptor.description]));

            expect(described.get('streaming.capabilities.useMediaCapabilitiesApi')).to.contain('MediaCapabilities');
            expect(described.get('streaming.scheduling.scheduleWhilePaused')).to.contain('paused');
            expect(described.get('streaming.capabilities.useMediaCapabilitiesApi'))
                .to.not.equal(SETTINGS_DESCRIPTIONS['streaming.capabilities']);
        });

        it('should leave a setting without its own description empty instead of using its parent\'s', function () {
            const described = buildSchema({ streaming: { buffer: { documented: 1, undocumented: 2 } } }, {}, {
                'streaming.buffer': 'Buffer related settings',
                'streaming.buffer.documented': 'Own text'
            });

            expect(described.map((descriptor) => descriptor.description)).to.deep.equal(['Own text', '']);
        });

        it('should only use settings that exist in every preset', function () {
            for (const preset of SETTINGS_PRESETS) {
                const missing = listLeaves(preset.settings).map(([path]) => path).filter((path) => !byPath.has(path));
                expect(missing, preset.id).to.deep.equal([]);
            }
        });
    });

    describe('categories', function () {

        it('should derive category and group from the setting path', function () {
            expect(byPath.get('streaming.cacheInitSegments')).to.include({
                key: 'cacheInitSegments', categoryId: 'general', categoryPath: 'streaming', group: ''
            });
            expect(byPath.get('streaming.buffer.stallThreshold')).to.include({
                key: 'stallThreshold', categoryId: 'buffer', categoryPath: 'streaming.buffer', group: ''
            });
            expect(byPath.get('streaming.abr.rules.bolaRule.active')).to.include({
                key: 'active', categoryId: 'abr', group: 'rules.bolaRule'
            });
            expect(byPath.get('debug.logLevel')).to.include({ categoryId: 'debug', categoryPath: 'debug', group: '' });
            expect(byPath.get('errors.recoverAttempts.mediaErrorDecode')).to.include({
                categoryId: 'errors', group: 'recoverAttempts'
            });
        });

        it('should put General first and sort the rest by label', function () {
            const categories = buildCategories(schema, SETTINGS_OVERRIDES.categoryLabels);
            const labels = categories.map((category) => category.label);

            expect(labels[0]).to.equal('General');
            expect(labels.slice(1)).to.deep.equal([...labels.slice(1)].sort((a, b) => a.localeCompare(b)));
            expect(labels).to.include.members(['ABR', 'Buffer', 'CMCD', 'Live Catchup', 'UTC Synchronization']);
        });

        it('should assign every setting to exactly one category', function () {
            const categories = buildCategories(schema, SETTINGS_OVERRIDES.categoryLabels);
            const total = categories.reduce((sum, category) => sum + category.settings.length, 0);
            expect(total).to.equal(schema.length);
        });
    });

    describe('inferType()', function () {

        it('should return null for values without an obvious control', function () {
            expect(inferType(null)).to.be.null;
            expect(inferType([])).to.be.null;
            expect(inferType([{ key: 'a' }])).to.be.null;
        });

        it('should treat NaN as a number', function () {
            expect(inferType(NaN)).to.equal(SETTING_TYPES.NUMBER);
        });
    });

    describe('parseInput()', function () {

        it('should parse numbers and reject text', function () {
            const descriptor = byPath.get('streaming.buffer.bufferTimeDefault');
            expect(parseInput(descriptor, '12.5')).to.deep.equal({ ok: true, value: 12.5 });
            expect(parseInput(descriptor, 'abc').ok).to.be.false;
            expect(parseInput(descriptor, '').ok).to.be.false;
        });

        it('should turn an empty number into the default when the default is NaN or null', function () {
            const liveDelay = parseInput(byPath.get('streaming.delay.liveDelay'), '');
            expect(liveDelay.ok).to.be.true;
            expect(liveDelay.value).to.be.NaN;
            expect(parseInput(byPath.get('streaming.cmcd.rtp'), '')).to.deep.equal({ ok: true, value: null });
        });

        it('should turn an empty string into null when the default is null', function () {
            expect(parseInput(byPath.get('streaming.cmcd.sid'), '')).to.deep.equal({ ok: true, value: null });
            expect(parseInput(byPath.get('streaming.cmcd.sid'), 'abc')).to.deep.equal({ ok: true, value: 'abc' });
            expect(parseInput(byPath.get('streaming.defaultSchemeIdUri.viewpoint'), ''))
                .to.deep.equal({ ok: true, value: '' });
        });

        it('should parse booleans and nullable booleans', function () {
            expect(parseInput(byPath.get('streaming.cacheInitSegments'), true)).to.deep.equal({ ok: true, value: true });
            const fastSwitch = byPath.get('streaming.buffer.fastSwitchEnabled');
            expect(parseInput(fastSwitch, 'true').value).to.be.true;
            expect(parseInput(fastSwitch, 'false').value).to.be.false;
            expect(parseInput(fastSwitch, 'null').value).to.be.null;
        });

        it('should keep the type of an enum value', function () {
            expect(parseInput(byPath.get('debug.logLevel'), '4')).to.deep.equal({ ok: true, value: 4 });
            expect(parseInput(byPath.get('streaming.cmcd.mode'), 'headers')).to.deep.equal({ ok: true, value: 'headers' });
            expect(parseInput(byPath.get('debug.logLevel'), '9').ok).to.be.false;
        });

        it('should split a comma-separated list', function () {
            expect(parseInput(byPath.get('streaming.cmcd.includeInRequests'), ' segment, mpd ,,license '))
                .to.deep.equal({ ok: true, value: ['segment', 'mpd', 'license'] });
        });

        it('should validate JSON', function () {
            const targets = byPath.get('streaming.cmcd.eventTargets');
            expect(parseInput(targets, '[{"url": "https://example.com"}]'))
                .to.deep.equal({ ok: true, value: [{ url: 'https://example.com' }] });
            expect(parseInput(targets, '[{"url": "x",}]').ok).to.be.false;
            expect(parseInput(targets, '{"url": "x"}').ok).to.be.false;
            expect(parseInput(targets, '"text"').ok).to.be.false;
        });

        it('should refuse read-only settings', function () {
            const descriptor = byPath.get('streaming.capabilities.supportedEssentialProperties');
            expect(descriptor.type).to.equal(SETTING_TYPES.READONLY);
            expect(parseInput(descriptor, '[]').ok).to.be.false;
        });
    });

    describe('parseUrlValue()', function () {

        it('should keep a string that looks like a number or boolean as a string', function () {
            expect(parseUrlValue(byPath.get('streaming.cmcd.sid'), '12345')).to.deep.equal({ ok: true, value: '12345' });
            expect(parseUrlValue(byPath.get('streaming.cmcd.sid'), 'true')).to.deep.equal({ ok: true, value: 'true' });
        });

        it('should only accept spelled-out booleans', function () {
            const jumpGaps = byPath.get('streaming.gaps.jumpGaps');
            expect(parseUrlValue(jumpGaps, 'false')).to.deep.equal({ ok: true, value: false });
            expect(parseUrlValue(jumpGaps, 'yes').ok).to.be.false;
            const fastSwitch = byPath.get('streaming.buffer.fastSwitchEnabled');
            expect(parseUrlValue(fastSwitch, 'null')).to.deep.equal({ ok: true, value: null });
            expect(parseUrlValue(fastSwitch, 'maybe').ok).to.be.false;
        });

        it('should parse numbers, enums, lists and JSON like parseInput()', function () {
            expect(parseUrlValue(byPath.get('streaming.buffer.stallThreshold'), '0.5'))
                .to.deep.equal({ ok: true, value: 0.5 });
            expect(parseUrlValue(byPath.get('streaming.buffer.stallThreshold'), 'abc').ok).to.be.false;
            expect(parseUrlValue(byPath.get('debug.logLevel'), '4')).to.deep.equal({ ok: true, value: 4 });
            expect(parseUrlValue(byPath.get('streaming.cmcd.includeInRequests'), 'segment,mpd'))
                .to.deep.equal({ ok: true, value: ['segment', 'mpd'] });
            expect(parseUrlValue(byPath.get('streaming.cmcd.eventTargets'), '{"url":"x"}').ok).to.be.false;
        });
    });

    describe('validateValue()', function () {

        it('should accept values of the setting\'s type', function () {
            expect(validateValue(byPath.get('streaming.gaps.jumpGaps'), false).ok).to.be.true;
            expect(validateValue(byPath.get('streaming.buffer.fastSwitchEnabled'), null).ok).to.be.true;
            expect(validateValue(byPath.get('streaming.buffer.stallThreshold'), 0.5).ok).to.be.true;
            expect(validateValue(byPath.get('streaming.cmcd.sid'), '12345').ok).to.be.true;
            expect(validateValue(byPath.get('debug.logLevel'), 4)).to.deep.equal({ ok: true, value: 4 });
            expect(validateValue(byPath.get('streaming.cmcd.includeInRequests'), ['segment']).ok).to.be.true;
            expect(validateValue(byPath.get('streaming.cmcd.eventTargets'), [{ url: 'x' }]).ok).to.be.true;
        });

        it('should reject values of another type', function () {
            expect(validateValue(byPath.get('streaming.gaps.jumpGaps'), 'false').ok).to.be.false;
            expect(validateValue(byPath.get('streaming.buffer.fastSwitchEnabled'), 1).ok).to.be.false;
            expect(validateValue(byPath.get('streaming.buffer.stallThreshold'), '0.5').ok).to.be.false;
            expect(validateValue(byPath.get('streaming.cmcd.sid'), 12345).ok).to.be.false;
            expect(validateValue(byPath.get('debug.logLevel'), '4').ok).to.be.false;
            expect(validateValue(byPath.get('streaming.cmcd.includeInRequests'), [1]).ok).to.be.false;
            expect(validateValue(byPath.get('streaming.cmcd.eventTargets'), 'x').ok).to.be.false;
            expect(validateValue(byPath.get('streaming.capabilities.supportedEssentialProperties'), []).ok).to.be.false;
        });

        it('should read null as the default when the default is null or NaN', function () {
            expect(validateValue(byPath.get('streaming.delay.liveDelay'), null).value).to.be.NaN;
            expect(validateValue(byPath.get('streaming.cmcd.sid'), null)).to.deep.equal({ ok: true, value: null });
            expect(validateValue(byPath.get('streaming.buffer.stallThreshold'), null).ok).to.be.false;
        });
    });

    describe('formatValue() and formatDefault()', function () {

        it('should show NaN and null as an empty field', function () {
            expect(formatValue(byPath.get('streaming.delay.liveDelay'), NaN)).to.equal('');
            expect(formatValue(byPath.get('streaming.cmcd.rtp'), null)).to.equal('');
            expect(formatValue(byPath.get('streaming.cmcd.sid'), null)).to.equal('');
        });

        it('should round-trip every editable default through its control text', function () {
            for (const descriptor of schema) {
                if (descriptor.type === SETTING_TYPES.READONLY || descriptor.type === SETTING_TYPES.BOOLEAN) {
                    continue;
                }
                const result = parseInput(descriptor, formatValue(descriptor, descriptor.defaultValue));
                expect(result.ok, descriptor.path).to.be.true;
                expect(isSameValue(result.value, descriptor.defaultValue), descriptor.path).to.be.true;
            }
        });

        it('should describe defaults in words where the raw value says little', function () {
            expect(formatDefault(byPath.get('streaming.delay.liveDelay'))).to.equal('NaN (empty)');
            expect(formatDefault(byPath.get('streaming.buffer.fastSwitchEnabled'))).to.equal('Auto (null)');
            expect(formatDefault(byPath.get('debug.logLevel'))).to.equal('WARNING (3)');
            expect(formatDefault(byPath.get('streaming.cmcd.includeInRequests'))).to.equal('segment, mpd, license');
            expect(formatDefault(byPath.get('streaming.buffer.stallThreshold'))).to.equal('0.3');
        });
    });

    describe('value helpers', function () {

        it('should treat NaN as equal to NaN but not to null', function () {
            expect(isSameValue(NaN, NaN)).to.be.true;
            expect(isSameValue(NaN, null)).to.be.false;
            expect(isSameValue(['a', 'b'], ['a', 'b'])).to.be.true;
            expect(isSameValue(['a', 'b'], ['b', 'a'])).to.be.false;
            expect(isSameValue([{ a: 1 }], [{ a: 1 }])).to.be.true;
        });

        it('should keep NaN when cloning', function () {
            expect(cloneValue({ a: { b: NaN } }).a.b).to.be.NaN;
        });

        it('should read and write nested paths', function () {
            const obj = setValueAtPath({}, 'streaming.buffer.stallThreshold', 0.5);
            expect(obj).to.deep.equal({ streaming: { buffer: { stallThreshold: 0.5 } } });
            expect(getValueAtPath(obj, 'streaming.buffer.stallThreshold')).to.equal(0.5);
            expect(getValueAtPath(obj, 'streaming.missing.key')).to.be.undefined;
        });

        it('should not write through a path that reaches a prototype', function () {
            for (const path of ['__proto__.polluted', 'constructor.prototype.polluted', 'streaming.__proto__.polluted']) {
                expect(setValueAtPath({}, path, true)).to.deep.equal({});
            }
            expect({}.polluted).to.be.undefined;
        });

        it('should diff only the leaves that changed', function () {
            const current = cloneValue(defaults);
            current.streaming.buffer.stallThreshold = 0.5;
            current.streaming.cmcd.includeInRequests = ['segment'];
            expect(diffSettings(current, defaults)).to.deep.equal({
                streaming: { buffer: { stallThreshold: 0.5 }, cmcd: { includeInRequests: ['segment'] } }
            });
            expect(diffSettings(defaults, defaults)).to.deep.equal({});
        });

        it('should match every term of a query against path and description', function () {
            const descriptor = { path: 'streaming.gaps.enableStallFix', description: 'Seeks when playback stalled.' };
            expect(matchesQuery(descriptor, 'stall')).to.be.true;
            expect(matchesQuery(descriptor, 'GAPS seeks')).to.be.true;
            expect(matchesQuery(descriptor, 'stall buffer')).to.be.false;
            expect(matchesQuery(descriptor, '  ')).to.be.true;
        });

        it('should write strings that parse back to the same value', function () {
            const value = {
                'needs-quotes': 'first\nsecond',
                tricky: ['it\'s', 'say "hi"', 'back\\slash', 'tab\there', 'quote after backslash \\"', '\u2028']
            };
            const literal = toJsLiteral(value);

            expect(new Function(`return ${literal};`)()).to.deep.equal(value);
        });

        it('should format a settings object as a JavaScript literal', function () {
            const literal = toJsLiteral({
                streaming: { delay: { liveDelay: 4 }, cmcd: { includeInRequests: ['segment', 'mpd'], sid: 'it\'s' } },
                debug: { logLevel: 5 }
            });
            expect(literal).to.equal([
                '{',
                '    streaming: {',
                '        delay: {',
                '            liveDelay: 4',
                '        },',
                '        cmcd: {',
                '            includeInRequests: [\'segment\', \'mpd\'],',
                '            sid: \'it\\\'s\'',
                '        }',
                '    },',
                '    debug: {',
                '        logLevel: 5',
                '    }',
                '}'
            ].join('\n'));
            expect(toJsLiteral({})).to.equal('{}');
        });
    });
});
