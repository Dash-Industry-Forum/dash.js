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
import BufferController from './../controllers/BufferController';
import NotFragmentedTextBufferController from './NotFragmentedTextBufferController';

function TextBufferController(config) {

    let context = this.context;

    let _BufferControllerImpl;

    let instance;

    function setup(config) {

        // according to text type, we create corresponding buffer controller
        if (config.type === 'fragmentedText') {

            // in this case, internal buffer ocntroller is a classical BufferController object
            _BufferControllerImpl = BufferController(context).create({
                metricsModel: config.metricsModel,
                manifestModel: config.manifestModel,
                sourceBufferController: config.sourceBufferController,
                errHandler: config.errHandler,
                streamController: config.streamController,
                mediaController: config.mediaController,
                adapter: config.adapter,
                textController: config.textController
            });
        } else {

            // in this case, internal buffer controller is a not fragmented text controller  object
            _BufferControllerImpl = NotFragmentedTextBufferController(context).create({
                errHandler: config.errHandler,
                sourceBufferController: config.sourceBufferController
            });
        }
    }

    function initialize(Type, source, StreamProcessor) {
        return _BufferControllerImpl.initialize(Type, source, StreamProcessor);
    }

    /**
     * @param {MediaInfo }mediaInfo
     * @returns {Object} SourceBuffer object
     * @memberof BufferController#
     */
    function createBuffer(mediaInfo) {
        return _BufferControllerImpl.createBuffer(mediaInfo);
    }

    function getType() {
        return _BufferControllerImpl.getType();
    }

    function getBuffer() {
        return _BufferControllerImpl.getBuffer();
    }

    function setBuffer(value) {
        _BufferControllerImpl.setBuffer(value);
    }

    function getMediaSource() {
        return _BufferControllerImpl.getMediaSource();
    }

    function setMediaSource(value) {
        _BufferControllerImpl.setMediaSource(value);
    }

    function setStreamProcessor(streamProcessor) {
        _BufferControllerImpl.setStreamProcessor(streamProcessor);
    }

    function getStreamProcessor() {
        _BufferControllerImpl.getStreamProcessor();
    }

    function getBufferLevel() {
        return _BufferControllerImpl.getBufferLevel();
    }

    function getCriticalBufferLevel() {
        return _BufferControllerImpl.getCriticalBufferLevel();
    }

    function reset(errored) {
        _BufferControllerImpl.reset(errored);
    }

    function getIsBufferingCompleted() {
        return _BufferControllerImpl.getIsBufferingCompleted();
    }

    function switchInitData(streamId, quality) {
        _BufferControllerImpl.switchInitData(streamId, quality);
    }

    instance = {
        initialize: initialize,
        createBuffer: createBuffer,
        getType: getType,
        getStreamProcessor: getStreamProcessor,
        setStreamProcessor: setStreamProcessor,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        getBufferLevel: getBufferLevel,
        getCriticalBufferLevel: getCriticalBufferLevel,
        setMediaSource: setMediaSource,
        getMediaSource: getMediaSource,
        getIsBufferingCompleted: getIsBufferingCompleted,
        switchInitData: switchInitData,
        reset: reset
    };

    setup(config);

    return instance;
}

TextBufferController.__dashjs_factory_name = 'TextBufferController';
export default FactoryMaker.getClassFactory(TextBufferController);
export default FactoryMaker.getClassFactory(TextBufferController);
