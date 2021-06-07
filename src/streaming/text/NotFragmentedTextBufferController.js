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
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import InitCache from '../utils/InitCache';
import SourceBufferSink from '../SourceBufferSink';
import DashJSError from '../../streaming/vo/DashJSError';
import Errors from '../../core/errors/Errors';

const BUFFER_CONTROLLER_TYPE = 'NotFragmentedTextBufferController';

function NotFragmentedTextBufferController(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    const textController = config.textController;
    const errHandler = config.errHandler;
    const streamInfo = config.streamInfo;
    const type = config.type;

    let instance,
        isBufferingCompleted,
        initialized,
        mediaSource,
        sourceBufferSink,
        initCache;

    function setup() {
        initialized = false;
        mediaSource = null;
        isBufferingCompleted = false;

        initCache = InitCache(context).getInstance();

        eventBus.on(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, instance);
    }

    function getBufferControllerType() {
        return BUFFER_CONTROLLER_TYPE;
    }

    function initialize(source) {
        setMediaSource(source);
    }

    function createBufferSink(mediaInfo) {
        return new Promise((resolve, reject) => {
            try {
                sourceBufferSink = SourceBufferSink(context).create({ mediaSource, textController });
                sourceBufferSink.initializeForFirstUse(streamInfo, mediaInfo);
                if (!initialized) {
                    if (sourceBufferSink.getBuffer() && typeof sourceBufferSink.getBuffer().initialize === 'function') {
                        sourceBufferSink.getBuffer().initialize();
                    }
                    initialized = true;
                }
                resolve(sourceBufferSink);
            } catch (e) {
                errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + type));
                reject(e);
            }
        });

    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function getBuffer() {
        return sourceBufferSink;
    }

    function setMediaSource(value) {
        mediaSource = value;
    }

    function getMediaSource() {
        return mediaSource;
    }

    function getIsPruningInProgress() {
        return false;
    }

    function getBufferLevel() {
        return 0;
    }

    function getIsBufferingCompleted() {
        return isBufferingCompleted;
    }

    function setIsBufferingCompleted(value) {
        if (isBufferingCompleted === value) {
            return;
        }

        isBufferingCompleted = value;

        if (isBufferingCompleted) {
            triggerEvent(Events.BUFFERING_COMPLETED);
        }
    }

    function reset(errored) {
        eventBus.off(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, instance);

        if (!errored && sourceBufferSink) {
            sourceBufferSink.abort();
            sourceBufferSink.reset();
            sourceBufferSink = null;
        }
    }

    function appendInitSegmentFromCache(representationId) {
        // If text data file already in cache then no need to append it again
        return initCache.extract(streamInfo.id, representationId) !== null;
    }

    function _onInitFragmentLoaded(e) {
        if (!e.chunk.bytes || isBufferingCompleted) return;

        initCache.save(e.chunk);

        sourceBufferSink.append(e.chunk);

        setIsBufferingCompleted(true);
    }

    function getRangeAt() {
        return null;
    }

    function getAllRangesWithSafetyFactor() {
        return [];
    }

    function getContinuousBufferTimeForTargetTime() {
        return Number.POSITIVE_INFINITY;
    }

    function clearBuffers() {
        return Promise.resolve();
    }

    function updateBufferTimestampOffset() {
        return Promise.resolve();
    }

    function prepareForPlaybackSeek() {
        return Promise.resolve();
    }

    function prepareForReplacementTrackSwitch() {
        isBufferingCompleted = false;
        return Promise.resolve();
    }

    function updateAppendWindow() {
        return Promise.resolve();
    }

    function setSeekTarget() {

    }

    function pruneAllSafely() {
        return Promise.resolve();
    }

    function triggerEvent(eventType, data) {
        let payload = data || {};
        eventBus.trigger(eventType, payload, { streamId: streamInfo.id, mediaType: type });
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        getBufferControllerType,
        createBufferSink,
        getBuffer,
        getBufferLevel,
        getRangeAt,
        getAllRangesWithSafetyFactor,
        getContinuousBufferTimeForTargetTime,
        setMediaSource,
        getMediaSource,
        appendInitSegmentFromCache,
        getIsBufferingCompleted,
        setIsBufferingCompleted,
        getIsPruningInProgress,
        reset,
        clearBuffers,
        prepareForPlaybackSeek,
        prepareForReplacementTrackSwitch,
        setSeekTarget,
        updateAppendWindow,
        pruneAllSafely,
        updateBufferTimestampOffset
    };

    setup();

    return instance;
}

NotFragmentedTextBufferController.__dashjs_factory_name = BUFFER_CONTROLLER_TYPE;
export default FactoryMaker.getClassFactory(NotFragmentedTextBufferController);
