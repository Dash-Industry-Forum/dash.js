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
import PlaybackController from './PlaybackController.js';
import Stream from '../Stream.js';
import ManifestUpdater from '../ManifestUpdater.js';
import EventBus from '../../core/EventBus.js';
import Events from '../../core/events/Events.js';
import URIQueryAndFragmentModel from '../models/URIQueryAndFragmentModel.js';
import VideoModel from '../models/VideoModel.js';
import MediaPlayerModel from '../models/MediaPlayerModel.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Debug from '../../core/Debug.js';

function StreamController() {

    const STREAM_END_THRESHOLD = 0.2;

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let instance,
        capabilities,
        manifestUpdater,
        manifestLoader,
        manifestModel,
        manifestExt,
        adapter,
        metricsModel,
        metricsExt,
        videoModelExt,
        liveEdgeFinder,
        mediaSourceExt,
        timeSyncController,
        virtualBuffer,
        errHandler,
        timelineConverter,
        streams,
        activeStream,
        protectionController,
        protectionData,
        autoPlay,
        canPlay,
        isStreamSwitchingInProgress,
        isUpdating,
        hasMediaError,
        mediaSource,
        videoModel,
        playbackController,
        mediaPlayerModel;


    function setup() {
        protectionController = null;
        streams = [];
        mediaPlayerModel = MediaPlayerModel(context).getInstance();
        autoPlay = true;
        canPlay = false;
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        hasMediaError = false;
    }

    function initialize(autoPl, protData) {
        autoPlay = autoPl;
        protectionData = protData;
        timelineConverter.initialize();

        manifestUpdater = ManifestUpdater(context).getInstance();
        manifestUpdater.setConfig({
            log: log,
            manifestModel: manifestModel,
            manifestExt: manifestExt
        });
        manifestUpdater.initialize(manifestLoader);

        videoModel = VideoModel(context).getInstance();
        playbackController = PlaybackController(context).getInstance();
        playbackController.setConfig({
            streamController: instance,
            timelineConverter: timelineConverter,
            metricsModel: metricsModel,
            metricsExt: metricsExt,
            manifestModel: manifestModel,
            manifestExt: manifestExt,
            adapter: adapter,
            videoModel: videoModel
        });

        eventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.on(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.on(Events.CAN_PLAY, onCanPlay, this);
        eventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.on(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        eventBus.on(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
    }

    /*
     * StreamController aggregates all streams defined in the manifest file
     * and implements corresponding logic to switch between them.
     */
    function fireSwitchEvent(eventType, fromStream, toStream) {
        eventBus.trigger(eventType, {fromStreamInfo: fromStream ? fromStream.getStreamInfo() : null, toStreamInfo: toStream.getStreamInfo()});
    }

    function startAutoPlay() {
        if (!activeStream.isActivated() || !canPlay) return;

        // only first stream must be played automatically during playback initialization
        if (activeStream.getStreamInfo().index === 0) {
            activeStream.startEventController();
            if (autoPlay) {
                playbackController.start();
            }
        }
    }

    function onCanPlay(/*e*/) {
        canPlay = true;
        startAutoPlay();
    }

    function onPlaybackError(e) {
        var code = e.error ? e.error.code : 0;
        var msg = '';

        if (code === -1) {
            // not an error!
            return;
        }

        switch (code) {
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
        var playbackQuality = videoModelExt.getPlaybackQuality(videoModel.getElement());
        if (playbackQuality) {
            metricsModel.addDroppedFrames('video', playbackQuality);
        }

        // Sometimes after seeking timeUpdateHandler is called before seekingHandler and a new stream starts
        // from beginning instead of from a chosen position. So we do nothing if the player is in the seeking state
        if (playbackController.isSeeking()) return;

        // check if stream end is reached
        if (e.timeToEnd < STREAM_END_THRESHOLD) {
            mediaSourceExt.signalEndOfStream(mediaSource);
        }
    }

    function onEnded(/*e*/) {
        switchStream(activeStream, getNextStream());
    }

    function onPlaybackSeeking(e) {
        var seekingStream = getStreamForTime(e.seekTime);

        if (seekingStream && seekingStream !== activeStream) {
            switchStream(activeStream, seekingStream, e.seekTime);
        }
    }

    /*
     * Handles the current stream buffering end moment to start the next stream buffering
     */
    function onStreamBufferingCompleted(e) {
        var nextStream = getNextStream();
        var isLast = e.streamInfo.isLast;

        // buffering has been complted, now we can signal end of stream
        if (mediaSource && isLast) {
            mediaSourceExt.signalEndOfStream(mediaSource);
        }

        if (!nextStream) return;

        nextStream.activate(mediaSource);
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

    function switchStream(from, to, seekTo) {

        if (isStreamSwitchingInProgress || !from || !to || from === to) return;

        fireSwitchEvent(Events.PERIOD_SWITCH_STARTED, from, to);
        isStreamSwitchingInProgress = true;

        var onMediaSourceReady = function () {
            if (seekTo !== undefined) {
                playbackController.seek(seekTo);
            }

            playbackController.start();
            activeStream.startEventController();
            isStreamSwitchingInProgress = false;
            fireSwitchEvent(Events.PERIOD_SWITCH_COMPLETED, from, to);
        };

        //Removed a hack from 1.5 using setTimeout due to dijon.  Try without hack but remember.
        from.deactivate();
        activeStream = to;
        playbackController.initialize(activeStream.getStreamInfo());
        setupMediaSource(onMediaSourceReady);
    }

    function setupMediaSource(callback) {
        var sourceUrl;

        var onMediaSourceOpen = function () {
            log('MediaSource is open!');
            window.URL.revokeObjectURL(sourceUrl);

            mediaSource.removeEventListener('sourceopen', onMediaSourceOpen);
            mediaSource.removeEventListener('webkitsourceopen', onMediaSourceOpen);

            //log("MediaSource set up.");
            setMediaDuration();

            activeStream.activate(mediaSource);

            if (callback) {
                callback();
            }
        };

        if (!mediaSource) {
            mediaSource = mediaSourceExt.createMediaSource();
            //log("MediaSource created.");
            //log("MediaSource should be closed. The actual readyState is: " + mediaSource.readyState);
        } else {
            mediaSourceExt.detachMediaSource(videoModel);
        }

        mediaSource.addEventListener('sourceopen', onMediaSourceOpen, false);
        mediaSource.addEventListener('webkitsourceopen', onMediaSourceOpen, false);
        sourceUrl = mediaSourceExt.attachMediaSource(mediaSource, videoModel);
        //log("MediaSource attached to video.  Waiting on open...");
    }

    function setMediaDuration() {
        var manifestDuration,
            mediaDuration;

        manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        mediaDuration = mediaSourceExt.setDuration(mediaSource, manifestDuration);
        log('Duration successfully set to: ' + mediaDuration);
    }

    function composeStreams() {
        var manifest = manifestModel.getValue();
        var metrics = metricsModel.getMetricsFor('stream');
        var manifestUpdateInfo = metricsExt.getCurrentManifestUpdate(metrics);
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

            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: videoModel.getCurrentTime(),
                buffered: videoModel.getElement().buffered, presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()});

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
                        errHandler: errHandler
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
                useCalculatedLiveEdgeTime = manifestExt.getRepresentationsForAdaptation(manifest, adaptation)[0].useCalculatedLiveEdgeTime;

                if (useCalculatedLiveEdgeTime) {
                    log('SegmentTimeline detected using calculated Live Edge Time');
                    mediaPlayerModel.setUseManifestDateHeaderTimeSource(false);
                }
            }

            var manifestUTCTimingSources = manifestExt.getUTCTimingSources(e.manifest);
            var allUTCTimingSources = (!manifestExt.getIsDynamic(manifest) || useCalculatedLiveEdgeTime) ? manifestUTCTimingSources : manifestUTCTimingSources.concat(mediaPlayerModel.getUTCTimingSources());
            var isHTTPS = URIQueryAndFragmentModel(context).getInstance().isManifestHTTPS();

            //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
            allUTCTimingSources.forEach(function (item) {
                if (item.value.replace(/.*?:\/\//g, '') === MediaPlayerModel.DEFAULT_UTC_TIMING_SOURCE.value.replace(/.*?:\/\//g, '')) {
                    item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? 'https://' : 'http://');
                    log('Matching default timing source protocol to manifest protocol: ' , item.value);
                }
            });

            timeSyncController.setConfig({
                metricsModel: metricsModel,
                metricsExt: metricsExt
            });
            timeSyncController.initialize(allUTCTimingSources, mediaPlayerModel.getUseManifestDateHeaderTimeSource());
        } else {
            reset();
        }
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
        if (config.manifestExt) {
            manifestExt = config.manifestExt;
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
        if (config.metricsExt) {
            metricsExt = config.metricsExt;
        }
        if (config.videoModelExt) {
            videoModelExt = config.videoModelExt;
        }
        if (config.liveEdgeFinder) {
            liveEdgeFinder = config.liveEdgeFinder;
        }
        if (config.mediaSourceExt) {
            mediaSourceExt = config.mediaSourceExt;
        }
        if (config.timeSyncController) {
            timeSyncController = config.timeSyncController;
        }
        if (config.virtualBuffer) {
            virtualBuffer = config.virtualBuffer;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.timelineConverter) {
            timelineConverter = config.timelineConverter;
        }
    }

    function reset() {

        var stream;
        timeSyncController.reset();

        for (var i = 0, ln = streams.length; i < ln; i++) {
            stream = streams[i];
            eventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
            stream.reset(hasMediaError);
        }

        streams = [];

        eventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        eventBus.off(Events.CAN_PLAY, onCanPlay, this);
        eventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, this);
        eventBus.off(Events.PLAYBACK_ENDED, onEnded, this);
        eventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        eventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, this);

        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();
        manifestModel.setValue(null);
        manifestLoader.reset();
        timelineConverter.reset();
        liveEdgeFinder.reset();
        adapter.reset();
        virtualBuffer.reset();
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        activeStream = null;
        canPlay = false;
        hasMediaError = false;

        if (mediaSource) {
            mediaSourceExt.detachMediaSource(videoModel);
            mediaSource = null;
        }

        videoModel = null;

        if (!protectionController) {
            eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        }
        else {
            protectionController.setMediaElement(null);
            protectionController = null;
            protectionData = null;
            if (manifestModel.getValue()) {
                eventBus.trigger(Events.PROTECTION_DESTROYED, {data: manifestModel.getValue().url});
            }
            eventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        }
    }

    instance = {
        initialize: initialize,
        getAutoPlay: getAutoPlay,
        getActiveStreamInfo: getActiveStreamInfo,
        isStreamActive: isStreamActive,
        getStreamById: getStreamById,
        load: load,
        loadWithManifest: loadWithManifest,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

export default FactoryMaker.getSingletonFactory(StreamController);