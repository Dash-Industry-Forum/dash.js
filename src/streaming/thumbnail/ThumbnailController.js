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
import Constants from '../constants/Constants';
import Thumbnail from '../vo/Thumbnail';
import ThumbnailTracks from './ThumbnailTracks';
import BitrateInfo from '../vo/BitrateInfo';
import { replaceTokenForTemplate, unescapeDollarsInTemplate } from '../../dash/utils/SegmentsUtils';

function ThumbnailController(config) {

    const context = this.context;

    let instance,
        thumbnailTracks;

    function setup() {
        reset();
        thumbnailTracks = ThumbnailTracks(context).create({
            adapter: config.adapter,
            baseURLController: config.baseURLController,
            stream: config.stream,
            timelineConverter: config.timelineConverter
        });
    }

    function getThumbnail(time, callback) {
        const track = thumbnailTracks.getCurrentTrack();
        let offset,
            request;
        if (!track || track.segmentDuration <= 0 || time === undefined || time === null) {
            return null;
        }

        // Calculate index of the sprite given a time
        if (isNaN(track.segmentDuration)) {
            request = thumbnailTracks.getThumbnailRequestForTime(time);
            if (request) {
                track.segmentDuration = request.duration;
            }
        }

        offset = time % track.segmentDuration;

        const thumbIndex = Math.floor((offset * track.tilesHor * track.tilesVert) / track.segmentDuration);
        // Create and return the thumbnail
        const thumbnail = new Thumbnail();

        thumbnail.width = Math.floor(track.widthPerTile);
        thumbnail.height = Math.floor(track.heightPerTile);
        thumbnail.x = Math.floor(thumbIndex % track.tilesHor) * track.widthPerTile;
        thumbnail.y = Math.floor(thumbIndex / track.tilesHor) * track.heightPerTile;

        if ('readThumbnail' in track) {
            return track.readThumbnail(time, (url) => {
                thumbnail.url = url;
                if (callback)
                    callback(thumbnail);
            });
        } else {
            if (!request) {
                const seq = Math.floor(time / track.segmentDuration);
                thumbnail.url = buildUrlFromTemplate(track, seq);
            } else {
                thumbnail.url = request.url;
                track.segmentDuration = NaN;
            }
            if (callback)
                callback(thumbnail);
            return thumbnail;
        }
    }

    function buildUrlFromTemplate(track, seq) {
        const seqIdx = seq + track.startNumber;
        let url = replaceTokenForTemplate(track.templateUrl, 'Number', seqIdx);
        url = replaceTokenForTemplate(url, 'Time', (seqIdx - 1) * track.segmentDuration);
        url = replaceTokenForTemplate(url, 'Bandwidth', track.bandwidth);
        return unescapeDollarsInTemplate(url);
    }

    function setTrackByIndex(index) {
        thumbnailTracks.setTrackByIndex(index);
    }

    function getCurrentTrackIndex() {
        return thumbnailTracks.getCurrentTrackIndex();
    }

    function getBitrateList() {
        const tracks = thumbnailTracks.getTracks();
        let i = 0;

        return tracks.map((t) => {
            const bitrateInfo = new BitrateInfo();
            bitrateInfo.mediaType = Constants.IMAGE;
            bitrateInfo.qualityIndex = i++;
            bitrateInfo.bitrate = t.bitrate;
            bitrateInfo.width = t.width;
            bitrateInfo.height = t.height;
            return bitrateInfo;
        });
    }

    function reset() {
        if (thumbnailTracks) {
            thumbnailTracks.reset();
        }
    }

    instance = {
        get: getThumbnail,
        setTrackByIndex: setTrackByIndex,
        getCurrentTrackIndex: getCurrentTrackIndex,
        getBitrateList: getBitrateList,
        reset: reset
    };

    setup();

    return instance;
}

ThumbnailController.__dashjs_factory_name = 'ThumbnailController';
export default FactoryMaker.getClassFactory(ThumbnailController);