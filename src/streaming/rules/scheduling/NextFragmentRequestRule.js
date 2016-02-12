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
import Debug from '../../../core/Debug.js';
import FactoryMaker from '../../../core/FactoryMaker.js';

function NextFragmentRequestRule(config) {

    let instance;
    let context = this.context;
    let log = Debug(context).getInstance().log;
    let adapter = config.adapter;
    let sourceBufferController = config.sourceBufferController;
    let virtualBuffer = config.virtualBuffer;
    let textSourceBuffer = config.textSourceBuffer;

    function execute(rulesContext, callback) {

        let mediaType = rulesContext.getMediaInfo().type;
        let mediaInfo = rulesContext.getMediaInfo();
        let streamId = rulesContext.getStreamInfo().id;
        let streamProcessor = rulesContext.getStreamProcessor();
        let scheduleController = streamProcessor.getScheduleController();
        let representationInfo = streamProcessor.getCurrentRepresentationInfo();
        let seekTarget = scheduleController.getSeekTarget();
        let hasSeekTarget = !isNaN(seekTarget);
        let p = hasSeekTarget ? SwitchRequest.STRONG : SwitchRequest.DEFAULT;
        let keepIdx = !hasSeekTarget;
        let time = hasSeekTarget ? seekTarget : adapter.getIndexHandlerTime(streamProcessor);
        let buffer = streamProcessor.getBuffer();
        let appendedChunks;
        let range = null;
        let request;

        if (isNaN(time) || (mediaType === 'fragmentedText' && textSourceBuffer.getAllTracksAreDisabled())) {
            callback(SwitchRequest(context).create(null, p));
            return;
        }

        if (hasSeekTarget) {
            scheduleController.setSeekTarget(NaN);
        }

        if (buffer) {
            range = sourceBufferController.getBufferRange(streamProcessor.getBuffer(), time);
            if (range !== null) {
                appendedChunks = virtualBuffer.getChunks({streamId: streamId, mediaType: mediaType, appended: true, mediaInfo: mediaInfo, forRange: range});
                if (appendedChunks && appendedChunks.length > 0) {
                    let t = time;
                    time = appendedChunks[appendedChunks.length - 1].bufferedRange.end;
                    log('Prior to making a request for time, NextFragmentRequestRule is aligning index handler\'s currentTime with bufferedRange.end.',  t, ' was changed to ', time);
                }
            }
        }

        request = adapter.getFragmentRequestForTime(streamProcessor, representationInfo, time, {keepIdx: keepIdx});
        //log("getForTime", request, time);
        if (request && streamProcessor.getFragmentModel().isFragmentLoaded(request)) {
            request = adapter.getNextFragmentRequest(streamProcessor, representationInfo);
            //log("getForNext", request, streamProcessor.getIndexHandler().getCurrentIndex());
        }

        if (request) {
            adapter.setIndexHandlerTime(streamProcessor, request.startTime + request.duration);
            request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
        }

        callback(SwitchRequest(context).create(request, p));
    }

    instance = {
        execute: execute
    };

    return instance;
}

NextFragmentRequestRule.__dashjs_factory_name = 'NextFragmentRequestRule';
export default FactoryMaker.getClassFactory(NextFragmentRequestRule);