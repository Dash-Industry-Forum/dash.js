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
import { HTTPRequest } from '../vo/metrics/HTTPRequest';
import TextTrackInfo from '../vo/TextTrackInfo';
import BoxParser from '../utils/BoxParser';
import CustomTimeRanges from '../utils/CustomTimeRanges';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import TextTracks from './TextTracks';
import EmbeddedTextHtmlRender from './EmbeddedTextHtmlRender';
import ISOBoxer from 'codem-isoboxer';
import cea608parser from '../../../externals/cea608-parser';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';

function TextSourceBuffer() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let embeddedInitialized = false;

    let instance,
        logger,
        boxParser,
        errHandler,
        adapter,
        manifestModel,
        mediaController,
        parser,
        vttParser,
        ttmlParser,
        mediaInfos,
        textTracks,
        fragmentedFragmentModel,
        initializationSegmentReceived,
        timescale,
        fragmentedTracks,
        videoModel,
        streamController,
        firstFragmentedSubtitleStart,
        currFragmentedTrackIdx,
        embeddedTracks,
        embeddedTimescale,
        embeddedLastSequenceNumber,
        embeddedCea608FieldParsers,
        embeddedTextHtmlRender,
        mseTimeOffset;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        resetInitialSettings();
    }

    function resetFragmented () {
        fragmentedFragmentModel = null;
        timescale = NaN;
        fragmentedTracks = [];
        firstFragmentedSubtitleStart = null;
        initializationSegmentReceived = false;
    }

    function resetInitialSettings() {
        resetFragmented();

        mediaInfos = [];
        parser = null;
    }

    function initialize(mimeType, streamProcessor) {
        if (!embeddedInitialized) {
            initEmbedded();
        }

        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();

        if (!boxParser) {
            boxParser = BoxParser(context).getInstance();
        }

        addMediaInfos(mimeType, streamProcessor);
    }

    function addMediaInfos(mimeType, streamProcessor) {
        const isFragmented = !adapter.getIsTextTrack(mimeType);
        if (streamProcessor) {
            mediaInfos = mediaInfos.concat(streamProcessor.getMediaInfoArr());

            if (isFragmented) {
                fragmentedFragmentModel = streamProcessor.getFragmentModel();
                instance.buffered = CustomTimeRanges(context).create();
                fragmentedTracks = mediaController.getTracksFor(Constants.FRAGMENTED_TEXT, streamProcessor.getStreamInfo());
                const currFragTrack = mediaController.getCurrentTrackFor(Constants.FRAGMENTED_TEXT, streamProcessor.getStreamInfo());
                for (let i = 0; i < fragmentedTracks.length; i++) {
                    if (fragmentedTracks[i] === currFragTrack) {
                        setCurrentFragmentedTrackIdx(i);
                        break;
                    }
                }
            }

            for (let i = 0; i < mediaInfos.length; i++) {
                createTextTrackFromMediaInfo(null, mediaInfos[i]);
            }
        }
    }

    function abort() {
        textTracks.deleteAllTextTracks();
        resetFragmented();
        boxParser = null;
        mediaInfos = [];
    }

    function reset() {
        resetInitialSettings();

        streamController = null;
        videoModel = null;
        textTracks = null;
    }

    function onVideoChunkReceived(e) {
        const chunk = e.chunk;

        if (chunk.mediaInfo.embeddedCaptions) {
            append(chunk.bytes, chunk);
        }
    }

    function initEmbedded() {
        embeddedTracks = [];
        textTracks = TextTracks(context).getInstance();
        textTracks.setConfig({
            videoModel: videoModel
        });
        textTracks.initialize();
        boxParser = BoxParser(context).getInstance();
        currFragmentedTrackIdx = null;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedLastSequenceNumber = null;
        embeddedInitialized = true;
        embeddedTextHtmlRender = EmbeddedTextHtmlRender(context).getInstance();

        const streamProcessors = streamController.getActiveStreamProcessors();
        for (const i in streamProcessors) {
            if (streamProcessors[i].getType() === 'video') {
                mseTimeOffset = streamProcessors[i].getRepresentationInfo().MSETimeOffset;
                break;
            }
        }

        eventBus.on(Events.VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
        eventBus.on(Events.BUFFER_CLEARED, onVideoBufferCleared, this);
    }

    function resetEmbedded() {
        eventBus.off(Events.VIDEO_CHUNK_RECEIVED, onVideoChunkReceived, this);
        eventBus.off(Events.BUFFER_CLEARED, onVideoBufferCleared, this);
        if (textTracks) {
            textTracks.deleteAllTextTracks();
        }
        embeddedInitialized = false;
        embeddedTracks = [];
        embeddedCea608FieldParsers = [null, null];
        embeddedLastSequenceNumber = null;
    }

    function addEmbeddedTrack(mediaInfo) {
        if (!embeddedInitialized) {
            initEmbedded();
        }
        if (mediaInfo) {
            if (mediaInfo.id === Constants.CC1 || mediaInfo.id === Constants.CC3) {
                for (let i = 0; i < embeddedTracks.length; i++) {
                    if (embeddedTracks[i].id === mediaInfo.id) {
                        return;
                    }
                }
                embeddedTracks.push(mediaInfo);
            } else {
                logger.warn('Embedded track ' + mediaInfo.id + ' not supported!');
            }
        }
    }

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
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
        const config = {
            fragmentModel: fragmentedFragmentModel,
            fragmentedTracks: fragmentedTracks,
            videoModel: videoModel
        };

        return config;
    }

    function setCurrentFragmentedTrackIdx(idx) {
        currFragmentedTrackIdx = idx;
    }

    function createTextTrackFromMediaInfo(captionData, mediaInfo) {
        const textTrackInfo = new TextTrackInfo();
        const trackKindMap = { subtitle: 'subtitles', caption: 'captions' }; //Dash Spec has no "s" on end of KIND but HTML needs plural.
        const getKind = function () {
            let kind = (mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;
            kind = (kind === trackKindMap.caption || kind === trackKindMap.subtitle) ? kind : trackKindMap.caption;
            return kind;
        };

        const checkTTML = function () {
            let ttml = false;
            if (mediaInfo.codec && mediaInfo.codec.search(Constants.STPP) >= 0) {
                ttml = true;
            }
            if (mediaInfo.mimeType && mediaInfo.mimeType.search(Constants.TTML) >= 0) {
                ttml = true;
            }
            return ttml;
        };

        textTrackInfo.captionData = captionData;
        textTrackInfo.lang = mediaInfo.lang;
        textTrackInfo.labels = mediaInfo.labels;
        textTrackInfo.id = mediaInfo.id ? mediaInfo.id : mediaInfo.index; // AdaptationSet id (an unsigned int) as it's optional parameter, use mediaInfo.index
        textTrackInfo.index = mediaInfo.index; // AdaptationSet index in manifest
        textTrackInfo.isTTML = checkTTML();
        textTrackInfo.defaultTrack = getIsDefault(mediaInfo);
        textTrackInfo.isFragmented = !adapter.getIsTextTrack(mediaInfo.mimeType);
        textTrackInfo.isEmbedded = mediaInfo.isEmbedded ? true : false;
        textTrackInfo.kind = getKind();
        textTrackInfo.roles = mediaInfo.roles;
        textTrackInfo.accessibility = mediaInfo.accessibility;
        const totalNrTracks = (mediaInfos ? mediaInfos.length : 0) + embeddedTracks.length;
        textTracks.addTextTrack(textTrackInfo, totalNrTracks);
    }

    function append(bytes, chunk) {
        let result,
            sampleList,
            i, j, k,
            samplesInfo,
            ccContent;
        const mediaInfo = chunk.mediaInfo;
        const mediaType = mediaInfo.type;
        const mimeType = mediaInfo.mimeType;
        const codecType = mediaInfo.codec || mimeType;
        if (!codecType) {
            logger.error('No text type defined');
            return;
        }

        if (mediaType === Constants.FRAGMENTED_TEXT) {
            if (!initializationSegmentReceived && chunk.segmentType === 'InitializationSegment') {
                initializationSegmentReceived = true;
                timescale = boxParser.getMediaTimescaleFromMoov(bytes);
            } else {
                if (!initializationSegmentReceived) {
                    return;
                }
                samplesInfo = boxParser.getSamplesInfo(bytes);
                sampleList = samplesInfo.sampleList;
                if (firstFragmentedSubtitleStart === null && sampleList.length > 0) {
                    firstFragmentedSubtitleStart = sampleList[0].cts - chunk.start * timescale;
                }
                if (codecType.search(Constants.STPP) >= 0) {
                    parser = parser !== null ? parser : getParser(codecType);
                    for (i = 0; i < sampleList.length; i++) {
                        const sample = sampleList[i];
                        const sampleStart = sample.cts;
                        const sampleRelStart = sampleStart - firstFragmentedSubtitleStart;
                        this.buffered.add(sampleRelStart / timescale, (sampleRelStart + sample.duration) / timescale);
                        const dataView = new DataView(bytes, sample.offset, sample.subSizes[0]);
                        ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);
                        const images = [];
                        let subOffset = sample.offset + sample.subSizes[0];
                        for (j = 1; j < sample.subSizes.length; j++) {
                            const inData = new Uint8Array(bytes, subOffset, sample.subSizes[j]);
                            const raw = String.fromCharCode.apply(null, inData);
                            images.push(raw);
                            subOffset += sample.subSizes[j];
                        }
                        try {
                            // Only used for Miscrosoft Smooth Streaming support - caption time is relative to sample time. In this case, we apply an offset.
                            const manifest = manifestModel.getValue();
                            const offsetTime = manifest.ttmlTimeIsRelative ? sampleStart / timescale : 0;
                            result = parser.parse(ccContent, offsetTime, sampleStart / timescale, (sampleStart + sample.duration) / timescale, images);
                            textTracks.addCaptions(currFragmentedTrackIdx, firstFragmentedSubtitleStart / timescale, result);
                        } catch (e) {
                            fragmentedFragmentModel.removeExecutedRequestsBeforeTime();
                            this.remove();
                            logger.error('TTML parser error: ' + e.message);
                        }
                    }
                } else {
                    // WebVTT case
                    const captionArray = [];
                    for (i = 0 ; i < sampleList.length; i++) {
                        const sample = sampleList[i];
                        sample.cts -= firstFragmentedSubtitleStart;
                        this.buffered.add(sample.cts / timescale, (sample.cts + sample.duration) / timescale);
                        const sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
                        // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
                        const sampleBoxes = ISOBoxer.parseBuffer(sampleData);

                        for (j = 0 ; j < sampleBoxes.boxes.length; j++) {
                            const box1 = sampleBoxes.boxes[j];
                            logger.debug('VTT box1: ' + box1.type);
                            if (box1.type === 'vtte') {
                                continue; //Empty box
                            }
                            if (box1.type === 'vttc') {
                                logger.debug('VTT vttc boxes.length = ' + box1.boxes.length);
                                for (k = 0 ; k < box1.boxes.length; k++) {
                                    const box2 = box1.boxes[k];
                                    logger.debug('VTT box2: ' + box2.type);
                                    if (box2.type === 'payl') {
                                        const cue_text = box2.cue_text;
                                        logger.debug('VTT cue_text = ' + cue_text);
                                        const start_time = sample.cts / timescale;
                                        const end_time = (sample.cts + sample.duration) / timescale;
                                        captionArray.push({
                                            start: start_time,
                                            end: end_time,
                                            data: cue_text,
                                            styles: {}
                                        });
                                        logger.debug('VTT ' + start_time + '-' + end_time + ' : ' + cue_text);
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
        } else if (mediaType === Constants.TEXT) {
            const dataView = new DataView(bytes, 0, bytes.byteLength);
            ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);

            try {
                result = getParser(codecType).parse(ccContent, 0);
                textTracks.addCaptions(textTracks.getCurrentTrackIdx(), 0, result);
            } catch (e) {
                errHandler.error(new DashJSError(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE, Errors.TIMED_TEXT_ERROR_MESSAGE_PARSE + e.message, ccContent));
            }
        } else if (mediaType === Constants.VIDEO) { //embedded text
            if (chunk.segmentType === HTTPRequest.INIT_SEGMENT_TYPE) {
                if (embeddedTimescale === 0) {
                    embeddedTimescale = boxParser.getMediaTimescaleFromMoov(bytes);
                    for (i = 0; i < embeddedTracks.length; i++) {
                        createTextTrackFromMediaInfo(null, embeddedTracks[i]);
                    }
                }
            } else { // MediaSegment
                if (embeddedTimescale === 0) {
                    logger.warn('CEA-608: No timescale for embeddedTextTrack yet');
                    return;
                }
                const makeCueAdderForIndex = function (self, trackIndex) {
                    function newCue(startTime, endTime, captionScreen) {
                        let captionsArray = null;
                        if (videoModel.getTTMLRenderingDiv()) {
                            captionsArray = embeddedTextHtmlRender.createHTMLCaptionsFromScreen(videoModel.getElement(), startTime, endTime, captionScreen);
                        } else {
                            const text = captionScreen.getDisplayText();
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

                samplesInfo = boxParser.getSamplesInfo(bytes);

                const sequenceNumber = samplesInfo.lastSequenceNumber;

                if (!embeddedCea608FieldParsers[0] && !embeddedCea608FieldParsers[1]) {
                    // Time to setup the CEA-608 parsing
                    let field, handler, trackIdx;
                    for (i = 0; i < embeddedTracks.length; i++) {
                        if (embeddedTracks[i].id === Constants.CC1) {
                            field = 0;
                            trackIdx = textTracks.getTrackIdxForId(Constants.CC1);
                        } else if (embeddedTracks[i].id === Constants.CC3) {
                            field = 1;
                            trackIdx = textTracks.getTrackIdxForId(Constants.CC3);
                        }
                        if (trackIdx === -1) {
                            logger.warn('CEA-608: data before track is ready.');
                            return;
                        }
                        handler = makeCueAdderForIndex(this, trackIdx);
                        embeddedCea608FieldParsers[i] = new cea608parser.Cea608Parser(i + 1, {
                            'newCue': handler
                        }, null);
                    }
                }

                if (embeddedTimescale) {
                    if (embeddedLastSequenceNumber !== null && sequenceNumber !== embeddedLastSequenceNumber + samplesInfo.numSequences) {
                        for (i = 0; i < embeddedCea608FieldParsers.length; i++) {
                            if (embeddedCea608FieldParsers[i]) {
                                embeddedCea608FieldParsers[i].reset();
                            }
                        }
                    }

                    const allCcData = extractCea608Data(bytes, samplesInfo.sampleList);

                    for (let fieldNr = 0; fieldNr < embeddedCea608FieldParsers.length; fieldNr++) {
                        const ccData = allCcData.fields[fieldNr];
                        const fieldParser = embeddedCea608FieldParsers[fieldNr];
                        if (fieldParser) {
                            for (i = 0; i < ccData.length; i++) {
                                fieldParser.addData(ccData[i][0] / embeddedTimescale, ccData[i][1]);
                            }
                        }
                    }
                    embeddedLastSequenceNumber = sequenceNumber;
                }
            }
        }
    }
    /**
     * Extract CEA-608 data from a buffer of data.
     * @param {ArrayBuffer} data
     * @param {Array} samples cue information
     * @returns {Object|null} ccData corresponding to one segment.
     */
    function extractCea608Data(data, samples) {
        if (samples.length === 0) {
            return null;
        }

        const allCcData = {
            splits: [],
            fields: [[], []]
        };
        const raw = new DataView(data);
        for (let i = 0; i < samples.length; i++) {
            const sample = samples[i];
            const cea608Ranges = cea608parser.findCea608Nalus(raw, sample.offset, sample.size);
            let lastSampleTime = null;
            let idx = 0;
            for (let j = 0; j < cea608Ranges.length; j++) {
                const ccData = cea608parser.extractCea608DataFromRange(raw, cea608Ranges[j]);
                for (let k = 0; k < 2; k++) {
                    if (ccData[k].length > 0) {
                        if (sample.cts !== lastSampleTime) {
                            idx = 0;
                        } else {
                            idx += 1;
                        }
                        allCcData.fields[k].push([sample.cts + (mseTimeOffset * embeddedTimescale), ccData[k], idx]);
                        lastSampleTime = sample.cts;
                    }
                }
            }
        }

        // Sort by sampleTime ascending order
        // If two packets have the same sampleTime, use them in the order
        // they were received
        allCcData.fields.forEach(function sortField(field) {
            field.sort(function (a, b) {
                if (a[0] === b[0]) {
                    return a[2] - b[2];
                }
                return a[0] - b[0];
            });
        });

        return allCcData;
    }

    function getIsDefault(mediaInfo) {
        //TODO How to tag default. currently same order as listed in manifest.
        // Is there a way to mark a text adaptation set as the default one? DASHIF meeting talk about using role which is being used for track KIND
        // Eg subtitles etc. You can have multiple role tags per adaptation Not defined in the spec yet.
        let isDefault = false;
        if (embeddedTracks.length > 1 && mediaInfo.isEmbedded) {
            isDefault = (mediaInfo.id && mediaInfo.id === Constants.CC1); // CC1 if both CC1 and CC3 exist
        } else if (embeddedTracks.length === 1) {
            if (mediaInfo.id && typeof mediaInfo.id === 'string' && mediaInfo.id.substring(0, 2) === 'CC') { // Either CC1 or CC3
                isDefault = true;
            }
        } else if (embeddedTracks.length === 0) {
            isDefault = (mediaInfo.index === mediaInfos[0].index);
        }
        return isDefault;
    }

    function getParser(codecType) {
        let parser;
        if (codecType.search(Constants.VTT) >= 0) {
            parser = vttParser;
        } else if (codecType.search(Constants.TTML) >= 0 || codecType.search(Constants.STPP) >= 0) {
            parser = ttmlParser;
        }
        return parser;
    }

    function remove(start, end) {
        //if start and end are not defined, remove all
        if ((start === undefined) && (start === end)) {
            start = this.buffered.start(0);
            end = this.buffered.end(this.buffered.length - 1);
        }
        this.buffered.remove(start, end);
    }

    function onVideoBufferCleared(e) {
        embeddedTracks.forEach(function (track) {
            const trackIdx = textTracks.getTrackIdxForId(track.id);
            if (trackIdx >= 0) {
                textTracks.deleteCuesFromTrackIdx(trackIdx, e.from, e.to);
            }
        });
    }

    instance = {
        initialize: initialize,
        append: append,
        abort: abort,
        addEmbeddedTrack: addEmbeddedTrack,
        resetEmbedded: resetEmbedded,
        setConfig: setConfig,
        getConfig: getConfig,
        setCurrentFragmentedTrackIdx: setCurrentFragmentedTrackIdx,
        remove: remove,
        reset: reset
    };

    setup();

    return instance;
}

TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getSingletonFactory(TextSourceBuffer);
