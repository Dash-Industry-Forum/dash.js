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
import Utils from '../../core/Utils.js';
import {CMCD_PARAM, CmcdObjectType, CmcdStreamType, CmcdStreamingFormat, encodeCmcd, toCmcdHeaders} from '@svta/common-media-library';

const CMCD_VERSION = 1;
const RTP_SAFETY_FACTOR = 5;

function CmcdModel() {

    let dashManifestModel,
        instance,
        internalData,
        abrController,
        dashMetrics,
        playbackController,
        throughputController,
        streamProcessors,
        _isStartup,
        _bufferLevelStarved,
        _initialMediaRequestsDone;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();

    function setup() {
        dashManifestModel = DashManifestModel(context).getInstance();

        _resetInitialSettings();
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);
        eventBus.on(MediaPlayerEvents.PERIOD_SWITCH_COMPLETED, _onPeriodSwitchComplete, instance);
    }

    function setConfig(config) {
        if (!config) return;

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
        _updateStreamProcessors();
    }

    function _onPeriodSwitchComplete() {
        _updateStreamProcessors();
    }

    function _updateStreamProcessors() {
        if (!playbackController) return;
        const streamController = playbackController.getStreamController();
        if (!streamController) return;
        if (typeof streamController.getActiveStream !== 'function') return;
        const activeStream = streamController.getActiveStream();
        if (!activeStream) return;
        streamProcessors = activeStream.getProcessors();
    }

    function getQueryParameter(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
                const cmcdData = _getCmcdData(request);
                const filteredCmcdData = _applyWhitelist(cmcdData);
                const finalPayloadString = encodeCmcd(filteredCmcdData);

                eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, {
                    url: request.url,
                    mediaType: request.mediaType,
                    cmcdData,
                    cmcdString: finalPayloadString
                });
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

    function _applyWhitelist(cmcdData) {
        try {
            const enabledCMCDKeys = settings.get().streaming.cmcd.enabledKeys;

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

    function getHeaderParameters(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
                const cmcdData = _getCmcdData(request);
                const filteredCmcdData = _applyWhitelist(cmcdData);
                const headers = toCmcdHeaders(filteredCmcdData)

                eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, {
                    url: request.url,
                    mediaType: request.mediaType,
                    cmcdData,
                    headers
                });
                return headers;
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _getCmcdData(request) {
        try {
            let cmcdData = null;

            if (request.type === HTTPRequest.MPD_TYPE) {
                return _getCmcdDataForMpd(request);
            } else if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                _initForMediaType(request.mediaType);
                return _getCmcdDataForMediaSegment(request);
            } else if (request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
                return _getCmcdDataForInitSegment(request);
            } else if (request.type === HTTPRequest.OTHER_TYPE || request.type === HTTPRequest.XLINK_EXPANSION_TYPE) {
                return _getCmcdDataForOther(request);
            } else if (request.type === HTTPRequest.LICENSE) {
                return _getCmcdDataForLicense(request);
            }

            return cmcdData;
        } catch (e) {
            return null;
        }
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

    function _getCmcdDataForMediaSegment(request) {
        const data = _getGenericCmcdData();
        const encodedBitrate = _getBitrateByRequest(request);
        const d = _getObjectDurationByRequest(request);
        const mtp = _getMeasuredThroughputByType(request.mediaType);
        const dl = _getDeadlineByType(request.mediaType);
        const bl = _getBufferLevelByType(request.mediaType);
        const tb = _getTopBitrateByType(request.mediaType);
        const pr = internalData.pr;

        const nextRequest = _probeNextRequest(request.mediaType);

        let ot;
        if (request.mediaType === Constants.VIDEO) ot = CmcdObjectType.VIDEO;
        if (request.mediaType === Constants.AUDIO) ot = CmcdObjectType.AUDIO;
        if (request.mediaType === Constants.TEXT) {
            if (request.mediaInfo.mimeType === 'application/mp4') {
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

        if (_bufferLevelStarved[request.mediaType]) {
            data.bs = true;
            _bufferLevelStarved[request.mediaType] = false;
        }

        if (_isStartup[request.mediaType] || !_initialMediaRequestsDone[request.mediaType]) {
            data.su = true;
            _isStartup[request.mediaType] = false;
            _initialMediaRequestsDone[request.mediaType] = true;
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
        const data = {};

        let cid = settings.get().streaming.cmcd.cid ? settings.get().streaming.cmcd.cid : internalData.cid;

        data.v = CMCD_VERSION;
        data.sid = settings.get().streaming.cmcd.sid ? settings.get().streaming.cmcd.sid : internalData.sid;

        data.sid = `${data.sid}`;

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

        return data;
    }

    function _getBitrateByRequest(request) {
        try {
            const quality = request.quality;
            const bitrateList = request.mediaInfo.bitrateList;

            return parseInt(bitrateList[quality].bandwidth / 1000);
        } catch (e) {
            return null;
        }
    }

    function _getTopBitrateByType(mediaType) {
        try {
            const info = abrController.getTopBitrateInfoFor(mediaType);
            return Math.round(info.bitrate / 1000);
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

    function _onPlaybackSeeked() {
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

    function _probeNextRequest(mediaType) {
        if (!streamProcessors || streamProcessors.length === 0) return;
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
            if (!playbackRate) playbackRate = 1;
            let {quality, mediaType, mediaInfo, duration} = request;

            if (!mediaInfo) {
                return NaN;
            }
            let currentBufferLevel = _getBufferLevelByType(mediaType);
            if (currentBufferLevel === 0) currentBufferLevel = 500;
            let bitrate = mediaInfo.bitrateList[quality].bandwidth;

            // Calculate RTP
            let segmentSize = (bitrate * duration) / 1000; // Calculate file size in kilobits
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

    function reset() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKED, _onPlaybackSeeked, instance);

        _resetInitialSettings();
    }

    instance = {
        getQueryParameter,
        getHeaderParameters,
        setConfig,
        reset,
        initialize
    };

    setup();

    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);
