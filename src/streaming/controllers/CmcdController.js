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
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import MetricsReportingEvents from '../metrics/MetricsReportingEvents.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import Constants from '../../streaming/constants/Constants.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import {
    CMCD_PARAM,
    CmcdReporter,
    CMCD_QUERY,
    CMCD_HEADERS,
    CMCD_EVENT_RESPONSE_RECEIVED,
} from '@svta/cml-cmcd';
import Debug from '../../core/Debug.js';

import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';
import URLLoader from '../net/URLLoader.js';
import CmcdModel from '../models/CmcdModel.js'
import Errors from '../../core/errors/Errors.js';
import CmcdConfigAccessor from '../cmcd/config/CmcdConfigAccessor.js';
import Utils from '../../core/Utils.js';

/**
 * CmcdController implements the two CMCD (CTA-5004-B) reporting modes:
 *
 * REQUEST MODE - CMCD data is attached to outgoing object requests (query
 * parameters or headers). Requests are filtered by the top-level
 * `streaming.cmcd.includeRequestTypes` setting (or manifest CMCDParameters).
 * Served by the single `requestModeReporter`.
 *
 * EVENT MODE - CMCD reports are POSTed to the configured reporting targets
 * (`streaming.cmcd.eventTargets`), triggered by event types (ps, e, t, rr, ...).
 * A single reporter (`eventModeReporter`) owns all targets. The rr (response
 * received) event is additionally filtered per target by
 * `sendResponseReceivedForRequestTypes`, compiled into a per-target
 * `transform` that cancels non-matching rr reports.
 */
function CmcdController() {
    let cmcdConfigAccessor,
        cmcdModel,
        cmcdSessionId,
        dashMetrics,
        errHandler,
        eventModeReporter,
        instance,
        logger,
        mediaPlayerModel,
        reportersNeedRebuild,
        requestModeReporter,
        urlLoader;


    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let debug = Debug(context).getInstance();
    const playbackStateMap = {
        [MediaPlayerEvents.PLAYBACK_INITIALIZED]: Constants.CMCD_PLAYER_STATES.STARTING,
        [MediaPlayerEvents.PLAYBACK_PAUSED]: Constants.CMCD_PLAYER_STATES.PAUSED,
        [MediaPlayerEvents.PLAYBACK_ERROR]: Constants.CMCD_PLAYER_STATES.FATAL_ERROR,
        [MediaPlayerEvents.PLAYBACK_ENDED]: Constants.CMCD_PLAYER_STATES.ENDED,
    };
    let playbackStateHandlers = {};

    cmcdModel = CmcdModel(context).getInstance();
    cmcdConfigAccessor = CmcdConfigAccessor(context).getInstance();

    /* ---------------------------------------------------------------------
     * Setup & configuration
     * ------------------------------------------------------------------ */

    function _setup() {
        logger = debug.getLogger(instance);
        reset();
    }

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.urlLoader) {
            urlLoader = config.urlLoader;
        }

        // Set up a provider function for CmcdConfigAccessor to get manifest params
        // This resolves timing issues where CMCDParameters are needed before they're available
        // Using a provider pattern keeps CmcdConfigAccessor decoupled from ServiceDescriptionController
        if (config.serviceDescriptionController) {
            cmcdConfigAccessor.setManifestParamsProviderFunction(() => {
                const serviceDescription = config.serviceDescriptionController.getServiceDescriptionSettings();
                return serviceDescription?.clientDataReporting?.cmcdParameters || null;
            });
        }

        cmcdModel.setConfig(config);
    }

    function initialize(autoPlay) {
        _resetInitialSettings();
        _initializeEventBus(autoPlay);

        if (!urlLoader) {
            urlLoader = URLLoader(context).create({
                errHandler,
                mediaPlayerModel,
                errors: Errors,
                dashMetrics,
            });
        }

        _createReporters();
        _startReporters();

        _initializePlaybackStateListeners();
    }

    function _resetInitialSettings() {
        reportersNeedRebuild = false;
        eventModeReporter = null;
        cmcdSessionId = null;
    }

    function getCmcdParametersFromManifest() {
        return cmcdModel.getCmcdParametersFromManifest();
    }

    function _updateCmcdManifestParamsInCmcdConfigAccessor() {
        cmcdModel.updateCmcdManifestParamsInCmcdConfigAccessor()
    }

    function reset() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, instance);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.off(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onPlaybackStarted, instance);
        eventBus.off(Events.SERVICE_DESCRIPTION_APPLIED, _onServiceDescriptionApplied, instance);
        eventBus.off(MediaPlayerEvents.ERROR, _onPlayerError, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance)
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_WAITING, _onPlaybackWaiting, instance);

        Object.keys(playbackStateMap).forEach((event) => {
            eventBus.off(event, playbackStateHandlers[event], instance);
        });

        if (requestModeReporter) {
            requestModeReporter.stop(true);
            requestModeReporter = null;
        }
        if (eventModeReporter) {
            eventModeReporter.stop(true);
            eventModeReporter = null;
        }

        cmcdConfigAccessor.clearManifestParams();
        cmcdModel.resetInitialSettings();
    }

    /* ---------------------------------------------------------------------
     * Enablement & validation
     * ------------------------------------------------------------------ */

    function _isRequestModeEnabled() {
        const version = cmcdConfigAccessor.getVersion();

        if (version !== 1 && version !== 2) {
            logger.error(`version parameter must be 1 or 2, got ${version}.`);
            return false;
        }

        if (!cmcdConfigAccessor.isEnabled()) {
            return false;
        }

        // Version 2 does not validate includeRequestTypes here
        if (version === 2) {
            return true;
        }

        return _validateRequestTypeNames(cmcdConfigAccessor.get('includeRequestTypes'));
    }

    function _isEventTargetEnabled(targetIndex) {
        const cmcdVersion = cmcdConfigAccessor.getVersion();

        if (cmcdVersion !== 2) {
            logger.warn('CMCD version 2 is required for target configuration');
            return false;
        }

        const targetAccessor = cmcdConfigAccessor.getEventTarget(targetIndex);
        const url = targetAccessor.get('targetUrl');

        if (!url) {
            logger.warn('Target URL is not configured');
            return false;
        }

        return true;
    }

    /**
     * Validates entries against Constants.CMCD_AVAILABLE_REQUESTS. Warns per
     * unknown entry; returns false when no valid entry remains (including an
     * empty list - callers that allow empty lists must check before calling).
     */
    function _validateRequestTypeNames(requestTypes) {
        if (!Array.isArray(requestTypes)) {
            logger.error('Request types must be an array.');
            return false;
        }

        const invalidRequests = requestTypes.filter(k => !Constants.CMCD_AVAILABLE_REQUESTS.includes(k));

        if (invalidRequests.length === requestTypes.length) {
            logger.error(`None of the request types are supported.`);
            return false;
        }

        invalidRequests.forEach((k) => {
            logger.warn(`request type ${k} is not supported.`);
        });

        return true;
    }

    /* ---------------------------------------------------------------------
     * Reporter construction & rebuild
     * ------------------------------------------------------------------ */

    function _createReporters() {
        const targets = _buildEnabledEventTargets();
        requestModeReporter = _createReporter([]);
        eventModeReporter = targets.length ? _createReporter(targets) : null;
    }

    function _startReporters() {
        requestModeReporter.start();
        eventModeReporter?.start();
    }

    function _createReporter(eventTargets) {
        const cmcdReporterConfig = {
            version: cmcdConfigAccessor.getVersion(),
            transmissionMode: _getTransmissionMode(),
            enabledKeys: cmcdConfigAccessor.get('keys'),
            eventTargets,
        };

        // Cache the generated session id so that sid stays stable across reporter rebuilds
        const sid = cmcdConfigAccessor.get('sessionID') || cmcdSessionId || Utils.generateUuid();
        cmcdSessionId = sid;
        if (sid) {
            cmcdReporterConfig.sid = sid;
        }
        const cid = cmcdConfigAccessor.get('contentID');
        if (cid) {
            cmcdReporterConfig.cid = cid;
        }

        return new CmcdReporter(cmcdReporterConfig, _customRequester);
    }

    function _getTransmissionMode() {
        const mode = cmcdConfigAccessor.get('mode');

        if (mode === Constants.CMCD_MODE_HEADERS) {
            return CMCD_HEADERS;
        }

        if (mode === 'header') {
            logger.warn('CMCD transmission mode "header" is deprecated. Use "headers" instead.');
            return CMCD_HEADERS;
        }

        if (mode !== Constants.CMCD_MODE_QUERY) {
            logger.warn(`Unsupported CMCD transmission mode "${mode}". Using "${Constants.CMCD_MODE_QUERY}".`);
        }

        return CMCD_QUERY;
    }

    function _buildEnabledEventTargets() {
        const targets = cmcdConfigAccessor.getEventTargets();

        return targets.reduce((result, _target, index) => {
            if (!_isEventTargetEnabled(index)) {
                return result;
            }

            const accessor = cmcdConfigAccessor.getEventTarget(index);
            const sendResponseReceivedForRequestTypes = accessor.get('targetSendResponseReceivedForRequestType');

            if (_target && Object.prototype.hasOwnProperty.call(_target, 'enabled')) {
                logger.warn('CMCD event target "enabled" is deprecated and ignored. Remove the target from eventTargets to disable it.');
            }

            // This player-specific filter only controls rr reports. It must not disable
            // independently configured event reports for the target.
            if (sendResponseReceivedForRequestTypes?.length) {
                _validateRequestTypeNames(sendResponseReceivedForRequestTypes);
            }

            result.push({
                url: accessor.get('targetUrl'),
                events: accessor.get('targetEvents'),
                interval: accessor.get('targetInterval') ?? Constants.CMCD_DEFAULT_TIME_INTERVAL,
                batchSize: accessor.get('targetBatchSize') || 1,
                enabledKeys: accessor.get('targetKeys'),
                // An explicit empty sendResponseReceivedForRequestTypes disables rr for this
                // target; only a null/undefined list falls back to the top-level includeRequestTypes.
                transform: (data, request) => {
                    if (data.e !== CMCD_EVENT_RESPONSE_RECEIVED) {
                        return data;
                    }
                    const requestType = request?.customData?.request?.type;
                    return cmcdModel.isIncludedInRequestFilter(requestType, sendResponseReceivedForRequestTypes) ? data : null;
                },
            });

            return result;
        }, []);
    }

    function _rebuildReportersIfNeeded() {
        if (!reportersNeedRebuild || !requestModeReporter) {
            return;
        }

        // Service description application is the last point at which MPD CMCD
        // parameters can change for this manifest.
        const applyFromMpd = cmcdConfigAccessor.get('applyParametersFromMpd') ?? true;
        reportersNeedRebuild = false;
        if (!applyFromMpd || !cmcdConfigAccessor.hasManifestParams()) {
            return;
        }

        requestModeReporter.stop(true);
        eventModeReporter?.stop(true);
        _createReporters();
        _startReporters();
    }

    function _customRequester(request) {
        return new Promise((resolve) => {
            const httpRequest = new CmcdReportRequest();
            httpRequest.url = request.url;
            httpRequest.method = request.method;
            httpRequest.headers = request.headers;
            httpRequest.body = request.body;
            httpRequest.type = HTTPRequest.CMCD_EVENT;

            urlLoader.load({
                request: httpRequest,
                success: () => resolve({ status: 200 }),
                error: (e) => resolve({ status: e?.status || 500 }),
            });
        });
    }

    /* ---------------------------------------------------------------------
     * Request mode
     * ------------------------------------------------------------------ */

    function getCmcdRequestInterceptors() {
        return [_cmcdRequestModeInterceptor];
    }

    // REQUEST MODE filter: top-level includeRequestTypes (settings or manifest CMCDParameters)
    function _isRequestTypeIncludedInRequestMode(requestType) {
        return cmcdModel.isIncludedInRequestFilter(requestType);
    }

    function _cmcdRequestModeInterceptor(commonMediaRequest) {
        const requestType = commonMediaRequest.customData.request.type;

        if (!requestModeReporter || !_isRequestModeEnabled() || !_isRequestTypeIncludedInRequestMode(requestType)) {
            commonMediaRequest.cmcd = commonMediaRequest.customData.request.cmcd;
            return commonMediaRequest;
        }

        let request = commonMediaRequest.customData.request;

        applyCmcdToRequest(request)

        commonMediaRequest = {
            ...commonMediaRequest,
            url: request.url,
            headers: request.headers,
            cmcd: request.cmcd,
            customData: { ...commonMediaRequest.customData, cmcd: request.cmcd },
        };

        return commonMediaRequest;
    }

    /**
     * Applies CMCD data to a request by decorating its URL and/or headers.
     * Delegates to CmcdReporter.createRequestReport() which handles
     * transmission mode (query vs header) internally.
     *
     * @param {object} request - The request object with at least { url, type }.
     *                           Will be mutated with CMCD-decorated url/headers.
     */
    function applyCmcdToRequest(request) {
        if (!requestModeReporter || !_isRequestModeEnabled()) {
            return;
        }

        try {
            const cmcdData = cmcdModel.deriveCmcdDataForRequest(request);

            // Route MSD through update() for the reporter's internal send-once tracking.
            // Deliberately only the request-mode reporter: each reporter tracks
            // msd independently, the event-mode reporter receives it on its own paths.
            const msdData = cmcdModel.calculateMsd();
            if (msdData.msd !== undefined) {
                requestModeReporter.update(msdData);
            }

            const decorated = requestModeReporter.createRequestReport(request, cmcdData);
            request.url = decorated.url;
            request.headers = decorated.headers;
            request.cmcd = decorated.customData?.cmcd || {};

            _triggerCmcdDataGeneratedEvent(request)

        } catch (e) {
            logger.warn(e);
            return null;
        }
    }

    function _triggerCmcdDataGeneratedEvent(request) {
        const configuredMode = cmcdConfigAccessor.get('mode');
        const effectiveMode = configuredMode === 'header' ? Constants.CMCD_MODE_HEADERS : configuredMode;
        const eventData = {
            url: request.url,
            mediaType: request.mediaType,
            requestType: request.type,
            cmcdData: request.cmcd,
            mode: effectiveMode,
        };

        if (effectiveMode === Constants.CMCD_MODE_HEADERS) {
            eventData.headers = request.headers;
        } else {
            try {
                const url = new URL(request.url);
                eventData.cmcdString = url.searchParams.get(CMCD_PARAM) || '';
            } catch (e) {
                eventData.cmcdString = '';
            }
        }

        eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventData);
    }

    /* ---------------------------------------------------------------------
     * Event mode
     * ------------------------------------------------------------------ */

    function getCmcdResponseReceivedInterceptors() {
        return [_cmcdResponseReceivedInterceptor];
    }

    function _cmcdResponseReceivedInterceptor(response) {
        // Ignore responses of CMCD reports themselves to avoid report-about-report loops
        const requestType = response.request?.customData?.request?.type;
        if (requestType === HTTPRequest.CMCD_EVENT) {
            return response;
        }
        _handleResponseReceivedEvent(response);
        return response;
    }

    function _handleResponseReceivedEvent(response) {
        if (!eventModeReporter) {
            return;
        }

        // Collect event-mode data from the model
        const eventData = cmcdModel.getEventModeData();

        // Route MSD through update() for the reporter's internal send-once tracking
        const msdData = cmcdModel.calculateMsd();
        if (msdData.msd !== undefined) {
            _updateAllReporters(msdData);
        }

        // Collect dash.js-specific additional data
        const additionalData = {};

        if (response.headers) {
            try {
                const cmsdStaticHeader = response.headers['cmsd-static'];
                if (cmsdStaticHeader) {
                    additionalData.cmsds = btoa(cmsdStaticHeader);
                }

                const cmsdDynamicHeader = response.headers['cmsd-dynamic'];
                if (cmsdDynamicHeader) {
                    additionalData.cmsdd = btoa(cmsdDynamicHeader);
                }
            } catch (e) {
                logger.warn('Failed to base64 encode CMSD headers, ignoring.', e);
            }
        }

        try {
            // Per-target filtering by request type happens in each target's transform
            eventModeReporter.recordResponseReceived(response, { ...eventData, ...additionalData });
        } catch (e) {
            logger.warn('Failed to record response received in CMCD reporter.', e);
        }
    }

    /* ---------------------------------------------------------------------
     * Playback & eventbus handlers (shared state feeding both modes)
     * ------------------------------------------------------------------ */

    function _initializeEventBus(autoPlay) {
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.on(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);

        if (autoPlay) {
            eventBus.on(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onPlaybackStarted, instance);
        } else {
            eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        }
        eventBus.on(MediaPlayerEvents.ERROR, _onPlayerError, instance);
        eventBus.on(Events.SERVICE_DESCRIPTION_APPLIED, _onServiceDescriptionApplied, instance);
    }

    function _initializePlaybackStateListeners() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_WAITING, _onPlaybackWaiting, instance);

        Object.entries(playbackStateMap).forEach(([event, state]) => {
            if (!playbackStateHandlers[event]) {
                playbackStateHandlers[event] = () => _onPlaybackStateChange(state);
            }

            eventBus.on(event, playbackStateHandlers[event], instance);
        });
    }

    function _updateAllReporters(data) {
        requestModeReporter?.update(data);
        eventModeReporter?.update(data);
    }

    function _onPlaybackStateChange(state) {
        requestModeReporter?.update({ sta: state });

        if (!eventModeReporter) {
            return;
        }

        // A single combined update(): snapshot data is persisted first, then the sta
        // change auto-fires the ps event (deduped against the last emitted value).
        const data = { ...cmcdModel.getEventModeData(), sta: state };
        const msdData = cmcdModel.calculateMsd();
        if (msdData.msd !== undefined) {
            data.msd = msdData.msd;
        }
        eventModeReporter.update(data);
    }

    function _onPlaybackRateChanged(data) {
        const prData = cmcdModel.onPlaybackRateChanged(data);
        if (prData) {
            _updateAllReporters(prData);
        }
    }

    function _onManifestLoaded(data) {
        _updateCmcdManifestParamsInCmcdConfigAccessor();

        // Rebuild after ServiceDescriptionController applies the manifest settings.
        reportersNeedRebuild = true;

        if (requestModeReporter) {
            const streamFormatInfo = cmcdModel.onManifestLoaded(data);
            _updateAllReporters(streamFormatInfo);
        }
    }

    function _onServiceDescriptionApplied() {
        _updateCmcdManifestParamsInCmcdConfigAccessor();
        _rebuildReportersIfNeeded();
    }

    function _onPlayerError(errorData) {
        // Ignore errors of CMCD reports themselves to avoid report-about-report loops
        if (errorData.error?.data?.request?.type === HTTPRequest.CMCD_EVENT) {
            return;
        }

        if (!eventModeReporter) {
            return;
        }

        // Route media start delay (MSD) through update() for the reporter's internal send-once tracking
        const msdData = cmcdModel.calculateMsd();
        if (msdData.msd !== undefined) {
            _updateAllReporters(msdData);
        }

        // ec is transient per-event data: it must not persist into later reports
        const eventData = { ...cmcdModel.getEventModeData() };
        const errorCode = errorData.error?.code || errorData.error?.data?.code;
        if (errorCode) {
            eventData.ec = errorCode;
        }

        eventModeReporter.recordEvent(Constants.CMCD_REPORTING_EVENTS.ERROR, eventData);
    }

    function _onBufferLevelStateChanged(data) {
        cmcdModel.onBufferLevelStateChanged(data);
    }

    function _onPlaybackSeeking() {
        cmcdModel.onPlaybackSeeking();
        _onPlaybackStateChange(Constants.CMCD_PLAYER_STATES.SEEKING);
    }

    function _onPlaybackSeeked() {
        cmcdModel.onPlaybackSeeked();
    }

    function _onPlaybackWaiting() {
        if (cmcdModel.wasPlaying()) {
            const mediaType = cmcdModel.getLastMediaTypeRequest();
            cmcdModel.onRebufferingStarted(mediaType);
            _onPlaybackStateChange(Constants.CMCD_PLAYER_STATES.REBUFFERING);
        } else {
            _onPlaybackStateChange(Constants.CMCD_PLAYER_STATES.WAITING);
        }
    }

    function _onPeriodSwitchComplete() {
        cmcdModel.onPeriodSwitchComplete();
    }

    function _onPlaybackStarted() {
        cmcdModel.onPlaybackStarted();
    }

    function _onPlaybackPlaying() {
        cmcdModel.onPlaybackPlaying();
        _onPlaybackStateChange(Constants.CMCD_PLAYER_STATES.PLAYING);
    }

    instance = {
        applyCmcdToRequest,
        getCmcdRequestInterceptors,
        getCmcdResponseReceivedInterceptors,
        getCmcdParametersFromManifest,
        initialize,
        reset,
        setConfig
    };

    _setup();

    return instance;
}

CmcdController.__dashjs_factory_name = 'CmcdController';
export default FactoryMaker.getSingletonFactory(CmcdController);
