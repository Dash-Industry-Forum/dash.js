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
import FactoryMaker from '../core/FactoryMaker';
import {checkInteger} from './utils/SupervisorTools';
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import DashHandler from '../dash/DashHandler';
import Errors from '../core/errors/Errors';
import DashJSError from './vo/DashJSError';
import Debug from '../core/Debug';
import RequestModifier from './utils/RequestModifier';
import URLUtils from '../streaming/utils/URLUtils';
import BoxParser from './utils/BoxParser';
import {PlayListTrace} from './vo/metrics/PlayList';

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
        logger,
        isDynamic,
        mediaInfo,
        mediaInfoArr,
        bufferController,
        scheduleController,
        representationController,
        seekTime,
        dashHandler,
        bufferingTime,
        bufferPruned;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        eventBus.on(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance, { priority: EventBus.EVENT_PRIORITY_HIGH }); // High priority to be notified before Stream
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);
        eventBus.on(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.on(Events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.on(Events.INNER_PERIOD_PLAYBACK_SEEKING, _onInnerPeriodPlaybackSeeking, instance);
        eventBus.on(Events.OUTER_PERIOD_PLAYBACK_SEEKING, _onOuterPeriodPlaybackSeeking, instance);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.on(Events.SEEK_TARGET, onSeekTarget, instance);
        eventBus.on(Events.BUFFER_CLEARED_ALL_RANGES, _onBufferClearedForSeek, instance);
    }

    function initialize(mediaSource, hasVideoTrack) {
        dashHandler = DashHandler(context).create({
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

        isDynamic = streamInfo.manifestInfo.isDynamic;

        // Create/initialize controllers
        dashHandler.initialize(isDynamic);
        abrController.registerStreamType(type, instance);

        representationController = RepresentationController(context).create({
            streamInfo: streamInfo,
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
            streamInfo: streamInfo,
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

        scheduleController.initialize(hasVideoTrack);

        bufferingTime = 0;
        seekTime = NaN;
        bufferPruned = false;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        mediaInfo = null;
        bufferingTime = 0;
        seekTime = NaN;
    }

    function reset(errored, keepBuffers) {
        if (dashHandler) {
            dashHandler.reset();
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

        if (abrController && !keepBuffers) {
            abrController.unRegisterStreamType(type, getStreamId());
        }

        eventBus.off(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);
        eventBus.off(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.off(Events.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(Events.INNER_PERIOD_PLAYBACK_SEEKING, _onInnerPeriodPlaybackSeeking, instance);
        eventBus.off(Events.OUTER_PERIOD_PLAYBACK_SEEKING, _onOuterPeriodPlaybackSeeking, instance);
        eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.off(Events.SEEK_TARGET, onSeekTarget, instance);
        eventBus.off(Events.BUFFER_CLEARED_ALL_RANGES, _onBufferClearedForSeek, instance);

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    /**
     * When a period within the corresponding period occurs this event handler initiates the clearing of the buffer and sets the correct buffering time.
     * @param {object} e
     * @private
     */
    function _onInnerPeriodPlaybackSeeking(e) {
        // Stop segment requests until we have figured out for which time we need to request a segment. We don't want to replace existing segments.
        scheduleController.stop();
        fragmentModel.abortRequests();

        seekTime = e.seekTime;
        bufferController.prepareForPlaybackSeek();

        // Clear the buffer. We need to prune everything which is not in the target interval.
        const clearRanges = bufferController.getAllRangesWithSafetyFactor(seekTime);
        // When everything has been pruned _onBufferClearedForSeek will be triggered
        bufferController.clearBuffers(clearRanges);
    }

    function _onOuterPeriodPlaybackSeeking() {
        // Stop segment requests
        scheduleController.stop();
        fragmentModel.abortRequests();

        if (type !== Constants.FRAGMENTED_TEXT) {
            // remove buffer after seeking operations
            bufferController.pruneAllSafely();
        } else {
            eventBus.trigger(Events.BUFFER_CLEARED_FOR_STREAM_SWITCH, { mediaType: type });
        }
    }

    function _onBufferClearedForSeek() {
        if (isNaN(seekTime)) {
            return;
        }

        bufferController.updateBufferLevel();

        // Figure out the correct segment request time
        const targetTime = bufferController.getContiniousBufferTimeForTargetTime(seekTime);
        seekTime = targetTime;
        scheduleController.start();
    }

    function _onInitFragmentNeeded(e) {
        // Event propagation may have been stopped (see MssHandler)
        if (!e.sender) return;

        if (adapter.getIsTextTrack(mimeType) && !textController.isTextEnabled()) return;

        if (bufferController && e.representationId) {
            if (!bufferController.appendInitSegmentFromCache(e.representationId)) {
                // Init segment not in cache, send new request
                const request = dashHandler ? dashHandler.getInitRequest(getMediaInfo(), representationController.getCurrentRepresentation()) : null;
                _processInitRequest(request);
            }
        }
    }

    function _processInitRequest(request) {
        if (request) {
            fragmentModel.executeRequest(request);
        }
    }

    function _onMediaFragmentNeeded(e) {
        let request = null;

        const ignoreIsFinished = !!e.replacement;
        const representation = representationController.getCurrentRepresentation();
        const isMediaFinished = !ignoreIsFinished ? dashHandler.isMediaFinished(representation) : false;

        if (isMediaFinished) {
            const segmentIndex = dashHandler.getCurrentIndex();
            logger.debug(`Segment requesting for stream ${streamInfo.id} has finished`);
            eventBus.trigger(Events.STREAM_REQUESTING_COMPLETED, {segmentIndex}, { streamId: streamInfo.id, mediaType: type });
            return;
        }

        // Don't schedule next fragments while pruning to avoid buffer inconsistencies
        if (!bufferController.getIsPruningInProgress()) {
            request = _findNextRequest(e.replacement);
            if (request) {
                seekTime = NaN;
                if (!e.replacement) {
                    if (!isNaN(request.startTime + request.duration)) {
                        bufferingTime = request.startTime + request.duration;
                    }
                    request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
                    scheduleController.setTimeToLoadDelay(0);
                }
            }
        }

        _processMediaRequest(request);
    }

    function _findNextRequest(requestToReplace) {
        const representationInfo = getRepresentationInfo();
        const hasSeekTarget = !isNaN(seekTime);
        let time = seekTime ? seekTime : bufferingTime;
        let request;

        if (isNaN(time) || (getType() === Constants.FRAGMENTED_TEXT && !textController.isTextEnabled())) {
            return null;
        }

        if (requestToReplace) {
            time = requestToReplace.startTime + (requestToReplace.duration / 2);
            request = _getFragmentRequest(representationInfo, time, {
                timeThreshold: 0,
                ignoreIsFinished: true
            });
        } else {
            // Use time just whenever is strictly needed
            const useTime = hasSeekTarget || bufferPruned;
            request = _getFragmentRequest(representationInfo,
                useTime ? time : undefined, {
                    keepIdx: !useTime
                });
            bufferPruned = false;
        }

        return request;
    }

    function _processMediaRequest(request) {
        if (request) {
            logger.debug(`Next fragment request url for stream id ${streamInfo.id} is ${request.url}`);
            fragmentModel.executeRequest(request);
        } else { // Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
            if (playbackController.getIsDynamic()) {
                logger.debug(`Next fragment for stream id ${streamInfo.id} seems to be at the bleeding live edge and is not available yet. Rescheduling.`);
            }
            scheduleController.setFragmentProcessState(false);
            scheduleController.startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? 100 : 500);
        }
    }

    function _onDataUpdateCompleted(e) {
        if (!e.error) {
            // Update representation if no error
            scheduleController.setCurrentRepresentation(adapter.convertDataToRepresentationInfo(e.currentRepresentation));
        }
    }

    function _onQualityChanged(e) {
        let representationInfo = getRepresentationInfo(e.newQuality);
        scheduleController.setCurrentRepresentation(representationInfo);
        dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        dashMetrics.createPlaylistTraceMetrics(representationInfo.id, playbackController.getTime() * 1000, playbackController.getPlaybackRate());
    }

    function _onBufferLevelUpdated(e) {
        dashMetrics.addBufferLevel(type, new Date(), e.bufferLevel * 1000);
    }

    function _onBufferLevelStateChanged(e) {
        dashMetrics.addBufferState(type, e.state, scheduleController.getBufferTarget());
        if (e.state === MetricsConstants.BUFFER_EMPTY && !playbackController.isSeeking()) {
            // logger.info('Buffer is empty! Stalling!');
            dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REBUFFERING_REASON);
        }
    }

    function _onBufferCleared(e) {
        // Remove executed requests not buffered anymore
        fragmentModel.syncExecutedRequestsWithBufferedRange(
            bufferController.getBuffer().getAllBufferRanges(),
            streamInfo.duration);

        // If buffer removed ahead current time (QuotaExceededError or automatic buffer pruning) then adjust current index handler time
        if (e.from > playbackController.getTime()) {
            bufferingTime = e.from;
            bufferPruned = true;
        }
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
        if (settings.get().streaming.useAppendWindow && !isBufferingCompleted()) {
            bufferController.updateAppendWindow();
        }
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
            const minIdx = abrController.getMinAllowedIndexFor(type, streamInfo.id);

            let quality,
                averageThroughput;
            let bitrate = null;

            if ((realAdaptation === null || (realAdaptation.id !== newRealAdaptation.id)) && type !== Constants.FRAGMENTED_TEXT) {
                averageThroughput = abrController.getThroughputHistory().getAverageThroughput(type);
                bitrate = averageThroughput || abrController.getInitialBitrateFor(type);
                quality = abrController.getQualityForBitrate(mediaInfo, bitrate, streamInfo.id);
            } else {
                quality = abrController.getQualityFor(type, streamInfo.id);
            }

            if (minIdx !== undefined && quality < minIdx) {
                quality = minIdx;
            }
            if (quality > maxQuality) {
                quality = maxQuality;
            }
            dashHandler.setMimeType(mediaInfo ? mediaInfo.mimeType : null);
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

    /**
     * Probe the next request. This is used in the CMCD model to get information about the upcoming request. Note: No actual request is performed here.
     * @return {FragmentRequest|null}
     */
    function probeNextRequest() {
        const representationInfo = getRepresentationInfo();

        const representation = representationController && representationInfo ?
            representationController.getRepresentationForQuality(representationInfo.quality) : null;

        let request = dashHandler.getNextSegmentRequestIdempotent(
            getMediaInfo(),
            representation
        );

        return request;
    }

    function onMediaFragmentLoaded(e) {
        const chunk = e.chunk;

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
            eventBus.trigger(Events.INBAND_EVENTS,
                { events: events },
                { streamId: streamInfo.id }
            );
        }
    }

    function handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
        try {
            const eventStreams = {};
            const events = [];

            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            const inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
            for (let i = 0, ln = inbandEvents.length; i < ln; i++) {
                eventStreams[inbandEvents[i].schemeIdUri + '/' + inbandEvents[i].value] = inbandEvents[i];
            }

            const isoFile = BoxParser(context).getInstance().parse(data);
            const eventBoxes = isoFile.getBoxes('emsg');

            if (!eventBoxes || eventBoxes.length === 0) {
                return events;
            }

            const sidx = isoFile.getBox('sidx');
            const mediaAnchorTime = sidx && !isNaN(sidx.earliest_presentation_time) && !isNaN(sidx.timescale) ? sidx.earliest_presentation_time / sidx.timescale : request && !isNaN(request.mediaStartTime) ? request.mediaStartTime : 0;
            const fragmentMediaStartTime = Math.max(mediaAnchorTime, 0);
            const voRepresentation = representationController.getCurrentRepresentation();

            for (let i = 0, ln = eventBoxes.length; i < ln; i++) {
                const event = adapter.getEvent(eventBoxes[i], eventStreams, fragmentMediaStartTime, voRepresentation);

                if (event) {
                    events.push(event);
                }
            }

            return events;
        } catch (e) {
            return [];
        }
    }

    function createBufferSinks(previousBuffers) {
        return (getBuffer() || bufferController ? bufferController.createBufferSink(mediaInfoArr, previousBuffers) : null);
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

    function onSeekTarget(e) {
        if (e && e.time) {
            seekTime = e.time;
        }
    }

    function setBufferingTime(value) {
        bufferingTime = value;
    }

    function resetDashHandler() {
        if (dashHandler) {
            dashHandler.resetIndex();
        }
    }

    function _getFragmentRequest(representationInfo, time, options) {
        let fragRequest = null;

        if (dashHandler) {
            const representation = representationController && representationInfo ? representationController.getRepresentationForQuality(representationInfo.quality) : null;

            // if time and options are undefined, it means the next segment is requested
            // otherwise, the segment at this specific time is requested.
            if (time !== undefined && options !== undefined) {
                fragRequest = dashHandler.getSegmentRequestForTime(getMediaInfo(), representation, time, options);
            } else {
                fragRequest = dashHandler.getNextSegmentRequest(getMediaInfo(), representation);
            }
        }

        return fragRequest;
    }

    function finalisePlayList(time, reason) {
        dashMetrics.pushPlayListTraceMetrics(time, reason);
    }

    instance = {
        initialize,
        getStreamId,
        getType,
        isUpdating,
        getBufferController,
        getFragmentModel,
        getScheduleController,
        getRepresentationController,
        getRepresentationInfo,
        getBufferLevel,
        isBufferingCompleted,
        createBufferSinks,
        updateStreamInfo,
        getStreamInfo,
        selectMediaInfo,
        addMediaInfo,
        switchTrackAsked,
        getMediaInfoArr,
        getMediaInfo,
        getMediaSource,
        setMediaSource,
        dischargePreBuffer,
        getBuffer,
        setBuffer,
        setBufferingTime,
        resetDashHandler,
        finalisePlayList,
        probeNextRequest,
        reset
    };

    setup();

    return instance;
}

StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
