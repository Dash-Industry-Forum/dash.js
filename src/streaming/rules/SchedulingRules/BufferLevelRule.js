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
import SwitchRequest from '../SwitchRequest.js';
import BufferController from '../../controllers/BufferController.js';
import FragmentController from '../../controllers/FragmentController.js';
import AbrController from '../../controllers/AbrController.js';

let BufferLevelRule = function () {
    "use strict";

    var getBufferTarget = function (context, type) {
            var streamProcessor = context.getStreamProcessor(),
                streamInfo = context.getStreamInfo(),
                abrController = streamProcessor.getABRController(),
                duration = streamInfo.manifestInfo.duration,
                trackInfo = context.getTrackInfo(),
                isDynamic = streamProcessor.isDynamic(), //TODO make is dynamic false if live stream is playing more than X seconds from live edge in DVR window. So it will act like VOD.
                isLongFormContent = (duration >= BufferController.LONG_FORM_CONTENT_DURATION_THRESHOLD),
                bufferTarget = NaN;

            if (!isDynamic && abrController.isPlayingAtTopQuality(streamInfo)) {//TODO || allow larger buffer targets if we stabilize on a non top quality for more than 30 seconds.
                bufferTarget = isLongFormContent ? BufferController.BUFFER_TIME_AT_TOP_QUALITY_LONG_FORM : BufferController.BUFFER_TIME_AT_TOP_QUALITY;
            }else if (!isDynamic) {
                //General VOD target non top quality and not stabilized on a given quality.
                bufferTarget = BufferController.DEFAULT_MIN_BUFFER_TIME;
            } else {
                bufferTarget = this.playbackController.getLiveDelay();
            }

            if (type === "fragmentedText"){
                bufferTarget = this.textSourceBuffer.getAllTracksAreDisabled() ? 0 : trackInfo.fragmentDuration;
            }

            return bufferTarget;
        };

    return {
        system:undefined,
        metricsExt: undefined,
        metricsModel: undefined,
        playbackController: undefined,
        textSourceBuffer:undefined,
        log:undefined,

        setup: function(){
            this.abrController = AbrController.getInstance();
        },

        execute: function(context, callback) {
            var mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType),
                bufferLevel = this.metricsExt.getCurrentBufferLevel(metrics) ? this.metricsExt.getCurrentBufferLevel(metrics).level : 0,
                fragmentCount;

            fragmentCount = bufferLevel < getBufferTarget.call(this, context, mediaType) ? 1 : 0;

            callback(new SwitchRequest(fragmentCount, SwitchRequest.prototype.DEFAULT));
        },

        reset: function() {}
    };
};

BufferLevelRule.prototype = {
    constructor: BufferLevelRule
};

export default BufferLevelRule;