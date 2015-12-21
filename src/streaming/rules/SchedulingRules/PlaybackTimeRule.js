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
import FactoryMaker from '../../../core/FactoryMaker.js';
import FragmentRequest from '../../vo/FragmentRequest.js';

function PlaybackTimeRule(config) {

    let context = this.context;

    let adapter = config.adapter;
    let sourceBufferExt = config.sourceBufferExt;
    let virtualBuffer = config.virtualBuffer;
    let textSourceBuffer = config.textSourceBuffer;

    function execute(rulesContext, callback) {
        var mediaType = rulesContext.getMediaInfo().type;
        var mediaInfo = rulesContext.getMediaInfo();
        var streamId = rulesContext.getStreamInfo().id;
        var streamProcessor = rulesContext.getStreamProcessor();
        var scheduleController = streamProcessor.getScheduleController();
        var representationInfo = streamProcessor.getCurrentRepresentationInfo();
        var seekTarget = scheduleController.getSeekTarget(); //seekTarget ? seekTarget[mediaType] : null,
        var hasSeekTarget = !isNaN(seekTarget);
        var p = hasSeekTarget ? SwitchRequest.STRONG : SwitchRequest.DEFAULT;
        var keepIdx = !hasSeekTarget;
        var time = hasSeekTarget ? seekTarget : adapter.getIndexHandlerTime(streamProcessor);
        var buffer = streamProcessor.getBuffer();

        var appendedChunks,
            range = null,
            request;

        if (isNaN(time) || (mediaType === "fragmentedText" && textSourceBuffer.getAllTracksAreDisabled())) {
            callback(SwitchRequest(context).create(null, p));
            return;
        }

        if (hasSeekTarget) {
            scheduleController.setSeekTarget(NaN);
        }

        if (buffer) {
            range = sourceBufferExt.getBufferRange(streamProcessor.getBuffer(), time);
            if (range !== null) {
                appendedChunks = virtualBuffer.getChunks({streamId: streamId, mediaType: mediaType, appended: true, mediaInfo: mediaInfo, forRange: range});
                if (appendedChunks && appendedChunks.length > 0) {
                    time = appendedChunks[appendedChunks.length-1].bufferedRange.end;
                }
            }
        }

        request = adapter.getFragmentRequestForTime(streamProcessor, representationInfo, time, {keepIdx: keepIdx});

        while (request && streamProcessor.getFragmentModel().isFragmentLoaded(request)) {
            if (request.action === FragmentRequest.ACTION_COMPLETE) {
                request = null;
                streamProcessor.setIndexHandlerTime(NaN);
                break;
            }

            request = adapter.getNextFragmentRequest(streamProcessor, representationInfo);
        }

        if (request ) {
            streamProcessor.setIndexHandlerTime(request.startTime + request.duration);
            request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
        }

        callback(SwitchRequest(context).create(request, p));
    }

    let instance = {
        execute: execute
    };

    return instance;
}

export default FactoryMaker.getClassFactory(PlaybackTimeRule);