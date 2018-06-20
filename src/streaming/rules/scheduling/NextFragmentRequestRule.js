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
import Debug from '../../../core/Debug';
import FactoryMaker from '../../../core/FactoryMaker';
import FragmentRequest from '../../../streaming/vo/FragmentRequest';

function NextFragmentRequestRule(config) {

    config = config || {};
    const context = this.context;
    const adapter = config.adapter;
    const textController = config.textController;

    let instance,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function execute(streamProcessor, requestToReplace) {
        const representationInfo = streamProcessor.getCurrentRepresentationInfo();
        const mediaInfo = representationInfo.mediaInfo;
        const mediaType = mediaInfo.type;
        const scheduleController = streamProcessor.getScheduleController();
        const seekTarget = scheduleController.getSeekTarget();
        const hasSeekTarget = !isNaN(seekTarget);
        const bufferController = streamProcessor.getBufferController();
        const currentTime = streamProcessor.getPlaybackController().getTime();
        let time = hasSeekTarget ? seekTarget : adapter.getIndexHandlerTime(streamProcessor);
        let bufferIsDivided = false;

        if (isNaN(time) || (mediaType === Constants.FRAGMENTED_TEXT && !textController.isTextEnabled())) {
            return null;
        }

        if (hasSeekTarget) {
            scheduleController.setSeekTarget(NaN);
        }

        /**
         * This is critical for IE/Safari/EDGE
         * */
        if (bufferController) {
            let range = bufferController.getRangeAt(time);
            const playingRange = bufferController.getRangeAt(currentTime);
            const bufferRanges = bufferController.getBuffer().getAllBufferRanges();
            const numberOfBuffers = bufferRanges ? bufferRanges.length : 0;
            if ((range !== null || playingRange !== null) && !hasSeekTarget) {
                if ( !range || (playingRange && playingRange.start != range.start && playingRange.end != range.end) ) {
                    if (numberOfBuffers > 1 ) {
                        streamProcessor.getFragmentModel().removeExecutedRequestsAfterTime(playingRange.end);
                        bufferIsDivided = true;
                    }
                    range = playingRange;
                }
                logger.debug('Prior to making a request for time, NextFragmentRequestRule is aligning index handler\'s currentTime with bufferedRange.end for', mediaType, '.', time, 'was changed to', range.end);
                time = range.end;
            }
        }

        let request;
        if (requestToReplace) {
            time = requestToReplace.startTime + (requestToReplace.duration / 2);
            request = adapter.getFragmentRequestForTime(streamProcessor, representationInfo, time, {
                timeThreshold: 0,
                ignoreIsFinished: true
            });
        } else {
            request = adapter.getFragmentRequestForTime(streamProcessor, representationInfo, time, {
                keepIdx: !hasSeekTarget && !bufferIsDivided
            });

            // Then, check if this request was downloaded or not
            while (request && request.action !== FragmentRequest.ACTION_COMPLETE && streamProcessor.getFragmentModel().isFragmentLoaded(request)) {
                // loop until we found not loaded fragment, or no fragment
                request = adapter.getNextFragmentRequest(streamProcessor, representationInfo);
            }
            if (request) {
                if (!isNaN(request.startTime + request.duration)) {
                    adapter.setIndexHandlerTime(streamProcessor, request.startTime + request.duration);
                }
                request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
                scheduleController.setTimeToLoadDelay(0);
            }
        }

        return request;
    }

    instance = {
        execute: execute
    };

    setup();

    return instance;
}

NextFragmentRequestRule.__dashjs_factory_name = 'NextFragmentRequestRule';
export default FactoryMaker.getClassFactory(NextFragmentRequestRule);
