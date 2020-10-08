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
import Constants from '../../constants/Constants';
import FactoryMaker from '../../../core/FactoryMaker';
import MetricsConstants from '../../constants/MetricsConstants';

function BufferLevelRule(config) {

    config = config || {};
    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const textController = config.textController;
    const abrController = config.abrController;
    const settings = config.settings;

    function setup() {
    }

    function execute(type, representationInfo) {
        if (!type || !representationInfo) {
            return true;
        }
        const bufferLevel = dashMetrics.getCurrentBufferLevel(type);
        return bufferLevel < getBufferTarget(type, representationInfo);
    }

    function getBufferTarget(type, representationInfo) {
        let bufferTarget = NaN;

        if (!type || !representationInfo) {
            return bufferTarget;
        }

        if (type === Constants.FRAGMENTED_TEXT) {
            if (textController.isTextEnabled()) {
                if (isNaN(representationInfo.fragmentDuration)) { //fragmentDuration of representationInfo is not defined,
                    // call metrics function to have data in the latest scheduling info...
                    // if no metric, returns 0. In this case, rule will return false.
                    const schedulingInfo = dashMetrics.getCurrentSchedulingInfo(MetricsConstants.SCHEDULING_INFO);
                    bufferTarget = schedulingInfo ? schedulingInfo.duration : 0;
                } else {
                    bufferTarget = representationInfo.fragmentDuration;
                }
            } else { // text is disabled, rule will return false
                bufferTarget = 0;
            }
        }  else {
            const streamInfo = representationInfo.mediaInfo.streamInfo;
            if (abrController.isPlayingAtTopQuality(streamInfo)) {
                const isLongFormContent = streamInfo.manifestInfo.duration >= settings.get().streaming.longFormContentDurationThreshold;
                bufferTarget = isLongFormContent ? settings.get().streaming.bufferTimeAtTopQualityLongForm : settings.get().streaming.bufferTimeAtTopQuality;
            } else {
                bufferTarget = mediaPlayerModel.getStableBufferTime();
            }
        }
        return bufferTarget;
    }

    const instance = {
        execute: execute,
        getBufferTarget: getBufferTarget
    };

    setup();
    return instance;
}

BufferLevelRule.__dashjs_factory_name = 'BufferLevelRule';
export default FactoryMaker.getClassFactory(BufferLevelRule);
