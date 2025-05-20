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
import {CmcdHeaderField} from '@svta/common-media-library/cmcd/CmcdHeaderField';


import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';
import Utils from '../../core/Utils.js';
import URLLoader from '../net/URLLoader.js';
import ClientDataReportingController from '../controllers/ClientDataReportingController.js';
import CmcdModel from '../models/CmcdModel.js'
import Errors from '../../core/errors/Errors.js';
import Settings from '../../core/Settings.js';

function CmcdController() {
    let instance,
        logger,
        cmcdModel,
        clientDataReportingController,
        urlLoader,
        mediaPlayerModel,
        dashMetrics,
        errHandler;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();
    let debug = Debug(context).getInstance();

    cmcdModel = CmcdModel(context).getInstance();
    
    const _loggedCmcdModeErrors = new Set();

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

        cmcdModel.setConfig(config);
    }

    function initialize(autoPlay) {
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
    
    function _initializeEventModeTimeInterval() {
        const targets = settings.get().streaming.cmcd.targets;
        const eventModeTargets = targets.filter((target) => target.cmcdMode === Constants.CMCD_MODE.EVENT);
        eventModeTargets.forEach(({ timeInterval }) => {
            timeInterval = timeInterval || Constants.CMCD_DEFAULT_TIME_INTERVAL;
            if (timeInterval >= 1) {
                const triggerEventModeInterval = () => {
                    _onEventChange(Constants.CMCD_REPORTING_EVENTS.TIME_INTERVAL);
                    setTimeout(triggerEventModeInterval, (timeInterval * 1000));
                }
                triggerEventModeInterval();
            }
        });
    }

    function _onStateChange(state) {
        cmcdModel.onStateChange(state);
    }

    function _onEventChange(state){
        cmcdModel.onEventChange(state);
        triggerCmcdEventMode(state);
    }

    function _onPeriodSwitchComplete() {
        cmcdModel.onPeriodSwitchComplete();
    }

    function _onPlaybackStarted() {
        cmcdModel.onPlaybackStarted();
    }

    function _onPlaybackPlaying() {
        cmcdModel.onPlaybackPlaying();
    }

    function _onPlayerError(errorData) {
        cmcdModel.onPlayerError(errorData);
    }

    function getQueryParameter(request, cmcdData, targetSettings) {
        try {
            if (isCmcdEnabled(targetSettings)) {

                cmcdData = cmcdData || cmcdModel.getCmcdData(request);
                let [enabledKeys, customKeys] = _getTargetSettingsEnabledKeys(targetSettings, cmcdData);

                let filteredCmcdData = _applyWhitelist(cmcdData, enabledKeys);
                filteredCmcdData = {...filteredCmcdData, ...customKeys};              
                const finalPayloadString = encodeCmcd(filteredCmcdData);

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
            }
    
            return null;
        } catch (e) {
            return null;
        }
    }

    function includeEventModeMandatoryKeys(enabledCMCDKeys) {
        Constants.CMCD_MANDATORY_KEYS.forEach(key => {
            if (!enabledCMCDKeys.includes(key)) {
                enabledCMCDKeys.push(key);
                logger.warn(`Including mandatory key ${key} that was not present.`);
            }
        });

        return enabledCMCDKeys;
    }

    function _applyWhitelist(cmcdData, enabledKeys) {
        try {
            const cmcdParametersFromManifest = cmcdModel.getCmcdParametersFromManifest();
            let enabledCMCDKeys = enabledKeys || (cmcdParametersFromManifest.version ? cmcdParametersFromManifest.keys : settings.get().streaming.cmcd.enabledKeys);
            
            const events_key = Constants.CMCD_V2_KEYS_NAME_MAPPING.EVENT
            if (enabledCMCDKeys.includes(events_key) && cmcdData.e) {
                enabledCMCDKeys = includeEventModeMandatoryKeys(enabledCMCDKeys)
            }

            return Object.keys(cmcdData)
                .filter(key => enabledCMCDKeys.includes(key))
                .reduce((obj, key) => {
                    obj[key] = cmcdData[key];
                    return obj;
                }, {});
        } catch (e) {
            return cmcdData;
        }
    }

    function triggerCmcdEventMode(event){
        const targets = settings.get().streaming.cmcd.targets;
        const eventModeTargets = targets.filter((target) => target.cmcdMode === Constants.CMCD_MODE.EVENT);

        if (eventModeTargets.length === 0) {
            return;
        }

        const cmcdData = cmcdModel.triggerCmcdEventMode(event);
        
        eventModeTargets.forEach(targetSettings => {
            if (targetSettings.enabled) {

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

                _updateRequestUrlAndHeadersWithCmcd(httpRequest, cmcdData, targetSettings)
                _sendCmcdDataReport(httpRequest);
            }
        });
    }

    function _sendCmcdDataReport(request){
        urlLoader = URLLoader(context).create({
            errHandler: errHandler,
            mediaPlayerModel: mediaPlayerModel,
            errors: Errors,
            dashMetrics: dashMetrics,
        });

        urlLoader.load({request})
    }

    /**
     * Updates the request url and headers with CMCD data
     * @param request
     * @private
    */
    function _updateRequestUrlAndHeadersWithCmcd(request, cmcdData, targetSettings) {
        const currentServiceLocation = request?.serviceLocation;
        const currentAdaptationSetId = request?.mediaInfo?.id?.toString();
        const isIncludedFilters = clientDataReportingController.isServiceLocationIncluded(request.type, currentServiceLocation) &&
            clientDataReportingController.isAdaptationsIncluded(currentAdaptationSetId);

        if (isIncludedFilters && (isCmcdEnabled(targetSettings))) {
            const cmcdParameters = cmcdModel.getCmcdParametersFromManifest();
            const cmcdModeSetting = targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode;
            const cmcdMode = cmcdParameters.mode ? cmcdParameters.mode : cmcdModeSetting;
            if (cmcdMode === Constants.CMCD_MODE_QUERY) {
                request.url = Utils.removeQueryParameterFromUrl(request.url, Constants.CMCD_QUERY_KEY);
                const additionalQueryParameter = _getAdditionalQueryParameter(request, cmcdData, targetSettings);
                request.url = Utils.addAdditionalQueryParameterToUrl(request.url, additionalQueryParameter);
            } else if (cmcdMode === Constants.CMCD_MODE_HEADER) {
                request.headers = request.headers || {};
                request.headers = Object.assign(request.headers, getHeaderParameters(request, cmcdData, targetSettings));
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
            if (isCmcdEnabled(targetSettings)) {
                cmcdData = cmcdData || cmcdModel.getCmcdData(request);

                let [enabledKeys, customKeys] = _getTargetSettingsEnabledKeys(targetSettings, cmcdData);

                let filteredCmcdData = _applyWhitelist(cmcdData, enabledKeys);
                filteredCmcdData = {...filteredCmcdData, ...customKeys};

                const options = _createCmcdV2HeadersCustomMap();
                const headers = toCmcdHeaders(filteredCmcdData, options);

                const eventBusData = {
                    url: request.url,
                    mediaType: request.mediaType,
                    cmcdData,
                    headers,
                    mode: targetSettings ? targetSettings.mode : settings.get().streaming.cmcd.mode,
                }

                eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, eventBusData);
                return headers;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function isCmcdEnabled(targetSettings) {
        if (targetSettings) {
            return _targetCanBeEnabled(targetSettings) && _checkTargetIncludeInRequests(targetSettings) && _checkTargetAvailableKeys(targetSettings);
        }
        else {
            const cmcdParametersFromManifest = cmcdModel.getCmcdParametersFromManifest();
            return _canBeEnabled(cmcdParametersFromManifest) && _checkIncludeInRequests(cmcdParametersFromManifest) && _checkAvailableKeys(cmcdParametersFromManifest);
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

    function _checkAvailableKeys(cmcdParametersFromManifest) {
        const defaultAvailableKeys = Constants.CMCD_AVAILABLE_KEYS;
        const defaultV2AvailableKeys = Constants.CMCD_V2_COMMON_AVAILABLE_KEYS.concat(Constants.CMCD_V2_REQUEST_MODE_AVAILABLE_KEYS);

        const enabledCMCDKeys = cmcdParametersFromManifest.version ? cmcdParametersFromManifest.keys : settings.get().streaming.cmcd.enabledKeys;

        const cmcdVersion = settings.get().streaming.cmcd.version;
        const invalidKeys = enabledCMCDKeys.filter(k => !defaultAvailableKeys.includes(k) && !(cmcdVersion === 2 && defaultV2AvailableKeys.includes(k)));

        if (invalidKeys.length === enabledCMCDKeys.length && enabledCMCDKeys.length > 0) {
            logger.error(`None of the keys are implemented for CMCD version ${cmcdVersion}.`);
            return false;
        }
        invalidKeys.map((k) => {
            logger.warn(`key parameter ${k} is not implemented for CMCD version ${cmcdVersion}.`);
        });

        return true;
    }

    function _targetCanBeEnabled(targetSettings) {
        const cmcdVersion = settings.get().streaming.cmcd.version ?? Constants.DEFAULT_CMCD_VERSION;
        return (cmcdVersion === 2 && targetSettings?.enabled);
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

    function _checkTargetAvailableKeys(targetSettings) {
        const cmcdAvailableKeysForMode = _getAvailableKeysForTarget(targetSettings);
        const enabledCMCDKeys = targetSettings.enabledKeys;

        const invalidKeys = enabledCMCDKeys.filter(k => !cmcdAvailableKeysForMode.includes(k));

        if (invalidKeys.length === enabledCMCDKeys.length && enabledCMCDKeys.length > 0) {
            const mode = targetSettings.cmcdMode;
            if (!_loggedCmcdModeErrors.has(mode)) {
                logger.error(`None of the keys are implemented for CMCD version 2 for mode ${targetSettings.cmcdMode}.`);
                _loggedCmcdModeErrors.add(mode);
            }
            return false;
        }
        invalidKeys.map((k) => {
            if (!_loggedCmcdModeErrors.has(k)) {
                logger.warn(`key parameter ${k} is not implemented for CMCD version 2 for mode ${targetSettings.cmcdMode}.`);
                _loggedCmcdModeErrors.add(k);
            }
        });

        return true;
    }

    function _getAvailableKeysForTarget(targetSettings) {
        const CMCD_V2_COMMON_KEYS = Constants.CMCD_V2_COMMON_AVAILABLE_KEYS;
        const CMCD_V2_EVENT_MODE_KEYS = Constants.CMCD_V2_EVENT_MODE_AVAILABLE_KEYS;
        const CMCD_V2_REQUEST_MODE_KEYS = Constants.CMCD_V2_REQUEST_MODE_AVAILABLE_KEYS;
        const CMCD_V2_RESPONSE_MODE_KEYS = Constants.CMCD_V2_RESPONSE_MODE_AVAILABLE_KEYS;    
        
        var cmcdAvailableKeysForMode = [];

        switch (targetSettings.cmcdMode) {
            case Constants.CMCD_MODE.RESPONSE:
                cmcdAvailableKeysForMode = CMCD_V2_COMMON_KEYS.concat(CMCD_V2_RESPONSE_MODE_KEYS);
                break;
            case Constants.CMCD_MODE.REQUEST:
                cmcdAvailableKeysForMode = CMCD_V2_COMMON_KEYS.concat(CMCD_V2_REQUEST_MODE_KEYS);
                break;
            case Constants.CMCD_MODE.EVENT:
                cmcdAvailableKeysForMode = CMCD_V2_COMMON_KEYS.concat(CMCD_V2_EVENT_MODE_KEYS);
                break;
        }

        return cmcdAvailableKeysForMode;
    }

    function _createCmcdV2HeadersCustomMap() {
        const cmcdVersion = settings.get().streaming.cmcd.version;
        return cmcdVersion === 1 ? {} : { 
            customHeaderMap: { 
                [CmcdHeaderField.REQUEST]: ['ltc'],
                [CmcdHeaderField.SESSION]: ['msd']
            }
        };
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
    }

    function _onPlaybackSeeked() {
        cmcdModel.onPlaybackSeeked();
    }

    function _onPlaybackWaiting() {
        cmcdModel.onPlaybackWaiting();
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
    
        let cmcdRequestData = {
            ...cmcdModel.getCmcdData(request),
            ...cmcdModel.updateMsdData(Constants.CMCD_MODE.REQUEST)
        };

        const cmcdVersion = settings.get().streaming.cmcd.version ?? Constants.CMCD_DEFAULT_VERSION;
        if (cmcdVersion === 1) {
            // TODO: Re-Add this import once common-media-library pr is merged: https://github.com/qualabs/common-media-library/pull/48
            // Also remove the temporaryConvertToCmcdV1 line
            // cmcdRequestData = convertToCmcdV1(cmcdRequestData);
            cmcdRequestData = temporaryConvertToCmcdV1(cmcdRequestData);
        }

        request.cmcd = cmcdRequestData;
    
        _updateRequestUrlAndHeadersWithCmcd(request, cmcdRequestData, null);
    
        commonMediaRequest = {
            ...commonMediaRequest,
            url: request.url,
            headers: request.headers,
            customData: { request },
            cmcd: cmcdRequestData
        };

        return commonMediaRequest;
    }

    // TODO: delete this once common-media-library pr is merged: https://github.com/qualabs/common-media-library/pull/48
    function temporaryConvertToCmcdV1(cmcdData) {
        const result = {};
        
        for (const key in cmcdData) {
            if (Constants.CMCD_AVAILABLE_KEYS.includes(key)) {
                result[key] = cmcdData[key];
            }
        }

        return result;
    }

    function getCmcdResponseInterceptors(){
        return [_cmcdResponseModeInterceptor];
    }

    function _cmcdResponseModeInterceptor(response){
        const requestType = response.request.customData.request.type;

        let cmcdData = {
            ...response.request.cmcd,
        };

        cmcdData = _addCmcdResponseModeData(response, cmcdData);
        const targets = settings.get().streaming.cmcd.targets
        const responseModeTargets = targets.filter((target) => target.cmcdMode === Constants.CMCD_MODE.RESPONSE);
        responseModeTargets.forEach(targetSettings => {
            if (targetSettings.enabled && cmcdModel._isIncludedInRequestFilter(requestType, targetSettings.includeOnRequests)){
                let httpRequest = new CmcdReportRequest();
                httpRequest.url = targetSettings.url;
                httpRequest.type = HTTPRequest.CMCD_RESPONSE;
                httpRequest.method = HTTPRequest.GET;
                httpRequest.cmcd = cmcdData;
                
                _updateRequestUrlAndHeadersWithCmcd(httpRequest, cmcdData, targetSettings)
                _sendCmcdDataReport(httpRequest);
            }
        });
        
        return response;
    }

    function _addCmcdResponseModeData(response, cmcdData){
        const responseModeData = {};
        const request = response.request.customData.request;
        const requestType = request.type;

        if (requestType === HTTPRequest.MEDIA_SEGMENT_TYPE){
            responseModeData.rc = response.status;
        }

        if (request.startDate && request.firstByteDate){
            responseModeData.ttfb = request.firstByteDate - request.startDate;
        }

        if (request.endDate && request.startDate){
            responseModeData.ttlb = request.endDate - request.startDate
        }

        if (request.url) {
            responseModeData.url = request.url
        }

        return {...cmcdData, ...responseModeData};
    }

    function _getCustomKeysValues(customKeysObj, currentKeys){
        const result = {};
        if (!customKeysObj || typeof customKeysObj !== 'object') {
            return result;
        }

        for (const key in customKeysObj) {
            if (typeof customKeysObj[key] === 'function') {
                result[key] = customKeysObj[key](currentKeys);
            }
        }
        return result;
    }

    function _getTargetSettingsEnabledKeys(targetSettings, cmcdData) {
        let enabledKeys;
        let customKeys

        if (targetSettings) {
            enabledKeys = targetSettings.enabledKeys;
        
            if (enabledKeys == null) {
                const cmcdKeysForTargetMode = _getAvailableKeysForTarget(targetSettings);
                enabledKeys = Constants.CMCD_AVAILABLE_KEYS.concat(cmcdKeysForTargetMode);
            }
        
            customKeys = _getCustomKeysValues(targetSettings.customKeys, cmcdData);
        }

        return [enabledKeys, customKeys];
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

        cmcdModel.resetInitialSettings();
    }

    instance = {
        getQueryParameter,
        getHeaderParameters,
        getCmcdRequestInterceptors,
        getCmcdResponseInterceptors,
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
