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
import DashConstants from '../../dash/constants/DashConstants';
import FactoryMaker from '../../core/FactoryMaker';
import ThumbnailTrackInfo from '../vo/ThumbnailTrackInfo';
import URLUtils from '../../streaming/utils/URLUtils';
import { replaceIDForTemplate, getTimeBasedSegment } from '../../dash/utils/SegmentsUtils';

import SegmentBaseLoader from '../../dash/SegmentBaseLoader';
import BoxParser from '../../streaming/utils/BoxParser';
import XHRLoader from '../../streaming/net/XHRLoader';
import DashHandler from '../../dash/DashHandler';

export const THUMBNAILS_SCHEME_ID_URIS = ['http://dashif.org/thumbnail_tile',
                                   'http://dashif.org/guidelines/thumbnail_tile'];

function ThumbnailTracks(config) {
    const context = this.context;

    const adapter = config.adapter;
    const baseURLController = config.baseURLController;
    const stream = config.stream;
    const timelineConverter = config.timelineConverter;
    const dashMetrics = config.dashMetrics;
    const mediaPlayerModel = config.mediaPlayerModel;
    const errHandler = config.errHandler;

    const urlUtils = URLUtils(context).getInstance();

    let instance,
        tracks,
        indexHandler,
        currentTrackIndex,
        mediaInfo,
        loader, segmentBaseLoader, boxParser;

    function initialize() {
        reset();
        loader = XHRLoader(context).create({});
        boxParser = BoxParser(context).getInstance();
        segmentBaseLoader = SegmentBaseLoader(context).getInstance();
        segmentBaseLoader.setConfig({
            baseURLController: baseURLController,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler
        });

        indexHandler = DashHandler(context).create({timelineConverter: timelineConverter,
                                baseURLController: baseURLController});

        // initialize controllers
        indexHandler.initialize(adapter ? adapter.getIsDynamic() : false);

        // parse representation and create tracks
        addTracks();
    }

    function normalizeSegments(fragments, representation) {
        const segments = [];
        let count = 0;

        let i,
            len,
            s,
            seg;

        for (i = 0, len = fragments.length; i < len; i++) {
            s = fragments[i];

            seg = getTimeBasedSegment(
                timelineConverter,
                adapter.getIsDynamic(),
                representation,
                s.startTime,
                s.duration,
                s.timescale,
                s.media,
                s.mediaRange,
                count);

            if (seg) {
                segments.push(seg);
                seg = null;
                count++;
            }
        }
        return segments;
    }

    function addTracks() {
        if (!stream || !adapter) {
            return;
        }

        const streamInfo = stream.getStreamInfo();
        if (!streamInfo) {
            return;
        }

        // Extract thumbnail tracks
        mediaInfo = adapter.getMediaInfoForType(streamInfo, Constants.IMAGE);
        if (!mediaInfo) {
            return;
        }

        const voReps = adapter.getVoRepresentations(mediaInfo);

        if (voReps && voReps.length > 0) {
            voReps.forEach((rep) => {
                if ((rep.segmentInfoType === DashConstants.SEGMENT_TEMPLATE && rep.segmentDuration > 0 && rep.media) ||
                     rep.segmentInfoType === DashConstants.SEGMENT_TIMELINE) {
                    createTrack(rep);
                }
                if (rep.segmentInfoType === DashConstants.SEGMENT_BASE) {
                    createTrack(rep, true);
                }
            });
        }

        if (tracks.length > 0) {
            // Sort bitrates and select the lowest bitrate rendition
            tracks.sort((a, b) => a.bitrate - b.bitrate);
            currentTrackIndex = tracks.length - 1;
        }
    }

    function createTrack(representation, useSegmentBase) {
        const track = new ThumbnailTrackInfo();
        track.id = representation.id;
        track.bitrate = representation.bandwidth;
        track.width = representation.width;
        track.height = representation.height;
        track.tilesHor = 1;
        track.tilesVert = 1;

        if (representation.essentialProperties) {
            representation.essentialProperties.forEach((p) => {
                if (THUMBNAILS_SCHEME_ID_URIS.indexOf(p.schemeIdUri) >= 0 && p.value) {
                    const vars = p.value.split('x');
                    if (vars.length === 2 && !isNaN(vars[0]) && !isNaN(vars[1])) {
                        track.tilesHor = parseInt(vars[0], 10);
                        track.tilesVert = parseInt(vars[1], 10);
                    }
                }
            });
        }

        if (useSegmentBase) {
            segmentBaseLoader.loadSegments(representation, Constants.IMAGE, representation.indexRange, {}, function (segments, representation) {
                var cache = [];
                segments = normalizeSegments(segments, representation);
                track.segmentDuration = segments[0].duration; //assume all segments have the same duration
                track.readThumbnail = function (time, callback) {

                    let cached = null;
                    cache.some(el => {
                        if (el.start <= time && el.end > time) {
                            cached = el.url;
                            return true;
                        }
                    });
                    if (cached) {
                        callback(cached);
                    } else {
                        segments.some((ss) => {
                            if (ss.mediaStartTime <= time && ss.mediaStartTime + ss.duration > time) {
                                const baseURL = baseURLController.resolve(representation.path);
                                loader.load({
                                    method: 'get',
                                    url: baseURL.url,
                                    request: {
                                        range: ss.mediaRange,
                                        responseType: 'arraybuffer'
                                    },
                                    onload: function (e) {
                                        let info = boxParser.getSamplesInfo(e.target.response);
                                        let blob = new Blob( [ e.target.response.slice(info.sampleList[0].offset, info.sampleList[0].offset + info.sampleList[0].size) ], { type: 'image/jpeg' } );
                                        let imageUrl = window.URL.createObjectURL( blob );
                                        cache.push({
                                            start: ss.mediaStartTime,
                                            end: ss.mediaStartTime + ss.duration,
                                            url: imageUrl
                                        });
                                        if (callback)
                                            callback(imageUrl);
                                    }
                                });
                                return true;
                            }
                        });
                    }
                };
            });
        } else {
            track.startNumber = representation.startNumber;
            track.segmentDuration = representation.segmentDuration;
            track.timescale = representation.timescale;
            track.templateUrl = buildTemplateUrl(representation);
        }

        if (track.tilesHor > 0 && track.tilesVert > 0) {
            // Precalculate width and heigth per tile for perf reasons
            track.widthPerTile = track.width / track.tilesHor;
            track.heightPerTile = track.height / track.tilesVert;
            tracks.push(track);
        }
    }

    function buildTemplateUrl(representation) {
        const templateUrl = urlUtils.isRelative(representation.media) ?
            urlUtils.resolve(representation.media, baseURLController.resolve(representation.path).url) : representation.media;

        if (!templateUrl) {
            return '';
        }

        return replaceIDForTemplate(templateUrl, representation.id);
    }

    function getTracks() {
        return tracks;
    }

    function getCurrentTrackIndex() {
        return currentTrackIndex;
    }

    function getCurrentTrack() {
        if (currentTrackIndex < 0) {
            return null;
        }
        return tracks[currentTrackIndex];
    }

    function setTrackByIndex(index) {
        if (!tracks || tracks.length === 0) {
            return;
        }
        // select highest bitrate in case selected index is higher than bitrate list length
        if (index >= tracks.length) {
            index = tracks.length - 1;
        }
        currentTrackIndex = index;
    }

    function getThumbnailRequestForTime(time) {
        let currentVoRep;
        const voReps = adapter.getVoRepresentations(mediaInfo);
        for (let i = 0; i < voReps.length; i++) {
            if (tracks[currentTrackIndex].id === voReps[i].id) {
                currentVoRep = voReps[i];
                break;
            }
        }

        return indexHandler.getSegmentRequestForTime(mediaInfo, currentVoRep, time);
    }

    function reset() {
        tracks = [];
        currentTrackIndex = -1;
        mediaInfo = null;
    }

    instance = {
        initialize: initialize,
        getTracks: getTracks,
        reset: reset,
        setTrackByIndex: setTrackByIndex,
        getCurrentTrack: getCurrentTrack,
        getCurrentTrackIndex: getCurrentTrackIndex,
        getThumbnailRequestForTime: getThumbnailRequestForTime
    };

    initialize();

    return instance;
}

ThumbnailTracks.__dashjs_factory_name = 'ThumbnailTracks';
export default FactoryMaker.getClassFactory(ThumbnailTracks);
