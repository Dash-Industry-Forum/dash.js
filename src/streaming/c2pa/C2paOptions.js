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
 * @module C2paOptions
 * @description Defaults and validation for the C2PA scanning options exposed through
 * the `streaming.c2pa` settings. Keeping the canonical defaults and the method
 * validation here lets the scanner and coordinator normalize the operator-provided
 * settings at a single point.
 */

/**
 * Auto-detection: the detection strategy determines C2PA presence and signing method.
 * @constant {string}
 */
export const C2PA_METHOD_AUTO = 'auto';

/**
 * Forced §19.3 per-segment Manifest Box method; detection is skipped.
 * @constant {string}
 */
export const C2PA_METHOD_MANIFEST_BOX = '19.3';

/**
 * Forced §19.4 VSI (COSE_Sign1 in emsg) method; detection is skipped.
 * @constant {string}
 */
export const C2PA_METHOD_VSI = '19.4';

/**
 * Every accepted value of the `method` setting.
 * @constant {Array.<string>}
 */
export const C2PA_METHODS = [C2PA_METHOD_AUTO, C2PA_METHOD_MANIFEST_BOX, C2PA_METHOD_VSI];

/**
 * `SegmentInput.kind` for an initialization segment. The contract between
 * {@link module:C2paScanner} (producer) and {@link module:C2paValidationCoordinator}
 * (consumer).
 * @constant {string}
 */
export const SEGMENT_KIND_INIT = 'init';

/**
 * `SegmentInput.kind` for a media segment.
 * @constant {string}
 */
export const SEGMENT_KIND_MEDIA = 'media';

/**
 * Media types scanned when the operator does not restrict them.
 * @constant {Array.<string>}
 */
export const DEFAULT_C2PA_MEDIA_TYPES = [Constants.VIDEO, Constants.AUDIO];

/**
 * @typedef {Object} C2paOptions
 * @property {boolean} enabled Whether per-segment C2PA scanning is active. Off by default.
 * @property {string} method Signing method setting: 'auto', '19.3' or '19.4'.
 * @property {Array.<string>} mediaTypes Media types the scanner inspects.
 */

/**
 * @param {*} method
 * @returns {boolean} True when the value is one of the accepted `method` settings.
 */
export function isValidC2paMethod(method) {
    return C2PA_METHODS.indexOf(method) !== -1;
}

/**
 * @returns {C2paOptions} A fresh copy of the default C2PA options (scanning disabled).
 */
export function getDefaultC2paOptions() {
    return {
        enabled: false,
        method: C2PA_METHOD_AUTO,
        mediaTypes: DEFAULT_C2PA_MEDIA_TYPES.slice()
    };
}

/**
 * Merges operator-provided values over the defaults and sanitizes them, so downstream
 * code always receives a well-formed {@link C2paOptions}. An unrecognized `method`
 * falls back to 'auto' rather than throwing, keeping scanning non-interfering.
 * @param {Object} [options] Partial options, typically the `streaming.c2pa` settings.
 * @returns {C2paOptions} The normalized options.
 */
export function normalizeC2paOptions(options) {
    const defaults = getDefaultC2paOptions();

    if (!options) {
        return defaults;
    }

    const enabled = typeof options.enabled === 'boolean' ? options.enabled : defaults.enabled;
    const method = isValidC2paMethod(options.method) ? options.method : defaults.method;
    const mediaTypes = Array.isArray(options.mediaTypes) ? options.mediaTypes.slice() : defaults.mediaTypes;

    return {
        enabled,
        method,
        mediaTypes
    };
}
