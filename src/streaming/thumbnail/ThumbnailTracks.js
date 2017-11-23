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

const THUMBNAILS_SCHEME_ID_URI = 'http://dashif.org/thumbnail_tile';

function ThumbnailTracks(config) {

    const dashManifestModel = config.dashManifestModel;
    const manifestModel = config.manifestModel;
    const stream = config.stream;
    const log = config.log;
    let instance,
        tracks,
        currentTrack;

    function initialize() {
        reset();

        // parse representation and create tracks
        addTracks();
    }

    function addTracks() {
        if (!stream || !manifestModel || !dashManifestModel) {
            return;
        }

        const streamInfo = stream ? stream.getStreamInfo() : null;
        if (!streamInfo) {
            return;
        }

        const adaptation = dashManifestModel.getAdaptationForType(manifestModel.getValue(), streamInfo.index, Constants.IMAGE, streamInfo);
        if (!adaptation) {
            return;
        }

        // Extract thumbnail tracks
        const representations = adaptation.Representation_asArray;
        if (representations) {
            representations.forEach(r=> {
                if (r.hasOwnProperty(DashConstants.SEGMENT_TEMPLATE) && r[DashConstants.SEGMENT_TEMPLATE].duration > 0) {
                    createTrack(r);
                } else {
                    log.warn('Only SegmentTemplate is allowed for Thumbnails adaptations. Thumbnails for representation', r.id, 'removed from the list of available representations');
                }
            });
        }

        if (tracks.length > 0) {
            currentTrack = tracks[0];
        }
    }

    function createTrack(representation) {
        const track = new ThumbnailTrackInfo();
        track.idx = tracks.length;
        track.bandwidth = representation.bandwidth;
        track.width = representation.width;
        track.height = representation.height;
        track.tilesHor = 1;
        track.tilesVert = 1;
        track.segmentInfo = representation[DashConstants.SEGMENT_TEMPLATE];

        const properties = dashManifestModel.getEssentialPropertiesForRepresentation(representation);
        if (properties) {
            properties.forEach((p) => {
                if (p.schemeIdUri === THUMBNAILS_SCHEME_ID_URI && p.value) {
                    const vars = p.value.split('x');
                    if (vars.length === 2 && !isNaN(vars[0]) && !isNaN(vars[1])) {
                        track.tilesHor = parseInt(vars[0], 10);
                        track.tilesVert = parseInt(vars[1], 10);
                    }
                }
            });
        }
        if (track.tilesHor > 0 && track.tilesVert > 0) {
            tracks.push(track);
        }
    }

    function getTracks() {
        return tracks;
    }

    function getTrackById(id) {
        if (id && tracks) {
            for (let i = 0; i < tracks.length; i++) {
                if (id === tracks[i].id) {
                    return tracks[i];
                }
            }
        }
        return null;
    }

    function getCurrentTrack() {
        return currentTrack;
    }

    function setCurrentTrackById(id) {
        currentTrack = getTrackById(id);
    }

    function reset() {
        tracks = [];
        currentTrack = null;
    }

    instance = {
        initialize: initialize,
        getTracks: getTracks,
        reset: reset,
        getTrackById: getTrackById,
        setCurrentTrackById: setCurrentTrackById,
        getCurrentTrack: getCurrentTrack
    };

    initialize();

    return instance;
}

ThumbnailTracks.__dashjs_factory_name = 'ThumbnailTracks';
export default FactoryMaker.getClassFactory(ThumbnailTracks);
