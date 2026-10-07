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
import Debug from '../../core/Debug.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import {
    C2PA_METHOD_AUTO, C2PA_METHOD_MANIFEST_BOX, C2PA_METHOD_VSI, normalizeC2paOptions, SEGMENT_KIND_INIT
} from './C2paOptions.js';
import C2paSequenceTracker, { MAX_REPORTED_MISSING_SEGMENTS, SEQUENCE_OK } from './C2paSequenceTracker.js';
const STATUS_VALID = 'valid';
const STATUS_INVALID = 'invalid';
const STATUS_MISSING = 'missing';
const STATUS_UNVERIFIED = 'unverified';
const STATUS_CONTINUITY_INVALID = 'continuityInvalid';
const STATUS_CONTINUITY_UNSUPPORTED = 'continuityUnsupported';

const CONTINUITY_METHOD_INVALID_CODE = 'livevideo.continuityMethod.invalid';
const CONTINUITY_METHOD_UNSUPPORTED_CODE = 'livevideo.continuityMethod.unsupported';
const MANIFEST_BOX_CONTINUITY_CODES = [
    CONTINUITY_METHOD_INVALID_CODE,
    CONTINUITY_METHOD_UNSUPPORTED_CODE
];

// dash.js-side diagnostic codes (not CML codes).
// Emitted when a forced method does not match a segment's actual structure.
const FORCED_METHOD_MISMATCH_CODE = 'c2pa.forcedMethodMismatch';
// Emitted when the runtime lacks a secure context / Web Crypto.
const CRYPTO_UNAVAILABLE_CODE = 'c2pa.cryptoUnavailable';
// Emitted when the validation engine throws unexpectedly.
const VALIDATION_ERROR_CODE = 'c2pa.validationError';
// Emitted once per session when the validation engine fails to load.
const ENGINE_UNAVAILABLE_CODE = 'c2pa.engineUnavailable';

/**
 * Guarded dynamic import of the validation engine. Keeps `@svta/cml-c2pa` out of both
 * default bundles; a rejection is caught by the caller and reported once via
 * {@link ENGINE_UNAVAILABLE_CODE}.
 * @returns {Promise<Object>}
 */
function loadC2paEngine() {
    return import('@svta/cml-c2pa');
}

/**
 * Whether Web Crypto is usable. Browsers only expose `crypto.subtle` in secure contexts,
 * so its presence covers both the "no secure context" and "no Web Crypto" cases.
 * @returns {boolean}
 */
function _defaultCryptoAvailable() {
    return typeof globalThis !== 'undefined' && !!(globalThis.crypto && globalThis.crypto.subtle);
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
 * @param {Object} [config.detector] A {@link module:C2paDetector} used in `auto` mode to
 * classify each media segment. When the method is forced the detector is skipped.
 * @param {function(): boolean} [config.isCryptoAvailable] Reports whether Web Crypto is
 * usable; defaults to a real secure-context check. Injectable for testing.
 * @param {function(): number} [config.now] Clock used for `SegmentRecord.timestamp`;
 * defaults to `Date.now`. Injectable for testing.
 */
function C2paValidationCoordinator(config) {
    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus || EventBus(context).getInstance();
    const settings = config.settings;
    const loadEngine = config.loadEngine || loadC2paEngine;
    const detector = config.detector;
    const isCryptoAvailable = config.isCryptoAvailable || _defaultCryptoAvailable;
    const now = config.now || Date.now;

    let instance,
        logger,
        trackStates,
        sequenceTracker,
        activeTrackKeyByMediaType,
        initPromises,
        enginePromise,
        engineErrorReported;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        trackStates = {};
        sequenceTracker = C2paSequenceTracker(context).create();
        activeTrackKeyByMediaType = {};
        initPromises = {};
        enginePromise = null;
        engineErrorReported = false;
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
        _resetAbandonedTrackOnSwitch(segmentInput);
        if (segmentInput.kind === SEGMENT_KIND_INIT) {
            const promise = _handleInitSegment(segmentInput);
            initPromises[segmentInput.trackKey] = promise;
            return promise;
        }
        return _handleMediaSegmentAfterInit(segmentInput);
    }

    /**
     * The scanner forwards each segment without awaiting the previous one, so a track's
     * first media segment can arrive and be handled while that track's own init segment is
     * still being classified (dynamic import + crypto work). Awaiting the init's own promise
     * here — if one was seen for this track — guarantees `trackStates[trackKey]` is populated
     * (session keys, method, etc.) before a media segment reads it, closing that race.
     */
    async function _handleMediaSegmentAfterInit(input) {
        const pendingInit = initPromises[input.trackKey];
        if (pendingInit) {
            await pendingInit;
        }
        return _handleMediaSegment(input);
    }

    /**
     * ABR can switch the active representation of a media type at any time; each
     * representation has its own independent sequence/manifest-id chain, so a track that
     * goes idle while a sibling representation is playing is not a continuity break — it's
     * simply not being observed. Reset the abandoned track's continuity state on switch so
     * resuming it later starts a fresh baseline instead of reporting a false gap.
     */
    function _resetAbandonedTrackOnSwitch(input) {
        const previousTrackKey = activeTrackKeyByMediaType[input.mediaType];
        if (previousTrackKey && previousTrackKey !== input.trackKey) {
            resetSequenceForTrack(previousTrackKey);
        }
        activeTrackKeyByMediaType[input.mediaType] = input.trackKey;
    }

    async function _handleInitSegment(input) {
        if (!isCryptoAvailable()) {
            // Without Web Crypto we cannot validate; keep the track active (skip:false)
            // so its media segments surface as `unverified` rather than being dropped.
            trackStates[input.trackKey] = {
                method: null,
                sessionKeys: [],
                manifestId: null,
                issuer: null,
                hasC2pa: false,
                skip: false,
                sequenceState: undefined,
                lastManifestId: null,
                manifestBoxState: undefined
            };
            _emitInitProcessed(input, null, null, [CRYPTO_UNAVAILABLE_CODE]);
            return;
        }

        const engine = await _getEngine();
        if (!engine && !engineErrorReported) {
            // Once per session, not once per segment.
            engineErrorReported = true;
            _emitError(input, input.segmentNumber, ENGINE_UNAVAILABLE_CODE,
                'The C2PA validation engine failed to load; validation is disabled for this session.');
        }
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
            // The init segment's own manifest is not part of the media-segment
            // previousManifestId chain, so the continuity baseline starts unknown; the
            // first media segment establishes it for the one after it.
            lastManifestId: null,
            manifestBoxState: undefined
        };

        _emitInitProcessed(input, validation, method);
    }

    async function _handleMediaSegment(input) {
        const state = trackStates[input.trackKey];
        if (state && state.skip) {
            // A non-C2PA track in auto mode is never parsed or validated again.
            return;
        }
        const forced = _forcedMethod() !== null;
        const method = _resolveMediaMethod(input, state);

        if (method !== C2PA_METHOD_VSI && method !== C2PA_METHOD_MANIFEST_BOX) {
            return;
        }

        if (!isCryptoAvailable()) {
            // Emit `unverified` rather than calling the engine (which would throw).
            _emitUnverified(input, method, CRYPTO_UNAVAILABLE_CODE, 'Web Crypto is unavailable in this context');
            return;
        }

        if (method === C2PA_METHOD_VSI) {
            await _validateVsiSegment(input, state, forced);
        } else {
            await _validateManifestBoxSegment(input, state, forced);
        }
    }

    /**
     * Emits a validated media record, sequence-checking the signed number on a `valid`
     * record only: a forged number on a failed one must never drive the gap loop below.
     */
    function _emitValidatedWithSequence(input, record) {
        const sequenceNumber = record.segmentNumber;
        if (record.status === STATUS_VALID && typeof sequenceNumber === 'number' && !isNaN(sequenceNumber)) {
            const sequence = sequenceTracker.check(input.trackKey, sequenceNumber);
            if (sequence.missingCount > MAX_REPORTED_MISSING_SEGMENTS) {
                _emitSegmentValidated(_sequenceRecord(input, STATUS_MISSING, record.method, NaN, sequence.missingCount));
            } else {
                sequence.missing.forEach((missingNumber) => {
                    _emitSegmentValidated(_sequenceRecord(input, STATUS_MISSING, record.method, missingNumber));
                });
            }
            if (sequence.status !== SEQUENCE_OK) {
                record = Object.assign({}, record, { status: sequence.status });
            }
        }
        _emitSegmentValidated(record);
    }

    function _sequenceRecord(input, status, method, segmentNumber, missingCount) {
        return _createSegmentRecord({
            segmentNumber,
            mediaType: input.mediaType,
            method: method || null,
            status,
            missingCount: missingCount || null
        });
    }

    /**
     * The default {@link module:C2paEvents.SegmentRecord} shape; each builder below only
     * overrides the fields it actually has.
     */
    function _createSegmentRecord(overrides) {
        return Object.assign({
            segmentNumber: NaN,
            mediaType: null,
            method: null,
            status: null,
            keyId: null,
            hash: null,
            manifestId: null,
            issuer: null,
            previousManifestId: null,
            errorCodes: [],
            missingCount: null,
            timestamp: now()
        }, overrides);
    }

    /**
     * Resolves which method validates a media segment. A forced method skips the detector;
     * in `auto` mode, a track already classified from its init trusts that classification,
     * and the detector only runs when there's none to trust.
     * @returns {?string}
     */
    function _resolveMediaMethod(input, state) {
        const forced = _forcedMethod();
        if (forced) {
            return forced;
        }
        if (state && state.method) {
            return state.method;
        }
        if (detector && typeof detector.detect === 'function') {
            return detector.detect(input).method;
        }
        return null;
    }

    async function _validateVsiSegment(input, state, forced) {
        const engine = await _getEngine();
        if (!engine || typeof engine.validateC2paSegment !== 'function') {
            return;
        }

        const sessionKeys = state ? state.sessionKeys : [];
        const sequenceState = state ? state.sequenceState : undefined;

        let outcome;
        try {
            outcome = await engine.validateC2paSegment(input.bytes, sessionKeys, sequenceState);
        } catch (e) {
            // Never propagate a validation failure to the pipeline; surface it instead.
            _emitUnverified(input, C2PA_METHOD_VSI, VALIDATION_ERROR_CODE, _errorMessage(e));
            return;
        }

        if (!outcome) {
            // No C2PA emsg box. Under a forced method this is a mismatch; in auto mode the
            // segment simply carries no VSI provenance.
            if (forced) {
                _emitSegmentValidated(_forcedMismatchRecord(input, C2PA_METHOD_VSI));
            }
            return;
        }

        if (state) {
            state.sequenceState = outcome.nextSequenceState;
        }
        _emitValidatedWithSequence(input, _toVsiSegmentRecord(input, outcome.result, state));
    }

    async function _validateManifestBoxSegment(input, state, forced) {
        const engine = await _getEngine();
        if (!engine || typeof engine.validateC2paManifestBoxSegment !== 'function') {
            return;
        }

        const lastManifestId = state ? state.lastManifestId : null;
        const manifestBoxState = state ? state.manifestBoxState : undefined;

        let outcome;
        try {
            outcome = await engine.validateC2paManifestBoxSegment(input.bytes, lastManifestId, manifestBoxState);
        } catch (e) {
            // Under a forced method a throw means the forced structure is absent; in auto
            // mode it is an unexpected engine failure surfaced as `unverified`.
            if (forced) {
                _emitSegmentValidated(_forcedMismatchRecord(input, C2PA_METHOD_MANIFEST_BOX));
            } else {
                _emitUnverified(input, C2PA_METHOD_MANIFEST_BOX, VALIDATION_ERROR_CODE, _errorMessage(e));
            }
            return;
        }

        if (!outcome) {
            if (forced) {
                _emitSegmentValidated(_forcedMismatchRecord(input, C2PA_METHOD_MANIFEST_BOX));
            }
            return;
        }

        if (state) {
            state.lastManifestId = outcome.nextManifestId;
            state.manifestBoxState = outcome.nextState;
        }
        _emitValidatedWithSequence(input, _toManifestBoxSegmentRecord(input, outcome));
    }

    function _forcedMismatchRecord(input, method) {
        return _createSegmentRecord({
            segmentNumber: input.segmentNumber,
            mediaType: input.mediaType,
            method,
            status: STATUS_INVALID,
            errorCodes: [FORCED_METHOD_MISMATCH_CODE]
        });
    }

    function _toManifestBoxSegmentRecord(input, outcome) {
        const result = outcome.result;
        const errorCodes = _mapErrorCodes(result.errorCodes);
        return _createSegmentRecord({
            segmentNumber: _sequenceNumberOf(result, input),
            mediaType: input.mediaType,
            method: C2PA_METHOD_MANIFEST_BOX,
            status: _manifestBoxStatus(result.isValid, errorCodes),
            hash: result.bmffHashHex,
            manifestId: outcome.nextManifestId,
            issuer: result.issuer,
            previousManifestId: result.previousManifestId,
            errorCodes
        });
    }

    function _manifestBoxStatus(isValid, errorCodes) {
        if (isValid) {
            return STATUS_VALID;
        }
        const isContinuityOnly = errorCodes.length > 0 &&
            errorCodes.every((code) => MANIFEST_BOX_CONTINUITY_CODES.indexOf(code) !== -1);
        if (!isContinuityOnly) {
            return STATUS_INVALID;
        }
        return errorCodes.indexOf(CONTINUITY_METHOD_UNSUPPORTED_CODE) !== -1
            ? STATUS_CONTINUITY_UNSUPPORTED
            : STATUS_CONTINUITY_INVALID;
    }

    function _toVsiSegmentRecord(input, result, state) {
        return _createSegmentRecord({
            segmentNumber: _sequenceNumberOf(result, input),
            mediaType: input.mediaType,
            method: C2PA_METHOD_VSI,
            status: result.isValid ? STATUS_VALID : STATUS_INVALID,
            keyId: result.kidHex,
            hash: result.bmffHashHex,
            manifestId: result.manifestId,
            issuer: state ? state.issuer : null,
            errorCodes: _mapErrorCodes(result.errorCodes)
        });
    }

    async function _validateInit(engine, bytes) {
        if (!engine || typeof engine.validateC2paInitSegment !== 'function') {
            return null;
        }
        try {
            return await engine.validateC2paInitSegment(bytes);
        } catch (e) {
            // The common case (a plain, never-signed stream); debug level, see README.md.
            logger.debug('No usable C2PA data in this init segment:', _errorMessage(e));
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
        if (!settings) {
            return C2PA_METHOD_AUTO;
        }
        const streaming = settings.get().streaming;
        return normalizeC2paOptions(streaming && streaming.c2pa).method;
    }

    function _emitInitProcessed(input, validation, method, errorCodes) {
        const payload = {
            trackKey: input.trackKey,
            method,
            manifestId: validation ? validation.manifestId : null,
            issuer: _issuerOf(validation),
            sessionKeyCount: validation && validation.sessionKeys ? validation.sessionKeys.length : 0,
            isValid: validation ? validation.isValid : false,
            errorCodes: errorCodes || _mapErrorCodes(validation ? validation.errorCodes : [])
        };
        eventBus.trigger(MediaPlayerEvents.C2PA_INIT_PROCESSED, payload, { mediaType: input.mediaType });
    }

    function _emitSegmentValidated(record) {
        eventBus.trigger(MediaPlayerEvents.C2PA_SEGMENT_VALIDATED, record, { mediaType: record.mediaType });
    }

    function _emitUnverified(input, method, errorCode, message) {
        _emitSegmentValidated(_createSegmentRecord({
            segmentNumber: input.segmentNumber,
            mediaType: input.mediaType,
            method: method || null,
            status: STATUS_UNVERIFIED,
            errorCodes: [errorCode]
        }));
        _emitError(input, input.segmentNumber, errorCode, message);
    }

    function _emitError(input, segmentNumber, errorCode, message) {
        eventBus.trigger(MediaPlayerEvents.C2PA_ERROR, {
            trackKey: input.trackKey,
            segmentNumber,
            mediaType: input.mediaType,
            errorCodes: [errorCode],
            message,
            timestamp: Date.now()
        }, { mediaType: input.mediaType });
    }

    function _errorMessage(error) {
        return error && error.message ? error.message : String(error);
    }

    function _issuerOf(validation) {
        const manifest = validation ? validation.manifest : null;
        return manifest && manifest.signatureInfo ? manifest.signatureInfo.issuer : null;
    }

    // The authoritative sequence number is the one carried in the signed segment; the
    // URL-derived number is only a fallback (it may be a time value for some packagers).
    function _sequenceNumberOf(result, input) {
        return result && typeof result.sequenceNumber === 'number' ? result.sequenceNumber : input.segmentNumber;
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
            enginePromise = Promise.resolve().then(() => loadEngine()).catch((e) => {
                logger.error('Failed to load the C2PA validation engine (@svta/cml-c2pa):', e);
                return null;
            });
        }
        return enginePromise;
    }

    /**
     * Clears all per-track state. Called on teardown / source change so a new stream
     * never inherits a previous one's state (they can share a filename-derived trackKey).
     */
    function reset() {
        trackStates = {};
        sequenceTracker.reset();
        activeTrackKeyByMediaType = {};
        initPromises = {};
        enginePromise = null;
        engineErrorReported = false;
    }

    /**
     * Resets every currently active track's sequence state (one per media type). Called
     * on seek / period change so the jump doesn't read as a replay, reorder or gap.
     */
    function resetActiveSequences() {
        Object.keys(activeTrackKeyByMediaType).forEach((mediaType) => {
            resetSequenceForTrack(activeTrackKeyByMediaType[mediaType]);
        });
    }

    /**
     * Clears the sequence and continuity state of a single track; the track's
     * classification and session keys are kept.
     * @param {string} trackKey
     */
    function resetSequenceForTrack(trackKey) {
        sequenceTracker.resetForTrack(trackKey);
        const state = trackStates[trackKey];
        if (state) {
            state.sequenceState = undefined;
            state.manifestBoxState = undefined;
            state.lastManifestId = null;
        }
    }

    instance = {
        handleSegment,
        reset,
        resetActiveSequences,
        resetSequenceForTrack
    };

    setup();

    return instance;
}

C2paValidationCoordinator.__dashjs_factory_name = 'C2paValidationCoordinator';
export default FactoryMaker.getClassFactory(C2paValidationCoordinator);
