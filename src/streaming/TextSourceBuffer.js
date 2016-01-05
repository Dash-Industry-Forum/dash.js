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
import Debug from '../core/Debug.js';
import VideoModel from './models/VideoModel.js';
import TextTrackExtensions from './extensions/TextTrackExtensions.js';

function TextSourceBuffer() {

    let context = this.context;    
    let log = Debug(context).getInstance().log;
    let embeddedInitialized = false;

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
        fragmentedTracks,
        videoModel,
        streamController,
        firstSubtitleStart,
        currFragmentedTrackIdx,
        embeddedTracks,
        embeddedInitializationSegmentReceived,
        embeddedTimescale;

    function initialize(type, bufferController) {
        log("TOBBE: TextSourceBuffer: initialize");
        allTracksAreDisabled = false;
        parser = null;
        fragmentExt = null;
        fragmentModel = null;
        initializationSegmentReceived = false;
        timescale = NaN;
        fragmentedTracks = [];
        firstSubtitleStart = null;
        
        if (!embeddedInitialized) {
            initEmbedded();
        }

        let streamProcessor = bufferController.getStreamProcessor();

        mediaInfos = streamProcessor.getMediaInfoArr();
        textTrackExtensions.setConfig({videoModel: videoModel});
        textTrackExtensions.initialize();
        isFragmented = !manifestExt.getIsTextTrack(type);
        fragmentExt = FragmentExtensions(context).getInstance();
        fragmentExt.setConfig({boxParser: BoxParser(context).getInstance()});
        if (isFragmented) {
            fragmentModel = streamProcessor.getFragmentModel();
            this.buffered =  CustomTimeRanges(context).create();
            fragmentedTracks = mediaController.getTracksFor("fragmentedText", streamController.getActiveStreamInfo());
            var currFragTrack = mediaController.getCurrentTrackFor("fragmentedText", streamController.getActiveStreamInfo());
            for (var i = 0 ; i < fragmentedTracks.length; i++) {
               if (fragmentedTracks[i] === currFragTrack) {
                   currFragmentedTrackIdx = i;
                   break;
               }
            }
        }
    }
    
    function initEmbedded() {
        log("TOBBE initEmbedded");
        embeddedTracks = [];
        mediaInfos = [];
        videoModel = VideoModel(context).getInstance();
        textTrackExtensions = TextTrackExtensions(context).getInstance();
        textTrackExtensions.setConfig({videoModel: videoModel});
        textTrackExtensions.initialize();
        fragmentExt = FragmentExtensions(context).getInstance();
        fragmentExt.setConfig({boxParser: BoxParser(context).getInstance()});
        isFragmented = false;
        currFragmentedTrackIdx = null;
        embeddedInitializationSegmentReceived = false;
        embeddedTimescale = 0;
        embeddedInitialized = true;
    }

    function append(bytes, chunk) {
        log("TOBBE TextSourceBuffer:append()");
        var result,
            sampleList,
            i,
            ccContent;
        var mediaInfo = chunk.mediaInfo;
        var mediaType = mediaInfo.type;
        var mimeType = mediaInfo.mimeType;

        function createTextTrackFromMediaInfo(captionData, mediaInfo) {
            log("TOBBE createTextTrackFromMediaInfo");
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
            textTrackInfo.isEmbedded = mediaInfo.isEmbedded ? true : false;
            textTrackInfo.kind = getKind();
            log("TOBBE: Adding " + mediaInfo.id);
            var totalNrTracks = (mediaInfos ? mediaInfos.length : 0) + embeddedTracks.length;
            textTrackExtensions.addTextTrack(textTrackInfo, totalNrTracks);
        }

        if (mediaType === 'fragmentedText') {
            if (!initializationSegmentReceived) {
                initializationSegmentReceived = true;
                for (i = 0; i < mediaInfos.length; i++) {
                    createTextTrackFromMediaInfo(null, mediaInfos[i]);
                }
                timescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
            } else {
                var samplesInfo = fragmentExt.getSamplesInfo(bytes);
                sampleList = samplesInfo.sampleList;
                for (i = 0 ; i < sampleList.length ; i++) {
                    if (!firstSubtitleStart) {
                        firstSubtitleStart = sampleList[0].cts - chunk.start * timescale;
                    }
                    sampleList[i].cts -= firstSubtitleStart;
                    this.buffered.add(sampleList[i].cts / timescale,(sampleList[i].cts + sampleList[i].duration) / timescale);
                    ccContent = window.UTF8.decode(new Uint8Array(bytes.slice(sampleList[i].offset, sampleList[i].offset + sampleList[i].size)));
                    parser = parser !== null ? parser : getParser(mimeType);
                    try {
                        result = parser.parse(ccContent);
                        textTrackExtensions.addCaptions(currFragmentedTrackIdx, firstSubtitleStart / timescale, result);
                    } catch (e) {
                        //empty cue ?
                    }
                }
            }
        } else if (mediaType === 'text') {
            bytes = new Uint8Array(bytes);
            ccContent = window.UTF8.decode(bytes);
            try {
                result = getParser(mimeType).parse(ccContent);
                createTextTrackFromMediaInfo(result, mediaInfo);
            } catch (e) {
                errHandler.timedTextError(e, 'parse', ccContent);
            }
        } else if (mediaType === 'video') { //embedded text
            if (chunk.segmentType === "Initialization Segment") {
                if (embeddedTimescale === 0) {
                    embeddedTimescale = fragmentExt.getMediaTimescaleFromMoov(bytes);
                    for (i = 0 ; i < embeddedTracks.length ; i++) {
                        createTextTrackFromMediaInfo(null, embeddedTracks[i]);
                    }
                }
            } else { // MediaSegment
                if (embeddedTimescale === 0) {
                    log("CEA-608: No timescale for embeddedTextTrack yet");
                    return;
                }
                log("TOBBE: Media segment");
            } 
        } else {
            log("Warning: Non-supported text type: " + mediaType);
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
        fragmentedTracks = [];
        videoModel = null;
        streamController = null;
        embeddedInitialized = false;
        embeddedTracks = null;
    }
    
    function addEmbeddedTrack(mediaInfo) {
        log("TOBBE added embedded " + mediaInfo.id);
        if (!embeddedInitialized) {
            initEmbedded();
        }
        if (mediaInfo.id === "CC1" || mediaInfo.id === "CC3") {
            embeddedTracks.push(mediaInfo);
        } else {
            log("Warning: Embedded track " + mediaInfo.id + " not supported!");
        }
    }
    
    function resetEmbedded() {
        log("TOBBE: resetEmbedded");
        embeddedInitialized = false;
        embeddedTracks = [];
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
        var nrNonEmbeddedTracks = ln - embeddedTracks.length;
        var oldTrackIdx = textTrackExtensions.getCurrentTrackIdx();

        for (var i = 0; i < ln; i++ ) {
            var track = tracks[i];
            allTracksAreDisabled = track.mode !== 'showing';
            if (track.mode === 'showing') {
                if (oldTrackIdx !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                    textTrackExtensions.setCurrentTrackIdx(i);
                    textTrackExtensions.addCaptions(i, 0, null); // Make sure that previously queued captions are added as cues
                    if (isFragmented && i < nrNonEmbeddedTracks) {
                        var currentFragTrack = mediaController.getCurrentTrackFor("fragmentedText", streamController.getActiveStreamInfo());
                        var newFragTrack = fragmentedTracks[i];
                        if (newFragTrack !== currentFragTrack) {
                            fragmentModel.abortRequests();
                            textTrackExtensions.deleteTrackCues(currentFragTrack);
                            mediaController.setTrack(newFragTrack);
                            currFragmentedTrackIdx = i;
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
        var isDefault = false;
        if (embeddedTracks.length > 1) {
            isDefault = (mediaInfo.id && mediaInfo.id === "CC1"); // CC1 if both CC1 and CC3 exist
        } else if (embeddedTracks.length === 1) {
            if (mediaInfo.id && mediaInfo.id.substring(0, 2) === "CC") {// Either CC1 or CC3
                isDefault = true;
            }
        } else {
            isDefault = (mediaInfo.index === mediaInfos[0].index);
        }
        return isDefault;
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
        setConfig: setConfig,
        addEmbeddedTrack: addEmbeddedTrack,
        resetEmbedded: resetEmbedded
    };

    return instance;
}
TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getSingletonFactory(TextSourceBuffer);