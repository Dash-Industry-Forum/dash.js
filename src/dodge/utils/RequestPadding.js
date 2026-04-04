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
 * If this is a Dodge request and `dodge.paddingLengthBase` is non-zero, extend
 * the `padding` query parameter that was already merged into the URL so that
 * the approximate HTTP/1.1 wire size of the request equals
 * `paddingLengthBase + Math.round(Math.random() * paddingLengthRandom)`.
 *
 * Wire size is approximated as: URL length + sum of header char counts
 * for each header. This covers the request line and all headers, capturing the
 * two components that vary across Dodge cycles (URL and Range header length).
 *
 * Only runs when the original FragmentRequest has `queryParams[queryParam]`
 * set, which DodgeDashHandlerOverride._setRequestUrlWithPadding() does for
 * all Dodge requests. Non-Dodge requests are left untouched.
 *
 * @param {Object} commonMediaRequest - The CommonMediaRequest about to be sent.
 * @param {Object} settings - dash.js Settings instance.
 * @param {Object} logger - Logger instance for warnings.
 */
export function applyRequestPadding(commonMediaRequest, settings, logger) {
    const dodgeSettings = settings.get().dodge || {};
    const paddingLengthBase = dodgeSettings.paddingLengthBase || 0;
    const paddingLengthRandom = dodgeSettings.paddingLengthRandom || 0;
    const queryParam = dodgeSettings.queryParam || 'padding';

    if (paddingLengthBase <= 0) {
        return;
    }

    // Only apply to Dodge requests. The original FragmentRequest (before it
    // was converted to a CommonMediaRequest) has queryParams[queryParam] set
    // by DodgeDashHandlerOverride._setRequestUrlWithPadding().
    const originalRequest = commonMediaRequest.customData && commonMediaRequest.customData.request;
    if (!originalRequest || !originalRequest.queryParams || originalRequest.queryParams[queryParam] === undefined) {
        return;
    }

    // Approximate the HTTP/1.1 wire size: URL length (request line) plus all
    // headers. Each header contributes key.length + ': '.length + value.length
    // + '\r\n'.length = key.length + value.length + 4 bytes.
    let size = commonMediaRequest.url.length;
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
        logger.warn('add request padding: request size ' + size + ' exceeds paddingLength ' + paddingLength);
        return;
    }
    if (pad == 0) {
        return;
    }

    // Extend the padding query param already in the URL by appending zeros.
    try {
        const url = new URL(commonMediaRequest.url);
        const current = url.searchParams.get(queryParam) || '';
        url.searchParams.set(queryParam, current + '0'.repeat(pad));
        commonMediaRequest.url = url.toString();
    } catch (e) {
        logger.warn('add request padding: failed to extend URL, ' + e.message);
    }
}
