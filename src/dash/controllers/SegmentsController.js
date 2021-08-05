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
import TimelineSegmentsGetter from '../utils/TimelineSegmentsGetter';
import TemplateSegmentsGetter from '../utils/TemplateSegmentsGetter';
import ListSegmentsGetter from '../utils/ListSegmentsGetter';
import SegmentBaseGetter from '../utils/SegmentBaseGetter';

function SegmentsController(config) {
    config = config || {};

    const context = this.context;
    const dashConstants = config.dashConstants;
    const type = config.type;
    const segmentBaseController = config.segmentBaseController;

    let instance,
        getters;

    function setup() {
        getters = {};
    }

    function initialize(isDynamic) {
        getters[dashConstants.SEGMENT_TIMELINE] = TimelineSegmentsGetter(context).create(config, isDynamic);
        getters[dashConstants.SEGMENT_TEMPLATE] = TemplateSegmentsGetter(context).create(config, isDynamic);
        getters[dashConstants.SEGMENT_LIST] = ListSegmentsGetter(context).create(config, isDynamic);
        getters[dashConstants.SEGMENT_BASE] = SegmentBaseGetter(context).create(config, isDynamic);
    }

    function updateInitData(voRepresentation, hasInitialization) {
        if (hasInitialization) {
            return Promise.resolve();
        }
        return segmentBaseController.getSegmentBaseInitSegment({
            representation: voRepresentation,
            mediaType: type
        });
    }

    function updateSegmentData(voRepresentation, hasSegments) {
        if (hasSegments) {
            return Promise.resolve();
        }
        return segmentBaseController.getSegmentList({
            mimeType: voRepresentation.mimeType,
            representation: voRepresentation,
            mediaType: type
        });
    }

    function getSegmentsGetter(representation) {
        return representation ? representation.segments ? getters[dashConstants.SEGMENT_BASE] : getters[representation.segmentInfoType] : null;
    }

    function getSegmentByIndex(representation, index, lastSegmentTime) {
        const getter = getSegmentsGetter(representation);
        return getter ? getter.getSegmentByIndex(representation, index, lastSegmentTime) : null;
    }

    function getSegmentByTime(representation, time) {
        const getter = getSegmentsGetter(representation);
        return getter ? getter.getSegmentByTime(representation, time) : null;
    }

    function getMediaFinishedInformation(representation) {
        const getter = getSegmentsGetter(representation);
        return getter ? getter.getMediaFinishedInformation(representation) : {
            numberOfSegments: 0,
            mediaTimeOfLastSignaledSegment: NaN
        };
    }

    instance = {
        initialize,
        updateInitData,
        updateSegmentData,
        getSegmentByIndex,
        getSegmentByTime,
        getMediaFinishedInformation
    };

    setup();

    return instance;
}

SegmentsController.__dashjs_factory_name = 'SegmentsController';
const factory = FactoryMaker.getClassFactory(SegmentsController);
export default factory;
