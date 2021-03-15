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
        shouldUseExplicitTimeForRequest,
        dashHandler,
        bufferingTime,
        replaceInProgress,
        innerPeriodSeekInProgress,
        bufferPruned;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        eventBus.on(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance, { priority: EventBus.EVENT_PRIORITY_HIGH }); // High priority to be notified before Stream
        eventBus.on(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.on(Events.SEEK_TARGET, _onSeekTarget, instance);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.on(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
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
        shouldUseExplicitTimeForRequest = false;
        bufferPruned = false;
        replaceInProgress = false;
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
        shouldUseExplicitTimeForRequest = false;
        replaceInProgress = false;
        innerPeriodSeekInProgress = false;
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
        eventBus.off(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.off(Events.SEEK_TARGET, _onSeekTarget, instance);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);
        eventBus.off(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.off(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    /**
     * When a seek within the corresponding period occurs this event handler initiates the clearing of the buffer and sets the correct buffering time.
     * @param {object} e
     * @private
     */
    function prepareInnerPeriodPlaybackSeeking(e) {
        return new Promise((resolve) => {
            // Stop segment requests until we have figured out for which time we need to request a segment. We don't want to replace existing segments.
            scheduleController.clearScheduleTimer();
            fragmentModel.abortRequests();

            // Abort operations to the SourceBuffer Sink and reset the BufferControllers isBufferingCompleted state.
            bufferController.prepareForPlaybackSeek()
                .then(() => {
                    // Clear the buffer. We need to prune everything which is not in the target interval.
                    const clearRanges = bufferController.getAllRangesWithSafetyFactor(e.seekTime);
                    // When everything has been pruned go on
                    return bufferController.clearBuffers(clearRanges);
                })
                .then(() => {
                    // Figure out the correct segment request time.
                    const targetTime = bufferController.getContiniousBufferTimeForTargetTime(e.seekTime);

                    // If the buffer is continuous and exceeds the duration of the period we are still done buffering. We need to trigger the buffering completed event in order to start prebuffering again
                    if (!isNaN(streamInfo.duration) && isFinite(streamInfo.duration) && targetTime >= streamInfo.start + streamInfo.duration) {
                        bufferController.setIsBufferingCompleted(true);
                        resolve();
                    } else {
                        setExplicitBufferingTime(targetTime);
                        bufferController.setSeekTarget(targetTime);

                        const promises = [];

                        // append window has been reset by abort() operation. Set the correct values again
                        promises.push(bufferController.updateAppendWindow());

                        // Timestamp offset couldve been changed by preloading period
                        const representationInfo = getRepresentationInfo();
                        promises.push(bufferController.updateBufferTimestampOffset(representationInfo));

                        Promise.all(promises)
                            .then(() => {
                                // We might have aborted the append operation of an init segment. Append init segment again.
                                scheduleController.setInitSegmentRequired(true);

                                // Right after a seek we should not immediately check the playback quality
                                scheduleController.setCheckPlaybackQuality(false);
                                scheduleController.startScheduleTimer();
                                resolve();
                            });
                    }
                })
                .catch((e) => {
                    logger.error(e);
                });
        });

    }

    function prepareOuterPeriodPlaybackSeeking() {
        return new Promise((resolve, reject) => {
            try {
                // Stop scheduling
                scheduleController.clearScheduleTimer();

                // Abort all ongoing requests
                fragmentModel.abortRequests();

                // buffering not complete anymore and abort current append operation to SourceBuffer
                bufferController.prepareForPlaybackSeek()
                    .then(() => {
                        // Clear the buffers completely.
                        return bufferController.pruneAllSafely();
                    })
                    .then(() => {
                        resolve();
                    });

            } catch (e) {
                reject(e);
            }
        });
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
        } else {
            _noValidRequest();
        }
    }

    function _onMediaFragmentNeeded() {
        let request = null;

        const representation = representationController.getCurrentRepresentation();
        const isMediaFinished = dashHandler.isMediaFinished(representation, bufferingTime);

        if (isMediaFinished) {
            const segmentIndex = dashHandler.getCurrentIndex();
            logger.debug(`Segment requesting for stream ${streamInfo.id} has finished`);
            console.debug(`Segment requesting for stream ${streamInfo.id} and type ${type} has finished`);
            eventBus.trigger(Events.STREAM_REQUESTING_COMPLETED, { segmentIndex }, {
                streamId: streamInfo.id,
                mediaType: type
            });
            scheduleController.clearScheduleTimer();
            return;
        }

        // Don't schedule next fragments while pruning to avoid buffer inconsistencies
        if (!bufferController.getIsPruningInProgress()) {
            request = _getFragmentRequest();
            if (request) {
                shouldUseExplicitTimeForRequest = false;
                if (!isNaN(request.startTime + request.duration)) {
                    bufferingTime = request.startTime + request.duration;
                }
                request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
                scheduleController.setTimeToLoadDelay(0);
            }
        }

        _processMediaRequest(request);
    }

    function _getFragmentRequest() {
        const representationInfo = getRepresentationInfo();
        let request;

        if (isNaN(bufferingTime) || (getType() === Constants.FRAGMENTED_TEXT && !textController.isTextEnabled())) {
            return null;
        }

        // Use time just whenever is strictly needed
        const useTime = shouldUseExplicitTimeForRequest || bufferPruned;

        if (dashHandler) {
            const representation = representationController && representationInfo ? representationController.getRepresentationForQuality(representationInfo.quality) : null;

            if (useTime) {
                request = dashHandler.getSegmentRequestForTime(getMediaInfo(), representation, bufferingTime);
            } else {
                request = dashHandler.getNextSegmentRequest(getMediaInfo(), representation);
            }
        }

        bufferPruned = false;
        return request;
    }

    function _processMediaRequest(request) {
        if (request) {
            logger.debug(`Next fragment request url for stream id ${streamInfo.id} and media type ${type} is ${request.url}`);
            fragmentModel.executeRequest(request);
        } else { // Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
            if (playbackController.getIsDynamic()) {
                logger.debug(`Next fragment for stream id ${streamInfo.id} is not available yet. We are either pruning the buffer or the segment is not completed yet. Rescheduling.`);
            }
            _noValidRequest();
        }
    }

    function _noValidRequest() {
        logger.debug(`No valid request found for ${type}`);
        scheduleController.startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? 100 : 500);
    }

    function _onDataUpdateCompleted(e) {
        if (!e.error) {
            // Update representation if no error
            scheduleController.setCurrentRepresentation(adapter.convertDataToRepresentationInfo(e.currentRepresentation));
            if (!bufferController.getIsBufferingCompleted()) {
                bufferController.updateBufferTimestampOffset(e.currentRepresentation);
            }
        }
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
        /*
        if (!innerPeriodSeekInProgress && e.from > playbackController.getTime()) {
            bufferingTime = e.from;
            bufferPruned = true;
        }
        */
    }

    /**
     * The quality has changed which means we have switched to a different representation.
     * If we want to aggressively replace existing parts in the buffer we need to make sure that the new quality is higher than the already buffered one.
     * @param e
     * @private
     */
    function _onQualityChanged(e) {
        const representationInfo = getRepresentationInfo(e.newQuality);
        scheduleController.setCurrentRepresentation(representationInfo);

        // if we switch up in quality and need to replace existing parts in the buffer we need to adjust the buffer target
        if (settings.get().streaming.fastSwitchEnabled) {
            const time = playbackController.getTime();
            const oldRepresentationInfo = getRepresentationInfo(e.oldQuality);
            let safeBufferLevel = 1.5;
            if (isNaN(oldRepresentationInfo.fragmentDuration)) { //fragmentDuration of representationInfo is not defined,
                // call metrics function to have data in the latest scheduling info...
                // if no metric, returns 0. In this case, rule will return false.
                const schedulingInfo = dashMetrics.getCurrentSchedulingInfo(type);
                safeBufferLevel = schedulingInfo ? schedulingInfo.duration * 1.5 : 1.5;
            }
            const request = fragmentModel.getRequests({
                state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                time: time + safeBufferLevel,
                threshold: 0
            })[0];

            if (request && !adapter.getIsTextTrack(mimeType)) {
                const bufferLevel = bufferController.getBufferLevel();
                const abandonmentState = abrController.getAbandonmentStateFor(type);

                if (request.quality < representationInfo.quality && bufferLevel >= safeBufferLevel && abandonmentState !== MetricsConstants.ABANDON_LOAD) {
                    setExplicitBufferingTime(time + safeBufferLevel);
                    scheduleController.setCheckPlaybackQuality(false);
                }
            }
        }

        dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        dashMetrics.createPlaylistTraceMetrics(representationInfo.id, playbackController.getTime() * 1000, playbackController.getPlaybackRate());
    }

    /**
     * We have canceled the download of a fragment and need to adjust the buffer time or reload an init segment
     * @param e
     */
    function _onFragmentLoadingAbandoned(e) {
        logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has been aborted');

        // we only need to handle this if we are not seeking or switching the tracks
        if (!playbackController.isSeeking() && !scheduleController.getSwitchStrack()) {
            logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has to be downloaded again, origin is not seeking process or switch track call');

            // in case of an init segment we force the download of an init segment
            if (e.request && e.request.isInitializationRequest()) {
                scheduleController.setInitSegmentRequired(true);
            }

            // in case of a media segment we reset the buffering time
            else {
                setExplicitBufferingTime(e.request.startTime + (e.request.duration / 2));
            }

            // In case of a seek the schedule controller was stopped and will be started once the buffer has been pruned.
            scheduleController.startScheduleTimer(0);
        }
    }

    /**
     * When a fragment has been loaded we need to start the schedule timer again in case of an error.
     * @param {object} e
     */
    function _onFragmentLoadingCompleted(e) {
        logger.info('OnFragmentLoadingCompleted for stream id ' + streamInfo.id + ' and media type ' + type + ' - Url:', e.request ? e.request.url : 'undefined', e.request.range ? ', Range:' + e.request.range : '');

        if (adapter.getIsTextTrack(mimeType)) {
            scheduleController.startScheduleTimer(0);
        }

        if (e.error && e.request.serviceLocation) {
            setExplicitBufferingTime(e.request.startTime + (e.request.duration / 2));
            scheduleController.startScheduleTimer(0);
        }
    }

    function _onQuotaExceeded(e) {
        // Stop scheduler (will be restarted once buffer is pruned)
        setExplicitBufferingTime(e.quotaExceededTime);
        scheduleController.clearScheduleTimer();
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
        if (!isBufferingCompleted()) {
            bufferController.updateAppendWindow();
        }
    }

    function getStreamInfo() {
        return streamInfo;
    }

    /**
     * Called once the StreamProcessor is initialized and when the track is switched. We only have one StreamProcessor per media type. So we need to adjust the mediaInfo once we switch/select a track.
     * @param newMediaInfo
     */
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
            selectMediaInfo(newMediaInfo);
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

    function _onMediaFragmentLoaded(e) {
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
        return (getBuffer() || bufferController ? bufferController.createBufferSink(mediaInfoArr, previousBuffers) : Promise.resolve(null));
    }

    function prepareTrackSwitch() {

        // when buffering is completed and we are not supposed to replace anything do nothing
        if (bufferController.getIsBufferingCompleted() && mediaController.getSwitchMode(type) === Constants.TRACK_SWITCH_MODE_NEVER_REPLACE) {
            return;
        }

        // We stop the schedule controller and signal a track switch. That way we request a new init segment next
        scheduleController.clearScheduleTimer();
        scheduleController.setSwitchTrack(true);

        // when we are supposed to replace it does not matter if buffering is already completed
        if (mediaController.getSwitchMode(type) === Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE && playbackController.getTimeToStreamEnd(streamInfo) > settings.get().streaming.stallThreshold) {

            // Inform other classes like the GapController that we are replacing existing stuff
            eventBus.trigger(Events.TRACK_REPLACEMENT_STARTED, {
                mediaType: type,
                streamId: streamInfo.id
            }, { mediaType: type, streamId: streamInfo.id });

            // Abort the current request it will be removed from the buffer anyways
            fragmentModel.abortRequests();

            // Abort appending segments to the buffer. Also adjust the appendWindow as we might have been in the progress of prebuffering stuff.
            bufferController.prepareForTrackSwitch()
                .then(() => {
                    // Prune everything that is in the buffer right now
                    return bufferController.pruneAllSafely(true);
                })
                .then(() => {
                    // Timestamp offset couldve been changed by preloading period
                    const representationInfo = getRepresentationInfo();
                    return bufferController.updateBufferTimestampOffset(representationInfo);
                })
                .then(() => {
                    _bufferClearedForTrackSwitch();
                })
                .catch(() => {
                    _bufferClearedForTrackSwitch();
                });
        } else {
            scheduleController.startScheduleTimer();
        }
    }

    /**
     * For an instant track switch we need to adjust the buffering time after the buffer has been pruned.
     * @private
     */
    function _bufferClearedForTrackSwitch() {
        const targetTime = playbackController.getTime();

        if (settings.get().streaming.flushBufferAtTrackSwitch) {
            // For some devices (like chromecast) it is necessary to seek the video element to reset the internal decoding buffer,
            // otherwise audio track switch will be effective only once after previous buffered track is consumed
            playbackController.seek(targetTime + 0.001, false, true);
        }

        setExplicitBufferingTime(targetTime);
        bufferController.setSeekTarget(targetTime);
        scheduleController.startScheduleTimer();
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

    function _onSeekTarget(e) {
        if (e && e.time) {
            setExplicitBufferingTime(e.time);
            bufferController.setSeekTarget(e.time);
        }
    }

    function setExplicitBufferingTime(value) {
        bufferingTime = value;
        shouldUseExplicitTimeForRequest = true;
    }

    function resetDashHandler() {
        if (dashHandler) {
            dashHandler.resetIndex();
        }
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
        prepareTrackSwitch,
        getMediaInfoArr,
        getMediaInfo,
        getMediaSource,
        setMediaSource,
        getBuffer,
        setBuffer,
        setExplicitBufferingTime,
        resetDashHandler,
        finalisePlayList,
        probeNextRequest,
        prepareInnerPeriodPlaybackSeeking,
        prepareOuterPeriodPlaybackSeeking,
        reset
    };

    setup();

    return instance;
}

StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
