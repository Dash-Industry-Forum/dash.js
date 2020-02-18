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
import Debug from "../../core/Debug";
import Utils from "../../core/Utils";
import Settings from "../../core/Settings";
import DashManifestModel from "../../dash/models/DashManifestModel";

const CMCD_REQUEST_HEADER_FIELD_NAME = 'Common-Media-Client-Data';

function CmcdModel() {

    let logger,
        dashManifestModel,
        instance,
        internalData;

    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    let settings = Settings(context).getInstance();

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        dashManifestModel = DashManifestModel(context).getInstance();

        eventBus.on(Events.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, instance);
        eventBus.on(Events.MANIFEST_LOADED, _onManifestLoaded, instance);

        resetInitialSettings();
    }

    function resetInitialSettings() {
        internalData = {
            pr: null,
            nor: null,
            st: null,
        };
    }

    function getRequestHeader(request) {
        try {
            if (settings.get().streaming.cmcd && settings.get().streaming.cmcd.sendAsHeader && settings.get().streaming.cmcd.params.sid) {
                if (request.type === 'MPD') {
                    return _getRequestHeaderForMpd(request);
                } else if (request.type === 'MediaSegment') {
                    return _getRequestHeaderForMediaSegment(request);
                } else if (request.type === 'InitSegment') {
                    return _getRequestHeaderForInitSegment(request);
                }
            }
        } catch (e) {
            return null;
        }
    }

    function _getRequestHeaderForMpd(request) {
        const data = _getGenericRequestData(request);

        return buildRequestHeader(data);
    }

    function _getRequestHeaderForMediaSegment(request) {
        const data = _getGenericRequestData(request);
        const encodedBitrate = _getBitrateFromRequest(request);

        if (encodedBitrate) {
            data.br = encodedBitrate;
        }

        return buildRequestHeader(data);
    }

    function _getRequestHeaderForInitSegment(request) {
        const data = _getGenericRequestData(request);

        return buildRequestHeader(data);
    }

    function _getGenericRequestData(request) {
        const data = {};

        if (settings.get().streaming.cmcd.params.sid) {
            data.sid = settings.get().streaming.cmcd.params.sid;
        }

        if (settings.get().streaming.cmcd.params.cid) {
            data.cid = settings.get().streaming.cmcd.params.cid;
        }

        if (settings.get().streaming.cmcd.params.did) {
            data.did = settings.get().streaming.cmcd.params.did;
        }

        if (!isNaN(internalData.pr) && internalData.pr !== 1) {
            data.pr = internalData.pr;
        }

        if (internalData.st) {
            data.st = internalData.pr;
        }

        const objectType = _getObjecTypeFromRequest(request);

        if (objectType) {
            data.ot = objectType;
        }

        return data;
    }

    function _getBitrateFromRequest(request) {
        try {
            const quality = request.quality;
            const bitrateList = request.mediaInfo.bitrateList;

            return bitrateList[quality].bandwidth / 1000;
        } catch (e) {
            return null;
        }
    }

    function _getObjecTypeFromRequest(request) {
        try {
            return;
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

            internalData.st = st;
        } catch (e) {
        }
    }

    function reset() {
        eventBus.off(Events.PLAYBACK_RATE_CHANGED, _onPlaybackRateChanged, this);
        eventBus.off(Events.MANIFEST_LOADED, _onManifestLoaded, this);

        resetInitialSettings();
    }

    function buildRequestHeader(requestData) {
        try {
            const keys = Object.keys(requestData);
            const length = keys.length;
            const finalPayloadString = keys.reduce((acc, key, index) => {
                acc += `${key}:${requestData[key]}`;
                if (index < length - 1) {
                    acc += ',';
                }

                return acc;
            }, '');

            return {
                key: CMCD_REQUEST_HEADER_FIELD_NAME,
                value: finalPayloadString
            };
        } catch (e) {
            logger.error(e);
        }
    }

    instance = {
        getRequestHeader
    };

    setup();
    return instance;
}

CmcdModel.__dashjs_factory_name = 'CmcdModel';
export default FactoryMaker.getSingletonFactory(CmcdModel);
