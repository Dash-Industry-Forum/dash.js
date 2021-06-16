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
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import TextTrackInfo from '../vo/TextTrackInfo';
import BoxParser from '../utils/BoxParser';
import CustomTimeRanges from '../utils/CustomTimeRanges';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import EmbeddedTextHtmlRender from './EmbeddedTextHtmlRender';
import ISOBoxer from 'codem-isoboxer';
import cea608parser from '../../../externals/cea608-parser';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';

function TextSourceBuffer(config) {
    const errHandler = config.errHandler;
    const manifestModel = config.manifestModel;
    const mediaController = config.mediaController;
    const videoModel = config.videoModel;
    const textTracks = config.textTracks;
    const vttParser = config.vttParser;
    const ttmlParser = config.ttmlParser;
    const streamInfo = config.streamInfo;

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    let embeddedInitialized = false;

    let instance,
        logger,
        boxParser,
        parser,
        mediaInfos,
        fragmentModel,
        initializationSegmentReceived,
        timescale,
        fragmentedTracks,
        firstFragmentedSubtitleStart,
        currFragmentedTrackIdx,
        embeddedTracks,
        embeddedTimescale,
        embeddedLastSequenceNumber,
        embeddedCea608FieldParsers,
        embeddedTextHtmlRender;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        boxParser = BoxParser(context).getInstance();

        resetInitialSettings();
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function _resetFragmented() {
        fragmentModel = null;
        timescale = NaN;
        fragmentedTracks = [];
        firstFragmentedSubtitleStart = null;
        initializationSegmentReceived = false;
    }

    function resetInitialSettings() {
        _resetFragmented();

        mediaInfos = [];
        parser = null;
    }

    function initialize() {

        if (!embeddedInitialized) {
            _initEmbedded();
        }

    }

    /**
     * There might be media infos of different types. For instance text and fragmentedText.
     * @param {string} type
     * @param {array} mInfos
     * @param {object} fModel
     */
    function addMediaInfos(type, mInfos, fModel) {

        mediaInfos = mediaInfos.concat(mInfos);

        if (type === Constants.TEXT && mInfos[0].isFragmented && !mInfos[0].isEmbedded) {
            fragmentModel = fModel;
            instance.buffered = CustomTimeRanges(context).create();
            fragmentedTracks = mediaController.getTracksFor(Constants.TEXT, streamInfo.id).filter(track => track.isFragmented);
            const currFragTrack = mediaController.getCurrentTrackFor(Constants.TEXT, streamInfo.id);
            for (let i = 0; i < fragmentedTracks.length; i++) {
                if (fragmentedTracks[i] === currFragTrack) {
                    setCurrentFragmentedTrackIdx(i);
                    break;
                }
            }
        }

        for (let i = 0; i < mInfos.length; i++) {
            _createTextTrackFromMediaInfo(mInfos[i]);
        }

    }

    /**
     * Create a new track based on the mediaInfo information
     * @param {object} mediaInfo
     * @private
     */
    function _createTextTrackFromMediaInfo(mediaInfo) {
        const textTrackInfo = new TextTrackInfo();
        const trackKindMap = { subtitle: 'subtitles', caption: 'captions' }; //Dash Spec has no "s" on end of KIND but HTML needs plural.

        for (let key in mediaInfo) {
            textTrackInfo[key] = mediaInfo[key];
        }

        textTrackInfo.labels = mediaInfo.labels;
        textTrackInfo.defaultTrack = getIsDefault(mediaInfo);
        textTrackInfo.isFragmented = mediaInfo.isFragmented;
        textTrackInfo.isEmbedded = !!mediaInfo.isEmbedded;
        textTrackInfo.isTTML = _checkTtml(mediaInfo);
        textTrackInfo.kind = _getKind(mediaInfo, trackKindMap);

        textTracks.addTextTrack(textTrackInfo);
    }

    function abort() {
    }

    function reset() {
        resetInitialSettings();

        mediaInfos = [];
        boxParser = null;
    }

    function _onVideoChunkReceived(e) {
        const chunk = e.chunk;

        if (chunk.mediaInfo.embeddedCaptions) {
            append(chunk.bytes, chunk);
        }
    }

    function _initEmbedded() {
        embeddedTracks = [];
        currFragmentedTrackIdx = null;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedLastSequenceNumber = null;
        embeddedInitialized = true;
        embeddedTextHtmlRender = EmbeddedTextHtmlRender(context).getInstance();

        eventBus.on(Events.VIDEO_CHUNK_RECEIVED, _onVideoChunkReceived, instance);
        eventBus.on(Events.BUFFER_CLEARED, onVideoBufferCleared, instance);
    }

    function resetEmbedded() {
        eventBus.off(Events.VIDEO_CHUNK_RECEIVED, _onVideoChunkReceived, instance);
        eventBus.off(Events.BUFFER_CLEARED, onVideoBufferCleared, instance);
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
            return;
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

    function getConfig() {
        const config = {
            fragmentModel: fragmentModel,
            fragmentedTracks: fragmentedTracks,
            videoModel: videoModel
        };

        return config;
    }

    function setCurrentFragmentedTrackIdx(idx) {
        currFragmentedTrackIdx = idx;
    }

    function _checkTtml(mediaInfo) {
        return (mediaInfo.codec && mediaInfo.codec.search(Constants.STPP) >= 0) || (mediaInfo.mimeType && mediaInfo.mimeType.search(Constants.TTML) >= 0);
    }

    function _getKind(mediaInfo, trackKindMap) {
        let kind = (mediaInfo.roles && mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;

        kind = (kind === trackKindMap.caption || kind === trackKindMap.subtitle) ? kind : trackKindMap.caption;

        return kind;
    }

    function append(bytes, chunk) {
        const mediaInfo = chunk.mediaInfo;
        const mediaType = mediaInfo.type;
        const mimeType = mediaInfo.mimeType;
        const codecType = mediaInfo.codec || mimeType;

        if (!codecType) {
            logger.error('No text type defined');
            return;
        }

        if (mediaInfo.codec.indexOf('application/mp4') !== -1) {
            _appendFragmentedText(bytes, chunk, codecType);
        } else if (mediaType === Constants.VIDEO) {
            _appendEmbeddedText(bytes, chunk);
        } else {
            _appendText(bytes, chunk, codecType);
        }
    }

    function _appendFragmentedText(bytes, chunk, codecType) {
        let sampleList,
            samplesInfo;

        if (chunk.segmentType === 'InitializationSegment') {
            initializationSegmentReceived = true;
            timescale = boxParser.getMediaTimescaleFromMoov(bytes);
        } else {
            if (!initializationSegmentReceived) {
                return;
            }
            samplesInfo = boxParser.getSamplesInfo(bytes);
            sampleList = samplesInfo.sampleList;
            if (sampleList.length > 0) {
                firstFragmentedSubtitleStart = sampleList[0].cts - chunk.start * timescale;
            }
            if (codecType.search(Constants.STPP) >= 0) {
                _appendFragmentedSttp(bytes, sampleList, codecType);
            } else {
                _appendFragmentedWebVtt(bytes, sampleList);
            }
        }
    }

    function _appendFragmentedSttp(bytes, sampleList, codecType) {
        let i, j;

        parser = parser !== null ? parser : getParser(codecType);

        for (i = 0; i < sampleList.length; i++) {
            const sample = sampleList[i];
            const sampleStart = sample.cts;
            const timestampOffset = _getTimestampOffset();
            const start = timestampOffset + sampleStart / timescale;
            const end = start + sample.duration / timescale;
            instance.buffered.add(start, end);
            const dataView = new DataView(bytes, sample.offset, sample.subSizes[0]);
            let ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);
            const images = [];
            let subOffset = sample.offset + sample.subSizes[0];

            for (j = 1; j < sample.subSizes.length; j++) {
                const inData = new Uint8Array(bytes, subOffset, sample.subSizes[j]);
                const raw = String.fromCharCode.apply(null, inData);
                images.push(raw);
                subOffset += sample.subSizes[j];
            }

            try {
                const manifest = manifestModel.getValue();

                // Only used for Miscrosoft Smooth Streaming support - caption time is relative to sample time. In this case, we apply an offset.
                const offsetTime = manifest.ttmlTimeIsRelative ? sampleStart / timescale : 0;

                const result = parser.parse(ccContent, offsetTime, sampleStart / timescale, (sampleStart + sample.duration) / timescale, images);
                textTracks.addCaptions(currFragmentedTrackIdx, timestampOffset, result);
            } catch (e) {
                fragmentModel.removeExecutedRequestsBeforeTime();
                this.remove();
                logger.error('TTML parser error: ' + e.message);
            }
        }
    }

    function _appendFragmentedWebVtt(bytes, sampleList) {
        let i, j, k;

        const captionArray = [];
        for (i = 0; i < sampleList.length; i++) {
            const sample = sampleList[i];
            sample.cts -= firstFragmentedSubtitleStart;
            const timestampOffset = _getTimestampOffset();
            const start = timestampOffset + sample.cts / timescale;
            const end = start + sample.duration / timescale;
            instance.buffered.add(start, end);
            const sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
            // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
            const sampleBoxes = ISOBoxer.parseBuffer(sampleData);

            for (j = 0; j < sampleBoxes.boxes.length; j++) {
                const box1 = sampleBoxes.boxes[j];
                logger.debug('VTT box1: ' + box1.type);
                if (box1.type === 'vtte') {
                    continue; //Empty box
                }
                if (box1.type === 'vttc') {
                    logger.debug('VTT vttc boxes.length = ' + box1.boxes.length);
                    for (k = 0; k < box1.boxes.length; k++) {
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

    function _appendText(bytes, chunk, codecType) {
        let result,
            ccContent;

        const dataView = new DataView(bytes, 0, bytes.byteLength);
        ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);

        try {
            result = getParser(codecType).parse(ccContent, 0);
            textTracks.addCaptions(textTracks.getCurrentTrackIdx(), 0, result);
            if (instance.buffered) {
                instance.buffered.add(chunk.start, chunk.end);
            }
        } catch (e) {
            errHandler.error(new DashJSError(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE, Errors.TIMED_TEXT_ERROR_MESSAGE_PARSE + e.message, ccContent));
        }
    }

    function _appendEmbeddedText(bytes, chunk) {
        let i, samplesInfo;

        // Init segment
        if (chunk.segmentType === HTTPRequest.INIT_SEGMENT_TYPE) {
            if (embeddedTimescale === 0) {
                embeddedTimescale = boxParser.getMediaTimescaleFromMoov(bytes);
            }
        }

        // MediaSegment
        else if (chunk.segmentType === HTTPRequest.MEDIA_SEGMENT_TYPE) {

            if (embeddedTimescale === 0) {
                logger.warn('CEA-608: No timescale for embeddedTextTrack yet');
                return;
            }

            samplesInfo = boxParser.getSamplesInfo(bytes);

            const sequenceNumber = samplesInfo.lastSequenceNumber;
            if (!embeddedCea608FieldParsers[0] && !embeddedCea608FieldParsers[1]) {
                _setupCeaParser();
            }

            if (embeddedTimescale) {
                if (embeddedLastSequenceNumber !== null && sequenceNumber !== embeddedLastSequenceNumber + samplesInfo.numSequences) {
                    for (i = 0; i < embeddedCea608FieldParsers.length; i++) {
                        if (embeddedCea608FieldParsers[i]) {
                            embeddedCea608FieldParsers[i].reset();
                        }
                    }
                }

                const allCcData = _extractCea608Data(bytes, samplesInfo.sampleList);

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

    function _setupCeaParser() {
        // Time to setup the CEA-608 parsing
        let trackIdx;
        for (let i = 0; i < embeddedTracks.length; i++) {
            trackIdx = textTracks.getTrackIdxForId(embeddedTracks[i].id);

            if (trackIdx === -1) {
                logger.warn('CEA-608: data before track is ready.');
                return;
            }

            const handler = _makeCueAdderForIndex(trackIdx);
            embeddedCea608FieldParsers[i] = new cea608parser.Cea608Parser(i + 1, {
                newCue: handler
            }, null);
        }
    }

    function _makeCueAdderForIndex(trackIndex) {
        function newCue(startTime, endTime, captionScreen) {
            let captionsArray;
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
    }

    /**
     * Extract CEA-608 data from a buffer of data.
     * @param {ArrayBuffer} data
     * @param {Array} samples cue information
     * @returns {Object|null} ccData corresponding to one segment.
     */
    function _extractCea608Data(data, samples) {
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
            const ccData = cea608parser.extractCea608DataFromSample(raw, sample.offset, sample.size);
            let lastSampleTime = null;
            let idx = 0;
            for (let k = 0; k < 2; k++) {
                if (ccData[k].length > 0) {
                    if (sample.cts !== lastSampleTime) {
                        idx = 0;
                    } else {
                        idx += 1;
                    }
                    const timestampOffset = _getTimestampOffset();
                    allCcData.fields[k].push([sample.cts + (timestampOffset * embeddedTimescale), ccData[k], idx]);
                    lastSampleTime = sample.cts;
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

    function _getTimestampOffset() {
        return !isNaN(instance.timestampOffset) ? instance.timestampOffset : 0;
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
            start = instance.buffered.start(0);
            end = instance.buffered.end(instance.buffered.length - 1);
        }
        instance.buffered.remove(start, end);
        textTracks.deleteCuesFromTrackIdx(currFragmentedTrackIdx, start, end);
    }

    function onVideoBufferCleared(e) {
        embeddedTracks.forEach(function (track) {
            const trackIdx = textTracks.getTrackIdxForId(track.id);
            if (trackIdx >= 0) {
                textTracks.deleteCuesFromTrackIdx(trackIdx, e.from, e.to);
            }
        });
    }

    function resetMediaInfos() {
        mediaInfos = [];
    }

    instance = {
        initialize,
        addMediaInfos,
        resetMediaInfos,
        getStreamId,
        append,
        abort,
        addEmbeddedTrack,
        resetEmbedded,
        getConfig,
        setCurrentFragmentedTrackIdx,
        remove,
        reset
    };

    setup();

    return instance;
}

TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getClassFactory(TextSourceBuffer);
