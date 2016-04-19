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
import PlaybackController from '../../controllers/PlaybackController';
import FactoryMaker from '../../../core/FactoryMaker';

function BufferLevelRule(config) {

    let instance;
    let context = this.context;

    let dashMetrics = config.dashMetrics;
    let metricsModel = config.metricsModel;
    let textSourceBuffer = config.textSourceBuffer;

    let mediaPlayerModel,
        playbackController;

    function setup() {
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
    }

    function execute(streamProcessor) {

        let representationInfo = streamProcessor.getCurrentRepresentationInfo();
        let mediaInfo = representationInfo.mediaInfo;
        let mediaType = mediaInfo.type;
        let metrics = metricsModel.getReadOnlyMetricsFor(mediaType);
        let bufferLevel = dashMetrics.getCurrentBufferLevel(metrics);

        return bufferLevel < getBufferTarget(streamProcessor, mediaType);
    }

    function reset() {}

    function getBufferTarget(streamProcessor, type) {

        let representationInfo = streamProcessor.getCurrentRepresentationInfo();
        let mediaInfo = representationInfo.mediaInfo;
        let streamInfo = mediaInfo.streamInfo;
        let abrController = streamProcessor.getABRController();
        let duration = streamInfo.manifestInfo.duration;
        let isLongFormContent = (duration >= mediaPlayerModel.getLongFormContentDurationThreshold());
        let bufferTarget = NaN;

        if (type === 'fragmentedText') {
            bufferTarget = textSourceBuffer.getAllTracksAreDisabled() ? 0 : representationInfo.fragmentDuration;
        } else {
            if (abrController.isPlayingAtTopQuality(streamInfo)) {
                bufferTarget = isLongFormContent ? mediaPlayerModel.getBufferTimeAtTopQualityLongForm() : mediaPlayerModel.getBufferTimeAtTopQuality();
            }else {
                bufferTarget = mediaPlayerModel.getStableBufferTime();
            }
        }
        return bufferTarget;
    }

    instance = {
        execute: execute,
        reset: reset
    };
    setup();
    return instance;
}

BufferLevelRule.__dashjs_factory_name = 'BufferLevelRule';
export default FactoryMaker.getClassFactory(BufferLevelRule);
