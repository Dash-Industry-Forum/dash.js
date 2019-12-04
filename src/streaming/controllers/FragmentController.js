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
import DataChunk from '../vo/DataChunk';
import FragmentModel from '../models/FragmentModel';
import FragmentLoader from '../FragmentLoader';
import RequestModifier from '../utils/RequestModifier';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';

function FragmentController( config ) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    const errHandler = config.errHandler;
    const mediaPlayerModel = config.mediaPlayerModel;
    const dashMetrics = config.dashMetrics;

    let instance,
        logger,
        fragmentModels;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
        eventBus.on(Events.FRAGMENT_LOADING_PROGRESS, onFragmentLoadingCompleted, instance);
    }

    function getModel(type) {
        let model = fragmentModels[type];
        if (!model) {
            model = FragmentModel(context).create({
                dashMetrics: dashMetrics,
                fragmentLoader: FragmentLoader(context).create({
                    dashMetrics: dashMetrics,
                    mediaPlayerModel: mediaPlayerModel,
                    errHandler: errHandler,
                    requestModifier: RequestModifier(context).getInstance(),
                    settings: config.settings
                })
            });

            fragmentModels[type] = model;
        }

        return model;
    }

    function resetInitialSettings() {
        for (let model in fragmentModels) {
            fragmentModels[model].reset();
        }
        fragmentModels = {};
    }

    function reset() {
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, this);
        eventBus.off(Events.FRAGMENT_LOADING_PROGRESS, onFragmentLoadingCompleted, this);
        resetInitialSettings();
    }

    function createDataChunk(bytes, request, streamId, endFragment) {
        const chunk = new DataChunk();

        chunk.streamId = streamId;
        chunk.mediaInfo = request.mediaInfo;
        chunk.segmentType = request.type;
        chunk.start = request.startTime;
        chunk.duration = request.duration;
        chunk.end = chunk.start + chunk.duration;
        chunk.bytes = bytes;
        chunk.index = request.index;
        chunk.quality = request.quality;
        chunk.representationId = request.representationId;
        chunk.endFragment = endFragment;

        return chunk;
    }

    function onFragmentLoadingCompleted(e) {
        if (fragmentModels[e.request.mediaType] !== e.sender) {
            return;
        }

        const request = e.request;
        const bytes = e.response;
        const isInit = request.isInitializationRequest();
        const streamInfo = request.mediaInfo.streamInfo;

        if (e.error) {
            if (e.request.mediaType === Constants.AUDIO || e.request.mediaType === Constants.VIDEO || e.request.mediaType === Constants.FRAGMENTED_TEXT) {
                // add service location to blacklist controller - only for audio or video. text should not set errors
                eventBus.trigger(Events.SERVICE_LOCATION_BLACKLIST_ADD, {entry: e.request.serviceLocation});
            }
        }

        if (!bytes || !streamInfo) {
            logger.warn('No ' + request.mediaType + ' bytes to push or stream is inactive.');
            return;
        }
        const chunk = createDataChunk(bytes, request, streamInfo.id, e.type !== Events.FRAGMENT_LOADING_PROGRESS);
        eventBus.trigger(isInit ? Events.INIT_FRAGMENT_LOADED : Events.MEDIA_FRAGMENT_LOADED, {
            chunk: chunk,
            fragmentModel: e.sender
        });
    }

    instance = {
        getModel: getModel,
        reset: reset
    };

    setup();

    return instance;
}

FragmentController.__dashjs_factory_name = 'FragmentController';
export default FactoryMaker.getClassFactory(FragmentController);
