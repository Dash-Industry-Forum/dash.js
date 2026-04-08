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

import DataChunk from '../streaming/vo/DataChunk.js';
import DashJSError from '../streaming/vo/DashJSError.js';
import Debug from '../core/Debug.js';
import DefenseRegistry from './DefenseRegistry.js';
import DodgeBufferControllerOverride from './overrides/DodgeBufferControllerOverride.js';
import DodgeDashHandlerOverride from './overrides/DodgeDashHandlerOverride.js';
import DodgeErrors from './errors/DodgeErrors.js';
import DodgeEvents from './events/DodgeEvents.js';
import DodgeFetchLoaderOverride from './overrides/DodgeFetchLoaderOverride.js';
import DodgeGapControllerOverride from './overrides/DodgeGapControllerOverride.js';
import DodgeScheduleControllerOverride from './overrides/DodgeScheduleControllerOverride.js';
import DodgeXHRLoaderOverride from './overrides/DodgeXHRLoaderOverride.js';
import Constants from '../streaming/constants/Constants.js';
import FactoryMaker from '../core/FactoryMaker.js';
import EventBus from '../core/EventBus.js';

// ABR rules that are compatible with Dodge's cycle-based download model.
// All built-in rules not in these sets are disabled at module load time.
const SUPPORTED_QUALITY_SWITCH_RULES = new Set(['bolaRule', 'throughputRule', 'insufficientBufferRule', 'switchHistoryRule', 'droppedFramesRule']);
const SUPPORTED_ABANDON_FRAGMENT_RULES = new Set();

/**
 * The main orchestrator for the Dodge module. Dodge is a framework that
 * provides the building blocks for client-side, application-layer video
 * fingerprinting defenses. It does not require any changes to servers or
 * network infrastructures, nor does it need to coordinate with servers.
 * All defense logic is handled within dash.js
 * 
 * Dodge was first described in the PoPETS 2026 paper "Dodge: A Client-Side
 * Framework for Application-Layer Video Fingerprinting Defenses". See the
 * paper and the arXiv technical report "Opt-In Video Fingerprinting
 * Protection in dash.js" for more details.
 *
 * DodgeHandler has the following responsibilities:
 *  1. Register controller overrides (DashHandler, BufferController, and
 *     ScheduleController) and loader overrides.
 *  2. Intercept manifest loading to detect extended manifests (JSON), add them
 *     to the registry, and extract the embedded MPD + base URI.
 *  3. Intercept FRAGMENT_LOADING_COMPLETED and handle Dodge-specific events
 *     to implement partial segment combination and padding requests.
 *  4. Control random walk scheduling after partial segments/padding cycles.
 *  5. Route onPaddingLoaded to buffer controllers for mock buffer updates.
 */
function DodgeHandler(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const settings = config.settings;
    const streamController = config.streamController;
    const mediaPlayer = config.mediaPlayer;

    const debug = Debug(context).getInstance();
    let logger,
        defenseRegistry,
        warnedNegativeScheduleRandom,
        warnedNegativeScheduleBase,
        instance;

    // Per-stream state, keeps track of partial segments and pending events.
    // Key: streamId & Value: { partialSegments, pendingInit, pendingMedia }
    let streamState;

    function setup() {
        logger = debug.getLogger(instance);
        defenseRegistry = DefenseRegistry(context).getInstance();
        warnedNegativeScheduleRandom = false;
        warnedNegativeScheduleBase = false;
        streamState = new Map();
    }

    // ************************************************************************
    // PUBLIC API
    // ************************************************************************

    /**
     * Register controller overrides. Must be called before attachSource() so
     * that stream processors are initialized with the Dodge controllers.
     * Called from MediaPlayer._detectDodge() during attachView().
     */
    function registerExtensions() {
        // Set override to true: we only want to replace specific functions
        // (the ones defined in the Dodge controllers). Others should remain
        // unchanged, as in default dash.js
        mediaPlayer.extend('DashHandler', DodgeDashHandlerOverride, true);
        mediaPlayer.extend('BufferController', DodgeBufferControllerOverride, true);
        mediaPlayer.extend('ScheduleController', DodgeScheduleControllerOverride, true);
        mediaPlayer.extend('GapController', DodgeGapControllerOverride, true);
        mediaPlayer.extend('FetchLoader', DodgeFetchLoaderOverride, true);
        mediaPlayer.extend('XHRLoader', DodgeXHRLoaderOverride, true);
        _applyAbrRules();
    }

    /**
     * Register event listeners.
     *  - FRAGMENT_LOADING_COMPLETED (before FragmentController)
     *  - INIT_FRAGMENT_PARTIAL / MEDIA_FRAGMENT_PARTIAL for scheduling
     *  - PADDING_LOADED for scheduling + buffer controller update
     * Called from MediaPlayer._detectDodge() during attachView().
     */
    function registerEvents() {
        // Set high priority to intercept before FragmentController
        eventBus.on(events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance, { priority: EventBus.EVENT_PRIORITY_HIGH });
        // No special priority needed, these are Dodge-specific events
        eventBus.on(events.INIT_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.on(events.MEDIA_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.on(events.PADDING_LOADED, _onPaddingLoaded, instance);
        // Protection module events (only present if the module is loaded).
        // NEED_KEY fires before ProtectionController creates a key session;
        // intercepting at high priority lets us block DRM in strict mode.
        if (events.NEED_KEY) {
            eventBus.on(events.NEED_KEY, _onNeedKey, instance, { priority: EventBus.EVENT_PRIORITY_HIGH });
        }
        if (events.KEY_SESSION_CREATED) {
            eventBus.on(events.KEY_SESSION_CREATED, _onKeySessionCreated, instance);
        }
    }

    /**
     * Called by ManifestLoader before parsing. If `bytes` is a valid extended
     * manifest JSON, register it with DefenseRegistry and return the embedded
     * MPD string and base URI. If not a valid extended manifest, returns null
     * (graceful degradation). If strict mode 'manifest' is enabled and no
     * defense can be applied, generates and error and returns false to
     * signal an abort to ManifestLoader.
     * @param {string} bytes - Raw response body.
     * @param {string} [url] - Original request URL, included in error messages.
     * @returns {{ mpd: string, baseUri: string }|null|false}
     */
    function tryProcessExtendedManifest(bytes, url) {
        const strict = (settings.get().dodge || {}).strictMode === 'manifest';

        let extended;
        try {
            extended = JSON.parse(bytes);
        } catch (e) {
            if (strict) {
                _triggerStrictModeError(url);
                return false;
            }
            return null; // not valid JSON
        }

        if (!defenseRegistry.addExtendedManifest(extended)) {
            logger.debug('Extended manifest rejected by DefenseRegistry');
            if (strict) {
                _triggerStrictModeError(url);
                return false;
            }
            return null;
        }

        // Check whether the embedded MPD contains DRM content protection
        // elements. DRM license requests may leak identifying information
        // through a channel Dodge cannot intercept, undermining defenses.
        // This is a heuristic check on the raw XML string.
        const mpd = extended['start']['mpd'];
        if (_mpdContainsDrm(mpd)) {
            const strictMode = (settings.get().dodge || {}).strictMode;
            if (strictMode === 'representation' || strictMode === 'manifest') {
                logger.error('Extended manifest contains DRM-protected content, license requests may leak content-identifying information');
                _triggerStrictModeError(url);
                return false;
            } else {
                logger.warn('Extended manifest contains DRM-protected content, license requests may leak content-identifying information');
            }
        }

        // Thumbnail tracks bypass DashHandler (ThumbnailTracks fetches
        // directly via its own XHRLoader). Cycle-based defense does not
        // apply; thumbnail requests could leak content-identifying
        // information and are therefore blocked in strict mode.
        if (_mpdContainsThumbnails(mpd)) {
            const strictMode = (settings.get().dodge || {}).strictMode;
            if (strictMode === 'representation' || strictMode === 'manifest') {
                logger.error('Extended manifest contains thumbnail tracks that bypass Dodge defense');
                _triggerStrictModeError(url);
                return false;
            } else {
                logger.warn('Extended manifest contains thumbnail tracks that bypass Dodge defense');
            }
        }

        return {
            mpd: mpd,
            baseUri: extended['start']['base_uri'],
        };
    }

    function _triggerStrictModeError(url) {
        logger.error('Dodge strict mode is enabled and no valid extended manifest at ' + (url || '(unknown URL)') + ', blocking playback');
        eventBus.trigger(events.INTERNAL_MANIFEST_LOADED, {
            manifest: null,
            error: new DashJSError(
                DodgeErrors.DODGE_STRICT_MODE_ERROR_CODE,
                DodgeErrors.DODGE_STRICT_MODE_ERROR_MESSAGE + (url || '')
            )
        });
    }

    /**
     * Heuristic check whether an MPD XML string contains DRM content
     * protection elements.
     */
    function _mpdContainsDrm(mpd) {
        if (!mpd || typeof mpd !== 'string') {
            return false;
        }
        return mpd.includes('<ContentProtection') ||
            mpd.includes('cenc:') ||
            mpd.includes('urn:mpeg:dash:mp4protection') ||
            mpd.includes('urn:uuid:'); // PSSH system ID URNs
    }

    /**
     * Heuristic check whether an MPD XML string contains thumbnail
     * tracks. Thumbnails bypass DashHandler and are fetched directly
     * by ThumbnailTracks via its own XHRLoader.
     */
    function _mpdContainsThumbnails(mpd) {
        if (!mpd || typeof mpd !== 'string') {
            return false;
        }
        return Constants.THUMBNAILS_SCHEME_ID_URIS.some(uri => mpd.includes(uri));
    }

    /**
     * Intercept NEED_KEY at high priority, before ProtectionController
     * creates key sessions and sends license requests. In strict mode
     * with an active defense, set ignoreEmeEncryptedEvent to prevent
     * ProtectionController._onNeedKey from running, then fire an
     * error. When strict mode is off, log a warning (not block).
     */
    function _onNeedKey() {
        if (!defenseRegistry.hasContent()) {
            return;
        }

        const strictMode = (settings.get().dodge || {}).strictMode;
        if (strictMode === 'representation' || strictMode === 'manifest') {
            // Prevent ProtectionController._onNeedKey (default priority)
            // from running by enabling the ignoreEmeEncryptedEvent flag.
            settings.update({ streaming: { protection: { ignoreEmeEncryptedEvent: true } } });
            logger.error('Dodge strict mode is enabled and DRM key request detected, blocking request');
            eventBus.trigger(events.ERROR, {
                error: new DashJSError(
                    DodgeErrors.DODGE_STRICT_MODE_ERROR_CODE,
                    'Dodge strict mode is enabled and DRM key request blocked'
                )
            });
        } else {
            logger.warn('DRM key request detected during defended playback, license requests may leak content-identifying information');
        }
    }

    /**
     * Diagnostic warning when a DRM key session is created despite the
     * NEED_KEY intercept (e.g., strict mode off, or session created by
     * manifest-level ContentProtection before Dodge activates).
     */
    function _onKeySessionCreated(e) {
        if (e.error || !defenseRegistry.hasContent()) {
            return;
        }
        logger.warn('DRM key session created during defended playback, license requests may leak content-identifying information');
    }

    /**
     * Get the number of partial responses, pending init events, and pending
     * media events for a stream.
     */
    function getStreamStats(streamId) {
        const state = _getStreamState(streamId);
        const { partialSegments, pendingInit, pendingMedia } = state;

        return {
            partialSegments: partialSegments.length,
            pendingInit: pendingInit.length,
            pendingMedia: pendingMedia.length
        }
    }

    /**
     * True when at least one active stream processor is running a Dodge
     * defense. False when the module is loaded but no extended manifest is
     * active, or when all stream processors fell back to vanilla DASH.
     * @returns {boolean}
     */
    function isDodgeActive() {
        if (!streamController) { return false; }
        return streamController.getActiveStreamProcessors()
            .some(sp => sp.getDashHandler() && sp.getDashHandler().getIsDefended());
    }

    /**
     * True when Dodge playback has entered the trailing padding phase
     * (at least one active stream processor is currently trailing).
     * @returns {boolean}
     */
    function isDodgeTrailing() {
        if (!streamController) { return false; }
        return streamController.getActiveStreamProcessors()
            .some(sp => sp.getDashHandler() && sp.getDashHandler().getIsTrailing());
    }

    function reset() {
        eventBus.off(events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.off(events.INIT_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.off(events.MEDIA_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.off(events.PADDING_LOADED, _onPaddingLoaded, instance);
        if (events.NEED_KEY) {
            eventBus.off(events.NEED_KEY, _onNeedKey, instance);
        }
        if (events.KEY_SESSION_CREATED) {
            eventBus.off(events.KEY_SESSION_CREATED, _onKeySessionCreated, instance);
        }
        defenseRegistry.reset();
        streamState.clear();
    }

    // ************************************************************************
    // SCHEDULING AND DODGE EVENTS
    // ************************************************************************

    function _getScheduleWait() {
        const dodgeSettings = (settings.get().dodge) || {};
        const rawRandom = dodgeSettings.scheduleWaitRandom || 0;
        if (rawRandom < 0 && !warnedNegativeScheduleRandom) {
            logger.warn('dodge.scheduleWaitRandom is negative (' + rawRandom + '), treating as 0');
            warnedNegativeScheduleRandom = true;
        }
        const random = Math.max(0, rawRandom);
        const rawBase = dodgeSettings.scheduleWaitBase || 0;
        if (rawBase < 0 && !warnedNegativeScheduleBase) {
            logger.warn('dodge.scheduleWaitBase is negative (' + rawBase + '), treating as 0');
            warnedNegativeScheduleBase = true;
        }
        const base = Math.max(0, rawBase);
        return base + Math.round(Math.random() * random);
    }

    function _getStreamProcessor(mediaType) {
        if (!streamController) {
            return null;
        }
        if (!mediaType) {
            return null;
        }
        return streamController.getActiveStreamProcessors().find(sp => sp.getType() === mediaType) || null;
    }

    function _setQualityCheck(checkQuality, mediaType) {
        const sp = _getStreamProcessor(mediaType);
        if (sp) {
            const sc = sp.getScheduleController();
            if (sc) {
                sc.setShouldCheckPlaybackQuality(checkQuality);
            }
        }
    }

    function _schedule(checkQuality, delay, mediaType) {
        const sp = _getStreamProcessor(mediaType);
        if (sp) {
            const sc = sp.getScheduleController();
            if (sc) {
                sc.setShouldCheckPlaybackQuality(checkQuality);
                sc.startScheduleTimer(delay);
            }
        }
    }

    // Partial segment download: start schedule timer
    function _onPartialSegment(e) {
        if (!e.suppress) {
            // No quality switches after partial segment downloads
            _schedule(false, _getScheduleWait(), e.mediaType);
        }
    }

    // Padding loaded: schedule and update mock buffers
    function _onPaddingLoaded(e) {
        if (!e.suppress) {
            // Only allow quality switches if the buffer flag is set
            _schedule(e.bufferFlag || false, _getScheduleWait(), e.mediaType);
        }

        // Route to buffer controllers for mock buffer management
        const sp = _getStreamProcessor(e.mediaType);
        if (sp) {
            const bc = sp.getBufferController();
            if (bc && bc.onPaddingLoaded) {
                bc.onPaddingLoaded(e);
            }
        }
    }

    // ************************************************************************
    // PARTIAL SEGMENT COMBINATION
    // ************************************************************************

    function _getStreamState(streamId) {
        if (!streamState.has(streamId)) {
            streamState.set(streamId, {
                partialSegments: [],
                pendingInit: [],
                pendingMedia: [],
            });
        }
        return streamState.get(streamId);
    }

    function _isBufferActive(buffer) {
        if (Array.isArray(buffer)) {
            return buffer.length > 0;
        }
        return !!buffer;
    }

    function _onFragmentLoadingCompleted(e) {
        // Event propagation may have been stopped.
        if (!e.sender) {
            return;
        }

        const request = e.request;
        const bytes = e.response;
        const isInit = request.isInitializationRequest();
        const strInfo = request.representation.mediaInfo.streamInfo;

        // If no Dodge-specific fields are set, this is a vanilla request.
        // Let FragmentController handle it normally.
        if (request.full === undefined && request.padding === undefined) {
            return;
        }

        if (e.error) {
            // Stop propagation to prevent StreamProcessor._handleFragmentLoadingError
            // from generating a new request via getInitRequest() or
            // getSegmentRequestForTime(), which would corrupt the cycle
            // state (lastCycleIndex / lastInitIndex was already advanced).
            // Stall permanently: HTTPLoader already exhausted its retries, so
            // the segment is genuinely unavailable and rescheduling would just
            // fail again. The defense runs correctly or not at all.
            e.sender = null;
            logger.error(request.mediaType + ' download failed after all retries; stalling to preserve defense pattern. URL: ' + request.url);
            return;
        }

        // Stop propagation; this request will be handled entirely by Dodge.
        e.sender = null;

        if (!bytes || !strInfo) {
            logger.warn('No ' + request.mediaType + ' bytes to push or stream is inactive.');
            return;
        }

        const state = _getStreamState(strInfo.id);
        const { partialSegments, pendingInit, pendingMedia } = state;

        // Check if any pending events should be fired first.
        // Pending events are stored in reverse chronological order.
        let primaryEvent = null;
        let secondaryEvents = [];

        // If the buffer flag is active, flush pendingMedia and pendingInit and
        // populate secondaryEvents with the pending events.
        // When buffer is an array of segment indices (selective buffer), only
        // pending media events whose index is in the array are flushed; others
        // stay queued. Pending init events are only flushed for boolean true.
        if (_isBufferActive(request.buffer)) {
            const selectiveIndices = Array.isArray(request.buffer) ? new Set(request.buffer) : null;

            // [data segments] Flush pending media events for same
            // stream, mediaType, and representation
            for (let i = pendingMedia.length - 1; i >= 0; i--) {
                const event = pendingMedia[i];
                if (event.streamId == strInfo.id && event.mediaType == request.mediaType) {
                    if (event.representationId == request.representation.id) {
                        if (!selectiveIndices || selectiveIndices.has(event.index)) {
                            secondaryEvents.push(event);
                            pendingMedia.splice(i, 1);
                        }
                    } else {
                        pendingMedia.splice(i, 1);
                    }
                }
            }

            // [init segments] Flush pending init events for same
            // stream and mediaType (boolean buffer only)
            if (!selectiveIndices) {
                for (let i = pendingInit.length - 1; i >= 0; i--) {
                    const event = pendingInit[i];
                    if (event.streamId == strInfo.id && event.mediaType == request.mediaType) {
                        secondaryEvents.push(event);
                        pendingInit.splice(i, 1);
                    }
                }
            }
        }

        // Accumulate partial responses (skip padding).
        if (!request.padding) {
            partialSegments.push({
                request: request,
                response: new Uint8Array(bytes)
            });
        }

        // If this is a full segment or completes a sequence of partial
        // segment downloads, combine partial responses and route. If the
        // buffer flag is set, a fragment loaded event is set as the primary
        // event. Otherwise, queue a loaded event + propagate a partial event.
        // 
        // If this is a partial segment download that does not complete a
        // sequence, just propagate a partial event. If it's a padding
        // download, propagate a padding loaded event.
        if (request.full) {
            const response = _concatPartialSegments(partialSegments, request.index, request.representation.id, request.mediaType);
            const chunk = _createDataChunk(response, request, strInfo.id, true);

            // Buffer the current segment when buffer is boolean true, or when
            // buffer is an array that includes this segment's index.
            const bufferCurrent = request.buffer === true
                || (Array.isArray(request.buffer) && request.buffer.indexOf(request.index) !== -1);
            if (bufferCurrent) {
                primaryEvent = {
                    chunk: chunk,
                    event: isInit ? events.INIT_FRAGMENT_LOADED : events.MEDIA_FRAGMENT_LOADED,
                    index: isInit ? NaN : request.index
                };
            } else {
                if (isInit) {
                    pendingInit.push({
                        chunk: chunk,
                        streamId: strInfo.id,
                        mediaType: request.mediaType,
                        representationId: request.representation.id,
                        event: events.INIT_FRAGMENT_LOADED,
                        index: NaN
                    });
                } else {
                    pendingMedia.push({
                        chunk: chunk,
                        streamId: strInfo.id,
                        mediaType: request.mediaType,
                        representationId: request.representation.id,
                        event: events.MEDIA_FRAGMENT_LOADED,
                        index: request.index
                    });
                }
                primaryEvent = {
                    event: isInit ? events.INIT_FRAGMENT_PARTIAL : events.MEDIA_FRAGMENT_PARTIAL,
                    index: isInit ? NaN : request.index
                };
            }
        } else if (!request.padding) {
            primaryEvent = {
                event: isInit ? events.INIT_FRAGMENT_PARTIAL : events.MEDIA_FRAGMENT_PARTIAL,
                index: isInit ? NaN : request.index
            };
        } else {
            primaryEvent = {
                event: events.PADDING_LOADED,
                index: request.index
            };
        }

        // Fire secondary events in chronological order. Suppress them; we
        // want to schedule only once the primary event has been fired.
        for (let i = secondaryEvents.length - 1; i >= 0; i--) {
            const event = secondaryEvents[i];
            eventBus.trigger(event.event,
                { chunk: event.chunk, suppress: true },
                { streamId: strInfo.id, mediaType: request.mediaType }
            );
        }

        // Fire the primary event. Do not suppress it; it causes scheduling.
        if (primaryEvent.event === events.INIT_FRAGMENT_LOADED || primaryEvent.event === events.MEDIA_FRAGMENT_LOADED) {
            // Enable quality checks before the event fires. The normal dash.js
            // path (_onBytesAppended) does not call setShouldCheckPlaybackQuality,
            // so we must set it here.
            _setQualityCheck(true, request.mediaType);

            eventBus.trigger(primaryEvent.event,
                { chunk: primaryEvent.chunk, request: request, suppress: false },
                { streamId: strInfo.id, mediaType: request.mediaType }
            );

        } else {
            eventBus.trigger(primaryEvent.event,
                {
                    index: primaryEvent.index,
                    representation: request.representation,
                    quality: request.quality,
                    byteLength: bytes.byteLength,
                    trail: request.trail,
                    buffer: request.buffer === true && secondaryEvents.length == 0,
                    bufferFlag: _isBufferActive(request.buffer),
                    suppress: false
                },
                { streamId: strInfo.id, mediaType: request.mediaType }
            );
        }
    }

    // Combine partial responses for a given segment index / representation and
    // remove them from the partialSegments array.
    function _concatPartialSegments(partialSegments, index, representationId, mediaType) {
        logger.debug('Concat partial responses for segment with index ' + index + ', representation id ' + representationId);

        let pieces = [];
        let minRangeStart = Number.MAX_SAFE_INTEGER;
        let maxRangeEnd = 0;

        for (let i = partialSegments.length - 1; i >= 0; i--) {
            const piece = partialSegments[i];

            if ((index == piece.request.index || (isNaN(index) && isNaN(piece.request.index))) &&
                mediaType == piece.request.mediaType &&
                representationId == piece.request.representation.id) {

                let rangeStart = 0;
                let rangeEnd = -1;

                if (piece.request.originalRange) {
                    const rangeTokens = piece.request.originalRange.split('-');
                    const ors = parseInt(rangeTokens[0], 10);
                    const ore = parseInt(rangeTokens[1], 10);
                    if (!isNaN(ors)) { rangeStart = ors; }
                    if (!isNaN(ore)) { rangeEnd = ore; }
                }

                if (piece.request.range) {
                    const rangeTokens = piece.request.range.split('-');
                    const rs = parseInt(rangeTokens[0], 10);
                    const re = parseInt(rangeTokens[1], 10);
                    if (!isNaN(rs)) { rangeStart = rs; }
                    if (!isNaN(re)) { rangeEnd = re; }
                }

                if (rangeEnd < 0) {
                    rangeEnd = rangeStart + piece.response.byteLength - 1;
                }

                minRangeStart = Math.min(minRangeStart, rangeStart);
                maxRangeEnd = Math.max(maxRangeEnd, rangeEnd);
                pieces.push({ piece, rangeStart });

                partialSegments.splice(i, 1);
            }
        }

        const totalSize = maxRangeEnd - minRangeStart + 1;
        logger.debug('Found ' + pieces.length + ' partial responses (' + totalSize + ' bytes) for segment with index ' + index);

        const result = new Uint8Array(totalSize);
        for (let i = 0; i < pieces.length; i++) {
            const { piece, rangeStart } = pieces[i];
            result.set(piece.response, rangeStart - minRangeStart);
        }

        return result;
    }

    function _createDataChunk(bytes, request, streamId, endFragment) {
        const chunk = new DataChunk();
        chunk.streamId = streamId;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.bytes = bytes;
        chunk.index = request.index;
        chunk.quality = request.quality;
        chunk.representation = request.representation;
        chunk.endFragment = endFragment;
        return chunk;
    }

    function _applyAbrRules() {
        const rules = {};

        Object.values(Constants.QUALITY_SWITCH_RULES).forEach(name => {
            const key = name.charAt(0).toLowerCase() + name.slice(1);
            if (!SUPPORTED_QUALITY_SWITCH_RULES.has(key)) {
                rules[key] = { active: false };
            }
        });

        Object.values(Constants.ABANDON_FRAGMENT_RULES).forEach(name => {
            const key = name.charAt(0).toLowerCase() + name.slice(1);
            if (!SUPPORTED_ABANDON_FRAGMENT_RULES.has(key)) {
                rules[key] = { active: false };
            }
        });

        mediaPlayer.updateSettings({ streaming: { abr: { rules } } });
    }

    instance = {
        registerExtensions,
        registerEvents,
        tryProcessExtendedManifest,
        getStreamStats,
        isDodgeActive,
        isDodgeTrailing,
        reset,
    };

    setup();

    return instance;
}

DodgeHandler.__dashjs_factory_name = 'DodgeHandler';
const factory = FactoryMaker.getClassFactory(DodgeHandler);
factory.events = DodgeEvents;
factory.errors = DodgeErrors;
export default factory;
