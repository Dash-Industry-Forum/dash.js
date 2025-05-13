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
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import MetricsReportingEvents from '../metrics/MetricsReportingEvents.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Settings from '../../core/Settings.js';
import Constants from '../../streaming/constants/Constants.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import DashManifestModel from '../../dash/models/DashManifestModel.js';
import ClientDataReportingController from '../controllers/ClientDataReportingController.js';
import Debug from '../../core/Debug.js';
import Utils from '../../core/Utils.js';
import {CMCD_PARAM} from '@svta/common-media-library/cmcd/CMCD_PARAM';
import {CmcdObjectType} from '@svta/common-media-library/cmcd/CmcdObjectType';
import {CmcdStreamType} from '@svta/common-media-library/cmcd/CmcdStreamType';
import {CmcdStreamingFormat} from '@svta/common-media-library/cmcd/CmcdStreamingFormat';
import {encodeCmcd} from '@svta/common-media-library/cmcd/encodeCmcd';
import {toCmcdHeaders} from '@svta/common-media-library/cmcd/toCmcdHeaders';
import {CmcdHeaderField} from '@svta/common-media-library/cmcd/CmcdHeaderField';
import CmcdReportRequest from '../../streaming/vo/CmcdReportRequest.js';

import URLLoader from '../net/URLLoader.js';
import Errors from '../../core/errors/Errors.js';

const DEFAULT_CMCD_VERSION = 1;
const DEFAULT_INCLUDE_IN_REQUESTS = 'segment';
const RTP_SAFETY_FACTOR = 5;

function CmcdController() {

    let dashManifestModel,
        instance,
        logger,
        internalData,
        abrController,
        dashMetrics,
        playbackController,
        serviceDescriptionController,
        errHandler,
        mediaPlayerModel,
        throughputController,
        streamProcessors,
        clientDataReportingController,
        _lastMediaTypeRequest,
        _isStartup,
        _bufferLevelStarved,
        _initialMediaRequestsDone,
        _playbackStartedTime,
        _msdSent = {
            [Constants.CMCD_MODE.EVENT]: false,
            [Constants.CMCD_MODE.REQUEST]: false
        },
        urlLoader,
        _isSeeking;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();
    let debug = Debug(context).getInstance();

    const _loggedCmcdModeErrors = new Set();

    function setup() {
        dashManifestModel = DashManifestModel(context).getInstance();
        clientDataReportingController = ClientDataReportingController(context).getInstance();
        logger = debug.getLogger(instance);
        _resetInitialSettings();
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
            const triggerEventModeInterval = () => {
                _onEventChange(Constants.CMCD_REPORTING_EVENTS.TIME_INTERVAL);
                setTimeout(triggerEventModeInterval, (timeInterval * 1000));
            }
            triggerEventModeInterval();
        });
    }
    
    function _onStateChange(state) {
        internalData.sta = state;
        _onEventChange(Constants.CMCD_REPORTING_EVENTS.PLAY_STATE);
    }

    function _onEventChange(state){
        internalData.e = state;
        triggerCmcdEventMode(state);
    }

    function triggerCmcdEventMode(event){
        const targets = settings.get().streaming.cmcd.targets;
        const eventModeTargets = targets.filter((target) => target.cmcdMode === Constants.CMCD_MODE.EVENT);
        
        if (eventModeTargets.length === 0) {
            return;
        }
        
        const cmcdData = {
            ..._getGenericCmcdData(),
            ..._updateMsdData(Constants.CMCD_MODE.EVENT),
            e: event
        };

        if (event == 'e') {
            cmcdData.ec = internalData.ec;
        }
        
        eventModeTargets.forEach(targetSettings => {
            if (targetSettings.enabled) {
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

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (config.abrController) {
            abrController = config.abrController;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.throughputController) {
            throughputController = config.throughputController;
        }

        if (config.playbackController) {
            playbackController = config.playbackController;
        }

        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.mediaPlayerModel) {
            errHandler = config.errHandler;
        }
        
    }

    function _resetInitialSettings() {
        internalData = {
            pr: 1,
            nor: null,
            st: null,
            sf: null,
            sid: `${Utils.generateUuid()}`,
            cid: null
        };
        _bufferLevelStarved = {};
        _isStartup = {};
        _initialMediaRequestsDone = {};
        _lastMediaTypeRequest = undefined;
        _playbackStartedTime = undefined;
        _msdSent = {
            [Constants.CMCD_MODE.EVENT]: false,
            [Constants.CMCD_MODE.REQUEST]: false
        }
        _updateStreamProcessors();
    }

    function _onPeriodSwitchComplete() {
        _updateStreamProcessors();
    }

    function _onPlaybackStarted() {
        if (!_playbackStartedTime) {
            _playbackStartedTime = Date.now();
        }
    }

    function _onPlaybackPlaying() {
        _getMsdData();
        _onStateChange(Constants.CMCD_PLAYER_STATES.PLAYING);
    }

    function _getMsdData() {
        if (!_playbackStartedTime || internalData.msd) {
            return;
        }

        internalData.msd = Date.now() - _playbackStartedTime;
    }

    function _onPlayerError(errorData) {
        const errorCode = errorData.error.code ? errorData.error.code : 0
        internalData.ec = errorCode;
        _onEventChange(Constants.CMCD_REPORTING_EVENTS.ERROR);
    }

    function _updateStreamProcessors() {
        if (!playbackController) {
            return;
        }
        const streamController = playbackController.getStreamController();
        if (!streamController) {
            return;
        }
        if (typeof streamController.getActiveStream !== 'function') {
            return;
        }
        const activeStream = streamController.getActiveStream();
        if (!activeStream) {
            return;
        }
        streamProcessors = activeStream.getStreamProcessors();
    }

    function getQueryParameter(request, cmcdData, targetSettings) {
        try {
            if (isCmcdEnabled(targetSettings)) {

                cmcdData = cmcdData || getCmcdData(request);
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

        return enabledCMCDKeys.concat(Constants.CMCD_MANDATORY_KEYS);
    }

    function _applyWhitelist(cmcdData, enabledKeys) {
        try {
            const cmcdParametersFromManifest = getCmcdParametersFromManifest();
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

    function getHeaderParameters(request, cmcdData, targetSettings) {
        try {
            if (isCmcdEnabled(targetSettings)) {
                cmcdData = cmcdData || getCmcdData(request);

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
            const cmcdParametersFromManifest = getCmcdParametersFromManifest();
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
            enabledRequests = cmcdParametersFromManifest.includeInRequests ?? [DEFAULT_INCLUDE_IN_REQUESTS];
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
        const cmcdVersion = settings.get().streaming.cmcd.version ?? DEFAULT_CMCD_VERSION;
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

    function getCmcdParametersFromManifest() {
        let cmcdParametersFromManifest = {};
        if (serviceDescriptionController) {
            const serviceDescription = serviceDescriptionController.getServiceDescriptionSettings();
            if (
                settings.get().streaming.cmcd.applyParametersFromMpd &&
                serviceDescription.clientDataReporting &&
                serviceDescription.clientDataReporting.cmcdParameters
            ) {
                cmcdParametersFromManifest = serviceDescription.clientDataReporting.cmcdParameters;
            }
        }
        return cmcdParametersFromManifest;
    }

    function _isIncludedInRequestFilter(type, includeInRequests) {
        const cmcdParametersFromManifest = getCmcdParametersFromManifest();
        let includeInRequestsArray = includeInRequests || settings.get().streaming.cmcd.includeInRequests;

        if (cmcdParametersFromManifest.version) {
            includeInRequestsArray = cmcdParametersFromManifest.includeInRequests ? cmcdParametersFromManifest.includeInRequests : [DEFAULT_INCLUDE_IN_REQUESTS];
        }

        const filtersTypes = {
            [HTTPRequest.INIT_SEGMENT_TYPE]: 'segment',
            [HTTPRequest.MEDIA_SEGMENT_TYPE]: 'segment',
            [HTTPRequest.XLINK_EXPANSION_TYPE]: 'xlink',
            [HTTPRequest.MPD_TYPE]: 'mpd',
            [HTTPRequest.CONTENT_STEERING_TYPE]: 'steering',
            [HTTPRequest.OTHER_TYPE]: 'other',
        };

        return includeInRequestsArray.some(t => filtersTypes[type] === t);
    }

    function getCmcdData(request) {
        try {
            let cmcdData = null;

            
            cmcdData = {
                ..._updateLastMediaTypeRequest(request.type, request.mediaType)
            }

            if (_isIncludedInRequestFilter(request.type)) {
                if (request.type === HTTPRequest.MPD_TYPE) {
                    return _getCmcdDataForMpd(request);
                } else if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                    _initForMediaType(request.mediaType);
                    return _getCmcdDataForMediaSegment(request, request.mediaType);
                } else if (request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
                    return _getCmcdDataForInitSegment(request);
                } else if (request.type === HTTPRequest.OTHER_TYPE || request.type === HTTPRequest.XLINK_EXPANSION_TYPE) {
                    return _getCmcdDataForOther(request);
                } else if (request.type === HTTPRequest.LICENSE) {
                    return _getCmcdDataForLicense(request);
                } else if (request.type === HTTPRequest.CONTENT_STEERING_TYPE) {
                    return _getCmcdDataForSteering(request);
                }
            }
            return cmcdData;
        } catch (e) {
            return null;
        }
    }

    function _updateLastMediaTypeRequest(type, mediatype) {
        // Video > Audio > None
        if (mediatype === Constants.VIDEO || mediatype === Constants.AUDIO) {
            if (!_lastMediaTypeRequest || _lastMediaTypeRequest == Constants.AUDIO) {
                _lastMediaTypeRequest = mediatype;
            }
        }
    }

    function _getCmcdDataForSteering(request) {
        const data = !_lastMediaTypeRequest ? _getGenericCmcdData(request) : _getCmcdDataForMediaSegment(request, _lastMediaTypeRequest);

        data.ot = CmcdObjectType.OTHER;

        return data;
    }

    function _getCmcdDataForLicense(request) {
        const data = _getGenericCmcdData(request);

        data.ot = CmcdObjectType.KEY;

        return data;
    }

    function _getCmcdDataForMpd() {
        const data = _getGenericCmcdData();

        data.ot = CmcdObjectType.MANIFEST;

        return data;
    }

    function _getCmcdDataForMediaSegment(request, mediaType) {
        _initForMediaType(mediaType);
        const data = _getGenericCmcdData();
        const encodedBitrate = _getBitrateByRequest(request);
        const d = _getObjectDurationByRequest(request);
        const mtp = _getMeasuredThroughputByType(mediaType);
        const dl = _getDeadlineByType(mediaType);
        const bl = _getBufferLevelByType(mediaType);
        const tb = _getTopBitrateByType(request.representation?.mediaInfo);
        const pr = internalData.pr;

        const nextRequest = _probeNextRequest(mediaType);

        let ot;
        if (mediaType === Constants.VIDEO) {
            ot = CmcdObjectType.VIDEO;
        }
        if (mediaType === Constants.AUDIO) {
            ot = CmcdObjectType.AUDIO;
        }
        if (mediaType === Constants.TEXT) {
            if (request.representation.mediaInfo.mimeType === 'application/mp4') {
                ot = CmcdObjectType.TIMED_TEXT;
            } else {
                ot = CmcdObjectType.CAPTION;
            }
        }

        let rtp = settings.get().streaming.cmcd.rtp;
        if (!rtp) {
            rtp = _calculateRtp(request);
        }
        if (!isNaN(rtp)) {
            data.rtp = rtp;
        }

        if (nextRequest) {
            if (request.url !== nextRequest.url) {
                data.nor = encodeURIComponent(Utils.getRelativeUrl(request.url, nextRequest.url));
            } else if (nextRequest.range) {
                data.nrr = nextRequest.range;
            }
        }

        if (encodedBitrate) {
            data.br = encodedBitrate;
        }

        if (ot) {
            data.ot = ot;
        }

        if (!isNaN(d)) {
            data.d = d;
        }

        if (!isNaN(mtp)) {
            data.mtp = mtp;
        }

        if (!isNaN(dl)) {
            data.dl = dl;
        }

        if (!isNaN(bl)) {
            data.bl = bl;
        }

        if (!isNaN(tb)) {
            data.tb = tb;
        }

        if (!isNaN(pr) && pr !== 1) {
            data.pr = pr;
        }

        if (_bufferLevelStarved[mediaType]) {
            data.bs = true;
            _bufferLevelStarved[mediaType] = false;
        }

        if (_isStartup[mediaType] || !_initialMediaRequestsDone[mediaType]) {
            data.su = true;
            _isStartup[mediaType] = false;
            _initialMediaRequestsDone[mediaType] = true;
        }

        return data;
    }

    function _initForMediaType(mediaType) {

        if (!_initialMediaRequestsDone.hasOwnProperty(mediaType)) {
            _initialMediaRequestsDone[mediaType] = false;
        }

        if (!_isStartup.hasOwnProperty(mediaType)) {
            _isStartup[mediaType] = false;
        }

        if (!_bufferLevelStarved.hasOwnProperty(mediaType)) {
            _bufferLevelStarved[mediaType] = false;
        }
    }

    function _getCmcdDataForInitSegment() {
        const data = _getGenericCmcdData();

        data.ot = CmcdObjectType.INIT;
        data.su = true;

        return data;
    }

    function _getCmcdDataForOther() {
        const data = _getGenericCmcdData();

        data.ot = CmcdObjectType.OTHER;

        return data;
    }


    function _getGenericCmcdData() {
        const cmcdParametersFromManifest = getCmcdParametersFromManifest();
        const data = {};

        let cid = settings.get().streaming.cmcd.cid ? settings.get().streaming.cmcd.cid : internalData.cid;
        cid = cmcdParametersFromManifest.contentID ? cmcdParametersFromManifest.contentID : cid;

        data.v = settings.get().streaming.cmcd.version ?? DEFAULT_CMCD_VERSION;

        data.sid = settings.get().streaming.cmcd.sid ? settings.get().streaming.cmcd.sid : internalData.sid;
        data.sid = cmcdParametersFromManifest.sessionID ? cmcdParametersFromManifest.sessionID : data.sid;

        data.sid = `${data.sid}`;

        data.ts = Date.now();

        if (cid) {
            data.cid = `${cid}`;
        }

        if (!isNaN(internalData.pr) && internalData.pr !== 1 && internalData.pr !== null) {
            data.pr = internalData.pr;
        }

        if (internalData.st) {
            data.st = internalData.st;
        }

        if (internalData.sf) {
            data.sf = internalData.sf;
        }

        if (internalData.sta) {
            data.sta = internalData.sta;
        }

        if (internalData.e) {
            data.e = internalData.e;
        }

        if (data.v === 2) {
            let ltc = playbackController.getCurrentLiveLatency() * 1000;
            if (!isNaN(ltc)) {
                data.ltc = ltc;
            }
        }

        return data;
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

    function _getBitrateByRequest(request) {
        try {
            return parseInt(request.bandwidth / 1000);
        } catch (e) {
            return null;
        }
    }

    function _getTopBitrateByType(mediaInfo) {
        try {
            const bitrates = abrController.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => {
                return rep.bitrateInKbit
            });
            return Math.max(...bitrates)
        } catch (e) {
            return null;
        }
    }

    function _getObjectDurationByRequest(request) {
        try {
            return !isNaN(request.duration) ? Math.round(request.duration * 1000) : NaN;
        } catch (e) {
            return null;
        }
    }

    function _getMeasuredThroughputByType(mediaType) {
        try {
            return parseInt(throughputController.getSafeAverageThroughput(mediaType) / 100) * 100;
        } catch (e) {
            return null;
        }
    }

    function _getDeadlineByType(mediaType) {
        try {
            const playbackRate = internalData.pr;
            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);

            if (!isNaN(playbackRate) && !isNaN(bufferLevel)) {
                return parseInt((bufferLevel / playbackRate) * 10) * 100;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _getBufferLevelByType(mediaType) {
        try {
            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);

            if (!isNaN(bufferLevel)) {
                return parseInt(bufferLevel * 10) * 100;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _onPlaybackRateChanged(data) {
        try {
            internalData.pr = data.playbackRate;
        } catch (e) {

        }
    }

    function _onManifestLoaded(data) {
        try {
            const isDynamic = dashManifestModel.getIsDynamic(data.data);
            const st = isDynamic ? CmcdStreamType.LIVE : CmcdStreamType.VOD;
            const sf = data.protocol && data.protocol === 'MSS' ? CmcdStreamingFormat.SMOOTH : CmcdStreamingFormat.DASH;

            internalData.st = `${st}`;
            internalData.sf = `${sf}`;
        } catch (e) {
        }
    }

    function _onBufferLevelStateChanged(data) {
        try {
            if (data.state && data.mediaType) {
                if (data.state === MediaPlayerEvents.BUFFER_EMPTY) {

                    if (!_bufferLevelStarved[data.mediaType]) {
                        _bufferLevelStarved[data.mediaType] = true;
                    }
                    if (!_isStartup[data.mediaType]) {
                        _isStartup[data.mediaType] = true;
                    }
                }
            }
        } catch (e) {

        }
    }

    function _onPlaybackSeeking() {
        _isSeeking = true;

        _onStateChange(Constants.CMCD_PLAYER_STATES.SEEKING);
    }

    function _onPlaybackSeeked() {
        _isSeeking = false;

        for (let key in _bufferLevelStarved) {
            if (_bufferLevelStarved.hasOwnProperty(key)) {
                _bufferLevelStarved[key] = true;
            }
        }

        for (let key in _isStartup) {
            if (_isStartup.hasOwnProperty(key)) {
                _isStartup[key] = true;
            }
        }
    }

    function _onPlaybackWaiting() {
        _onStateChange(Constants.CMCD_PLAYER_STATES.WAITING);
        
        if (_isSeeking || !_playbackStartedTime) {
            return;
        }

        _onStateChange(Constants.CMCD_PLAYER_STATES.REBUFFERING);
    }

    function _probeNextRequest(mediaType) {
        if (!streamProcessors || streamProcessors.length === 0) {
            return;
        }
        for (let streamProcessor of streamProcessors) {
            if (streamProcessor.getType() === mediaType) {
                return streamProcessor.probeNextRequest();
            }
        }
    }

    function _calculateRtp(request) {
        try {
            // Get the values we need
            let playbackRate = playbackController.getPlaybackRate();
            if (!playbackRate) {
                playbackRate = 1;
            }
            let { bandwidth, mediaType, representation, duration } = request;
            const mediaInfo = representation.mediaInfo;

            if (!mediaInfo) {
                return NaN;
            }
            let currentBufferLevel = _getBufferLevelByType(mediaType);
            if (currentBufferLevel === 0) {
                currentBufferLevel = 500;
            }

            // Calculate RTP
            let segmentSize = (bandwidth * duration) / 1000; // Calculate file size in kilobits
            let timeToLoad = (currentBufferLevel / playbackRate) / 1000; // Calculate time available to load file in seconds
            let minBandwidth = segmentSize / timeToLoad; // Calculate the exact bandwidth required
            let rtpSafetyFactor = settings.get().streaming.cmcd.rtpSafetyFactor && !isNaN(settings.get().streaming.cmcd.rtpSafetyFactor) ? settings.get().streaming.cmcd.rtpSafetyFactor : RTP_SAFETY_FACTOR;
            let maxBandwidth = minBandwidth * rtpSafetyFactor; // Include a safety buffer


            // Round to the next multiple of 100
            return (parseInt(maxBandwidth / 100) + 1) * 100;
        } catch (e) {
            return NaN;
        }
    }

    function getCmcdRequestInterceptors() {
        // Add here request interceptors
        return [_cmcdRequestModeInterceptor];
    }

    function _cmcdRequestModeInterceptor(commonMediaRequest) {
        const requestType = commonMediaRequest.customData.request.type;

        if (!_isIncludedInRequestFilter(requestType)) {
            commonMediaRequest.cmcd = commonMediaRequest.customData.request.cmcd;
            return commonMediaRequest;
        }

        const request = commonMediaRequest.customData.request;
    
        const cmcdRequestData = {
            ...getCmcdData(request),
            ..._updateMsdData(Constants.CMCD_MODE.REQUEST)
        };

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

    function _updateMsdData(mode) {
        const cmcdVersion = settings.get().streaming.cmcd.version ?? DEFAULT_CMCD_VERSION;
        const data = {};
        const msd = internalData.msd;

        if (cmcdVersion === 2) {
            if (!_msdSent[mode] && !isNaN(msd)) {
                data.msd = msd;
                _msdSent[mode] = true;
            }
        }
    
        return data;
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
            const cmcdParameters = getCmcdParametersFromManifest();
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
            if (targetSettings.enabled && _isIncludedInRequestFilter(requestType, targetSettings.includeOnRequests)){
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

    function _sendCmcdDataReport(request){
        urlLoader = URLLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errors: Errors,
        });

        urlLoader.load({request})
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

        _resetInitialSettings();
    }

    instance = {
        getCmcdData,
        getQueryParameter,
        getHeaderParameters,
        getCmcdParametersFromManifest,
        getCmcdRequestInterceptors,
        getCmcdResponseInterceptors,
        setConfig,
        reset,
        initialize,
        isCmcdEnabled,
    };

    setup();

    return instance;
}

CmcdController.__dashjs_factory_name = 'CmcdController';
export default FactoryMaker.getSingletonFactory(CmcdController);
