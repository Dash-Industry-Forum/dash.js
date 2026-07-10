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
import EventBus from '../../core/EventBus.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import { C2PA_METHOD_AUTO, C2PA_METHOD_MANIFEST_BOX, C2PA_METHOD_VSI } from './C2paOptions.js';

const SEGMENT_KIND_INIT = 'init';
const STATUS_VALID = 'valid';
const STATUS_INVALID = 'invalid';

/**
 * Guarded dynamic import of the validation engine. Keeps `@svta/cml-c2pa` out of both
 * default bundles (code-split, loaded only when C2PA is enabled). A missing package
 * rejects and is caught by the caller, degrading to no validation rather than breaking.
 * @returns {Promise<Object>}
 */
function loadC2paEngine() {
    return import('@svta/cml-c2pa');
}

/**
 * @module C2paValidationCoordinator
 * @description Owns per-track C2PA state and orchestrates validation. This first slice
 * handles init segments: it validates the init through the CML engine, extracts VSI
 * session keys, classifies the track (§19.4 VSI when session keys are present, §19.3
 * ManifestBox when only a manifest is present, non-C2PA otherwise) and emits
 * {@link MediaPlayerEvents#event:C2PA_INIT_PROCESSED}. In `auto` mode a track whose init
 * carries no C2PA information is marked so its media segments are never parsed or
 * validated (the zero-cost path on plain streams). Media-segment validation is added by
 * later slices.
 * @param {Object} config
 * @param {Object} [config.eventBus] dash.js EventBus; defaults to the per-context singleton.
 * @param {Object} [config.settings] dash.js Settings, read for `streaming.c2pa.method`.
 * @param {function(): Promise<Object>} [config.loadEngine] Loads the CML engine; defaults to
 * the guarded dynamic import. Injectable for testing.
 */
function C2paValidationCoordinator(config) {
    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus || EventBus(context).getInstance();
    const settings = config.settings;
    const loadEngine = config.loadEngine || loadC2paEngine;

    let instance,
        trackStates,
        enginePromise;

    function setup() {
        trackStates = {};
        enginePromise = null;
    }

    /**
     * Entry point invoked by the scanner for every normalized segment.
     * @param {import('./C2paScanner.js').SegmentInput} segmentInput
     * @returns {Promise<void>}
     */
    function handleSegment(segmentInput) {
        if (!segmentInput) {
            return Promise.resolve();
        }
        if (segmentInput.kind === SEGMENT_KIND_INIT) {
            return _handleInitSegment(segmentInput);
        }
        return _handleMediaSegment(segmentInput);
    }

    async function _handleInitSegment(input) {
        const engine = await _getEngine();
        const validation = await _validateInit(engine, input.bytes);
        const method = _classify(validation);

        trackStates[input.trackKey] = {
            method,
            sessionKeys: validation ? validation.sessionKeys : [],
            manifestId: validation ? validation.manifestId : null,
            issuer: _issuerOf(validation),
            hasC2pa: method !== null,
            skip: !_forcedMethod() && method === null,
            sequenceState: undefined,
            lastManifestId: validation ? validation.manifestId : null,
            manifestBoxState: undefined
        };

        _emitInitProcessed(input, validation, method);
    }

    async function _handleMediaSegment(input) {
        const state = trackStates[input.trackKey];
        if (state && state.skip) {
            // AC#16: a non-C2PA track in auto mode is never parsed or validated again.
            return;
        }
        if (state && state.method === C2PA_METHOD_VSI) {
            await _validateVsiSegment(input, state);
        } else if (state && state.method === C2PA_METHOD_MANIFEST_BOX) {
            await _validateManifestBoxSegment(input, state);
        }
        // Forced-method routing is implemented by a later slice.
    }

    async function _validateVsiSegment(input, state) {
        const engine = await _getEngine();
        if (!engine || typeof engine.validateC2paSegment !== 'function') {
            return;
        }

        let outcome;
        try {
            outcome = await engine.validateC2paSegment(input.bytes, state.sessionKeys, state.sequenceState);
        } catch (e) {
            // Degradation to `unverified` / C2PA_ERROR is added by the error-handling slice.
            return;
        }

        if (!outcome) {
            // No C2PA emsg box in this segment; forced-method mismatch is handled later.
            return;
        }

        state.sequenceState = outcome.nextSequenceState;
        _emitSegmentValidated(_toVsiSegmentRecord(input, outcome.result, state));
    }

    async function _validateManifestBoxSegment(input, state) {
        const engine = await _getEngine();
        if (!engine || typeof engine.validateC2paManifestBoxSegment !== 'function') {
            return;
        }

        let outcome;
        try {
            outcome = await engine.validateC2paManifestBoxSegment(input.bytes, state.lastManifestId, state.manifestBoxState);
        } catch (e) {
            // Degradation to `unverified` / C2PA_ERROR is added by the error-handling slice.
            return;
        }

        if (!outcome) {
            return;
        }

        state.lastManifestId = outcome.nextManifestId;
        state.manifestBoxState = outcome.nextState;
        _emitSegmentValidated(_toManifestBoxSegmentRecord(input, outcome));
    }

    function _toManifestBoxSegmentRecord(input, outcome) {
        const result = outcome.result;
        return {
            segmentNumber: input.segmentNumber,
            mediaType: input.mediaType,
            method: C2PA_METHOD_MANIFEST_BOX,
            status: result.isValid ? STATUS_VALID : STATUS_INVALID,
            keyId: null,
            hash: result.bmffHashHex,
            manifestId: outcome.nextManifestId,
            issuer: result.issuer,
            previousManifestId: result.previousManifestId,
            errorCodes: _mapErrorCodes(result.errorCodes),
            timestamp: Date.now()
        };
    }

    function _toVsiSegmentRecord(input, result, state) {
        return {
            segmentNumber: input.segmentNumber,
            mediaType: input.mediaType,
            method: C2PA_METHOD_VSI,
            status: result.isValid ? STATUS_VALID : STATUS_INVALID,
            keyId: result.kidHex,
            hash: result.bmffHashHex,
            manifestId: result.manifestId,
            issuer: state.issuer,
            previousManifestId: null,
            errorCodes: _mapErrorCodes(result.errorCodes),
            timestamp: Date.now()
        };
    }

    async function _validateInit(engine, bytes) {
        if (!engine || typeof engine.validateC2paInitSegment !== 'function') {
            return null;
        }
        try {
            return await engine.validateC2paInitSegment(bytes);
        } catch (e) {
            // The init segment carries no C2PA information (or could not be parsed).
            return null;
        }
    }

    function _classify(validation) {
        if (!validation) {
            return null;
        }
        if (validation.sessionKeys && validation.sessionKeys.length > 0) {
            return C2PA_METHOD_VSI;
        }
        if (validation.manifest) {
            return C2PA_METHOD_MANIFEST_BOX;
        }
        return null;
    }

    function _forcedMethod() {
        const method = _methodSetting();
        return method === C2PA_METHOD_MANIFEST_BOX || method === C2PA_METHOD_VSI ? method : null;
    }

    function _methodSetting() {
        if (!settings || typeof settings.get !== 'function') {
            return C2PA_METHOD_AUTO;
        }
        const streaming = settings.get().streaming;
        const c2pa = streaming && streaming.c2pa;
        return c2pa && c2pa.method ? c2pa.method : C2PA_METHOD_AUTO;
    }

    function _emitInitProcessed(input, validation, method) {
        const payload = {
            trackKey: input.trackKey,
            method,
            manifestId: validation ? validation.manifestId : null,
            issuer: _issuerOf(validation),
            sessionKeyCount: validation && validation.sessionKeys ? validation.sessionKeys.length : 0,
            isValid: validation ? validation.isValid : false,
            errorCodes: _mapErrorCodes(validation ? validation.errorCodes : [])
        };
        eventBus.trigger(MediaPlayerEvents.C2PA_INIT_PROCESSED, payload, { mediaType: input.mediaType });
    }

    function _emitSegmentValidated(record) {
        eventBus.trigger(MediaPlayerEvents.C2PA_SEGMENT_VALIDATED, record, { mediaType: record.mediaType });
    }

    function _issuerOf(validation) {
        const manifest = validation ? validation.manifest : null;
        return manifest && manifest.signatureInfo ? manifest.signatureInfo.issuer : null;
    }

    /**
     * Narrows CML's LiveVideoStatusCode / C2paStatusCode enums to a stable string union at
     * this single mapping point, so dash.js exposes stable codes regardless of CML's enums.
     * @param {Array} codes
     * @returns {Array.<string>}
     */
    function _mapErrorCodes(codes) {
        return (codes || []).map((code) => String(code));
    }

    function _getEngine() {
        if (!enginePromise) {
            enginePromise = Promise.resolve().then(() => loadEngine()).catch(() => null);
        }
        return enginePromise;
    }

    function reset() {
        trackStates = {};
        enginePromise = null;
    }

    instance = {
        handleSegment,
        reset
    };

    setup();

    return instance;
}

C2paValidationCoordinator.__dashjs_factory_name = 'C2paValidationCoordinator';
export default FactoryMaker.getClassFactory(C2paValidationCoordinator);
