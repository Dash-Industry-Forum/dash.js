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
 * Handles:
 * 1. Case normalization per RFC 5646 section 2.1.1
 * 2. ISO 639-2/B and 639-2/T (3-letter) to ISO 639-1 (2-letter) conversion
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

export function normalizeBcp47(tag) {
    if (!tag || typeof tag !== 'string') {
        return tag;
    }
    const parts = tag.split('-');

    // Language: lowercase + ISO 639-2 to 639-1 conversion
    parts[0] = parts[0].toLowerCase();
    parts[0] = ISO_639_2_TO_1[parts[0]] || parts[0];

    for (let i = 1; i < parts.length; i++) {
        if (parts[i].length === 4) {
            // Script: titlecase (e.g. latn -> Latn)
            parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase();
        } else if (parts[i].length === 2 && /^[a-zA-Z]+$/.test(parts[i])) {
            // Region (2 alpha): uppercase (e.g. us -> US)
            parts[i] = parts[i].toUpperCase();
        }
    }

    return parts.join('-');
}
