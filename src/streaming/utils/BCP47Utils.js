/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Lightweight BCP-47 tag normalization.
 *
 * Produces the RFC 5646 section 4.5 canonical tag in "extlang form":
 * 1. Grandfathered and redundant tags replaced by their IANA Preferred-Value
 * 2. Deprecated language and region subtags replaced by their IANA Preferred-Value
 * 3. ISO 639-2/B and 639-2/T (3-letter) to ISO 639-1 (2-letter) conversion (RFC 5646 section 2.2.1)
 * 4. Extended language subtags prefixed with their macrolanguage (e.g. cmn -> zh-cmn)
 * 5. Extension sequences ordered by singleton, private use kept last
 * 6. Case normalization per RFC 5646 section 2.1.1
 *
 * CLDR canonicalization (likely-subtag minimization such as nl-NL -> nl, macrolanguage
 * folding such as zh-cmn -> zh, und -> en) is not part of BCP 47 and deliberately not applied.
 *
 * Replaces the heavy bcp-47-normalize package (~280 KB) which carried
 * a full IANA subtag registry (8039 entries) that dash.js never needed.
 */

/**
 * ISO 639-2 (3-letter) to ISO 639-1 (2-letter) mappings for languages
 * commonly found in broadcast/streaming content (DASH, HLS, DVB).
 * Covers both 639-2/B (bibliographic) and 639-2/T (terminological) codes.
 */
export const ISO_639_2_TO_1 = Object.create(null, Object.getOwnPropertyDescriptors({
    aar: 'aa', abk: 'ab', afr: 'af', aka: 'ak', alb: 'sq', amh: 'am',
    ara: 'ar', arg: 'an', arm: 'hy', asm: 'as', ava: 'av', ave: 'ae',
    aym: 'ay', aze: 'az', bak: 'ba', bam: 'bm', baq: 'eu', bel: 'be',
    ben: 'bn', bis: 'bi', bod: 'bo', bos: 'bs', bre: 'br', bul: 'bg',
    bur: 'my', cat: 'ca', ces: 'cs', cha: 'ch', che: 'ce', chi: 'zh',
    chu: 'cu', chv: 'cv', cor: 'kw', cos: 'co', cre: 'cr', cym: 'cy',
    cze: 'cs', dan: 'da', deu: 'de', div: 'dv', dut: 'nl', dzo: 'dz',
    ell: 'el', eng: 'en', epo: 'eo', est: 'et', eus: 'eu', ewe: 'ee',
    fao: 'fo', fas: 'fa', fij: 'fj', fin: 'fi', fra: 'fr', fre: 'fr',
    fry: 'fy', ful: 'ff', geo: 'ka', ger: 'de', gla: 'gd', gle: 'ga',
    glg: 'gl', glv: 'gv', gre: 'el', grn: 'gn', guj: 'gu', hat: 'ht',
    hau: 'ha', heb: 'he', her: 'hz', hin: 'hi', hmo: 'ho', hrv: 'hr',
    hun: 'hu', hye: 'hy', ibo: 'ig', ice: 'is', ido: 'io', iii: 'ii',
    iku: 'iu', ile: 'ie', ina: 'ia', ind: 'id', ipk: 'ik', isl: 'is',
    ita: 'it', jav: 'jv', jpn: 'ja', kal: 'kl', kan: 'kn', kas: 'ks',
    kat: 'ka', kau: 'kr', kaz: 'kk', khm: 'km', kik: 'ki', kin: 'rw',
    kir: 'ky', kom: 'kv', kon: 'kg', kor: 'ko', kua: 'kj', kur: 'ku',
    lao: 'lo', lat: 'la', lav: 'lv', lim: 'li', lin: 'ln', lit: 'lt',
    ltz: 'lb', lub: 'lu', lug: 'lg', mac: 'mk', mah: 'mh', mal: 'ml',
    mao: 'mi', mar: 'mr', may: 'ms', mkd: 'mk', mlg: 'mg', mlt: 'mt',
    mon: 'mn', mri: 'mi', msa: 'ms', mya: 'my', nau: 'na', nav: 'nv',
    nbl: 'nr', nde: 'nd', ndo: 'ng', nep: 'ne', nld: 'nl', nno: 'nn',
    nob: 'nb', nor: 'no', nya: 'ny', oci: 'oc', oji: 'oj', ori: 'or',
    orm: 'om', oss: 'os', pan: 'pa', per: 'fa', pli: 'pi', pol: 'pl',
    por: 'pt', pus: 'ps', que: 'qu', roh: 'rm', ron: 'ro', rum: 'ro',
    run: 'rn', rus: 'ru', sag: 'sg', san: 'sa', sin: 'si', slk: 'sk',
    slo: 'sk', slv: 'sl', sme: 'se', smo: 'sm', sna: 'sn', snd: 'sd',
    som: 'so', sot: 'st', spa: 'es', sqi: 'sq', srd: 'sc', srp: 'sr',
    ssw: 'ss', sun: 'su', swa: 'sw', swe: 'sv', tah: 'ty', tam: 'ta',
    tat: 'tt', tel: 'te', tgk: 'tg', tgl: 'tl', tha: 'th', tir: 'ti',
    ton: 'to', tsn: 'tn', tso: 'ts', tuk: 'tk', tur: 'tr', twi: 'tw',
    uig: 'ug', ukr: 'uk', urd: 'ur', uzb: 'uz', ven: 've', vie: 'vi',
    vol: 'vo', wel: 'cy', wln: 'wa', wol: 'wo', xho: 'xh', yid: 'yi',
    yor: 'yo', zha: 'za', zho: 'zh', zul: 'zu'
}));

/**
 * IANA Language Subtag Registry: grandfathered and redundant tags that have a Preferred-Value.
 * Grandfathered tags without a Preferred-Value (e.g. i-default, zh-min) are kept as they are.
 */
const TAG_PREFERRED_VALUES = Object.create(null, Object.getOwnPropertyDescriptors({
    'art-lojban': 'jbo', 'en-gb-oed': 'en-GB-oxendict', 'i-ami': 'ami', 'i-bnn': 'bnn', 'i-hak': 'hak',
    'i-klingon': 'tlh', 'i-lux': 'lb', 'i-navajo': 'nv', 'i-pwn': 'pwn', 'i-tao': 'tao', 'i-tay': 'tay',
    'i-tsu': 'tsu', 'no-bok': 'nb', 'no-nyn': 'nn', 'sgn-be-fr': 'sfb', 'sgn-be-nl': 'vgt', 'sgn-ch-de': 'sgg',
    'zh-guoyu': 'cmn', 'zh-hakka': 'hak', 'zh-min-nan': 'nan', 'zh-xiang': 'hsn',
    'sgn-br': 'bzs', 'sgn-co': 'csn', 'sgn-de': 'gsg', 'sgn-dk': 'dsl', 'sgn-es': 'ssp', 'sgn-fr': 'fsl',
    'sgn-gb': 'bfi', 'sgn-gr': 'gss', 'sgn-ie': 'isg', 'sgn-it': 'ise', 'sgn-jp': 'jsl', 'sgn-mx': 'mfs',
    'sgn-ni': 'ncs', 'sgn-nl': 'dse', 'sgn-no': 'nsl', 'sgn-pt': 'psr', 'sgn-se': 'swl', 'sgn-us': 'ase',
    'sgn-za': 'sfs'
}));

/**
 * IANA Language Subtag Registry: deprecated language subtags with a Preferred-Value.
 * ponytail: only the 2-letter ones; add deprecated 3-letter codes if they show up in content
 */
const DEPRECATED_LANGUAGES = Object.create(null, Object.getOwnPropertyDescriptors({
    in: 'id', iw: 'he', ji: 'yi', jw: 'jv', mo: 'ro'
}));

/**
 * IANA Language Subtag Registry: deprecated region subtags with a Preferred-Value.
 */
const DEPRECATED_REGIONS = Object.create(null, Object.getOwnPropertyDescriptors({
    BU: 'MM', DD: 'DE', FX: 'FR', TP: 'TL', YD: 'YE', ZR: 'CD'
}));

/**
 * IANA Language Subtag Registry: extlang subtags and their Prefix, used to produce the extlang form.
 * ponytail: Chinese, Arabic, Malay, Swahili and sign language families only; add other extlangs from the registry if needed
 */
const EXTLANG_PREFIXES = Object.create(null);
[
    ['zh', 'cdo cjy cmn cpx czh czo gan hak hsn lzh mnp nan wuu yue'],
    ['ar', 'acm afb aeb ajp apc apd arb arq ars ary arz ayl'],
    ['ms', 'min zlm zsm'],
    ['sw', 'swc swh'],
    ['sgn', 'ase bfi bzs csn dse dsl fsl gsg gss isg ise jsl mfs ncs nsl psr sfb sfs sgg ssp swl vgt']
].forEach(([prefix, extlangs]) => extlangs.split(' ').forEach(extlang => EXTLANG_PREFIXES[extlang] = prefix));

// Grandfathered and redundant tags, longest match first (zh-min-nan before zh-min)
function _replacePreferredTag(parts) {
    for (let n = Math.min(3, parts.length); n > 1; n--) {
        const preferredValue = TAG_PREFERRED_VALUES[parts.slice(0, n).join('-')];
        if (preferredValue) {
            return preferredValue.toLowerCase().split('-').concat(parts.slice(n));
        }
    }
    return parts;
}

export function normalizeBcp47(tag) {
    if (!tag || typeof tag !== 'string') {
        return tag;
    }
    let parts = _replacePreferredTag(tag.toLowerCase().split('-'));

    // Private use (x-...) and irregular grandfathered tags without Preferred-Value (i-default) stay lowercase
    if (parts[0].length === 1) {
        return parts.join('-');
    }

    // Language: deprecated subtags and ISO 639-2 to 639-1
    parts[0] = DEPRECATED_LANGUAGES[parts[0]] || ISO_639_2_TO_1[parts[0]] || parts[0];

    // Deprecated regions, up to the first singleton
    for (let i = 1; i < parts.length && parts[i].length !== 1; i++) {
        const region = DEPRECATED_REGIONS[parts[i].toUpperCase()];
        if (parts[i].length === 2 && region) {
            parts[i] = region.toLowerCase();
        }
    }

    // The replacements above can produce a redundant tag (sgn-DD -> sgn-DE -> gsg), resolve it in the same call
    parts = _replacePreferredTag(parts);

    // Extlang form (cmn -> zh-cmn)
    if (EXTLANG_PREFIXES[parts[0]]) {
        parts.unshift(EXTLANG_PREFIXES[parts[0]]);
    }

    // Script and region casing applies only up to the first singleton, extension subtags stay lowercase
    let i = 1;
    for (; i < parts.length && parts[i].length !== 1; i++) {
        if (parts[i].length === 4) {
            // Script: titlecase (e.g. latn -> Latn)
            parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
        } else if (parts[i].length === 2 && /^[a-z]+$/.test(parts[i])) {
            // Region (2 alpha): uppercase (e.g. us -> US)
            parts[i] = parts[i].toUpperCase();
        }
    }

    // Extension sequences ordered by singleton, private use sequence kept last
    const privateUseIndex = parts.indexOf('x', i);
    const end = privateUseIndex === -1 ? parts.length : privateUseIndex;
    const extensions = [];
    for (let j = i; j < end; j++) {
        if (parts[j].length === 1) {
            extensions.push([parts[j]]);
        } else {
            extensions[extensions.length - 1].push(parts[j]);
        }
    }
    extensions.sort((a, b) => a[0] < b[0] ? -1 : 1);

    return parts.slice(0, i).concat(...extensions, parts.slice(end)).join('-');
}
