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
        mediaPlayerModel,
        urlLoader,
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

        if (config.boxParser) {
            boxParser = config.boxParser;
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

    function loadInitialization(representation, mediaType) {
        return new Promise((resolve) => {
            _loadInitializationRecursively(representation, mediaType, resolve);
        });
    }

    function _loadInitializationRecursively(representation, mediaType, resolve, loadingInfo) {
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
                resolve(representation);
            } else {
                info.range.end = info.bytesLoaded + info.bytesToLoad;
                return _loadInitializationRecursively(representation, mediaType, resolve, info);
            }
        };

        const onerror = function () {
            resolve(representation);
        };

        urlLoader.load({ request: request, success: onload, error: onerror });

        logger.debug('Perform init search: ' + info.url);
    }

    function loadSegments(representation, mediaType, range) {
        return new Promise((resolve) => {
            _loadSegmentsRecursively(representation, mediaType, range, resolve);
        });
    }

    function _loadSegmentsRecursively(representation, mediaType, range, resolve, callback, loadingInfo) {
        if (range && (range.start === undefined || range.end === undefined)) {
            const parts = range ? range.toString().split('-') : null;
            range = parts ? { start: parseFloat(parts[0]), end: parseFloat(parts[1]) } : null;
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
                    callback(null, representation, resolve);
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
                _loadSegmentsRecursively(representation, mediaType, info.range, resolve, null, info);
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
                    const tmpCallback = function (result) {
                        if (result) {
                            segs = segs.concat(result);
                            count++;

                            if (count >= len) {
                                // http requests can be processed in a wrong order, so, we have to reorder segments with an ascending start Time order
                                segs.sort(function (a, b) {
                                    return a.startTime - b.startTime < 0 ? -1 : 0;
                                });
                                callback(segs, representation, resolve);
                            }
                        } else {
                            callback(null, representation, resolve);
                        }
                    };

                    for (j = 0, len = ref.length; j < len; j++) {
                        ss = offset;
                        se = offset + ref[j].referenced_size - 1;
                        offset = offset + ref[j].referenced_size;
                        r = { start: ss, end: se };
                        _loadSegmentsRecursively(representation, mediaType, r, resolve, tmpCallback, info);
                    }

                } else {
                    logger.debug('Parsing segments from SIDX. representation ' + mediaType + ' - id: ' + representation.id + ' for range : ' + info.range.start + ' - ' + info.range.end);
                    segments = getSegmentsForSidx(sidx, info);
                    callback(segments, representation, resolve);
                }
            }
        };

        const onerror = function () {
            callback(null, representation, resolve);
        };

        urlLoader.load({ request: request, success: onload, error: onerror });
        logger.debug(`Perform SIDX load for type ${mediaType} : ${info.url} with range ${info.range.start} - ${info.range.end}`);
    }

    function onLoaded(segments, representation, resolve) {
        resolve({
            segments: segments,
            representation: representation,
            error: segments ? undefined : new DashJSError(errors.SEGMENT_BASE_LOADER_ERROR_CODE, errors.SEGMENT_BASE_LOADER_ERROR_MESSAGE)
        });
    }

    function reset() {
        if (urlLoader) {
            urlLoader.abort();
            urlLoader = null;
        }
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

    instance = {
        setConfig,
        initialize,
        loadInitialization,
        loadSegments,
        reset
    };

    setup();

    return instance;
}

SegmentBaseLoader.__dashjs_factory_name = 'SegmentBaseLoader';
export default FactoryMaker.getSingletonFactory(SegmentBaseLoader);
