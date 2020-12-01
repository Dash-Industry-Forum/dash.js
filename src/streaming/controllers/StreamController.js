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

const PLAYBACK_ENDED_TIMER_INTERVAL = 200;
const PREBUFFERING_CAN_START_INTERVAL = 500;

function StreamController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        capabilities,
        manifestUpdater,
        manifestLoader,
        manifestModel,
        adapter,
        dashMetrics,
        mediaSourceController,
        timeSyncController,
        baseURLController,
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
        isPeriodSwitchInProgress,
        playbackEndedTimerInterval,
        prebufferingCanStartInterval,
        buffers,
        preloadingStreams,
        supportsChangeType,
        settings,
        preBufferingCheckInProgress;

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

        registerEvents();
    }

    function registerEvents() {
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, instance);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(Events.GAP_CAUSED_SEEK_TO_PERIOD_END, onGapCausedPlaybackSeek, instance);
        eventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, instance);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, instance);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, instance);
        eventBus.on(Events.PLAYBACK_ENDED, onEnded, instance, { priority: EventBus.EVENT_PRIORITY_HIGH });
        eventBus.on(Events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, instance);
        eventBus.on(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, instance);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
    }

    function unRegisterEvents() {
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, instance);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.off(Events.GAP_CAUSED_SEEK_TO_PERIOD_END, onGapCausedPlaybackSeek, instance);
        eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, instance);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, instance);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, instance);
        eventBus.off(Events.PLAYBACK_ENDED, onEnded, instance);
        eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, instance);
        eventBus.off(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, instance);
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, instance);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, instance);
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(/*e*/) {
        if (hasVideoTrack()) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                dashMetrics.addDroppedFrames(playbackQuality);
            }
        }
    }

    function onPlaybackSeeking(e) {
        const seekingStream = getStreamForTime(e.seekTime);

        if (seekingStream === activeStream && preloadingStreams && preloadingStreams.length > 0) {
            // Seeking to the current period was requested while preloading the next one, deactivate preloading one
            preloadingStreams.forEach((s) => {
                s.deactivate(true);
            });
        }

        if (seekingStream && seekingStream !== activeStream) {
            // If we're preloading other stream, the active one was deactivated and we need to switch back
            flushPlaylistMetrics(PlayListTrace.END_OF_PERIOD_STOP_REASON);
            switchStream(seekingStream, activeStream, e.seekTime);
        } else {
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }

        createPlaylistMetrics(PlayList.SEEK_START_REASON);
    }

    function onGapCausedPlaybackSeek(e) {
        const nextStream = getNextStream();
        flushPlaylistMetrics(PlayListTrace.END_OF_PERIOD_STOP_REASON);
        switchStream(nextStream, activeStream, e.seekTime);
        createPlaylistMetrics(PlayList.SEEK_START_REASON);
    }

    function onPlaybackStarted( /*e*/) {
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

    function onPlaybackPaused(e) {
        logger.debug('[onPlaybackPaused]');
        if (!e.ended) {
            isPaused = true;
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }
    }

    function startPlaybackEndedTimerInterval() {
        if (!playbackEndedTimerInterval) {
            playbackEndedTimerInterval = setInterval(function () {
                if (!isStreamSwitchingInProgress && playbackController.getTimeToStreamEnd() <= 0) {
                    eventBus.trigger(Events.PLAYBACK_ENDED, { 'isLast': getActiveStreamInfo().isLast });
                }
            }, PLAYBACK_ENDED_TIMER_INTERVAL);
        }
    }

    function stopPlaybackEndedTimerInterval() {
        if (playbackEndedTimerInterval) {
            clearInterval(playbackEndedTimerInterval);
            playbackEndedTimerInterval = null;
        }
    }

    function startCheckIfPrebufferingCanStartInterval() {
        if (!prebufferingCanStartInterval) {
            prebufferingCanStartInterval = setInterval(function () {
                checkIfPrebufferingCanStart();
            }, PREBUFFERING_CAN_START_INTERVAL);
        }
    }

    function stopCheckIfPrebufferingCanStartInterval() {
        clearInterval(prebufferingCanStartInterval);
        prebufferingCanStartInterval = null;
    }

    function checkIfPrebufferingCanStart() {
        // In multiperiod situations, we constantly check if the streams have finished buffering so we can immediately start buffering the next stream
        if (!activeStream || !hasStreamFinishedBuffering(activeStream)) {
            return;
        }
        const upcomingStreams = getNextStreams(activeStream);
        let i = 0;

        while (i < upcomingStreams.length) {
            const stream = upcomingStreams[i];
            const previousStream = i === 0 ? activeStream : upcomingStreams[i - 1];
            // If the preloading for the current stream is not scheduled, but its predecessor has finished buffering we can start prebuffering this stream
            if (!stream.getPreloadingScheduled() && (hasStreamFinishedBuffering(previousStream))) {

                if (mediaSource) {
                    // We can not start prebuffering if the start of the next period is in the future. This will cause problems when calculating the segmentAvailabilityRange and updating the representations in the RepresentationController
                    // As long as the timeline converter returns an invalid range we do not start the prebuffering
                    const mediaTypes = [Constants.VIDEO, Constants.AUDIO];
                    let segmentAvailabilityRangeIsOk = true;

                    mediaTypes.forEach((mediaType) => {
                        const mediaInfo = adapter.getMediaInfoForType(stream.getStreamInfo(), mediaType);
                        const voRepresentations = adapter.getVoRepresentations(mediaInfo);
                        voRepresentations.forEach((voRep) => {
                            const isDynamic = adapter.getIsDynamic();
                            const range = timelineConverter.calcSegmentAvailabilityRange(voRep, isDynamic);

                            if (range.end < range.start) {
                                segmentAvailabilityRangeIsOk = false;
                            }
                        });
                    });

                    if (segmentAvailabilityRangeIsOk) {
                        onStreamCanLoadNext(stream, previousStream);
                    }
                }
            }
            i += 1;
        }
    }

    function hasStreamFinishedBuffering(stream) {
        try {
            if (!stream) {
                return false;
            }
            const streamProcessors = stream.getProcessors().filter((sp) => {
                return sp.getType() === Constants.AUDIO || sp.getType() === Constants.VIDEO;
            });

            if (!streamProcessors || streamProcessors.length === 0) {
                return false;
            }

            const unfinishedStreamProcessors = streamProcessors.filter((sp) => {
                return !sp.isBufferingCompleted();
            });

            return unfinishedStreamProcessors && unfinishedStreamProcessors.length === 0;

        } catch (e) {
            return false;
        }
    }

    function onStreamBufferingCompleted() {
        const isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            logger.info('[onStreamBufferingCompleted] calls signalEndOfStream of mediaSourceController.');
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }

    function canSourceBuffersBeReused(nextStream, previousStream) {
        try {
            return (previousStream.isProtectionCompatible(nextStream, previousStream) &&
                (supportsChangeType || previousStream.isMediaCodecCompatible(nextStream, previousStream)) && !hasCriticalTexttracks(nextStream));
        } catch (e) {
            return false;
        }
    }

    function onStreamCanLoadNext(nextStream, previousStream = null) {

        if (mediaSource && !nextStream.getPreloaded()) {
            // Seamless period switch allowed only if:
            // - none of the periods uses contentProtection.
            // - AND changeType method implemented by browser or periods use the same codec.
            let seamlessPeriodSwitch = canSourceBuffersBeReused(nextStream, previousStream);

            if (seamlessPeriodSwitch) {
                nextStream.setPreloadingScheduled(true);
                logger.info(`[onStreamCanLoadNext] Preloading next stream with id ${nextStream.getId()}`);
                isPeriodSwitchInProgress = true;
                nextStream.preload(mediaSource, buffers);
                preloadingStreams.push(nextStream);
                nextStream.getProcessors().forEach(p => {
                    p.setBufferingTime(nextStream.getStartTime());
                });
            }
        }
    }

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

    function onEnded(e) {
        if (!activeStream.getIsEndedEventSignaled()) {
            activeStream.setIsEndedEventSignaled(true);
            const nextStream = getNextStream();
            if (nextStream) {
                logger.debug(`StreamController onEnded, found next stream with id ${nextStream.getStreamInfo().id}`);
                switchStream(nextStream, activeStream, NaN);
            } else {
                logger.debug('StreamController no next stream found');
                activeStream.setIsEndedEventSignaled(false);
            }
            flushPlaylistMetrics(nextStream ? PlayListTrace.END_OF_PERIOD_STOP_REASON : PlayListTrace.END_OF_CONTENT_STOP_REASON);
            isPeriodSwitchInProgress = false;
        }
        if (e && e.isLast) {
            stopPlaybackEndedTimerInterval();
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

    function switchStream(stream, previousStream, seekTime) {

        if (isStreamSwitchingInProgress || !stream || (previousStream === stream && stream.isActive())) return;
        isStreamSwitchingInProgress = true;

        eventBus.trigger(Events.PERIOD_SWITCH_STARTED, {
            fromStreamInfo: previousStream ? previousStream.getStreamInfo() : null,
            toStreamInfo: stream.getStreamInfo()
        });

        let seamlessPeriodSwitch = false;
        if (previousStream) {
            seamlessPeriodSwitch = canSourceBuffersBeReused(stream, previousStream);
            previousStream.deactivate(seamlessPeriodSwitch);
        }

        // Determine seek time when switching to new period
        // - seek at given seek time
        // - or seek at period start if upcoming period is not prebuffered
        seekTime = !isNaN(seekTime) ? seekTime : (!seamlessPeriodSwitch && previousStream ? stream.getStreamInfo().start : NaN);
        logger.info(`Switch to stream ${stream.getId()}. Seektime is ${seekTime}, current playback time is ${playbackController.getTime()}`);
        logger.info(`Seamless period switch is set to ${seamlessPeriodSwitch}`);

        activeStream = stream;
        preloadingStreams = preloadingStreams.filter((s) => {
            return s.getId() !== activeStream.getId();
        });
        playbackController.initialize(getActiveStreamInfo(), !!previousStream, seekTime);
        if (videoModel.getElement()) {
            openMediaSource(seekTime, (previousStream === null), false, seamlessPeriodSwitch);
        } else {
            activateStream(seekTime, seamlessPeriodSwitch);
        }
        isPeriodSwitchInProgress = false;
    }

    function switchToVideoElement(seekTime) {
        if (activeStream) {
            playbackController.initialize(getActiveStreamInfo());
            openMediaSource(seekTime, false, true, false);
        }
    }

    function openMediaSource(seekTime, sourceInitialized, streamActivated, keepBuffers) {
        let sourceUrl;

        function onMediaSourceOpen() {
            // Manage situations in which a call to reset happens while MediaSource is being opened
            if (!mediaSource || mediaSource.readyState !== 'open') return;

            logger.debug('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();

            if (!sourceInitialized) {
                eventBus.trigger(Events.SOURCE_INITIALIZED);
            }

            if (streamActivated) {
                activeStream.setMediaSource(mediaSource);
            } else {
                activateStream(seekTime, keepBuffers);
            }
        }

        if (!mediaSource) {
            mediaSource = mediaSourceController.createMediaSource();
            mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
            mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
            sourceUrl = mediaSourceController.attachMediaSource(mediaSource, videoModel);
            logger.debug('MediaSource attached to element.  Waiting on open...');
        } else {
            if (keepBuffers) {
                activateStream(seekTime, keepBuffers);
                if (!sourceInitialized) {
                    eventBus.trigger(Events.SOURCE_INITIALIZED);
                }
            } else {
                mediaSourceController.detachMediaSource(videoModel);
                mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
                mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
                sourceUrl = mediaSourceController.attachMediaSource(mediaSource, videoModel);
                logger.debug('MediaSource attached to element.  Waiting on open...');
            }
        }
    }

    function getActiveStream() {
        return activeStream;
    }

    function activateStream(seekTime, keepBuffers) {
        buffers = activeStream.activate(mediaSource, keepBuffers ? buffers : undefined);

        // check if change type is supported by the browser
        if (buffers) {
            const keys = Object.keys(buffers);
            if (keys.length > 0 && buffers[keys[0]].changeType) {
                supportsChangeType = true;
            }
        }

        if (!initialPlayback) {
            if (!isNaN(seekTime)) {
                // If the streamswitch has been triggered by a seek command there is no need to seek again. Still we need to trigger the seeking event in order for the controllers to adjust the new time
                if (seekTime === playbackController.getTime()) {
                    eventBus.trigger(Events.SEEK_TARGET, {time: seekTime}, {streamId: activeStream.getId()});
                } else {
                    playbackController.seek(seekTime);
                }
            }
        }

        if (autoPlay || !initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(Events.PERIOD_SWITCH_COMPLETED, { toStreamInfo: getActiveStreamInfo() });
    }

    function setMediaDuration(duration) {
        const manifestDuration = duration ? duration : getActiveStreamInfo().manifestInfo.duration;

        if (manifestDuration && !isNaN(manifestDuration)) {
            const mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
            logger.debug('Duration successfully set to: ' + mediaDuration);
        }
    }

    function getComposedStream(streamInfo) {
        for (let i = 0, ln = streams.length; i < ln; i++) {
            if (streams[i].getId() === streamInfo.id) {
                return streams[i];
            }
        }
        return null;
    }

    function composeStreams() {
        try {
            const streamsInfo = adapter.getStreamsInfo();
            if (streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }

            dashMetrics.updateManifestUpdateInfo({
                currentTime: playbackController.getTime(),
                buffered: videoModel.getBufferRange(),
                presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()
            });

            // Filter streams that are outdated and not included in the MPD anymore
            if (streams.length > 0) {
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

            for (let i = 0, ln = streamsInfo.length; i < ln; i++) {
                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                const streamInfo = streamsInfo[i];
                let stream = getComposedStream(streamInfo);

                if (!stream) {
                    stream = Stream(context).create({
                        manifestModel: manifestModel,
                        mediaPlayerModel: mediaPlayerModel,
                        dashMetrics: dashMetrics,
                        manifestUpdater: manifestUpdater,
                        adapter: adapter,
                        timelineConverter: timelineConverter,
                        capabilities: capabilities,
                        errHandler: errHandler,
                        baseURLController: baseURLController,
                        abrController: abrController,
                        playbackController: playbackController,
                        eventController: eventController,
                        mediaController: mediaController,
                        textController: textController,
                        protectionController: protectionController,
                        videoModel: videoModel,
                        streamInfo: streamInfo,
                        settings: settings
                    });
                    streams.push(stream);
                    stream.initialize();
                } else {
                    stream.updateData(streamInfo);
                }

                dashMetrics.addManifestUpdateStreamInfo(streamInfo);
            }

            if (!activeStream) {
                if (adapter.getIsDynamic() && streams.length) {
                    // Compute and set live delay
                    const manifestInfo = streamsInfo[0].manifestInfo;
                    const fragmentDuration = getFragmentDurationForLiveDelayCalculation(streamsInfo, manifestInfo);
                    playbackController.computeAndSetLiveDelay(fragmentDuration, manifestInfo.DVRWindowSize, manifestInfo.minBufferTime);
                }

                // we need to figure out what the correct starting period is
                let initialStream = null;
                const startTimeFromUri = playbackController.getStartTimeFromUriParameters(streamsInfo[0].start, adapter.getIsDynamic());

                initialStream = getStreamForTime(startTimeFromUri);

                // For multiperiod streams we should avoid a switch of streams after the seek to the live edge. So we do a calculation of the expected seek time to find the right stream object.
                if (!initialStream && adapter.getIsDynamic() && streams.length) {
                    logger.debug('Dynamic stream: Trying to find the correct starting period');
                    initialStream = getInitialStream();
                }
                const startStream = initialStream !== null ? initialStream : streams[0];
                switchStream(startStream, null, NaN);
                startPlaybackEndedTimerInterval();
                startCheckIfPrebufferingCanStartInterval();
            }

            eventBus.trigger(Events.STREAMS_COMPOSED);

        } catch (e) {
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, e.message + 'nostreamscomposed', manifestModel.getValue()));
            hasInitialisationError = true;
            reset();
        }
    }

    function getInitialStream() {
        try {
            const liveEdge = timelineConverter.calcPresentationTimeFromWallTime(new Date(), adapter.getRegularPeriods()[0]);
            const targetDelay = playbackController.getLiveDelay();
            const targetTime = liveEdge - targetDelay;

            return getStreamForTime(targetTime);
        } catch (e) {
            return null;
        }
    }

    function getFragmentDurationForLiveDelayCalculation(streamInfos, manifestInfo) {
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

    function onTimeSyncCompleted( /*e*/) {
        const manifest = manifestModel.getValue();
        //TODO check if we can move this to initialize??
        if (protectionController) {
            eventBus.trigger(Events.PROTECTION_CREATED, {
                controller: protectionController,
                manifest: manifest
            });
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        composeStreams();
    }

    function onManifestUpdated(e) {
        if (!e.error) {
            //Since streams are not composed yet , need to manually look up useCalculatedLiveEdgeTime to detect if stream
            //is SegmentTimeline to avoid using time source
            const manifest = e.manifest;
            adapter.updatePeriods(manifest);

            let manifestUTCTimingSources = adapter.getUTCTimingSources();
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

            timeSyncController.setConfig({
                dashMetrics: dashMetrics,
                baseURLController: baseURLController
            });
            timeSyncController.initialize(allUTCTimingSources, settings.get().streaming.useManifestDateHeaderTimeSource);
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

    function flushPlaylistMetrics(reason, time) {
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

    function getHasMediaOrIntialisationError() {
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
            setMediaDuration(e.newDuration);
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.capabilities) {
            capabilities = config.capabilities;
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
    }

    function setProtectionData(protData) {
        protectionData = protData;
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
        isPeriodSwitchInProgress = false;
        prebufferingCanStartInterval = null;
        preBufferingCheckInProgress = false;
        preloadingStreams = [];
    }

    function reset() {
        checkConfig();

        timeSyncController.reset();

        flushPlaylistMetrics(
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

        stopPlaybackEndedTimerInterval();
        stopCheckIfPrebufferingCanStartInterval();
        eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        resetInitialSettings();
    }

    function onMetricAdded(e) {
        if (e.metric === MetricsConstants.DVR_INFO) {
            //Match media type? How can DVR window be different for media types?
            //Should we normalize and union the two?
            const targetMediaType = hasAudioTrack() ? Constants.AUDIO : Constants.VIDEO;
            if (e.mediaType === targetMediaType) {
                mediaSourceController.setSeekable(mediaSource, e.value.range.start, e.value.range.end);
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
        switchToVideoElement,
        getStreamById,
        getStreamForTime,
        getTimeRelativeToStreamId,
        load,
        loadWithManifest,
        getActiveStreamProcessors,
        setConfig,
        setProtectionData,
        getIsStreamSwitchInProgress,
        getHasMediaOrIntialisationError,
        hasStreamFinishedBuffering,
        getStreams,
        getActiveStream,
        reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';
export default FactoryMaker.getSingletonFactory(StreamController);
