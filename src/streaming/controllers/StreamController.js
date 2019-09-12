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
import BaseURLController from './BaseURLController';
import MediaSourceController from './MediaSourceController';
import DashJSError from '../vo/DashJSError';
import Errors from '../../core/errors/Errors';

function StreamController() {
    // Check whether there is a gap every 40 wallClockUpdateEvent times
    const STALL_THRESHOLD_TO_CHECK_GAPS = 40;
    const PERIOD_PREFETCH_TIME = 2000;

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
        videoTrackDetected,
        audioTrackDetected,
        isPeriodSwitchInProgress,
        playbackEndedTimerId,
        prefetchTimerId,
        wallclockTicked,
        buffers,
        useSmoothPeriodTransition,
        preloading,
        lastPlaybackTime,
        supportsChangeType,
        settings;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        timeSyncController = TimeSyncController(context).getInstance();
        baseURLController = BaseURLController(context).getInstance();
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

        baseURLController.setConfig({
            adapter: adapter
        });

        registerEvents();
    }

    function registerEvents() {
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.on(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.on(Events.BUFFERING_COMPLETED, onTrackBufferingCompleted, this);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.on(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, this);
        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.on(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);
    }

    function unRegisterEvents() {
        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.off(Events.BUFFERING_COMPLETED, onTrackBufferingCompleted, this);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.off(Events.MANIFEST_VALIDITY_CHANGED, onManifestValidityChanged, this);
        eventBus.off(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.off(Events.WALLCLOCK_TIME_UPDATED, onWallclockTimeUpdated, this);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(/*e*/) {
        if (isTrackTypePresent(Constants.VIDEO)) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                dashMetrics.addDroppedFrames(playbackQuality);
            }
        }
    }

    function onWallclockTimeUpdated(/*e*/) {
        if (!settings.get().streaming.jumpGaps || getActiveStreamProcessors() === 0 ||
            playbackController.isSeeking() || isPaused || isStreamSwitchingInProgress ||
            hasMediaError || hasInitialisationError) {
            return;
        }

        wallclockTicked++;
        if (wallclockTicked >= STALL_THRESHOLD_TO_CHECK_GAPS) {
            const currentTime = playbackController.getTime();
            if (lastPlaybackTime === currentTime) {
                jumpGap(currentTime);
            } else {
                lastPlaybackTime = currentTime;
            }
            wallclockTicked = 0;
        }
    }

    function jumpGap(time) {
        const streamProcessors = getActiveStreamProcessors();
        const smallGapLimit = settings.get().streaming.smallGapLimit;
        let seekToPosition;

        // Find out what is the right time position to jump to taking
        // into account state of buffer
        for (let i = 0; i < streamProcessors.length; i ++) {
            const mediaBuffer = streamProcessors[i].getBuffer();
            const ranges = mediaBuffer.getAllBufferRanges();
            let nextRangeStartTime;
            if (!ranges || ranges.length <= 1) continue;

            // Get the range just after current time position
            for (let j = 0; j < ranges.length; j++) {
                if (time < ranges.start(j)) {
                    nextRangeStartTime = ranges.start(j);
                    break;
                }
            }

            if (nextRangeStartTime > 0) {
                const gap = nextRangeStartTime - time;
                if (gap > 0 && gap <= smallGapLimit) {
                    if (seekToPosition === undefined || nextRangeStartTime > seekToPosition) {
                        seekToPosition = nextRangeStartTime;
                    }
                }
            }
        }

        const timeToStreamEnd = playbackController.getTimeToStreamEnd();
        if (seekToPosition === undefined && !isNaN(timeToStreamEnd) && timeToStreamEnd < smallGapLimit) {
            seekToPosition = time + timeToStreamEnd;
        }

        // If there is a safe position to jump to, do the seeking
        if (seekToPosition > 0) {
            if (!isNaN(timeToStreamEnd) && seekToPosition >= time + timeToStreamEnd) {
                logger.info('Jumping media gap (discontinuity) at time ', time, '. Jumping to end of the stream');
                eventBus.trigger(Events.PLAYBACK_ENDED, {'isLast': getActiveStreamInfo().isLast});
            } else {
                logger.info('Jumping media gap (discontinuity) at time ', time, '. Jumping to time position', seekToPosition);
                playbackController.seek(seekToPosition, true, true);
            }
        }
    }

    function onPlaybackSeeking(e) {
        const seekingStream = getStreamForTime(e.seekTime);

        //if end period has been detected, stop timer and reset isPeriodSwitchInProgress
        if (playbackEndedTimerId) {
            stopEndPeriodTimer();
            isPeriodSwitchInProgress = false;
        }

        if (prefetchTimerId) {
            stopPreloadTimer();
        }

        if ( seekingStream === activeStream && preloading ) {
            // Seeking to the current period was requested while preloading the next one, deactivate preloading one
            preloading.deactivate(true);
        }

        if (seekingStream && (seekingStream !== activeStream || (preloading && !activeStream.isActive()))) {
            // If we're preloading other stream, the active one was deactivated and we need to switch back
            flushPlaylistMetrics(PlayListTrace.END_OF_PERIOD_STOP_REASON);
            switchStream(activeStream, seekingStream, e.seekTime);
        } else {
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }

        createPlaylistMetrics(PlayList.SEEK_START_REASON);
    }

    function onPlaybackStarted( /*e*/ ) {
        logger.debug('[onPlaybackStarted]');
        if (initialPlayback) {
            initialPlayback = false;
            createPlaylistMetrics(PlayList.INITIAL_PLAYOUT_START_REASON);
        } else {
            if (isPaused) {
                isPaused = false;
                createPlaylistMetrics(PlayList.RESUME_FROM_PAUSE_START_REASON);
                toggleEndPeriodTimer();
            }
        }
    }

    function onPlaybackPaused(e) {
        logger.debug('[onPlaybackPaused]');
        if (!e.ended) {
            isPaused = true;
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
            toggleEndPeriodTimer();
        }
    }

    function stopEndPeriodTimer() {
        logger.debug('[toggleEndPeriodTimer] stop end period timer.');
        clearTimeout(playbackEndedTimerId);
        playbackEndedTimerId = undefined;
    }

    function stopPreloadTimer() {
        logger.debug('[PreloadTimer] stop period preload timer.');
        clearTimeout(prefetchTimerId);
        prefetchTimerId = undefined;
    }

    function toggleEndPeriodTimer() {
        //stream buffering completed has not been detected, nothing to do....
        if (isPeriodSwitchInProgress) {
            //stream buffering completed has been detected, if end period timer is running, stop it, otherwise start it....
            if (playbackEndedTimerId) {
                stopEndPeriodTimer();
            } else {
                const timeToEnd = playbackController.getTimeToStreamEnd();
                const delayPlaybackEnded = timeToEnd > 0 ? timeToEnd * 1000 : 0;
                const prefetchDelay = delayPlaybackEnded < PERIOD_PREFETCH_TIME ? delayPlaybackEnded / 4 : delayPlaybackEnded - PERIOD_PREFETCH_TIME;
                logger.debug('[toggleEndPeriodTimer] Going to fire preload in', prefetchDelay, 'milliseconds');
                prefetchTimerId = setTimeout(onStreamCanLoadNext,  prefetchDelay);
                logger.debug('[toggleEndPeriodTimer] start-up of timer to notify PLAYBACK_ENDED event. It will be triggered in',delayPlaybackEnded, 'milliseconds');
                playbackEndedTimerId = setTimeout(function () {eventBus.trigger(Events.PLAYBACK_ENDED, {'isLast': getActiveStreamInfo().isLast});}, delayPlaybackEnded);
            }
        }
    }

    function onTrackBufferingCompleted(e) {
        // In multiperiod situations, as soon as one of the tracks (AUDIO, VIDEO) is finished we should
        // start doing prefetching of the next period
        if (!e.sender) {
            return;
        }
        if (e.sender.getType() !== Constants.AUDIO && e.sender.getType() !== Constants.VIDEO) {
            return;
        }

        const isLast = getActiveStreamInfo().isLast;
        if (mediaSource && !isLast && playbackEndedTimerId === undefined) {
            logger.info('[onTrackBufferingCompleted] end of period detected. Track', e.sender.getType(), 'has finished');
            isPeriodSwitchInProgress = true;
            if (isPaused === false) {
                toggleEndPeriodTimer();
            }
        }
    }

    function onStreamBufferingCompleted() {
        const isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            logger.info('[onStreamBufferingCompleted] calls signalEndOfStream of mediaSourceController.');
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }

    function onStreamCanLoadNext() {
        const isLast = getActiveStreamInfo().isLast;

        if (mediaSource && !isLast) {
            const newStream = getNextStream();

            // Smooth period transition allowed only if both of these conditions are true:
            // 1.- None of the periods uses contentProtection.
            // 2.- changeType method implemented by browser or periods use the same codec.
            useSmoothPeriodTransition = activeStream.isProtectionCompatible(newStream) &&
                (supportsChangeType || activeStream.isMediaCodecCompatible(newStream));

            if (useSmoothPeriodTransition) {
                logger.info('[onStreamCanLoadNext] Preloading next stream');
                activeStream.stopEventController();
                activeStream.deactivate(true);
                newStream.preload(mediaSource, buffers);
                preloading = newStream;
                newStream.getProcessors().forEach(p => {
                    p.setIndexHandlerTime(newStream.getStartTime());
                });
            }
        }
    }

    function getStreamForTime(time) {
        let duration = 0;
        let stream = null;

        const ln = streams.length;

        if (ln > 0) {
            duration += streams[0].getStartTime();
        }

        for (let i = 0; i < ln; i++) {
            stream = streams[i];
            duration = parseFloat((duration + stream.getDuration()).toFixed(5));

            if (time < duration) {
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

    function onEnded() {
        const nextStream = getNextStream();
        if (nextStream) {
            audioTrackDetected = undefined;
            videoTrackDetected = undefined;
            switchStream(activeStream, nextStream, NaN);
        }
        else {
            logger.debug('StreamController no next stream found');
        }
        flushPlaylistMetrics(nextStream ? PlayListTrace.END_OF_PERIOD_STOP_REASON : PlayListTrace.END_OF_CONTENT_STOP_REASON);
        playbackEndedTimerId = undefined;
        isPeriodSwitchInProgress = false;
    }

    function getNextStream() {
        if (activeStream) {
            const start = getActiveStreamInfo().start;
            const duration = getActiveStreamInfo().duration;

            return streams.filter(function (stream) {
                return (stream.getStreamInfo().start === parseFloat((start + duration).toFixed(5)));
            })[0];
        }
    }

    function switchStream(oldStream, newStream, seekTime) {
        if (isStreamSwitchingInProgress || !newStream || (oldStream === newStream && newStream.isActive())) return;
        isStreamSwitchingInProgress = true;

        eventBus.trigger(Events.PERIOD_SWITCH_STARTED, {
            fromStreamInfo: oldStream ? oldStream.getStreamInfo() : null,
            toStreamInfo: newStream.getStreamInfo()
        });

        useSmoothPeriodTransition = false;
        if (oldStream) {
            oldStream.stopEventController();
            useSmoothPeriodTransition = (activeStream.isProtectionCompatible(newStream) &&
                (supportsChangeType || activeStream.isMediaCodecCompatible(newStream))) &&
                !seekTime || newStream.getPreloaded();
            oldStream.deactivate(useSmoothPeriodTransition);
        }

        activeStream = newStream;
        preloading = false;
        playbackController.initialize(getActiveStreamInfo(), useSmoothPeriodTransition);
        if (videoModel.getElement()) {
            //TODO detect if we should close jump to activateStream.
            openMediaSource(seekTime, oldStream, false, useSmoothPeriodTransition);
        } else {
            preloadStream(seekTime);
        }
    }

    function preloadStream(seekTime) {
        activateStream(seekTime, useSmoothPeriodTransition);
    }

    function switchToVideoElement(seekTime) {
        if (activeStream) {
            playbackController.initialize(getActiveStreamInfo());
            openMediaSource(seekTime, null, true, false);
        }
    }

    function openMediaSource(seekTime, oldStream, streamActivated, keepBuffers) {
        let sourceUrl;

        function onMediaSourceOpen() {
            // Manage situations in which a call to reset happens while MediaSource is being opened
            if (!mediaSource || mediaSource.readyState != 'open') return;

            logger.debug('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();

            if (!oldStream) {
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
                if (!oldStream) {
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

    function activateStream(seekTime, keepBuffers) {
        buffers = activeStream.activate(mediaSource, keepBuffers ? buffers : undefined);
        audioTrackDetected = checkTrackPresence(Constants.AUDIO);
        videoTrackDetected = checkTrackPresence(Constants.VIDEO);

        // check if change type is supported by the browser
        if (buffers) {
            const keys = Object.keys(buffers);
            if (keys.length > 0 && buffers[keys[0]].changeType) {
                logger.debug('SourceBuffer changeType method supported. Use it to switch codecs in periods transitions');
                supportsChangeType = true;
            }
        }

        if (!initialPlayback) {
            if (!isNaN(seekTime)) {
                playbackController.seek(seekTime); //we only need to call seek here, IndexHandlerTime was set from seeking event
            } else {
                let startTime = playbackController.getStreamStartTime(true);
                if (!keepBuffers) {
                    getActiveStreamProcessors().forEach(p => {
                        p.setIndexHandlerTime(startTime);
                    });
                }
            }
        }

        activeStream.startEventController();
        if (autoPlay || !initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(Events.PERIOD_SWITCH_COMPLETED, {
            toStreamInfo: getActiveStreamInfo()
        });
    }

    function setMediaDuration(duration) {
        const manifestDuration = duration ? duration : getActiveStreamInfo().manifestInfo.duration;
        const mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
        logger.debug('Duration successfully set to: ' + mediaDuration);
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
                        mediaController: mediaController,
                        textController: textController,
                        videoModel: videoModel,
                        streamController: instance,
                        settings: settings
                    });
                    streams.push(stream);
                    stream.initialize(streamInfo, protectionController);
                } else {
                    stream.updateData(streamInfo);
                }

                dashMetrics.addManifestUpdateStreamInfo(streamInfo);
            }

            if (!activeStream) {
                // we need to figure out what the correct starting period is
                const startTimeFormUriParameters = playbackController.getStartTimeFromUriParameters();
                let initialStream = null;
                if (startTimeFormUriParameters) {
                    const initialTime = !isNaN(startTimeFormUriParameters.fragS) ? startTimeFormUriParameters.fragS : startTimeFormUriParameters.fragT;
                    initialStream = getStreamForTime(initialTime);
                }
                switchStream(null, initialStream !== null ? initialStream : streams[0], NaN);
            }

            eventBus.trigger(Events.STREAMS_COMPOSED);

        } catch (e) {
            errHandler.error(new DashJSError(Errors.MANIFEST_ERROR_ID_NOSTREAMS_CODE, e.message + 'nostreamscomposed', manifestModel.getValue()));
            hasInitialisationError = true;
            reset();
        }
    }

    function onTimeSyncCompleted( /*e*/ ) {
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
            const streamInfo = adapter.getStreamsInfo(undefined, 1)[0];
            const mediaInfo = (
                adapter.getMediaInfoForType(streamInfo, Constants.VIDEO) ||
                adapter.getMediaInfoForType(streamInfo, Constants.AUDIO)
            );

            let useCalculatedLiveEdgeTime;
            if (mediaInfo) {
                useCalculatedLiveEdgeTime = adapter.getUseCalculatedLiveEdgeTimeForMediaInfo(mediaInfo);
                if (useCalculatedLiveEdgeTime) {
                    logger.debug('SegmentTimeline detected using calculated Live Edge Time');
                    const s = { streaming: { useManifestDateHeaderTimeSource: false } };
                    settings.update(s);
                }
            }

            let manifestUTCTimingSources = adapter.getUTCTimingSources();
            let allUTCTimingSources = (!adapter.getIsDynamic() || useCalculatedLiveEdgeTime) ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
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

    function isTrackTypePresent(trackType) {
        let isTrackTypeDetected;

        if (!trackType) {
            return isTrackTypeDetected;
        }

        switch (trackType) {
            case Constants.VIDEO :
                isTrackTypeDetected = videoTrackDetected;
                break;
            case Constants.AUDIO :
                isTrackTypeDetected = audioTrackDetected;
                break;
        }
        return isTrackTypeDetected;
    }

    function checkTrackPresence(type) {
        let isDetected = false;
        getActiveStreamProcessors().forEach(p => {
            if (p.getMediaInfo().type === type) {
                isDetected = true;
            }
        });
        return isDetected;
    }

    function flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        getActiveStreamProcessors().forEach(p => {
            const ctrlr = p.getScheduleController();
            if (ctrlr) {
                ctrlr.finalisePlayList(time, reason);
            }
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
        videoTrackDetected = undefined;
        audioTrackDetected = undefined;
        initialPlayback = true;
        isPaused = false;
        autoPlay = true;
        playbackEndedTimerId = undefined;
        isPeriodSwitchInProgress = false;
        wallclockTicked = 0;
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
                eventBus.trigger(Events.PROTECTION_DESTROYED, {
                    data: manifestModel.getValue().url
                });
            }
        }

        eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        resetInitialSettings();
    }

    function onMetricAdded(e) {
        if (e.metric === MetricsConstants.DVR_INFO) {
            //Match media type? How can DVR window be different for media types?
            //Should we normalize and union the two?
            if (e.mediaType === Constants.AUDIO) {
                mediaSourceController.setSeekable(mediaSource, e.value.range.start, e.value.range.end);
            }
        }
    }

    instance = {
        initialize: initialize,
        getActiveStreamInfo: getActiveStreamInfo,
        isTrackTypePresent: isTrackTypePresent,
        switchToVideoElement: switchToVideoElement,
        getStreamById: getStreamById,
        getStreamForTime: getStreamForTime,
        getTimeRelativeToStreamId: getTimeRelativeToStreamId,
        load: load,
        loadWithManifest: loadWithManifest,
        getActiveStreamProcessors: getActiveStreamProcessors,
        setConfig: setConfig,
        setProtectionData: setProtectionData,
        reset: reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';
export default FactoryMaker.getSingletonFactory(StreamController);
