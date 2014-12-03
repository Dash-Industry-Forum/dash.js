/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2014, Akamai Technologies
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.BufferOccupancyRule = function () {
    "use strict";

    return {
        debug: undefined,
        metricsModel: undefined,

        execute: function (context, callback) {
            var self = this,
                //current = context.getCurrentValue(),
                //manifestInfo = context.getManifestInfo(),
                mediaInfo = context.getMediaInfo(),
                mediaType = mediaInfo.type,
                metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType),
                lastBufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
                isBufferRich = false,
                //lowBufferMark = 8,
                maxIndex = mediaInfo.trackCount - 1,
                switchRequest = new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT);

            if (lastBufferLevelVO !== null) {
                if (lastBufferLevelVO.level > lastBufferLevelVO.target)
                {
                    isBufferRich =  (lastBufferLevelVO.level - lastBufferLevelVO.target) > MediaPlayer.dependencies.BufferController.RICH_BUFFER_THRESHOLD;

                    if (isBufferRich) {
                        switchRequest = new MediaPlayer.rules.SwitchRequest(maxIndex, MediaPlayer.rules.SwitchRequest.prototype.STRONG);
                    }
                    //else {
                    //    // not buffer rich but not low either.
                    //}

                }
                //else {
                //    // getting low should we do something or let the insufficientBufferRule take over in this case?
                //}
            }

            if (switchRequest.value !== MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE) {
                self.debug.log("xxx BufferOccupancyRule requesting switch to index: ", switchRequest.value, " Priority: ",
                    switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.DEFAULT ? "Default" :
                        switchRequest.priority === MediaPlayer.rules.SwitchRequest.prototype.STRONG ? "Strong" : "Weak");
            }

            callback(switchRequest);
        }
    };
};

MediaPlayer.rules.BufferOccupancyRule.prototype = {
    constructor: MediaPlayer.rules.BufferOccupancyRule
};