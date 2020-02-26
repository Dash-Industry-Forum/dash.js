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
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import Settings from '../../core/Settings';
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import DashManifestModel from '../../dash/models/DashManifestModel';

const CMCD_REQUEST_HEADER_FIELD_NAME = 'Common-Media-Client-Data';
const CMCD_VERSION = 1;

function CmcdModel() {

    let logger,
        dashManifestModel,
        instance,
        internalData,
        abrController,
        dashMetrics;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        dashManifestModel = DashManifestModel(context).getInstance();

        eventBus.on(Events.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(Events.MANIFEST_LOADED, _onManifestLoaded, instance);

        reset();
    }

    function setConfig(config) {
        if (!config) return;

        if (config.abrController) {
            abrController = config.abrController;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
    }

    function resetInitialSettings() {
        internalData = {
            pr: null,
            nor: null,
            st: null,
            sf: null
        };
    }

    function getRequestHeader(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.sendAsHeader && settings.get().streaming.cmcd.params.sid) {
                const cmcdData = _getCmcdData(request);
                const finalPayloadString = _buildFinalString(cmcdData);

                return {
                    key: CMCD_REQUEST_HEADER_FIELD_NAME,
                    value: finalPayloadString
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    function getQueryParameter(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.sendAsQueryParameter && !settings.get().streaming.cmcd.sendAsHeader && settings.get().streaming.cmcd.params.sid) {
                const cmcdData = _getCmcdData(request);
                const finalPayloadString = _buildFinalString(cmcdData);

                return {
                    key: CMCD_REQUEST_HEADER_FIELD_NAME,
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

    function _getCmcdDataForMpd() {
        const data = _getGenericCmcdData();

        data.ot = 'm';

        return data;
    }

    function _getCmcdDataForMediaSegment(request) {
        const data = _getGenericCmcdData();
        const encodedBitrate = _getBitrateByRequest(request);
        const d = _getObjectDurationByRequest(request);
        const ot = request.mediaType === 'video' ? 'v' : request.mediaType === 'audio' ? 'a' : null;
        const mtp = _getMeasuredThroughputByType(request.mediaType);
        const dl = _getDeadlineByType(request.mediaType);

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
            data.mpt = mtp;
        }

        if (!isNaN(dl)) {
            data.dl = dl;
        }

        return data;
    }

    function _getCmcdDataForInitSegment() {
        const data = _getGenericCmcdData();

        data.ot = 'i';

        return data;
    }

    function _getGenericCmcdData() {
        const data = {};

        data.v = CMCD_VERSION;

        if (settings.get().streaming.cmcd.params.sid) {
            data.sid = settings.get().streaming.cmcd.params.sid;
        }

        if (settings.get().streaming.cmcd.params.cid) {
            data.cid = settings.get().streaming.cmcd.params.cid;
        }

        if (settings.get().streaming.cmcd.params.did) {
            data.did = settings.get().streaming.cmcd.params.did;
        }

        if (!isNaN(internalData.pr) && internalData.pr !== 1 && internalData.pr !== null) {
            data.pr = internalData.pr;
        }

        if (internalData.st) {
            data.st = internalData.pr;
        }

        return data;
    }

    function _getBitrateByRequest(request) {
        try {
            const quality = request.quality;
            const bitrateList = request.mediaInfo.bitrateList;

            return bitrateList[quality].bandwidth / 1000;
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

    function _getMeasuredThroughputByType(type) {
        try {
            return Math.round(abrController.getThroughputHistory().getSafeAverageThroughput(type));
        } catch (e) {
            return null;
        }
    }

    function _getDeadlineByType(type) {
        try {
            const playbackRate = internalData.pr;
            const bufferLevel = dashMetrics.getCurrentBufferLevel(type, true);

            if (!isNaN(playbackRate) && !isNaN(bufferLevel)) {
                return (bufferLevel / playbackRate) * 1000;
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
            const st = isDynamic ? 'l' : 'v';
            const sf = data.protocol && data.protocol === 'MSS' ? 's' : 'd';

            internalData.st = st;
            internalData.sf = sf;
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
                acc += `${key}:${cmcdData[key]}`;
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
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(Events.MANIFEST_LOADED, _onManifestLoaded, this);

        resetInitialSettings();
    }

    instance = {
        getRequestHeader,
        getQueryParameter,
        setConfig
    };

    setup();

    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);
