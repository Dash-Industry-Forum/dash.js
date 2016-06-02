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
import TextTrackInfo from './vo/TextTrackInfo';
import FragmentedTextBoxParser from '../dash/utils/FragmentedTextBoxParser';
import BoxParser from './utils/BoxParser';
import CustomTimeRanges from './utils/CustomTimeRanges';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import VideoModel from './models/VideoModel';
import TextTracks from './TextTracks';
import ISOBoxer from 'codem-isoboxer';
import cea608parser from '../../externals/cea608-parser';

function TextSourceBuffer() {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let embeddedInitialized = false;
    let captionId = 0;

    let instance,
        boxParser,
        errHandler,
        adapter,
        dashManifestModel,
        mediaController,
        allTracksAreDisabled,
        parser,
        VTTParser,
        TTMLParser,
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
        embeddedCea608FieldParsers;

    function initialize(type, bufferController) {
        allTracksAreDisabled = false;
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
        textTracks.setConfig({videoModel: videoModel});
        textTracks.initialize();
        isFragmented = !dashManifestModel.getIsTextTrack(type);
        boxParser = BoxParser(context).getInstance();
        fragmentedTextBoxParser = FragmentedTextBoxParser(context).getInstance();
        fragmentedTextBoxParser.setConfig({boxParser: boxParser});

        if (isFragmented) {
            fragmentModel = streamProcessor.getFragmentModel();
            this.buffered =  CustomTimeRanges(context).create();
            fragmentedTracks = mediaController.getTracksFor('fragmentedText', streamController.getActiveStreamInfo());
            var currFragTrack = mediaController.getCurrentTrackFor('fragmentedText', streamController.getActiveStreamInfo());
            for (var i = 0 ; i < fragmentedTracks.length; i++) {
                if (fragmentedTracks[i] === currFragTrack) {
                    currFragmentedTrackIdx = i;
                    break;
                }
            }
        }
    }

    function initEmbedded() {
        embeddedTracks = [];
        mediaInfos = [];
        videoModel = VideoModel(context).getInstance();
        textTracks = TextTracks(context).getInstance();
        textTracks.setConfig({videoModel: videoModel});
        textTracks.initialize();
        boxParser = BoxParser(context).getInstance();
        fragmentedTextBoxParser = FragmentedTextBoxParser(context).getInstance();
        fragmentedTextBoxParser.setConfig({boxParser: boxParser});
        isFragmented = false;
        currFragmentedTrackIdx = null;
        embeddedInitializationSegmentReceived = false;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
        embeddedInitialized = true;
    }

    function append(bytes, chunk) {
        var result,
            sampleList,
            i,
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
                        let dataView = new DataView(bytes, sample.offset, sample.size);
                        ccContent = ISOBoxer.Utils.dataViewToString(dataView, 'utf-8');
                        try {
                            result = parser.parse(ccContent, sampleStart / timescale, (sampleStart + sample.duration) / timescale);
                            textTracks.addCaptions(currFragmentedTrackIdx, firstSubtitleStart / timescale, result);
                        } catch (e) {
                            log('TTML parser error: ' + e.message);
                        }
                    }
                } else {
                    // WebVTT case
                    var captionArray = [];
                    for (i = 0 ; i < sampleList.length; i++) {
                        var sample = sampleList[i];
                        sample.cts -= firstSubtitleStart;
                        this.buffered.add(sample.cts / timescale, (sample.cts + sample.duration) / timescale);
                        var sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
                        // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
                        var sampleBoxes = ISOBoxer.parseBuffer(sampleData);

                        for (var j = 0 ; j < sampleBoxes.boxes.length; j++) {
                            var box1 = sampleBoxes.boxes[j];
                            log('VTT box1: ' + box1.type);
                            if (box1.type === 'vtte') {
                                continue; //Empty box
                            }
                            if (box1.type === 'vttc') {
                                log('VTT vttc boxes.length = ' + box1.boxes.length);
                                for (var k = 0 ; k < box1.boxes.length; k++) {
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
                            captionsArray = createHTMLCaptionsFromScreen(videoModel.getElement(), startTime, endTime, captionScreen);
                        } else {
                            var text = captionScreen.getDisplayText();
                            //log("CEA text: " + startTime + "-" + endTime + "  '" + text + "'");
                            captionsArray = [{ start: startTime, end: endTime, data: text, styles: {} }];
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
                        embeddedCea608FieldParsers[i] = new cea608parser.Cea608Parser(i, { 'newCue': handler }, null);
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

        /* Insert [time, data] pairs in order into array. */
        var insertInOrder = function (arr, time, data) {
            var len = arr.length;
            if (len > 0) {
                if (time >= arr[len - 1][0]) {
                    arr.push([time, data]);
                } else {
                    for (var pos = len - 1; pos >= 0; pos--) {
                        if (time < arr[pos][0]) {
                            arr.splice(pos, 0, [time, data]);
                            break;
                        }
                    }
                }
            } else {
                arr.push([time, data]);
            }
        };

        var isoFile = boxParser.parse(data);
        var moof = isoFile.getBox('moof');
        var tfdt = isoFile.getBox('tfdt');
        //var tfhd = isoFile.getBox('tfhd'); //Can have a base_data_offset and other default values
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
        var allCcData = { 'startTime': null, 'endTime': null, fields: [[], []] };
        var accDuration = 0;
        for (var i = 0; i < sampleCount; i++) {
            var sample = trun.samples[i];
            var sampleTime = baseSampleTime + accDuration + sample.sample_composition_time_offset;
            var cea608Ranges = cea608parser.findCea608Nalus(raw, startPos, sample.sample_size);
            for (var j = 0; j < cea608Ranges.length; j++) {
                var ccData = cea608parser.extractCea608DataFromRange(raw, cea608Ranges[j]);
                for (var k = 0; k < 2; k++) {
                    if (ccData[k].length > 0) {
                        insertInOrder(allCcData.fields[k], sampleTime, ccData[k]);
                    }
                }
            }

            accDuration += sample.sample_duration;
            startPos += sample.sample_size;
        }
        var endSampleTime = baseSampleTime + accDuration;
        allCcData.startTime = baseSampleTime;
        allCcData.endTime = endSampleTime;
        return allCcData;
    }

    /* HTML Rendering functions */
    function checkIndent(chars) {
        var line = '';

        for (var c = 0; c < chars.length; ++c) {
            var uc = chars[c];
            line += uc.uchar;
        }

        var l = line.length;
        var ll = line.replace(/^\s+/,'').length;
        return l - ll;
    }

    function getRegionProperties(region) {
        return 'left: ' + (region.x * 3.125) + '%; top: ' + (region.y1 * 6.66) + '%; width: ' + (100 - (region.x * 3.125)) + '%; height: ' + (Math.max((region.y2 - 1) - region.y1, 1) * 6.66) + '%; align-items: flex-start; overflow: visible; -webkit-writing-mode: horizontal-tb;';
    }

    function createRGB(color) {
        if (color == 'red') {
            return 'rgb(255, 0, 0)';
        } else if (color == 'green') {
            return 'rgb(0, 255, 0)';
        } else if (color == 'blue') {
            return 'rgb(0, 0, 255)';
        } else if (color == 'cyan') {
            return 'rgb(0, 255, 255)';
        } else if (color == 'magenta') {
            return 'rgb(255, 0, 255)';
        } else if (color == 'yellow') {
            return 'rgb(255, 255, 0)';
        } else if (color == 'white') {
            return 'rgb(255, 255, 255)';
        } else if (color == 'black') {
            return 'rgb(0, 0, 0)';
        }
        return color;
    }

    function getStyle(videoElement, style) {
        var fontSize = videoElement.videoHeight / 15.0;
        if (style) {
            return 'font-size: ' + fontSize + 'px; font-family: Menlo, Consolas, \'Cutive Mono\', monospace; color: ' + ((style.foreground) ? createRGB(style.foreground) : 'rgb(255, 255, 255)') + '; font-style: ' + (style.italics ? 'italic' : 'normal') + '; text-decoration: ' + (style.underline ? 'underline' : 'none') + '; white-space: pre; background-color: ' + ((style.background) ? createRGB(style.background) : 'transparent') + ';';
        } else {
            return 'font-size: ' + fontSize + 'px; font-family: Menlo, Consolas, \'Cutive Mono\', monospace; justify-content: flex-start; text-align: left; color: rgb(255, 255, 255); font-style: normal; white-space: pre; line-height: normal; font-weight: normal; text-decoration: none; width: 100%; display: flex;';
        }
    }

    function ltrim(s) {
        var trimmed = s.replace(/^\s+/g, '');
        return trimmed;
    }
    function rtrim(s) {
        var trimmed = s.replace(/\s+$/g, '');
        return trimmed;
    }


    function createHTMLCaptionsFromScreen(videoElement, startTime, endTime, captionScreen) {

        let currRegion = null;
        let existingRegion = null;
        let lastRowHasText = false;
        let lastRowIndentL = -1;
        let currP = { start: startTime, end: endTime, spans: [] };
        let currentStyle = 'style_cea608_white_black';
        let seenRegions = { };
        let styleStates = { };
        let regions = [];
        let r, s;

        for (r = 0; r < 15; ++r) {
            let row = captionScreen.rows[r];
            let line = '';
            let prevPenState = null;

            if (false === row.isEmpty()) {
                /* Row is not empty */

                /* Get indentation of this row */
                let rowIndent = checkIndent(row.chars);

                /* Create a new region is there is none */
                if (currRegion === null) {
                    currRegion = { x: rowIndent, y1: r, y2: (r + 1), p: [] };
                }

                /* Check if indentation has changed and we had text of last row */
                if ((rowIndent !== lastRowIndentL) && lastRowHasText) {
                    currRegion.p.push(currP);
                    currP = { start: startTime, end: endTime, spans: [] };
                    currRegion.y2 = r;
                    currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
                    if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                        regions.push(currRegion);
                        seenRegions[currRegion.name] = currRegion;
                    } else {
                        existingRegion = seenRegions[currRegion.name];
                        existingRegion.p.contat(currRegion.p);
                    }

                    currRegion = { x: rowIndent, y1: r, y2: (r + 1), p: [] };
                }

                for (let c = 0; c < row.chars.length; ++c) {
                    let uc = row.chars[c];
                    let currPenState = uc.penState;
                    if ((prevPenState === null) || (!currPenState.equals(prevPenState))) {
                        if (line.trim().length > 0) {
                            currP.spans.push({ name: currentStyle, line: line, row: r });
                            line = '';
                        }

                        let currPenStateString = 'style_cea608_' + currPenState.foreground + '_' + currPenState.background;
                        if (currPenState.underline) {
                            currPenStateString += '_underline';
                        }
                        if (currPenState.italics) {
                            currPenStateString += '_italics';
                        }

                        if (!styleStates.hasOwnProperty(currPenStateString)) {
                            styleStates[currPenStateString] = JSON.parse(JSON.stringify(currPenState));
                        }

                        prevPenState = currPenState;

                        currentStyle = currPenStateString;
                    }

                    line += uc.uchar;
                }

                if (line.trim().length > 0) {
                    currP.spans.push({ name: currentStyle, line: line, row: r });
                }

                lastRowHasText = true;
                lastRowIndentL = rowIndent;
            } else {
                /* Row is empty */
                lastRowHasText = false;
                lastRowIndentL = -1;

                if (currRegion) {
                    currRegion.p.push(currP);
                    currP = { start: startTime, end: endTime, spans: [] };
                    currRegion.y2 = r;
                    currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
                    if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                        regions.push(currRegion);
                        seenRegions[currRegion.name] = currRegion;
                    } else {
                        existingRegion = seenRegions[currRegion.name];
                        existingRegion.p.contat(currRegion.p);
                    }

                    currRegion = null;
                }

            }
        }

        if (currRegion) {
            currRegion.p.push(currP);
            currRegion.y2 = r + 1;
            currRegion.name = 'region_' + currRegion.x + '_' + currRegion.y1 + '_' + currRegion.y2;
            if (false === seenRegions.hasOwnProperty(currRegion.name)) {
                regions.push(currRegion);
                seenRegions[currRegion.name] = currRegion;
            } else {
                existingRegion = seenRegions[currRegion.name];
                existingRegion.p.contat(currRegion.p);
            }

            currRegion = null;
        }

        //log(styleStates);
        //log(regions);

        let captionsArray = [];

        /* Loop thru regions */
        for (r = 0; r < regions.length; ++r) {
            let region = regions[r];

            let cueID = 'sub_cea608_' + (captionId++);
            let finalDiv = document.createElement('div');
            finalDiv.id = cueID;
            let cueRegionProperties = getRegionProperties(region);
            finalDiv.style.cssText = 'position: absolute; margin: 0; display: flex; box-sizing: border-box; pointer-events: none;' + cueRegionProperties;

            let bodyDiv = document.createElement('div');
            bodyDiv.className = 'paragraph bodyStyle';
            bodyDiv.style.cssText = getStyle(videoElement);

            let cueUniWrapper = document.createElement('div');
            cueUniWrapper.className = 'cueUniWrapper';
            cueUniWrapper.style.cssText = 'unicode-bidi: normal; direction: ltr;';

            for (let p = 0; p < region.p.length; ++p) {
                let ptag = region.p[p];
                let lastSpanRow = 0;
                for (s = 0; s < ptag.spans.length; ++s) {
                    let span = ptag.spans[s];
                    if (span.line.length > 0) {
                        if ((s !== 0) && lastSpanRow != span.row) {
                            let brElement = document.createElement('br');
                            brElement.className = 'lineBreak';
                            cueUniWrapper.appendChild(brElement);
                        }
                        let sameRow = false;
                        if (lastSpanRow === span.row) {
                            sameRow = true;
                        }
                        lastSpanRow = span.row;
                        let spanStyle = styleStates[span.name];
                        let spanElement = document.createElement('span');
                        spanElement.className = 'spanPadding ' + span.name + ' customSpanColor';
                        spanElement.style.cssText = getStyle(videoElement, spanStyle);
                        if ((s !== 0) && sameRow) {
                            if (s === ptag.spans.length - 1) {
                                spanElement.textContent = rtrim(span.line);
                            } else {
                                spanElement.textContent = span.line;
                            }
                        } else {
                            if (s === 0) {
                                if (ptag.spans.length > 1) {
                                    /* Check if next text is on same row */
                                    if (span.row === ptag.spans[1].row) {
                                        /* Next element on same row, trim start */
                                        spanElement.textContent = ltrim(span.line);
                                    } else {
                                        /* Different rows, trim */
                                        spanElement.textContent = span.line.trim();
                                    }
                                } else {
                                    spanElement.textContent = span.line.trim();
                                }
                            } else {
                                spanElement.textContent = span.line.trim();
                            }
                        }
                        cueUniWrapper.appendChild(spanElement);
                    }
                }
            }

            bodyDiv.appendChild(cueUniWrapper);

            finalDiv.appendChild(bodyDiv);

            let fontSize = { 'bodyStyle': 90 };
            for (s in styleStates) {
                if (styleStates.hasOwnProperty(s)) {
                    fontSize[s] = 90;
                }
            }

            captionsArray.push({ type: 'html',
                                 start: startTime,
                                 end: endTime,
                                 cueHTMLElement: finalDiv,
                                 cueID: cueID,
                                 cellResolution: [32, 15],
                                 isFromCEA608: true,
                                 regions: regions,
                                 regionID: region.name,
                                 videoHeight: videoElement.videoHeight,
                                 videoWidth: videoElement.videoWidth,
                                 fontSize: fontSize || {
                                     defaultFontSize: '100'
                                 },
                                 lineHeight: {},
                                 linePadding: {},
                               });
        }
        return captionsArray;
    }

    function abort() {
        textTracks.deleteAllTextTracks();
        allTracksAreDisabled = false;
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

    function resetEmbedded() {
        embeddedInitialized = false;
        embeddedTracks = [];
        embeddedCea608FieldParsers = [null, null];
        embeddedSequenceNumbers = [];
        embeddedLastSequenceNumber = null;
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
        var oldTrackIdx = textTracks.getCurrentTrackIdx();

        for (var i = 0; i < ln; i++ ) {
            var track = tracks[i];
            allTracksAreDisabled = track.mode !== 'showing';
            if (track.mode === 'showing') {
                if (oldTrackIdx !== i) { // do not reset track if already the current track.  This happens when all captions get turned off via UI and then turned on again and with videojs.
                    textTracks.setCurrentTrackIdx(i);
                    textTracks.addCaptions(i, 0, null); // Make sure that previously queued captions are added as cues
                    if (isFragmented && i < nrNonEmbeddedTracks) {
                        var currentFragTrack = mediaController.getCurrentTrackFor('fragmentedText', streamController.getActiveStreamInfo());
                        var newFragTrack = fragmentedTracks[i];
                        if (newFragTrack !== currentFragTrack) {
                            fragmentModel.abortRequests();
                            textTracks.deleteTrackCues(currentFragTrack);
                            mediaController.setTrack(newFragTrack);
                            currFragmentedTrackIdx = i;
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

    function getIsDefault(mediaInfo) {
        //TODO How to tag default. currently same order as listed in manifest.
        // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
        // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
        var isDefault = false;
        if (embeddedTracks.length > 1) {
            isDefault = (mediaInfo.id && mediaInfo.id === 'CC1'); // CC1 if both CC1 and CC3 exist
        } else if (embeddedTracks.length === 1) {
            if (mediaInfo.id && mediaInfo.id.substring(0, 2) === 'CC') {// Either CC1 or CC3
                isDefault = true;
            }
        } else {
            isDefault = (mediaInfo.index === mediaInfos[0].index);
        }
        return isDefault;
    }

    function getParser(codecType) {
        var parser;
        if (codecType.search('vtt') >= 0) {
            parser = VTTParser;
        } else if (codecType.search('ttml') >= 0 || codecType.search('stpp') >= 0) {
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
