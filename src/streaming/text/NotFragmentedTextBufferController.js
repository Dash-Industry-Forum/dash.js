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

const BUFFER_CONTROLLER_TYPE = 'NotFragmentedTextBufferController';
function NotFragmentedTextBufferController(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let sourceBufferController = config.sourceBufferController;
    let errHandler = config.errHandler;
    let type = config.type;
    let streamProcessor = config.streamProcessor;

    let instance,
        isBufferingCompleted,
        initialized,
        mediaSource,
        buffer,
        seekStartTime,
        representationController,
        initCache;

    function setup() {

        initialized = false;
        mediaSource = null;
        buffer = null;
        representationController = null;
        isBufferingCompleted = false;

        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(source) {
        setMediaSource(source);
        representationController = streamProcessor.getRepresentationController();
        initCache = InitCache(context).getInstance();
    }

    /**
     * @param {MediaInfo }mediaInfo
     * @returns {Object} SourceBuffer object
     * @memberof BufferController#
     */
    function createBuffer(mediaInfo) {
        try {
            buffer = sourceBufferController.createSourceBuffer(mediaSource, mediaInfo);

            if (!initialized) {
                if (buffer.hasOwnProperty(Constants.INITIALIZE)) {
                    buffer.initialize(type, streamProcessor);
                }
                initialized = true;
            }
        } catch (e) {
            errHandler.mediaSourceError('Error creating ' + type + ' source buffer.');
        }

        return buffer;
    }

    function getType() {
        return type;
    }

    function getBuffer() {
        return buffer;
    }

    function setBuffer(value) {
        buffer = value;
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

    function setSeekStartTime(value) {
        seekStartTime = value;
    }

    function getSeekStartTime() {
        return seekStartTime;
    }

    function getBufferLevel() {
        return 0;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function reset(errored) {

        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, onInitFragmentLoaded, this);

        if (!errored) {
            sourceBufferController.abort(mediaSource, buffer);
            sourceBufferController.removeSourceBuffer(mediaSource, buffer);
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getStreamProcessor() !== streamProcessor) {
            return;
        }

        eventBus.trigger(Events.TIMED_TEXT_REQUESTED, {
            index: 0,
            sender: e.sender
        }); //TODO make index dynamic if referring to MP?
    }

    function onInitFragmentLoaded(e) {
        if (e.fragmentModel !== streamProcessor.getFragmentModel() || (!e.chunk.bytes)) {
            return;
        }
        initCache.save(e.chunk);
        sourceBufferController.append(buffer, e.chunk);
    }

    function switchInitData(streamId, representationId) {
        const chunk = initCache.extract(streamId, representationId);
        if (chunk) {
            sourceBufferController.append(buffer, chunk);
        } else {
            eventBus.trigger(Events.INIT_REQUESTED, {
                sender: instance
            });
        }
    }

    instance = {
        getBufferControllerType: getBufferControllerType,
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setSeekStartTime: setSeekStartTime,
        getSeekStartTime: getSeekStartTime,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        switchInitData: switchInitData,
        reset: reset
    };

    setup();

    return instance;
}

NotFragmentedTextBufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(NotFragmentedTextBufferController);
