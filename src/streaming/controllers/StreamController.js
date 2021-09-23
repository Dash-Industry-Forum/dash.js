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
import MetricsConstants from '../constants/MetricsConstants';
import Stream from '../Stream';
import ManifestUpdater from '../ManifestUpdater';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import FactoryMaker from '../../core/FactoryMaker';
import {
    PlayList,
    PlayListTrace
} from '../vo/metrics/PlayList';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';
import URLUtils from '../utils/URLUtils';
import MediaPlayerEvents from '../MediaPlayerEvents';
import TimeSyncController from './TimeSyncController';
import MediaSourceController from './MediaSourceController';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';
import EventController from './EventController';
import ConformanceViolationConstants from '../constants/ConformanceViolationConstants';

const PLAYBACK_ENDED_TIMER_INTERVAL = 200;
const DVR_WAITING_OFFSET = 2;

function StreamController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        capabilities,
        capabilitiesFilter,
        manifestUpdater,
        manifestLoader,
        manifestModel,
        adapter,
        dashMetrics,
        mediaSourceController,
        timeSyncController,
        baseURLController,
        segmentBaseController,
        uriFragmentModel,
        abrController,
        mediaController,
        eventController,
        initCache,
        urlUtils,
        errHandler,
        timelineConverter,
        streams,
        activeStream,
        protectionController,
        textController,
        protectionData,
        autoPlay,
        isStreamSwitchingInProgress,
        hasMediaError,
        hasInitialisationError,
        mediaSource,
        videoModel,
        playbackController,
        mediaPlayerModel,
        isPaused,
        initialPlayback,
        playbackEndedTimerInterval,
        bufferSinks,
        preloadingStreams,
        supportsChangeType,
        settings,
        firstLicenseIsFetched,
        waitForPlaybackStartTimeout,
        errorInformation;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        timeSyncController = TimeSyncController(context).getInstance();
        mediaSourceController = MediaSourceController(context).getInstance();
        initCache = InitCache(context).getInstance();
        urlUtils = URLUtils(context).getInstance();

        resetInitialSettings();
    }

    function initialize(autoPl, protData) {
        checkConfig();

        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();

        manifestUpdater = ManifestUpdater(context).create();
        manifestUpdater.setConfig({
            manifestModel: manifestModel,
            adapter: adapter,
            manifestLoader: manifestLoader,
            errHandler: errHandler,
            settings: settings
        });
        manifestUpdater.initialize();

        eventController = EventController(context).getInstance();
        eventController.setConfig({
            manifestUpdater: manifestUpdater,
            playbackController: playbackController,
            settings
        });
        eventController.start();


        timeSyncController.setConfig({
            dashMetrics,
            baseURLController,
            errHandler,
            settings
        });
        timeSyncController.initialize();

        if (protectionController) {
            eventBus.trigger(Events.PROTECTION_CREATED, {
                controller: protectionController
            });
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        registerEvents();
    }

    function registerEvents() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_ERROR, _onPlaybackError, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, _onManifestValidityChanged, instance);
        eventBus.on(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.on(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);

        if (Events.KEY_SESSION_UPDATED) {
            eventBus.on(Events.KEY_SESSION_UPDATED, _onKeySessionUpdated, instance);
        }

        eventBus.on(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, _onStreamBufferingCompleted, instance);
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, _onTimeSyncCompleted, instance);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, instance);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, _onCurrentTrackChanged, instance);
    }

    function unRegisterEvents() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_ERROR, _onPlaybackError, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_ENDED, _onPlaybackEnded, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, _onMetricAdded, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, _onManifestValidityChanged, instance);
        eventBus.off(MediaPlayerEvents.BUFFER_LEVEL_UPDATED, _onBufferLevelUpdated, instance);
        eventBus.off(MediaPlayerEvents.QUALITY_CHANGE_REQUESTED, _onQualityChanged, instance);

        if (Events.KEY_SESSION_UPDATED) {
            eventBus.off(Events.KEY_SESSION_UPDATED, _onKeySessionUpdated, instance);
        }

        eventBus.off(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, _onStreamBufferingCompleted, instance);
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, _onTimeSyncCompleted, instance);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, instance);
        eventBus.off(Events.CURRENT_TRACK_CHANGED, _onCurrentTrackChanged, instance);
    }

    /**
     * When the UTC snychronization is completed we can compose the streams
     * @private
     */
    function _onTimeSyncCompleted( /*e*/) {
        _composeStreams();
    }

    /**
     *
     * @private
     */
    function _onKeySessionUpdated() {
        firstLicenseIsFetched = true;
    }

    /**
     * Setup the stream objects after the stream start and each MPD reload. This function is called after the UTC sync has been done (TIME_SYNCHRONIZATION_COMPLETED)
     * @private
     */
    function _composeStreams() {
        try {
            const streamsInfo = adapter.getStreamsInfo();

            if (!activeStream && streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }

            if (activeStream) {
                dashMetrics.updateManifestUpdateInfo({
                    currentTime: playbackController.getTime(),
                    buffered: videoModel.getBufferRange(),
                    presentationStartTime: streamsInfo[0].start,
                    clientTimeOffset: timelineConverter.getClientTimeOffset()
                });
            }

            // Filter streams that are outdated and not included in the MPD anymore
            if (streams.length > 0) {
                _filterOutdatedStreams(streamsInfo);
            }

            const promises = [];
            for (let i = 0, ln = streamsInfo.length; i < ln; i++) {
                const streamInfo = streamsInfo[i];
                promises.push(_initializeOrUpdateStream(streamInfo));
                dashMetrics.addManifestUpdateStreamInfo(streamInfo);
            }

            Promise.all(promises)
                .then(() => {
                    if (!activeStream) {
                        _initializeForFirstStream(streamsInfo);
                    }
                    eventBus.trigger(Events.STREAMS_COMPOSED);
                    // Additional periods might have been added after an MPD update. Check again if we can start prebuffering.
                    _checkIfPrebufferingCanStart();
                })
                .catch((e) => {
                    throw e;
                })

        } catch (e) {
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, e.message + 'nostreamscomposed', manifestModel.getValue()));
            hasInitialisationError = true;
            reset();
        }
    }

    /**
     * Called for each stream when composition is performed. Either a new instance of Stream is created or the existing one is updated.
     * @param {object} streamInfo
     * @private
     */
    function _initializeOrUpdateStream(streamInfo) {
        let stream = getStreamById(streamInfo.id);

        // If the Stream object does not exist we probably loaded the manifest the first time or it was
        // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
        if (!stream) {
            stream = Stream(context).create({
                manifestModel,
                mediaPlayerModel,
                dashMetrics,
                manifestUpdater,
                adapter,
                timelineConverter,
                capabilities,
                capabilitiesFilter,
                errHandler,
                baseURLController,
                segmentBaseController,
                textController,
                abrController,
                playbackController,
                eventController,
                mediaController,
                protectionController,
                videoModel,
                streamInfo,
                settings
            });
            streams.push(stream);
            stream.initialize();
            return Promise.resolve();
        } else {
            return stream.updateData(streamInfo);
        }
    }

    /**
     * Initialize playback for the first period.
     * @param {object} streamsInfo
     * @private
     */
    function _initializeForFirstStream(streamsInfo) {

        // Add the DVR window so we can calculate the right starting point
        _addDVRMetric();

        // If the start is in the future we need to wait
        const dvrRange = dashMetrics.getCurrentDVRInfo().range;
        if (dvrRange.end < dvrRange.start) {
            if (waitForPlaybackStartTimeout) {
                clearTimeout(waitForPlaybackStartTimeout);
            }
            const waitingTime = Math.min((((dvrRange.end - dvrRange.start) * -1) + DVR_WAITING_OFFSET) * 1000, 2147483647);
            logger.debug(`Waiting for ${waitingTime} ms before playback can start`);
            eventBus.trigger(Events.AST_IN_FUTURE, { delay: waitingTime });
            waitForPlaybackStartTimeout = setTimeout(() => {
                _initializeForFirstStream(streamsInfo);
            }, waitingTime);
            return;
        }

        // Compute and set the live delay
        if (adapter.getIsDynamic() && streams.length) {
            const manifestInfo = streamsInfo[0].manifestInfo;
            const fragmentDuration = _getFragmentDurationForLiveDelayCalculation(streamsInfo, manifestInfo);
            playbackController.computeAndSetLiveDelay(fragmentDuration, manifestInfo);
        }

        // Figure out the correct start time and the correct start period
        const startTime = _getInitialStartTime();
        let initialStream = getStreamForTime(startTime);
        const startStream = initialStream !== null ? initialStream : streams[0];

        eventBus.trigger(Events.INITIAL_STREAM_SWITCH, { startTime });
        _switchStream(startStream, null, startTime);
        _startPlaybackEndedTimerInterval();
    }

    /**
     * Switch from the current stream (period) to the next stream (period).
     * @param {object} stream
     * @param {object} previousStream
     * @param {number} seekTime
     * @private
     */
    function _switchStream(stream, previousStream, seekTime) {
        try {
            if (isStreamSwitchingInProgress || !stream || (previousStream === stream && stream.getIsActive())) {
                return;
            }

            isStreamSwitchingInProgress = true;
            eventBus.trigger(Events.STREAM_SWITCH_STARTED, {
                fromStreamInfo: previousStream ? previousStream.getStreamInfo() : null,
                toStreamInfo: stream.getStreamInfo()
            });

            let keepBuffers = false;
            activeStream = stream;

            if (previousStream) {
                keepBuffers = _canSourceBuffersBeReused(stream, previousStream);
                previousStream.deactivate(keepBuffers);
            }

            // Determine seek time when switching to new period
            // - seek at given seek time
            // - or seek at period start if upcoming period is not prebuffered
            seekTime = !isNaN(seekTime) ? seekTime : (!keepBuffers && previousStream ? stream.getStreamInfo().start : NaN);
            logger.info(`Switch to stream ${stream.getId()}. Seektime is ${seekTime}, current playback time is ${playbackController.getTime()}. Seamless period switch is set to ${keepBuffers}`);

            preloadingStreams = preloadingStreams.filter((s) => {
                return s.getId() !== activeStream.getId();
            });
            playbackController.initialize(getActiveStreamInfo(), !!previousStream);

            if (videoModel.getElement()) {
                _openMediaSource(seekTime, keepBuffers);
            }
        } catch (e) {
            isStreamSwitchingInProgress = false;
        }
    }

    /**
     * Setup the Media Source. Open MSE and attach event listeners
     * @param {number} seekTime
     * @param {boolean} keepBuffers
     * @private
     */
    function _openMediaSource(seekTime, keepBuffers) {
        let sourceUrl;

        function _onMediaSourceOpen() {
            // Manage situations in which a call to reset happens while MediaSource is being opened
            if (!mediaSource || mediaSource.readyState !== 'open') return;

            logger.debug('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', _onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', _onMediaSourceOpen);

            _setMediaDuration();
            const dvrInfo = dashMetrics.getCurrentDVRInfo();
            mediaSourceController.setSeekable(dvrInfo.range.start, dvrInfo.range.end);
            _activateStream(seekTime, keepBuffers);
        }

        function _open() {
            mediaSource.addEventListener('sourceopen', _onMediaSourceOpen, false);
            mediaSource.addEventListener('webkitsourceopen', _onMediaSourceOpen, false);
            sourceUrl = mediaSourceController.attachMediaSource(videoModel);
            logger.debug('MediaSource attached to element.  Waiting on open...');
        }

        if (!mediaSource) {
            mediaSource = mediaSourceController.createMediaSource();
            _open();
        } else {
            if (keepBuffers) {
                _activateStream(seekTime, keepBuffers);
            } else {
                mediaSourceController.detachMediaSource(videoModel);
                _open();
            }
        }
    }

    /**
     * Activates a new stream.
     * @param {number} seekTime
     * @param {boolean} keepBuffers
     */
    function _activateStream(seekTime, keepBuffers) {
        activeStream.activate(mediaSource, keepBuffers ? bufferSinks : undefined, seekTime)
            .then((sinks) => {
                // check if change type is supported by the browser
                if (sinks) {
                    const keys = Object.keys(sinks);
                    if (keys.length > 0 && sinks[keys[0]].getBuffer().changeType) {
                        supportsChangeType = true;
                    }
                    bufferSinks = sinks;
                }

                // Set the initial time for this stream in the StreamProcessor
                if (!isNaN(seekTime)) {
                    eventBus.trigger(Events.SEEK_TARGET, { time: seekTime }, { streamId: activeStream.getId() });
                    playbackController.seek(seekTime, false, true);
                    activeStream.startScheduleControllers();
                }

                isStreamSwitchingInProgress = false;
                eventBus.trigger(Events.PERIOD_SWITCH_COMPLETED, { toStreamInfo: getActiveStreamInfo() });
            });
    }

    /**
     * A playback seeking event was triggered. We need to disable the preloading streams and call the respective seeking handler.
     * We distinguish between inner period seeks and outer period seeks
     * @param {object} e
     * @private
     */
    function _onPlaybackSeeking(e) {
        const oldTime = playbackController.getTime();
        const newTime = e.seekTime;
        const seekToStream = getStreamForTime(newTime);

        if (!seekToStream || seekToStream === activeStream) {
            _cancelPreloading(oldTime, newTime);
            _handleInnerPeriodSeek(e);
        } else if (seekToStream && seekToStream !== activeStream) {
            _cancelPreloading(oldTime, newTime, seekToStream);
            _handleOuterPeriodSeek(e, seekToStream);
        }

        createPlaylistMetrics(PlayList.SEEK_START_REASON);
    }

    /**
     * Cancels the preloading of certain streams based on the position we are seeking to.
     * @param {number} oldTime
     * @param {number} newTime
     * @param {boolean} isInnerPeriodSeek
     * @private
     */
    function _cancelPreloading(oldTime, newTime, seekToStream = null) {
        // Inner period seek forward
        if (oldTime <= newTime && !seekToStream) {
            _deactivateAllPreloadingStreams();
        }

        // Inner period seek: If we seek backwards we might need to prune the period(s) that are currently being prebuffered. For now deactivate everything
        else if (oldTime > newTime && !seekToStream) {
            _deactivateAllPreloadingStreams();
        }

        // Outer period seek: Deactivate everything for now
        else {
            _deactivateAllPreloadingStreams();
        }

    }

    /**
     * Deactivates all preloading streams
     * @private
     */
    function _deactivateAllPreloadingStreams() {
        if (preloadingStreams && preloadingStreams.length > 0) {
            preloadingStreams.forEach((s) => {
                s.deactivate(true);
            });
            preloadingStreams = [];
        }
    }

    /**
     * Handle an inner period seek. Prepare all StreamProcessors for the seek.
     * @param {object} e
     * @private
     */
    function _handleInnerPeriodSeek(e) {
        const streamProcessors = activeStream.getProcessors();

        streamProcessors.forEach((sp) => {
            return sp.prepareInnerPeriodPlaybackSeeking(e);
        });

        _flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
    }

    /**
     * Handle an outer period seek. Dispatch the corresponding event to be handled in the BufferControllers and the ScheduleControllers
     * @param {object} e
     * @param {object} seekToStream
     * @private
     */
    function _handleOuterPeriodSeek(e, seekToStream) {
        // Stop segment requests
        const seekTime = e && !isNaN(e.seekTime) ? e.seekTime : NaN;
        const streamProcessors = activeStream.getProcessors();

        const promises = streamProcessors.map((sp) => {
            // Cancel everything in case the active stream is still buffering
            return sp.prepareOuterPeriodPlaybackSeeking(e);
        });

        Promise.all(promises)
            .then(() => {
                _switchStream(seekToStream, activeStream, seekTime);
            })
            .catch((e) => {
                errHandler.error(e);
            });
    }

    /**
     * A track change occured. We deactivate the preloading streams
     * @param {object} e
     * @private
     */
    function _onCurrentTrackChanged(e) {
        // Track was changed in non active stream. No need to do anything, this only happens when a stream starts preloading
        if (e.newMediaInfo.streamInfo.id !== activeStream.getId()) {
            return;
        }

        // If the track was changed in the active stream we need to stop preloading and remove the already prebuffered stuff. Since we do not support preloading specific handling of specific AdaptationSets yet.
        _deactivateAllPreloadingStreams();

        activeStream.prepareTrackChange(e);
    }

    /**
     * If the source buffer can be reused we can potentially start buffering the next period
     * @param {object} nextStream
     * @param {object} previousStream
     * @return {boolean}
     * @private
     */
    function _canSourceBuffersBeReused(nextStream, previousStream) {
        try {
            // Seamless period switch allowed only if:
            // - none of the periods uses contentProtection.
            // - AND changeType method implemented by browser or periods use the same codec.
            return (settings.get().streaming.buffer.reuseExistingSourceBuffers && (previousStream.isProtectionCompatible(nextStream) || firstLicenseIsFetched) && (supportsChangeType || previousStream.isMediaCodecCompatible(nextStream, previousStream)));
        } catch (e) {
            return false;
        }
    }

    /**
     * Initiate the preloading of the next stream
     * @param {object} nextStream
     * @param {object} previousStream
     * @private
     */
    function _onStreamCanLoadNext(nextStream, previousStream = null) {

        if (mediaSource && !nextStream.getPreloaded()) {
            let seamlessPeriodSwitch = _canSourceBuffersBeReused(nextStream, previousStream);

            if (seamlessPeriodSwitch) {
                nextStream.startPreloading(mediaSource, bufferSinks)
                    .then(() => {
                        preloadingStreams.push(nextStream);
                    });
            }
        }
    }

    /**
     * Returns the corresponding stream object for a specific presentation time.
     * @param {number} time
     * @return {null|object}
     */
    function getStreamForTime(time) {

        if (isNaN(time)) {
            return null;
        }

        const ln = streams.length;

        for (let i = 0; i < ln; i++) {
            const stream = streams[i];
            const streamEnd = parseFloat((stream.getStartTime() + stream.getDuration()).toFixed(5));

            if (time < streamEnd) {
                return stream;
            }
        }

        return null;
    }

    /**
     * Add the DVR window to the metric list. We need the DVR window to restrict the seeking and calculate the right start time.
     */
    function _addDVRMetric() {
        try {
            const isDynamic = adapter.getIsDynamic();
            const streamsInfo = adapter.getStreamsInfo();
            const manifestInfo = streamsInfo[0].manifestInfo;
            const time = playbackController.getTime();
            const range = timelineConverter.calcTimeShiftBufferWindow(streams, isDynamic);
            const activeStreamProcessors = getActiveStreamProcessors();

            if (typeof range.start === 'undefined' || typeof range.end === 'undefined') {
                return;
            }

            if (!activeStreamProcessors || activeStreamProcessors.length === 0) {
                dashMetrics.addDVRInfo(Constants.VIDEO, time, manifestInfo, range);
            } else {
                activeStreamProcessors.forEach((sp) => {
                    dashMetrics.addDVRInfo(sp.getType(), time, manifestInfo, range);
                });
            }
        } catch (e) {
        }
    }

    /**
     * The buffer level for a certain media type has been updated. If this is the initial playback and we want to autoplay the content we check if we can start playback now.
     * For livestreams we might have a drift of the target live delay compared to the current live delay because reaching the initial buffer level took time.
     * @param {object} e
     * @private
     */
    function _onBufferLevelUpdated(e) {

        // check if this is the initial playback and we reached the buffer target. If autoplay is true we start playback
        if (initialPlayback && autoPlay) {
            const initialBufferLevel = mediaPlayerModel.getInitialBufferLevel();

            if (isNaN(initialBufferLevel) || initialBufferLevel <= playbackController.getBufferLevel() || (adapter.getIsDynamic() && initialBufferLevel > playbackController.getLiveDelay())) {
                initialPlayback = false;
                createPlaylistMetrics(PlayList.INITIAL_PLAYOUT_START_REASON);
                playbackController.play();
            }
        }

        if (e && e.mediaType) {
            dashMetrics.addBufferLevel(e.mediaType, new Date(), e.bufferLevel * 1000);
        }
    }

    /**
     * When the quality is changed in the currently active stream and we do an aggressive replacement we must stop prebuffering. This is similar to a replacing track switch
     * Otherwise preloading can go on.
     * @param e
     * @private
     */
    function _onQualityChanged(e) {
        if (e.streamInfo.id === activeStream.getId() && e.reason && e.reason.forceReplace) {
            _deactivateAllPreloadingStreams();
        }

        const stream = getStreamById(e.streamInfo.id);

        stream.prepareQualityChange(e);
    }

    /**
     * Update the DVR window when the wallclock time has updated
     * @private
     */
    function _onWallclockTimeUpdated() {
        if (adapter.getIsDynamic()) {
            _addDVRMetric();
        }
    }

    /**
     * When the playback time is updated we add the droppedFrames metric to the dash metric object
     * @private
     */
    function _onPlaybackTimeUpdated(/*e*/) {
        if (hasVideoTrack()) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                dashMetrics.addDroppedFrames(playbackQuality);
            }
        }
    }

    /**
     * Once playback starts add playlist metrics depending on whether this was the first playback or playback resumed after pause
     * @private
     */
    function _onPlaybackStarted( /*e*/) {
        logger.debug('[onPlaybackStarted]');
        if (!initialPlayback && isPaused) {
            isPaused = false;
            createPlaylistMetrics(PlayList.RESUME_FROM_PAUSE_START_REASON);
        }
    }

    /**
     * Once playback is paused flush metrics
     * @param {object} e
     * @private
     */
    function _onPlaybackPaused(e) {
        logger.debug('[onPlaybackPaused]');
        if (!e.ended) {
            isPaused = true;
            _flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }
    }

    /**
     * Callback once a stream/period is completely buffered. We can either signal the end of the stream or start prebuffering the next period.
     * @param {object} e
     * @private
     */
    function _onStreamBufferingCompleted(e) {
        logger.debug(`Stream with id ${e.streamInfo.id} finished buffering`);
        const isLast = e.streamInfo.isLast;
        if (mediaSource && isLast) {
            logger.info('[onStreamBufferingCompleted] calls signalEndOfStream of mediaSourceController.');
            mediaSourceController.signalEndOfStream(mediaSource);
        } else {
            _checkIfPrebufferingCanStart();
        }
    }

    /**
     * Check if we can start prebuffering the next period.
     * @private
     */
    function _checkIfPrebufferingCanStart() {
        // In multiperiod situations, we can start buffering the next stream
        if (!activeStream || !activeStream.getHasFinishedBuffering()) {
            return;
        }
        const upcomingStreams = _getNextStreams(activeStream);
        let i = 0;

        while (i < upcomingStreams.length) {
            const stream = upcomingStreams[i];
            const previousStream = i === 0 ? activeStream : upcomingStreams[i - 1];

            // If the preloading for the current stream is not scheduled, but its predecessor has finished buffering we can start prebuffering this stream
            if (!stream.getPreloaded() && previousStream.getHasFinishedBuffering()) {
                if (mediaSource) {
                    _onStreamCanLoadNext(stream, previousStream);
                }
            }
            i += 1;
        }
    }

    /**
     * In some cases we need to fire the playback ended event manually
     * @private
     */
    function _startPlaybackEndedTimerInterval() {
        if (!playbackEndedTimerInterval) {
            playbackEndedTimerInterval = setInterval(function () {
                if (!isStreamSwitchingInProgress && playbackController.getTimeToStreamEnd() <= 0 && !playbackController.isSeeking()) {
                    eventBus.trigger(Events.PLAYBACK_ENDED, { 'isLast': getActiveStreamInfo().isLast });
                }
            }, PLAYBACK_ENDED_TIMER_INTERVAL);
        }
    }

    /**
     * Stop the check if the playback has ended
     * @private
     */
    function _stopPlaybackEndedTimerInterval() {
        if (playbackEndedTimerInterval) {
            clearInterval(playbackEndedTimerInterval);
            playbackEndedTimerInterval = null;
        }
    }

    /**
     * Returns a playhead time, in seconds, converted to be relative
     * to the start of an identified stream/period or null if no such stream
     * @param {number} time
     * @param {string} id
     * @returns {number|null}
     */
    function getTimeRelativeToStreamId(time, id) {
        let stream = null;
        let baseStart = 0;
        let streamStart = 0;
        let streamDur = null;

        for (let i = 0; i < streams.length; i++) {
            stream = streams[i];
            streamStart = stream.getStartTime();
            streamDur = stream.getDuration();

            // use start time, if not undefined or NaN or similar
            if (Number.isFinite(streamStart)) {
                baseStart = streamStart;
            }

            if (stream.getId() === id) {
                return time - baseStart;
            } else {
                // use duration if not undefined or NaN or similar
                if (Number.isFinite(streamDur)) {
                    baseStart += streamDur;
                }
            }
        }

        return null;
    }

    /**
     * Returns the streamProcessors of the active stream.
     * @return {array}
     */
    function getActiveStreamProcessors() {
        return activeStream ? activeStream.getProcessors() : [];
    }

    /**
     * Once playback has ended we switch to the next stream
     * @param {object} e
     */
    function _onPlaybackEnded(e) {
        if (activeStream && !activeStream.getIsEndedEventSignaled()) {
            activeStream.setIsEndedEventSignaled(true);
            const nextStream = _getNextStream();
            if (nextStream) {
                logger.debug(`StreamController onEnded, found next stream with id ${nextStream.getStreamInfo().id}. Switching from ${activeStream.getStreamInfo().id} to ${nextStream.getStreamInfo().id}`);
                _switchStream(nextStream, activeStream, NaN);
            } else {
                logger.debug('StreamController no next stream found');
                activeStream.setIsEndedEventSignaled(false);
            }
            _flushPlaylistMetrics(nextStream ? PlayListTrace.END_OF_PERIOD_STOP_REASON : PlayListTrace.END_OF_CONTENT_STOP_REASON);
        }
        if (e && e.isLast) {
            _stopPlaybackEndedTimerInterval();
        }
    }

    /**
     * Returns the next stream to be played relative to the stream provided. If no stream is provided we use the active stream.
     * In order to avoid rounding issues we should not use the duration of the periods. Instead find the stream with starttime closest to startTime of the previous stream.
     * @param {object} stream
     * @return {null|object}
     */
    function _getNextStream(stream = null) {
        const refStream = stream ? stream : activeStream ? activeStream : null;

        if (!refStream) {
            return null;
        }

        const refStreamInfo = refStream.getStreamInfo();
        const start = refStreamInfo.start;
        let i = 0;
        let targetIndex = -1;
        let lastDiff = NaN;

        while (i < streams.length) {
            const s = streams[i];
            const sInfo = s.getStreamInfo();
            const diff = sInfo.start - start;

            if (diff > 0 && (isNaN(lastDiff) || diff < lastDiff) && refStreamInfo.id !== sInfo.id) {
                lastDiff = diff;
                targetIndex = i;
            }

            i += 1;
        }

        if (targetIndex >= 0) {
            return streams[targetIndex];
        }

        return null;
    }

    /**
     * Returns all upcoming streams relative to the provided stream. If no stream is provided we use the active stream.
     * @param {object} stream
     * @return {array}
     */
    function _getNextStreams(stream = null) {
        try {
            const refStream = stream ? stream : activeStream ? activeStream : null;

            if (refStream) {
                const refStreamInfo = refStream.getStreamInfo();

                return streams.filter(function (stream) {
                    const sInfo = stream.getStreamInfo();
                    return sInfo.start > refStreamInfo.start && refStreamInfo.id !== sInfo.id;
                });
            }
        } catch (e) {
            return [];
        }
    }

    /**
     * Sets the duration attribute of the MediaSource using the MediaSourceController.
     * @param {number} duration
     * @private
     */
    function _setMediaDuration(duration) {
        const manifestDuration = duration ? duration : getActiveStreamInfo().manifestInfo.duration;
        mediaSourceController.setDuration(manifestDuration);
    }

    /**
     * Returns the active stream
     * @return {object}
     */
    function getActiveStream() {
        return activeStream;
    }

    /**
     * Called once the first stream has been initialized. We only use this function to seek to the right start time.
     * @return {number}
     * @private
     */
    function _getInitialStartTime() {
        // Seek new stream in priority order:
        // - at start time provided in URI parameters
        // - at stream/period start time (for static streams) or live start time (for dynamic streams)
        let startTime;
        if (adapter.getIsDynamic()) {
            // For dynamic stream, start by default at (live edge - live delay)
            const dvrInfo = dashMetrics.getCurrentDVRInfo();
            const liveEdge = dvrInfo && dvrInfo.range ? dvrInfo.range.end : 0;
            // we are already in the right start period. so time should not be smaller than period@start and should not be larger than period@end
            startTime = liveEdge - playbackController.getLiveDelay();
            // If start time in URI, take min value between live edge time and time from URI (capped by DVR window range)
            const dvrWindow = dvrInfo ? dvrInfo.range : null;
            if (dvrWindow) {
                // #t shall be relative to period start
                const startTimeFromUri = _getStartTimeFromUriParameters(true);
                if (!isNaN(startTimeFromUri)) {
                    logger.info('Start time from URI parameters: ' + startTimeFromUri);
                    startTime = Math.max(Math.min(startTime, startTimeFromUri), dvrWindow.start);
                }
            }
        } else {
            // For static stream, start by default at period start
            const streams = getStreams();
            const streamInfo = streams[0].getStreamInfo();
            startTime = streamInfo.start;
            // If start time in URI, take max value between period start and time from URI (if in period range)
            const startTimeFromUri = _getStartTimeFromUriParameters(false);
            if (!isNaN(startTimeFromUri)) {
                logger.info('Start time from URI parameters: ' + startTimeFromUri);
                startTime = Math.max(startTime, startTimeFromUri);
            }
        }

        return startTime;
    }

    /**
     * 23009-1 Annex C.4 defines MPD anchors to use URI fragment syntax to start a presentation at a given time and a given state
     * @param {boolean} isDynamic
     * @return {number}
     * @private
     */
    function _getStartTimeFromUriParameters(isDynamic) {
        const fragData = uriFragmentModel.getURIFragmentData();
        if (!fragData || !fragData.t) {
            return NaN;
        }
        const refStream = getStreams()[0];
        const refStreamStartTime = refStream.getStreamInfo().start;
        // Consider only start time of MediaRange
        // TODO: consider end time of MediaRange to stop playback at provided end time
        fragData.t = fragData.t.split(',')[0];
        // "t=<time>" : time is relative to 1st period start
        // "t=posix:<time>" : time is absolute start time as number of seconds since 01-01-1970
        const posix = fragData.t.indexOf('posix:') !== -1 ? fragData.t.substring(6) === 'now' ? Date.now() / 1000 : parseInt(fragData.t.substring(6)) : NaN;
        let startTime = (isDynamic && !isNaN(posix)) ? posix - playbackController.getAvailabilityStartTime() / 1000 : parseInt(fragData.t) + refStreamStartTime;
        return startTime;
    }

    /**
     * Streams that are no longer in the manifest can be filtered
     * @param {object} streamsInfo
     * @private
     */
    function _filterOutdatedStreams(streamsInfo) {
        streams = streams.filter((stream) => {
            const isStillIncluded = streamsInfo.filter((sInfo) => {
                return sInfo.id === stream.getId();
            }).length > 0;

            const shouldKeepStream = isStillIncluded || stream.getId() === activeStream.getId();

            if (!shouldKeepStream) {
                logger.debug(`Removing stream ${stream.getId()}`);
                stream.reset(true);
            }

            return shouldKeepStream;
        });
    }

    /**
     * In order to calculate the initial live delay we might required the duration of the segments.
     * @param {array} streamInfos
     * @param {object} manifestInfo
     * @return {number}
     * @private
     */
    function _getFragmentDurationForLiveDelayCalculation(streamInfos, manifestInfo) {
        try {
            let fragmentDuration = NaN;

            //  We use the maxFragmentDuration attribute if present
            if (manifestInfo && !isNaN(manifestInfo.maxFragmentDuration) && isFinite(manifestInfo.maxFragmentDuration)) {
                return manifestInfo.maxFragmentDuration;
            }

            // For single period manifests we can iterate over all AS and use the maximum segment length
            if (streamInfos && streamInfos.length === 1) {
                const streamInfo = streamInfos[0];
                const mediaTypes = [Constants.VIDEO, Constants.AUDIO, Constants.TEXT];


                const fragmentDurations = mediaTypes
                    .reduce((acc, mediaType) => {
                        const mediaInfo = adapter.getMediaInfoForType(streamInfo, mediaType);

                        if (mediaInfo && mediaInfo.isFragmented !== false) {
                            acc.push(mediaInfo);
                        }

                        return acc;
                    }, [])
                    .reduce((acc, mediaInfo) => {
                        const voRepresentations = adapter.getVoRepresentations(mediaInfo);

                        if (voRepresentations && voRepresentations.length > 0) {
                            voRepresentations.forEach((voRepresentation) => {
                                if (voRepresentation) {
                                    acc.push(voRepresentation);
                                }
                            });
                        }

                        return acc;
                    }, [])
                    .reduce((acc, voRepresentation) => {
                        const representation = adapter.convertRepresentationToRepresentationInfo(voRepresentation);

                        if (representation && representation.fragmentDuration && !isNaN(representation.fragmentDuration)) {
                            acc.push(representation.fragmentDuration);
                        }

                        return acc;
                    }, []);

                fragmentDuration = Math.max(...fragmentDurations);
            }

            return isFinite(fragmentDuration) ? fragmentDuration : NaN;
        } catch (e) {
            return NaN;
        }
    }

    /**
     * Callback handler after the manifest has been updated. Trigger an update in the adapter and filter unsupported stuff.
     * Finally attempt UTC sync
     * @param {object} e
     * @private
     */
    function _onManifestUpdated(e) {
        if (!e.error) {
            logger.info('Manifest updated... updating data system wide.');
            //Since streams are not composed yet , need to manually look up useCalculatedLiveEdgeTime to detect if stream
            //is SegmentTimeline to avoid using time source
            const manifest = e.manifest;
            adapter.updatePeriods(manifest);

            let manifestUTCTimingSources = adapter.getUTCTimingSources();

            if (adapter.getIsDynamic() && (!manifestUTCTimingSources || manifestUTCTimingSources.length === 0)) {
                eventBus.trigger(MediaPlayerEvents.CONFORMANCE_VIOLATION, {
                    level: ConformanceViolationConstants.LEVELS.WARNING,
                    event: ConformanceViolationConstants.EVENTS.NO_UTC_TIMING_ELEMENT
                });
            }

            let allUTCTimingSources = (!adapter.getIsDynamic()) ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
            const isHTTPS = urlUtils.isHTTPS(e.manifest.url);

            //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
            allUTCTimingSources.forEach(function (item) {
                if (item.value.replace(/.*?:\/\//g, '') === mediaPlayerModel.getDefaultUtcTimingSource().value.replace(/.*?:\/\//g, '')) {
                    item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                    logger.debug('Matching default timing source protocol to manifest protocol: ', item.value);
                }
            });

            // It is important to filter before initializing the baseUrlController. Otherwise we might end up with wrong references in case we remove AdaptationSets.
            capabilitiesFilter.filterUnsupportedFeatures(manifest)
                .then(() => {
                    baseURLController.initialize(manifest);
                    timeSyncController.attemptSync(allUTCTimingSources, adapter.getIsDynamic());
                });
        } else {
            hasInitialisationError = true;
            reset();
        }
    }

    /**
     * Check if the stream has a video track
     * @return {boolean}
     */
    function hasVideoTrack() {
        return activeStream ? activeStream.getHasVideoTrack() : false;
    }

    /**
     * Check if the stream has an audio track
     * @return {boolean}
     */
    function hasAudioTrack() {
        return activeStream ? activeStream.getHasAudioTrack() : false;
    }


    function switchToVideoElement(seekTime) {
        if (activeStream) {
            playbackController.initialize(getActiveStreamInfo());
            _openMediaSource(seekTime, false);
        }
    }

    function _flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        getActiveStreamProcessors().forEach(p => {
            p.finalisePlayList(time, reason);
        });
        dashMetrics.addPlayList();
    }

    function createPlaylistMetrics(startReason) {
        dashMetrics.createPlaylistMetrics(playbackController.getTime() * 1000, startReason);
    }

    function _onPlaybackError(e) {
        if (!e.error) return;

        let msg = '';

        switch (e.error.code) {
            case 1:
                msg = 'MEDIA_ERR_ABORTED';
                break;
            case 2:
                msg = 'MEDIA_ERR_NETWORK';
                break;
            case 3:
                msg = 'MEDIA_ERR_DECODE';
                errorInformation.counts.mediaErrorDecode += 1;
                break;
            case 4:
                msg = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                break;
            case 5:
                msg = 'MEDIA_ERR_ENCRYPTED';
                break;
            default:
                msg = 'UNKNOWN';
                break;
        }


        if (msg === 'MEDIA_ERR_DECODE' && settings.get().errors.recoverAttempts.mediaErrorDecode >= errorInformation.counts.mediaErrorDecode) {
            _handleMediaErrorDecode();
            return;
        }

        hasMediaError = true;

        if (e.error.message) {
            msg += ' (' + e.error.message + ')';
        }

        if (e.error.msExtendedCode) {
            msg += ' (0x' + (e.error.msExtendedCode >>> 0).toString(16).toUpperCase() + ')';
        }

        logger.fatal('Video Element Error: ' + msg);
        if (e.error) {
            logger.fatal(e.error);
        }
        errHandler.error(new DashJSError(e.error.code, msg));
        reset();
    }

    /**
     * Handles mediaError
     * @private
     */
    function _handleMediaErrorDecode() {
        logger.warn('A MEDIA_ERR_DECODE occured: Resetting the MediaSource');
        const time = playbackController.getTime();
        // Deactivate the current stream.
        activeStream.deactivate(false);

        // Reset MSE
        logger.warn(`MediaSource has been resetted. Resuming playback from time ${time}`);
        _openMediaSource(time, false);
    }

    function getActiveStreamInfo() {
        return activeStream ? activeStream.getStreamInfo() : null;
    }

    function getIsStreamSwitchInProgress() {
        return isStreamSwitchingInProgress;
    }

    function getHasMediaOrInitialisationError() {
        return hasMediaError || hasInitialisationError;
    }

    function getStreamById(id) {
        for (let i = 0, ln = streams.length; i < ln; i++) {
            if (streams[i].getId() === id) {
                return streams[i];
            }
        }
        return null;
    }

    function checkConfig() {
        if (!manifestLoader || !manifestLoader.hasOwnProperty('load') || !timelineConverter || !timelineConverter.hasOwnProperty('initialize') ||
            !timelineConverter.hasOwnProperty('reset') || !timelineConverter.hasOwnProperty('getClientTimeOffset') || !manifestModel || !errHandler ||
            !dashMetrics || !playbackController) {
            throw new Error(Constants.MISSING_CONFIG_ERROR);
        }
    }

    function checkInitialize() {
        if (!manifestUpdater || !manifestUpdater.hasOwnProperty('setManifest')) {
            throw new Error('initialize function has to be called previously');
        }
    }

    function load(url) {
        checkConfig();
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
        checkInitialize();
        manifestUpdater.setManifest(manifest);
    }

    function _onManifestValidityChanged(e) {
        if (!isNaN(e.newDuration)) {
            _setMediaDuration(e.newDuration);
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.capabilities) {
            capabilities = config.capabilities;
        }
        if (config.capabilitiesFilter) {
            capabilitiesFilter = config.capabilitiesFilter;
        }
        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }
        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }
        if (config.protectionController) {
            protectionController = config.protectionController;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
        if (config.videoModel) {
            videoModel = config.videoModel;
        }
        if (config.playbackController) {
            playbackController = config.playbackController;
        }
        if (config.textController) {
            textController = config.textController;
        }
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.settings) {
            settings = config.settings;
        }
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }
        if (config.uriFragmentModel) {
            uriFragmentModel = config.uriFragmentModel;
        }
        if (config.segmentBaseController) {
            segmentBaseController = config.segmentBaseController;
        }
    }

    function setProtectionData(protData) {
        protectionData = protData;
        if (protectionController) {
            protectionController.setProtectionData(protectionData);
        }
    }

    function resetInitialSettings() {
        streams = [];
        protectionController = null;
        isStreamSwitchingInProgress = false;
        activeStream = null;
        hasMediaError = false;
        hasInitialisationError = false;
        initialPlayback = true;
        isPaused = false;
        autoPlay = true;
        playbackEndedTimerInterval = null;
        firstLicenseIsFetched = false;
        supportsChangeType = false;
        preloadingStreams = [];
        waitForPlaybackStartTimeout = null;
        errorInformation = {
            counts: {
                mediaErrorDecode: 0
            }
        }
    }

    function reset() {
        checkConfig();

        timeSyncController.reset();

        _flushPlaylistMetrics(
            hasMediaError || hasInitialisationError ?
                PlayListTrace.FAILURE_STOP_REASON :
                PlayListTrace.USER_REQUEST_STOP_REASON
        );

        for (let i = 0, ln = streams ? streams.length : 0; i < ln; i++) {
            const stream = streams[i];
            stream.reset(hasMediaError);
        }

        unRegisterEvents();

        baseURLController.reset();
        manifestUpdater.reset();
        eventController.reset();
        dashMetrics.clearAllCurrentMetrics();
        manifestModel.setValue(null);
        manifestLoader.reset();
        timelineConverter.reset();
        initCache.reset();

        if (mediaSource) {
            mediaSourceController.detachMediaSource(videoModel);
            mediaSource = null;
        }
        videoModel = null;
        if (protectionController) {
            protectionController = null;
            protectionData = null;
            if (manifestModel.getValue()) {
                eventBus.trigger(Events.PROTECTION_DESTROYED, { data: manifestModel.getValue().url });
            }
        }

        _stopPlaybackEndedTimerInterval();
        eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        resetInitialSettings();
    }

    function _onMetricAdded(e) {
        if (e.metric === MetricsConstants.DVR_INFO) {
            //Match media type? How can DVR window be different for media types?
            //Should we normalize and union the two?
            const targetMediaType = hasAudioTrack() ? Constants.AUDIO : Constants.VIDEO;
            if (e.mediaType === targetMediaType) {
                mediaSourceController.setSeekable(e.value.range.start, e.value.range.end);
            }
        }
    }

    function getStreams() {
        return streams;
    }

    instance = {
        initialize,
        getActiveStreamInfo,
        hasVideoTrack,
        hasAudioTrack,
        getStreamById,
        getStreamForTime,
        getTimeRelativeToStreamId,
        load,
        loadWithManifest,
        getActiveStreamProcessors,
        setConfig,
        setProtectionData,
        getIsStreamSwitchInProgress,
        switchToVideoElement,
        getHasMediaOrInitialisationError,
        getStreams,
        getActiveStream,
        reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';
export default FactoryMaker.getSingletonFactory(StreamController);
