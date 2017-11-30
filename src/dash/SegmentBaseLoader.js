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
import RequestModifier from '../streaming/utils/RequestModifier';
import Segment from './vo/Segment';
import DashJSError from '../streaming/vo/DashJSError';
import Events from '../core/events/Events';
import EventBus from '../core/EventBus';
import BoxParser from '../streaming/utils/BoxParser';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import {HTTPRequest} from '../streaming/vo/metrics/HTTPRequest';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import XHRLoader from '../streaming/XHRLoader';

function SegmentBaseLoader() {

    const context = this.context;
    const log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();

    let instance,
        errHandler,
        boxParser,
        requestModifier,
        metricsModel,
        mediaPlayerModel,
        xhrLoader,
        baseURLController;

    function initialize() {
        boxParser = BoxParser(context).getInstance();
        requestModifier = RequestModifier(context).getInstance();
        xhrLoader = XHRLoader(context).create({
            errHandler: errHandler,
            metricsModel: metricsModel,
            mediaPlayerModel: mediaPlayerModel,
            requestModifier: requestModifier
        });
    }

    function setConfig(config) {
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.metricsModel) {
            metricsModel = config.metricsModel;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }
    }

    function checkSetConfigCall() {
        if (!baseURLController || !baseURLController.hasOwnProperty('resolve')) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function loadInitialization(representation, loadingInfo) {
        checkSetConfigCall();
        let initRange = null;
        let isoFile = null;
        const baseUrl = baseURLController.resolve(representation.path);
        const info = loadingInfo || {
            init: true,
            url: baseUrl ? baseUrl.url : undefined,
            range: {
                start: 0,
                end: 1500
            },
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500
        };

        log('Start searching for initialization.');

        const request = getFragmentRequest(info);

        const onload = function (response) {
            info.bytesLoaded = info.range.end;
            isoFile = boxParser.parse(response);
            initRange = findInitRange(isoFile);

            if (initRange) {
                representation.range = initRange;
                // note that we don't explicitly set rep.initialization as this
                // will be computed when all BaseURLs are resolved later
                eventBus.trigger(Events.INITIALIZATION_LOADED, {representation: representation});
            } else {
                info.range.end = info.bytesLoaded + info.bytesToLoad;
                loadInitialization(representation, info);
            }

        };

        const onerror = function () {
            eventBus.trigger(Events.INITIALIZATION_LOADED, {representation: representation});
        };

        xhrLoader.load({request: request, success: onload, error: onerror});

        log('Perform init search: ' + info.url);
    }

    function loadSegments(representation, type, range, loadingInfo, callback) {
        checkSetConfigCall();
        if (range && (range.start === undefined || range.end === undefined)) {
            const parts = range ? range.toString().split('-') : null;
            range = parts ? {start: parseFloat(parts[0]), end: parseFloat(parts[1])} : null;
        }

        callback = !callback ? onLoaded : callback;
        let isoFile = null;
        let sidx = null;
        const hasRange = !!range;
        const baseUrl = baseURLController.resolve(representation.path);
        const info = {
            init: false,
            url: baseUrl ? baseUrl.url : undefined,
            range: hasRange ? range : { start: 0, end: 1500 },
            searching: !hasRange,
            bytesLoaded: loadingInfo ? loadingInfo.bytesLoaded : 0,
            bytesToLoad: 1500
        };

        const request = getFragmentRequest(info);

        const onload = function (response) {
            const extraBytes = info.bytesToLoad;
            const loadedLength = response.byteLength;

            info.bytesLoaded = info.range.end - info.range.start;
            isoFile = boxParser.parse(response);
            sidx = isoFile.getBox('sidx');

            if (!sidx || !sidx.isComplete) {
                if (sidx) {
                    info.range.start = sidx.offset || info.range.start;
                    info.range.end = info.range.start + (sidx.size || extraBytes);
                } else if (loadedLength < info.bytesLoaded) {
                    // if we have reached a search limit or if we have reached the end of the file we have to stop trying to find sidx
                    callback(null, representation, type);
                    return;
                } else {
                    const lastBox = isoFile.getLastBox();

                    if (lastBox && lastBox.size) {
                        info.range.start = lastBox.offset + lastBox.size;
                        info.range.end = info.range.start + extraBytes;
                    } else {
                        info.range.end += extraBytes;
                    }
                }
                loadSegments(representation, type, info.range, info, callback);
            } else {
                const ref = sidx.references;
                let loadMultiSidx,
                    segments;

                if (ref !== null && ref !== undefined && ref.length > 0) {
                    loadMultiSidx = (ref[0].reference_type === 1);
                }

                if (loadMultiSidx) {
                    log('Initiate multiple SIDX load.');
                    info.range.end = info.range.start + sidx.size;

                    let j, len, ss, se, r;
                    let segs = [];
                    let count = 0;
                    let offset = (sidx.offset || info.range.start) + sidx.size;
                    const tmpCallback = function (result) {
                        if (result) {
                            segs = segs.concat(result);
                            count++;

                            if (count >= len) {
                                callback(segs, representation, type);
                            }
                        } else {
                            callback(null, representation, type);
                        }
                    };

                    for (j = 0, len = ref.length; j < len; j++) {
                        ss = offset;
                        se = offset + ref[j].referenced_size - 1;
                        offset = offset + ref[j].referenced_size;
                        r = {start: ss, end: se};
                        loadSegments(representation, null, r, info, tmpCallback);
                    }

                } else {
                    log('Parsing segments from SIDX.');
                    segments = getSegmentsForSidx(sidx, info);
                    callback(segments, representation, type);
                }
            }
        };

        const onerror = function () {
            callback(null, representation, type);
        };

        xhrLoader.load({request: request, success: onload, error: onerror});
        log('Perform SIDX load: ' + info.url);
    }

    function reset() {
        xhrLoader.abort();
        xhrLoader = null;
        errHandler = null;
        boxParser = null;
        requestModifier = null;
    }

    function getSegmentsForSidx(sidx, info) {
        const refs = sidx.references;
        const len = refs.length;
        const timescale = sidx.timescale;
        let time = sidx.earliest_presentation_time;
        let start = info.range.start + sidx.offset + sidx.first_offset + sidx.size;
        const segments = [];
        let segment,
            end,
            duration,
            size;

        for (let i = 0; i < len; i++) {
            duration = refs[i].subsegment_duration;
            size = refs[i].referenced_size;

            segment = new Segment();
            // note that we don't explicitly set segment.media as this will be
            // computed when all BaseURLs are resolved later
            segment.duration = duration;
            segment.startTime = time;
            segment.timescale = timescale;
            end = start + size - 1;
            segment.mediaRange = start + '-' + end;
            segments.push(segment);
            time += duration;
            start += size;
        }

        return segments;
    }

    function findInitRange(isoFile) {
        const ftyp = isoFile.getBox('ftyp');
        const moov = isoFile.getBox('moov');

        let initRange = null;
        let start,
            end;

        log('Searching for initialization.');

        if (moov && moov.isComplete) {
            start = ftyp ? ftyp.offset : moov.offset;
            end = moov.offset + moov.size - 1;
            initRange = start + '-' + end;

            log('Found the initialization.  Range: ' + initRange);
        }

        return initRange;
    }

    function getFragmentRequest(info) {
        if (!info.url) {
            return;
        }

        const request = new FragmentRequest();
        request.type = info.init ? HTTPRequest.INIT_SEGMENT_TYPE : HTTPRequest.MEDIA_SEGMENT_TYPE;
        request.url = info.url;
        request.range = info.range.start + '-' + info.range.end;

        return request;
    }

    function onLoaded(segments, representation, type) {
        if (segments) {
            eventBus.trigger(Events.SEGMENTS_LOADED, {segments: segments, representation: representation, mediaType: type});
        } else {
            eventBus.trigger(Events.SEGMENTS_LOADED, {segments: null, representation: representation, mediaType: type, error: new DashJSError(null, 'error loading segments', null)});
        }
    }

    instance = {
        setConfig: setConfig,
        initialize: initialize,
        loadInitialization: loadInitialization,
        loadSegments: loadSegments,
        reset: reset
    };

    return instance;
}

SegmentBaseLoader.__dashjs_factory_name = 'SegmentBaseLoader';
export default FactoryMaker.getSingletonFactory(SegmentBaseLoader);
