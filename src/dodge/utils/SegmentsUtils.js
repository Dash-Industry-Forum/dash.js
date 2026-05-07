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
 * URL template utility functions for Dodge.
 *
 * These were present in dash.js v5.0.0's SegmentsUtils.js but were removed in
 * v5.2.0, which consolidated template expansion into a single processUriTemplate()
 * call. Dodge needs the individual functions to implement its URL length
 * padding logic, so they are bundled here.
 */

function zeroPadToLength(numStr, minStrLength) {
    while (numStr.length < minStrLength) {
        numStr = '0' + numStr;
    }
    return numStr;
}

export function unescapeDollarsInTemplate(url) {
    return url ? url.split('$$').join('$') : url;
}

export function replaceIDForTemplate(url, value) {
    if (!value || !url || url.indexOf('$RepresentationID$') === -1) {
        return url;
    }
    let v = value.toString();
    return url.split('$RepresentationID$').join(v);
}

export function countUnpaddedTokenOccurrences(url, token) {
    const formatTag = '%0';

    let found = 0;

    let startPos,
        endPos,
        formatTagPos,
        specifier;

    const tokenLen = token.length;

    if (!url) {
        return found;
    }

    // keep looping round until all instances of <token> have been
    // replaced. once that has happened, startPos below will be -1
    // and the completed url will be returned.
    while (true) {

        // check if there is a valid $<token>...$ identifier
        // if not, return the url as is.
        startPos = url.indexOf('$' + token);
        if (startPos < 0) {
            return found;
        }

        // the next '$' must be the end of the identifier
        // if there isn't one, return the url as is.
        endPos = url.indexOf('$', startPos + tokenLen);
        if (endPos < 0) {
            return found;
        }

        // now see if there is an additional format tag suffixed to
        // the identifier within the enclosing '$' characters
        formatTagPos = url.indexOf(formatTag, startPos + tokenLen);
        if (formatTagPos > startPos && formatTagPos < endPos) {

            specifier = url.charAt(endPos - 1);

            // support the minimum specifiers required by IEEE 1003.1
            // (d, i , o, u, x, and X) for completeness
            switch (specifier) {
                // treat all int types as uint,
                // hence deliberate fallthrough
                case 'd':
                case 'i':
                case 'u':
                    //paddedValue = zeroPadToLength(value.toString(), width);
                    break;
                case 'x':
                    //paddedValue = zeroPadToLength(value.toString(16), width);
                    break;
                case 'X':
                    //paddedValue = zeroPadToLength(value.toString(16), width).toUpperCase();
                    break;
                case 'o':
                    //paddedValue = zeroPadToLength(value.toString(8), width);
                    break;
                default:
                    return found;
            }
        } else {
            //paddedValue = value;
            found += 1;
        }

        url = url.substring(0, startPos) + url.substring(endPos + 1);
    }
}

export function replaceTokenForTemplate(url, token, value) {
    const formatTag = '%0';

    let startPos,
        endPos,
        formatTagPos,
        specifier,
        width,
        paddedValue;

    const tokenLen = token.length;
    const formatTagLen = formatTag.length;

    if (!url) {
        return url;
    }

    // keep looping round until all instances of <token> have been
    // replaced. once that has happened, startPos below will be -1
    // and the completed url will be returned.
    while (true) {

        // check if there is a valid $<token>...$ identifier
        // if not, return the url as is.
        startPos = url.indexOf('$' + token);
        if (startPos < 0) {
            return url;
        }

        // the next '$' must be the end of the identifier
        // if there isn't one, return the url as is.
        endPos = url.indexOf('$', startPos + tokenLen);
        if (endPos < 0) {
            return url;
        }

        // now see if there is an additional format tag suffixed to
        // the identifier within the enclosing '$' characters
        formatTagPos = url.indexOf(formatTag, startPos + tokenLen);
        if (formatTagPos > startPos && formatTagPos < endPos) {

            specifier = url.charAt(endPos - 1);
            width = parseInt(url.substring(formatTagPos + formatTagLen, endPos - 1), 10);

            // support the minimum specifiers required by IEEE 1003.1
            // (d, i , o, u, x, and X) for completeness
            switch (specifier) {
                // treat all int types as uint,
                // hence deliberate fallthrough
                case 'd':
                case 'i':
                case 'u':
                    paddedValue = zeroPadToLength(value.toString(), width);
                    break;
                case 'x':
                    paddedValue = zeroPadToLength(value.toString(16), width);
                    break;
                case 'X':
                    paddedValue = zeroPadToLength(value.toString(16), width).toUpperCase();
                    break;
                case 'o':
                    paddedValue = zeroPadToLength(value.toString(8), width);
                    break;
                default:
                    return url;
            }
        } else {
            paddedValue = value;
        }

        url = url.substring(0, startPos) + paddedValue + url.substring(endPos + 1);
    }
}
