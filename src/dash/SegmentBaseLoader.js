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
import Segment from './vo/Segment';
import DashJSError from '../streaming/vo/DashJSError';
import FactoryMaker from '../core/FactoryMaker';
import FragmentRequest from '../streaming/vo/FragmentRequest';
import URLLoader from '../streaming/net/URLLoader';

function SegmentBaseLoader() {

    const context = this.context;

    let instance,
        logger,
        errHandler,
        boxParser,
        requestModifier,
        dashMetrics,
        settings,
        mediaPlayerModel,
        urlLoader,
        events,
        eventBus,
        errors,
        constants,
        dashConstants,
        urlUtils,
        baseURLController;

    function setup() {
    }

    function initialize() {
        urlLoader = URLLoader(context).create({
            errHandler: errHandler,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            requestModifier: requestModifier,
            useFetch: settings ? settings.get().streaming.lowLatencyEnabled : null,
            boxParser: boxParser,
            errors: errors,
            urlUtils: urlUtils,
            constants: constants,
            dashConstants: dashConstants
        });
    }

    function setConfig(config) {
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.settings) {
            settings = config.settings;
        }

        if (config.boxParser) {
            boxParser = config.boxParser;
        }

        if (config.events) {
            events = config.events;
        }

        if (config.eventBus) {
            eventBus = config.eventBus;
        }

        if (config.debug) {
            logger = config.debug.getLogger(instance);
        }

        if (config.requestModifier) {
            requestModifier = config.requestModifier;
        }

        if (config.errors) {
            errors = config.errors;
        }

        if (config.urlUtils) {
            urlUtils = config.urlUtils;
        }

        if (config.constants) {
            constants = config.constants;
        }

        if (config.dashConstants) {
            dashConstants = config.dashConstants;
        }
    }

    function checkConfig() {
        if (!baseURLController || !baseURLController.hasOwnProperty('resolve')) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function loadInitialization(streamId, mediaType, representation, loadingInfo) {
        checkConfig();
        let initRange = null;
        const baseUrl = representation ? baseURLController.resolve(representation.path) : null;
        const info = loadingInfo || {
            init: true,
            url: baseUrl ? baseUrl.url : undefined,
            range: {
                start: 0,
                end: 1500
            },
            searching: false,
            bytesLoaded: 0,
            bytesToLoad: 1500,
            mediaType: mediaType
        };

        logger.debug('Start searching for initialization.');

        const request = getFragmentRequest(info);

        const onload = function (response) {
            info.bytesLoaded = info.range.end;
            initRange = boxParser.findInitRange(response);

            if (initRange) {
                representation.range = initRange;
                // note that we don't explicitly set rep.initialization as this
                // will be computed when all BaseURLs are resolved later
                eventBus.trigger(events.INITIALIZATION_LOADED,
                    { representation: representation },
                    { streamId: streamId, mediaType: mediaType }
                );
            } else {
                info.range.end = info.bytesLoaded + info.bytesToLoad;
                loadInitialization(streamId, mediaType, representation, info);
            }
        };

        const onerror = function () {
            eventBus.trigger(events.INITIALIZATION_LOADED,
                { representation: representation },
                { streamId: streamId, mediaType: mediaType }
            );
        };

        urlLoader.load({request: request, success: onload, error: onerror});

        logger.debug('Perform init search: ' + info.url);
    }

    function loadSegments(streamId, mediaType, representation, range, callback, loadingInfo) {
        checkConfig();
        if (range && (range.start === undefined || range.end === undefined)) {
            const parts = range ? range.toString().split('-') : null;
            range = parts ? {start: parseFloat(parts[0]), end: parseFloat(parts[1])} : null;
        }

        callback = !callback ? onLoaded : callback;
        let isoFile = null;
        let sidx = null;
        const hasRange = !!range;
        const baseUrl = representation ? baseURLController.resolve(representation.path) : null;
        const info = {
            init: false,
            url: baseUrl ? baseUrl.url : undefined,
            range: hasRange ? range : { start: 0, end: 1500 },
            searching: !hasRange,
            bytesLoaded: loadingInfo ? loadingInfo.bytesLoaded : 0,
            bytesToLoad: 1500,
            mediaType: mediaType
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
                    callback(streamId, mediaType, null, representation);
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
                loadSegments(streamId, mediaType, representation, info.range, callback, info);
            } else {
                const ref = sidx.references;
                let loadMultiSidx,
                    segments;

                if (ref !== null && ref !== undefined && ref.length > 0) {
                    loadMultiSidx = (ref[0].reference_type === 1);
                }

                if (loadMultiSidx) {
                    logger.debug('Initiate multiple SIDX load.');
                    info.range.end = info.range.start + sidx.size;

                    let j, len, ss, se, r;
                    let segs = [];
                    let count = 0;
                    let offset = (sidx.offset || info.range.start) + sidx.size;
                    const tmpCallback = function (streamId, mediaType, result) {
                        if (result) {
                            segs = segs.concat(result);
                            count++;

                            if (count >= len) {
                                // http requests can be processed in a wrong order, so, we have to reorder segments with an ascending start Time order
                                segs.sort(function (a, b) {
                                    return a.startTime - b.startTime < 0 ? -1 : 0;
                                });
                                callback(streamId, mediaType, segs, representation);
                            }
                        } else {
                            callback(streamId, mediaType, null, representation);
                        }
                    };

                    for (j = 0, len = ref.length; j < len; j++) {
                        ss = offset;
                        se = offset + ref[j].referenced_size - 1;
                        offset = offset + ref[j].referenced_size;
                        r = {start: ss, end: se};
                        loadSegments(streamId, mediaType, representation, r, tmpCallback, info);
                    }

                } else {
                    logger.debug('Parsing segments from SIDX. representation ' + mediaType + ' - id: ' + representation.id + ' for range : ' + info.range.start + ' - ' + info.range.end);
                    segments = getSegmentsForSidx(sidx, info);
                    callback(streamId, mediaType, segments, representation);
                }
            }
        };

        const onerror = function () {
            callback(streamId, mediaType, null, representation);
        };

        urlLoader.load({request: request, success: onload, error: onerror});
        logger.debug('Perform SIDX load: ' + info.url + ' with range : ' + info.range.start + ' - ' + info.range.end);
    }

    function reset() {
        urlLoader.abort();
        urlLoader = null;
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

    function getFragmentRequest(info) {
        if (!info.url) {
            return;
        }
        const request = new FragmentRequest();
        request.setInfo(info);
        return request;
    }

    function onLoaded(streamId, mediaType, segments, representation) {
        eventBus.trigger(events.SEGMENTS_LOADED,
            {
                segments: segments,
                representation: representation,
                error: segments ? undefined : new DashJSError(errors.SEGMENT_BASE_LOADER_ERROR_CODE, errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE)
            },
            { streamId: streamId, mediaType: mediaType }
        );
    }

    instance = {
        setConfig: setConfig,
        initialize: initialize,
        loadInitialization: loadInitialization,
        loadSegments: loadSegments,
        reset: reset
    };

    setup();

    return instance;
}

SegmentBaseLoader.__dashjs_factory_name = 'SegmentBaseLoader';
export default FactoryMaker.getSingletonFactory(SegmentBaseLoader);
