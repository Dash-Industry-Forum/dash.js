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
    encodeCmcd,
    toCmcdHeaders,
    toCmcdUrl
} from '@svta/cml-cmcd';
import Debug from '../../core/Debug.js';

import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';
import Utils from '../../core/Utils.js';
import URLLoader from '../net/URLLoader.js';
import ClientDataReportingController from '../controllers/ClientDataReportingController.js';
import CmcdModel from '../models/CmcdModel.js'
import CmcdBatchController from './CmcdBatchController.js';
import Errors from '../../core/errors/Errors.js';
import Settings from '../../core/Settings.js';
import CmcdConfigAccessor from '../cmcd/config/CmcdConfigAccessor.js';

function CmcdController() {
    let instance,
        logger,
        cmcdModel,
        cmcdBatchController,
        cmcdConfig,
        clientDataReportingController,
        urlLoader,
        mediaPlayerModel,
        dashMetrics,
        errHandler,
        targetSequenceNumbers,
        requestModeSequenceNumber;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();
    let debug = Debug(context).getInstance();

    cmcdModel = CmcdModel(context).getInstance();
    cmcdBatchController = CmcdBatchController(context).getInstance();
    cmcdConfig = CmcdConfigAccessor(context).getInstance();

    function setup() {
        logger = debug.getLogger(instance);
        clientDataReportingController = ClientDataReportingController(context).getInstance();
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

        cmcdModel.setConfig(config);
        cmcdBatchController.setConfig({
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            settings: settings
        });
    }

    function initialize(autoPlay) {
        targetSequenceNumbers = new Map();
        requestModeSequenceNumber = 0;

        getCmcdParametersFromManifest();

        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.on(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);

        if (autoPlay) {
            eventBus.on(MediaPlayerEvents.MANIFEST_LOADING_STARTED, _onPlaybackStarted, instance);
        }
        else {
            eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        }

        _initializeEventModeTimeInterval();
        _initializeEvenModeListeners();
        _initializePlaybackStateListeners();
    }

    function _initializePlaybackStateListeners() {
        const stateMap = {
            [MediaPlayerEvents.PLAYBACK_INITIALIZED]: Constants.CMCD_PLAYER_STATES.STARTING,
            [MediaPlayerEvents.PLAYBACK_PAUSED]: Constants.CMCD_PLAYER_STATES.PAUSED,
            [MediaPlayerEvents.PLAYBACK_ERROR]: Constants.CMCD_PLAYER_STATES.FATAL_ERROR,
            [MediaPlayerEvents.PLAYBACK_ENDED]: Constants.CMCD_PLAYER_STATES.ENDED,
        };

        eventBus.on(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_WAITING, _onPlaybackWaiting, instance);

        Object.entries(stateMap).forEach(([event, state]) => {
            eventBus.on(event, () => _onStateChange(state), instance);
        });
    }

    function _initializeEvenModeListeners() {
        eventBus.on(MediaPlayerEvents.ERROR, _onPlayerError, instance);
    }
    
    let timeouts = [];

    function _initializeEventModeTimeInterval() {
        const targets = cmcdConfig.getTargets();
        targets.forEach(({ timeInterval, events }) => {
            if (!events || !events.includes(Constants.CMCD_REPORTING_EVENTS.TIME_INTERVAL)) {
                return;
            }

            timeInterval = timeInterval ?? Constants.CMCD_DEFAULT_TIME_INTERVAL;
            if (timeInterval >= 1) {
                const triggerEventModeInterval = () => {
                    _onEventChange(Constants.CMCD_REPORTING_EVENTS.TIME_INTERVAL);
                    const timeOut = setTimeout(triggerEventModeInterval, (timeInterval * 1000));
                    timeouts.push(timeOut);
                }
                const timeOut = setTimeout(triggerEventModeInterval, (timeInterval * 1000));
                timeouts.push(timeOut);
            }
        });
    }

    function _onStateChange(state) {
        cmcdModel.onStateChange(state);
        _onEventChange(Constants.CMCD_REPORTING_EVENTS.PLAY_STATE);
    }

    function _onEventChange(state, response){
        cmcdModel.onEventChange(state);
        triggerCmcdEventMode(state, response);
    }

    function _onPeriodSwitchComplete() {
        cmcdModel.onPeriodSwitchComplete();
    }

    function _onPlaybackStarted() {
        cmcdModel.onPlaybackStarted();
    }

    function _onPlaybackPlaying() {
        cmcdModel.onPlaybackPlaying();
        _onStateChange(Constants.CMCD_PLAYER_STATES.PLAYING);
    }

    function _onPlayerError(errorData) {
        if (errorData.error && errorData.error.data.request && errorData.error.data.request.type === HTTPRequest.CMCD_EVENT) {
            return;
        }
        cmcdModel.onPlayerError(errorData);
        _onEventChange(Constants.CMCD_REPORTING_EVENTS.ERROR);
    }

    function getQueryParameter(request, cmcdData, keys = null, isEventMode = false, mode = null) {
        try {
            getCmcdParametersFromManifest();

            cmcdData = cmcdData || cmcdModel.getCmcdData(request);

            const effectiveKeys = keys || cmcdConfig.get('keys');
            const encodeOptions = _createCmcdEncodeOptions(effectiveKeys, isEventMode);
            const finalPayloadString = encodeCmcd(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                requestType: request.type,
                cmcdData,
                cmcdString: finalPayloadString,
                mode: mode || cmcdConfig.get('mode'),
            }

            eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);
            return {
                key: CMCD_PARAM,
                value: finalPayloadString
            };
        } catch (e) {
            return null;
        }
    }

    function triggerCmcdEventMode(event, response){
        const targets = cmcdConfig.getTargets();

        if (targets.length === 0) {
            return;
        }

        let cmcdData = cmcdModel.triggerCmcdEventMode(event);
        if (event === Constants.CMCD_REPORTING_EVENTS.RESPONSE_RECEIVED) {
            cmcdData = {...cmcdData, ...response.request.cmcd}
            cmcdData = _addCmcdResponseReceivedData(response, cmcdData);
        }

        targets.forEach((targetSettings, targetIndex) => {
            if (!isCmcdEnabled(targetIndex)){
                return;
            }

            // Use target accessor to get target-specific properties
            const targetAccessor = cmcdConfig.getTarget(targetIndex);
            const includeOnRequests = targetAccessor.get('targetIncludeOnRequests');
            const events = targetAccessor.get('targetEvents');
            const url = targetAccessor.get('targetUrl');
            const mode = targetAccessor.get('targetMode');
            const keys = targetAccessor.get('targetKeys');
            const batchSize = targetAccessor.get('targetBatchSize');
            const batchTimer = targetAccessor.get('targetBatchTimer');

            const requestType = response?.request.customData.request.type;
            if (requestType && !cmcdModel.isIncludedInRequestFilter(requestType, includeOnRequests)){
                return;
            }

            if (events?.length === 0) {
                logger.warn('CMCD Event Mode is enabled, but the "events" setting is empty. No event-specific CMCD data will be sent.');
            }

            if (!events.includes(event)) {
                return;
            }

            let httpRequest = new CmcdReportRequest();

            httpRequest.url = url;
            httpRequest.type = HTTPRequest.CMCD_EVENT;
            httpRequest.method = HTTPRequest.GET;

            const sequenceNumber = _getNextSequenceNumber(targetSettings);
            let cmcd = {...cmcdData, sn: sequenceNumber}
            httpRequest.cmcd = cmcd;

            _updateRequestWithCmcd(httpRequest, cmcd, mode, keys, true)
            if ((batchSize || batchTimer) && httpRequest.body){
                cmcdBatchController.addReport(targetSettings, httpRequest.body)
            } else {
                _sendCmcdDataReport(httpRequest);
            }
        });
    }

    function _sendCmcdDataReport(request){
        if (!urlLoader) {
            urlLoader = URLLoader(context).create({
                errHandler: errHandler,
                mediaPlayerModel: mediaPlayerModel,
                errors: Errors,
                dashMetrics: dashMetrics,
            });
        }
        urlLoader.load({request})
    }

    /**
     * Updates the request url and headers with CMCD data
     * @param request
     * @param cmcdData
     * @param mode - CMCD mode (query, header, body)
     * @param keys - Array of enabled CMCD keys
     * @param isEventMode - Whether this is event mode (true) or request mode (false)
     * @private
    */
    function _updateRequestWithCmcd(request, cmcdData, mode, keys, isEventMode = false) {
        const currentServiceLocation = request?.serviceLocation;
        const currentAdaptationSetId = request?.mediaInfo?.id?.toString();
        const isIncludedFilters = clientDataReportingController.isServiceLocationIncluded(request.type, currentServiceLocation) &&
            clientDataReportingController.isAdaptationsIncluded(currentAdaptationSetId);

        if (isIncludedFilters) {
            const effectiveMode = mode || cmcdConfig.get('mode');
            const effectiveKeys = keys || cmcdConfig.get('keys');

            switch (effectiveMode) {
                case Constants.CMCD_MODE_QUERY:
                    request.url = Utils.removeQueryParameterFromUrl(request.url, Constants.CMCD_QUERY_KEY);
                    const additionalQueryParameter = _getAdditionalQueryParameter(request, cmcdData, effectiveKeys, isEventMode);
                    request.url = Utils.addAdditionalQueryParameterToUrl(request.url, additionalQueryParameter);
                    break;
                case Constants.CMCD_MODE_HEADER:
                    request.headers = request.headers || {};
                    request.headers = Object.assign(request.headers, getHeaderParameters(request, cmcdData, effectiveKeys, isEventMode, effectiveMode));
                    break;
                case Constants.CMCD_MODE_BODY:
                    if (request.type === HTTPRequest.CMCD_EVENT) {
                        request.body = getJsonParameters(request, cmcdData, effectiveKeys, isEventMode, effectiveMode);
                        request.method = HTTPRequest.POST;
                        request.headers = request.headers || {};
                        request.headers = Object.assign(request.headers, Constants.CMCD_CONTENT_TYPE_HEADER)
                    }
                    break;
            }
        }
    }

    /**
     * Generates the additional query parameters to be appended to the request url
     * @param {object} request
     * @param {object} cmcdData
     * @param {array} keys - Array of enabled CMCD keys
     * @param {boolean} isEventMode - Whether this is event mode
     * @return {array}
     * @private
    */
    function _getAdditionalQueryParameter(request, cmcdData, keys = null, isEventMode = false) {
        try {
            const additionalQueryParameter = [];
            const cmcdQueryParameter = getQueryParameter(request, cmcdData, keys, isEventMode, null);

            if (cmcdQueryParameter) {
                additionalQueryParameter.push(cmcdQueryParameter);
            }

            return additionalQueryParameter;
        } catch (e) {
            return [];
        }
    }

    function getHeaderParameters(request, cmcdData, keys = null, isEventMode = false, mode = null) {
        try {
            getCmcdParametersFromManifest();

            cmcdData = cmcdData || cmcdModel.getCmcdData(request);

            const effectiveKeys = keys || cmcdConfig.get('keys');
            const encodeOptions = _createCmcdEncodeOptions(effectiveKeys, isEventMode);
            const headers = toCmcdHeaders(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                cmcdData,
                headers,
                mode: mode || cmcdConfig.get('mode'),
            }

            eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);
            return headers;
        } catch (e) {
            return null;
        }
    }

    function getJsonParameters(request, cmcdData, keys = null, isEventMode = false, mode = null){
        try {
            cmcdData = cmcdData || cmcdModel.getCmcdData(request);
            const effectiveKeys = keys || cmcdConfig.get('keys');
            const encodeOptions = _createCmcdEncodeOptions(effectiveKeys, isEventMode);
            const body = toCmcdUrl(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                requestType: request.type,
                cmcdData,
                cmcdString: body,
                mode: mode || cmcdConfig.get('mode'),
            }

            eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);

            return body;
        } catch (e) {
            return null;
        }
    }

    function isCmcdEnabled(targetIndex = null) {
        if (targetIndex !== null) {
            return _targetCanBeEnabled(targetIndex) && _checkTargetIncludeInRequests(targetIndex);
        }
        else {
            return _canBeEnabled() && _checkIncludeInRequests();
        }
    }

    function _canBeEnabled() {
        const version = cmcdConfig.getVersion();

        if (version !== 1 && version !== 2) {
            logger.error(`version parameter must be 1 or 2, got ${version}.`);
            return false;
        }

        return cmcdConfig.isEnabled();
    }

    function _checkIncludeInRequests() {
        const version = cmcdConfig.getVersion();
        if (version === 2) {
            return true; // Skip this validation for version 2
        }

        // Version 1 validation
        const enabledRequests = cmcdConfig.get('includeInRequests');

        const defaultAvailableRequests = Constants.CMCD_AVAILABLE_REQUESTS;
        const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));

        if (invalidRequests.length === enabledRequests.length) {
            logger.error(`None of the request types are supported.`);
            return false;
        }

        invalidRequests.map((k) => {
            logger.warn(`request type ${k} is not supported.`);
        });

        return true;
    }

    function _targetCanBeEnabled(targetIndex) {
        const cmcdVersion = cmcdConfig.getVersion();

        if (cmcdVersion !== 2) {
            logger.warn('CMCD version 2 is required for target configuration');
            return false;
        }

        const targetAccessor = cmcdConfig.getTarget(targetIndex);
        const enabled = targetAccessor.get('targetEnabled');
        const url = targetAccessor.get('targetUrl');

        if (!url) {
            logger.warn('Target URL is not configured');
            return false;
        }

        return (enabled && url);
    }

    function _checkTargetIncludeInRequests(targetIndex) {
        const targetAccessor = cmcdConfig.getTarget(targetIndex);
        let enabledRequests = targetAccessor.get('targetIncludeOnRequests');

        if (!enabledRequests) {
            return true;
        }

        const defaultAvailableRequests = Constants.CMCD_AVAILABLE_REQUESTS;
        const invalidRequests = enabledRequests.filter(k => !defaultAvailableRequests.includes(k));

        if (invalidRequests.length === enabledRequests.length) {
            logger.error(`None of the request types are supported.`);
            return false;
        }

        invalidRequests.map((k) => {
            logger.warn(`request type ${k} is not supported.`);
        });

        return true;
    }

    function _createCmcdEncodeOptions(keys, isEventMode = false) {
        return {
            reportingMode: isEventMode ? Constants.CMCD_REPORTING_MODE.EVENT : Constants.CMCD_REPORTING_MODE.REQUEST,
            version: cmcdConfig.getVersion(),
            filter: keys ? (key) => keys.includes(key) : undefined,
        }
    }

    function _onPlaybackRateChanged(data) {
        cmcdModel.onPlaybackRateChanged(data);
    }

    function _onManifestLoaded(data) {
        cmcdModel.onManifestLoaded(data);
        getCmcdParametersFromManifest();
    }

    function _onBufferLevelStateChanged(data) {
        cmcdModel.onBufferLevelStateChanged(data);
    }

    function _onPlaybackSeeking() {
        cmcdModel.onPlaybackSeeking();
        _onStateChange(Constants.CMCD_PLAYER_STATES.SEEKING);
    }

    function _onPlaybackSeeked() {
        cmcdModel.onPlaybackSeeked();
    }

    function _onPlaybackWaiting() {
        if (cmcdModel.wasPlaying()){
            const mediaType = cmcdModel.getLastMediaTypeRequest();
            cmcdModel.onRebufferingStarted(mediaType);
            _onStateChange(Constants.CMCD_PLAYER_STATES.REBUFFERING);
        } else {
            _onStateChange(Constants.CMCD_PLAYER_STATES.WAITING);
        }
    }

    function getCmcdRequestInterceptors() {
        return [_cmcdRequestModeInterceptor];
    }

    function _cmcdRequestModeInterceptor(commonMediaRequest) {
        const requestType = commonMediaRequest.customData.request.type;

        if (!cmcdModel.isIncludedInRequestFilter(requestType)) {
            commonMediaRequest.cmcd = commonMediaRequest.customData.request.cmcd;
            return commonMediaRequest;
        }

        const request = commonMediaRequest.customData.request;
    
        requestModeSequenceNumber += 1;
        let cmcdRequestData = {
            ...cmcdModel.getCmcdData(request),
            ...cmcdModel.updateMsdData(Constants.CMCD_REPORTING_MODE.REQUEST),
            sn: requestModeSequenceNumber
        };

        request.cmcd = cmcdRequestData;

        if (isCmcdEnabled()) {
            // Request Mode: use global config for mode and keys (not event mode)
            _updateRequestWithCmcd(request, cmcdRequestData, null, null, false);
        }
    
        commonMediaRequest = {
            ...commonMediaRequest,
            url: request.url,
            headers: request.headers,
            customData: { request },
            cmcd: cmcdRequestData,
            body: request.body
        };

        return commonMediaRequest;
    }

    function getCmcdResponseInterceptors(){
        return [_cmcdResponseReceivedInterceptor];
    }

    function _cmcdResponseReceivedInterceptor(response){
        _onEventChange(Constants.CMCD_REPORTING_EVENTS.RESPONSE_RECEIVED, response)
        return response;
    }

    function _addCmcdResponseReceivedData(response, cmcdData){
        const responseData = {};
        const request = response.request.customData.request;
        const requestType = request.type;

        if (requestType === HTTPRequest.MEDIA_SEGMENT_TYPE){
            responseData.rc = response.status;
        }

        if (request.startDate && request.firstByteDate){
            responseData.ttfb = request.firstByteDate - request.startDate;
        }

        if (request.endDate && request.startDate){
            responseData.ttlb = request.endDate - request.startDate
        }

        if (request.url) {
            responseData.url = request.url.split('?')[0]
        }
    
        if (response.headers){
            try {
                const cmsdStaticHeader = response.headers['cmsd-static'];
                if (cmsdStaticHeader) {
                    responseData.cmsds = btoa(cmsdStaticHeader);
                }

                const cmsdDynamicHeader = response.headers['cmsd-dynamic'];
                if (cmsdDynamicHeader) {
                    responseData.cmsdd = btoa(cmsdDynamicHeader);
                }
            } catch (e) {
                logger.warn('Failed to base64 encode CMSD headers, ignoring.', e);
            }
        }

        return {...cmcdData, ...responseData};
    }

    function _getTargetKey(target) {
        return `${target.url}_${target.mode}`;
    }

    function _getNextSequenceNumber(target) {
        const key = _getTargetKey(target);
        const current = targetSequenceNumbers.get(key) || 0;
        const next = current + 1;
        targetSequenceNumbers.set(key, next);
        return next;
    }

    function getCmcdParametersFromManifest() {
        return cmcdModel.getCmcdParametersFromManifest();
    }

    function reset() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PLAYING, _onPlaybackPlaying, instance);

        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_WAITING, _onPlaybackWaiting, instance);

        timeouts.forEach(clearTimeout);
        timeouts = [];

        cmcdModel.resetInitialSettings();
        cmcdBatchController.reset();

        if (targetSequenceNumbers) {
            targetSequenceNumbers.clear();
        }
        requestModeSequenceNumber = 0;
    }

    instance = {
        getQueryParameter,
        getHeaderParameters,
        getCmcdRequestInterceptors,
        getCmcdResponseInterceptors,
        getCmcdParametersFromManifest,
        initialize,
        isCmcdEnabled,
        reset,
        setConfig
    };

    setup();

    return instance;
}

CmcdController.__dashjs_factory_name = 'CmcdController';
export default FactoryMaker.getSingletonFactory(CmcdController);
