﻿/**
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
import PlaybackController from '../../controllers/PlaybackController.js';

let InsufficientBufferRule = function () {
    "use strict";
    /*
     * This rule is intended to be sure that our buffer doesn't run dry.
     * If the buffer runs dry playback halts until more data is downloaded.
     * The buffer will run dry when the fragments are taking too long to download.
     * The player may have sufficient bandwidth to download a fragment is a reasonable time,
     * but the play may not leave enough time in the buffer to allow for longer fragments.
     * A dry buffer is a good indication of this use case, so we want to switch down to
     * smaller fragments to decrease download time.
     */
    var bufferStateDict = {},
        lastSwitchTime = 0,
        waitToSwitchTime = 1000,

        setBufferInfo = function (type, state) {
            bufferStateDict[type] = bufferStateDict[type] || {};
            bufferStateDict[type].state = state;
            if (state === BufferController.BUFFER_LOADED && !bufferStateDict[type].firstBufferLoadedEvent) {
                bufferStateDict[type].firstBufferLoadedEvent = true;
            }
        },

        onPlaybackSeeking = function () {
            bufferStateDict = {};
        };

    return {
        log: undefined,
        metricsModel: undefined,
        playbackController: undefined,

        setup: function() {
            this[PlaybackController.eventList.ENAME_PLAYBACK_SEEKING] = onPlaybackSeeking;
        },

        execute: function (context, callback) {
            var self = this,
                now = new Date().getTime(),
                mediaType = context.getMediaInfo().type,
                current = context.getCurrentValue(),
                metrics = self.metricsModel.getReadOnlyMetricsFor(mediaType),
                streamInfo = context.getStreamInfo(),
                trackInfo = context.getTrackInfo(),
                duration = streamInfo.duration,
                currentTime = self.playbackController.getTime(),
                sp = context.getStreamProcessor(),
                isDynamic = sp.isDynamic(),
                lastBufferLevelVO = (metrics.BufferLevel.length > 0) ? metrics.BufferLevel[metrics.BufferLevel.length - 1] : null,
                lastBufferStateVO = (metrics.BufferState.length > 0) ? metrics.BufferState[metrics.BufferState.length - 1] : null,
                lowBufferMark = Math.min(trackInfo.fragmentDuration, BufferController.LOW_BUFFER_THRESHOLD),
                switchRequest = new SwitchRequest(SwitchRequest.prototype.NO_CHANGE, SwitchRequest.prototype.WEAK);

            if (now - lastSwitchTime < waitToSwitchTime ||
                lastBufferStateVO === null) {
                callback(switchRequest);
                return;
            }

            setBufferInfo(mediaType, lastBufferStateVO.state);
            // After the sessions first buffer loaded event , if we ever have a buffer empty event we want to switch all the way down.
            if (lastBufferStateVO.state === BufferController.BUFFER_EMPTY && bufferStateDict[mediaType].firstBufferLoadedEvent !== undefined) {
                switchRequest = new SwitchRequest(0, SwitchRequest.prototype.STRONG);

            } else if ( !isDynamic &&
                        bufferStateDict[mediaType].state === BufferController.BUFFER_LOADED &&
                        lastBufferLevelVO.level < (lowBufferMark * 2) &&
                        currentTime < (duration - lowBufferMark * 2)) {

                var p = lastBufferLevelVO.level > lowBufferMark ?
                    SwitchRequest.prototype.DEFAULT : SwitchRequest.prototype.STRONG;

                switchRequest = new SwitchRequest(Math.max(current - 1, 0), p);
            }

            if (switchRequest.value !== SwitchRequest.prototype.NO_CHANGE && switchRequest.value !== current) {
                self.log("InsufficientBufferRule requesting switch to index: ", switchRequest.value, "type: ",mediaType, " Priority: ",
                    switchRequest.priority === SwitchRequest.prototype.DEFAULT ? "Default" :
                        switchRequest.priority === SwitchRequest.prototype.STRONG ? "Strong" : "Weak");
            }
            lastSwitchTime = now;
            callback(switchRequest);
        },

        reset: function() {
            bufferStateDict = {};
            lastSwitchTime = 0;
        }
    };
};

InsufficientBufferRule.prototype = {
    constructor: InsufficientBufferRule
};

export default InsufficientBufferRule;
