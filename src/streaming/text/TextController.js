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
import TextSourceBuffer from './TextSourceBuffer';
import TextTracks from './TextTracks';
import VTTParser from '../utils/VTTParser';
import TTMLParser from '../utils/TTMLParser';

function TextController() {

    let context = this.context;
    let instance;
    let textSourceBuffer;

    let allTracksAreDisabled,
        errHandler,
        dashManifestModel,
        mediaController,
        videoModel,
        streamController,
        textTracks,
        vttParser,
        ttmlParser;

    function setup() {

        textTracks = TextTracks(context).getInstance();
        vttParser = VTTParser(context).getInstance();
        ttmlParser = TTMLParser(context).getInstance();
        textSourceBuffer = TextSourceBuffer(context).getInstance();

        textTracks.initialize();
        allTracksAreDisabled = false;
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.streamController) {
            streamController = config.streamController;
        }
        if (config.textTracks) {
            textTracks = config.textTracks;
        }
        if (config.vttParser) {
            vttParser = config.vttParser;
        }
        if (config.ttmlParser) {
            ttmlParser = config.ttmlParser;
        }

        // create config for source buffer
        textSourceBuffer.setConfig({
            errHandler: errHandler,
            dashManifestModel: dashManifestModel,
            mediaController: mediaController,
            videoModel: videoModel,
            streamController: streamController,
            textTracks: textTracks,
            vttParser: vttParser,
            ttmlParser: ttmlParser
        });
    }

    function getTextSourceBuffer() {
        return textSourceBuffer;
    }

    function getAllTracksAreDisabled() {
        return allTracksAreDisabled;
    }

    function addEmbeddedTrack(mediaInfo) {
        textSourceBuffer.addEmbeddedTrack(mediaInfo);
    }

    function setTextTrack() {

        var config = textSourceBuffer.getConfig();
        var fragmentModel = config.fragmentModel;
        var embeddedTracks = config.embeddedTracks;
        var isFragmented = config.isFragmented;
        var fragmentedTracks = config.fragmentedTracks;
        var allTracksAreDisabled = config.allTracksAreDisabled;

        var el = videoModel.getElement();
        var tracks = el.textTracks;
        var ln = tracks.length;
        var nrNonEmbeddedTracks = ln - embeddedTracks.length;
        var oldTrackIdx = textTracks.getCurrentTrackIdx();

        for (var i = 0; i < ln; i++) {
            var track = tracks[i];
            allTracksAreDisabled = track.mode !== 'showing';
            if (track.mode === 'showing') {
                if (oldTrackIdx !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                    textTracks.setCurrentTrackIdx(i);
                    textTracks.addCaptions(i, 0, null); // Make sure that previously queued captions are added as cues

                    // specific to fragmented texe
                    if (isFragmented && i < nrNonEmbeddedTracks) {
                        var currentFragTrack = mediaController.getCurrentTrackFor('fragmentedText', streamController.getActiveStreamInfo());
                        var newFragTrack = fragmentedTracks[i];
                        if (newFragTrack !== currentFragTrack) {
                            fragmentModel.abortRequests();
                            textTracks.deleteTrackCues(currentFragTrack);
                            mediaController.setTrack(newFragTrack);
                            textSourceBuffer.setCurrentFragmentedTrackIdx(i);
                        }
                    }
                }
                break;
            }
        }

        if (allTracksAreDisabled) {
            textTracks.setCurrentTrackIdx(-1);
        }
    }

    function getCurrentTrackIdx() {
        var textTracks = textSourceBuffer.getConfig().textTracks;
        return textTracks.getCurrentTrackIdx();
    }

    function reset() {
        allTracksAreDisabled = false;
        textSourceBuffer.resetEmbedded();
    }

    instance = {
        setConfig: setConfig,
        getTextSourceBuffer: getTextSourceBuffer,
        getAllTracksAreDisabled: getAllTracksAreDisabled,
        addEmbeddedTrack: addEmbeddedTrack,
        setTextTrack: setTextTrack,
        getCurrentTrackIdx: getCurrentTrackIdx,
        reset: reset
    };
    setup();
    return instance;
}

TextController.__dashjs_factory_name = 'TextController';
export default FactoryMaker.getSingletonFactory(TextController);
