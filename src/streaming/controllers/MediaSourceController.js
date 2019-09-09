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
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';

function MediaSourceController() {

    let instance,
        logger;

    const context = this.context;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function createMediaSource() {

        let hasWebKit = ('WebKitMediaSource' in window);
        let hasMediaSource = ('MediaSource' in window);

        if (hasMediaSource) {
            return new MediaSource();
        } else if (hasWebKit) {
            return new WebKitMediaSource();
        }

        return null;
    }

    function attachMediaSource(source, videoModel) {

        let objectURL = window.URL.createObjectURL(source);

        videoModel.setSource(objectURL);

        return objectURL;
    }

    function detachMediaSource(videoModel) {
        videoModel.setSource(null);
    }

    function setDuration(source, value) {

        if (source.duration != value)
            source.duration = value;

        return source.duration;
    }

    function setSeekable(source, start, end) {
        if (source && typeof source.setLiveSeekableRange === 'function' && typeof source.clearLiveSeekableRange === 'function' &&
                source.readyState === 'open' && start >= 0 && start < end) {
            source.clearLiveSeekableRange();
            source.setLiveSeekableRange(start, end);
        }
    }

    function signalEndOfStream(source) {
        if (!source || source.readyState !== 'open') {
            return;
        }

        let buffers = source.sourceBuffers;

        for (let i = 0; i < buffers.length; i++) {
            if (buffers[i].updating) {
                return;
            }
            if (buffers[i].buffered.length === 0) {
                return;
            }
        }
        logger.info('call to mediaSource endOfStream');
        source.endOfStream();
    }

    instance = {
        createMediaSource: createMediaSource,
        attachMediaSource: attachMediaSource,
        detachMediaSource: detachMediaSource,
        setDuration: setDuration,
        setSeekable: setSeekable,
        signalEndOfStream: signalEndOfStream
    };

    setup();

    return instance;
}

MediaSourceController.__dashjs_factory_name = 'MediaSourceController';
export default FactoryMaker.getSingletonFactory(MediaSourceController);
