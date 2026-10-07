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

import Constants from '../constants/Constants.js';

/**
 * Which timed text format a track is in, decided the same way when the manifest is
 * filtered and when the samples are parsed.
 */

const ISOBMFF_MIME_TYPE = 'application/mp4';

/**
 * Returns the value of the codecs parameter of a content type such as
 * `application/mp4;codecs="stpp.ttml.im1t"`, or an empty string when there is none.
 * @param {string} contentType
 * @returns {string}
 */
export function getCodecsParameter(contentType) {
    const match = /codecs\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;,]*))/i.exec(contentType || '');
    const value = match ? (match[1] || match[2] || match[3] || '').trim() : '';

    // A manifest without @codecs yields the literal string "undefined" here.
    return value === 'undefined' ? '' : value;
}

/**
 * Returns the timed text format of an ISOBMFF sample entry.
 * @param {string} sampleEntry four-character code, such as 'stpp' or 'wvtt'
 * @returns {string|null} Constants.TTML, Constants.WVTT, or null when unknown
 */
export function getFormatForSampleEntry(sampleEntry) {
    switch (sampleEntry ? sampleEntry.trim().toLowerCase() : '') {
        case Constants.STPP:
            return Constants.TTML;
        case Constants.WVTT:
            return Constants.WVTT;
        default:
            return null;
    }
}

/**
 * Returns the sample entry named by the codecs parameter of an ISOBMFF text track, or an
 * empty string when the track is not in ISOBMFF or names none.
 *
 * Only in ISOBMFF does the codecs parameter name a sample entry. Side-loaded TTML can
 * carry codecs="im1t", which is a TTML profile and says nothing about any sample entry.
 * @param {string} contentType content type with a codecs parameter
 * @param {string} [mimeType] the MIME type, when it is not the start of contentType
 * @returns {string}
 */
function _getSampleEntryFromCodecs(contentType, mimeType) {
    const type = (mimeType || contentType || '').split(';')[0].trim().toLowerCase();
    if (type !== ISOBMFF_MIME_TYPE) {
        return '';
    }
    // RFC 6381 sub-parameters follow the sample entry: stpp.ttml.im1t
    return getCodecsParameter(contentType).split('.')[0];
}

/**
 * Resolves which timed text format a track is in.
 *
 * sampleEntry, read from the stsd of the initialization segment, wins when it is known:
 * it is what the samples are, while the manifest only says what they should be. Next
 * comes the sample entry named by the codecs parameter of an ISOBMFF track, matched in
 * full rather than searched for as a substring. A named sample entry we do not know is
 * not something to guess at - the samples could be anything - so that returns null.
 * Text that names no sample entry, such as a side-loaded file, is known by its MIME type.
 *
 * @param {string} codec content type with a codecs parameter, a codec, or a MIME type
 * @param {string} [mimeType] the MIME type of the track
 * @param {string} [sampleEntry] four-character code from the stsd, when one was read
 * @returns {string|null} Constants.TTML, Constants.WVTT, or null when unknown
 */
export function getTextFormat(codec, mimeType, sampleEntry) {
    const fromSampleEntry = getFormatForSampleEntry(sampleEntry);
    if (fromSampleEntry) {
        return fromSampleEntry;
    }

    const sampleEntryFromCodecs = _getSampleEntryFromCodecs(codec, mimeType);
    if (sampleEntryFromCodecs) {
        return getFormatForSampleEntry(sampleEntryFromCodecs);
    }

    const type = (mimeType || codec || '').toLowerCase();
    if (type.indexOf(Constants.TTML) !== -1) {
        return Constants.TTML;
    }
    if (type.indexOf(Constants.VTT) !== -1) {
        return Constants.WVTT;
    }

    return null;
}

/**
 * Tells whether dash.js can parse the text track a manifest describes, so that a track in
 * a format it does not know is not offered for selection at all.
 *
 * Only an ISOBMFF track that names its sample entry can be judged from the manifest. One
 * that does not is kept: its initialization segment may still say what it is.
 *
 * @param {string} contentType content type with a codecs parameter, as getCodec returns it
 * @returns {boolean}
 */
export function isTextCodecSupported(contentType) {
    const sampleEntry = _getSampleEntryFromCodecs(contentType);
    return !sampleEntry || getFormatForSampleEntry(sampleEntry) !== null;
}
