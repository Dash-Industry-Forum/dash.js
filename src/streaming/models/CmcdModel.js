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
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Settings from '../../core/Settings';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import DashManifestModel from '../../dash/models/DashManifestModel';
import Utils from '../../core/Utils';
import {getVersionString} from '../../core/Version';

const CMCD_REQUEST_FIELD_NAME = 'Common-Media-Client-Data';
const CMCD_VERSION = 1;
const DEFAULT_DEVICE_ID = `dash.js-v${getVersionString()}`;
const BUFFER_STATES = {
    DEFAULT: null,
    INITIALIZING: 1,
    SEEKING: 2,
    RISK: 3,
    EMPTY: 4
};
const OBJECT_TYPES = {
    MANIFEST: 'm',
    AUDIO: 'a',
    VIDEO: 'v',
    INIT: 'i',
    CAPTION: 'c'
};
const STREAMING_FORMATS = {
    DASH: 'd',
    MSS: 's'
};
const STREAM_TYPES = {
    VOD: 'v',
    LIVE: 'l'
};

function CmcdModel() {

    let logger,
        dashManifestModel,
        instance,
        internalData,
        abrController,
        dashMetrics,
        playbackController;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        dashManifestModel = DashManifestModel(context).getInstance();

        _resetInitialSettings();
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
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
            bs: {
                audio: BUFFER_STATES.INITIALIZING,
                video: BUFFER_STATES.INITIALIZING
            },
            cid: null,
            did: `${DEFAULT_DEVICE_ID}`

        };
    }

    function getQueryParameter(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.enabled) {
                const cmcdData = _getCmcdData(request);
                const finalPayloadString = _buildFinalString(cmcdData);

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

    function _getCmcdData(request) {
        try {
            let cmcdData = null;

            if (request.type === HTTPRequest.MPD_TYPE) {
                _setDefaultContentId(request);
                return _getCmcdDataForMpd(request);
            } else if (request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                return _getCmcdDataForMediaSegment(request);
            } else if (request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
                return _getCmcdDataForInitSegment(request);
            }

            return cmcdData;
        } catch (e) {
            return null;
        }
    }

    function _setDefaultContentId(request) {
        try {
            internalData.cid = `${Utils.generateHashCode(request.url)}`;
        } catch (e) {

        }
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
        const ot = request.mediaType === 'video' ? `${OBJECT_TYPES.VIDEO}` : request.mediaType === 'audio' ? `${OBJECT_TYPES.AUDIO}` : request.mediaType === 'fragmentedText' ? `${OBJECT_TYPES.CAPTION}` : null;
        const mtp = _getMeasuredThroughputByType(request.mediaType);
        const dl = _getDeadlineByType(request.mediaType);
        const bs = _getBufferStateByRequest(request);

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

        if (!isNaN(bs) && bs !== null) {
            data.bs = bs;
        }

        return data;
    }

    function _getCmcdDataForInitSegment() {
        const data = _getGenericCmcdData();

        data.ot = `${OBJECT_TYPES.INIT}`;

        return data;
    }

    function _getGenericCmcdData() {
        const data = {};

        data.v = CMCD_VERSION;
        data.sid = settings.get().streaming.cmcd.sid ? settings.get().streaming.cmcd.sid : internalData.sid;
        data.cid = settings.get().streaming.cmcd.cid ? settings.get().streaming.cmcd.cid : internalData.cid;
        data.did = settings.get().streaming.cmcd.did ? settings.get().streaming.cmcd.did : internalData.did;

        data.sid = `"${data.sid}"`;
        data.cid = `"${data.cid}"`;
        data.did = `"${data.did}"`;

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

    function _getObjectDurationByRequest(request) {
        try {
            return !isNaN(request.duration) ? Math.round(request.duration * 1000) : null;
        } catch (e) {
            return null;
        }
    }

    function _getMeasuredThroughputByType(mediaType) {
        try {
            return Math.round(abrController.getThroughputHistory().getSafeAverageThroughput(mediaType));
        } catch (e) {
            return null;
        }
    }

    function _getDeadlineByType(mediaType) {
        try {
            const playbackRate = internalData.pr;
            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);

            if (!isNaN(playbackRate) && !isNaN(bufferLevel)) {
                return parseInt((bufferLevel / playbackRate) * 1000);
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function _getBufferStateByRequest(request) {
        try {
            const mediaType = request.mediaType;
            if (internalData.bs[mediaType] !== null) {
                return internalData.bs[mediaType];
            }

            const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType);
            const duration = request.duration;
            if (bufferLevel < duration) {
                return BUFFER_STATES.RISK;
            }

            return BUFFER_STATES.DEFAULT;
        } catch (e) {

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
                let state = null;
                switch (data.state) {
                    case MediaPlayerEvents.BUFFER_LOADED:
                        state = BUFFER_STATES.DEFAULT;
                        break;
                    case MediaPlayerEvents.BUFFER_EMPTY:
                        if (playbackController.isSeeking()) {
                            state = BUFFER_STATES.SEEKING;
                        }
                        state = BUFFER_STATES.EMPTY;
                        break;
                    default:
                }
                internalData.bs[data.mediaType] = state;

            }
        } catch (e) {

        }
    }

    function _buildFinalString(cmcdData) {
        try {
            if (!cmcdData) {
                return null;
            }
            const keys = Object.keys(cmcdData);
            const length = keys.length;

            return keys.reduce((acc, key, index) => {
                acc += `${key}=${cmcdData[key]}`;
                if (index < length - 1) {
                    acc += ',';
                }

                return acc;
            }, '');

        } catch (e) {
            return null;
        }
    }

    function reset() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);

        _resetInitialSettings();
    }

    instance = {
        getQueryParameter,
        setConfig,
        reset,
        initialize
    };

    setup();

    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);
