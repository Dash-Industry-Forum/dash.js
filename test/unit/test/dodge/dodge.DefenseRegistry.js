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

        it('init cycle buffer flag on non-last cycle, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{ range: '0-99', buffer: true }, { range: '100-199' }], data: [{ index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
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

        it('data cycle with non-sequential index, false', function () {
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 1, buffer: true }, { index: 0, buffer: true }] }]
            };
            expect(isValidExtendedManifest(m)).to.be.false; // jshint ignore:line
        });

        it('data cycle with skipped bytes in a partial range sequence, false', function () {
            // First cycle covers 0-99; second starts at 200, skipping 100-199.
            const m = {
                start: { mpd: '<MPD/>', base_uri: 'https://x.com/' },
                streams: [{ label: 'a', init: [{}], data: [{ index: 0, range: '0-99' }, { index: 0, range: '200-299', buffer: true }] }]
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

        it('getDefendedStreamInfo filtered by streamId, returns null when streamId does not match', function () {
            registry.addExtendedManifest(makeValidManifest(), 'stream-A');
            expect(registry.getDefendedStreamInfo('video_1000k', 'stream-B')).to.be.null; // jshint ignore:line
        });

        it('getDefendedStreamInfo filtered by streamId, returns the entry when streamId matches', function () {
            registry.addExtendedManifest(makeValidManifest(), 'stream-A');
            expect(registry.getDefendedStreamInfo('video_1000k', 'stream-A')).to.exist; // jshint ignore:line
        });

        it('reset clears all manifests, getDefendedStreamInfo returns null after reset', function () {
            registry.addExtendedManifest(makeValidManifest());
            registry.reset();
            expect(registry.getDefendedStreamInfo('video_1000k')).to.be.null; // jshint ignore:line
        });
    });
});
