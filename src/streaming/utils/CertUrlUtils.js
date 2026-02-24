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
 * Utility functions for DASH Certurl normalization.
 * Shared by ContentProtection parsing and protData handling.
 *
 * A Certurl entry may appear as:
 *  - String: 'https://example.com/cert'
 *  - Object parsed from XML: { __text: 'https://example.com/cert', '@certType': 'primary' }
 *  - Pre-normalized object: { url: 'https://example.com/cert', certType: 'primary' }
 *  - Array of any of the above
 *
 * The normalization returns an array of objects: { url: string, certType: string|null }
 * Empty or invalid entries are filtered out. Whitespace is trimmed.
 */
function normalizeCertUrls(raw) {
    if (!raw) { return []; }
    const arr = Array.isArray(raw) ? raw : [raw];
    return arr.map(item => {
        if (!item) { return null; }
        if (typeof item === 'string') {
            const url = item.trim();
            return url ? { url, certType: null } : null;
        }
        if (typeof item === 'object') {
            let url = (item.__text || item.text || '').trim();
            if (!url && typeof item.url === 'string') { // fallback if pre-normalized
                url = item.url.trim();
            }
            let certType = item.certType || item['@certType'] || null;
            if (certType && typeof certType === 'string') {
                certType = certType.trim();
                if (certType === '') { certType = null; }
            } else {
                certType = null;
            }
            return url ? { url, certType } : null;
        }
        return null;
    }).filter(Boolean);
}

/**
 * Deduplicates an array of Certurl descriptor objects by URL + certType combination.
 * Keeps first occurrence order stable.
 * @param {Array<{url:string, certType:string|null}>} list
 * @returns {Array<{url:string, certType:string|null}>}
 */
function dedupeCertUrls(list) {
    if (!Array.isArray(list) || list.length === 0) { return []; }
    const seen = new Set();
    const result = [];
    for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (!item || !item.url) { continue; }
        const key = item.url + '||' + (item.certType || '');
        if (seen.has(key)) { continue; }
        seen.add(key);
        result.push(item);
    }
    return result;
}

/**
 * Iterates over a ProtectionDataSet object and normalizes & deduplicates any certUrls arrays in-place.
 * Returns the same object reference for convenience.
 * @param {Object} protData - keySystem -> config object
 * @returns {Object} protData
 */
function sanitizeProtectionDataCertUrls(protData) {
    if (protData && typeof protData === 'object') {
        Object.keys(protData).forEach(keySystem => {
            const entry = protData[keySystem];
            if (entry && Array.isArray(entry.certUrls)) {
                entry.certUrls = dedupeCertUrls(normalizeCertUrls(entry.certUrls));
            }
        });
    }
    return protData;
}

export default {
    normalizeCertUrls,
    dedupeCertUrls,
    sanitizeProtectionDataCertUrls
};
