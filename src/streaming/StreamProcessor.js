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
import Constants from './constants/Constants.js';
import DashConstants from '../dash/constants/DashConstants.js';
import MetricsConstants from './constants/MetricsConstants.js';
import FragmentModel from './models/FragmentModel.js';
import BufferController from './controllers/BufferController.js';
import NotFragmentedTextBufferController from './text/NotFragmentedTextBufferController.js';
import ScheduleController from './controllers/ScheduleController.js';
import RepresentationController from '../dash/controllers/RepresentationController.js';
import FactoryMaker from '../core/FactoryMaker.js';
import {checkInteger} from './utils/SupervisorTools.js';
import EventBus from '../core/EventBus.js';
import Events from '../core/events/Events.js';
import MediaPlayerEvents from './MediaPlayerEvents.js';
import DashHandler from '../dash/DashHandler.js';
import Errors from '../core/errors/Errors.js';
import DashJSError from './vo/DashJSError.js';
import Debug from '../core/Debug.js';
import URLUtils from '../streaming/utils/URLUtils.js';
import {PlayListTrace} from './vo/metrics/PlayList.js';
import SegmentsController from '../dash/controllers/SegmentsController.js';
import {HTTPRequest} from './vo/metrics/HTTPRequest.js';
import TimeUtils from './utils/TimeUtils.js';
import MediaInfoSelectionInput from './vo/MediaInfoSelectionInput.js';


function StreamProcessor(config) {

    config = config || {};
    let context = this.context;
    let eventBus = EventBus(context).getInstance();

    let abrController = config.abrController;
    let adapter = config.adapter;
    let boxParser = config.boxParser;
    let capabilities = config.capabilities;
    let dashMetrics = config.dashMetrics;
    let errHandler = config.errHandler;
    let fragmentModel = config.fragmentModel;
    let manifestModel = config.manifestModel;
    let mediaController = config.mediaController;
    let mediaPlayerModel = config.mediaPlayerModel;
    let mimeType = config.mimeType;
    let playbackController = config.playbackController;
    let segmentBlacklistController = config.segmentBlacklistController;
    let settings = config.settings;
    let streamInfo = config.streamInfo;
    let textController = config.textController;
    let timelineConverter = config.timelineConverter;
    let type = config.type;

    let bufferController,
        bufferingTime,
        currentMediaInfo,
        dashHandler,
        instance,
        isDynamic,
        logger,
        mediaInfoArr,
        pendingSwitchToVoRepresentation,
        qualityChangeInProgress,
        representationController,
        scheduleController,
        segmentsController,
        shouldRepeatRequest,
        shouldUseExplicitTimeForRequest,
        trackSwitchInProgress;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        eventBus.on(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.on(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.on(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.on(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, instance);
        eventBus.on(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.on(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.on(Events.SEEK_TARGET, _onSeekTarget, instance);
        eventBus.on(Events.SET_FRAGMENTED_TEXT_AFTER_DISABLED, _onSetFragmentedTextAfterDisabled, instance);
        eventBus.on(Events.SET_NON_FRAGMENTED_TEXT, _onSetNonFragmentedText, instance);
        eventBus.on(Events.SOURCE_BUFFER_ERROR, _onSourceBufferError, instance);
    }

    function initialize(mediaSource, hasVideoTrack, isFragmented) {

        segmentsController = SegmentsController(context).create({
            events: Events,
            eventBus,
            streamInfo,
            timelineConverter,
            dashConstants: DashConstants,
            segmentBaseController: config.segmentBaseController,
            type
        });

        dashHandler = DashHandler(context).create({
            baseURLController: config.baseURLController,
            boxParser,
            constants: Constants,
            dashConstants: DashConstants,
            dashMetrics,
            debug: Debug(context).getInstance(),
            errHandler,
            errors: Errors,
            eventBus,
            events: Events,
            mediaPlayerModel,
            segmentsController,
            settings,
            streamInfo,
            timelineConverter,
            type,
            urlUtils: URLUtils(context).getInstance()
        });

        isDynamic = streamInfo.manifestInfo.isDynamic;

        // Create/initialize controllers
        dashHandler.initialize(isDynamic);
        abrController.registerStreamType(type, instance);

        representationController = RepresentationController(context).create({
            abrController,
            adapter,
            dashConstants: DashConstants,
            dashMetrics,
            errors: Errors,
            eventBus,
            events: Events,
            isDynamic,
            playbackController,
            segmentsController,
            streamInfo,
            timelineConverter,
            type,
        });

        bufferController = _createBufferControllerForType(type, isFragmented);
        if (bufferController) {
            bufferController.initialize(mediaSource);
        }

        scheduleController = ScheduleController(context).create({
            abrController,
            adapter,
            bufferController,
            dashMetrics,
            fragmentModel,
            mediaController,
            mediaPlayerModel,
            mimeType,
            playbackController,
            representationController,
            settings,
            streamInfo,
            textController,
            type,
        });

        scheduleController.initialize(hasVideoTrack);

        bufferingTime = 0;
        shouldUseExplicitTimeForRequest = false;
        shouldRepeatRequest = false;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        currentMediaInfo = null;
        bufferingTime = 0;
        shouldUseExplicitTimeForRequest = false;
        shouldRepeatRequest = false;
        qualityChangeInProgress = false;
        trackSwitchInProgress = false;
        _resetPendingSwitchToRepresentation();
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

        if (segmentsController) {
            segmentsController = null;
        }

        if (abrController) {
            abrController.unRegisterStreamType(getStreamId(), type);
        }

        eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(Events.BYTES_APPENDED_END_FRAGMENT, _onBytesAppended, instance);
        eventBus.off(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.off(Events.INIT_FRAGMENT_LOADED, _onInitFragmentLoaded, instance);
        eventBus.off(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.off(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.off(Events.SEEK_TARGET, _onSeekTarget, instance);
        eventBus.off(Events.SET_FRAGMENTED_TEXT_AFTER_DISABLED, _onSetFragmentedTextAfterDisabled, instance);
        eventBus.off(Events.SET_NON_FRAGMENTED_TEXT, _onSetNonFragmentedText, instance);
        eventBus.off(Events.SOURCE_BUFFER_ERROR, _onSourceBufferError, instance);

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function setMediaInfoArray(value) {
        mediaInfoArr = value;
    }

    /**
     * When a seek within the corresponding period occurs this function initiates the clearing of the buffer and sets the correct buffering time.
     * @param {object} e
     * @returns {Promise<any>}
     */
    function prepareInnerPeriodPlaybackSeeking(e) {
        return new Promise((resolve) => {

            // If we seek to a buffered area we can keep requesting where we left before the seek
            // If we seek back then forwards buffering will stop until we are below our buffer goal
            // If we seek forwards then pruneBuffer() will make sure that the bufferToKeep setting is respected
            const hasBufferAtTargetTime = bufferController.hasBufferAtTime(e.seekTime);
            if (hasBufferAtTargetTime) {
                bufferController.pruneBuffer();
                const continuousBufferTime = bufferController.getContinuousBufferTimeForTargetTime(e.seekTime);
                if (_shouldSetBufferingComplete(continuousBufferTime)) {
                    bufferController.setIsBufferingCompleted(true);
                }
                resolve();
                return;
            }

            // Stop segment requests until we have figured out for which time we need to request a segment. We don't want to replace existing segments.
            clearScheduleTimer();
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
                    const continuousBufferTime = bufferController.getContinuousBufferTimeForTargetTime(e.seekTime);

                    // If the buffer is continuous and exceeds the duration of the period we are still done buffering. We need to trigger the buffering completed event in order to start prebuffering upcoming periods again
                    if (_shouldSetBufferingComplete(continuousBufferTime)) {
                        bufferController.setIsBufferingCompleted(true);
                        resolve();
                    } else {
                        const targetTime = isNaN(continuousBufferTime) ? e.seekTime : continuousBufferTime;
                        setExplicitBufferingTime(targetTime);
                        bufferController.setSeekTarget(targetTime);

                        const promises = [];

                        // Append window has been reset by abort() operation. Set the correct values again
                        promises.push(bufferController.updateAppendWindow());

                        // Timestamp offset could've been changed by preloading period
                        const voRepresentation = getRepresentation();
                        promises.push(bufferController.updateBufferTimestampOffset(voRepresentation));

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

        })
    }

    function _shouldSetBufferingComplete(continuousBufferTime) {
        return !isNaN(continuousBufferTime) && !isNaN(streamInfo.duration) && isFinite(streamInfo.duration) && continuousBufferTime >= streamInfo.start + streamInfo.duration
    }

    /**
     * Seek outside of the current period.
     * @return {Promise<unknown>}
     */
    function prepareOuterPeriodPlaybackSeeking() {
        return new Promise((resolve, reject) => {
            try {
                // Stop scheduling
                clearScheduleTimer();

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

    /**
     * ScheduleController indicates that an init segment needs to be fetched.
     * @param {object} e
     * @param {boolean} rescheduleIfNoRequest - Defines whether we reschedule in case no valid request could be generated
     * @private
     */
    function _onInitFragmentNeeded(e, rescheduleIfNoRequest = true) {
        // Event propagation may have been stopped (see MssHandler)
        if (!e.sender) {
            return;
        }

        if (playbackController.getIsManifestUpdateInProgress()) {
            _noValidRequest();
            return;
        }

        if (currentMediaInfo.isText && !textController.isTextEnabled()) {
            return;
        }

        if (bufferController && e.representationId) {
            if (!bufferController.appendInitSegmentFromCache(e.representationId)) {
                const rep = representationController.getCurrentRepresentation();
                // Dummy init segment (fragmented tracks without initialization segment)
                if (rep.range === 0) {
                    _onMediaFragmentNeeded();
                    return;
                }
                // Init segment not in cache, send new request
                const request = dashHandler ? dashHandler.getInitRequest(currentMediaInfo, rep) : null;
                if (request) {
                    fragmentModel.executeRequest(request);
                } else if (rescheduleIfNoRequest) {
                    scheduleController.setInitSegmentRequired(true);
                    _noValidRequest();
                }
            }
        }
    }

    /**
     * ScheduleController indicates that a media segment is needed
     * @param {object} e
     * @param {boolean} rescheduleIfNoRequest -  Defines whether we reschedule in case no valid request could be generated
     * @private
     */
    function _onMediaFragmentNeeded(e, rescheduleIfNoRequest = true) {
        // Don't schedule next fragments while updating manifest or pruning to avoid buffer inconsistencies
        if (playbackController.getIsManifestUpdateInProgress() || bufferController.getIsPruningInProgress()) {
            _noValidRequest();
            return;
        }

        let request = _getFragmentRequest();
        if (request) {
            shouldUseExplicitTimeForRequest = false;
            shouldRepeatRequest = false;
            _mediaRequestGenerated(request);
        } else {
            _noMediaRequestGenerated(rescheduleIfNoRequest);
        }
    }

    /**
     * If we generated a valid media request we can execute the request. In some cases the segment might be blacklisted.
     * @param {object} request
     * @private
     */
    function _mediaRequestGenerated(request) {
        if (!isNaN(request.startTime + request.duration)) {
            bufferingTime = request.startTime + request.duration;
        }
        request.delayLoadingTime = new Date().getTime() + scheduleController.getTimeToLoadDelay();
        scheduleController.setTimeToLoadDelay(0);
        if (!_shouldIgnoreRequest(request)) {
            logger.debug(`Next fragment request url for stream id ${streamInfo.id} and media type ${type} is ${request.url} with request range ${request.range}`);
            fragmentModel.executeRequest(request);
        } else {
            logger.warn(`Fragment request url ${request.url} for stream id ${streamInfo.id} and media type ${type} is on the ignore list and will be skipped`);
            _noValidRequest();
        }
    }

    /**
     * We could not generate a valid request. Check if the media is finished, we are stuck in a gap or simply need to wait for the next segment to be available.
     * @param {boolean} rescheduleIfNoRequest
     * @private
     */
    function _noMediaRequestGenerated(rescheduleIfNoRequest) {
        const representation = representationController.getCurrentRepresentation();

        // If  this statement is true we might be stuck. A static manifest does not change and we did not find a valid request for the target time
        // There is no point in trying again. We need to adjust the time in order to find a valid request. This can happen if the user/app seeked into a gap.
        // For dynamic manifests this can also happen especially if we jump over the gap in the previous period and are using SegmentTimeline and in case there is a positive eptDelta at the beginning of the period we are stuck.
        try {
            if (settings.get().streaming.gaps.enableSeekFix && (shouldUseExplicitTimeForRequest || playbackController.getTime() === 0)) {
                let adjustedTime;
                if (!isDynamic) {
                    adjustedTime = _getAdjustedTimeForStaticManifest(representation);
                } else if (isDynamic && representation.segmentInfoType === DashConstants.SEGMENT_TIMELINE) {
                    adjustedTime = _getAdjustedTimeForDynamicSegmentTimelineManifest(representation);
                }
                if (!isNaN(adjustedTime) && adjustedTime !== bufferingTime) {
                    _noMediaRequestGeneratedAdjustTime(adjustedTime, rescheduleIfNoRequest);
                    return;
                }
            }
        } catch (e) {
            logger.error(e);
        }

        // Check if the media is finished. If so, no need to schedule another request
        const hasHandledBufferingComplete = checkAndHandleCompletedBuffering();
        if (hasHandledBufferingComplete) {
            return
        }

        if (rescheduleIfNoRequest) {
            _noValidRequest();
        }
    }

    function _getAdjustedTimeForStaticManifest(representation) {
        let adjustedTime = dashHandler.getValidTimeAheadOfTargetTime(bufferingTime, currentMediaInfo, representation, settings.get().streaming.gaps.threshold);
        if (isNaN(adjustedTime)) {
            // If there is no valid target time ahead and the buffering time is within the duration of one segment we slightly adjust it
            if (bufferingTime >= representation.adaptation.period.mpd.mediaPresentationDuration - representation.segmentDuration) {
                adjustedTime = bufferingTime - 0.1;
            }
        }

        return adjustedTime;
    }

    function _getAdjustedTimeForDynamicSegmentTimelineManifest(representation) {
        // If we find a valid request ahead of the current time then we are in a gap. Segments are only added at the end of the timeline
        return dashHandler.getValidTimeAheadOfTargetTime(bufferingTime, currentMediaInfo, representation, settings.get().streaming.gaps.threshold);
    }

    function _noMediaRequestGeneratedAdjustTime(adjustedTime, rescheduleIfNoRequest) {
        if (playbackController.isSeeking() || playbackController.getTime() === 0) {
            // If we are seeking then playback is stalled. Do a seek to get out of this situation
            logger.warn(`Adjusting playback time ${adjustedTime} because of gap in the manifest. Seeking by ${adjustedTime - bufferingTime}`);
            playbackController.seek(adjustedTime, false, false);
        } else {
            // If we are not seeking we should still be playing but we cant find anything to buffer. So we adjust the buffering time and leave the gap jump to the GapController
            logger.warn(`Adjusting buffering time ${adjustedTime} because of gap in the manifest. Adjusting time by ${adjustedTime - bufferingTime}`);
            setExplicitBufferingTime(adjustedTime)

            if (rescheduleIfNoRequest) {
                _noValidRequest();
            }
        }
    }

    function checkAndHandleCompletedBuffering() {
        const representation = representationController.getCurrentRepresentation();
        const isLastSegmentRequested = dashHandler.isLastSegmentRequested(representation, bufferingTime);

        if (isLastSegmentRequested) {
            const segmentIndex = dashHandler.getCurrentIndex();
            logger.debug(`Segment requesting for stream ${streamInfo.id} has finished`);
            eventBus.trigger(Events.STREAM_REQUESTING_COMPLETED, { segmentIndex }, {
                streamId: streamInfo.id,
                mediaType: type
            });
            bufferController.segmentRequestingCompleted(segmentIndex);
            clearScheduleTimer();
        }

        return isLastSegmentRequested
    }

    /**
     * In certain situations we need to ignore a request. For instance, if a segment is blacklisted because it caused an MSE error.
     * @private
     */
    function _shouldIgnoreRequest(request) {
        let blacklistUrl = request.url;

        if (request.range) {
            blacklistUrl = blacklistUrl.concat('_', request.range);
        }

        return segmentBlacklistController.contains(blacklistUrl)
    }

    /**
     * Get the init or media segment request using the DashHandler.
     * @return {null|FragmentRequest|null}
     * @private
     */
    function _getFragmentRequest() {
        let request;

        if (isNaN(bufferingTime) || (getType() === Constants.TEXT && !textController.isTextEnabled())) {
            return null;
        }

        if (dashHandler) {
            const representation = getRepresentation();

            if (shouldUseExplicitTimeForRequest) {
                request = dashHandler.getSegmentRequestForTime(currentMediaInfo, representation, bufferingTime);
            } else if (shouldRepeatRequest) {
                request = dashHandler.repeatSegmentRequest(currentMediaInfo, representation);
            } else {
                request = dashHandler.getNextSegmentRequest(currentMediaInfo, representation);
            }
        }

        return request;
    }

    /**
     * Whenever we can not generate a valid request we restart scheduling according to the timeouts defined in the settings.
     * @private
     */
    function _noValidRequest() {
        const scheduleTimeout = mediaPlayerModel.getScheduleTimeout();
        scheduleController.startScheduleTimer(scheduleTimeout);
    }

    function _onDataUpdateCompleted() {
        const currentRepresentation = representationController.getCurrentRepresentation()
        if (!bufferController.getIsBufferingCompleted()) {
            bufferController.updateBufferTimestampOffset(currentRepresentation);
        }
    }

    function _onBufferLevelStateChanged(e) {
        dashMetrics.addBufferState(type, e.state, scheduleController.getBufferTarget());
        if (e.state === MetricsConstants.BUFFER_EMPTY && !playbackController.isSeeking()) {
            logger.info('Buffer is empty! Stalling!');
            dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REBUFFERING_REASON);
        }
    }

    function _onBufferCleared(e) {
        // Remove executed requests not buffered anymore
        fragmentModel.syncExecutedRequestsWithBufferedRange(
            bufferController.getBuffer().getAllBufferRanges(),
            streamInfo.duration);

        // If buffer removed ahead current time (QuotaExceededError or automatic buffer pruning) then adjust current index handler time
        if (e.quotaExceeded && e.from > playbackController.getTime()) {
            setExplicitBufferingTime(e.from);
        }

        // (Re)start schedule once buffer has been pruned after a QuotaExceededError
        if (e.hasEnoughSpaceToAppend && e.quotaExceeded) {
            scheduleController.startScheduleTimer();
        }
    }

    /**
     * This function is called when the corresponding SourceBuffer encountered an error.
     * We blacklist the last segment assuming it caused the error
     * @param {object} e
     * @private
     */
    function _onSourceBufferError(e) {
        if (!e || !e.lastRequestAppended || !e.lastRequestAppended.url) {
            return;
        }

        let blacklistUrl = e.lastRequestAppended.url;

        if (e.lastRequestAppended.range) {
            blacklistUrl = blacklistUrl.concat('_', e.lastRequestAppended.range);
        }
        logger.warn(`Blacklisting segment with url ${blacklistUrl}`);
        segmentBlacklistController.add(blacklistUrl);
    }

    function _onBytesAppended(e) {
        logger.debug(`Appended bytes for ${e.mediaType} and stream id ${e.streamId}`);

        // we save the last initialized quality. That way we make sure that the media fragments we are about to append match the init segment
        if (e.segmentType === HTTPRequest.INIT_SEGMENT_TYPE) {
            const lastInitializedRepresentationId = e.representationId;
            scheduleController.setLastInitializedRepresentationId(lastInitializedRepresentationId);
            logger.info('[' + type + '] ' + 'lastInitializedRepresentationId changed to ' + lastInitializedRepresentationId);
        }

        if (pendingSwitchToVoRepresentation && pendingSwitchToVoRepresentation.enabled) {
            _prepareForDefaultQualitySwitch(pendingSwitchToVoRepresentation.newRepresentation, pendingSwitchToVoRepresentation.oldRepresentation);
        } else if (!trackSwitchInProgress) {
            scheduleController.startScheduleTimer(0);
        }
    }

    function _resetPendingSwitchToRepresentation() {
        pendingSwitchToVoRepresentation = { newRepresentation: null, oldRepresentation: null, enabled: false };
    }

    /**
     * Called once the StreamProcessor is initialized and when the track is switched. We only have one StreamProcessor per media type. So we need to adjust the mediaInfo once we switch/select a track.
     * @param {MediaInfoSelectionInput} mediaInfoSelectionInput
     */
    function selectMediaInfo(mediaInfoSelectionInput) {
        return new Promise((resolve) => {
            if (!representationController) {
                return Promise.resolve();
            }

            let selectedValues = null;

            // Switching to a new AdaptationSet as part of a quality switch
            if (mediaInfoSelectionInput.newRepresentation) {
                selectedValues = _getTargetValuesForAdaptationSetQualitySwitch(mediaInfoSelectionInput);
            }

            // Switching to a new AS
            else if ((currentMediaInfo === null || (!adapter.areMediaInfosEqual(currentMediaInfo, mediaInfoSelectionInput.newMediaInfo)))) {
                selectedValues = _getTargetValuesForAdaptationSetSwitch(mediaInfoSelectionInput);
            }

            // MPD update quality remains the same
            else {
                selectedValues = _getTargetValuesForMpdUpdate(mediaInfoSelectionInput);
            }

            _setCurrentMediaInfo(selectedValues.currentMediaInfo);

            eventBus.trigger()

            // Update Representation Controller with the new data. Note we do not filter any Representations here as the filter values might change over time.
            const voRepresentations = abrController.getPossibleVoRepresentations(currentMediaInfo, false);
            return representationController.updateData(voRepresentations, currentMediaInfo.isFragmented, selectedValues.selectedRepresentation.id)
                .then(() => {
                    _onDataUpdateCompleted()
                    resolve();
                })
                .catch((e) => {
                    logger.error(e);
                    resolve()
                })

        })
    }

    function _setCurrentMediaInfo(value) {
        if (!adapter.areMediaInfosEqual(currentMediaInfo, value)) {
            eventBus.trigger(MediaPlayerEvents.NEW_TRACK_SELECTED, {
                value
            });
        }
        currentMediaInfo = value;
        abrController.handleNewMediaInfo(currentMediaInfo);
        eventBus.trigger(Events.MEDIAINFO_UPDATED, {
            mediaType: type,
            streamId: streamInfo.id,
            currentMediaInfo
        });
    }

    function _getTargetValuesForAdaptationSetQualitySwitch(selectionInput) {
        return {
            selectedRepresentation: selectionInput.newRepresentation,
            currentMediaInfo: selectionInput.newMediaInfo,
        }
    }

    function _getTargetValuesForAdaptationSetSwitch(selectionInput) {
        let bitrateInKbit = NaN;

        // In case ABR was disabled and we got a selected Representation from the previous period we use a bitrate that is close to the one from the previous period
        if (!settings.get().streaming.abr.autoSwitchBitrate[selectionInput.newMediaInfo.type] && selectionInput.previouslySelectedRepresentation) {
            bitrateInKbit = selectionInput.previouslySelectedRepresentation.bitrateInKbit
        } else {
            bitrateInKbit = abrController.getInitialBitrateFor(type);
        }

        const selectedRepresentation = abrController.getOptimalRepresentationForBitrate(selectionInput.newMediaInfo, bitrateInKbit, false);
        return {
            selectedRepresentation,
            currentMediaInfo: selectionInput.newMediaInfo
        }
    }

    function _getTargetValuesForMpdUpdate(selectionInput) {
        return {
            currentMediaInfo: selectionInput.newMediaInfo,
            selectedRepresentation: representationController.getCurrentRepresentation()
        }
    }

    /**
     * The quality has changed which means we have switched to a different representation.
     * If we want to aggressively replace existing parts in the buffer we need to make sure that the new quality is higher than the already buffered one.
     * @param {object} e
     */
    function prepareQualityChange(e) {
        if (!e.newRepresentation) {
            return;
        }

        if (pendingSwitchToVoRepresentation && pendingSwitchToVoRepresentation.enabled) {
            logger.warn(`Canceling queued representation switch to ${pendingSwitchToVoRepresentation.newRepresentation.id} for ${type}`);
        }

        if (e.isAdaptationSetSwitch) {
            logger.debug(`Preparing quality switch to different AdaptationSet for type ${type}`);
            _prepareAdaptationSwitchQualityChange(e)
        } else {
            logger.debug(`Preparing quality within the same AdaptationSet for type ${type}`);
            _prepareNonAdaptationSwitchQualityChange(e)
        }
    }

    function _prepareNonAdaptationSwitchQualityChange(e) {
        const newRepresentation = e.newRepresentation;

        qualityChangeInProgress = true;

        // Stop scheduling until we are done with preparing the quality switch
        clearScheduleTimer();

        // Update selected Representation in RepresentationController
        representationController.prepareQualityChange(newRepresentation);

        _handleDifferentSwitchTypes(e);
    }

    function _prepareAdaptationSwitchQualityChange(e) {
        const newRepresentation = e.newRepresentation;

        qualityChangeInProgress = true;

        // Stop scheduling until we are done with preparing the quality switch
        clearScheduleTimer();

        // Informing ScheduleController about AS switch
        scheduleController.setSwitchTrack(true);

        const newMediaInfo = newRepresentation.mediaInfo;
        _setCurrentMediaInfo(newMediaInfo);
        const mediaInfoSelectionInput = new MediaInfoSelectionInput({ newMediaInfo, newRepresentation })
        selectMediaInfo(mediaInfoSelectionInput)
            .then(() => {
                _handleDifferentSwitchTypes(e);
            })
    }

    function _handleDifferentSwitchTypes(e) {
        const newRepresentation = e.newRepresentation;
        const oldRepresentation = e.oldRepresentation;

        if (!newRepresentation || !oldRepresentation) {
            logger.warn(`_handleDifferentSwitchTypes() is missing the target representations`);
        }

        // If the switch should occur immediately we need to replace existing stuff in the buffer
        if (e.reason && e.reason.forceReplace) {
            _prepareForForceReplacementQualitySwitch(newRepresentation, oldRepresentation);
        }

        // We abandoned a current request
        else if (e && e.reason && e.reason.forceAbandon) {
            _prepareForAbandonQualitySwitch(newRepresentation, oldRepresentation)
        }

        // If fast switch is enabled we check if we are supposed to replace existing stuff in the buffer
        else if (mediaPlayerModel.getFastSwitchEnabled()) {
            _prepareForFastQualitySwitch(newRepresentation, oldRepresentation);
        }

        // Default quality switch. We append the new quality to the already buffered stuff
        else {
            _prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation);
        }

        dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
        dashMetrics.createPlaylistTraceMetrics(newRepresentation.id, playbackController.getTime() * 1000, playbackController.getPlaybackRate());
    }

    function _prepareForForceReplacementQualitySwitch(newPresentation, oldRepresentation) {

        // Abort the current request to avoid inconsistencies and in case a rule such as AbandonRequestRule has forced a quality switch. A quality switch can also be triggered manually by the application.
        // If we update the buffer values now, or initialize a request to the new init segment, the currently downloading media segment might use wrong values.
        // Everything that is already in the buffer queue is ok and will be handled by the corresponding function below depending on the switch mode.
        fragmentModel.abortRequests();

        // Inform other classes like the GapController that we are replacing existing stuff
        eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
            mediaType: type,
            streamId: streamInfo.id
        }, { mediaType: type, streamId: streamInfo.id });

        scheduleController.setCheckPlaybackQuality(false);

        // Abort appending segments to the buffer. Also adjust the appendWindow as we might have been in the progress of prebuffering stuff.
        bufferController.prepareForForceReplacementQualitySwitch(newPresentation, oldRepresentation)
            .then(() => {
                _replacementQualitySwitchPreparationDone();
            })
            .catch(() => {
                _replacementQualitySwitchPreparationDone();
            });
    }

    function _replacementQualitySwitchPreparationDone() {
        _bufferClearedForReplacement();
        _resetPendingSwitchToRepresentation();
        qualityChangeInProgress = false;
    }

    function _prepareForAbandonQualitySwitch(newRepresentation, oldRepresentation) {
        bufferController.prepareForAbandonQualitySwitch(newRepresentation, oldRepresentation)
            .then(() => {
                _abandonQualitySwitchPreparationDone();
            })
            .catch(() => {
                _abandonQualitySwitchPreparationDone();
            })
    }

    function _abandonQualitySwitchPreparationDone() {
        fragmentModel.abortRequests();
        shouldRepeatRequest = true;
        scheduleController.setCheckPlaybackQuality(false);
        scheduleController.startScheduleTimer();
        qualityChangeInProgress = false;
    }

    function _prepareForFastQualitySwitch(newRepresentation, oldRepresentation) {
        // if we switch up in quality and need to replace existing parts in the buffer we need to adjust the buffer target
        const time = playbackController.getTime();
        let safeBufferLevel = 1.5 * (!isNaN(newRepresentation.fragmentDuration) ? newRepresentation.fragmentDuration : 1);
        const request = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: time + safeBufferLevel,
            threshold: 0
        })[0];

        if (request && !currentMediaInfo.isText) {
            const bufferLevel = bufferController.getBufferLevel();
            const abandonmentState = abrController.getAbandonmentStateFor(streamInfo.id, type);

            // The new quality is higher than the one we originally requested
            if (request.bandwidth < newRepresentation.bandwidth && bufferLevel >= safeBufferLevel && abandonmentState === MetricsConstants.ALLOW_LOAD) {
                bufferController.prepareForFastQualitySwitch(newRepresentation, oldRepresentation)
                    .then(() => {
                        _fastQualitySwitchPreparationDone(time, safeBufferLevel);
                    })
                    .catch(() => {
                        _fastQualitySwitchPreparationDone(time, safeBufferLevel);
                    })
            }

            // If we have buffered a higher quality we do not replace anything.
            else {
                _prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation);
            }
        } else {
            _prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation);
        }
    }

    function _fastQualitySwitchPreparationDone(time, safeBufferLevel) {
        // Abort the current request to avoid inconsistencies. A quality switch can also be triggered manually by the application.
        // If we update the buffer values now, or initialize a request to the new init segment, the currently downloading media segment might "work" with wrong values.
        // Everything that is already in the buffer queue is ok
        fragmentModel.abortRequests();
        const targetTime = time + safeBufferLevel;
        setExplicitBufferingTime(targetTime);
        scheduleController.setCheckPlaybackQuality(false);
        scheduleController.startScheduleTimer();
        qualityChangeInProgress = false;
    }

    function _prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation) {
        // We are not canceling the current request. Check if there is still an ongoing request. If so we wait for the request to be finished and the media to be appended
        const ongoingRequests = fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING })
        if (ongoingRequests && ongoingRequests.length > 0) {
            logger.debug('Preparing for default quality switch: Waiting for ongoing segment request to be finished before applying switch.')
            pendingSwitchToVoRepresentation.newRepresentation = newRepresentation;
            pendingSwitchToVoRepresentation.oldRepresentation = oldRepresentation;
            pendingSwitchToVoRepresentation.enabled = true;
            return;
        }

        bufferController.prepareForDefaultQualitySwitch(newRepresentation, oldRepresentation)
            .then(() => {
                _defaultQualitySwitchPreparationDone();
            })
            .catch(() => {
                _defaultQualitySwitchPreparationDone();
            })
    }

    function _defaultQualitySwitchPreparationDone() {
        scheduleController.setCheckPlaybackQuality(false);
        if (currentMediaInfo.segmentAlignment || currentMediaInfo.subSegmentAlignment) {
            scheduleController.startScheduleTimer();
        } else {
            _bufferClearedForNonReplacement()
        }
        _resetPendingSwitchToRepresentation();
        qualityChangeInProgress = false;
    }


    /**
     * We have canceled the download of a fragment and need to adjust the buffer time or reload an init segment
     * @param {object} e
     */
    function _onFragmentLoadingAbandoned(e) {
        logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has been aborted');

        // we only need to handle this if we are not seeking, not switching the tracks and not switching the quality
        if (!playbackController.isSeeking() && !scheduleController.getSwitchTrack() && !qualityChangeInProgress) {
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

        if (currentMediaInfo.isText) {
            scheduleController.startScheduleTimer(0);
        }

        if (e.error && e.request.serviceLocation) {
            _handleFragmentLoadingError(e);
        }
    }

    /**
     * If we encountered an error when loading the fragment we need to handle it according to the segment type
     * @private
     */
    function _handleFragmentLoadingError(e) {
        logger.info(`Fragment loading completed with an error`);

        if (!e || !e.request || !e.request.type) {
            return;
        }

        // In case there are baseUrls that can still be tried a valid request can be generated. If no valid request can be generated we ran out of baseUrls.
        // Consequently, we need to signal that we dont want to retry in case no valid request could be generated otherwise we keep trying with the same url infinitely.

        // Init segment could not be loaded. If we have multiple baseUrls we still have a chance to get a valid segment.
        if (e.request.type === HTTPRequest.INIT_SEGMENT_TYPE) {
            _onInitFragmentNeeded({
                representationId: e.request.representation.id,
                sender: {}
            }, false)
        }

        // Media segment could not be loaded
        else if (e.request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
            setExplicitBufferingTime(e.request.startTime + (e.request.duration / 2));
            _onMediaFragmentNeeded({}, false);
        }
    }

    /**
     * Callback function triggered by the TextController whenever a track is changed for fragmented text. Will only be triggered if textracks have previously been disabled.
     * @private
     */
    function _onSetFragmentedTextAfterDisabled() {
        setExplicitBufferingTime(playbackController.getTime());
        getScheduleController().startScheduleTimer();
    }

    /**
     * Callback function triggered by the TextController whenever a track is changed for non fragmented text
     * @param {object} e
     * @private
     */
    function _onSetNonFragmentedText(e) {
        const currentTrackInfo = e.currentTrackInfo;

        if (!currentTrackInfo) {
            return;
        }

        const newMediaInfo = mediaInfoArr.find((info) => {
            return info.index === currentTrackInfo.index && info.lang === currentTrackInfo.lang;
        });

        if (newMediaInfo) {
            selectMediaInfo(new MediaInfoSelectionInput({ newMediaInfo }))
                .then(() => {
                    bufferController.setIsBufferingCompleted(false);
                    setExplicitBufferingTime(playbackController.getTime());
                    scheduleController.setInitSegmentRequired(true);
                    scheduleController.startScheduleTimer();
                });
        }
    }

    function _onQuotaExceeded(e) {
        // Stop scheduler (will be restarted once buffer is pruned)
        setExplicitBufferingTime(e.quotaExceededTime);
        clearScheduleTimer();
    }

    function getRepresentationController() {
        return representationController;
    }

    function getBuffer() {
        return bufferController ? bufferController.getBuffer() : null;
    }

    function getBufferController() {
        return bufferController;
    }

    function dischargePreBuffer() {
        bufferController.dischargePreBuffer();
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function updateStreamInfo(newStreamInfo) {
        streamInfo = newStreamInfo;
        if (!isBufferingCompleted()) {
            return bufferController.updateAppendWindow();
        }
        return Promise.resolve();
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function getMediaInfo() {
        return currentMediaInfo;
    }

    function getAllMediaInfos() {
        return mediaInfoArr;
    }

    function getMediaSource() {
        return bufferController.getMediaSource();
    }

    function setMediaSource(mediaSource) {
        return bufferController.setMediaSource(mediaSource, currentMediaInfo);
    }

    function getScheduleController() {
        return scheduleController;
    }

    function clearScheduleTimer() {
        if (scheduleController) {
            scheduleController.clearScheduleTimer();
        }
    }

    /**
     * Get a specific voRepresentation. If quality parameter is defined, this function will return the voRepresentation for this quality.
     * Otherwise, this function will return the current voRepresentation used by the representationController.
     * @param {number} id - id of the voRepresentation.
     * @return {object} voRepresentation
     */
    function getRepresentation(id = NaN) {
        let voRepresentation;

        if (!isNaN(id)) {
            checkInteger(id);
            voRepresentation = representationController ? representationController.getRepresentationById(id) : null;
        } else {
            voRepresentation = representationController ? representationController.getCurrentRepresentation() : null;
        }

        return voRepresentation
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
        const voRepresentation = getRepresentation();

        return dashHandler.getNextSegmentRequestIdempotent(
            currentMediaInfo,
            voRepresentation
        );
    }

    function _onInitFragmentLoaded(e) {
        if (!settings.get().streaming.enableManifestTimescaleMismatchFix) {
            return;
        }
        const chunk = e.chunk;
        const bytes = chunk.bytes;
        const representationId = chunk.representation.id;
        const currentRepresentation = getRepresentation(representationId);
        if (currentRepresentation) {
            currentRepresentation.timescale = boxParser.getMediaTimescaleFromMoov(bytes);
        }
    }

    function _onMediaFragmentLoaded(e) {
        const chunk = e.chunk;
        const bytes = chunk.bytes;
        const representationId = chunk.representation.id;
        const currentRepresentation = getRepresentation(representationId);
        // If we switch tracks this event might be fired after the representations in the RepresentationController have been updated according to the new MediaInfo.
        // In this case there will be no currentRepresentation and voRepresentation matching the "old" quality
        if (currentRepresentation) {

            let isoFile;

            // Check for inband prft on media segment (if enabled)
            if (settings.get().streaming.parseInbandPrft && e.request.type === HTTPRequest.MEDIA_SEGMENT_TYPE) {
                isoFile = isoFile ? isoFile : boxParser.parse(bytes);
                const timescale = currentRepresentation.timescale;
                const prfts = _handleInbandPrfts(isoFile, timescale);
                if (prfts && prfts.length) {
                    eventBus.trigger(MediaPlayerEvents.INBAND_PRFT,
                        { data: prfts },
                        { streamId: streamInfo.id, mediaType: type }
                    );
                }
            }

            const eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo, null, streamInfo);
            const eventStreamTrack = adapter.getEventsFor(currentRepresentation, currentRepresentation, streamInfo);

            if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
                const request = e.request;

                isoFile = isoFile ? isoFile : boxParser.parse(bytes);
                const events = _handleInbandEvents(isoFile, request, eventStreamMedia, eventStreamTrack);
                eventBus.trigger(Events.INBAND_EVENTS,
                    { events: events },
                    { streamId: streamInfo.id }
                );
            }
        }
    }

    function _handleInbandPrfts(isoFile, timescale) {
        const prftBoxes = isoFile.getBoxes('prft');

        const prfts = [];
        prftBoxes.forEach(prft => {
            prfts.push(_parsePrftBox(prft, timescale));
        });

        return prfts;
    }

    function _parsePrftBox(prft, timescale) {
        // Get prft type according to box flags
        let type = 'unknown';
        switch (prft.flags) {
            case 0:
                type = DashConstants.PRODUCER_REFERENCE_TIME_TYPE.ENCODER;
                break;
            case 16:
                type = DashConstants.PRODUCER_REFERENCE_TIME_TYPE.APPLICATION;
                break;
            case 24:
                type = DashConstants.PRODUCER_REFERENCE_TIME_TYPE.CAPTURED;
                break;
            default:
                break;
        }

        // Get NPT timestamp according to IETF RFC 5905, relative to 1/1/1900
        let ntpTimestamp = (prft.ntp_timestamp_sec * 1000) + (prft.ntp_timestamp_frac / 2 ** 32 * 1000);
        ntpTimestamp = TimeUtils(context).getInstance().ntpToUTC(ntpTimestamp);

        const mediaTime = (prft.media_time / timescale);

        return {
            type,
            ntpTimestamp,
            mediaTime
        }
    }

    function _handleInbandEvents(isoFile, request, mediaInbandEvents, trackInbandEvents) {
        try {
            const eventStreams = {};
            const events = [];

            /* Extract the possible schemeIdUri : If a DASH client detects an event message box with a scheme that is not defined in MPD, the client is expected to ignore it */
            const inbandEvents = mediaInbandEvents.concat(trackInbandEvents);
            for (let i = 0, ln = inbandEvents.length; i < ln; i++) {
                eventStreams[inbandEvents[i].schemeIdUri + '/' + inbandEvents[i].value] = inbandEvents[i];
            }

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

    function createBufferSinks(previousBufferSinks, oldRepresentation) {
        const buffer = getBuffer();

        if (buffer) {
            return Promise.resolve(buffer);
        }

        return bufferController ? bufferController.createBufferSink(currentMediaInfo, previousBufferSinks, oldRepresentation) : Promise.resolve(null);
    }

    function prepareTrackSwitch(oldRepresentation, replaceBuffer = false) {
        return new Promise((resolve) => {
            logger.debug(`Preparing track switch for type ${type}`);
            const shouldReplace =
                type === Constants.TEXT ||
                replaceBuffer ||
                (settings.get().streaming.trackSwitchMode[type] === Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE && playbackController.getTimeToStreamEnd(streamInfo) > settings.get().streaming.buffer.stallThreshold);

            // when buffering is completed and we are not supposed to replace anything do nothing.
            // Still we need to trigger preloading again and call change type in case user seeks back before transitioning to next period
            if (bufferController.getIsBufferingCompleted() && !shouldReplace) {
                _handleBufferingCompleteTrackSwitch(oldRepresentation)
                    .then(() => {
                        resolve();
                    })
            } else {
                // We stop the schedule controller and signal a track switch. That way we request a new init segment next
                scheduleController.setSwitchTrack(true);
                // when we are supposed to replace it does not matter if buffering is already completed
                if (shouldReplace) {
                    _handleReplaceTrackSwitch(oldRepresentation)
                        .then(() => {
                            resolve();
                        })
                } else {
                    // We do not replace anything that is already in the buffer. Still we need to prepare the buffer for the track switch
                    _handleNoReplaceTrackSwitch(oldRepresentation)
                        .then(() => {
                            resolve();
                        })
                }
            }
        })
    }

    function _handleBufferingCompleteTrackSwitch(oldRepresentation) {
        return new Promise((resolve) => {
            const newRepresentation = representationController.getCurrentRepresentation()
            bufferController.prepareForNonReplacementTrackSwitch(newRepresentation, oldRepresentation)
                .then(() => {
                    eventBus.trigger(Events.BUFFERING_COMPLETED, {}, { streamId: streamInfo.id, mediaType: type })
                    resolve();
                })
                .catch(() => {
                    eventBus.trigger(Events.BUFFERING_COMPLETED, {}, { streamId: streamInfo.id, mediaType: type })
                    resolve();
                })
        })
    }

    function _handleReplaceTrackSwitch(oldRepresentation) {
        return new Promise((resolve) => {
            // Inform other classes like the GapController that we are replacing existing stuff
            eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
                mediaType: type,
                streamId: streamInfo.id
            }, { mediaType: type, streamId: streamInfo.id });

            // Abort the current request it will be removed from the buffer anyways
            fragmentModel.abortRequests();

            // Abort appending segments to the buffer. Also adjust the appendWindow as we might have been in the progress of prebuffering stuff.
            const newRepresentation = getRepresentation()
            bufferController.prepareForReplacementTrackSwitch(newRepresentation, oldRepresentation)
                .then(() => {
                    _bufferClearedForReplacement();
                    resolve();
                })
                .catch(() => {
                    _bufferClearedForReplacement();
                    resolve();
                });
        })
    }

    function _handleNoReplaceTrackSwitch(oldRepresentation) {
        return new Promise((resolve) => {
            // As long as we have ongoing requests we can not change the SourceBuffer type etc.
            // Otherwise, we might run into cases in which we append the segment that is currently being downloaded with wrong SourceBuffer values.
            // The ScheduleController was stopped. Once a potentially ongoing request was finished we can continue

            const _finishNoReplaceTrackSwitch = () => {
                const ongoingRequests = fragmentModel.getRequests({ state: FragmentModel.FRAGMENT_MODEL_LOADING });
                if (!ongoingRequests || ongoingRequests.length === 0) {
                    const newRepresentation = getRepresentation()
                    bufferController.prepareForNonReplacementTrackSwitch(newRepresentation, oldRepresentation)
                        .then(() => {
                            _bufferClearedForNonReplacement();
                            resolve();
                        })
                        .catch((e) => {
                            logger.error(e);
                            _bufferClearedForNonReplacement();
                            resolve();
                        });
                } else {
                    eventBus.once(MediaPlayerEvents.FRAGMENT_LOADING_COMPLETED, _finishNoReplaceTrackSwitch, instance);
                }
            }

            _finishNoReplaceTrackSwitch();
        })
    }


    /**
     * For an instant track switch we need to adjust the buffering time after the buffer has been pruned.
     * @private
     */
    function _bufferClearedForReplacement() {
        const targetTime = playbackController.getTime();

        if (settings.get().streaming.buffer.flushBufferAtTrackSwitch) {
            // For some devices (like chromecast) it is necessary to seek the video element to reset the internal decoding buffer,
            // otherwise audio track switch will be effective only once after previous buffered track is consumed
            playbackController.seek(targetTime + 0.001, false, true);
        }

        setExplicitBufferingTime(targetTime);
        bufferController.setSeekTarget(targetTime);
        scheduleController.startScheduleTimer();
    }

    function _bufferClearedForNonReplacement() {
        const time = playbackController.getTime();
        const continuousBufferTime = bufferController.getContinuousBufferTimeForTargetTime(time);
        const targetTime = isNaN(continuousBufferTime) ? time : continuousBufferTime;

        setExplicitBufferingTime(targetTime);
        scheduleController.startScheduleTimer();
    }

    function _createBufferControllerForType(type, isFragmented) {
        let controller = null;

        if (!type) {
            errHandler.error(new DashJSError(Errors.MEDIASOURCE_TYPE_UNSUPPORTED_CODE, Errors.MEDIASOURCE_TYPE_UNSUPPORTED_MESSAGE + 'not properly defined'));
            return null;
        }

        if (type === Constants.TEXT && !isFragmented) {
            controller = NotFragmentedTextBufferController(context).create({
                errHandler,
                fragmentModel,
                mimeType,
                settings,
                streamInfo,
                textController,
                type,
            });
        } else {
            controller = BufferController(context).create({
                abrController,
                capabilities,
                errHandler,
                fragmentModel,
                manifestModel,
                mediaController,
                mediaPlayerModel,
                playbackController,
                representationController,
                settings,
                streamInfo,
                textController,
                type,
            });
        }

        return controller;
    }

    function _onSeekTarget(e) {
        if (e && !isNaN(e.time)) {
            setExplicitBufferingTime(e.time);
            bufferController.setSeekTarget(e.time);
        }
    }

    function setExplicitBufferingTime(value) {
        bufferingTime = value;
        shouldUseExplicitTimeForRequest = true;
    }

    function setTrackSwitchInProgress(value) {
        trackSwitchInProgress = value;
    }

    function finalisePlayList(time, reason) {
        dashMetrics.pushPlayListTraceMetrics(time, reason);
    }

    function getLastSegment() {
        return dashHandler.getLastSegment();
    }

    instance = {
        checkAndHandleCompletedBuffering,
        clearScheduleTimer,
        createBufferSinks,
        dischargePreBuffer,
        finalisePlayList,
        getAllMediaInfos,
        getBuffer,
        getBufferController,
        getBufferLevel,
        getFragmentModel,
        getLastSegment,
        getMediaInfo,
        getMediaSource,
        getRepresentation,
        getRepresentationController,
        getScheduleController,
        getStreamId,
        getStreamInfo,
        getType,
        initialize,
        isBufferingCompleted,
        prepareInnerPeriodPlaybackSeeking,
        prepareOuterPeriodPlaybackSeeking,
        prepareQualityChange,
        prepareTrackSwitch,
        probeNextRequest,
        reset,
        selectMediaInfo,
        setExplicitBufferingTime,
        setMediaInfoArray,
        setMediaSource,
        setTrackSwitchInProgress,
        updateStreamInfo,
    };

    setup();

    return instance;
}

StreamProcessor.__dashjs_factory_name = 'StreamProcessor';
export default FactoryMaker.getClassFactory(StreamProcessor);
