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

import {
    CmcdObjectType,
    CmcdStreamType,
    CmcdStreamingFormat,
} from '@svta/cml-cmcd';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import Utils from '../../core/Utils.js';
import Constants from '../../streaming/constants/Constants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import DashManifestModel from '../../dash/models/DashManifestModel.js';
import CmcdConfigAccessor from '../cmcd/config/CmcdConfigAccessor.js';

const RTP_SAFETY_FACTOR = 5;

function CmcdModel() {
    let instance,
        dashMetrics,
        serviceDescriptionController,
        playbackController,
        abrController,
        throughputController,
        cmcdConfig,
        _lastMediaTypeRequest,
        _isStartup,
        _bufferLevelStarved,
        _initialMediaRequestsDone,
        _playbackStartedTime,
        _isSeeking,
        streamProcessors,
        _msdSent = {
            [Constants.CMCD_REPORTING_MODE.EVENT]: false,
            [Constants.CMCD_REPORTING_MODE.REQUEST]: false
        },
        _rebufferingStartTime = {},
        _rebufferingDuration = {},
        _streamType,
        _streamingFormat,
        _playbackRate;

    let context = this.context;

    function setup() {
        cmcdConfig = CmcdConfigAccessor(context).getInstance();
        resetInitialSettings();
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

        if (config.playbackController) {
            playbackController = config.playbackController;
        }

        if (config.throughputController) {
            throughputController = config.throughputController;
        }

        if (config.serviceDescriptionController) {
            serviceDescriptionController = config.serviceDescriptionController;
        }
    }

    function _calculateCmcdDataForRequestForMediaSegment(request, mediaType) {
        _initForMediaType(mediaType);
        const data = getGenericCmcdData(mediaType);
        const encodedBitrate = _getBitrateByRequest(request);
        const d = _getObjectDurationByRequest(request);
        const mtp = _getMeasuredThroughputByType(mediaType);
        const dl = _getDeadlineByType(mediaType);
        const bl = _getBufferLevelByType(mediaType);
        const tb = _getTopBitrateByType(request.representation?.mediaInfo);
        const tpb = _getTopPlayableBitrate(mediaType);
        const pb = _getPlayheadBitrate(mediaType);
        const nextRequest = _probeNextRequest(mediaType);

        let ot;
        if (mediaType === Constants.VIDEO) {
            ot = CmcdObjectType.VIDEO;
        }
        if (mediaType === Constants.AUDIO) {
            ot = CmcdObjectType.AUDIO;
        }
        if (request.mediaType === Constants.ENHANCEMENT) {
            ot = CmcdObjectType.OTHER;
        }
        if (mediaType === Constants.TEXT) {
            if (request.representation.mediaInfo.mimeType === 'application/mp4') {
                ot = CmcdObjectType.TIMED_TEXT;
            } else {
                ot = CmcdObjectType.CAPTION;
            }
        }

        const rtp = cmcdConfig.has('rtp')
            ? cmcdConfig.get('rtp')
            : _calculateRtp(request);
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

        if (tpb !== null && !isNaN(tpb)) {
            data.tpb = tpb;
        }
        
        if (pb !== null && !isNaN(pb)) {
            data.pb = pb;
        }

        if (_bufferLevelStarved[mediaType]) {
            data.bs = true;
            _bufferLevelStarved[mediaType] = false;
        }

        if (_rebufferingDuration[mediaType]) {
            data.bsd = _rebufferingDuration[mediaType];
            delete _rebufferingDuration[mediaType];
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

    function _calculateCmcdDataForRequestForInitSegment() {
        const data = getGenericCmcdData();

        data.ot = CmcdObjectType.INIT;
        data.su = true;

        return data;
    }

    function _calculateCmcdDataForRequestForOther() {
        const data = getGenericCmcdData();

        data.ot = CmcdObjectType.OTHER;

        return data;
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

    function _getPlayheadBitrate(mediaType) {
        try {
            if (!streamProcessors || streamProcessors.length === 0) {
                return null;
            }
            
            const streamProcessor = streamProcessors.find(sp => sp.getType() === mediaType);
            const bitrate = streamProcessor?.getRepresentationController()?.getCurrentRepresentation()?.bitrateInKbit;

            if (bitrate !== undefined && !isNaN(bitrate)) {
                return Math.round(bitrate);
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _getTopPlayableBitrate(mediaType) {
        try {
            if (!streamProcessors || streamProcessors.length === 0) {
                return null;
            }

            const streamProcessor = streamProcessors.find(p => p.getType() === mediaType);

            if (streamProcessor) {
                const mediaInfo = streamProcessor.getMediaInfo();
                const topBitrate = _getTopBitrateByType(mediaInfo);

                // _getTopBitrateByType can return -Infinity for empty arrays, which is not a valid bitrate.
                return isFinite(topBitrate) && topBitrate > 0 ? topBitrate : null;
            }

            return null;
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
            const playbackRate = playbackController ? playbackController.getPlaybackRate() : 1;
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



    function onBufferLevelStateChanged(data) {
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

    function onPlaybackSeeking() {
        _isSeeking = true;
    }

    function onPlaybackSeeked() {
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

    function wasPlaying() {
        return !_isSeeking && _playbackStartedTime;
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

    function onPeriodSwitchComplete() {
        _updateStreamProcessors();
    }

    function onPlaybackStarted() {
        if (!_playbackStartedTime) {
            _playbackStartedTime = Date.now();
        }
    }

    function onPlaybackPlaying() {
        for (const mediaType in _rebufferingStartTime) {
            if (_rebufferingStartTime.hasOwnProperty(mediaType)) {
                onRebufferingCompleted(mediaType);
            }
        }
    }

    function onRebufferingStarted(mediaType) {
        if (mediaType && !_rebufferingStartTime[mediaType]) {
            _rebufferingStartTime[mediaType] = Date.now();
        }
    }

    function onRebufferingCompleted(mediaType) {
        if (_rebufferingStartTime[mediaType] != null) {
            _rebufferingDuration[mediaType] = Date.now() - _rebufferingStartTime[mediaType];
            delete _rebufferingStartTime[mediaType];
        }
    }

    function _calculateMsd() {
        if (!_playbackStartedTime) {
            return null;
        }
        return Date.now() - _playbackStartedTime;
    }

    function getGenericCmcdData(mediaType) {
        const data = {};

        data.ts = Date.now();

        if (_streamType) {
            data.st = _streamType;
        }
        if (_streamingFormat) {
            data.sf = _streamingFormat;
        }
        if (_playbackRate !== undefined && _playbackRate !== 1) {
            data.pr = _playbackRate;
        }

        const cmcdVersion = cmcdConfig.getVersion();
        if (cmcdVersion === 2) {
            let ltc = playbackController.getCurrentLiveLatency() * 1000;
            if (!isNaN(ltc)) {
                data.ltc = ltc;
            }

            if (typeof document !== 'undefined' && document.hidden) {
                data.bg = true;
            }
        }

        if (mediaType && _shouldIncludeDroppedFrames(mediaType)) {
            const droppedFrames = dashMetrics.getCurrentDroppedFrames()?.droppedFrames;
            if (droppedFrames > 0) {
                data.df = droppedFrames;
            }
        }

        return data;
    }

    function _shouldIncludeDroppedFrames(mediaType) {
        return mediaType === Constants.VIDEO ||
               mediaType === Constants.AUDIO ||
               mediaType === Constants.OTHER;
    }

    function triggerCmcdEventMode(){
        const cmcdData = {
            ...getGenericCmcdData(),
            ...updateMsdData(Constants.CMCD_REPORTING_MODE.EVENT),
            ..._getAggregatedBitrateData(),
        };

        return cmcdData;
    }


    function resetInitialSettings() {
        _bufferLevelStarved = {};
        _isStartup = {};
        _initialMediaRequestsDone = {};
        _lastMediaTypeRequest = undefined;
        _playbackStartedTime = undefined;
        _rebufferingStartTime = {};
        _rebufferingDuration = {};
        _streamType = undefined;
        _streamingFormat = undefined;
        _playbackRate = undefined;
        _msdSent = {
            [Constants.CMCD_REPORTING_MODE.EVENT]: false,
            [Constants.CMCD_REPORTING_MODE.REQUEST]: false
        }

        _updateStreamProcessors();
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

    function _calculateRtp(request) {
        try {
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
            const rtpSafetyFactor = cmcdConfig.get('rtpSafetyFactor', { defaultValue: RTP_SAFETY_FACTOR });
            let maxBandwidth = minBandwidth * rtpSafetyFactor; // Include a safety buffer


            // Round to the next multiple of 100
            return (parseInt(maxBandwidth / 100) + 1) * 100;
        } catch (e) {
            return NaN;
        }
    }

    function updateMsdData(mode) {
        const cmcdVersion = cmcdConfig.getVersion();
        const data = {};
        const msd = _calculateMsd();

        if (cmcdVersion === 2) {
            if (!_msdSent[mode] && msd !== null && !isNaN(msd)) {
                data.msd = msd;
                _msdSent[mode] = true;
            }
        }

        return data;
    }

    function onPlaybackRateChanged(data) {
        if (data.playbackRate !== undefined) {
            _playbackRate = data.playbackRate;
            return { pr: data.playbackRate };
        }
        return null;
    }

    function onManifestLoaded(data) {
        try {
            const dashManifestModel = DashManifestModel(context).getInstance();
            const isDynamic = dashManifestModel.getIsDynamic(data.data);
            _streamType = isDynamic ? `${CmcdStreamType.LIVE}` : `${CmcdStreamType.VOD}`;
            _streamingFormat = data.protocol && data.protocol === 'MSS' ? `${CmcdStreamingFormat.SMOOTH}` : `${CmcdStreamingFormat.DASH}`;
            return { st: _streamType, sf: _streamingFormat };
        } catch (e) {
            return {};
        }
    }

    function getCmcdParametersFromManifest() {
        let cmcdParametersFromManifest = {};
        if (serviceDescriptionController) {
            const serviceDescription = serviceDescriptionController.getServiceDescriptionSettings();
            if (
                serviceDescription.clientDataReporting &&
                serviceDescription.clientDataReporting.cmcdParameters
            ) {
                cmcdParametersFromManifest = serviceDescription.clientDataReporting.cmcdParameters;
            }
        }

        // Update CmcdConfigAccessor with manifest parameters if available
        // Note: Always update accessor when params exist, regardless of applyParametersFromMpd
        // The accessor uses priority-based resolution, so manifest params will only be used
        // when they have higher priority in the PropertyMap configuration
        if (cmcdConfig && Object.keys(cmcdParametersFromManifest).length > 0) {
            cmcdConfig.setManifestParams(cmcdParametersFromManifest);
        } else if (cmcdConfig) {
            // Clear manifest params if none are available
            cmcdConfig.setManifestParams(null);
        }

        return cmcdParametersFromManifest;
    }

    function calculateCmcdDataForRequest(request) {
        try {
            _updateLastMediaTypeRequest(request.type, request.mediaType);
            let cmcdData = {};

            if (isIncludedInRequestFilter(request.type)) {
                if (request.type === HTTPRequest.MPD_TYPE) {
                    return _calculateCmcdDataForRequestForMpd(request);
                } else if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                    _initForMediaType(request.mediaType);
                    return _calculateCmcdDataForRequestForMediaSegment(request, request.mediaType);
                } else if (request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
                    return _calculateCmcdDataForRequestForInitSegment(request);
                } else if (request.type === HTTPRequest.OTHER_TYPE || request.type === HTTPRequest.XLINK_EXPANSION_TYPE) {
                    return _calculateCmcdDataForRequestForOther(request);
                } else if (request.type === HTTPRequest.LICENSE) {
                    return _calculateCmcdDataForRequestForLicense(request);
                } else if (request.type === HTTPRequest.CONTENT_STEERING_TYPE) {
                    return _calculateCmcdDataForRequestForSteering(request);
                }
            }
            return cmcdData;
        } catch (e) {
            return null;
        }
    }

    function isIncludedInRequestFilter(type, includeInRequests) {
        const includeInRequestsArray = includeInRequests || cmcdConfig.get('includeInRequests');

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

    function reset() {
        resetInitialSettings();
    }

    function _updateLastMediaTypeRequest(type, mediatype) {
        // Video > Audio > None
        if (mediatype === Constants.VIDEO || mediatype === Constants.AUDIO) {
            if (!_lastMediaTypeRequest || _lastMediaTypeRequest == Constants.AUDIO) {
                _lastMediaTypeRequest = mediatype;
            }
        }
    }

    function _calculateCmcdDataForRequestForSteering(request) {
        const data = !_lastMediaTypeRequest ? getGenericCmcdData(request) : _calculateCmcdDataForRequestForMediaSegment(request, _lastMediaTypeRequest);

        data.ot = CmcdObjectType.OTHER;

        return data;
    }

    function _calculateCmcdDataForRequestForLicense(request) {
        const data = getGenericCmcdData(request);

        data.ot = CmcdObjectType.KEY;

        return data;
    }

    function _calculateCmcdDataForRequestForMpd() {
        const data = getGenericCmcdData();

        data.ot = CmcdObjectType.MANIFEST;

        return data;
    }

    function _getAggregatedBitrateData() {
        // defining data to return
        const data = {};
        // accessing active stream
        const activeStream = playbackController.getStreamController()?.getActiveStream();
        if (!activeStream) {
            return data;
        }   
 
        // Get current representations
        const videoRep = activeStream.getCurrentRepresentationForType(Constants.VIDEO);
        const audioRep = activeStream.getCurrentRepresentationForType(Constants.AUDIO);

        // Calculate aggregated bitrate (current video + audio)
        const currentVideoBitrate = videoRep ? videoRep.bitrateInKbit : 0;
        const currentAudioBitrate = audioRep ? audioRep.bitrateInKbit : 0;
        const aggregatedBitrate = currentVideoBitrate + currentAudioBitrate;
        if (aggregatedBitrate > 0) {
            data.ab = Math.round(aggregatedBitrate);
        }

        // Calculate top aggregated bitrate (max video + max audio)
        const allVideoReps = activeStream.getRepresentationsByType(Constants.VIDEO) || [];
        const allAudioReps = activeStream.getRepresentationsByType(Constants.AUDIO) || [];
        const topVideoBitrate = allVideoReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
        const topAudioBitrate = allAudioReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
        const topAggregatedBitrate = topVideoBitrate + topAudioBitrate;
        if (topAggregatedBitrate > 0) {
            data.tab = Math.round(topAggregatedBitrate);
        }

        // Calculate lowest aggregated bitrate (min video + min audio)
        const lowestVideoBitrate = allVideoReps.length > 0 ? Math.min(...allVideoReps.map(rep => rep.bitrateInKbit)) : 0;
        const lowestAudioBitrate = allAudioReps.length > 0 ? Math.min(...allAudioReps.map(rep => rep.bitrateInKbit)) : 0;
        const lowestAggregatedBitrate = lowestVideoBitrate + lowestAudioBitrate;
        if (lowestAggregatedBitrate > 0) {
            data.lab = Math.round(lowestAggregatedBitrate);
        }

        return data;
    }
    
    function getLastMediaTypeRequest() {
        return _lastMediaTypeRequest;
    }

    instance = {
        setup,
        reset,
        setConfig,
        calculateCmcdDataForRequest,
        onPeriodSwitchComplete,
        onPlaybackStarted,
        onPlaybackPlaying,
        onRebufferingStarted,
        onRebufferingCompleted,
        onPlaybackSeeking,
        onPlaybackSeeked,
        wasPlaying,
        onBufferLevelStateChanged,
        updateMsdData,
        resetInitialSettings,
        getCmcdParametersFromManifest,
        onPlaybackRateChanged,
        onManifestLoaded,
        triggerCmcdEventMode,
        isIncludedInRequestFilter,
        getLastMediaTypeRequest
    };

    setup();

    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);