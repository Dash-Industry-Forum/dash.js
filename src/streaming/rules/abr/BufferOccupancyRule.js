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
import SwitchRequest from '../SwitchRequest';
import MediaPlayerModel from '../../models/MediaPlayerModel';
import AbrController from '../../controllers/AbrController';
import FactoryMaker from '../../../core/FactoryMaker';
import Debug from '../../../core/Debug';

function BufferOccupancyRule(config) {

    let instance;
    let context = this.context;
    let log = Debug(context).getInstance().log;

    let metricsModel = config.metricsModel;
    let dashMetrics = config.dashMetrics;

    let lastSwitchTime,
        mediaPlayerModel;

    function setup() {
        lastSwitchTime = 0;
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function execute (rulesContext, callback) {
        var now = new Date().getTime() / 1000;
        var mediaInfo = rulesContext.getMediaInfo();
        var representationInfo = rulesContext.getTrackInfo();
        var mediaType = mediaInfo.type;
        var waitToSwitchTime = !isNaN(representationInfo.fragmentDuration) ? representationInfo.fragmentDuration / 2 : 2;
        var current = rulesContext.getCurrentValue();
        var streamProcessor = rulesContext.getStreamProcessor();
        var abrController = streamProcessor.getABRController();
        var metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        var lastBufferLevel = dashMetrics.getCurrentBufferLevel(metrics);
        var lastBufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null;
        var isBufferRich = false;
        var maxIndex = mediaInfo.representationCount - 1;
        var switchRequest = SwitchRequest(context).create(SwitchRequest.NO_CHANGE, SwitchRequest.WEAK, {name: BufferOccupancyRule.__dashjs_factory_name});

        if (now - lastSwitchTime < waitToSwitchTime ||
            abrController.getAbandonmentStateFor(mediaType) === AbrController.ABANDON_LOAD) {
            callback(switchRequest);
            return;
        }

        if (lastBufferStateVO !== null) {
            // This will happen when another rule tries to switch from top to any other.
            // If there is enough buffer why not try to stay at high level.
            if (lastBufferLevel > lastBufferStateVO.target) {
                isBufferRich = (lastBufferLevel - lastBufferStateVO.target) > mediaPlayerModel.getRichBufferThreshold();

                if (isBufferRich && mediaInfo.representationCount > 1) {
                    switchRequest.value = maxIndex;
                    switchRequest.priority = SwitchRequest.STRONG;
                    switchRequest.reason.bufferLevel = lastBufferLevel;
                    switchRequest.reason.bufferTarget = lastBufferStateVO.target;
                }
            }
        }

        if (switchRequest.value !== SwitchRequest.NO_CHANGE && switchRequest.value !== current) {
            log('BufferOccupancyRule requesting switch to index: ', switchRequest.value, 'type: ',mediaType, ' Priority: ',
                switchRequest.priority === SwitchRequest.DEFAULT ? 'Default' :
                    switchRequest.priority === SwitchRequest.STRONG ? 'Strong' : 'Weak');
        }

        callback(switchRequest);
    }

    function reset() {
        lastSwitchTime = 0;
    }

    instance = {
        execute: execute,
        reset: reset
    };

    setup();

    return instance;
}

BufferOccupancyRule.__dashjs_factory_name = 'BufferOccupancyRule';
export default FactoryMaker.getClassFactory(BufferOccupancyRule);
