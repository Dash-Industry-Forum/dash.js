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
import Constants from './constants/Constants';
import DashConstants from '../dash/constants/DashConstants';
import MetricsConstants from './constants/MetricsConstants';
import FragmentModel from './models/FragmentModel';
import BufferController from './controllers/BufferController';
import TextBufferController from './text/TextBufferController';
import ScheduleController from './controllers/ScheduleController';
import RepresentationController from '../dash/controllers/RepresentationController';
import LiveEdgeFinder from './utils/LiveEdgeFinder';
import FactoryMaker from '../core/FactoryMaker';
import { checkInteger } from './utils/SupervisorTools';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import DashHandler from '../dash/DashHandler';
import Errors from '../core/errors/Errors';
import DashJSError from './vo/DashJSError';
import Debug from '../core/Debug';
import RequestModifier from './utils/RequestModifier';
import URLUtils from '../streaming/utils/URLUtils';
import BoxParser from './utils/BoxParser';
import FragmentRequest from './vo/FragmentRequest';
import { PlayListTrace } from './vo/metrics/PlayList';

function StreamProcessor(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let streamInfo = config.streamInfo;
    let type = config.type;
    let errHandler = config.errHandler;
    let mimeType = config.mimeType;
    let timelineConverter = config.timelineConverter;
    let adapter = config.adapter;
    let manifestModel = config.manifestModel;
    let mediaPlayerModel = config.mediaPlayerModel;
    let fragmentModel = config.fragmentModel;
    let abrController = config.abrController;
    let playbackController = config.playbackController;
    let mediaController = config.mediaController;
    let textController = config.textController;
    let dashMetrics = config.dashMetrics;
    let settings = config.settings;
    let boxParser = config.boxParser;

    let instance,
        isDynamic,
        mediaInfo,
        mediaInfoArr,
        bufferController,
        scheduleController,
        representationController,
        liveEdgeFinder,
        indexHandler,
        streamInitialized;

    function setup() {
        resetInitialSettings();

        eventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, instance);
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.on(Events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_NEEDED, onMediaFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.on(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, instance);
        eventBus.on(Events.BUFFER_CLEARED, onBufferCleared, instance);
        eventBus.on(Events.SEEK_TARGET, onSeekTarget, instance);
    }

    function initialize(mediaSource, hasVideoTrack) {
        indexHandler = DashHandler(context).create({
            streamInfo: streamInfo,
            type: type,
            timelineConverter: timelineConverter,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            baseURLController: config.baseURLController,
            errHandler: errHandler,
            settings: settings,
            boxParser: boxParser,
            events: Events,
            eventBus: eventBus,
            errors: Errors,
            debug: Debug(context).getInstance(),
            requestModifier: RequestModifier(context).getInstance(),
            dashConstants: DashConstants,
            constants: Constants,
            urlUtils: URLUtils(context).getInstance()
        });

        // Create live edge finder for dynamic streams
        isDynamic = streamInfo.manifestInfo.isDynamic;
        if (isDynamic) {
            liveEdgeFinder = LiveEdgeFinder(context).create({
                timelineConverter: timelineConverter
            });
        }

        // Create/initialize controllers
        indexHandler.initialize(isDynamic);
        abrController.registerStreamType(type, instance);

        representationController = RepresentationController(context).create({
            streamId: streamInfo.id,
            type: type,
            abrController: abrController,
            dashMetrics: dashMetrics,
            playbackController: playbackController,
            timelineConverter: timelineConverter,
            dashConstants: DashConstants,
            events: Events,
            eventBus: eventBus,
            errors: Errors
        });

        bufferController = createBufferControllerForType(type);
        if (bufferController) {
            bufferController.initialize(mediaSource);
        }

        scheduleController = ScheduleController(context).create({
            streamId: streamInfo.id,
            type: type,
            mimeType: mimeType,
            adapter: adapter,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            fragmentModel: fragmentModel,
            abrController: abrController,
            playbackController: playbackController,
            textController: textController,
            mediaController: mediaController,
            bufferController: bufferController,
            settings: settings
        });

        if (adapter.getIsTextTrack(mimeType)) {
            eventBus.on(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        scheduleController.initialize(hasVideoTrack);

        streamInitialized = false;
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        mediaInfo = null;
    }

    function reset(errored, keepBuffers) {
        if (indexHandler) {
            indexHandler.reset();
        }

        if (bufferController) {
            bufferController.reset(errored, keepBuffers);
            bufferController = null;
        }

        if (scheduleController) {
            scheduleController.reset();
            scheduleController = null;
        }

        if (representationController) {
            representationController.reset();
            representationController = null;
        }

        if (liveEdgeFinder) {
            liveEdgeFinder.reset();
            liveEdgeFinder = null;
        }

        if (abrController) {
            abrController.unRegisterStreamType(type);
        }

        eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, instance);
        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChanged, instance);
        eventBus.off(Events.INIT_FRAGMENT_NEEDED, onInitFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, onMediaFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.off(Events.BUFFER_LEVEL_UPDATED, onBufferLevelUpdated, instance);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, onBufferLevelStateChanged, instance);
        eventBus.off(Events.BUFFER_CLEARED, onBufferCleared, instance);
        eventBus.off(Events.SEEK_TARGET, onSeekTarget, instance);

        if (adapter.getIsTextTrack(mimeType)) {
            eventBus.off(Events.TIMED_TEXT_REQUESTED, onTimedTextRequested, this);
        }

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    function onStreamInitialized(e) {
        if (!e.streamInfo || streamInfo.id !== e.streamInfo.id) return;

        if (!streamInitialized) {
            streamInitialized = true;
            if (isDynamic) {
                timelineConverter.setTimeSyncCompleted(true);
                setLiveEdgeSeekTarget();
            } else {
                const seekTarget = playbackController.getStreamStartTime(false);
                bufferController.setSeekStartTime(seekTarget);
                scheduleController.setCurrentRepresentation(getRepresentationInfo());
                scheduleController.setSeekTarget(seekTarget);
            }
        }

        scheduleController.start();
    }

    function onDataUpdateCompleted(e) {
        if (e.sender.getType() !== getType() || e.sender.getStreamId() !== streamInfo.id || !e.error || e.error.code !== Errors.SEGMENTS_UPDATE_FAILED_ERROR_CODE) return;
        scheduleController.setCurrentRepresentation(adapter.convertDataToRepresentationInfo(e.currentRepresentation));
        addDVRMetric();
    }

    function onQualityChanged(e) {
        if (type !== e.mediaType || streamInfo.id !== e.streamInfo.id) return;
        let representationInfo = getRepresentationInfo(e.newQuality);
        scheduleController.setCurrentRepresentation(representationInfo);
        dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        dashMetrics.createPlaylistTraceMetrics(representationInfo.id, playbackController.getTime() * 1000, playbackController.getPlaybackRate());
    }

    function onBufferLevelUpdated(e) {
        if (e.streamId !== streamInfo.id || e.mediaType !== type) return;

        if (!manifestModel.getValue().doNotUpdateDVRWindowOnBufferUpdated) {
            addDVRMetric();
        }
    }

    function onBufferLevelStateChanged(e) {
        if (e.streamId !== streamInfo.id || e.mediaType !== type) return;

        dashMetrics.addBufferState(type, e.state, scheduleController.getBufferTarget());
        if (e.state === MetricsConstants.BUFFER_EMPTY && !playbackController.isSeeking()) {
            // logger.info('Buffer is empty! Stalling!');
            dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REBUFFERING_REASON);
        }
    }

    function onBufferCleared(e) {
        if (e.streamId !== streamInfo.id || e.mediaType !== type) return;

        if (e.unintended) {
            // There was an unintended buffer remove, probably creating a gap in the buffer, remove every saved request
            fragmentModel.removeExecutedRequestsAfterTime(e.from);
        } else {
            fragmentModel.syncExecutedRequestsWithBufferedRange(
                bufferController.getBuffer().getAllBufferRanges(),
                streamInfo.duration);
        }
    }

    function addDVRMetric() {
        const manifestInfo = streamInfo.manifestInfo;
        const isDynamic = manifestInfo.isDynamic;
        const range = timelineConverter.calcSegmentAvailabilityRange(representationController.getCurrentRepresentation(), isDynamic);
        dashMetrics.addDVRInfo(getType(), playbackController.getTime(), manifestInfo, range);
    }

    function getType() {
        return type;
    }

    function getRepresentationController() {
        return representationController;
    }

    function getBuffer() {
        return bufferController ? bufferController.getBuffer() : null;
    }

    function setBuffer(buffer) {
        bufferController.setBuffer(buffer);
    }

    function getBufferController() {
        return bufferController;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function updateStreamInfo(newStreamInfo) {
        streamInfo = newStreamInfo;
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function selectMediaInfo(newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
            mediaInfo = newMediaInfo;
        }

        const newRealAdaptation = adapter.getRealAdaptation(streamInfo, mediaInfo);
        const voRepresentations = adapter.getVoRepresentations(mediaInfo);

        if (representationController) {
            const realAdaptation = representationController.getData();
            const maxQuality = abrController.getTopQualityIndexFor(type, streamInfo.id);
            const minIdx = abrController.getMinAllowedIndexFor(type);

            let quality,
                averageThroughput;
            let bitrate = null;

            if ((realAdaptation === null || (realAdaptation.id != newRealAdaptation.id)) && type !== Constants.FRAGMENTED_TEXT) {
                averageThroughput = abrController.getThroughputHistory().getAverageThroughput(type);
                bitrate = averageThroughput || abrController.getInitialBitrateFor(type);
                quality = abrController.getQualityForBitrate(mediaInfo, bitrate);
            } else {
                quality = abrController.getQualityFor(type);
            }

            if (minIdx !== undefined && quality < minIdx) {
                quality = minIdx;
            }
            if (quality > maxQuality) {
                quality = maxQuality;
            }
            indexHandler.setMimeType(mediaInfo ? mediaInfo.mimeType : null);
            representationController.updateData(newRealAdaptation, voRepresentations, type, quality);
        }
    }

    function addMediaInfo(newMediaInfo, selectNewMediaInfo) {
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
            mediaInfoArr.push(newMediaInfo);
        }

        if (selectNewMediaInfo) {
            this.selectMediaInfo(newMediaInfo);
        }
    }

    function getMediaInfoArr() {
        return mediaInfoArr;
    }

    function getMediaInfo() {
        return mediaInfo;
    }

    function getMediaSource() {
        return bufferController.getMediaSource();
    }

    function setMediaSource(mediaSource) {
        bufferController.setMediaSource(mediaSource, getMediaInfoArr());
    }

    function dischargePreBuffer() {
        bufferController.dischargePreBuffer();
    }

    function getScheduleController() {
        return scheduleController;
    }

    /**
     * Get a specific voRepresentation. If quality parameter is defined, this function will return the voRepresentation for this quality.
     * Otherwise, this function will return the current voRepresentation used by the representationController.
     * @param {number} quality - quality index of the voRepresentaion expected.
     */
    function getRepresentationInfo(quality) {
        let voRepresentation;

        if (quality !== undefined) {
            checkInteger(quality);
            voRepresentation = representationController ? representationController.getRepresentationForQuality(quality) : null;
        } else {
            voRepresentation = representationController ? representationController.getCurrentRepresentation() : null;
        }

        return adapter.convertDataToRepresentationInfo(voRepresentation);
    }

    function isBufferingCompleted() {
        return bufferController ? bufferController.getIsBufferingCompleted() : false;
    }

    function getBufferLevel() {
        return bufferController ? bufferController.getBufferLevel() : 0;
    }

    function onInitFragmentNeeded(e) {
        if (!e.sender || e.sender.getType() !== type || e.sender.getStreamId() !== streamInfo.id) return;

        if (bufferController && e.representationId) {
            if (!bufferController.appendInitSegment(e.representationId)) {
                // Init segment not in cache, send new request
                const request = indexHandler ? indexHandler.getInitRequest(getMediaInfo(), representationController.getCurrentRepresentation()) : null;
                scheduleController.processInitRequest(request);
            }
        }
    }

    function onMediaFragmentNeeded(e) {
        if (e.sender.getType() !== type || e.sender.getStreamId() !== streamInfo.id) return;

        let request;

        // Don't schedule next fragments while pruning to avoid buffer inconsistencies
        if (!bufferController.getIsPruningInProgress()) {
            request = findNextRequest(e.seekTarget, e.replacement);
            scheduleController.setSeekTarget(NaN);
            if (request && !e.replacement) {
                if (!isNaN(request.startTime + request.duration)) {
                    setIndexHandlerTime(request.startTime + request.duration);
                }
                request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
                scheduleController.setTimeToLoadDelay(0);
            }
        }

        scheduleController.processMediaRequest(request);
    }

    function findNextRequest(seekTarget, requestToReplace) {
        const representationInfo = getRepresentationInfo();
        const hasSeekTarget = !isNaN(seekTarget);
        const currentTime = playbackController.getNormalizedTime();
        let time = hasSeekTarget ? seekTarget : getIndexHandlerTime();
        let bufferIsDivided = false;
        let request;

        if (isNaN(time) || (getType() === Constants.FRAGMENTED_TEXT && !textController.isTextEnabled())) {
            return null;
        }
        /**
         * This is critical for IE/Safari/EDGE
         * */
        if (bufferController) {
            let range = bufferController.getRangeAt(time);
            const playingRange = bufferController.getRangeAt(currentTime);
            if ((range !== null || playingRange !== null) && !hasSeekTarget) {
                if (!range || (playingRange && playingRange.start != range.start && playingRange.end != range.end)) {
                    const hasDiscontinuities = bufferController.getBuffer().hasDiscontinuitiesAfter(currentTime);
                    if (hasDiscontinuities && getType() !== Constants.FRAGMENTED_TEXT) {
                        fragmentModel.removeExecutedRequestsAfterTime(playingRange.end);
                        bufferIsDivided = true;
                    }
                }
            }
        }

        if (requestToReplace) {
            time = requestToReplace.startTime + (requestToReplace.duration / 2);
            request = getFragmentRequest(representationInfo, time, {
                timeThreshold: 0,
                ignoreIsFinished: true
            });
        } else {
            // Use time just whenever is strictly needed
            request = getFragmentRequest(representationInfo,
                hasSeekTarget || bufferIsDivided ? time : undefined, {
                keepIdx: !hasSeekTarget && !bufferIsDivided
            });

            // Then, check if this request was downloaded or not
            while (request && request.action !== FragmentRequest.ACTION_COMPLETE && fragmentModel.isFragmentLoaded(request)) {
                // loop until we found not loaded fragment, or no fragment
                request = getFragmentRequest(representationInfo);
            }
        }

        return request;
    }

    function onTimedTextRequested(e) {
        if (e.sender.getStreamId() !== streamInfo.id) return;

        //if subtitles are disabled, do not download subtitles file.
        if (textController.isTextEnabled()) {
            const representation = representationController ? representationController.getRepresentationForQuality(e.index) : null;
            const request = indexHandler ? indexHandler.getInitRequest(getMediaInfo(), representation) : null;
            scheduleController.processInitRequest(request);
        }
    }

    function onMediaFragmentLoaded(e) {
        const chunk = e.chunk;
        if (chunk.streamId !== streamInfo.id || chunk.mediaInfo.type != type) return;

        const bytes = chunk.bytes;
        const quality = chunk.quality;
        const currentRepresentation = getRepresentationInfo(quality);
        const voRepresentation = representationController && currentRepresentation ? representationController.getRepresentationForQuality(currentRepresentation.quality) : null;
        const eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo);
        const eventStreamTrack = adapter.getEventsFor(currentRepresentation, voRepresentation);

        if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
            const request = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                quality: quality,
                index: chunk.index
            })[0];

            const events = handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
            eventBus.trigger(Events.ADD_INBAND_EVENTS_REQUESTED, { sender: instance, events: events });
        }
    }

    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
        const fragmentStartTime = Math.max(!request || isNaN(request.startTime) ? 0 : request.startTime, 0);
        const eventStreams = [];
        const events = [];

        /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
        const inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
        for (let i = 0, ln = inbandEvents.length; i < ln; i++) {
            eventStreams[inbandEvents[i].schemeIdUri + '/' + inbandEvents[i].value] = inbandEvents[i];
        }

        const isoFile = BoxParser(context).getInstance().parse(data);
        const eventBoxes = isoFile.getBoxes('emsg');

        for (let i = 0, ln = eventBoxes.length; i < ln; i++) {
            const event = adapter.getEvent(eventBoxes[i], eventStreams, fragmentStartTime);

            if (event) {
                events.push(event);
            }
        }

        return events;
    }

    function createBuffer(previousBuffers) {
        return (getBuffer() || bufferController ? bufferController.createBuffer(mediaInfoArr, previousBuffers) : null);
    }

    function switchTrackAsked() {
        scheduleController.switchTrackAsked();
    }

    function createBufferControllerForType(type) {
        let controller = null;

        if (!type) {
            errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + 'not properly defined'));
            return null;
        }

        if (type === Constants.VIDEO || type === Constants.AUDIO) {
            controller = BufferController(context).create({
                streamInfo: streamInfo,
                type: type,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                fragmentModel: fragmentModel,
                errHandler: errHandler,
                mediaController: mediaController,
                representationController: representationController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                settings: settings
            });
        } else {
            controller = TextBufferController(context).create({
                streamInfo: streamInfo,
                type: type,
                mimeType: mimeType,
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                manifestModel: manifestModel,
                fragmentModel: fragmentModel,
                errHandler: errHandler,
                mediaController: mediaController,
                representationController: representationController,
                adapter: adapter,
                textController: textController,
                abrController: abrController,
                playbackController: playbackController,
                settings: settings
            });
        }

        return controller;
    }

    function setLiveEdgeSeekTarget() {
        if (!liveEdgeFinder) return;

        const currentRepresentationInfo = getRepresentationInfo();
        const liveEdge = liveEdgeFinder.getLiveEdge(currentRepresentationInfo);
        const startTime = liveEdge - playbackController.computeLiveDelay(currentRepresentationInfo.fragmentDuration, currentRepresentationInfo.mediaInfo.streamInfo.manifestInfo.DVRWindowSize);
        const request = getFragmentRequest(currentRepresentationInfo, startTime, {
            ignoreIsFinished: true
        });

        if (request) {
            // When low latency mode is selected but browser doesn't support fetch
            // start at the beginning of the segment to avoid consuming the whole buffer
            if (settings.get().streaming.lowLatencyEnabled) {
                const liveStartTime = request.duration < mediaPlayerModel.getLiveDelay() ? request.startTime : request.startTime + request.duration - mediaPlayerModel.getLiveDelay();
                playbackController.setLiveStartTime(liveStartTime);
            } else {
                playbackController.setLiveStartTime(request.startTime);
            }
        }

        const seekTarget = playbackController.getStreamStartTime(false, liveEdge);
        bufferController.setSeekStartTime(seekTarget);
        scheduleController.setCurrentRepresentation(currentRepresentationInfo);
        scheduleController.setSeekTarget(seekTarget);
        scheduleController.start();

        // For multi periods stream, if the startTime is beyond current period then seek to corresponding period (see StreamController::onPlaybackSeeking)
        if (seekTarget > (currentRepresentationInfo.mediaInfo.streamInfo.start + currentRepresentationInfo.mediaInfo.streamInfo.duration)) {
            playbackController.seek(seekTarget);
        }

        dashMetrics.updateManifestUpdateInfo({
            currentTime: seekTarget,
            presentationStartTime: liveEdge,
            latency: liveEdge - seekTarget,
            clientTimeOffset: timelineConverter.getClientTimeOffset()
        });
    }

    function onSeekTarget(e) {
        if (e.mediaType !== type || e.streamId !== streamInfo.id) return;

        setIndexHandlerTime(e.time);
        scheduleController.setSeekTarget(e.time);
    }

    function setIndexHandlerTime(value) {
        if (indexHandler) {
            indexHandler.setCurrentTime(value);
        }
    }

    function getIndexHandlerTime() {
        return indexHandler ? indexHandler.getCurrentTime() : NaN;
    }

    function resetIndexHandler() {
        if (indexHandler) {
            indexHandler.resetIndex();
        }
    }

    function getInitRequest(quality) {
        checkInteger(quality);
        const representation = representationController ? representationController.getRepresentationForQuality(quality) : null;
        return indexHandler ? indexHandler.getInitRequest(getMediaInfo(), representation) : null;
    }

    function getFragmentRequest(representationInfo, time, options) {
        let fragRequest = null;

        if (indexHandler) {
            const representation = representationController && representationInfo ? representationController.getRepresentationForQuality(representationInfo.quality) : null;

            // if time and options are undefined, it means the next segment is requested
            // otherwise, the segment at this specific time is requested.
            if (time !== undefined && options !== undefined) {
                fragRequest = indexHandler.getSegmentRequestForTime(getMediaInfo(), representation, time, options);
            } else {
                fragRequest = indexHandler.getNextSegmentRequest(getMediaInfo(), representation);
            }
        }

        return fragRequest;
    }

    function finalisePlayList(time, reason) {
        dashMetrics.pushPlayListTraceMetrics(time, reason);
    }

    instance = {
        initialize: initialize,
        isUpdating: isUpdating,
        getType: getType,
        getBufferController: getBufferController,
        getFragmentModel: getFragmentModel,
        getScheduleController: getScheduleController,
        getRepresentationController: getRepresentationController,
        getRepresentationInfo: getRepresentationInfo,
        getBufferLevel: getBufferLevel,
        isBufferingCompleted: isBufferingCompleted,
        createBuffer: createBuffer,
        updateStreamInfo: updateStreamInfo,
        getStreamInfo: getStreamInfo,
        selectMediaInfo: selectMediaInfo,
        addMediaInfo: addMediaInfo,
        switchTrackAsked: switchTrackAsked,
        getMediaInfoArr: getMediaInfoArr,
        getMediaInfo: getMediaInfo,
        getMediaSource: getMediaSource,
        setMediaSource: setMediaSource,
        dischargePreBuffer: dischargePreBuffer,
        getBuffer: getBuffer,
        setBuffer: setBuffer,
        setIndexHandlerTime: setIndexHandlerTime,
        getIndexHandlerTime: getIndexHandlerTime,
        resetIndexHandler: resetIndexHandler,
        getInitRequest: getInitRequest,
        getFragmentRequest: getFragmentRequest,
        finalisePlayList: finalisePlayList,
        reset: reset
    };

    setup();

    return instance;
}
StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
