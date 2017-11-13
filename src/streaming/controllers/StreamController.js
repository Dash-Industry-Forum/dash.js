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
import MediaPlayerModel from '../models/MediaPlayerModel';
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

function StreamController() {

    const STREAM_END_THRESHOLD = 0.5;
    const STREAM_END_TIMEOUT_DELAY = 0.1;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let instance,
        capabilities,
        manifestUpdater,
        manifestLoader,
        manifestModel,
        dashManifestModel,
        adapter,
        metricsModel,
        dashMetrics,
        mediaSourceController,
        timeSyncController,
        baseURLController,
        domStorage,
        abrController,
        mediaController,
        textController,
        sourceBufferController,
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
        playListMetrics,
        videoTrackDetected,
        audioTrackDetected,
        endedTimeout;

    function setup() {
        timeSyncController = TimeSyncController(context).getInstance();
        baseURLController = BaseURLController(context).getInstance();
        mediaSourceController = MediaSourceController(context).getInstance();
        initCache = InitCache(context).getInstance();
        urlUtils = URLUtils(context).getInstance();

        resetInitialSettings();
    }

    function initialize(autoPl, protData) {
        checkSetConfigCall();

        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();

        manifestUpdater = ManifestUpdater(context).create();
        manifestUpdater.setConfig({
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            mediaPlayerModel: mediaPlayerModel,
            manifestLoader: manifestLoader
        });
        manifestUpdater.initialize();

        baseURLController.setConfig({
            dashManifestModel: dashManifestModel
        });

        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.on(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(e) {

        if (isVideoTrackPresent()) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                metricsModel.addDroppedFrames(Constants.VIDEO, playbackQuality);
            }
        }

        // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
        // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
        if (playbackController.isSeeking()) return;

        if (e.timeToEnd <= STREAM_END_THRESHOLD) {
            // In some cases the ended event is not triggered at the end of the stream, do it artificially here.
            // This should only be a fallback, put an extra STREAM_END_TIMEOUT_DELAY to give the real ended event time to trigger.
            log('[StreamController][onPlaybackTimeUpdated] timeToEnd = ' + e.timeToEnd + ' PLAYBACK_ENDED need to be triggered');
            if (endedTimeout) {
                clearTimeout(endedTimeout);
                endedTimeout = undefined;
            }
            endedTimeout = setTimeout(function () {
                endedTimeout = undefined;
                eventBus.trigger(Events.PLAYBACK_ENDED);
            }, 1000 * (e.timeToEnd + STREAM_END_TIMEOUT_DELAY));
        }
    }

    function onPlaybackSeeking(e) {
        const seekingStream = getStreamForTime(e.seekTime);

        if (seekingStream && seekingStream !== activeStream) {
            flushPlaylistMetrics(PlayListTrace.END_OF_PERIOD_STOP_REASON);
            switchStream(activeStream, seekingStream, e.seekTime);
        } else {
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }

        addPlaylistMetrics(PlayList.SEEK_START_REASON);
    }

    function onPlaybackStarted( /*e*/ ) {
        if (initialPlayback) {
            initialPlayback = false;
            addPlaylistMetrics(PlayList.INITIAL_PLAYOUT_START_REASON);
        } else {
            if (isPaused) {
                isPaused = false;
                addPlaylistMetrics(PlayList.RESUME_FROM_PAUSE_START_REASON);
            }
        }
    }

    function onPlaybackPaused(e) {
        if (!e.ended) {
            isPaused = true;
            flushPlaylistMetrics(PlayListTrace.USER_REQUEST_STOP_REASON);
        }
    }

    function onStreamBufferingCompleted() {
        const isLast = getActiveStreamInfo().isLast;
        if (mediaSource && isLast) {
            mediaSourceController.signalEndOfStream(mediaSource);
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

        const ln = streams.length;

        for (let i = 0; i < ln; i++) {
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

    function getActiveStreamCommonEarliestTime() {
        let commonEarliestTime = [];
        if (activeStream) {
            activeStream.getProcessors().forEach(p => {
                commonEarliestTime.push(p.getIndexHandler().getEarliestTime());
            });
        }
        return Math.min.apply(Math, commonEarliestTime);
    }

    function onEnded() {
        if (endedTimeout) {
            clearTimeout(endedTimeout);
            endedTimeout = undefined;
        }

        const nextStream = getNextStream();
        if (nextStream) {
            switchStream(activeStream, nextStream, NaN);
        }
        flushPlaylistMetrics(nextStream ? PlayListTrace.END_OF_PERIOD_STOP_REASON : PlayListTrace.END_OF_CONTENT_STOP_REASON);
    }

    function getNextStream() {
        if (activeStream) {
            const start = activeStream.getStreamInfo().start;
            const duration = activeStream.getStreamInfo().duration;

            return streams.filter(function (stream) {
                return (stream.getStreamInfo().start === parseFloat((start + duration).toFixed(5)));
            })[0];
        }
    }

    function switchStream(oldStream, newStream, seekTime) {

        if (isStreamSwitchingInProgress || !newStream || oldStream === newStream) return;
        isStreamSwitchingInProgress = true;

        eventBus.trigger(Events.PERIOD_SWITCH_STARTED, {
            fromStreamInfo: oldStream ? oldStream.getStreamInfo() : null,
            toStreamInfo: newStream.getStreamInfo()
        });

        if (oldStream) {
            oldStream.stopEventController();
            oldStream.deactivate();
        }
        activeStream = newStream;
        playbackController.initialize(activeStream.getStreamInfo());

        //TODO detect if we should close and repose or jump to activateStream.
        openMediaSource(seekTime);
    }

    function openMediaSource(seekTime) {

        let sourceUrl;

        function onMediaSourceOpen() {
            log('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();
            activateStream(seekTime);
        }

        if (!mediaSource) {
            mediaSource = mediaSourceController.createMediaSource();
        } else {
            mediaSourceController.detachMediaSource(videoModel);
        }

        mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
        mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
        sourceUrl = mediaSourceController.attachMediaSource(mediaSource, videoModel);
        log('MediaSource attached to element.  Waiting on open...');
    }

    function activateStream(seekTime) {

        activeStream.activate(mediaSource);

        if (!initialPlayback) {
            if (!isNaN(seekTime)) {
                playbackController.seek(seekTime); //we only need to call seek here, IndexHandlerTime was set from seeking event
            } else {
                let startTime = playbackController.getStreamStartTime(true);
                activeStream.getProcessors().forEach(p => {
                    adapter.setIndexHandlerTime(p, startTime);
                });
                playbackController.seek(startTime); //seek to period start time
            }
        } else {
            videoTrackDetected = checkTrackPresence(Constants.VIDEO);
        }

        activeStream.startEventController();
        if (autoPlay || !initialPlayback) {
            playbackController.play();
        }

        isStreamSwitchingInProgress = false;
        eventBus.trigger(Events.PERIOD_SWITCH_COMPLETED, {
            toStreamInfo: activeStream.getStreamInfo()
        });
    }

    function setMediaDuration() {
        const manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        const mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
        log('Duration successfully set to: ' + mediaDuration);
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

            const manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metricsModel.getMetricsFor(Constants.STREAM));
            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
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
                        dashManifestModel: dashManifestModel,
                        mediaPlayerModel: mediaPlayerModel,
                        metricsModel: metricsModel,
                        dashMetrics: dashMetrics,
                        manifestUpdater: manifestUpdater,
                        adapter: adapter,
                        timelineConverter: timelineConverter,
                        capabilities: capabilities,
                        errHandler: errHandler,
                        baseURLController: baseURLController,
                        domStorage: domStorage,
                        abrController: abrController,
                        playbackController: playbackController,
                        mediaController: mediaController,
                        textController: textController,
                        sourceBufferController: sourceBufferController,
                        videoModel: videoModel,
                        streamController: instance
                    });
                    streams.push(stream);
                    stream.initialize(streamInfo, protectionController);

                } else {
                    stream.updateData(streamInfo);
                }

                metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
            }

            if (!activeStream) {
                //const initStream = streamsInfo[0].manifestInfo.isDynamic ? streams[streams.length -1] : streams[0];
                //TODO we need to figure out what the correct starting period is here and not just go to first or last in array.
                switchStream(null, streams[0], NaN);
            }

            eventBus.trigger(Events.STREAMS_COMPOSED);

        } catch (e) {
            errHandler.manifestError(e.message, 'nostreamscomposed', manifestModel.getValue());
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
            let manifest = e.manifest;
            adapter.updatePeriods(manifest);
            let streamInfo = adapter.getStreamsInfo(manifest)[0];
            let mediaInfo = (
                adapter.getMediaInfoForType(streamInfo, Constants.VIDEO) ||
                adapter.getMediaInfoForType(streamInfo, Constants.AUDIO)
            );

            let voAdaptation,
                useCalculatedLiveEdgeTime;

            if (mediaInfo) {
                voAdaptation = adapter.getDataForMedia(mediaInfo);
                useCalculatedLiveEdgeTime = dashManifestModel.getRepresentationsForAdaptation(voAdaptation)[0].useCalculatedLiveEdgeTime;

                if (useCalculatedLiveEdgeTime) {
                    log('SegmentTimeline detected using calculated Live Edge Time');
                    mediaPlayerModel.setUseManifestDateHeaderTimeSource(false);
                }
            }

            let manifestUTCTimingSources = dashManifestModel.getUTCTimingSources(e.manifest);
            let allUTCTimingSources = (!dashManifestModel.getIsDynamic(manifest) || useCalculatedLiveEdgeTime) ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
            const isHTTPS = urlUtils.isHTTPS(e.manifest.url);

            //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
            allUTCTimingSources.forEach(function (item) {
                if (item.value.replace(/.*?:\/\//g, '') === MediaPlayerModel.DEFAULT_UTC_TIMING_SOURCE.value.replace(/.*?:\/\//g, '')) {
                    item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                    log('Matching default timing source protocol to manifest protocol: ', item.value);
                }
            });

            baseURLController.initialize(manifest);

            timeSyncController.setConfig({
                metricsModel: metricsModel,
                dashMetrics: dashMetrics
            });
            timeSyncController.initialize(allUTCTimingSources, mediaPlayerModel.getUseManifestDateHeaderTimeSource());
        } else {
            hasInitialisationError = true;
            reset();
        }
    }

    function isAudioTrackPresent() {
        if (audioTrackDetected === undefined) {
            audioTrackDetected = checkTrackPresence(Constants.AUDIO);
        }
        return audioTrackDetected;
    }

    function isVideoTrackPresent() {
        if (videoTrackDetected === undefined) {
            videoTrackDetected = checkTrackPresence(Constants.VIDEO);
        }
        return videoTrackDetected;
    }

    function checkTrackPresence(type) {
        let isDetected = false;
        if (activeStream) {
            activeStream.getProcessors().forEach(p => {
                if (p.getMediaInfo().type === type) {
                    isDetected = true;
                }
            });
        }
        return isDetected;
    }

    function flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        if (playListMetrics) {
            if (activeStream) {
                activeStream.getProcessors().forEach(p => {
                    let ctrlr = p.getScheduleController();
                    if (ctrlr) {
                        ctrlr.finalisePlayList(time, reason);
                    }
                });
            }
            metricsModel.addPlayList(playListMetrics);
            playListMetrics = null;
        }
    }

    function addPlaylistMetrics(startReason) {
        playListMetrics = new PlayList();
        playListMetrics.start = new Date();
        playListMetrics.mstart = playbackController.getTime() * 1000;
        playListMetrics.starttype = startReason;

        if (activeStream) {
            activeStream.getProcessors().forEach(p => {
                let ctrlr = p.getScheduleController();
                if (ctrlr) {
                    ctrlr.setPlayList(playListMetrics);
                }
            });
        }
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

        log('Video Element Error: ' + msg);
        if (e.error) {
            log(e.error);
        }
        errHandler.mediaSourceError(msg);
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

    function checkSetConfigCall() {
        if (!manifestLoader || !manifestLoader.hasOwnProperty('load') || !timelineConverter || !timelineConverter.hasOwnProperty('initialize') ||
            !timelineConverter.hasOwnProperty('reset') || !timelineConverter.hasOwnProperty('getClientTimeOffset')) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function checkInitializeCall() {
        if (!manifestUpdater || !manifestUpdater.hasOwnProperty('setManifest')) {
            throw new Error('initialize function has to be called previously');
        }
    }

    function load(url) {
        checkSetConfigCall();
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
        checkInitializeCall();
        manifestUpdater.setManifest(manifest);
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
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
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
        if (config.metricsModel) {
            metricsModel = config.metricsModel;
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
        if (config.domStorage) {
            domStorage = config.domStorage;
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
        if (config.sourceBufferController) {
            sourceBufferController = config.sourceBufferController;
        }
    }

    function resetInitialSettings() {
        streams = [];
        protectionController = null;
        isStreamSwitchingInProgress = false;
        activeStream = null;
        hasMediaError = false;
        hasInitialisationError = false;
        videoTrackDetected = undefined;
        initialPlayback = true;
        isPaused = false;
        autoPlay = true;
        playListMetrics = null;
    }

    function reset() {
        checkSetConfigCall();

        timeSyncController.reset();

        flushPlaylistMetrics(
            hasMediaError || hasInitialisationError ?
            PlayListTrace.FAILURE_STOP_REASON :
            PlayListTrace.USER_REQUEST_STOP_REASON
        );

        for (let i = 0, ln = streams ? streams.length : 0; i < ln; i++) {
            let stream = streams[i];
            stream.reset(hasMediaError);
        }

        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.off(MediaPlayerEvents.METRIC_ADDED, onMetricAdded, this);

        baseURLController.reset();
        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();
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

        if (endedTimeout) {
            clearTimeout(endedTimeout);
            endedTimeout = undefined;
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
        isVideoTrackPresent: isVideoTrackPresent,
        isAudioTrackPresent: isAudioTrackPresent,
        getStreamById: getStreamById,
        getTimeRelativeToStreamId: getTimeRelativeToStreamId,
        load: load,
        loadWithManifest: loadWithManifest,
        getActiveStreamProcessors: getActiveStreamProcessors,
        getActiveStreamCommonEarliestTime: getActiveStreamCommonEarliestTime,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';

export default FactoryMaker.getSingletonFactory(StreamController);
