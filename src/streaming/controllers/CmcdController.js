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
import {CMCD_PARAM} from '@svta/common-media-library/cmcd/CMCD_PARAM';
import Debug from '../../core/Debug.js';
import {encodeCmcd} from '@svta/common-media-library/cmcd/encodeCmcd';
import {toCmcdHeaders} from '@svta/common-media-library/cmcd/toCmcdHeaders';
import {toCmcdUrl} from '@svta/common-media-library/cmcd/toCmcdUrl';

import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';
import Utils from '../../core/Utils.js';
import URLLoader from '../net/URLLoader.js';
import ClientDataReportingController from '../controllers/ClientDataReportingController.js';
import CmcdModel from '../models/CmcdModel.js'
import CmcdBatchController from './CmcdBatchController.js';
import Errors from '../../core/errors/Errors.js';
import Settings from '../../core/Settings.js';

function CmcdController() {
    let instance,
        logger,
        cmcdModel,
        cmcdBatchController,
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
        const targets = settings.get().streaming.cmcd.targets;
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

    function getQueryParameter(request, cmcdData, targetSettings) {
        try {
            cmcdData = cmcdData || cmcdModel.getCmcdData(request);

            const encodeOptions = _createCmcdEncodeOptions(targetSettings);
            const finalPayloadString = encodeCmcd(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                requestType: request.type,
                cmcdData,
                cmcdString: finalPayloadString,
                mode: targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode,
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
        const targets = settings.get().streaming.cmcd.targets;

        if (targets.length === 0) {
            return;
        }

        let cmcdData = cmcdModel.triggerCmcdEventMode(event);

        if (event == 'rr') {
            cmcdData = {...cmcdData, ...response.request.cmcd}         
            cmcdData = _addCmcdResponseReceivedData(response, cmcdData);
        }
        
        targets.forEach(targetSettings => {
            if (!isCmcdEnabled(targetSettings)){
                return;
            }

            if (targetSettings.events?.length === 0) {
                logger.warn('CMCD Event Mode is enabled, but the "events" setting is empty. No event-specific CMCD data will be sent.');
            }

            let events = targetSettings.events ? targetSettings.events : Object.values(Constants.CMCD_REPORTING_EVENTS);

            if (!events.includes(event)) {
                return;
            }

            let httpRequest = new CmcdReportRequest();

            httpRequest.url = targetSettings.url;
            httpRequest.type = HTTPRequest.CMCD_EVENT;
            httpRequest.method = HTTPRequest.GET;

            const sequenceNumber = _getNextSequenceNumber(targetSettings);
            let cmcd = {...cmcdData, sn: sequenceNumber}
            httpRequest.cmcd = cmcd;

            _updateRequestWithCmcd(httpRequest, cmcd, targetSettings)
            if ((targetSettings.batchSize || targetSettings.batchTimer) && httpRequest.body){
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
     * @private
    */
    function _updateRequestWithCmcd(request, cmcdData, targetSettings) {
        const currentServiceLocation = request?.serviceLocation;
        const currentAdaptationSetId = request?.mediaInfo?.id?.toString();
        const isIncludedFilters = clientDataReportingController.isServiceLocationIncluded(request.type, currentServiceLocation) &&
            clientDataReportingController.isAdaptationsIncluded(currentAdaptationSetId);

        if (isIncludedFilters) {
            const cmcdParameters = cmcdModel.getCmcdParametersFromManifest();
            const cmcdModeSetting = targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode;
            const mode = cmcdParameters.mode ? cmcdParameters.mode : cmcdModeSetting;
            switch (mode) {
                case Constants.CMCD_MODE_QUERY:
                    request.url = Utils.removeQueryParameterFromUrl(request.url, Constants.CMCD_QUERY_KEY);
                    const additionalQueryParameter = _getAdditionalQueryParameter(request, cmcdData, targetSettings);
                    request.url = Utils.addAdditionalQueryParameterToUrl(request.url, additionalQueryParameter);
                    break;
                case Constants.CMCD_MODE_HEADER:
                    request.headers = request.headers || {};
                    request.headers = Object.assign(request.headers, getHeaderParameters(request, cmcdData, targetSettings));
                    break;
                case Constants.CMCD_MODE_BODY:
                    if (request.type === HTTPRequest.CMCD_RESPONSE || request.type === HTTPRequest.CMCD_EVENT) {
                        request.body = getJsonParameters(request, cmcdData, targetSettings);
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
     * @return {array}
     * @private
    */
    function _getAdditionalQueryParameter(request, cmcdData, targetSettings) {
        try {
            const additionalQueryParameter = [];
            const cmcdQueryParameter = getQueryParameter(request, cmcdData, targetSettings);

            if (cmcdQueryParameter) {
                additionalQueryParameter.push(cmcdQueryParameter);
            }

            return additionalQueryParameter;
        } catch (e) {
            return [];
        }
    }

    function getHeaderParameters(request, cmcdData, targetSettings) {
        try {
            cmcdData = cmcdData || cmcdModel.getCmcdData(request);

            const encodeOptions = _createCmcdEncodeOptions(targetSettings);
            const headers = toCmcdHeaders(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                cmcdData,
                headers,
                mode: targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode,
            }

            eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);
            return headers;
        } catch (e) {
            return null;
        }
    }

    function getJsonParameters(request, cmcdData, targetSettings){
        try {
            cmcdData = cmcdData || cmcdModel.getCmcdData(request);
            const encodeOptions = _createCmcdEncodeOptions(targetSettings);
            const body = toCmcdUrl(cmcdData, encodeOptions);

            const eventBusData = {
                url: request.url,
                mediaType: request.mediaType,
                requestType: request.type,
                cmcdData,
                cmcdString: body,
                mode: targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode,
            }

            eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);

            return body;
        } catch (e) {
            return null;
        }
    }

    function isCmcdEnabled(targetSettings) {
        if (targetSettings) {
            return _targetCanBeEnabled(targetSettings) && _checkTargetIncludeInRequests(targetSettings);
        }
        else {
            const cmcdParametersFromManifest = cmcdModel.getCmcdParametersFromManifest();
            return _canBeEnabled(cmcdParametersFromManifest) && _checkIncludeInRequests(cmcdParametersFromManifest);
        }
    }

    function _canBeEnabled(cmcdParametersFromManifest) {
        if (Object.keys(cmcdParametersFromManifest).length) {
            if (parseInt(cmcdParametersFromManifest.version) !== 1) {
                logger.error(`version parameter must be defined in 1.`);
                return false;
            }
            if (!cmcdParametersFromManifest.keys) {
                logger.error(`keys parameter must be defined.`);
                return false;
            }
        }
        const isEnabledFromManifest = cmcdParametersFromManifest.version;
        const isEnabledFromSettings = settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled;
        return isEnabledFromManifest || isEnabledFromSettings;
    }

    function _checkIncludeInRequests(cmcdParametersFromManifest) {
        let enabledRequests = settings.get().streaming.cmcd.includeInRequests;

        if (cmcdParametersFromManifest.version) {
            enabledRequests = cmcdParametersFromManifest.includeInRequests ?? [Constants.CMCD_DEFAULT_INCLUDE_IN_REQUESTS];
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

    function _targetCanBeEnabled(targetSettings) {
        const cmcdVersion = settings.get().streaming.cmcd.version ?? Constants.DEFAULT_CMCD_VERSION;

        if (cmcdVersion !== 2) {
            logger.warn('CMCD version 2 is required for target configuration');
        }

        if (!targetSettings?.url) {
            logger.warn('Target URL is not configured');
        }

        return (cmcdVersion === 2 && targetSettings?.enabled && targetSettings?.url);
    }

    function _checkTargetIncludeInRequests(targetSettings) {

        let enabledRequests = targetSettings?.includeInRequests;

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

    function _createCmcdEncodeOptions(targetSettings) {
        const cmcdParametersFromManifest = cmcdModel.getCmcdParametersFromManifest();
        let enabledKeys = targetSettings ?
            targetSettings.enabledKeys :
            (cmcdParametersFromManifest.version ? cmcdParametersFromManifest.keys : settings.get().streaming.cmcd.enabledKeys);

        // if (enabledKeys?.length === 0){
        //     enabledKeys = Constants.CMCD_KEYS
        // }

        return {
            // reportingMode: targetSettings ? Constants.CMCD_REPORTING_MODE.EVENT : Constants.CMCD_REPORTING_MODE.REQUEST,
            reportingMode: targetSettings?.cmcdMode,
            version: settings.get().streaming.cmcd.version ?? Constants.CMCD_DEFAULT_VERSION,
            filter: enabledKeys ? (key) => enabledKeys.includes(key) : undefined,
        }
    }

    function _onPlaybackRateChanged(data) {
        cmcdModel.onPlaybackRateChanged(data);
    }

    function _onManifestLoaded(data) {
        cmcdModel.onManifestLoaded(data);
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
        // Add here request interceptors
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
            _updateRequestWithCmcd(request, cmcdRequestData, null);
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
        _onEventChange('rr', response)
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
