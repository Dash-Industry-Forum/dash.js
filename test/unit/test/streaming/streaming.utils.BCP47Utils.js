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

        // RFC 5646 never removes regions; CLDR minimization (nl-NL -> nl, en-US -> en) is not BCP 47
        it('should preserve regions', () => {
            expect(normalizeBcp47('nl-NL')).to.equal('nl-NL');
            expect(normalizeBcp47('NLD-nl')).to.equal('nl-NL');
            expect(normalizeBcp47('en-US')).to.equal('en-US');
        });

        // RFC 5646 §4.5 extlang form: extlang subtags keep or get their prefix, no macrolanguage folding
        it('should produce the extlang form', () => {
            expect(normalizeBcp47('zh-cmn')).to.equal('zh-cmn');
            expect(normalizeBcp47('ZH-CMN')).to.equal('zh-cmn');
            expect(normalizeBcp47('cmn')).to.equal('zh-cmn');
            expect(normalizeBcp47('cmn-hans-cn')).to.equal('zh-cmn-Hans-CN');
            expect(normalizeBcp47('zh-cmn-Hans-CN')).to.equal('zh-cmn-Hans-CN');
            expect(normalizeBcp47('yue')).to.equal('zh-yue');
            expect(normalizeBcp47('arb')).to.equal('ar-arb');
            expect(normalizeBcp47('swh')).to.equal('sw-swh');
            expect(normalizeBcp47('ase')).to.equal('sgn-ase');
        });

        it('should replace grandfathered and redundant tags with their preferred value', () => {
            expect(normalizeBcp47('i-klingon')).to.equal('tlh');
            expect(normalizeBcp47('art-lojban')).to.equal('jbo');
            expect(normalizeBcp47('en-GB-oed')).to.equal('en-GB-oxendict');
            expect(normalizeBcp47('no-bok')).to.equal('nb');
            expect(normalizeBcp47('zh-guoyu')).to.equal('zh-cmn');
            expect(normalizeBcp47('zh-min-nan')).to.equal('zh-nan');
            expect(normalizeBcp47('sgn-BE-FR')).to.equal('sgn-sfb');
            expect(normalizeBcp47('sgn-US')).to.equal('sgn-ase');
            // no preferred value
            expect(normalizeBcp47('i-default')).to.equal('i-default');
            expect(normalizeBcp47('zh-min')).to.equal('zh-min');
        });

        it('should replace deprecated language and region subtags', () => {
            expect(normalizeBcp47('iw')).to.equal('he');
            expect(normalizeBcp47('in-ID')).to.equal('id-ID');
            expect(normalizeBcp47('ji')).to.equal('yi');
            expect(normalizeBcp47('mo')).to.equal('ro');
            expect(normalizeBcp47('de-DD')).to.equal('de-DE');
            expect(normalizeBcp47('fr-FX')).to.equal('fr-FR');
        });

        // Valid subtags that CLDR rewrites stay as they are
        it('should not apply CLDR aliases', () => {
            expect(normalizeBcp47('sh')).to.equal('sh');
            expect(normalizeBcp47('sr-Cyrl')).to.equal('sr-Cyrl');
            expect(normalizeBcp47('zh-Hant')).to.equal('zh-Hant');
            expect(normalizeBcp47('en-UK')).to.equal('en-UK');
        });

        // RFC 5646 §2.1.1 casing rules only apply before the first singleton
        it('should lowercase extensions and private use subtags', () => {
            expect(normalizeBcp47('en-u-CA-gregory')).to.equal('en-u-ca-gregory');
            expect(normalizeBcp47('nl-NL-x-AUDIT')).to.equal('nl-NL-x-audit');
            expect(normalizeBcp47('X-Private')).to.equal('x-private');
        });

        // RFC 5646 §4.5: extension sequences ordered by singleton, private use last
        it('should order extensions by singleton', () => {
            expect(normalizeBcp47('en-u-ca-gregory-a-myext-x-foo')).to.equal('en-a-myext-u-ca-gregory-x-foo');
            expect(normalizeBcp47('en-x-b-foo-a-bar')).to.equal('en-x-b-foo-a-bar');
        });

        it('should be idempotent', () => {
            ['zh-cmn-Hans-CN', 'sgn-US', 'en-u-ca-gregory-a-myext-x-foo', 'NLD-nl', 'i-klingon', 'de-DD', 'en--US']
                .forEach(tag => expect(normalizeBcp47(normalizeBcp47(tag))).to.equal(normalizeBcp47(tag)));
        });

        it('should not throw on malformed tags', () => {
            expect(normalizeBcp47('en--us')).to.equal('en--US');
            expect(normalizeBcp47('en-')).to.equal('en-');
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
