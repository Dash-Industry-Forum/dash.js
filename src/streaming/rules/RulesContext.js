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

import FactoryMaker from '../../core/FactoryMaker';

function RulesContext(config) {

    config = config || {};
    let instance;
    const abrController = config.abrController;
    const switchHistory = config.switchHistory;
    const droppedFramesHistory = config.droppedFramesHistory;
    const currentRequest = config.currentRequest;
    const bufferOccupancyABR = config.useBufferOccupancyABR;
    const l2AABR = config.useL2AABR;
    const loLP = config.useLoLPABR;
    const scheduleController = config.streamProcessor ? config.streamProcessor.getScheduleController() : null;
    const representationInfo = config.streamProcessor ? config.streamProcessor.getRepresentationInfo() : null;
    const videoModel = config.videoModel ? config.videoModel : null;

    function getMediaType() {
        const mediaInfo = getMediaInfo();
        return mediaInfo ? mediaInfo.type : null;
    }

    function getStreamInfo() {
        const mediaInfo = getMediaInfo();
        return mediaInfo ? mediaInfo.streamInfo : null;
    }

    function getMediaInfo() {
        return representationInfo ? representationInfo.mediaInfo : null;
    }

    function getRepresentationInfo() {
        return representationInfo;
    }

    function getScheduleController() {
        return scheduleController;
    }

    function getAbrController() {
        return abrController;
    }

    function getSwitchHistory() {
        return switchHistory;
    }

    function getVideoModel() {
        return videoModel;
    }

    function getDroppedFramesHistory() {
        return droppedFramesHistory;
    }

    function getCurrentRequest() {
        return currentRequest;
    }

    function useBufferOccupancyABR() {
        return bufferOccupancyABR;
    }
    function useL2AABR() {
        return l2AABR;
    }

    function useLoLPABR() {
        return loLP;
    }

    instance = {
        getMediaType,
        getMediaInfo,
        getDroppedFramesHistory,
        getCurrentRequest,
        getSwitchHistory,
        getStreamInfo,
        getScheduleController,
        getAbrController,
        getRepresentationInfo,
        useBufferOccupancyABR,
        useL2AABR,
        useLoLPABR,
        getVideoModel
    };

    return instance;
}

RulesContext.__dashjs_factory_name = 'RulesContext';
export default FactoryMaker.getClassFactory(RulesContext);
