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

import SegmentBaseLoader from '../SegmentBaseLoader';
import WebmSegmentBaseLoader from '../WebmSegmentBaseLoader';

function SegmentBaseController(config) {
    config = config || {};

    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const errHandler = config.errHandler;
    const baseURLController = config.baseURLController;
    const debug = config.debug;
    const boxParser = config.boxParser;
    const requestModifier = config.requestModifier;
    const errors = config.errors;

    let instance,
        segmentBaseLoader,
        webmSegmentBaseLoader;

    function setup() {
        segmentBaseLoader = SegmentBaseLoader(context).getInstance();
        webmSegmentBaseLoader = WebmSegmentBaseLoader(context).getInstance();

        segmentBaseLoader.setConfig({
            baseURLController: baseURLController,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            eventBus: eventBus,
            events: events,
            errors: errors,
            debug: debug,
            boxParser: boxParser,
            requestModifier: requestModifier
        });

        webmSegmentBaseLoader.setConfig({
            baseURLController: baseURLController,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            eventBus: eventBus,
            events: events,
            errors: errors,
            debug: debug,
            requestModifier: requestModifier
        });
    }

    function isWebM(mimeType) {
        const type = mimeType ? mimeType.split('/')[1] : '';
        return 'webm' === type.toLowerCase();
    }

    function initialize() {
        segmentBaseLoader.initialize();
        webmSegmentBaseLoader.initialize();
    }

    function getSegmentBaseInitSegment(data) {
        if (isWebM(data.representation.mimeType)) {
            return webmSegmentBaseLoader.loadInitialization(data.representation, data.mediaType);
        } else {
            return segmentBaseLoader.loadInitialization(data.representation, data.mediaType);
        }
    }

    function getSegmentList(e) {
        if (isWebM(e.mimeType)) {
            return webmSegmentBaseLoader.loadSegments(e.representation, e.mediaType, e.representation ? e.representation.indexRange : null);
        } else {
            return segmentBaseLoader.loadSegments(e.representation, e.mediaType, e.representation ? e.representation.indexRange : null);
        }
    }

    function reset() {
        segmentBaseLoader.reset();
        webmSegmentBaseLoader.reset();
    }


    instance = {
        initialize,
        getSegmentBaseInitSegment,
        getSegmentList,
        reset
    };

    setup();

    return instance;
}

SegmentBaseController.__dashjs_factory_name = 'SegmentBaseController';
const factory = FactoryMaker.getSingletonFactory(SegmentBaseController);
export default factory;
