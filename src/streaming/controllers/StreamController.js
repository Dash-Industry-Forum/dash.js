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
        uriFragmentModel,
        abrController,
        mediaController,
        eventController,
        textController,
        initCache,
        urlUtils,
        errHandler,
        timelineConverter,
        streams,
        activeStream,
        protectionController,
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
        preBufferingCheckInProgress,
        dataForStreamSwitchAfterSeek,
        waitForPlaybackStartTimeout;

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
            playbackController: playbackController
        });
        eventController.start();


        timeSyncController.setConfig({
            dashMetrics,
            baseURLController,
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
        eventBus.on(MediaPlayerEvents.PLAYBACK_ERROR, onPlaybackError, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, instance);
        eventBus.on(MediaPlayerEvents.PLAYBACK_ENDED, onPlaybackEnded, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
        eventBus.on(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

        eventBus.on(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, _onStreamBufferingCompleted, instance);
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, _onTimeSyncCompleted, instance);
        eventBus.on(Events.KEY_SESSION_UPDATED, _onKeySessionUpdated, instance);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, _onWallclockTimeUpdated, instance);
        eventBus.on(Events.CURRENT_TRACK_CHANGED, _onCurrentTrackChanged, instance);
    }

    function unRegisterEvents() {
        eventBus.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onPlaybackTimeUpdated, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_SEEKING, _onPlaybackSeeking, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_ERROR, onPlaybackError, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, _onPlaybackStarted, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PAUSED, _onPlaybackPaused, instance);
        eventBus.off(MediaPlayerEvents.PLAYBACK_ENDED, onPlaybackEnded, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
        eventBus.off(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);

        eventBus.off(Events.MANIFEST_UPDATED, _onManifestUpdated, instance);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, _onStreamBufferingCompleted, instance);
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, _onTimeSyncCompleted, instance);
        eventBus.off(Events.KEY_SESSION_UPDATED, _onKeySessionUpdated, instance);
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

            for (let i = 0, ln = streamsInfo.length; i < ln; i++) {
                const streamInfo = streamsInfo[i];
                _initializeOrUpdateStream(streamInfo);
            }

            if (!activeStream) {
                _initializeForFirstStream(streamsInfo);
            }

            eventBus.trigger(Events.STREAMS_COMPOSED);

        } catch (e) {
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, e.message + 'nostreamscomposed', manifestModel.getValue()));
            hasInitialisationError = true;
            reset();
        }
    }

    /**
     * Called for each stream when composition is performed. Either a new instance of Stream is created or the existing one is updated.
     * @param streamInfo
     * @private
     */
    function _initializeOrUpdateStream(streamInfo) {
        let stream = _getComposedStream(streamInfo);

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
                abrController,
                playbackController,
                eventController,
                mediaController,
                textController,
                protectionController,
                videoModel,
                streamInfo,
                settings
            });
            streams.push(stream);
            stream.initialize();
        } else {
            stream.updateData(streamInfo);
        }

        dashMetrics.addManifestUpdateStreamInfo(streamInfo);
    }

    /**
     * Initialize playback for the first period.
     * @param streamsInfo
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
            playbackController.computeAndSetLiveDelay(fragmentDuration, manifestInfo.DVRWindowSize, manifestInfo.minBufferTime);
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
            console.info(`Switch to stream ${stream.getId()}. Seektime is ${seekTime}, current playback time is ${playbackController.getTime()}. Seamless period switch is set to ${keepBuffers}`);

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
     * @param seekTime
     * @param keepBuffers
     */
    function _activateStream(seekTime, keepBuffers) {
        bufferSinks = activeStream.activate(mediaSource, keepBuffers ? bufferSinks : undefined, seekTime);

        // check if change type is supported by the browser
        if (bufferSinks) {
            const keys = Object.keys(bufferSinks);
            if (keys.length > 0 && bufferSinks[keys[0]].getBuffer().changeType) {
                supportsChangeType = true;
            }
        }

        // Set the initial time for this stream in the StreamProcessor
        if (!isNaN(seekTime)) {
            eventBus.trigger(Events.SEEK_TARGET, { time: seekTime }, { streamId: activeStream.getId() });
            playbackController.seek(seekTime, false, true);
            activeStream.startScheduleControllers();
        }

        if (autoPlay && initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(Events.PERIOD_SWITCH_COMPLETED, { toStreamInfo: getActiveStreamInfo() });
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
     * @param oldTime
     * @param newTime
     * @param isInnerPeriodSeek
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
     * Handle an inner period seek. Dispatch the corresponding event to be handled in the BufferControllers and the ScheduleControllers
     * @param {object} e
     * @private
     */
    function _handleInnerPeriodSeek(e) {
        const streamProcessors = activeStream.getProcessors();

        streamProcessors.forEach((sp) => {
            sp.prepareInnerPeriodPlaybackSeeking(e);
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
        console.debug(`Handle outer period seek. Seeking from ${e.streamId} to ${seekToStream.getStreamId()}`);

        // Stop segment requests
        const seekTime = e && e.seekTime && !isNaN(e.seekTime) ? e.seekTime : NaN;
        const streamProcessors = activeStream.getProcessors();

        const promises = streamProcessors.map((sp) => {
            // Cancel everything in case the active stream is still buffering
            sp.prepareOuterPeriodPlaybackSeeking(e);

            // Clear the buffers completely.
            return sp.getBufferController().pruneAllSafely();
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
     * Check if we can start prebuffering the next period.
     * @private
     */
    function _checkIfPrebufferingCanStart() {
        // In multiperiod situations, we can start buffering the next stream
        if (!activeStream || !activeStream.getHasFinishedBuffering()) {
            return;
        }
        const upcomingStreams = getNextStreams(activeStream);
        let i = 0;
        let found = false;

        while (i < upcomingStreams.length && !found) {
            const stream = upcomingStreams[i];
            const previousStream = i === 0 ? activeStream : upcomingStreams[i - 1];

            // If the preloading for the current stream is not scheduled, but its predecessor has finished buffering we can start prebuffering this stream
            if (!stream.getPreloaded() && previousStream.getHasFinishedBuffering()) {
                if (mediaSource) {
                    _onStreamCanLoadNext(stream, previousStream);
                    console.log(`Can preload ${stream.getId()}`);
                    //found = true;
                }
            }
            i += 1;
        }
    }

    /**
     * If the source buffer can be reused we can potentially start buffering the next period
     * @param nextStream
     * @param previousStream
     * @return {*|boolean}
     * @private
     */
    function _canSourceBuffersBeReused(nextStream, previousStream) {
        try {
            // Seamless period switch allowed only if:
            // - none of the periods uses contentProtection.
            // - AND changeType method implemented by browser or periods use the same codec.
            return (settings.get().streaming.reuseExistingSourceBuffers && (previousStream.isProtectionCompatible(nextStream, previousStream) || firstLicenseIsFetched) &&
                (supportsChangeType || previousStream.isMediaCodecCompatible(nextStream, previousStream)) && !hasCriticalTexttracks(nextStream));
        } catch (e) {
            return false;
        }
    }

    /**
     * Initiate the preloading of the next stream
     * @param nextStream
     * @param previousStream
     * @private
     */
    function _onStreamCanLoadNext(nextStream, previousStream = null) {

        if (mediaSource && !nextStream.getPreloaded()) {
            let seamlessPeriodSwitch = _canSourceBuffersBeReused(nextStream, previousStream);

            if (seamlessPeriodSwitch) {
                nextStream.startPreloading(mediaSource, bufferSinks);
                preloadingStreams.push(nextStream);
            }
        }
    }

    /**
     * In some cases we can not reuse the source buffer for specific text track types.
     * @param stream
     * @return {boolean}
     */
    function hasCriticalTexttracks(stream) {
        try {
            // if the upcoming stream has stpp or wvtt texttracks we need to reset the sourcebuffers and can not prebuffer
            const streamInfo = stream.getStreamInfo();
            const as = adapter.getAdaptationForType(streamInfo.index, Constants.FRAGMENTED_TEXT, streamInfo);
            if (!as) {
                return false;
            }

            return (as.codecs.indexOf('stpp') !== -1) || (as.codecs.indexOf('wvtt') !== -1);
        } catch (e) {
            return false;
        }
    }

    /**
     * Returns the corresponding stream object for a specific presentation time.
     * @param time
     * @return {null|*}
     */
    function getStreamForTime(time) {

        if (isNaN(time)) {
            return null;
        }

        let streamDuration = 0;
        let stream = null;

        const ln = streams.length;

        if (ln > 0) {
            streamDuration += streams[0].getStartTime();
        }

        for (let i = 0; i < ln; i++) {
            stream = streams[i];
            streamDuration = parseFloat((streamDuration + stream.getDuration()).toFixed(5));

            if (time < streamDuration) {
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
    }

    /**
     *
     * @private
     */
    function _onKeySessionUpdated() {
        firstLicenseIsFetched = true;
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
        if (initialPlayback) {
            initialPlayback = false;
            createPlaylistMetrics(PlayList.INITIAL_PLAYOUT_START_REASON);
        } else {
            if (isPaused) {
                isPaused = false;
                createPlaylistMetrics(PlayList.RESUME_FROM_PAUSE_START_REASON);
            }
        }
    }

    /**
     * Once playback is paused flush metrics
     * @param e
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
     * @param e
     * @private
     */
    function _onStreamBufferingCompleted(e) {
        logger.debug(`Stream with id ${e.streamInfo.id} finished buffering`);
        console.debug(`Stream with id ${e.streamInfo.id} finished buffering`);
        const isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            logger.info('[onStreamBufferingCompleted] calls signalEndOfStream of mediaSourceController.');
            mediaSourceController.signalEndOfStream(mediaSource);
        } else {
            _checkIfPrebufferingCanStart();
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

    function getActiveStreamProcessors() {
        return activeStream ? activeStream.getProcessors() : [];
    }

    function onPlaybackEnded(e) {
        if (activeStream && !activeStream.getIsEndedEventSignaled()) {
            activeStream.setIsEndedEventSignaled(true);
            const nextStream = getNextStream();
            if (nextStream) {
                logger.debug(`StreamController onEnded, found next stream with id ${nextStream.getStreamInfo().id}`);
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

    function getNextStream(stream = null) {
        const refStream = stream ? stream : activeStream ? activeStream : null;
        if (refStream) {
            const start = refStream.getStreamInfo().start;
            const duration = refStream.getStreamInfo().duration;
            const streamEnd = parseFloat((start + duration).toFixed(5));

            let i = 0;
            let targetIndex = -1;
            let lastDiff = NaN;
            while (i < streams.length) {
                const s = streams[i];
                const diff = s.getStreamInfo().start - streamEnd;

                if (diff >= 0 && (isNaN(lastDiff) || diff < lastDiff)) {
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

        return null;
    }

    function getNextStreams(stream) {
        try {
            const refStream = stream ? stream : activeStream ? activeStream : null;

            if (refStream) {
                const start = refStream.getStreamInfo().start;

                return streams.filter(function (stream) {
                    return (stream.getStreamInfo().start > start);
                });
            }
        } catch (e) {
            return [];
        }
    }

    function _setMediaDuration(duration) {
        const manifestDuration = duration ? duration : getActiveStreamInfo().manifestInfo.duration;
        mediaSourceController.setDuration(manifestDuration);
    }

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
            if (!isNaN(startTimeFromUri) && startTimeFromUri < (streamInfo.start + streamInfo.duration)) {
                logger.info('Start time from URI parameters: ' + startTimeFromUri);
                startTime = Math.max(startTime, startTimeFromUri);
            }
        }

        return startTime;
    }

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

    function _getComposedStream(streamInfo) {
        for (let i = 0, ln = streams.length; i < ln; i++) {
            if (streams[i].getId() === streamInfo.id) {
                return streams[i];
            }
        }
        return null;
    }

    function _filterOutdatedStreams(streamsInfo) {
        streams = streams.filter((stream) => {
            const isStillIncluded = streamsInfo.filter((sInfo) => {
                return sInfo.id === stream.getId();
            }).length > 0;

            const shouldKeepStream = isStillIncluded || stream.getId() === activeStream.getId();

            if (!shouldKeepStream) {
                logger.debug(`Removing stream ${stream.getId()}`);
            }

            return shouldKeepStream;
        });
    }

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
                const mediaTypes = [Constants.VIDEO, Constants.AUDIO, Constants.FRAGMENTED_TEXT];


                const fragmentDurations = mediaTypes
                    .reduce((acc, mediaType) => {
                        const mediaInfo = adapter.getMediaInfoForType(streamInfo, mediaType);

                        if (mediaInfo) {
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
                        const representation = adapter.convertDataToRepresentationInfo(voRepresentation);

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

    function _onManifestUpdated(e) {
        if (!e.error) {
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

            baseURLController.initialize(manifest);
            timeSyncController.attemptSync(allUTCTimingSources);
        } else {
            hasInitialisationError = true;
            reset();
        }
    }

    function hasVideoTrack() {
        return activeStream ? activeStream.getHasVideoTrack() : false;
    }

    function hasAudioTrack() {
        return activeStream ? activeStream.getHasAudioTrack() : false;
    }

    function switchToVideoElement(seekTime) {
        if (activeStream) {
            playbackController.initialize(getActiveStreamInfo());
            _openMediaSource(seekTime, false, true, false);
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

    function onPlaybackError(e) {
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
        return streams.filter(function (item) {
            return item.getId() === id;
        })[0];
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

    function onManifestValidityChanged(e) {
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
        if (config.abrController) {
            abrController = config.abrController;
        }
        if (config.mediaController) {
            mediaController = config.mediaController;
        }
        if (config.textController) {
            textController = config.textController;
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
        preBufferingCheckInProgress = false;
        firstLicenseIsFetched = false;
        preloadingStreams = [];
        dataForStreamSwitchAfterSeek = null;
        waitForPlaybackStartTimeout = null;
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
            protectionController.setMediaElement(null);
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

    function onMetricAdded(e) {
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
        getNextStream,
        getActiveStream,
        reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';
export default FactoryMaker.getSingletonFactory(StreamController);
