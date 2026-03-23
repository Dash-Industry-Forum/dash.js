import {normalizeBcp47, ISO_639_2_TO_1} from '../../../../src/streaming/utils/BCP47Utils.js';

import {expect} from 'chai';

describe('BCP47Utils', function () {

    describe('normalizeBcp47', () => {

        // Guard clause: MPD lang attributes may be missing or empty
        it('should return falsy values unchanged', () => {
            expect(normalizeBcp47(null)).to.be.null;
            expect(normalizeBcp47(undefined)).to.be.undefined;
            expect(normalizeBcp47('')).to.equal('');
        });

        // RFC 5646 §2.1.1: language lowercase, script titlecase, region uppercase
        it('should normalize case per RFC 5646', () => {
            expect(normalizeBcp47('EN')).to.equal('en');
            expect(normalizeBcp47('zh-hans')).to.equal('zh-Hans');
            expect(normalizeBcp47('en-us')).to.equal('en-US');
            expect(normalizeBcp47('ZH-hANS-cn')).to.equal('zh-Hans-CN');
        });

        // Numeric regions (UN M.49) and variant subtags must not be altered
        it('should preserve numeric subtags', () => {
            expect(normalizeBcp47('es-419')).to.equal('es-419');
            expect(normalizeBcp47('de-DE-1996')).to.equal('de-DE-1996');
        });

        // ISO 639-2 → 639-1: the core feature dash.js needs (MPDs use 3-letter codes)
        it('should convert ISO 639-2 codes to 639-1, including both B and T variants', () => {
            // 639-2/B (bibliographic) and 639-2/T (terminological)
            expect(normalizeBcp47('fre')).to.equal('fr');
            expect(normalizeBcp47('fra')).to.equal('fr');
            expect(normalizeBcp47('ger')).to.equal('de');
            expect(normalizeBcp47('deu')).to.equal('de');
            expect(normalizeBcp47('spa')).to.equal('es');
            expect(normalizeBcp47('jpn')).to.equal('ja');
            // case-insensitive lookup (MPDs may use uppercase)
            expect(normalizeBcp47('FRE')).to.equal('fr');
        });

        // Unknown codes pass through (private-use or codes without 639-1 equivalent)
        it('should pass through unknown language codes unchanged', () => {
            expect(normalizeBcp47('qtz')).to.equal('qtz');
            expect(normalizeBcp47('und')).to.equal('und');
        });

        // Real-world compound tags from MPDs: 639-2 conversion + case normalization combined
        it('should handle compound tags with 639-2 conversion and case normalization', () => {
            expect(normalizeBcp47('fre-ca')).to.equal('fr-CA');
            expect(normalizeBcp47('SPA-mx')).to.equal('es-MX');
            expect(normalizeBcp47('CHI-hANS-cn')).to.equal('zh-Hans-CN');
        });

        // Object.create(null) guard: lookup must not match prototype properties
        it('should not resolve prototype properties from the lookup table', () => {
            expect(normalizeBcp47('constructor')).to.equal('constructor');
            expect(normalizeBcp47('__proto__')).to.equal('__proto__');
        });
    });

    describe('ISO_639_2_TO_1', () => {

        // Regression guard: detect accidental additions or removals in the table
        it('should contain 202 entries mapping 3-letter to 2-letter codes', () => {
            const entries = Object.entries(ISO_639_2_TO_1);
            expect(entries).to.have.lengthOf(202);
            for (const [key, value] of entries) {
                expect(key).to.match(/^[a-z]{3}$/, `bad key: "${key}"`);
                expect(value).to.match(/^[a-z]{2}$/, `bad value for "${key}": "${value}"`);
            }
        });
    });
});
