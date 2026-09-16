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
import Constants from '../constants/Constants.js';
import {HTTPRequest} from '../vo/metrics/HTTPRequest.js';
import TextTrackInfo from '../vo/TextTrackInfo.js';
import BoxParser from '../utils/BoxParser.js';
import CustomTimeRanges from '../utils/CustomTimeRanges.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';
import EmbeddedTextHtmlRender from './EmbeddedTextHtmlRender.js';
import ISOBoxer from 'codem-isoboxer';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import DashJSError from '../vo/DashJSError.js';
import Errors from '../../core/errors/Errors.js';
import { Cta608Parser, extractCta608DataFromSample } from '@svta/cml-608';
import DashConstants from '../../dash/constants/DashConstants.js';

// Boxes that are a whole sample under the experimental paint-model sample entries:
// no change for TTML and for WebVTT, and a body-only TTML document.
const PAINT_MODEL_SAMPLE_BOXES = ['ttmn', 'vttn', 'ttmb'];

function TextSourceBuffer(config) {
    const errHandler = config.errHandler;
    const manifestModel = config.manifestModel;
    const mediaController = config.mediaController;
    const videoModel = config.videoModel;
    const textTracks = config.textTracks;
    const vttParser = config.vttParser;
    const vttCustomRenderingParser = config.vttCustomRenderingParser;
    const ttmlParser = config.ttmlParser;
    const streamInfo = config.streamInfo;
    const settings = config.settings;
    const timelineConverter = config.timelineConverter;

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
        sampleEntryType,
        lastTtmlCues,
        segmentHeadDocument,
        lastVttEntries,
        fragmentedTracks,
        currFragmentedTrackIdx,
        embeddedTracks,
        embeddedTimescale,
        embeddedLastSequenceNumber,
        lastChunkEnd,
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
        sampleEntryType = null;
        lastTtmlCues = null;
        segmentHeadDocument = null;
        lastVttEntries = null;
        fragmentedTracks = [];
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
            _createTextTrackInfoFromMediaInfo(mInfos[i]);
        }

    }

    /**
     * Create a new track based on the mediaInfo information
     * @param {object} mediaInfo
     * @private
     */
    function _createTextTrackInfoFromMediaInfo(mediaInfo) {

        // We are mapping DASH specification strings to the ones of the HTML specification.
        // See also https://html.spec.whatwg.org/multipage/media.html#text-track-kind
        const trackKindMap = {};
        trackKindMap[DashConstants.SUBTITLE] = 'subtitles'
        trackKindMap[DashConstants.CAPTION] = 'captions'
        trackKindMap[DashConstants.FORCED_SUBTITLE] = 'subtitles'

        const textTrackInfo = new TextTrackInfo();

        for (let key in mediaInfo) {
            textTrackInfo[key] = mediaInfo[key];
        }

        textTrackInfo.defaultTrack = getIsDefault(mediaInfo);
        textTrackInfo.isTTML = _checkTtml(mediaInfo);
        textTrackInfo.kind = _getKind(mediaInfo, trackKindMap);

        textTracks.addTextTrackInfo(textTrackInfo);
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

        if (chunk.representation.mediaInfo.embeddedCaptions) {
            append(chunk.bytes, chunk);
        }
    }

    function _initEmbedded() {
        embeddedTracks = [];
        currFragmentedTrackIdx = null;
        embeddedTimescale = 0;
        embeddedCea608FieldParsers = [];
        embeddedLastSequenceNumber = null;
        lastChunkEnd = null;
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
        lastChunkEnd = null;
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

    /**
     * Returns the value of the codecs parameter of a content type such as
     * `application/mp4;codecs="stpp.ttml.im1t"`, or an empty string when there is none.
     * @param {string} contentType
     * @returns {string}
     * @private
     */
    function _getCodecsParameter(contentType) {
        const match = /codecs\s*=\s*(?:"([^"]*)"|'([^']*)'|([^;,]*))/i.exec(contentType);
        const value = match ? (match[1] || match[2] || match[3] || '').trim() : '';

        // A manifest without @codecs yields the literal string "undefined" here.
        return value === 'undefined' ? '' : value;
    }

    /**
     * Resolves which timed text format a track is in.
     *
     * The codecs parameter of a fragmented text track names the ISOBMFF sample entry,
     * optionally followed by RFC 6381 sub-parameters: `stpp`, `stpp.ttml.im1t`, `wvtt`.
     * Only the first element says what the samples are, so it is matched in full rather
     * than searched for as a substring. A sample entry we do not know is not something to
     * guess at - the samples could be anything - so this returns null and the caller
     * declines to parse them.
     *
     * sampleEntryType, read from the stsd of the initialization segment, wins when it is
     * known: it is what the samples are, while the manifest only says what they should be.
     *
     * @param {string} codec content type with a codecs parameter, a codec, or a MIME type
     * @param {string} [mimeType] used for side-loaded files, which name no sample entry
     * @param {string} [sampleEntry] four-character code from the stsd, when one was read
     * @returns {string|null} Constants.TTML, Constants.WVTT, or null when unknown
     * @private
     */
    function _getTextFormat(codec, mimeType, sampleEntry) {
        const fromSampleEntry = _getFormatForSampleEntry(sampleEntry);
        if (fromSampleEntry) {
            return fromSampleEntry;
        }

        const codecsParameter = codec ? _getCodecsParameter(codec) : '';
        if (codecsParameter) {
            // A named sample entry is authoritative, including when we do not know it.
            return _getFormatForSampleEntry(codecsParameter.split('.')[0]);
        }

        // Side-loaded and unfragmented text names no sample entry, only a MIME type.
        const type = (mimeType || codec || '').toLowerCase();
        if (type.indexOf(Constants.TTML) !== -1) {
            return Constants.TTML;
        }
        if (type.indexOf(Constants.VTT) !== -1) {
            return Constants.WVTT;
        }

        return null;
    }

    function _getFormatForSampleEntry(sampleEntry) {
        switch (sampleEntry ? sampleEntry.trim().toLowerCase() : '') {
            case Constants.STPP:
            case Constants.STPC:
                return Constants.TTML;
            case Constants.WVTT:
            case Constants.WVTC:
                return Constants.WVTT;
            default:
                return null;
        }
    }

    /**
     * Whether a sample entry is one of the experimental paint-model ones, under which a
     * sample may be a no-change box saying that what is on screen continues unchanged,
     * or, for stpc, a body-only box whose head comes from the first sample of the segment.
     *
     * The 4CCs stpc, wvtc, ttmn, ttmb and vttn are placeholders that are not registered
     * with MP4RA. See https://github.com/Eyevinn/paint-model-subtitles.
     * @param {string} sampleEntry
     * @returns {boolean}
     * @private
     */
    function _isPaintModelSampleEntry(sampleEntry) {
        const type = sampleEntry ? sampleEntry.trim().toLowerCase() : '';

        return type === Constants.STPC || type === Constants.WVTC;
    }

    /**
     * Returns the type of the box that is the whole sample, or null when the sample is
     * not one. The test is exact, as the design requires: a box header of one of the
     * known types whose size is the sample size. A TTML document cannot match, since it
     * cannot start with the zero byte that opens a box size.
     * @param {ArrayBuffer} bytes the segment
     * @param {object} sample from BoxParser.getSamplesInfo
     * @returns {string|null}
     * @private
     */
    function _getWholeSampleBoxType(bytes, sample) {
        if (!_isPaintModelSampleEntry(sampleEntryType) || sample.size < 8) {
            return null;
        }
        const view = new DataView(bytes, sample.offset, 8);
        if (view.getUint32(0) !== sample.size) {
            return null;
        }
        let type = '';
        for (let i = 4; i < 8; i++) {
            type += String.fromCharCode(view.getUint8(i));
        }

        return PAINT_MODEL_SAMPLE_BOXES.indexOf(type) !== -1 ? type : null;
    }

    /**
     * Re-states cues that were already parsed over a new interval. This is what a
     * no-change sample means: the same content continues, so the result is what a
     * restatement of the same document would have produced - without parsing it again,
     * which is the point of sending eight bytes instead of a document.
     * @param {Array} cues
     * @param {number} start
     * @param {number} end
     * @returns {Array}
     * @private
     */
    function _restateCues(cues, start, end) {
        return cues.map((cue) => Object.assign({}, cue, { start, end }));
    }

    /**
     * Builds a complete TTML document from the head of the first document of the segment
     * and a body sent on its own, which is what a ttmb sample carries.
     * @param {string} headDocument the complete document of the first sample of the segment
     * @param {string} body the body element
     * @returns {string|null} null when there is no document to splice into
     * @private
     */
    function _spliceTtmlBody(headDocument, body) {
        if (!headDocument) {
            return null;
        }
        const withoutBody = headDocument.replace(/<body[\s\S]*<\/body\s*>/, '');
        if (withoutBody === headDocument) {
            return null;
        }

        // The body goes back where the old one was, so that everything around it -
        // the tt element with its namespaces, and the head - is kept exactly.
        return headDocument.replace(/<body[\s\S]*<\/body\s*>/, body.trim());
    }

    function _checkTtml(mediaInfo) {
        return _getTextFormat(mediaInfo.codec, mediaInfo.mimeType) === Constants.TTML;
    }

    function _getKind(mediaInfo, trackKindMap) {
        let kind = (mediaInfo.roles && mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0].value] : trackKindMap.caption;

        kind = Object.values(trackKindMap).includes(kind) ? kind : trackKindMap.caption;

        return kind;
    }

    function append(bytes, chunk) {
        const mediaInfo = chunk.representation.mediaInfo;
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
            sampleEntryType = boxParser.getSampleEntryTypeFromMoov(bytes);
        } else {
            if (!initializationSegmentReceived) {
                return;
            }
            samplesInfo = boxParser.getSamplesInfo(bytes);
            sampleList = samplesInfo.sampleList;

            const format = _getTextFormat(codecType, chunk.representation.mediaInfo.mimeType, sampleEntryType);
            if (format === Constants.TTML) {
                _appendFragmentedSttp(bytes, sampleList, codecType);
            } else if (format === Constants.WVTT) {
                _appendFragmentedWebVtt(bytes, sampleList);
            } else {
                logger.error(`No parser for timed text sample entry "${sampleEntryType || _getCodecsParameter(codecType)}", not parsing the segment`);
            }
        }
    }

    function _appendFragmentedSttp(bytes, sampleList, codecType) {
        let i, j;

        parser = parser !== null ? parser : _getParser(codecType);

        for (i = 0; i < sampleList.length; i++) {
            const sample = sampleList[i];
            const sampleStart = sample.cts;
            const timestampOffset = _getTimestampOffset();
            const start = timestampOffset + sampleStart / timescale;
            const end = start + sample.duration / timescale;
            instance.buffered.add(start, end);

            const boxType = _getWholeSampleBoxType(bytes, sample);
            if (boxType === 'ttmn') {
                // Nothing changed. Re-state what is already on screen over this sample,
                // so that the track keeps tiling the timeline and the cue is extended
                // rather than torn down and re-created.
                if (lastTtmlCues) {
                    textTracks.addCaptions(currFragmentedTrackIdx, timestampOffset,
                        _restateCues(lastTtmlCues, start, end));
                }
                continue;
            }

            const documentOffset = boxType === 'ttmb' ? sample.offset + 8 : sample.offset;
            const documentSize = boxType === 'ttmb' ? sample.size - 8 : sample.subSizes[0];
            const dataView = new DataView(bytes, documentOffset, documentSize);
            let ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);
            if (boxType === 'ttmb') {
                // Body only: the head comes from the first sample of this segment.
                ccContent = _spliceTtmlBody(segmentHeadDocument, ccContent);
                if (!ccContent) {
                    logger.error('A ttmb sample arrived with no document to splice its body into');
                    continue;
                }
            } else if (i === 0) {
                segmentHeadDocument = ccContent;
            }
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

                // Only used for Microsoft Smooth Streaming support - caption time is relative to sample time. In this case, we apply an offset.
                const offsetTime = manifest.ttmlTimeIsRelative ? sampleStart / timescale : 0;
                const result = parser.parse(ccContent, offsetTime, (sampleStart / timescale), ((sampleStart + sample.duration) / timescale), images);
                lastTtmlCues = result;
                textTracks.addCaptions(currFragmentedTrackIdx, timestampOffset, result);

            } catch (e) {
                fragmentModel.removeExecutedRequestsBeforeTime();
                remove();
                logger.error('TTML parser error: ' + e);
            }
        }
    }

    function _appendFragmentedWebVtt(bytes, sampleList) {
        let i, j, k;

        const captionArray = [];
        const timestampOffset = _getTimestampOffset();
        for (i = 0; i < sampleList.length; i++) {
            const sample = sampleList[i];
            const start = timestampOffset + sample.cts / timescale;
            const end = start + sample.duration / timescale;
            instance.buffered.add(start, end);
            if (_getWholeSampleBoxType(bytes, sample) === 'vttn') {
                // Nothing changed: the cues that are up stay up over this sample too.
                if (lastVttEntries) {
                    captionArray.push(..._restateCues(lastVttEntries, start - timestampOffset,
                        end - timestampOffset));
                }
                continue;
            }

            const sampleData = bytes.slice(sample.offset, sample.offset + sample.size);
            // There are boxes inside the sampleData, so we need a ISOBoxer to get at it.
            const sampleBoxes = ISOBoxer.parseBuffer(sampleData);
            const entriesOfSample = [];

            for (j = 0; j < sampleBoxes.boxes.length; j++) {
                const box1 = sampleBoxes.boxes[j];
                logger.debug('VTT box1: ' + box1.type);
                if (box1.type === 'vtte') {
                    continue; //Empty box
                }
                if (box1.type === 'vttc') {
                    logger.debug('VTT vttc boxes.length = ' + box1.boxes.length);
                    let entry = {
                        styles: {}
                    };
                    for (k = 0; k < box1.boxes.length; k++) {
                        const box2 = box1.boxes[k];
                        logger.debug('VTT box2: ' + box2.type);

                        // Mandatory cue payload lines
                        if (box2.type === 'payl') {
                            entry.start = sample.cts / timescale;
                            entry.end = (sample.cts + sample.duration) / timescale;
                            entry.data = box2.cue_text;
                        }

                        // The styling information
                        else if (box2.type === 'sttg' && box2.settings && box2.settings !== '') {
                            try {
                                const stylings = box2.settings.split(' ');
                                entry.styles = vttParser.getCaptionStyles(stylings);
                            } catch (e) {

                            }
                        }
                    }
                    if (entry && entry.data) {
                        captionArray.push(entry);
                        entriesOfSample.push(entry);
                        logger.debug(`VTT  ${entry.start} - ${entry.end} :  ${entry.data}`);
                    }
                }
            }
            // A vtte clears the screen, so it leaves nothing to continue.
            lastVttEntries = entriesOfSample.length > 0 ? entriesOfSample : null;
        }
        if (captionArray.length > 0) {
            // Cue times are period-local media times; the MSE timestamp offset (Period@start - presentationTimeOffset)
            // maps them to presentation time. Required for multiperiod content, see #5087.
            textTracks.addCaptions(currFragmentedTrackIdx, timestampOffset, captionArray);
        }
    }

    function _appendText(bytes, chunk, codecType) {
        let result,
            ccContent;

        const dataView = new DataView(bytes, 0, bytes.byteLength);
        ccContent = ISOBoxer.Utils.dataViewToString(dataView, Constants.UTF8);

        try {
            result = _getParser(codecType).parse(ccContent, 0);
            textTracks.addCaptions(textTracks.getCurrentTrackIdx(), 0, result);
            if (instance.buffered) {
                instance.buffered.add(chunk.start, chunk.end);
            }
        } catch (e) {
            errHandler.error(new DashJSError(Errors.TIMED_TEXT_ERROR_ID_PARSE_CODE, Errors.TIMED_TEXT_ERROR_MESSAGE_PARSE + e.message, ccContent));
        }
    }

    function _isDiscontinuityOfChunks(embeddedLastSequenceNumber, sequenceNumber, numSequences, lastChunkEnd, chunkStart) {
        if (embeddedLastSequenceNumber === null || sequenceNumber === null || lastChunkEnd === null || chunkStart === null) {
            return false
        }
        // Sequence number is always 1 for low latency streams
        if (sequenceNumber === embeddedLastSequenceNumber) {
            // time-based continuity check
            return lastChunkEnd !== chunkStart
        }
        return sequenceNumber !== embeddedLastSequenceNumber + numSequences;
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
            const chunkStart = Math.trunc(chunk.start);
            const chunkEnd = Math.trunc(chunk.end);

            if (!embeddedCea608FieldParsers[0] && !embeddedCea608FieldParsers[1]) {
                _setupCeaParser();
            }

            if (embeddedTimescale) {
                if (_isDiscontinuityOfChunks(embeddedLastSequenceNumber, sequenceNumber, samplesInfo.numSequences, lastChunkEnd, chunkStart)) {
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
                            const time = timelineConverter.calcPresentationTimeFromMediaTime(ccData[i][0] / embeddedTimescale, chunk.representation);
                            fieldParser.addData(time, ccData[i][1]);
                        }
                    }
                }
                embeddedLastSequenceNumber = sequenceNumber;
                lastChunkEnd = chunkEnd;
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
            embeddedCea608FieldParsers[i] = new Cta608Parser(i + 1, {
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
            const ccData = extractCta608DataFromSample(raw, sample.offset, sample.size);

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

    function _getParser(codecType) {
        let parser;
        const format = _getTextFormat(codecType, codecType, sampleEntryType);
        if (format === Constants.WVTT) {
            parser = settings.get().streaming.text.webvtt.customRenderingEnabled && vttCustomRenderingParser ? vttCustomRenderingParser : vttParser;
        } else if (format === Constants.TTML) {
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
        abort,
        addEmbeddedTrack,
        addMediaInfos,
        append,
        getConfig,
        getStreamId,
        initialize,
        remove,
        reset,
        resetEmbedded,
        resetMediaInfos,
        setCurrentFragmentedTrackIdx,
    };

    setup();

    return instance;
}

TextSourceBuffer.__dashjs_factory_name = 'TextSourceBuffer';
export default FactoryMaker.getClassFactory(TextSourceBuffer);
