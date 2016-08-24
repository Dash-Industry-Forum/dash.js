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
import PlaybackController from './PlaybackController';
import Stream from '../Stream';
import ManifestUpdater from '../ManifestUpdater';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';
import URIQueryAndFragmentModel from '../models/URIQueryAndFragmentModel';
import VideoModel from '../models/VideoModel';
import MediaPlayerModel from '../models/MediaPlayerModel';
import FactoryMaker from '../../core/FactoryMaker';
import {PlayList, PlayListTrace} from '../vo/metrics/PlayList';
import Debug from '../../core/Debug';
import InitCache from '../utils/InitCache';

function StreamController() {

    const STREAM_END_THRESHOLD = 1.0;

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
        liveEdgeFinder,
        mediaSourceController,
        timeSyncController,
        baseURLController,
        initCache,
        errHandler,
        timelineConverter,
        streams,
        activeStream,
        protectionController,
        protectionData,
        autoPlay,
        isStreamSwitchingInProgress,
        isUpdating,
        hasMediaError,
        hasInitialisationError,
        mediaSource,
        videoModel,
        playbackController,
        mediaPlayerModel,
        isPaused,
        initialPlayback,
        playListMetrics,
        videoTrackDetected;

    function setup() {
        protectionController = null;
        streams = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        autoPlay = true;
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        isPaused = false;
        initialPlayback = true;
        playListMetrics = null;
        hasMediaError = false;
        hasInitialisationError = false;
    }

    function initialize(autoPl, protData) {
        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();
        initCache = InitCache(context).getInstance();

        manifestUpdater = ManifestUpdater(context).getInstance();
        manifestUpdater.setConfig({
            log: log,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel
        });
        manifestUpdater.initialize(manifestLoader);

        videoModel = VideoModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        playbackController.setConfig({
            streamController: instance,
            timelineConverter: timelineConverter,
            metricsModel: metricsModel,
            dashMetrics: dashMetrics,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            adapter: adapter,
            videoModel: videoModel
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
    }

    function flushPlaylistMetrics(reason, time) {
        time = time || new Date();

        if (playListMetrics) {
            if (activeStream) {
                activeStream.getProcessors().forEach(p => {
                    var ctrlr = p.getScheduleController();
                    if (ctrlr) {
                        ctrlr.finalisePlayList(
                            time,
                            reason
                        );
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
                var ctrlr = p.getScheduleController();
                if (ctrlr) {
                    ctrlr.setPlayList(playListMetrics);
                }
            });
        }
    }
    /*
     * StreamController aggregates all streams defined in the manifest file
     * and implements corresponding logic to switch between them.
     */
    function fireSwitchEvent(eventType, fromStream, toStream) {
        eventBus.trigger(eventType, {fromStreamInfo: fromStream ? fromStream.getStreamInfo() : null, toStreamInfo: toStream.getStreamInfo()});
    }

    function startAutoPlay() {
        if (!activeStream.isActivated() || !initialPlayback) return;
        // only first stream must be played automatically during playback initialization
        if (activeStream.getStreamInfo().index === 0) {
            activeStream.startEventController();
            if (autoPlay) {
                playbackController.play();
            }
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

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     */
    function onPlaybackTimeUpdated(e) {

        if (isVideoTrackPresent()) {
            const playbackQuality = videoModel.getPlaybackQuality();
            if (playbackQuality) {
                metricsModel.addDroppedFrames('video', playbackQuality);
            }
        }
        // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
        // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
        if (playbackController.isSeeking()) return;
        if (e.timeToEnd < STREAM_END_THRESHOLD) {
            //This is only used for multiperiod content.
            // The main call to signalEndOfStream is driven by BUFFERING_COMPLETED event
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }

    function onEnded() {
        const nextStream = getNextStream();
        if (nextStream) {
            switchStream(activeStream, nextStream, NaN);
        }
        flushPlaylistMetrics(nextStream ? PlayListTrace.END_OF_PERIOD_STOP_REASON : PlayListTrace.END_OF_CONTENT_STOP_REASON);
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

    function onPlaybackStarted(/*e*/) {
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

    /*
     * Handles the current stream buffering end moment to start the next stream buffering
     * Removing MP logic from this for now, we removing the complexity of buffering into next period for now.
     * this handler's logic caused Firefox and Safari to not period switch since the end event did not fire due to this.
     */
    function onStreamBufferingCompleted(e) {
        if (mediaSource && e.streamInfo.isLast) {
            mediaSourceController.signalEndOfStream(mediaSource);
        }
    }


    function getNextStream() {
        var start = activeStream.getStreamInfo().start;
        var duration = activeStream.getStreamInfo().duration;

        return streams.filter(function (stream) {
            return (stream.getStreamInfo().start === (start + duration));
        })[0];
    }

    function getStreamForTime(time) {
        var duration = 0;
        var stream = null;

        var ln = streams.length;

        if (ln > 0) {
            duration += streams[0].getStartTime();
        }

        for (var i = 0; i < ln; i++) {
            stream = streams[i];
            duration += stream.getDuration();

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
        var stream = null;
        var baseStart = 0;
        var streamStart = 0;
        var streamDur = null;

        var ln = streams.length;

        for (var i = 0; i < ln; i++) {
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

    function getActiveStreamCommonEarliestTime() {
        let commonEarliestTime = [];
        activeStream.getProcessors().forEach(p => {
            commonEarliestTime.push(p.getIndexHandler().getEarliestTime());
        });
        return Math.min.apply( Math, commonEarliestTime);
    }

    function switchStream(from, to, seekTime) {

        if (isStreamSwitchingInProgress || !from || !to || from === to) return;

        isStreamSwitchingInProgress = true;
        fireSwitchEvent(Events.PERIOD_SWITCH_STARTED, from, to);

        function onMediaSourceReady() {
            if (!isNaN(seekTime)) {
                playbackController.seek(seekTime); //we only need to call seek here, IndexHandlerTime was set from seeking event
            } else {
                let startTime = playbackController.getStreamStartTime(true);
                activeStream.getProcessors().forEach(p => {
                    adapter.setIndexHandlerTime(p, startTime);
                });
                playbackController.seek(startTime); //seek to period start time
            }
            playbackController.play();
            activeStream.startEventController();
            isStreamSwitchingInProgress = false;
            fireSwitchEvent(Events.PERIOD_SWITCH_COMPLETED, from, to);
        }

        from.deactivate();
        activeStream = to;
        playbackController.initialize(activeStream.getStreamInfo());
        videoTrackDetected = checkVideoPresence();
        setupMediaSource(onMediaSourceReady);
    }

    function setupMediaSource(callback) {

        let sourceUrl;

        function onMediaSourceOpen() {
            log('MediaSource is open!');

            window.URL.revokeObjectURL(sourceUrl);
            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);
            setMediaDuration();
            activeStream.activate(mediaSource);

            if (callback) {
                callback();
            }
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

    function setMediaDuration() {
        var manifestDuration,
            mediaDuration;

        manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        mediaDuration = mediaSourceController.setDuration(mediaSource, manifestDuration);
        log('Duration successfully set to: ' + mediaDuration);
    }

    function composeStreams() {
        var manifest = manifestModel.getValue();
        var metrics = metricsModel.getMetricsFor('stream');
        var manifestUpdateInfo = dashMetrics.getCurrentManifestUpdate(metrics);
        var remainingStreams = [];
        var streamInfo,
            pLen,
            sLen,
            pIdx,
            sIdx,
            streamsInfo,
            stream;

        if (!manifest) return;

        streamsInfo = adapter.getStreamsInfo(manifest);
        if ( protectionController) {
            eventBus.trigger(Events.PROTECTION_CREATED, {controller: protectionController, manifest: manifest});
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        try {
            if (streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }

            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {
                currentTime: playbackController.getTime(),
                buffered: videoModel.getElement().buffered,
                presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()
            });

            isUpdating = true;

            for (pIdx = 0, pLen = streamsInfo.length; pIdx < pLen; pIdx++) {
                streamInfo = streamsInfo[pIdx];
                for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx++) {
                    // If the stream already exists we just need to update the values we got from the updated manifest
                    if (streams[sIdx].getId() === streamInfo.id) {
                        stream = streams[sIdx];
                        remainingStreams.push(stream);
                        stream.updateData(streamInfo);
                    }
                }
                // If the Stream object does not exist we probably loaded the manifest the first time or it was
                // introduced in the updated manifest, so we need to create a new Stream and perform all the initialization operations
                if (!stream) {

                    stream = Stream(context).create({
                        manifestModel: manifestModel,
                        manifestUpdater: manifestUpdater,
                        adapter: adapter,
                        timelineConverter: timelineConverter,
                        capabilities: capabilities,
                        errHandler: errHandler,
                        baseURLController: baseURLController
                    });
                    stream.initialize(streamInfo, protectionController);

                    eventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
                    remainingStreams.push(stream);

                    if (activeStream) {
                        stream.updateData(streamInfo);
                    }
                }
                metricsModel.addManifestUpdateStreamInfo(manifestUpdateInfo, streamInfo.id, streamInfo.index, streamInfo.start, streamInfo.duration);
                stream = null;
            }

            streams = remainingStreams;

            // If the active stream has not been set up yet, let it be the first Stream in the list
            if (!activeStream) {
                activeStream = streams[0];
                fireSwitchEvent(Events.PERIOD_SWITCH_STARTED, null, activeStream);
                playbackController.initialize(activeStream.getStreamInfo());
                fireSwitchEvent(Events.PERIOD_SWITCH_COMPLETED, null, activeStream);
            }

            if (!mediaSource) {
                setupMediaSource();
            }

            isUpdating = false;
            checkIfUpdateCompleted();
        } catch (e) {
            errHandler.manifestError(e.message, 'nostreamscomposed', manifest);
            hasInitialisationError = true;
            reset();
        }
    }

    function checkIfUpdateCompleted() {
        if (isUpdating) return;

        var ln = streams.length;
        var i = 0;


        startAutoPlay();

        for (i; i < ln; i++) {
            if (!streams[i].isInitialized()) return;
        }

        eventBus.trigger(Events.STREAMS_COMPOSED);

    }

    function onStreamInitialized(/*e*/) {
        checkIfUpdateCompleted();
    }

    function onTimeSyncCompleted(/*e*/) {
        composeStreams();
    }

    function onManifestUpdated(e) {
        if (!e.error) {
            //Since streams are not composed yet , need to manually look up useCalculatedLiveEdgeTime to detect if stream
            //is SegmentTimeline to avoid using time source
            var manifest = e.manifest;
            var streamInfo = adapter.getStreamsInfo(manifest)[0];
            var mediaInfo = (
                adapter.getMediaInfoForType(manifest, streamInfo, 'video') ||
                    adapter.getMediaInfoForType(manifest, streamInfo, 'audio')
            );

            var adaptation,
                useCalculatedLiveEdgeTime;

            if (mediaInfo) {
                adaptation = adapter.getDataForMedia(mediaInfo);
                useCalculatedLiveEdgeTime = dashManifestModel.getRepresentationsForAdaptation(manifest, adaptation)[0].useCalculatedLiveEdgeTime;

                if (useCalculatedLiveEdgeTime) {
                    log('SegmentTimeline detected using calculated Live Edge Time');
                    mediaPlayerModel.setUseManifestDateHeaderTimeSource(false);
                }
            }

            var manifestUTCTimingSources = dashManifestModel.getUTCTimingSources(e.manifest);
            var allUTCTimingSources = (!dashManifestModel.getIsDynamic(manifest) || useCalculatedLiveEdgeTime) ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
            var isHTTPS = URIQueryAndFragmentModel(context).getInstance().isManifestHTTPS();

            //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
            allUTCTimingSources.forEach(function (item) {
                if (item.value.replace(/.*?:\/\//g, '') === MediaPlayerModel.DEFAULT_UTC_TIMING_SOURCE.value.replace(/.*?:\/\//g, '')) {
                    item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                    log('Matching default timing source protocol to manifest protocol: ' , item.value);
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


    function isVideoTrackPresent() {
        if (videoTrackDetected === undefined) {
            videoTrackDetected = checkVideoPresence();
        }
        return videoTrackDetected;
    }

    function checkVideoPresence() {
        let isVideoDetected = false;
        activeStream.getProcessors().forEach(p => {
            if (p.getMediaInfo().type === 'video') {
                isVideoDetected = true;
            }
        });
        return isVideoDetected;
    }

    function getAutoPlay() {
        return autoPlay;
    }

    function getActiveStreamInfo() {
        return activeStream ? activeStream.getStreamInfo() : null;
    }

    function isStreamActive(streamInfo) {
        return (activeStream.getId() === streamInfo.id);
    }

    function getStreamById(id) {
        return streams.filter(function (item) {
            return item.getId() === id;
        })[0];
    }

    function load(url) {
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
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
        if (config.liveEdgeFinder) {
            liveEdgeFinder = config.liveEdgeFinder;
        }
        if (config.mediaSourceController) {
            mediaSourceController = config.mediaSourceController;
        }
        if (config.timeSyncController) {
            timeSyncController = config.timeSyncController;
        }
        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
    }

    function reset() {
        timeSyncController.reset();

        flushPlaylistMetrics(
            hasMediaError || hasInitialisationError ?
                PlayListTrace.FAILURE_STOP_REASON :
                PlayListTrace.USER_REQUEST_STOP_REASON
        );

        for (let i = 0, ln = streams.length; i < ln; i++) {
            let stream = streams[i];
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
            stream.reset(hasMediaError);
        }

        streams = [];

        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);

        baseURLController.reset();
        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();
        manifestModel.setValue(null);
        manifestLoader.reset();
        timelineConverter.reset();
        liveEdgeFinder.reset();
        adapter.reset();
        initCache.reset();
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        activeStream = null;
        hasMediaError = false;
        hasInitialisationError = false;
        videoTrackDetected = undefined;
        initialPlayback = true;
        isPaused = false;

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
                eventBus.trigger(Events.PROTECTION_DESTROYED, {data: manifestModel.getValue().url});
            }
        }

        eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
    }

    instance = {
        initialize: initialize,
        getAutoPlay: getAutoPlay,
        getActiveStreamInfo: getActiveStreamInfo,
        isStreamActive: isStreamActive,
        isVideoTrackPresent: isVideoTrackPresent,
        getStreamById: getStreamById,
        getTimeRelativeToStreamId: getTimeRelativeToStreamId,
        load: load,
        loadWithManifest: loadWithManifest,
        getActiveStreamCommonEarliestTime: getActiveStreamCommonEarliestTime,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

StreamController.__dashjs_factory_name = 'StreamController';

export default FactoryMaker.getSingletonFactory(StreamController);
