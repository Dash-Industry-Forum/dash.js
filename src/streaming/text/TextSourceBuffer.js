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
import TextTrackInfo from '../vo/TextTrackInfo';
import FragmentedTextBoxParser from '../../dash/utils/FragmentedTextBoxParser';
import BoxParser from '../utils/BoxParser';
import CustomTimeRanges from '../utils/CustomTimeRanges';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import VideoModel from '../models/VideoModel';
import TextTracks from './TextTracks';
import EmbeddedTextHtmlRender from './EmbeddedTextHtmlRender';
import ISOBoxer from 'codem-isoboxer';
import cea608parser from '../../../externals/cea608-parser';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';

function TextSourceBuffer() {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    const eventBus = EventBus(context).getInstance();
    let embeddedInitialized = false;

    let instance,
        boxParser,
        errHandler,
        dashManifestModel,
        mediaController,
        parser,
        vttParser,
        ttmlParser,
        fragmentedTextBoxParser,
        mediaInfos,
        textTracks,
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
        embeddedTimescale,
        embeddedLastSequenceNumber,
        embeddedSequenceNumbers,
        embeddedCea608FieldParsers,
        embeddedTextHtmlRender;

    function initialize(type, bufferController) {
        parser = null;
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
        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();
        isFragmented = !dashManifestModel.getIsTextTrack(type);
        boxParser = BoxParser(context).getInstance();
        fragmentedTextBoxParser = FragmentedTextBoxParser(context).getInstance();
        fragmentedTextBoxParser.setConfig({
            boxParser: boxParser
        });

        if (isFragmented) {
            fragmentModel = streamProcessor.getFragmentModel();
            this.buffered = CustomTimeRanges(context).create();
            fragmentedTracks = mediaController.getTracksFor('fragmentedText', streamController.getActiveStreamInfo());
            var currFragTrack = mediaController.getCurrentTrackFor('fragmentedText', streamController.getActiveStreamInfo());
            for (var i = 0; i < fragmentedTracks.length; i++) {
                if (fragmentedTracks[i] === currFragTrack) {
                    currFragmentedTrackIdx = i;
                    break;
                }
            }
        }
    }

    function abort() {
        textTracks.deleteAllTextTracks();
        parser = null;
        fragmentedTextBoxParser = null;
        mediaInfos = null;
        textTracks = null;
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


    function onVideoChunkReceived(e) {
        const chunk = e.chunk;

        if (chunk.mediaInfo.embeddedCaptions) {
            append(chunk.bytes, chunk);
        }
    }

    function initEmbedded() {
        embeddedTracks = [];
        mediaInfos = [];
        videoModel = VideoModel(context).getInstance();
        textTracks = TextTracks(context).getInstance();
        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();
        boxParser = BoxParser(context).getInstance();
        fragmentedTextBoxParser = FragmentedTextBoxParser(context).getInstance();
        fragmentedTextBoxParser.setConfig({
            boxParser: boxParser
        });
        isFragmented = false;
        currFragmentedTrackIdx = null;
        embeddedInitializationSegmentReceived = false;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
        embeddedInitialized = true;
        embeddedTextHtmlRender = EmbeddedTextHtmlRender(context).getInstance();

        eventBus.on(Events.VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
    }

    function resetEmbedded() {
        eventBus.off(Events.VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
        if (textTracks !== null) {
            textTracks.deleteAllTextTracks();
        }
        embeddedInitialized = false;
        embeddedTracks = [];
        embeddedCea608FieldParsers = [null, null];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
    }

    function addEmbeddedTrack(mediaInfo) {
        if (!embeddedInitialized) {
            initEmbedded();
        }
        if (mediaInfo.id === 'CC1' || mediaInfo.id === 'CC3') {
            embeddedTracks.push(mediaInfo);
        } else {
            log('Warning: Embedded track ' + mediaInfo.id + ' not supported!');
        }
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
    }

    function getConfig() {
        var config = {
            errHandler: errHandler,
            dashManifestModel: dashManifestModel,
            mediaController: mediaController,
            videoModel: videoModel,
            fragmentModel: fragmentModel,
            streamController: streamController,
            textTracks: textTracks,
            isFragmented: isFragmented,
            embeddedTracks: embeddedTracks,
            fragmentedTracks: fragmentedTracks
        };

        return config;
    }

    function setCurrentFragmentedTrackIdx(idx) {
        currFragmentedTrackIdx = idx;
    }

    function append(bytes, chunk) {
        var result,
            sampleList,
            i, j, k,
            samplesInfo,
            ccContent;
        var mediaInfo = chunk.mediaInfo;
        var mediaType = mediaInfo.type;
        var mimeType = mediaInfo.mimeType;
        var codecType = mediaInfo.codec || mimeType;
        if (!codecType) {
            log('No text type defined');
            return;
        }

        function createTextTrackFromMediaInfo(captionData, mediaInfo) {
            var textTrackInfo = new TextTrackInfo();
            var trackKindMap = {
                subtitle: 'subtitles',
                caption: 'captions'
            }; //Dash Spec has no "s" on end of KIND but HTML needs plural.
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
            textTrackInfo.roles = mediaInfo.roles;
            var totalNrTracks = (mediaInfos ? mediaInfos.length : 0) + embeddedTracks.length;
            textTracks.addTextTrack(textTrackInfo, totalNrTracks);
        }

        if (mediaType === 'fragmentedText') {
            if (!initializationSegmentReceived) {
                initializationSegmentReceived = true;
                for (i = 0; i < mediaInfos.length; i++) {
                    createTextTrackFromMediaInfo(null, mediaInfos[i]);
                }
                timescale = fragmentedTextBoxParser.getMediaTimescaleFromMoov(bytes);
            } else {
                samplesInfo = fragmentedTextBoxParser.getSamplesInfo(bytes);
                sampleList = samplesInfo.sampleList;
                if (!firstSubtitleStart && sampleList.length > 0) {
                    firstSubtitleStart = sampleList[0].cts - chunk.start * timescale;
                }
                if (codecType.search('stpp') >= 0) {
                    parser = parser !== null ? parser : getParser(codecType);
                    for (i = 0; i < sampleList.length; i++) {
                        let sample = sampleList[i];
                        let sampleStart = sample.cts;
                        let sampleRelStart = sampleStart - firstSubtitleStart;
                        this.buffered.add(sampleRelStart / timescale, (sampleRelStart + sample.duration) / timescale);
                        let dataView = new DataView(bytes, sample.offset, sample.subSizes[0]);
                        ccContent = ISOBoxer.Utils.dataViewToString(dataView, 'utf-8');
                        let images = [];
                        let subOffset = sample.offset + sample.subSizes[0];
                        for (j = 1; j < sample.subSizes.length; j++) {
                            let inData = new Uint8Array(bytes, subOffset, sample.subSizes[j]);
                            let raw = String.fromCharCode.apply(null, inData);
                            images.push(raw);
                            subOffset += sample.subSizes[j];
                        }
                        try {
                            result = parser.parse(ccContent, sampleStart / timescale, (sampleStart + sample.duration) / timescale, images);
                            textTracks.addCaptions(currFragmentedTrackIdx, firstSubtitleStart / timescale, result);
                        } catch (e) {
                            log('TTML parser error: ' + e.message);
                        }
                    }
                } else {
                    // WebVTT case
                    var captionArray = [];
                    for (i = 0; i < sampleList.length; i++) {
                        var sample = sampleList[i];
                        sample.cts -= firstSubtitleStart;
                        this.buffered.add(sample.cts / timescale, (sample.cts + sample.duration) / timescale);
                        var sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
                        // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
                        var sampleBoxes = ISOBoxer.parseBuffer(sampleData);

                        for (j = 0; j < sampleBoxes.boxes.length; j++) {
                            var box1 = sampleBoxes.boxes[j];
                            log('VTT box1: ' + box1.type);
                            if (box1.type === 'vtte') {
                                continue; //Empty box
                            }
                            if (box1.type === 'vttc') {
                                log('VTT vttc boxes.length = ' + box1.boxes.length);
                                for (k = 0; k < box1.boxes.length; k++) {
                                    var box2 = box1.boxes[k];
                                    log('VTT box2: ' + box2.type);
                                    if (box2.type === 'payl') {
                                        var cue_text = box2.cue_text;
                                        log('VTT cue_text = ' + cue_text);
                                        var start_time = sample.cts / timescale;
                                        var end_time = (sample.cts + sample.duration) / timescale;
                                        captionArray.push({
                                            start: start_time,
                                            end: end_time,
                                            data: cue_text,
                                            styles: {}
                                        });
                                        log('VTT ' + start_time + '-' + end_time + ' : ' + cue_text);
                                    }
                                }
                            }
                        }
                    }
                    if (captionArray.length > 0) {
                        textTracks.addCaptions(currFragmentedTrackIdx, 0, captionArray);
                    }
                }
            }
        } else if (mediaType === 'text') {
            let dataView = new DataView(bytes, 0, bytes.byteLength);
            ccContent = ISOBoxer.Utils.dataViewToString(dataView, 'utf-8');

            try {
                result = getParser(codecType).parse(ccContent);
                createTextTrackFromMediaInfo(result, mediaInfo);
            } catch (e) {
                errHandler.timedTextError(e, 'parse', ccContent);
            }
        } else if (mediaType === 'video') { //embedded text
            if (chunk.segmentType === 'InitializationSegment') {
                if (embeddedTimescale === 0) {
                    embeddedTimescale = fragmentedTextBoxParser.getMediaTimescaleFromMoov(bytes);
                    for (i = 0; i < embeddedTracks.length; i++) {
                        createTextTrackFromMediaInfo(null, embeddedTracks[i]);
                    }
                }
            } else { // MediaSegment
                if (embeddedTimescale === 0) {
                    log('CEA-608: No timescale for embeddedTextTrack yet');
                    return;
                }
                var makeCueAdderForIndex = function (self, trackIndex) {
                    function newCue(startTime, endTime, captionScreen) {
                        var captionsArray = null;
                        if (videoModel.getTTMLRenderingDiv()) {
                            captionsArray = embeddedTextHtmlRender.createHTMLCaptionsFromScreen(videoModel.getElement(), startTime, endTime, captionScreen);
                        } else {
                            var text = captionScreen.getDisplayText();
                            //log("CEA text: " + startTime + "-" + endTime + "  '" + text + "'");
                            captionsArray = [{
                                start: startTime,
                                end: endTime,
                                data: text,
                                styles: {}
                            }];
                        }
                        if (captionsArray) {
                            textTracks.addCaptions(trackIndex, 0, captionsArray);
                        }
                    }
                    return newCue;
                };


                samplesInfo = fragmentedTextBoxParser.getSamplesInfo(bytes);
                var sequenceNumber = samplesInfo.sequenceNumber;

                if (!embeddedCea608FieldParsers[0] && !embeddedCea608FieldParsers[1]) {
                    // Time to setup the CEA-608 parsing
                    let field, handler, trackIdx;
                    for (i = 0; i < embeddedTracks.length; i++) {
                        if (embeddedTracks[i].id === 'CC1') {
                            field = 0;
                            trackIdx = textTracks.getTrackIdxForId('CC1');
                        } else if (embeddedTracks[i].id === 'CC3') {
                            field = 1;
                            trackIdx = textTracks.getTrackIdxForId('CC3');
                        }
                        if (trackIdx === -1) {
                            log('CEA-608: data before track is ready.');
                            return;
                        }
                        handler = makeCueAdderForIndex(this, trackIdx);
                        embeddedCea608FieldParsers[i] = new cea608parser.Cea608Parser(i, {
                            'newCue': handler
                        }, null);
                    }
                }

                if (embeddedTimescale && embeddedSequenceNumbers.indexOf(sequenceNumber) == -1) {
                    if (embeddedLastSequenceNumber !== null && sequenceNumber !== embeddedLastSequenceNumber + 1) {
                        for (i = 0; i < embeddedCea608FieldParsers.length; i++) {
                            if (embeddedCea608FieldParsers[i]) {
                                embeddedCea608FieldParsers[i].reset();
                            }
                        }
                    }
                    var allCcData = extractCea608Data(bytes);

                    for (var fieldNr = 0; fieldNr < embeddedCea608FieldParsers.length; fieldNr++) {
                        var ccData = allCcData.fields[fieldNr];
                        var fieldParser = embeddedCea608FieldParsers[fieldNr];
                        if (fieldParser) {
                            /*if (ccData.length > 0 ) {
                                log("CEA-608 adding Data to field " + fieldNr + " " + ccData.length + "bytes");
                            }*/
                            for (i = 0; i < ccData.length; i++) {
                                fieldParser.addData(ccData[i][0] / embeddedTimescale, ccData[i][1]);
                            }
                            if (allCcData.endTime) {
                                fieldParser.cueSplitAtTime(allCcData.endTime / embeddedTimescale);
                            }
                        }
                    }
                    embeddedLastSequenceNumber = sequenceNumber;
                    embeddedSequenceNumbers.push(sequenceNumber);
                }
            }
        }
    }
    /**
     * Extract CEA-608 data from a buffer of data.
     * @param {ArrayBuffer} data
     * @returns {Object|null} ccData corresponding to one segment.
     */
    function extractCea608Data(data) {

        var isoFile = boxParser.parse(data);
        var moof = isoFile.getBox('moof');
        var tfdt = isoFile.getBox('tfdt');
        var tfhd = isoFile.getBox('tfhd'); //Can have a base_data_offset and other default values
        //log("tfhd: " + tfhd);
        //var saio = isoFile.getBox('saio'); // Offset possibly
        //var saiz = isoFile.getBox('saiz'); // Possible sizes
        var truns = isoFile.getBoxes('trun'); //
        var trun = null;

        if (truns.length === 0) {
            return null;
        }
        trun = truns[0];
        if (truns.length > 1) {
            log('Warning: Too many truns');
        }
        var baseOffset = moof.offset + trun.data_offset;
        //Doublecheck that trun.offset == moof.size + 8
        var sampleCount = trun.sample_count;
        var startPos = baseOffset;
        var baseSampleTime = tfdt.baseMediaDecodeTime;
        var raw = new DataView(data);
        var allCcData = {
            'startTime': null,
            'endTime': null,
            fields: [[], []]
        };
        var accDuration = 0;
        for (var i = 0; i < sampleCount; i++) {
            var sample = trun.samples[i];
            if (sample.sample_duration === undefined) {
                sample.sample_duration = tfhd.default_sample_duration;
            }
            if (sample.sample_size === undefined) {
                sample.sample_size = tfhd.default_sample_size;
            }
            if (sample.sample_composition_time_offset === undefined) {
                sample.sample_composition_time_offset = 0;
            }
            var sampleTime = baseSampleTime + accDuration + sample.sample_composition_time_offset;
            var cea608Ranges = cea608parser.findCea608Nalus(raw, startPos, sample.sample_size);
            for (var j = 0; j < cea608Ranges.length; j++) {
                var ccData = cea608parser.extractCea608DataFromRange(raw, cea608Ranges[j]);
                for (var k = 0; k < 2; k++) {
                    if (ccData[k].length > 0) {
                        allCcData.fields[k].push([sampleTime, ccData[k]]);
                    }
                }
            }

            accDuration += sample.sample_duration;
            startPos += sample.sample_size;
        }

        // Sort by sampleTime ascending order
        allCcData.fields[0].sort(function (a, b) {
            return a[0] - b[0];
        });
        allCcData.fields[1].sort(function (a, b) {
            return a[0] - b[0];
        });

        var endSampleTime = baseSampleTime + accDuration;
        allCcData.startTime = baseSampleTime;
        allCcData.endTime = endSampleTime;
        return allCcData;
    }

    function getIsDefault(mediaInfo) {
        //TODO How to tag default. currently same order as listed in manifest.
        // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
        // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
        var isDefault = false;
        if (embeddedTracks.length > 1 && mediaInfo.isEmbedded) {
            isDefault = (mediaInfo.id && mediaInfo.id === 'CC1'); // CC1 if both CC1 and CC3 exist
        } else if (embeddedTracks.length === 1) {
            if (mediaInfo.id && mediaInfo.id.substring(0, 2) === 'CC') { // Either CC1 or CC3
                isDefault = true;
            }
        } else if (embeddedTracks.length === 0) {
            isDefault = (mediaInfo.index === mediaInfos[0].index);
        }
        return isDefault;
    }

    function getParser(codecType) {
        var parser;
        if (codecType.search('vtt') >= 0) {
            parser = vttParser;
        } else if (codecType.search('ttml') >= 0 || codecType.search('stpp') >= 0) {
            parser = ttmlParser;
            parser.setConfig({
                videoModel: videoModel
            });
        }
        return parser;
    }

    instance = {
        initialize: initialize,
        append: append,
        abort: abort,
        addEmbeddedTrack: addEmbeddedTrack,
        resetEmbedded: resetEmbedded,
        setConfig: setConfig,
        getConfig: getConfig,
        setCurrentFragmentedTrackIdx: setCurrentFragmentedTrackIdx
    };

    return instance;
}

TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getSingletonFactory(TextSourceBuffer);
