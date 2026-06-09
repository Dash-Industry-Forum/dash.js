import DefenseRegistry, {
    isValidExtendedManifest,
    getCycleIndexBySegmentIndex,
    getCycleIndexByPlaybackTime
} from '../../../../src/dodge/DefenseRegistry.js';
import Debug from '../../../../src/core/Debug.js';

import { expect } from 'chai';

function makeValidManifest() {
    return {
        start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
        streams: [{
            label: 'video_1000k',
            init: [{ range: '-855' }],
            data: [
                { index: 0, range: '-43999' }, // cycle 0, partial, non-padding
                { index: 0, range: '44000-', buffer: true }, // cycle 1, non-padding
                { index: 1, buffer: true }, // cycle 2, non-padding
            ]
        }]
    };
}

describe('DefenseRegistry', function () {

    // isValidExtendedManifest

    describe('isValidExtendedManifest', function () {

        it('null, false', function () {
            expect(isValidExtendedManifest(null)).to.be.false; // jshint ignore:line
        });

        it('missing start, false', function () {
            expect(isValidExtendedManifest({ streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: true }] }] })).to.be.false; // jshint ignore:line
        });

        it('missing start.mpd, false', function () {
            expect(isValidExtendedManifest({ start: { base_uri: 'https://x.com/' }, streams: [] })).to.be.false; // jshint ignore:line
        });

        it('missing start.base_uri, false', function () {
            expect(isValidExtendedManifest({ start: { mpd: '<MPD/>' }, streams: [] })).to.be.false; // jshint ignore:line
        });

        it('dynamic MPD, false', function () {
            const m = {
                start: { mpd: '<MPD type="dynamic"/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('missing streams, false', function () {
            expect(isValidExtendedManifest({ start: { mpd: '<MPD/>', base_uri: 'https://x.com/' } })).to.be.false; // jshint ignore:line
        });

        it('stream missing label, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with valid period (non-negative integer), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: 0, init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream with period = null (absent), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: null, init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream with negative period, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: -1, init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with non-integer period, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: 1.5, init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with numeric string period, coerced to integer, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: '2', init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
            expect(m.streams[0].period).to.equal(2); // coerced in place
        });

        it('stream with non-numeric string period, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', period: 'abc', init: [{}], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream missing init (data-only stream), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream missing data (init-only stream), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream with both init and data absent, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a' }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with empty init and empty data, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [], data: [] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with empty init array (self-initializing stream), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [], data: [{ index: 0, range: '0-999' }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream with empty data array (init-only stream), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-499' }], data: [] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with non-string range, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: 123 }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with range start > end, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '100-50' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle buffer flag on non-last cycle is allowed (per-run termination)', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: true }, { range: '100-199', buffer: true }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle buffer flag on last cycle only, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99' }, { range: '100-199', buffer: true }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycles with no buffer flags at all, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99' }, { range: '100-199' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with array buffer, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: [0] }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with buffer string "true", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: 'true' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with buffer string "false", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: 'false' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with non-parseable string buffer, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: 'yes' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with non-boolean buffer (number), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: 1 }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with padding = true, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', padding: true }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with padding string "true", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', padding: 'true' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with padding string "false", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', padding: 'false' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('init cycle with non-parseable string padding, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', padding: 'yes' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with non-boolean padding (number), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', padding: 1 }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('init cycle with non-string range (number), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: 99 }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = [0, 2] (array of non-negative integers), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0 }, { index: 1 }, { index: 2, buffer: [0, 2] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with buffer = [] (empty array), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: [] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with buffer = [1, -1] (negative index in array), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: [1, -1] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = [1.5] (non-integer in array), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: [1.5] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = ["abc"] (non-numeric in array), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: ['abc'] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = [5] referencing unseen index, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: [5] }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = [0, 3] where index 3 has not appeared, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [
                    { index: 0 },
                    { index: 1, buffer: [0, 3] }
                ] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer string "true", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: 'true' }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with buffer string "false", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: 'false' }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with non-parseable string buffer, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: 'yes' }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with buffer = 1 (number), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: 1 }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with negative index, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: -1, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });


        it('data cycle with non-integer index, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 1.5, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with string integer index, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: '0', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with non-numeric string index, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 'abc', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with non-string range, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, range: 123, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with range start > end, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, range: '500-100', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with valid range, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, range: '0-999', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with padding = true, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: true }, { index: 0, padding: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with padding = false, true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, padding: false, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with padding string "true", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, buffer: true }, { index: 0, padding: 'true' }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with padding string "false", true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, padding: 'false', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with non-boolean padding, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, padding: 1, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with non-parseable string padding, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, padding: 'yes', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with quality = string (representation id), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: 'video_500k', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with quality = 0 (non-negative integer), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with quality = 2 (positive integer), true', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: 2, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('data cycle with quality = "3" (numeric string), true and kept as string (treated as representation ID), warning emitted', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: '3', buffer: true }] }]
            };
            const warnings = [];
            const logger = { warn: (msg) => warnings.push(msg), info: () => {}, debug: () => {}, error: () => {} };
            expect(isValidExtendedManifest(m, logger)).to.be.true; // jshint ignore:line
            // Numeric strings are NOT normalized to numbers - use a JSON number if an index is intended.
            expect(m.streams[0].data[0].quality).to.equal('3');
            // A warning should be emitted to flag the ambiguity.
            const matched = warnings.filter((w) => w.indexOf('quality override resolves to an integer') !== -1);
            expect(matched.length).to.equal(1);
            expect(matched[0]).to.include('3');
            expect(matched[0]).to.include('treating as a representation ID');
        });

        it('data cycle with quality = -1 (negative integer), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: -1, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with quality = 1.5 (non-integer number), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: 1.5, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with quality = "" (empty string), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: '', buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with quality = true (boolean), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: true, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with quality = [] (array), false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, quality: [], buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('valid manifest, true', function () {
            expect(isValidExtendedManifest(makeValidManifest())).to.be.true; // jshint ignore:line
        });

        it('sets stream.maxNoPad to the last non-padding cycle index', function () {
            // data has 3 non-padding cycles (0, 1, 2), maxNoPad should be 2
            const m = makeValidManifest();
            isValidExtendedManifest(m);
            expect(m.streams[0].maxNoPad).to.equal(2);
        });

        it('sets stream.maxNoPad excluding trailing padding cycles', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0, buffer: true }, // cycle 0, non-padding, maxNoPad = 0
                        { index: 1, buffer: true }, // cycle 1, non-padding, maxNoPad = 1
                        { index: 2, padding: true }, // cycle 2, padding, maxNoPad stays 1
                    ]
                }]
            };
            isValidExtendedManifest(m);
            expect(m.streams[0].maxNoPad).to.equal(1);
        });

        it('precomputes cycle.full: last non-padding occurrence of each index is full', function () {
            const m = makeValidManifest();
            // data: [{index:0}, {index:0, buffer:true}, {index:1, buffer:true}]
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false; // index 0, not last occurrence
            expect(data[1].full).to.be.true; // index 0, last occurrence
            expect(data[2].full).to.be.true; // index 1, last occurrence
        });

        it('precomputes cycle.full correctly with interleaved indices', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0, range: '0-100' }, // cycle 0: partial seg 0
                        { index: 1, range: '0-200' }, // cycle 1: partial seg 1
                        { index: 0, range: '100-200', buffer: [0, 1] }, // cycle 2: completes seg 0
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false; // index 0, but cycle 2 also has index 0
            expect(data[1].full).to.be.true; // index 1, last occurrence
            expect(data[2].full).to.be.true; // index 0, last occurrence
        });

        it('precomputes cycle.full: buffer = true forces full even when same index appears later', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0 }, // cycle 0: partial
                        { index: 0, buffer: true }, // cycle 1: buffer forces full
                        { index: 0 }, // cycle 2: partial (repeat)
                        { index: 0, buffer: true }, // cycle 3: buffer forces full
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false;
            expect(data[1].full).to.be.true;
            expect(data[2].full).to.be.false;
            expect(data[3].full).to.be.true;
        });

        it('precomputes cycle.full: selective buffer array forces full even when same index appears later', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0 }, // cycle 0: partial
                        { index: 0, buffer: [0] }, // cycle 1: selective buffer forces full
                        { index: 0 }, // cycle 2: partial
                        { index: 0, buffer: true }, // cycle 3: buffer forces full
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false;
            expect(data[1].full).to.be.true;
            expect(data[2].full).to.be.false;
            expect(data[3].full).to.be.true;
        });

        it('precomputes cycle.full: multiple buffer windows each get independent full marks', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0 }, // cycle 0: partial
                        { index: 1 }, // cycle 1: partial
                        { index: 0, buffer: true }, // cycle 2: flush all (window 1)
                        { index: 0 }, // cycle 3: partial (window 2)
                        { index: 1 }, // cycle 4: partial
                        { index: 1, buffer: true }, // cycle 5: flush all (window 2)
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false; // partial in window 1
            expect(data[1].full).to.be.true; // last index 1 before buffer at cycle 2
            expect(data[2].full).to.be.true; // buffer point, last index 0 in window 1
            expect(data[3].full).to.be.true; // last index 0 before buffer at cycle 5
            expect(data[4].full).to.be.false; // partial in window 2
            expect(data[5].full).to.be.true; // buffer point, last index 1 in window 2
        });

        it('precomputes cycle.full: selective buffer only marks target indices, remainder marked at next flush', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0 }, // cycle 0
                        { index: 1 }, // cycle 1
                        { index: 2, buffer: [0] }, // cycle 2: flush only index 0
                        { index: 1, buffer: true }, // cycle 3: flush remaining (1, 2)
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.true; // last index 0 before selective flush at cycle 2
            expect(data[1].full).to.be.false; // index 1 not in [0], stays partial
            expect(data[2].full).to.be.true; // last index 2 before flush at cycle 3
            expect(data[3].full).to.be.true; // last index 1 before flush at cycle 3
        });

        it('precomputes cycle.full: empty buffer array does not force full', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0, buffer: [] }, // cycle 0: empty array = not active
                        { index: 0, buffer: true }, // cycle 1: last occurrence, full
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.false;
            expect(data[1].full).to.be.true;
        });

        it('precomputes cycle.full: padding cycles are never full', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{
                    label: 'a',
                    init: [{}],
                    data: [
                        { index: 0, buffer: true },
                        { index: 1, padding: true },
                        { index: 2, padding: true },
                    ]
                }]
            };
            isValidExtendedManifest(m);
            const data = m.streams[0].data;
            expect(data[0].full).to.be.true;
            expect(data[1].full).to.be.false;
            expect(data[2].full).to.be.false;
        });
    });

    describe('init cycle quality validation and explicit buffer requirement', function () {
        it('rejects init cycle with empty string quality', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ quality: '' }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false;
        });

        it('rejects init cycle with negative integer quality', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ quality: -1 }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false;
        });

        it('rejects init cycle with non-integer number quality', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ quality: 1.5 }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false;
        });

        it('rejects init cycle with non-string, non-number quality', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ quality: true }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false;
        });

        it('accepts init cycle with valid string quality (with explicit buffer flags)', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ buffer: true }, { quality: 'alt', buffer: true }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true;
        });

        it('accepts init cycle with valid numeric quality (with explicit buffer flags)', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ buffer: true }, { quality: 2, buffer: true }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true;
        });

        it('multi-representation init without buffer flags: no default (designer-owned)', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{}, { quality: 'alt' }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true;
            expect(m.streams[0].init[0].buffer).to.be.undefined;
            expect(m.streams[0].init[1].buffer).to.be.undefined;
        });

        it('single primary init group without buffer: defaults buffer: true on last cycle', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{ range: '0-99' }, { range: '100-199' }], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true;
            expect(m.streams[0].init[0].buffer).to.be.undefined;
            expect(m.streams[0].init[1].buffer).to.be.true;
            expect(m.streams[0].init[0].full).to.be.false;
            expect(m.streams[0].init[1].full).to.be.true;
        });

        it('explicit multi-representation init: each buffer-flagged cycle is full', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'x' },
                streams: [{
                    label: 'home',
                    init: [
                        { range: '0-100' },
                        { range: '100-200', buffer: true },
                        { quality: 'alt_a', buffer: true },
                        { quality: 'alt_b', buffer: true }
                    ],
                    data: [{ index: 0, buffer: true }]
                }]
            };
            expect(isValidExtendedManifest(m)).to.be.true;
            const init = m.streams[0].init;
            expect(init[0].full).to.be.false;
            expect(init[1].full).to.be.true;
            expect(init[2].full).to.be.true;
            expect(init[3].full).to.be.true;
            expect(init.length).to.equal(4);
        });
    });

    describe('progressive flag validation', function () {
        function progressiveManifest(data) {
            return {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', progressive: true, init: [{ range: '0-99' }], data }]
            };
        }

        it('stream with progressive = true, true', function () {
            expect(isValidExtendedManifest(progressiveManifest([{ index: 0, buffer: true }]))).to.be.true; // jshint ignore:line
        });

        it('stream with progressive = false, true', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', progressive: false, init: [{}], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });

        it('stream with progressive string "true", coerced to boolean, true', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', progressive: 'true', init: [{}], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
            expect(m.streams[0].progressive).to.equal(true);
        });

        it('stream with progressive string "false", coerced to boolean, true', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', progressive: 'false', init: [{}], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
            expect(m.streams[0].progressive).to.equal(false);
        });

        it('stream with non-boolean progressive (number), false', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', progressive: 1, init: [{}], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('stream with non-parseable string progressive, false', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', progressive: 'yes', init: [{}], data: [{ index: 0, buffer: true }] }] };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('progressive stream with self-contained data (all introduced indices flushed), true', function () {
            expect(isValidExtendedManifest(progressiveManifest([{ index: 0 }, { index: 1, buffer: true }]))).to.be.true; // jshint ignore:line
        });

        it('progressive stream leaving an introduced index unflushed, false', function () {
            // A progressive seed must flush every index it introduces; index 0 is never buffered.
            expect(isValidExtendedManifest(progressiveManifest([{ index: 0 }]))).to.be.false; // jshint ignore:line
        });

        it('progressive stream with empty data (init-only seed), true', function () {
            expect(isValidExtendedManifest(progressiveManifest([]))).to.be.true; // jshint ignore:line
        });

        it('non-progressive counterpart of the same unflushed data is valid (implicit end-of-stream flush)', function () {
            const m = { start: { mpd: '<MPD/>', base_uri: 'x' }, streams: [{ label: 'a', init: [{}], data: [{ index: 0 }] }] };
            expect(isValidExtendedManifest(m)).to.be.true; // jshint ignore:line
        });
    });

    // getCycleIndexBySegmentIndex

    describe('getCycleIndexBySegmentIndex', function () {
        let stream;

        beforeEach(function () {
            // data: [{index: 0}, {index: 0, buffer}, {index: 1, buffer}]
            stream = makeValidManifest().streams[0];
        });

        it('returns the first cycle index for segment 0', function () {
            expect(getCycleIndexBySegmentIndex(stream, 0)).to.equal(0);
        });

        it('returns the first cycle index for segment 1 (skipping earlier cycles for segment 0)', function () {
            // cycles 0 and 1 have index = 0, cycle 2 has index = 1
            expect(getCycleIndexBySegmentIndex(stream, 1)).to.equal(2);
        });

        it('returns -1 when segment index is not in the stream', function () {
            expect(getCycleIndexBySegmentIndex(stream, 99)).to.equal(-1);
        });

        it('skips padding cycles when searching by index', function () {
            const s = {
                data: [
                    { index: 0, padding: true }, // cycle 0, padding, must be skipped
                    { index: 0, buffer: true }, // cycle 1, non-padding, should match
                ]
            };
            expect(getCycleIndexBySegmentIndex(s, 0)).to.equal(1);
        });
    });

    // getCycleIndexByPlaybackTime

    describe('getCycleIndexByPlaybackTime', function () {
        let stream;

        beforeEach(function () {
            stream = makeValidManifest().streams[0];
        });

        it('time 0 with segmentDuration 4, segment index 0, first cycle at position 0', function () {
            expect(getCycleIndexByPlaybackTime(stream, 0, 4)).to.equal(0);
        });

        it('time 5 with segmentDuration 4, segment index 1, first cycle at position 2', function () {
            // floor(5/4) = 1, first non-padding cycle with index 1 is at data[2]
            expect(getCycleIndexByPlaybackTime(stream, 5, 4)).to.equal(2);
        });
    });

    // DefenseRegistry instance

    describe('instance', function () {
        let context, registry;

        beforeEach(function () {
            context = {};
            Debug(context).getInstance();
            registry = DefenseRegistry(context).getInstance();
            registry.reset();
        });

        it('addExtendedManifest with a valid manifest, returns true', function () {
            expect(registry.addExtendedManifest(makeValidManifest())).to.be.true; // jshint ignore:line
        });

        it('addExtendedManifest with null, returns false', function () {
            expect(registry.addExtendedManifest(null)).to.be.false; // jshint ignore:line
        });

        it('getDefendedStreamInfo finds a registered stream by label', function () {
            registry.addExtendedManifest(makeValidManifest());
            const info = registry.getDefendedStreamInfo('video_1000k');
            expect(info).to.exist; // jshint ignore:line
            expect(info.label).to.equal('video_1000k');
        });

        it('getDefendedStreamInfo returns null for an unknown label', function () {
            registry.addExtendedManifest(makeValidManifest());
            expect(registry.getDefendedStreamInfo('unknown')).to.be.null; // jshint ignore:line
        });

        it('reset clears all manifests, getDefendedStreamInfo returns null after reset', function () {
            registry.addExtendedManifest(makeValidManifest());
            registry.reset();
            expect(registry.getDefendedStreamInfo('video_1000k')).to.be.null; // jshint ignore:line
        });

        it('getMaxLabelLength returns 0 when no manifests are loaded', function () {
            expect(registry.getMaxLabelLength()).to.equal(0);
        });

        it('getDefendedStreamInfo with periodIndex, matches stream with matching period field', function () {
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'video_1000k', period: 0, init: [{}], data: [{ index: 0, buffer: true }] },
                    { label: 'video_1000k', period: 1, init: [{}], data: [{ index: 5, buffer: true }] },
                ]
            });
            const p0 = registry.getDefendedStreamInfo('video_1000k', 0);
            expect(p0).to.exist; // jshint ignore:line
            expect(p0.data[0].index).to.equal(0);
            const p1 = registry.getDefendedStreamInfo('video_1000k', 1);
            expect(p1).to.exist; // jshint ignore:line
            expect(p1.data[0].index).to.equal(5);
        });

        it('getDefendedStreamInfo with periodIndex, returns null when no period matches', function () {
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'video_1000k', period: 0, init: [{}], data: [{ index: 0, buffer: true }] },
                ]
            });
            expect(registry.getDefendedStreamInfo('video_1000k', 99)).to.be.null; // jshint ignore:line
        });

        it('getDefendedStreamInfo with periodIndex, stream without period field matches any period', function () {
            registry.addExtendedManifest(makeValidManifest());
            // makeValidManifest() has no period field on the stream.
            const p0 = registry.getDefendedStreamInfo('video_1000k', 0);
            expect(p0).to.exist; // jshint ignore:line
            const p5 = registry.getDefendedStreamInfo('video_1000k', 5);
            expect(p5).to.exist; // jshint ignore:line
        });

        it('getDefendedStreamInfo without periodIndex, matches stream with period field', function () {
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'video_1000k', period: 0, init: [{}], data: [{ index: 0, buffer: true }] },
                ]
            });
            // No periodIndex passed: matches the first label match regardless of period.
            expect(registry.getDefendedStreamInfo('video_1000k')).to.exist; // jshint ignore:line
        });

        it('getMaxLabelLength returns the longest stream label across multiple streams and manifests', function () {
            // First manifest: two streams with labels of different lengths.
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'v', init: [{}], data: [{ index: 0, buffer: true }] }, //  1
                    { label: 'video_mid', init: [{}], data: [{ index: 0, buffer: true }] }, //  9
                ]
            });
            // Second manifest: one stream with an even longer label.
            registry.addExtendedManifest({
                start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                streams: [
                    { label: 'video_very_long_label', init: [{}], data: [{ index: 0, buffer: true }] }, // 21
                ]
            });
            expect(registry.getMaxLabelLength()).to.equal('video_very_long_label'.length);
        });

        describe('progressive append and finalize', function () {
            function addProgressive(data) {
                registry.addExtendedManifest({
                    start: { mpd: '<MPD/>', base_uri: 'https://example.com/' },
                    streams: [{ label: 'video_1000k', progressive: true, init: [{ range: '0-99' }], data }]
                });
            }

            it('appendDataCycles returns false when no stream matches the label', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.appendDataCycles('nope', null, [{ index: 1, buffer: true }])).to.be.false; // jshint ignore:line
            });

            it('appendDataCycles returns false when the stream is not progressive', function () {
                registry.addExtendedManifest(makeValidManifest()); // no progressive flag
                expect(registry.appendDataCycles('video_1000k', null, [{ index: 3, buffer: true }])).to.be.false; // jshint ignore:line
            });

            it('appendDataCycles returns false for an empty batch', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.appendDataCycles('video_1000k', null, [])).to.be.false; // jshint ignore:line
            });

            it('appendDataCycles appends a self-contained batch and returns true', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                expect(registry.appendDataCycles('video_1000k', null, [{ index: 1, buffer: true }])).to.be.true; // jshint ignore:line
                expect(registry.getDefendedStreamInfo('video_1000k').data.length).to.equal(before + 1);
            });

            it('appendDataCycles makes new cycles visible via the live stream reference', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const ref = registry.getDefendedStreamInfo('video_1000k'); // captured before append
                registry.appendDataCycles('video_1000k', null, [{ index: 1, buffer: true }]);
                expect(ref.data[ref.data.length - 1].index).to.equal(1);
            });

            it('appendDataCycles computes full flags over the batch alone', function () {
                addProgressive([{ index: 0, buffer: true }]);
                registry.appendDataCycles('video_1000k', null, [{ index: 1 }, { index: 1, buffer: true }]);
                const data = registry.getDefendedStreamInfo('video_1000k').data;
                // batch [ {1}, {1, buffer} ]: first occurrence not full, last occurrence full
                expect(data[1].full).to.be.false; // jshint ignore:line
                expect(data[2].full).to.be.true; // jshint ignore:line
            });

            it('appendDataCycles updates maxNoPad', function () {
                addProgressive([{ index: 0, buffer: true }]);
                registry.appendDataCycles('video_1000k', null, [{ index: 1, buffer: true }]);
                expect(registry.getDefendedStreamInfo('video_1000k').maxNoPad).to.equal(1);
            });

            it('appendDataCycles rejects a batch that leaves an introduced index unflushed, changing nothing', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                expect(registry.appendDataCycles('video_1000k', null, [{ index: 1 }])).to.be.false; // jshint ignore:line
                expect(registry.getDefendedStreamInfo('video_1000k').data.length).to.equal(before);
            });

            it('appendDataCycles rejects a batch whose buffer array references an index outside the batch, changing nothing', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                // index 0 belongs to the frozen prefix, not this batch
                expect(registry.appendDataCycles('video_1000k', null, [{ index: 1, buffer: [0, 1] }])).to.be.false; // jshint ignore:line
                expect(registry.getDefendedStreamInfo('video_1000k').data.length).to.equal(before);
            });

            it('appendDataCycles rejects a structurally invalid batch, changing nothing', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                expect(registry.appendDataCycles('video_1000k', null, [{ index: -1, buffer: true }])).to.be.false; // jshint ignore:line
                expect(registry.getDefendedStreamInfo('video_1000k').data.length).to.equal(before);
            });

            it('appendDataCycles does not mutate the caller batch buffer array', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const batch = [{ index: 1, buffer: ['1'] }]; // string element coerced internally
                registry.appendDataCycles('video_1000k', null, batch);
                expect(batch[0].buffer[0]).to.equal('1'); // original preserved (clone is coerced, not caller)
            });

            it('finalizeStream returns false when no stream matches the label', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.finalizeStream('nope', null)).to.be.false; // jshint ignore:line
            });

            it('finalizeStream clears the progressive flag and returns true', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.finalizeStream('video_1000k', null)).to.be.true; // jshint ignore:line
                expect(registry.getDefendedStreamInfo('video_1000k').progressive).to.be.false; // jshint ignore:line
            });

            it('finalizeStream appends trailing padding and excludes it from maxNoPad', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.finalizeStream('video_1000k', null, [{ index: 1, padding: true }])).to.be.true; // jshint ignore:line
                const s = registry.getDefendedStreamInfo('video_1000k');
                expect(s.data[s.data.length - 1].padding).to.be.true; // jshint ignore:line
                expect(s.maxNoPad).to.equal(0); // trailing padding excluded
            });

            it('finalizeStream rejects a non-padding trailing cycle, changing nothing', function () {
                addProgressive([{ index: 0, buffer: true }]);
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                expect(registry.finalizeStream('video_1000k', null, [{ index: 1, buffer: true }])).to.be.false; // jshint ignore:line
                const s = registry.getDefendedStreamInfo('video_1000k');
                expect(s.data.length).to.equal(before);
                expect(s.progressive).to.be.true; // still progressive on failure
            });

            it('appendDataCycles returns false after finalizeStream', function () {
                addProgressive([{ index: 0, buffer: true }]);
                registry.finalizeStream('video_1000k', null);
                expect(registry.appendDataCycles('video_1000k', null, [{ index: 1, buffer: true }])).to.be.false; // jshint ignore:line
            });

            it('finalizeStream returns false on a second (double) finalize, changing nothing', function () {
                addProgressive([{ index: 0, buffer: true }]);
                expect(registry.finalizeStream('video_1000k', null, [{ index: 1, padding: true }])).to.be.true; // jshint ignore:line
                const before = registry.getDefendedStreamInfo('video_1000k').data.length;
                expect(registry.finalizeStream('video_1000k', null, [{ index: 2, padding: true }])).to.be.false; // jshint ignore:line
                const s = registry.getDefendedStreamInfo('video_1000k');
                expect(s.data.length).to.equal(before); // no extra padding appended
            });

            it('finalizeStream returns false for a non-progressive (complete) stream', function () {
                // A complete (non-progressive) manifest stream must not be finalizable.
                registry.addExtendedManifest(makeValidManifest()); // no progressive flag
                expect(registry.getDefendedStreamInfo('video_1000k').progressive).to.not.equal(true); // jshint ignore:line
                expect(registry.finalizeStream('video_1000k', null, [{ index: 1, padding: true }])).to.be.false; // jshint ignore:line
            });
        });
    });
});
