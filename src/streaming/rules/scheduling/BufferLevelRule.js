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
import MediaPlayerModel from '../../models/MediaPlayerModel';
import FactoryMaker from '../../../core/FactoryMaker';

function BufferLevelRule(config) {

    const context = this.context;
    const dashMetrics = config.dashMetrics;
    const metricsModel = config.metricsModel;
    const textController = config.textController;

    let mediaPlayerModel;

    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
    }

    function execute(streamProcessor, type, videoTrackPresent) {
        const bufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor(type));
        return bufferLevel < getBufferTarget(streamProcessor, type, videoTrackPresent);
    }

    function getBufferTarget(streamProcessor, type, videoTrackPresent) {
        let bufferTarget = NaN;
        const representationInfo = streamProcessor.getCurrentRepresentationInfo();
        if (type === 'fragmentedText') {
            bufferTarget = textController.getAllTracksAreDisabled() ? 0 : representationInfo.fragmentDuration;
        } else if (type === 'audio' && videoTrackPresent) {
            const videoBufferLevel = dashMetrics.getCurrentBufferLevel(metricsModel.getReadOnlyMetricsFor('video'));
            bufferTarget = Math.floor(Math.max(videoBufferLevel, representationInfo.fragmentDuration));
        } else {
            const streamInfo = representationInfo.mediaInfo.streamInfo;
            const abrController = streamProcessor.getABRController();
            if (abrController.isPlayingAtTopQuality(streamInfo)) {
                const isLongFormContent = streamInfo.manifestInfo.duration >= mediaPlayerModel.getLongFormContentDurationThreshold();
                bufferTarget = isLongFormContent ? mediaPlayerModel.getBufferTimeAtTopQualityLongForm() : mediaPlayerModel.getBufferTimeAtTopQuality();
            }else {
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
