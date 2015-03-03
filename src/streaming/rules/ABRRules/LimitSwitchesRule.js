/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 * 
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.rules.LimitSwitchesRule = function () {
    "use strict";

    /*
     * This rule is intended to limit the number of switches that can happen.
     * We might get into a situation where there quality is bouncing around a ton.
     * This can create an unpleasant experience, so let the stream settle down.
     */
    var lastCheckTime = 0,
        qualitySwitchThreshold = 2000;

    return {
        log: undefined,
        metricsModel: undefined,

        execute: function (context, callback) {
            var //self = this,
                //mediaType = context.getMediaInfo().type,
                current = context.getCurrentValue(),
                ///metrics = this.metricsModel.getReadOnlyMetricsFor(mediaType),
                //manifestInfo = context.getManifestInfo(),
                //lastIdx = metrics.RepSwitchList.length - 1,
                //rs = metrics.RepSwitchList[lastIdx],
                now = new Date().getTime(),
                delay;

            //self.log("Checking limit switches rule...");
            delay = now - lastCheckTime;

            if (delay < qualitySwitchThreshold /*&& rs !== undefined && (now - rs.t.getTime()) < qualitySwitchThreshold*/) {
                //self.log("Wait some time before allowing another switch unless with default priority");
                callback(new MediaPlayer.rules.SwitchRequest(current, MediaPlayer.rules.SwitchRequest.prototype.DEFAULT));
                return;
            }

            lastCheckTime = now;
            callback(new MediaPlayer.rules.SwitchRequest(MediaPlayer.rules.SwitchRequest.prototype.NO_CHANGE, MediaPlayer.rules.SwitchRequest.prototype.WEAK));
        }
    };
};

MediaPlayer.rules.LimitSwitchesRule.prototype = {
    constructor: MediaPlayer.rules.LimitSwitchesRule
};