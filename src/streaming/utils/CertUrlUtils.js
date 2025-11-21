/**
 * Utility functions for DASH Certurl normalization.
 * Shared by ContentProtection parsing and MediaPlayer.addCertUrls API.
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

export default {
    normalizeCertUrls,
    dedupeCertUrls
};
