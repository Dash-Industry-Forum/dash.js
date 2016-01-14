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
import TextTrackInfo from './vo/TextTrackInfo.js';
import FragmentExtensions from '../dash/extensions/FragmentExtensions.js';
import BoxParser from './utils/BoxParser.js';
import CustomTimeRanges from './utils/CustomTimeRanges.js';
import FactoryMaker from '../core/FactoryMaker.js';

function TextSourceBuffer() {

    let context = this.context;

    let instance,
        errHandler,
        adapter,
        manifestExt,
        mediaController,
        allTracksAreDisabled,
        parser,
        VTTParser,
        TTMLParser,
        fragmentExt,
        mediaInfos,
        textTrackExtensions,
        isFragmented,
        fragmentModel,
        initializationSegmentReceived,
        timescale,
        allTracks,
        videoModel,
        streamController,
        firstSubtitleStart;

    function initialize(type, bufferController) {
        allTracksAreDisabled = false;
        parser = null;
        fragmentExt = null;
        fragmentModel = null;
        initializationSegmentReceived = false;
        timescale = NaN;
        allTracks = null;
        firstSubtitleStart = null;

        let streamProcessor = bufferController.getStreamProcessor();

        mediaInfos = streamProcessor.getMediaInfoArr();
        textTrackExtensions.setConfig({videoModel: videoModel});
        textTrackExtensions.initialize();
        isFragmented = !manifestExt.getIsTextTrack(type);

        if (isFragmented) {
            fragmentExt = FragmentExtensions(context).getInstance();
            fragmentExt.setConfig({boxParser: BoxParser(context).getInstance()});
            fragmentModel = streamProcessor.getFragmentModel();
            this.buffered =  CustomTimeRanges(context).create();
        }
    }

    function append(bytes, chunk) {
        var result,
            samplesInfo,
            i,
            ccContent;
        var mediaInfo = chunk.mediaInfo;
        var mediaType = mediaInfo.type;
        var mimeType = mediaInfo.mimeType;

        function createTextTrackFromMediaInfo(captionData, mediaInfo) {
            var textTrackInfo = new TextTrackInfo();
            var trackKindMap = { subtitle: 'subtitles', caption: 'captions' }; //Dash Spec has no "s" on end of KIND but HTML needs plural.
            var getKind = function () {
                var kind = (mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;
                kind = (kind === trackKindMap.caption || kind === trackKindMap.subtitle) ? kind : trackKindMap.caption;
                return kind;
            };

            var checkTTML = function () {
                var ttml = false;
                if (mediaInfo.codec && mediaInfo.codec.search('stpp') >= 0) {
                    ttml = true;
                }
                if (mediaInfo.mimeType && mediaInfo.mimeType.search('ttml') >= 0) {
                    ttml = true;
                }
                return ttml;
            };

            textTrackInfo.captionData = captionData;
            textTrackInfo.lang = mediaInfo.lang;
            textTrackInfo.label = mediaInfo.id; // AdaptationSet id (an unsigned int)
            textTrackInfo.index = mediaInfo.index; // AdaptationSet index in manifest
            textTrackInfo.isTTML = checkTTML();
            textTrackInfo.video = videoModel.getElement();
            textTrackInfo.defaultTrack = getIsDefault(mediaInfo);
            textTrackInfo.isFragmented = isFragmented;
            textTrackInfo.kind = getKind();
            textTrackExtensions.addTextTrack(textTrackInfo, mediaInfos.length);
        }

        if (mediaType === 'fragmentedText') {
            if (!initializationSegmentReceived) {
                initializationSegmentReceived = true;
                for (i = 0; i < mediaInfos.length; i++) {
                    createTextTrackFromMediaInfo(null, mediaInfos[i]);
                }
                timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
            }else {
                samplesInfo = fragmentExt.getSamplesInfo(bytes);
                for (i = 0 ; i < samplesInfo.length ; i++) {
                    if (!firstSubtitleStart) {
                        firstSubtitleStart = samplesInfo[0].cts - chunk.start * timescale;
                    }
                    samplesInfo[i].cts -= firstSubtitleStart;
                    this.buffered.add(samplesInfo[i].cts / timescale,(samplesInfo[i].cts + samplesInfo[i].duration) / timescale);
                    ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(samplesInfo[i].offset, samplesInfo[i].offset + samplesInfo[i].size)));
                    parser = parser !== null ? parser : getParser(mimeType);
                    try {
                        result = parser.parse(ccContent);
                        textTrackExtensions.addCaptions(firstSubtitleStart / timescale,result);
                    } catch (e) {
                        //empty cue ?
                    }
                }
            }
        }else {
            bytes = new Uint8Array(bytes);
            ccContent = window.UTF8.decode(bytes);
            try {
                result = getParser(mimeType).parse(ccContent);
                createTextTrackFromMediaInfo(result, mediaInfo);
            } catch (e) {
                errHandler.timedTextError(e, 'parse', ccContent);
            }
        }
    }

    function abort() {
        textTrackExtensions.deleteAllTextTracks();
        allTracksAreDisabled = false;
        parser = null;
        fragmentExt = null;
        mediaInfos = null;
        textTrackExtensions = null;
        isFragmented = false;
        fragmentModel = null;
        initializationSegmentReceived = false;
        timescale = NaN;
        allTracks = null;
        videoModel = null;
        streamController = null;
    }

    function getAllTracksAreDisabled() {
        return allTracksAreDisabled;
    }

    function setConfig(config) {
        if (!config) return;

        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestExt) {
            manifestExt = config.manifestExt;
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
        if (config.textTrackExtensions) {
            textTrackExtensions = config.textTrackExtensions;
        }
        if (config.VTTParser) {
            VTTParser = config.VTTParser;
        }
        if (config.TTMLParser) {
            TTMLParser = config.TTMLParser;
        }
    }

    function setTextTrack() {

        var el = videoModel.getElement();
        var tracks = el.textTracks;
        var ln = tracks.length;

        if (!allTracks) {
            allTracks = mediaController.getTracksFor('fragmentedText', streamController.getActiveStreamInfo());
        }

        for (var i = 0; i < ln; i++ ) {
            var track = tracks[i];
            allTracksAreDisabled = track.mode !== 'showing';
            if (track.mode === 'showing') {
                if (textTrackExtensions.getCurrentTrackIdx() !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                    textTrackExtensions.setCurrentTrackIdx(i);
                    if (isFragmented) {
                        if (!mediaController.isCurrentTrack(allTracks[i])) {
                            fragmentModel.abortRequests();
                            textTrackExtensions.deleteTrackCues(textTrackExtensions.getCurrentTextTrack());
                            mediaController.setTrack(allTracks[i]);
                        }
                    }
                }
                break;
            }
        }

        if (allTracksAreDisabled) {
            textTrackExtensions.setCurrentTrackIdx(-1);
        }
    }

    function getIsDefault(mediaInfo) {
        //TODO How to tag default. currently same order as listed in manifest.
        // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
        // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
        return mediaInfo.index === mediaInfos[0].index;
    }

    function getParser(mimeType) {
        var parser;
        if (mimeType === 'text/vtt') {
            parser = VTTParser;
        } else if (mimeType === 'application/ttml+xml' || mimeType === 'application/mp4') {
            parser = TTMLParser;
            parser.setConfig({videoModel: videoModel});
        }
        return parser;
    }

    instance = {
        initialize: initialize,
        append: append,
        abort: abort,
        getAllTracksAreDisabled: getAllTracksAreDisabled,
        setTextTrack: setTextTrack,
        setConfig: setConfig
    };

    return instance;
}
TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getSingletonFactory(TextSourceBuffer);