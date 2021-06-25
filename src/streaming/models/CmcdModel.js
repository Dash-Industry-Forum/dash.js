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
import EventBus from '../../core/EventBus';
import MediaPlayerEvents from '../MediaPlayerEvents';
import MetricsReportingEvents from '../metrics/MetricsReportingEvents';
import FactoryMaker from '../../core/FactoryMaker';
import Settings from '../../core/Settings';
import Constants from '../../streaming/constants/Constants';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import DashManifestModel from '../../dash/models/DashManifestModel';
import Utils from '../../core/Utils';

const CMCD_REQUEST_FIELD_NAME = 'CMCD';
const CMCD_VERSION = 1;
const OBJECT_TYPES = {
    MANIFEST: 'm',
    AUDIO: 'a',
    VIDEO: 'v',
    INIT: 'i',
    CAPTION: 'c',
    ISOBMFF_TEXT_TRACK: 'tt',
    ENCRYPTION_KEY: 'k',
    OTHER: 'o'
};
const STREAMING_FORMATS = {
    DASH: 'd',
    MSS: 's'
};
const STREAM_TYPES = {
    VOD: 'v',
    LIVE: 'l'
};
const RTP_SAFETY_FACTOR = 5;

function CmcdModel() {

    let dashManifestModel,
        instance,
        internalData,
        abrController,
        dashMetrics,
        playbackController,
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
                const finalPayloadString = _buildFinalString(cmcdData);

                eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, {
                    url: request.url,
                    mediaType: request.mediaType,
                    cmcdData,
                    cmcdString: finalPayloadString
                });
                return {
                    key: CMCD_REQUEST_FIELD_NAME,
                    value: finalPayloadString
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _copyParameters(data, parameterNames) {
        const copiedData = {};
        for (let name of parameterNames) {
            if (data[name]) {
                copiedData[name] = data[name];
            }
        }
        return copiedData;
    }

    function getHeaderParameters(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
                const cmcdData = _getCmcdData(request);
                const cmcdObjectHeader = _copyParameters(cmcdData, ['br', 'd', 'ot', 'tb']);
                const cmcdRequestHeader = _copyParameters(cmcdData, ['bl', 'dl', 'mtp', 'nor', 'nrr', 'su']);
                const cmcdStatusHeader = _copyParameters(cmcdData, ['bs', 'rtp']);
                const cmcdSessionHeader = _copyParameters(cmcdData, ['cid', 'pr', 'sf', 'sid', 'st', 'v']);
                const headers = {
                    'CMCD-Object': _buildFinalString(cmcdObjectHeader),
                    'CMCD-Request': _buildFinalString(cmcdRequestHeader),
                    'CMCD-Status': _buildFinalString(cmcdStatusHeader),
                    'CMCD-Session': _buildFinalString(cmcdSessionHeader)
                };

                eventBus.trigger(MetricsReportingEvents.CMCD_DATA_GENERATED, {
                    url: request.url,
                    mediaType: request.mediaType,
                    cmcdData
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

        data.ot = OBJECT_TYPES.ENCRYPTION_KEY;

        return data;
    }

    function _getCmcdDataForMpd() {
        const data = _getGenericCmcdData();

        data.ot = `${OBJECT_TYPES.MANIFEST}`;

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
        if (request.mediaType === Constants.VIDEO) ot = OBJECT_TYPES.VIDEO;
        if (request.mediaType === Constants.AUDIO) ot = OBJECT_TYPES.AUDIO;
        if (request.mediaType === Constants.TEXT) {
            if (request.mediaInfo.mimeType === 'application/mp4') {
                ot = OBJECT_TYPES.ISOBMFF_TEXT_TRACK;
            } else {
                ot = OBJECT_TYPES.CAPTION;
            }
        }

        let rtp = settings.get().streaming.cmcd.rtp;
        if (!rtp) {
            rtp = _calculateRtp(request);
        }
        data.rtp = rtp;

        if (nextRequest) {
            if (request.url !== nextRequest.url) {
                let url = new URL(nextRequest.url);
                data.nor = url.pathname;
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

        data.ot = `${OBJECT_TYPES.INIT}`;
        data.su = true;

        return data;
    }

    function _getCmcdDataForOther() {
        const data = _getGenericCmcdData();

        data.ot = `${OBJECT_TYPES.OTHER}`;

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
            return !isNaN(request.duration) ? Math.round(request.duration * 1000) : null;
        } catch (e) {
            return null;
        }
    }

    function _getMeasuredThroughputByType(mediaType) {
        try {
            return parseInt(abrController.getThroughputHistory().getSafeAverageThroughput(mediaType) / 100) * 100;
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
            const st = isDynamic ? `${STREAM_TYPES.LIVE}` : `${STREAM_TYPES.VOD}`;
            const sf = data.protocol && data.protocol === 'MSS' ? `${STREAMING_FORMATS.MSS}` : `${STREAMING_FORMATS.DASH}`;

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

    function _buildFinalString(cmcdData) {
        try {
            if (!cmcdData) {
                return null;
            }
            const keys = Object.keys(cmcdData).sort((a, b) => a.localeCompare(b));
            const length = keys.length;

            let cmcdString = keys.reduce((acc, key, index) => {
                if (key === 'v' && cmcdData[key] === 1) return acc; // Version key should only be reported if it is != 1
                if (typeof cmcdData[key] === 'string' && (key !== 'ot' || key !== 'sf' || key !== 'st')) {
                    let string = cmcdData[key].replace(/"/g, '\"');
                    acc += `${key}="${string}"`;
                } else {
                    acc += `${key}=${cmcdData[key]}`;
                }
                if (index < length - 1) {
                    acc += ',';
                }

                return acc;
            }, '');

            cmcdString = cmcdString.replace(/=true/g, '');

            return cmcdString;
        } catch (e) {
            return null;
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
        // Get the values we need
        let playbackRate = playbackController.getPlaybackRate();
        if (!playbackRate) playbackRate = 1;
        let { quality, mediaType, mediaInfo, duration } = request;
        let currentBufferLevel = _getBufferLevelByType(mediaType);
        if (currentBufferLevel === 0) currentBufferLevel = 500;
        let bitrate = mediaInfo.bitrateList[quality].bandwidth;

        // Calculate RTP
        let segmentSize = (bitrate * duration) / 1000; // Calculate file size in kilobits
        let timeToLoad = (currentBufferLevel / playbackRate) / 1000; // Calculate time available to load file in seconds
        let minBandwidth = segmentSize / timeToLoad; // Calculate the exact bandwidth required
        let rtpSafetyFactor = settings.get().streaming.cmcd.rtpSafetyFactor && !isNaN(settings.get().streaming.cmcd.rtpSafetyFactor) ? settings.get().streaming.cmcd.rtpSafetyFactor : RTP_SAFETY_FACTOR;
        let maxBandwidth = minBandwidth * rtpSafetyFactor; // Include a safety buffer

        let rtp = (parseInt(maxBandwidth / 100) + 1) * 100; // Round to the next multiple of 100

        return rtp;
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
