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
    toCmcdValue,
} from '@svta/cml-cmcd';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import Utils from '../../core/Utils.js';
import Constants from '../../streaming/constants/Constants.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import DashManifestModel from '../../dash/models/DashManifestModel.js';
import CmcdConfigAccessor from '../cmcd/config/CmcdConfigAccessor.js';

const RTP_SAFETY_FACTOR = 5;

const REQUEST_TYPE_TO_CMCD_FILTER = {
    [HTTPRequest.INIT_SEGMENT_TYPE]: 'segment',
    [HTTPRequest.MEDIA_SEGMENT_TYPE]: 'segment',
    [HTTPRequest.XLINK_EXPANSION_TYPE]: 'xlink',
    [HTTPRequest.MPD_TYPE]: 'mpd',
    [HTTPRequest.CONTENT_STEERING_TYPE]: 'steering',
    [HTTPRequest.OTHER_TYPE]: 'other',
};

function CmcdModel() {
    let instance,
        dashMetrics,
        serviceDescriptionController,
        playbackController,
        abrController,
        throughputController,
        cmcdConfigAccessor,
        _lastMediaTypeRequest,
        _isStartup,
        _bufferLevelStarved,
        _initialMediaRequestsDone,
        _playbackStartedTime,
        _isSeeking,
        streamProcessors,
        _rebufferingStartTime = {},
        _rebufferingDuration = {},
        _streamType,
        _streamingFormat,
        _topBitrateCache;

    let context = this.context;

    function setup() {
        cmcdConfigAccessor = CmcdConfigAccessor(context).getInstance();
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

    function _isValidValue(value) {
        return value !== null && value !== undefined && !isNaN(value) && isFinite(value);
    }

    function _toInnerList(videoValue, audioValue) {
        const values = [];
        if (_isValidValue(videoValue)) {
            values.push(toCmcdValue(videoValue, { v: true }));
        }
        if (_isValidValue(audioValue)) {
            values.push(toCmcdValue(audioValue, { a: true }));
        }
        return values.length > 0 ? values : null;
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

        const rtp = cmcdConfigAccessor.has('rtp')
            ? cmcdConfigAccessor.get('rtp')
            : _calculateRtp(request);
        if (!isNaN(rtp)) {
            data.rtp = rtp;
        }

        if (nextRequest) {
            if (request.url !== nextRequest.url) {
                const relativeUrl = Utils.getRelativeUrl(request.url, nextRequest.url);
                const params = nextRequest.range ? { r: nextRequest.range } : undefined;
                data.nor = [toCmcdValue(relativeUrl, params)];
            }
        }

        if (encodedBitrate) {
            const videoBr = mediaType === Constants.VIDEO ? encodedBitrate : null;
            const audioBr = mediaType === Constants.AUDIO ? encodedBitrate : null;
            data.br = _toInnerList(videoBr, audioBr) || [toCmcdValue(encodedBitrate, {})];
        }

        if (ot) {
            data.ot = ot;
        }

        if (!isNaN(d)) {
            data.d = d;
        }

        if (!isNaN(mtp)) {
            const videoMtp = mediaType === Constants.VIDEO ? mtp : null;
            const audioMtp = mediaType === Constants.AUDIO ? mtp : null;
            data.mtp = _toInnerList(videoMtp, audioMtp) || [toCmcdValue(mtp, {})];
        }

        if (!isNaN(dl)) {
            data.dl = dl;
        }

        if (!isNaN(bl)) {
            const videoBl = mediaType === Constants.VIDEO ? bl : null;
            const audioBl = mediaType === Constants.AUDIO ? bl : null;
            data.bl = _toInnerList(videoBl, audioBl) || [toCmcdValue(bl, {})];
        }

        if (!isNaN(tb) && isFinite(tb)) {
            const videoTb = mediaType === Constants.VIDEO ? tb : null;
            const audioTb = mediaType === Constants.AUDIO ? tb : null;
            data.tb = _toInnerList(videoTb, audioTb) || [toCmcdValue(tb, {})];
        }

        if (tpb !== null && !isNaN(tpb)) {
            const videoTpb = mediaType === Constants.VIDEO ? tpb : null;
            const audioTpb = mediaType === Constants.AUDIO ? tpb : null;
            data.tpb = _toInnerList(videoTpb, audioTpb) || [toCmcdValue(tpb, {})];
        }

        if (pb !== null && !isNaN(pb)) {
            const videoPb = mediaType === Constants.VIDEO ? pb : null;
            const audioPb = mediaType === Constants.AUDIO ? pb : null;
            data.pb = _toInnerList(videoPb, audioPb) || [toCmcdValue(pb, {})];
        }

        if (_bufferLevelStarved[mediaType]) {
            data.bs = true;
            _bufferLevelStarved[mediaType] = false;
        }

        if (_rebufferingDuration[mediaType]) {
            const videoBsd = mediaType === Constants.VIDEO ? _rebufferingDuration[mediaType] : null;
            const audioBsd = mediaType === Constants.AUDIO ? _rebufferingDuration[mediaType] : null;
            data.bsd = _toInnerList(videoBsd, audioBsd) || [toCmcdValue(_rebufferingDuration[mediaType], {})];
            delete _rebufferingDuration[mediaType];
        }

        if (_isStartup[mediaType] || !_initialMediaRequestsDone[mediaType]) {
            data.su = true;
            _isStartup[mediaType] = false;
            _initialMediaRequestsDone[mediaType] = true;
        }

        Object.assign(data, _getAggregatedBitrateData());

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

    function _getEncodedBitrateData() {
        const data = {};
        const activeStream = playbackController.getStreamController()?.getActiveStream();
        if (!activeStream) {
            return data;
        }

        const videoRep = activeStream.getCurrentRepresentationForType(Constants.VIDEO);
        const audioRep = activeStream.getCurrentRepresentationForType(Constants.AUDIO);
        const videoBr = videoRep ? Math.round(videoRep.bitrateInKbit) : null;
        const audioBr = audioRep ? Math.round(audioRep.bitrateInKbit) : null;
        const brValues = _toInnerList(videoBr, audioBr);
        if (brValues) {
            data.br = brValues;
        }

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
            // Within a single request's data build the same representation list backs both tb and
            // tpb. Reuse the result so the list is rebuilt once per mediaInfo, not per key.
            if (_topBitrateCache && _topBitrateCache.has(mediaInfo)) {
                return _topBitrateCache.get(mediaInfo);
            }
            const bitrates = abrController.getPossibleVoRepresentationsFilteredBySettings(mediaInfo).map((rep) => {
                return rep.bitrateInKbit
            });
            const tb = Math.max(...bitrates);
            if (_topBitrateCache) {
                _topBitrateCache.set(mediaInfo, tb);
            }
            return tb;
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

    function _getPlayheadBitrateData() {
        const data = {};
        const videoPb = _getPlayheadBitrate(Constants.VIDEO);
        const audioPb = _getPlayheadBitrate(Constants.AUDIO);
        const pbValues = _toInnerList(videoPb, audioPb);
        if (pbValues) {
            data.pb = pbValues;
        }

        return data;
    }

    function _getTopBitrateDataForType(mediaType) {
        if (!streamProcessors || streamProcessors.length === 0) {
            return null;
        }
        const sp = streamProcessors.find(p => p.getType() === mediaType);
        if (!sp) {
            return null;
        }
        const mediaInfo = sp.getMediaInfo();
        const tb = _getTopBitrateByType(mediaInfo);
        return isFinite(tb) && tb > 0 ? tb : null;
    }

    function _getTopBitrateData() {
        const data = {};
        const videoTb = _getTopBitrateDataForType(Constants.VIDEO);
        const audioTb = _getTopBitrateDataForType(Constants.AUDIO);
        const tbValues = _toInnerList(videoTb, audioTb);
        if (tbValues) {
            data.tb = tbValues;
        }

        const videoTpb = _getTopPlayableBitrate(Constants.VIDEO);
        const audioTpb = _getTopPlayableBitrate(Constants.AUDIO);
        const tpbValues = _toInnerList(videoTpb, audioTpb);
        if (tpbValues) {
            data.tpb = tpbValues;
        }

        return data;
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

    function _getMeasuredThroughputData() {
        const data = {};
        const videoMtp = _getMeasuredThroughputByType(Constants.VIDEO);
        const audioMtp = _getMeasuredThroughputByType(Constants.AUDIO);
        const mtpValues = _toInnerList(videoMtp, audioMtp);
        if (mtpValues) {
            data.mtp = mtpValues;
        }

        return data;
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

    function _getBufferLevelData() {
        const data = {};
        const videoBl = _getBufferLevelByType(Constants.VIDEO);
        const audioBl = _getBufferLevelByType(Constants.AUDIO);
        const blValues = _toInnerList(videoBl, audioBl);
        if (blValues) {
            data.bl = blValues;
        }

        return data;
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

        // Note: ts, st, sf, pr are handled by CmcdReporter:
        // - ts: auto-generated by recordEvent() / recordResponseReceived()
        // - st, sf: persisted via cmcdReporter.update() in _onManifestLoaded
        // - pr: persisted via cmcdReporter.update() in _onPlaybackRateChanged

        let ltc = playbackController.getCurrentLiveLatency() * 1000;
        if (!isNaN(ltc)) {
            data.ltc = ltc;
        }

        if (typeof document !== 'undefined' && document.hidden) {
            data.bg = true;
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

    function getEventModeData(){
        const cmcdData = {
            ...getGenericCmcdData(),
            ..._getAggregatedBitrateData(),
            ..._getEncodedBitrateData(),
            ..._getBufferLevelData(),
            ..._getMeasuredThroughputData(),
            ..._getPlayheadBitrateData(),
            ..._getTopBitrateData(),
        };

        return cmcdData;
    }


    function resetInitialSettings() {
        _bufferLevelStarved = {};
        _isStartup = {};
        _initialMediaRequestsDone = {};
        _isSeeking = false;
        _lastMediaTypeRequest = undefined;
        _playbackStartedTime = undefined;
        _rebufferingStartTime = {};
        _rebufferingDuration = {};
        _streamType = undefined;
        _streamingFormat = undefined;

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
            const rtpSafetyFactor = cmcdConfigAccessor.get('rtpSafetyFactor', { defaultValue: RTP_SAFETY_FACTOR });
            let maxBandwidth = minBandwidth * rtpSafetyFactor; // Include a safety buffer


            // Round to the next multiple of 100
            return (parseInt(maxBandwidth / 100) + 1) * 100;
        } catch (e) {
            return NaN;
        }
    }

    function calculateMsd() {
        const data = {};
        const msd = _calculateMsd();

        if (msd !== null && !isNaN(msd)) {
            data.msd = msd;
        }

        return data;
    }

    function onPlaybackRateChanged(data) {
        if (data.playbackRate !== undefined) {
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


        return cmcdParametersFromManifest;
    }

    function updateCmcdManifestParamsInCmcdConfigAccessor() {
        const cmcdParametersFromManifest = getCmcdParametersFromManifest();

        // Update CmcdConfigAccessor with manifest parameters if available
        // Note: Always update accessor when params exist, regardless of applyParametersFromMpd
        // The accessor uses priority-based resolution, so manifest params will only be used
        // when they have higher priority in the PropertyMap configuration
        if (cmcdConfigAccessor && Object.keys(cmcdParametersFromManifest).length > 0) {
            cmcdConfigAccessor.setManifestParams(cmcdParametersFromManifest);
        } else if (cmcdConfigAccessor) {
            // Clear manifest params if none are available
            cmcdConfigAccessor.setManifestParams(null);
        }

    }

    function deriveCmcdDataForRequest(request) {
        // Share one top-bitrate computation across this request's data build (tb and tpb both
        // resolve it from the representation list). Scoped to the call, so a later request still
        // recomputes and runtime setting changes remain reflected.
        _topBitrateCache = new Map();
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
        } finally {
            _topBitrateCache = null;
        }
    }

    function isIncludedInRequestFilter(type, includeInRequests) {
        const includeInRequestsArray = includeInRequests ?? cmcdConfigAccessor.get('includeInRequests');
        const filterType = REQUEST_TYPE_TO_CMCD_FILTER[type];

        return filterType !== undefined && includeInRequestsArray.includes(filterType);
    }

    function reset() {
        resetInitialSettings();
    }

    function _updateLastMediaTypeRequest(type, mediatype) {
        // Video > Audio > None
        if (mediatype === Constants.VIDEO || mediatype === Constants.AUDIO) {
            if (!_lastMediaTypeRequest || _lastMediaTypeRequest === Constants.AUDIO) {
                _lastMediaTypeRequest = mediatype;
            }
        }
    }

    function _calculateCmcdDataForRequestForSteering(request) {
        const data = !_lastMediaTypeRequest ? getGenericCmcdData() : _calculateCmcdDataForRequestForMediaSegment(request, _lastMediaTypeRequest);

        data.ot = CmcdObjectType.OTHER;

        return data;
    }

    function _calculateCmcdDataForRequestForLicense() {
        const data = getGenericCmcdData();

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

        const currentVideoBitrate = videoRep ? videoRep.bitrateInKbit : 0;
        const currentAudioBitrate = audioRep ? audioRep.bitrateInKbit : 0;

        // Calculate aggregated bitrate
        const abValues = _toInnerList(
            currentVideoBitrate > 0 ? Math.round(currentVideoBitrate) : null,
            currentAudioBitrate > 0 ? Math.round(currentAudioBitrate) : null
        );
        if (abValues) {
            data.ab = abValues;
        }

        // Calculate top aggregated bitrate
        const allVideoReps = activeStream.getRepresentationsByType(Constants.VIDEO) || [];
        const allAudioReps = activeStream.getRepresentationsByType(Constants.AUDIO) || [];
        const topVideoBitrate = allVideoReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
        const topAudioBitrate = allAudioReps.reduce((max, rep) => Math.max(max, rep.bitrateInKbit), 0);
        const tabValues = _toInnerList(
            topVideoBitrate > 0 ? Math.round(topVideoBitrate) : null,
            topAudioBitrate > 0 ? Math.round(topAudioBitrate) : null
        );
        if (tabValues) {
            data.tab = tabValues;
        }

        // Calculate lowest aggregated bitrate
        const lowestVideoBitrate = allVideoReps.length > 0 ? Math.min(...allVideoReps.map(rep => rep.bitrateInKbit)) : 0;
        const lowestAudioBitrate = allAudioReps.length > 0 ? Math.min(...allAudioReps.map(rep => rep.bitrateInKbit)) : 0;
        const labValues = _toInnerList(
            lowestVideoBitrate > 0 ? Math.round(lowestVideoBitrate) : null,
            lowestAudioBitrate > 0 ? Math.round(lowestAudioBitrate) : null
        );
        if (labValues) {
            data.lab = labValues;
        }

        return data;
    }

    function getLastMediaTypeRequest() {
        return _lastMediaTypeRequest;
    }

    instance = {
        calculateMsd,
        deriveCmcdDataForRequest,
        getCmcdParametersFromManifest,
        getEventModeData,
        getLastMediaTypeRequest,
        isIncludedInRequestFilter,
        onBufferLevelStateChanged,
        onManifestLoaded,
        onPeriodSwitchComplete,
        onPlaybackPlaying,
        onPlaybackRateChanged,
        onPlaybackSeeked,
        onPlaybackSeeking,
        onPlaybackStarted,
        onRebufferingCompleted,
        onRebufferingStarted,
        reset,
        resetInitialSettings,
        setConfig,
        setup,
        updateCmcdManifestParamsInCmcdConfigAccessor,
        wasPlaying,
    };

    setup();

    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);
