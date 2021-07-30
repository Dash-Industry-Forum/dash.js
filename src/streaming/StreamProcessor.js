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
import NotFragmentedTextBufferController from './text/NotFragmentedTextBufferController';
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
import SegmentsController from '../dash/controllers/SegmentsController';
import {HTTPRequest} from './vo/metrics/HTTPRequest';

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
        qualityChangeInProgress,
        manifestUpdateInProgress,
        dashHandler,
        segmentsController,
        bufferingTime;

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
        eventBus.on(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.on(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.on(Events.SET_FRAGMENTED_TEXT_AFTER_DISABLED, _onSetFragmentedTextAfterDisabled, instance);
        eventBus.on(Events.SET_NON_FRAGMENTED_TEXT, _onSetNonFragmentedText, instance);
        eventBus.on(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.on(Events.STREAMS_COMPOSED, _onStreamsComposed, instance);
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
            streamInfo,
            type,
            timelineConverter,
            dashMetrics,
            mediaPlayerModel,
            baseURLController: config.baseURLController,
            errHandler,
            segmentsController,
            settings,
            boxParser,
            events: Events,
            eventBus,
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
            streamInfo,
            type,
            abrController,
            dashMetrics,
            playbackController,
            timelineConverter,
            dashConstants: DashConstants,
            events: Events,
            eventBus,
            errors: Errors,
            isDynamic,
            segmentsController
        });

        bufferController = _createBufferControllerForType(type, isFragmented);
        if (bufferController) {
            bufferController.initialize(mediaSource);
        }

        scheduleController = ScheduleController(context).create({
            streamInfo,
            type,
            mimeType,
            adapter,
            dashMetrics,
            mediaPlayerModel,
            fragmentModel,
            abrController,
            playbackController,
            textController,
            mediaController,
            bufferController,
            settings
        });

        scheduleController.initialize(hasVideoTrack);

        bufferingTime = 0;
        shouldUseExplicitTimeForRequest = false;
    }

    function getStreamId() {
        return streamInfo.id;
    }

    function getType() {
        return type;
    }

    function getIsTextTrack() {
        return adapter.getIsTextTrack(representationController.getData());
    }

    function resetInitialSettings() {
        mediaInfoArr = [];
        mediaInfo = null;
        bufferingTime = 0;
        shouldUseExplicitTimeForRequest = false;
        manifestUpdateInProgress = false;
        qualityChangeInProgress = false;
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

        eventBus.off(Events.DATA_UPDATE_COMPLETED, _onDataUpdateCompleted, instance);
        eventBus.off(Events.INIT_FRAGMENT_NEEDED, _onInitFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_NEEDED, _onMediaFragmentNeeded, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, _onMediaFragmentLoaded, instance);
        eventBus.off(Events.BUFFER_LEVEL_STATE_CHANGED, _onBufferLevelStateChanged, instance);
        eventBus.off(Events.BUFFER_CLEARED, _onBufferCleared, instance);
        eventBus.off(Events.SEEK_TARGET, _onSeekTarget, instance);
        eventBus.off(Events.FRAGMENT_LOADING_ABANDONED, _onFragmentLoadingAbandoned, instance);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, _onFragmentLoadingCompleted, instance);
        eventBus.off(Events.SET_FRAGMENTED_TEXT_AFTER_DISABLED, _onSetFragmentedTextAfterDisabled, instance);
        eventBus.off(Events.SET_NON_FRAGMENTED_TEXT, _onSetNonFragmentedText, instance);
        eventBus.off(Events.QUOTA_EXCEEDED, _onQuotaExceeded, instance);
        eventBus.off(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.off(Events.STREAMS_COMPOSED, _onStreamsComposed, instance);

        resetInitialSettings();
        type = null;
        streamInfo = null;
    }

    function isUpdating() {
        return representationController ? representationController.isUpdating() : false;
    }

    /**
     * When a seek within the corresponding period occurs this function initiates the clearing of the buffer and sets the correct buffering time.
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
                    const targetTime = bufferController.getContinuousBufferTimeForTargetTime(e.seekTime);

                    // If the buffer is continuous and exceeds the duration of the period we are still done buffering. We need to trigger the buffering completed event in order to start prebuffering upcoming periods again
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

    /**
     * Seek outside of the current period.
     * @return {Promise<unknown>}
     */
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

    /**
     * ScheduleController indicates that an init segment needs to be fetched.
     * @param {object} e
     * @param {boolean} rescheduleIfNoRequest - Defines whether we reschedule in case no valid request could be generated
     * @private
     */
    function _onInitFragmentNeeded(e, rescheduleIfNoRequest = true) {
        // Event propagation may have been stopped (see MssHandler)
        if (!e.sender) return;

        if (manifestUpdateInProgress) {
            _noValidRequest();
            return;
        }

        if (getIsTextTrack() && !textController.isTextEnabled()) return;

        if (bufferController && e.representationId) {
            if (!bufferController.appendInitSegmentFromCache(e.representationId)) {
                const rep = representationController.getCurrentRepresentation();
                // Dummy init segment (fragmented tracks without initialization segment)
                if (rep.range === 0) {
                    _onMediaFragmentNeeded();
                    return;
                }
                // Init segment not in cache, send new request
                const request = dashHandler ? dashHandler.getInitRequest(getMediaInfo(), rep) : null;
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
     * @param {boolean} rescheduleIfNoRequest -  Defines whether we reschedule in case no valid request could be generated
     * @private
     */
    function _onMediaFragmentNeeded(e, rescheduleIfNoRequest = true) {

        if (manifestUpdateInProgress) {
            _noValidRequest();
            return;
        }

        let request = null;

        const representation = representationController.getCurrentRepresentation();
        const isMediaFinished = dashHandler.isMediaFinished(representation, bufferingTime);

        // Check if the media is finished. If so, no need to schedule another request
        if (isMediaFinished) {
            const segmentIndex = dashHandler.getCurrentIndex();
            logger.debug(`Segment requesting for stream ${streamInfo.id} has finished`);
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

        if (request) {
            logger.debug(`Next fragment request url for stream id ${streamInfo.id} and media type ${type} is ${request.url}`);
            fragmentModel.executeRequest(request);
        } else if (rescheduleIfNoRequest) {
            // Use case - Playing at the bleeding live edge and frag is not available yet. Cycle back around.
            _noValidRequest();
        }
    }

    /**
     * Get the init or media segment request using the DashHandler.
     * @return {null|FragmentRequest|null}
     * @private
     */
    function _getFragmentRequest() {
        const representationInfo = getRepresentationInfo();
        let request;

        if (isNaN(bufferingTime) || (getType() === Constants.TEXT && !textController.isTextEnabled())) {
            return null;
        }

        // Use time just whenever is strictly needed
        const useTime = shouldUseExplicitTimeForRequest;

        if (dashHandler) {
            const representation = representationController && representationInfo ? representationController.getRepresentationForQuality(representationInfo.quality) : null;

            if (useTime) {
                request = dashHandler.getSegmentRequestForTime(getMediaInfo(), representation, bufferingTime);
            } else {
                request = dashHandler.getNextSegmentRequest(getMediaInfo(), representation);
            }
        }

        return request;
    }

    /**
     * Whenever we can not generate a valid request we restart scheduling according to the timeouts defined in the settings.
     * @private
     */
    function _noValidRequest() {
        scheduleController.startScheduleTimer(settings.get().streaming.lowLatencyEnabled ? settings.get().streaming.scheduling.lowLatencyTimeout : settings.get().streaming.scheduling.defaultTimeout);
    }

    /**
     * A new manifest has been loaded, updating is still in progress. Wait for the update to be finished before fetching new segments.
     * Otherwise we end up in inconsistencies like wrong base urls especially if periods have been removed.
     * @private
     */
    function _onManifestUpdated() {
        manifestUpdateInProgress = true;
    }

    function _onStreamsComposed() {
        manifestUpdateInProgress = false;
    }

    function _onDataUpdateCompleted(e) {
        if (!e.error) {
            // Update representation if no error
            scheduleController.setCurrentRepresentation(adapter.convertRepresentationToRepresentationInfo(e.currentRepresentation));
            if (!bufferController.getIsBufferingCompleted()) {
                bufferController.updateBufferTimestampOffset(e.currentRepresentation);
            }
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
     * The quality has changed which means we have switched to a different representation.
     * If we want to aggressively replace existing parts in the buffer we need to make sure that the new quality is higher than the already buffered one.
     * @param {object} e
     * @private
     */
    function prepareQualityChange(e) {
        logger.debug(`Preparing quality switch for type ${type}`);
        const newQuality = e.newQuality;

        qualityChangeInProgress = true;

        // Stop scheduling until we are done with preparing the quality switch
        scheduleController.clearScheduleTimer();

        const representationInfo = getRepresentationInfo(newQuality);
        scheduleController.setCurrentRepresentation(representationInfo);
        representationController.prepareQualityChange(newQuality);

        // Abort the current request to avoid inconsistencies. A quality switch can also be triggered manually by the application.
        // If we update the buffer values now, or initialize a request to the new init segment, the currently downloading media segment might "work" with wrong values.
        // Everything that is already in the buffer queue is ok and will be handled by the corresponding function below depending on the switch mode.
        fragmentModel.abortRequests();

        // In any case we need to update the MSE.timeOffset
        bufferController.updateBufferTimestampOffset(representationInfo)
            .then(() => {

                // If the switch should occur immediately we need to replace existing stuff in the buffer
                if (e.reason && e.reason.forceReplace) {
                    _prepareReplacementQualitySwitch();
                }

                // If fast switch is enabled we check if we are supposed to replace existing stuff in the buffer
                else if (settings.get().streaming.buffer.fastSwitchEnabled) {
                    _prepareForFastQualitySwitch(representationInfo);
                }

                // Default quality switch. We append the new quality to the already buffered stuff
                else {
                    _prepareForDefaultQualitySwitch();
                }

                dashMetrics.pushPlayListTraceMetrics(new Date(), PlayListTrace.REPRESENTATION_SWITCH_STOP_REASON);
                dashMetrics.createPlaylistTraceMetrics(representationInfo.id, playbackController.getTime() * 1000, playbackController.getPlaybackRate());
            })
    }

    function _prepareReplacementQualitySwitch() {

        // Inform other classes like the GapController that we are replacing existing stuff
        eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
            mediaType: type,
            streamId: streamInfo.id
        }, { mediaType: type, streamId: streamInfo.id });

        // Abort appending segments to the buffer. Also adjust the appendWindow as we might have been in the progress of prebuffering stuff.
        bufferController.prepareForReplacementQualitySwitch()
            .then(() => {
                _bufferClearedForReplacement();
                qualityChangeInProgress = false;
            })
            .catch(() => {
                _bufferClearedForReplacement();
                qualityChangeInProgress = false;
            });
    }

    function _prepareForFastQualitySwitch(representationInfo) {
        // if we switch up in quality and need to replace existing parts in the buffer we need to adjust the buffer target
        const time = playbackController.getTime();
        let safeBufferLevel = 1.5;
        const request = fragmentModel.getRequests({
            state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
            time: time + safeBufferLevel,
            threshold: 0
        })[0];

        if (request && !getIsTextTrack()) {
            const bufferLevel = bufferController.getBufferLevel();
            const abandonmentState = abrController.getAbandonmentStateFor(streamInfo.id, type);

            if (request.quality < representationInfo.quality && bufferLevel >= safeBufferLevel && abandonmentState !== MetricsConstants.ABANDON_LOAD) {
                const targetTime = time + safeBufferLevel;
                setExplicitBufferingTime(targetTime);
                scheduleController.setCheckPlaybackQuality(false);
                scheduleController.startScheduleTimer();
            } else {
                _prepareForDefaultQualitySwitch();
            }
        } else {
            scheduleController.startScheduleTimer();
        }
        qualityChangeInProgress = false;
    }

    function _prepareForDefaultQualitySwitch() {
        // We might have aborted the current request. We need to set an explicit buffer time based on what we already have in the buffer.
        _bufferClearedForNonReplacement()
        qualityChangeInProgress = false;
    }

    /**
     * We have canceled the download of a fragment and need to adjust the buffer time or reload an init segment
     * @param {object} e
     */
    function _onFragmentLoadingAbandoned(e) {
        logger.info('onFragmentLoadingAbandoned request: ' + e.request.url + ' has been aborted');

        // we only need to handle this if we are not seeking, not switching the tracks and not switching the quality
        if (!playbackController.isSeeking() && !scheduleController.getSwitchStrack() && !qualityChangeInProgress) {
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

        if (getIsTextTrack()) {
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
                representationId: e.request.representationId,
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

        const mInfo = mediaInfoArr.find((info) => {
            return info.index === currentTrackInfo.index && info.lang === currentTrackInfo.lang;
        });

        if (mInfo) {
            selectMediaInfo(mInfo)
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
        scheduleController.clearScheduleTimer();
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

    /**
     * Called once the StreamProcessor is initialized and when the track is switched. We only have one StreamProcessor per media type. So we need to adjust the mediaInfo once we switch/select a track.
     * @param {object} newMediaInfo
     */
    function selectMediaInfo(newMediaInfo) {
        if (newMediaInfo !== mediaInfo && (!newMediaInfo || !mediaInfo || (newMediaInfo.type === mediaInfo.type))) {
            mediaInfo = newMediaInfo;
        }

        const newRealAdaptation = adapter.getRealAdaptation(streamInfo, mediaInfo);
        const voRepresentations = adapter.getVoRepresentations(mediaInfo);

        if (representationController) {
            const realAdaptation = representationController.getData();
            const maxQuality = abrController.getMaxAllowedIndexFor(type, streamInfo.id);
            const minIdx = abrController.getMinAllowedIndexFor(type, streamInfo.id);

            let quality,
                averageThroughput;
            let bitrate = null;

            if ((realAdaptation === null || (realAdaptation.id !== newRealAdaptation.id)) && type !== Constants.TEXT) {
                averageThroughput = abrController.getThroughputHistory().getAverageThroughput(type);
                bitrate = averageThroughput || abrController.getInitialBitrateFor(type, streamInfo.id);
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
            return representationController.updateData(newRealAdaptation, voRepresentations, type, mediaInfo.isFragmented, quality);
        } else {
            return Promise.resolve();
        }
    }

    function addMediaInfo(newMediaInfo) {
        if (mediaInfoArr.indexOf(newMediaInfo) === -1) {
            mediaInfoArr.push(newMediaInfo);
        }
    }

    function clearMediaInfoArray() {
        mediaInfoArr = [];
    }

    function getMediaInfo() {
        return mediaInfo;
    }

    function getMediaSource() {
        return bufferController.getMediaSource();
    }

    function setMediaSource(mediaSource) {
        bufferController.setMediaSource(mediaSource);
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

        return adapter.convertRepresentationToRepresentationInfo(voRepresentation);
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

        // If we switch tracks this event might be fired after the representations in the RepresentationController have been updated according to the new MediaInfo.
        // In this case there will be no currentRepresentation and voRepresentation matching the "old" quality
        if (currentRepresentation && voRepresentation) {
            const eventStreamMedia = adapter.getEventsFor(currentRepresentation.mediaInfo);
            const eventStreamTrack = adapter.getEventsFor(currentRepresentation, voRepresentation);

            if (eventStreamMedia && eventStreamMedia.length > 0 || eventStreamTrack && eventStreamTrack.length > 0) {
                const request = fragmentModel.getRequests({
                    state: FragmentModel.FRAGMENT_MODEL_EXECUTED,
                    quality: quality,
                    index: chunk.index
                })[0];

                const events = _handleInbandEvents(bytes, request, eventStreamMedia, eventStreamTrack);
                eventBus.trigger(Events.INBAND_EVENTS,
                    { events: events },
                    { streamId: streamInfo.id }
                );
            }
        }
    }

    function _handleInbandEvents(data, request, mediaInbandEvents, trackInbandEvents) {
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

    function createBufferSinks(previousBufferSinks) {
        const buffer = getBuffer();

        if (buffer) {
            return Promise.resolve(buffer);
        }

        return bufferController ? bufferController.createBufferSink(mediaInfo, previousBufferSinks) : Promise.resolve(null);
    }

    function prepareTrackSwitch() {
        return new Promise((resolve) => {
            logger.debug(`Preparing track switch for type ${type}`);
            const shouldReplace = type === Constants.TEXT || (settings.get().streaming.trackSwitchMode[type] === Constants.TRACK_SWITCH_MODE_ALWAYS_REPLACE && playbackController.getTimeToStreamEnd(streamInfo) > settings.get().streaming.buffer.stallThreshold);

            // when buffering is completed and we are not supposed to replace anything do nothing.
            // Still we need to trigger preloading again and call change type in case user seeks back before transitioning to next period
            if (bufferController.getIsBufferingCompleted() && !shouldReplace) {
                bufferController.prepareForNonReplacementTrackSwitch(mediaInfo.codec)
                    .then(() => {
                        eventBus.trigger(Events.BUFFERING_COMPLETED, {}, { streamId: streamInfo.id, mediaType: type })
                    })
                    .catch(() => {
                        eventBus.trigger(Events.BUFFERING_COMPLETED, {}, { streamId: streamInfo.id, mediaType: type })
                    })
                resolve();
                return;
            }

            // We stop the schedule controller and signal a track switch. That way we request a new init segment next
            scheduleController.clearScheduleTimer();
            scheduleController.setSwitchTrack(true);

            // when we are supposed to replace it does not matter if buffering is already completed
            if (shouldReplace) {
                // Inform other classes like the GapController that we are replacing existing stuff
                eventBus.trigger(Events.BUFFER_REPLACEMENT_STARTED, {
                    mediaType: type,
                    streamId: streamInfo.id
                }, { mediaType: type, streamId: streamInfo.id });

                // Abort the current request it will be removed from the buffer anyways
                fragmentModel.abortRequests();

                // Abort appending segments to the buffer. Also adjust the appendWindow as we might have been in the progress of prebuffering stuff.
                bufferController.prepareForReplacementTrackSwitch(mediaInfo.codec)
                    .then(() => {
                        // Timestamp offset couldve been changed by preloading period
                        const representationInfo = getRepresentationInfo();
                        return bufferController.updateBufferTimestampOffset(representationInfo);
                    })
                    .then(() => {
                        _bufferClearedForReplacement();
                        resolve();
                    })
                    .catch(() => {
                        _bufferClearedForReplacement();
                        resolve();
                    });
            } else {
                // We do not replace anything that is already in the buffer. Still we need to prepare the buffer for the track switch
                bufferController.prepareForNonReplacementTrackSwitch(mediaInfo.codec)
                    .then(() => {
                        _bufferClearedForNonReplacement();
                        resolve();
                    })
                    .catch(() => {
                        _bufferClearedForNonReplacement();
                        resolve();
                    });
            }
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
        const targetTime = bufferController.getContinuousBufferTimeForTargetTime(time);

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
                streamInfo,
                type,
                mimeType,
                fragmentModel,
                textController,
                errHandler,
                settings
            });
        } else {
            controller = BufferController(context).create({
                streamInfo,
                type,
                mediaPlayerModel,
                manifestModel,
                fragmentModel,
                errHandler,
                mediaController,
                representationController,
                adapter,
                textController,
                abrController,
                playbackController,
                settings
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
        clearMediaInfoArray,
        addMediaInfo,
        prepareTrackSwitch,
        prepareQualityChange,
        getMediaInfo,
        getMediaSource,
        setMediaSource,
        getBuffer,
        setExplicitBufferingTime,
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
