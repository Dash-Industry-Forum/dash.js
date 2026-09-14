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

import { resolveNumericSetting } from './StrictMode.js';

let warnedBase = false;
let warnedRandom = false;

/**
 * If this is a Dodge request and `dodge.paddingLengthBase` is non-zero, extend
 * the `padding` query parameter that was already merged into the URL so that
 * the approximate HTTP/1.1 wire size of the request equals
 * `paddingLengthBase + Math.round(Math.random() * paddingLengthRandom)`.
 *
 * Wire size is approximated as: URL length + sum of header char counts
 * for each header. This covers the request line and all headers, capturing the
 * two components that vary across Dodge cycles (URL and Range header length).
 *
 * The URL is resolved against the document before it is measured, so every
 * request is measured on the same footing. A page may hand `attachSource` a
 * relative manifest URL, and that request arrives here written the way the page
 * wrote it. Measuring it as written would leave out the host, which the wire
 * carries in a `Host` header either way, so it would go out shorter than an
 * absolute request padded to the same target.
 *
 * When the Dodge module is loaded, this runs on all requests.
 *
 * @param {Object} commonMediaRequest - The CommonMediaRequest about to be sent.
 * @param {Object} settings - dash.js Settings instance.
 * @param {Object} logger - Logger instance for warnings.
 */
export function applyRequestPadding(commonMediaRequest, settings, logger) {
    const dodgeSettings = settings.get().dodge || {};

    const base = resolveNumericSetting(settings, 'paddingLengthBase');
    if (!base.valid && !warnedBase) {
        logger.warn(base.message + ' - requests will not be padded!');
        warnedBase = true;
    }

    const random = resolveNumericSetting(settings, 'paddingLengthRandom');
    if (!random.valid && !warnedRandom) {
        logger.warn(random.message + ' - requests will be padded to a fixed size');
        warnedRandom = true;
    }

    const paddingLengthBase = base.value;
    const paddingLengthRandom = random.value;

    const queryParam = dodgeSettings.queryParam || 'padding';

    if (paddingLengthBase <= 0) {
        return;
    }

    // Approximate the HTTP/1.1 wire size: URL length (request line) plus all
    // headers. Each header contributes key.length + ': '.length + value.length
    // + '\r\n'.length = key.length + value.length + 4 bytes.
    // Resolve first: a relative URL measured as written omits the host, and
    // `new URL` with no base throws on one outright, which used to skip the
    // padding for that request entirely.
    let resolved;
    try {
        resolved = new URL(commonMediaRequest.url, window.location.href);
    } catch (err) {
        logger.error('Add request padding: cannot resolve ' + commonMediaRequest.url +
            ', request goes out unpadded, ' + (err && err.message ? err.message : err));
        return;
    }

    // A blob: or data: source never leaves the browser, so there is no wire
    // size to normalize - and browsers refuse a blob: URL that carries a query
    // string, so padding it would turn the manifest load into a network error.
    if (resolved.protocol === 'blob:' || resolved.protocol === 'data:') {
        return;
    }

    // HTTPLoader._addPathwayCloningParameters() re-appends request.queryParams
    // on every attempt, so a retried request arrives carrying one copy of the
    // cache-busting parameter per attempt. Collapse them before measuring.
    const current = resolved.searchParams.get(queryParam) || '';
    if (current) {
        resolved.searchParams.set(queryParam, current);
    }

    const resolvedUrl = resolved.toString();
    let size = resolvedUrl.length;
    const headers = commonMediaRequest.headers;
    if (headers) {
        for (const key in headers) {
            const value = headers[key];
            if (value) {
                size += key.length + String(value).length + 4;
            }
        }
    }

    const paddingLength = paddingLengthBase + Math.round(Math.random() * paddingLengthRandom);
    const pad = paddingLength - size;
    if (pad < 0) {
        logger.warn('Add request padding: original request size ' + size + ' exceeds paddingLength ' + paddingLength);
        return;
    }
    if (pad == 0) {
        return;
    }

    // Extend the padding query param in the URL by appending zeros.
    // When the param doesn't already exist (e.g. the manifest request, or an
    // absolute URL that was not built by Dodge), adding it introduces overhead
    // (?key= or &key=) that must be subtracted from the zeros count.
    //
    // The resolved URL is what goes back on the request, so a relative one is
    // rewritten absolute. It addresses the same resource, and it is what the
    // size above was measured from.
    resolved.searchParams.set(queryParam, current);

    const overhead = resolved.toString().length - resolvedUrl.length;
    const zeros = pad - overhead;
    if (zeros <= 0) {
        logger.warn('Add request padding: updated request size ' + size + ' with padding header exceeds paddingLength ' + paddingLength);
        return;
    }
    resolved.searchParams.set(queryParam, current + '0'.repeat(zeros));
    commonMediaRequest.url = resolved.toString();
}
