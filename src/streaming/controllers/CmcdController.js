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
} from '@svta/cml-cmcd';
import Debug from '../../core/Debug.js';
import Utils from '../../core/Utils.js';

import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';
import URLLoader from '../net/URLLoader.js';
import CmcdModel from '../models/CmcdModel.js'
import Errors from '../../core/errors/Errors.js';
import CmcdConfigAccessor from '../cmcd/config/CmcdConfigAccessor.js';

function CmcdController() {
    let cmcdConfigAccessor,
        cmcdModel,
        requestReporter,
        requestEnabledKeys,
        eventReporters = [],
        pendingRequestErrorCodes,
        generatedSessionId,
        dashMetrics,
        errHandler,
        instance,
        logger,
        mediaPlayerModel,
        reporterNeedsRebuild,
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

        _createCmcdReporters();
        _startTimeIntervalReports();

        _initializePlaybackStateListeners();
    }

    function _resetInitialSettings() {
        reporterNeedsRebuild = false;
        requestReporter = null;
        generatedSessionId = null;
        requestEnabledKeys = [];
        eventReporters = [];
        // Error codes buffered for the request destination until the next request report carries them
        pendingRequestErrorCodes = [];
    }

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

    function _onPlaybackStateChange(state) {
        // Update the CmcdReporters with the new player state
        _updateReporters({ sta: state });
        triggerCmcdEventMode(Constants.CMCD_REPORTING_EVENTS.PLAY_STATE);
    }

    /**
     * Creates one CmcdReporter for request mode and one per event target. Per the CMCD v2 specification,
     * error codes (ec) are buffered per report destination. CmcdReporter shares the per-event data across
     * all of its targets, so a dedicated reporter per event target is needed to send each target only its own codes.
     * @private
     */
    function _createCmcdReporters() {
        // Generate the session ID once per session, so rebuilding the reporters does not start a new session
        if (!generatedSessionId) {
            generatedSessionId = Utils.generateUuid();
        }
        const baseConfig = {
            version: cmcdConfigAccessor.getVersion(),
            transmissionMode: cmcdConfigAccessor.get('mode') === Constants.CMCD_MODE_HEADERS ? CMCD_HEADERS : CMCD_QUERY,
            // All reporters must share the same session ID
            sid: cmcdConfigAccessor.get('sessionID') || generatedSessionId,
        };

        // Only pass cid if it has an actual value
        const cid = cmcdConfigAccessor.get('contentID');
        if (cid) {
            baseConfig.cid = cid;
        }

        requestEnabledKeys = cmcdConfigAccessor.get('keys');
        requestReporter = new CmcdReporter({ ...baseConfig, enabledKeys: requestEnabledKeys }, _customRequester);

        // CmcdReporter ignores targets without url or events
        eventReporters = _buildReporterTargets()
            .filter((target) => target.url && target.events?.length)
            .map((target) => ({
                target,
                // Interval 0 disables the reporter's own time-interval timer. dash.js runs it instead
                // (see _startTimeIntervalReports), so 't' reports can carry the target's buffered error codes.
                reporter: new CmcdReporter({ ...baseConfig, eventTargets: [{ ...target, interval: 0 }] }, _customRequester),
                pendingErrorCodes: [],
                intervalId: null
            }));
    }

    function _startTimeIntervalReports() {
        const event = Constants.CMCD_REPORTING_EVENTS.TIME_INTERVAL;
        eventReporters.forEach((eventReporter) => {
            const { target } = eventReporter;
            if (!(target.interval > 0) || !target.events.includes(event)) {
                return;
            }
            const timeIntervalEvent = () => _recordOnEventTarget(eventReporter, {}, (reporter, data) => reporter.recordEvent(event, data));
            eventReporter.intervalId = setInterval(timeIntervalEvent, target.interval * 1000);
            // Like CmcdReporter.start(), send the first report right away
            timeIntervalEvent();
        });
    }

    function _updateReporters(data) {
        if (requestReporter) {
            requestReporter.update(data);
        }
        eventReporters.forEach(({ reporter }) => reporter.update(data));
    }

    function _stopReporters() {
        eventReporters.forEach(({ reporter, intervalId }) => {
            clearInterval(intervalId);
            reporter.stop(true);
        });
    }

    function _canReportErrorCodes(enabledKeys) {
        // ec is a CMCD v2 key. Under v1 it is never encoded, so buffering would never be flushed.
        return cmcdConfigAccessor.getVersion() >= 2 && Array.isArray(enabledKeys) && enabledKeys.includes('ec');
    }

    /**
     * Records an event on every event target subscribed to it, attaching the error codes buffered for that target.
     * @param {string} event
     * @param {function} record - (reporter, data) => void
     * @private
     */
    function _recordOnEventTargets(event, data, record) {
        eventReporters.forEach((eventReporter) => {
            if (eventReporter.target.events.includes(event)) {
                _recordOnEventTarget(eventReporter, data, record);
            }
        });
    }

    function _recordOnEventTarget(eventReporter, data, record) {
        const hasErrorCodes = eventReporter.pendingErrorCodes.length > 0;
        try {
            record(eventReporter.reporter, hasErrorCodes ? { ...data, ec: eventReporter.pendingErrorCodes } : data);
            if (hasErrorCodes) {
                eventReporter.pendingErrorCodes = [];
            }
        } catch (e) {
            logger.warn('Failed to record CMCD event.', e);
        }
    }

    function _buildReporterTargets() {
        const targets = cmcdConfigAccessor.getEventTargets();

        return targets.reduce((result, _target, index) => {
            if (!isCmcdEnabled(index)) {
                return result;
            }

            const accessor = cmcdConfigAccessor.getEventTarget(index);
            result.push({
                url: accessor.get('targetUrl'),
                events: accessor.get('targetEvents'),
                interval: accessor.get('targetInterval') ?? Constants.CMCD_DEFAULT_TIME_INTERVAL,
                batchSize: accessor.get('targetBatchSize') || 1,
                enabledKeys: accessor.get('targetKeys'),
            });

            return result;
        }, []);
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

    function _onPlayerError(errorData) {
        if (errorData.error?.data?.request?.type === HTTPRequest.CMCD_EVENT) {
            return;
        }
        // Per the CMCD v2 specification, error codes are buffered per report destination
        // as they occur and reported as an inner list of strings, e.g. ec=("16" "27"),
        // along with the next CMCD report sent to that destination.
        const errorCode = errorData.error?.code || errorData.error?.data?.code;
        if (errorCode) {
            const code = String(errorCode);
            if (isCmcdEnabled() && _canReportErrorCodes(requestEnabledKeys)) {
                pendingRequestErrorCodes.push(code);
            }
            eventReporters.forEach((eventReporter) => {
                if (_canReportErrorCodes(eventReporter.target.enabledKeys)) {
                    eventReporter.pendingErrorCodes.push(code);
                }
            });
        }

        triggerCmcdEventMode(Constants.CMCD_REPORTING_EVENTS.ERROR);
    }

    function _rebuildReporterIfNeeded() {
        if (!reporterNeedsRebuild || !requestReporter) {
            return;
        }

        // Only rebuild if manifest params are available and enabled.
        // Without manifest params, the reporter config hasn't changed
        // and rebuilding would unnecessarily reset sid and sn.
        // IMPORTANT: Don't reset reporterNeedsRebuild until we actually rebuild,
        // otherwise a race condition can occur where params aren't available yet
        // and we never get another chance to rebuild.
        const applyFromMpd = cmcdConfigAccessor.get('applyParametersFromMpd') ?? true;
        if (!applyFromMpd || !cmcdConfigAccessor.hasManifestParams()) {
            return;
        }

        // Reset flag only after confirming we will rebuild
        reporterNeedsRebuild = false;

        _stopReporters();
        const previousEventReporters = eventReporters;
        _createCmcdReporters();

        // Keep error codes not yet reported to a target that still exists
        eventReporters.forEach((eventReporter) => {
            const previous = previousEventReporters.find(({ target }) => target.url === eventReporter.target.url);
            if (previous && _canReportErrorCodes(eventReporter.target.enabledKeys)) {
                eventReporter.pendingErrorCodes = previous.pendingErrorCodes;
            }
        });
        _startTimeIntervalReports();
    }

    /**
     * The handler that is triggered for CMCD event mode events (e.g., play, pause, error). Note that response recevived (rr) events are handled by getCmcdResponseReceivedInterceptors.
     * @param event
     */
    function triggerCmcdEventMode(event) {
        if (!requestReporter) {
            return;
        }

        _rebuildReporterIfNeeded();

        const cmcdData = cmcdModel.getEventModeData();

        // Route media start delay (MSD) through update() for the reporter's internal send-once tracking
        const msdData = cmcdModel.calculateMsd();
        if (msdData.msd !== undefined) {
            _updateReporters(msdData);
        }

        // Pass event-mode data as transient per-event data (not persisted)
        _recordOnEventTargets(event, cmcdData, (reporter, data) => reporter.recordEvent(event, data));
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
        if (!requestReporter || !isCmcdEnabled()) {
            return;
        }

        _rebuildReporterIfNeeded();

        try {
            const cmcdData = cmcdModel.deriveCmcdDataForRequest(request);

            // Route MSD through update() for the reporter's internal send-once tracking
            const msdData = cmcdModel.calculateMsd();
            if (msdData.msd !== undefined) {
                _updateReporters(msdData);
            }

            // Attach buffered error codes to this request report
            if (pendingRequestErrorCodes.length > 0) {
                cmcdData.ec = pendingRequestErrorCodes;
            }

            const decorated = requestReporter.createRequestReport(request, cmcdData);
            // Clear the buffer only once the codes were actually encoded into the report
            if (decorated.customData?.cmcd?.ec) {
                pendingRequestErrorCodes = [];
            }
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
        const effectiveMode = cmcdConfigAccessor.get('mode');
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

    function isCmcdEnabled(targetIndex = null) {
        if (targetIndex !== null) {
            return _targetCanBeEnabled(targetIndex) && _checkTargetIncludeInRequests(targetIndex);
        } else {
            return _canBeEnabled() && _checkIncludeInRequests();
        }
    }

    function _canBeEnabled() {
        const version = cmcdConfigAccessor.getVersion();

        if (version !== 1 && version !== 2) {
            logger.error(`version parameter must be 1 or 2, got ${version}.`);
            return false;
        }

        return cmcdConfigAccessor.isEnabled();
    }

    function _checkIncludeInRequests() {
        const version = cmcdConfigAccessor.getVersion();
        if (version === 2) {
            return true; // Skip this validation for version 2
        }

        // Version 1 validation
        const enabledRequests = cmcdConfigAccessor.get('includeInRequests');

        const defaultAvailableRequests = Constants.CMCD_AVAILABLE_REQUESTS;
        const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));

        if (invalidRequests.length === enabledRequests.length) {
            logger.error(`None of the request types are supported.`);
            return false;
        }

        invalidRequests.forEach((k) => {
            logger.warn(`request type ${k} is not supported.`);
        });

        return true;
    }

    function _targetCanBeEnabled(targetIndex) {
        const cmcdVersion = cmcdConfigAccessor.getVersion();

        if (cmcdVersion !== 2) {
            logger.warn('CMCD version 2 is required for target configuration');
            return false;
        }

        const targetAccessor = cmcdConfigAccessor.getEventTarget(targetIndex);
        const enabled = targetAccessor.get('targetEnabled');
        const url = targetAccessor.get('targetUrl');

        if (!url) {
            logger.warn('Target URL is not configured');
            return false;
        }

        return (enabled && url);
    }

    function _checkTargetIncludeInRequests(targetIndex) {
        const targetAccessor = cmcdConfigAccessor.getEventTarget(targetIndex);
        let enabledRequests = targetAccessor.get('targetIncludeInRequests');

        if (!enabledRequests) {
            return true;
        }

        const defaultAvailableRequests = Constants.CMCD_AVAILABLE_REQUESTS;
        const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));

        if (invalidRequests.length === enabledRequests.length) {
            logger.error(`None of the request types are supported.`);
            return false;
        }

        invalidRequests.forEach((k) => {
            logger.warn(`request type ${k} is not supported.`);
        });

        return true;
    }

    function _onPlaybackRateChanged(data) {
        const prData = cmcdModel.onPlaybackRateChanged(data);
        if (prData) {
            _updateReporters(prData);
        }
    }

    function _onManifestLoaded(data) {
        _updateCmcdManifestParamsInCmcdConfigAccessor();

        // Mark reporter for rebuild so it picks up sid, cid, and keys from manifest params.
        // We can't rebuild here because ServiceDescriptionController may not have processed
        // the manifest yet (MANIFEST_LOADED fires before service description is available).
        // The reporter will be rebuilt lazily before the next request or event.
        reporterNeedsRebuild = true;

        if (requestReporter) {
            const streamFormatInfo = cmcdModel.onManifestLoaded(data);
            _updateReporters(streamFormatInfo);
        }
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

    function getCmcdRequestInterceptors() {
        return [_cmcdRequestModeInterceptor];
    }

    function _cmcdRequestModeInterceptor(commonMediaRequest) {
        const requestType = commonMediaRequest.customData.request.type;

        if (!requestReporter || !isCmcdEnabled() || !cmcdModel.isIncludedInRequestFilter(requestType)) {
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

    function getCmcdResponseReceivedInterceptors() {
        return [_cmcdResponseReceivedInterceptor];
    }

    function _cmcdResponseReceivedInterceptor(response) {
        const requestType = response.request?.customData?.request?.type;
        if (requestType === HTTPRequest.CMCD_EVENT) {
            return response;
        }
        _handleResponseReceived(response);
        return response;
    }

    function _handleResponseReceived(response) {
        // CmcdReporter ignores responses without a request URL
        if (!requestReporter || !response.request?.url) {
            return;
        }

        _rebuildReporterIfNeeded();

        // Collect event-mode data from the model
        const eventData = cmcdModel.getEventModeData();

        // Route MSD through update() for the reporter's internal send-once tracking
        const msdData = cmcdModel.calculateMsd();
        if (msdData.msd !== undefined) {
            _updateReporters(msdData);
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

        // CmcdReporter merges the request's CMCD data into the rr report. Drop the request destination's
        // ec so each event target only receives the error codes buffered for it.
        const requestCmcd = response.request.customData?.cmcd;
        if (requestCmcd?.ec) {
            const cmcd = { ...requestCmcd };
            delete cmcd.ec;
            response = { ...response, request: { ...response.request, customData: { ...response.request.customData, cmcd } } };
        }

        _recordOnEventTargets(Constants.CMCD_REPORTING_EVENTS.RESPONSE_RECEIVED, { ...eventData, ...additionalData },
            (reporter, data) => reporter.recordResponseReceived(response, data));
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
        eventBus.off(MediaPlayerEvents.ERROR, _onPlayerError, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance)
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_WAITING, _onPlaybackWaiting, instance);

        Object.keys(playbackStateMap).forEach((event) => {
            eventBus.off(event, playbackStateHandlers[event], instance);
        });

        _stopReporters();

        _resetInitialSettings();
        cmcdModel.resetInitialSettings();
    }

    instance = {
        applyCmcdToRequest,
        getCmcdRequestInterceptors,
        getCmcdResponseReceivedInterceptors,
        getCmcdParametersFromManifest,
        initialize,
        isCmcdEnabled,
        reset,
        setConfig
    };

    _setup();

    return instance;
}

CmcdController.__dashjs_factory_name = 'CmcdController';
export default FactoryMaker.getSingletonFactory(CmcdController);
