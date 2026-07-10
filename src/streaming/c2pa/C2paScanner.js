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
import FactoryMaker from '../../core/FactoryMaker.js';
import { HTTPRequest } from '../vo/metrics/HTTPRequest.js';
import { DEFAULT_C2PA_MEDIA_TYPES } from './C2paOptions.js';

const SEGMENT_KIND_INIT = 'init';
const SEGMENT_KIND_MEDIA = 'media';

// dash.js 5.x does not reliably populate the representation id and req.index resets
// per DASH period, so a stable per-representation trackKey and a globally-monotonic
// segment number are derived from the segment URL filename instead.
// The trailing segment number and the leading role prefix (init-/chunk-) are both
// stripped so an init segment and its media segments map to the same trackKey:
//   "init-stream3.m4s"        -> trackKey "stream3", segmentNumber NaN
//   "chunk-stream3-00289.m4s" -> trackKey "stream3", segmentNumber 289
const SEGMENT_EXTENSION_PATTERN = /\.m4s$/;
const TRAILING_SEGMENT_NUMBER_PATTERN = /-(\d+)\.m4s$/;
const SEGMENT_ROLE_PREFIX_PATTERN = /^(?:init|chunk)-/;

/**
 * @typedef {Object} SegmentInput
 * @property {('init'|'media')} kind Whether the chunk is an initialization or a media segment.
 * @property {('video'|'audio')} mediaType Media type of the chunk.
 * @property {Uint8Array} bytes A private copy of the segment bytes, safe to read asynchronously.
 * @property {number} segmentNumber Globally-monotonic segment number from the URL, NaN when absent (init).
 * @property {string} trackKey Stable per-representation key derived from the URL filename.
 */

/**
 * @module C2paScanner
 * @description Thin adapter over the dash.js 5.x public response pipeline. It registers a
 * response interceptor that observes fetched init and media segments, copies their bytes
 * (mandatory: dash.js transfers the original ArrayBuffer to MSE once the handler resolves),
 * normalizes each chunk into a {@link SegmentInput} and forwards it to the injected segment
 * handler. The response is always returned unmodified and the handler is never awaited, so
 * scanning can never alter or block the fetch to MSE path.
 * @param {Object} config
 * @param {Object} config.customParametersModel Exposes addResponseInterceptor / removeResponseInterceptor.
 * @param {function(SegmentInput):*} [config.segmentHandler] Consumer of the normalized chunk.
 * @param {Array.<string>} [config.mediaTypes] Media types to scan; defaults to video and audio.
 */
function C2paScanner(config) {
    config = config || {};
    const customParametersModel = config.customParametersModel;
    const segmentHandler = config.segmentHandler;
    const mediaTypes = Array.isArray(config.mediaTypes) ? config.mediaTypes : DEFAULT_C2PA_MEDIA_TYPES.slice();

    let instance,
        interceptor,
        registered;

    function setup() {
        registered = false;
        interceptor = _interceptResponse;
    }

    /**
     * Registers the response interceptor through the dash.js 5.x public API.
     * Idempotent: a second call while already registered is a no-op.
     */
    function registerInterceptor() {
        if (registered || !customParametersModel) {
            return;
        }
        customParametersModel.addResponseInterceptor(interceptor);
        registered = true;
    }

    /**
     * Teardown: removes the response interceptor through the public API so no scanning
     * hook is left registered. Idempotent when not registered.
     */
    function detach() {
        if (!registered || !customParametersModel) {
            return;
        }
        customParametersModel.removeResponseInterceptor(interceptor);
        registered = false;
    }

    /**
     * @returns {boolean} Whether the interceptor is currently registered.
     */
    function isRegistered() {
        return registered;
    }

    function _interceptResponse(response) {
        try {
            const segmentInput = _toSegmentInput(response);
            if (segmentInput && segmentHandler) {
                _forwardWithoutBlocking(segmentInput);
            }
        } catch (e) {
            // Scanning must never interfere with playback; swallow and deliver the response untouched.
        }
        return Promise.resolve(response);
    }

    function _forwardWithoutBlocking(segmentInput) {
        const result = segmentHandler(segmentInput);
        if (result && typeof result.then === 'function') {
            result.catch(function () {
                // Validation runs off the copied buffer and is never awaited here.
            });
        }
    }

    function _toSegmentInput(response) {
        const request = response && response.request && response.request.customData && response.request.customData.request;
        if (!request || !_hasSegmentBytes(response.data)) {
            return null;
        }

        const kind = _resolveKind(request.type);
        if (!kind) {
            return null;
        }

        const mediaType = request.mediaType;
        if (mediaTypes.indexOf(mediaType) === -1) {
            return null;
        }

        const url = (response.request && response.request.url) || request.url || '';

        return {
            kind,
            mediaType,
            bytes: _copySegmentBytes(response.data),
            segmentNumber: _segmentNumberFromUrl(url),
            trackKey: _trackKeyFromUrl(url)
        };
    }

    function _resolveKind(type) {
        if (type === HTTPRequest.INIT_SEGMENT_TYPE) {
            return SEGMENT_KIND_INIT;
        }
        if (type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            return SEGMENT_KIND_MEDIA;
        }
        return null;
    }

    function _hasSegmentBytes(data) {
        return !!data && typeof data.byteLength === 'number' && data.byteLength > 0;
    }

    /**
     * Copies the segment bytes into a private buffer. This copy is mandatory: dash.js
     * transfers the original ArrayBuffer to MSE after the response handler resolves, which
     * detaches it, so any asynchronous validation must read from an independent copy.
     * @param {ArrayBuffer|Uint8Array} data
     * @returns {Uint8Array}
     */
    function _copySegmentBytes(data) {
        return new Uint8Array(data).slice();
    }

    function _fileNameFromUrl(url) {
        const withoutQuery = url.split('?')[0];
        return withoutQuery.split('/').pop() || '';
    }

    function _trackKeyFromUrl(url) {
        return _fileNameFromUrl(url)
            .replace(TRAILING_SEGMENT_NUMBER_PATTERN, '')
            .replace(SEGMENT_EXTENSION_PATTERN, '')
            .replace(SEGMENT_ROLE_PREFIX_PATTERN, '');
    }

    function _segmentNumberFromUrl(url) {
        const match = _fileNameFromUrl(url).match(TRAILING_SEGMENT_NUMBER_PATTERN);
        return match ? parseInt(match[1], 10) : NaN;
    }

    instance = {
        registerInterceptor,
        detach,
        isRegistered
    };

    setup();

    return instance;
}

C2paScanner.__dashjs_factory_name = 'C2paScanner';
export default FactoryMaker.getClassFactory(C2paScanner);
