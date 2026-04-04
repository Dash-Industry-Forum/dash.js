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
        instance;

    // Per-stream state, keeps track of partial segments and pending events.
    // Key: streamId & Value: { partialSegments, pendingInit, pendingMedia }
    let streamState;

    function setup() {
        logger = debug.getLogger(instance);
        defenseRegistry = DefenseRegistry(context).getInstance();
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

        return {
            mpd: extended['start']['mpd'],
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

    function reset() {
        eventBus.off(events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.off(events.INIT_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.off(events.MEDIA_FRAGMENT_PARTIAL, _onPartialSegment, instance);
        eventBus.off(events.PADDING_LOADED, _onPaddingLoaded, instance);
        defenseRegistry.reset();
        streamState.clear();
    }

    // ************************************************************************
    // SCHEDULING AND DODGE EVENTS
    // ************************************************************************

    function _getScheduleWait() {
        const dodgeSettings = (settings.get().dodge) || {};
        return dodgeSettings.scheduleWaitBase + Math.round(Math.random() * dodgeSettings.scheduleWaitRandom);
    }

    function _scheduleAll(checkQuality, delay) {
        if (!streamController) {
            return;
        }

        streamController.getActiveStreamProcessors().forEach(sp => {
            const sc = sp.getScheduleController();
            if (sc) {
                sc.setShouldCheckPlaybackQuality(checkQuality);
                sc.startScheduleTimer(delay);
            }
        });
    }

    // Partial segment download: start schedule timer
    function _onPartialSegment(e) {
        if (!e.suppress) {
            // No quality switches after partial segment downloads
            _scheduleAll(false, _getScheduleWait());
        }
    }

    // Padding loaded: schedule and update mock buffers
    function _onPaddingLoaded(e) {
        if (!e.suppress) {
            // Only allow quality switches if the buffer flag is set
            _scheduleAll(e.buffer || false, _getScheduleWait());
        }

        // Route to buffer controllers for mock buffer management
        if (!streamController) { return; }
        streamController.getActiveStreamProcessors().forEach(sp => {
            if (!e.mediaType || sp.getType() === e.mediaType) {
                const bc = sp.getBufferController();
                if (bc && bc.onPaddingLoaded) {
                    bc.onPaddingLoaded(e);
                }
            }
        });
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
            // On error, don't stop propagation - let FragmentController handle
            // recovery (service location blacklisting, retries, etc.).
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

        // If the buffer flag is set, flush pendingMedia and pendingInit and
        // populate secondaryEvents with the pending events.
        if (request.buffer) {
            // [data segments] Flush pending media events for same
            // stream, mediaType, and representation
            for (let i = pendingMedia.length - 1; i >= 0; i--) {
                const event = pendingMedia[i];
                if (event.streamId == strInfo.id && event.mediaType == request.mediaType) {
                    if (event.representationId == request.representation.id) {
                        secondaryEvents.push(event);
                    }
                    pendingMedia.splice(i, 1);
                }
            }

            // [init segments] Flush pending init events for same
            // stream and mediaType
            for (let i = pendingInit.length - 1; i >= 0; i--) {
                const event = pendingInit[i];
                if (event.streamId == strInfo.id && event.mediaType == request.mediaType) {
                    secondaryEvents.push(event);
                    pendingInit.splice(i, 1);
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

            if (request.buffer) {
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
                    buffer: request.buffer && secondaryEvents.length == 0,
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
