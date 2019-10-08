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
import Constants from '../constants/Constants';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import InitCache from '../utils/InitCache';
import SourceBufferSink from '../SourceBufferSink';
import TextController from '../../streaming/text/TextController';
import DashJSError from '../../streaming/vo/DashJSError';
import Errors from '../../core/errors/Errors';

const BUFFER_CONTROLLER_TYPE = 'NotFragmentedTextBufferController';
function NotFragmentedTextBufferController(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();
    const textController = TextController(context).getInstance();

    let errHandler = config.errHandler;
    let type = config.type;
    let mimeType = config.mimeType;
    let streamProcessor = config.streamProcessor;

    let instance,
        isBufferingCompleted,
        initialized,
        mediaSource,
        buffer,
        initCache;

    function setup() {
        initialized = false;
        mediaSource = null;
        isBufferingCompleted = false;

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, instance);
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(source) {
        setMediaSource(source);
        initCache = InitCache(context).getInstance();
    }

    /**
     * @param {MediaInfo }mediaInfo
     * @memberof BufferController#
     */
    function createBuffer(mediaInfo) {
        try {
            buffer = SourceBufferSink(context).create(mediaSource, mediaInfo);
            if (!initialized) {
                const textBuffer = buffer.getBuffer();
                if (textBuffer.hasOwnProperty(Constants.INITIALIZE)) {
                    textBuffer.initialize(mimeType, streamProcessor);
                }
                initialized = true;
            }
            return buffer;
        } catch (e) {
            if (mediaInfo && ((mediaInfo.isText) || (mediaInfo.codec.indexOf('codecs="stpp') !== -1) || (mediaInfo.codec.indexOf('codecs="wvtt') !== -1))) {
                try {
                    buffer = textController.getTextSourceBuffer();
                } catch (e) {
                    errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type + ' : ' + e.message));
                }
            } else {
                errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type));
            }
        }
    }

    function getType() {
        return type;
    }

    function getBuffer() {
        return buffer;
    }

    function setMediaSource(value) {
        mediaSource = value;
    }

    function getMediaSource() {
        return mediaSource;
    }

    function getStreamProcessor() {
        return streamProcessor;
    }

    function getIsPruningInProgress() {
        return false;
    }

    function dischargePreBuffer() {
    }

    function setSeekStartTime() { //Unused - TODO Remove need for stub function
    }

    function getBufferLevel() {
        return 0;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function reset(errored) {
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, instance);

        if (!errored && buffer) {
            buffer.abort();
            buffer.reset();
            buffer = null;
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getType() !== streamProcessor.getType() || e.error) return;

        const streamId = e.sender.getStreamId();
        const currentRepresentation = e.sender.getCurrentRepresentation();

        const chunk = initCache.extract(streamId, currentRepresentation ? currentRepresentation.id : null);

        if (!chunk) {
            eventBus.trigger(Events.TIMED_TEXT_REQUESTED, {
                index: 0,
                sender: e.sender
            }); //TODO make index dynamic if referring to MP?
        }
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel() || (!e.chunk.bytes)) {
            return;
        }

        initCache.save(e.chunk);
        buffer.append(e.chunk);

        eventBus.trigger(Events.STREAM_COMPLETED, {
            request: e.request,
            fragmentModel: e.fragmentModel
        });
    }

    function switchInitData(streamId, representationId) {
        const chunk = initCache.extract(streamId, representationId);

        if (!chunk) {
            eventBus.trigger(Events.TIMED_TEXT_REQUESTED, {
                index: 0,
                sender: instance
            });
        }
    }

    function getRangeAt() {
        return null;
    }

    function updateTimestampOffset(MSETimeOffset) {
        if (buffer.timestampOffset !== MSETimeOffset && !isNaN(MSETimeOffset)) {
            buffer.timestampOffset = MSETimeOffset;
        }
    }

    instance = {
        getBufferControllerType: getBufferControllerType,
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setSeekStartTime: setSeekStartTime,
        getBuffer: getBuffer,
        getBufferLevel: getBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        getIsPruningInProgress: getIsPruningInProgress,
        dischargePreBuffer: dischargePreBuffer,
        switchInitData: switchInitData,
        getRangeAt: getRangeAt,
        reset: reset,
        updateTimestampOffset: updateTimestampOffset
    };

    setup();

    return instance;
}

NotFragmentedTextBufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(NotFragmentedTextBufferController);
