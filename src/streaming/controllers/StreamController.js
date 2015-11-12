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
import MediaPlayer from '../MediaPlayer.js';
import EventBus from '../utils/EventBus.js';
import Events from '../Events.js';
import URIQueryAndFragmentModel from '../models/URIQueryAndFragmentModel.js';
import VideoModel from '../models/VideoModel.js';
import FactoryMaker from '../../core/FactoryMaker.js';

export default FactoryMaker.getSingletonFactory(StreamController);
function StreamController(config) {

    const STREAM_END_THRESHOLD = 0.2;

    let log                 = config ? config.log : null,
        system              = config ? config.system : null,
        capabilities        = config ? config.capabilities : null,
        manifestUpdater     = config ? config.manifestUpdater : null,
        manifestLoader      = config ? config.manifestLoader : null,
        manifestModel       = config ? config.manifestModel : null,
        manifestExt         = config ? config.manifestExt : null,
        adapter             = config ? config.adapter : null,
        metricsModel        = config ? config.metricsModel : null,
        metricsExt          = config ? config.metricsExt : null,
        videoExt            = config ? config.videoExt : null,
        liveEdgeFinder      = config ? config.liveEdgeFinder : null,
        mediaSourceExt      = config ? config.mediaSourceExt : null,
        timeSyncController  = config ? config.timeSyncController : null,
        virtualBuffer       = config ? config.virtualBuffer : null,
        errHandler          = config ? config.errHandler : null,
        timelineConverter   = config ? config.timelineConverter : null;


    let instance = {
        initialize          :initialize,
        getAutoPlay         :getAutoPlay,
        getActiveStreamInfo :getActiveStreamInfo,
        isStreamActive      :isStreamActive,
        setUTCTimingSources :setUTCTimingSources,
        getStreamById       :getStreamById,
        load                :load,
        loadWithManifest    :loadWithManifest,
        setConfig           :setConfig,
        reset               :reset
    };

    setup();

    return instance;


    let streams,
        activeStream,
        protectionController,
        ownProtectionController,
        protectionData,
        autoPlay,
        canPlay,
        isStreamSwitchingInProgress,
        isUpdating,
        hasMediaError,
        mediaSource,
        UTCTimingSources,
        useManifestDateHeaderTimeSource,
        videoModel,
        playbackController;

    function setup() {
        streams = [];
        ownProtectionController = false;
        autoPlay = true;
        canPlay = false;
        isStreamSwitchingInProgress = false;
        isUpdating = false;
        hasMediaError = false;
    }

    function initialize(autoPl, protCtrl, protData) {
        autoPlay = autoPl;
        protectionController = protCtrl;
        protectionData = protData;
        timelineConverter.initialize();
        manifestLoader.initialize();
        manifestUpdater.initialize(manifestLoader);

        videoModel = VideoModel.getInstance();
        playbackController = PlaybackController.getInstance();
        playbackController.setConfig({
            streamController: instance,
            log: log,
            timelineConverter: timelineConverter,
            metricsModel: metricsModel,
            metricsExt: metricsExt,
            manifestModel: manifestModel,
            manifestExt: manifestExt,
            adapter: adapter,
            videoModel: videoModel
        });

        EventBus.on(Events.TIME_SYNCHRONIZATION_COMPLETED, onTimeSyncCompleted, this);
        EventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        EventBus.on(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        EventBus.on(Events.PLAYBACK_ENDED, onEnded, this);
        EventBus.on(Events.CAN_PLAY, onCanPlay, this);
        EventBus.on(Events.PLAYBACK_ERROR, onPlaybackError, this);
        EventBus.on(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        EventBus.on(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
    }

    /*
     * StreamController aggregates all streams defined in the manifest file
     * and implements corresponding logic to switch between them.
     */
    function fireSwitchEvent(eventType, fromStream, toStream) {
        EventBus.trigger(eventType, {fromStreamInfo: fromStream ? fromStream.getStreamInfo() : null, toStreamInfo: toStream.getStreamInfo()})
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
        var code = e.error ? e.error.code : 0,
            msg = "";

        if (code === -1) {
            // not an error!
            return;
        }

        switch (code) {
            case 1:
                msg = "MEDIA_ERR_ABORTED";
                break;
            case 2:
                msg = "MEDIA_ERR_NETWORK";
                break;
            case 3:
                msg = "MEDIA_ERR_DECODE";
                break;
            case 4:
                msg = "MEDIA_ERR_SRC_NOT_SUPPORTED";
                break;
            case 5:
                msg = "MEDIA_ERR_ENCRYPTED";
                break;
            default:
                msg = "UNKNOWN";
                break;
        }

        hasMediaError = true;

        log("Video Element Error: " + msg);
        if (e.error) {
            log(e.error);
        }
        errHandler.mediaSourceError(msg);
        reset();
    }

    /*
     * Called when current playback position is changed.
     * Used to determine the time current stream is finished and we should switch to the next stream.
     * TODO move to ???Extensions class
     */
    function onPlaybackTimeUpdated(e) {
        var playbackQuality = videoExt.getPlaybackQuality(videoModel.getElement());
        if (playbackQuality) {
            metricsModel.addDroppedFrames("video", playbackQuality);
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
        var nextStream = getNextStream(),
            isLast = e.data.streamInfo.isLast;

        // buffering has been complted, now we can signal end of stream
        if (mediaSource && isLast) {
            mediaSourceExt.signalEndOfStream(mediaSource);
        }

        if (!nextStream) return;

        nextStream.activate(mediaSource);
    }

    function getNextStream() {
        var start = activeStream.getStreamInfo().start,
            duration = activeStream.getStreamInfo().duration;

        return streams.filter(function(stream){
            return (stream.getStreamInfo().start === (start + duration));
        })[0];
    }

    function getStreamForTime(time) {
        var duration = 0,
            stream = null,
            ln = streams.length;

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

        if(isStreamSwitchingInProgress || !from || !to || from === to) return;

        fireSwitchEvent(Events.PERIOD_SWITCH_STARTED, from, to);
        isStreamSwitchingInProgress = true;

        var onMediaSourceReady = function() {
                if (seekTo !== undefined) {
                    playbackController.seek(seekTo);
                }

                playbackController.start();
                activeStream.startEventController();
                isStreamSwitchingInProgress = false;
                fireSwitchEvent(Events.PERIOD_SWITCH_COMPLETED, from, to);
            };

        // TODO switchStream could be called from a handler of seeking event. from.deactivate() contains logic for
        // removing event listeners including that seeking event handler. Since dijon calls event listeners
        // synchronously an attempt to remove listener from itself leads to an exception in dijon lib. setTimeout is
        // used to workaround this issue.
        setTimeout(function() {
            from.deactivate();
            activeStream = to;
            playbackController.initialize(activeStream.getStreamInfo());
            setupMediaSource(onMediaSourceReady);
        }, 0);
    }

    function setupMediaSource(callback) {
        var sourceUrl,

            onMediaSourceOpen = function (e) {
                log("MediaSource is open!");
                log(e);
                window.URL.revokeObjectURL(sourceUrl);

                mediaSource.removeEventListener("sourceopen", onMediaSourceOpen);
                mediaSource.removeEventListener("webkitsourceopen", onMediaSourceOpen);

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

        mediaSource.addEventListener("sourceopen", onMediaSourceOpen, false);
        mediaSource.addEventListener("webkitsourceopen", onMediaSourceOpen, false);
        sourceUrl = mediaSourceExt.attachMediaSource(mediaSource, videoModel);
        //log("MediaSource attached to video.  Waiting on open...");
    }

    function setMediaDuration() {
        var manifestDuration,
            mediaDuration;

        manifestDuration = activeStream.getStreamInfo().manifestInfo.duration;
        mediaDuration = mediaSourceExt.setDuration(mediaSource, manifestDuration);
        log("Duration successfully set to: " + mediaDuration);
    }

    function composeStreams() {
        var manifest = manifestModel.getValue(),
            metrics = metricsModel.getMetricsFor("stream"),
            manifestUpdateInfo = metricsExt.getCurrentManifestUpdate(metrics),
            streamInfo,
            pLen,
            sLen,
            pIdx,
            sIdx,
            streamsInfo,
            remainingStreams = [],
            stream;

        if (!manifest) return;

        streamsInfo = adapter.getStreamsInfo(manifest);

        if (capabilities.supportsEncryptedMedia()) {
            if (!protectionController) {
                protectionController = system.getObject("protectionController");
                EventBus.trigger(Events.PROTECTION_CREATED, {controller: protectionController, manifest: manifest});
                ownProtectionController = true;
            }
            protectionController.setMediaElement(videoModel.getElement());
            if (protectionData) {
                protectionController.setProtectionData(protectionData);
            }
        }

        try {
            if (streamsInfo.length === 0) {
                throw new Error("There are no streams");
            }

            metricsModel.updateManifestUpdateInfo(manifestUpdateInfo, {currentTime: videoModel.getCurrentTime(),
                buffered: videoModel.getElement().buffered, presentationStartTime: streamsInfo[0].start,
                clientTimeOffset: timelineConverter.getClientTimeOffset()});

            isUpdating = true;

            for (pIdx = 0, pLen = streamsInfo.length; pIdx < pLen; pIdx += 1) {
                streamInfo = streamsInfo[pIdx];
                for (sIdx = 0, sLen = streams.length; sIdx < sLen; sIdx += 1) {
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
                    stream = system.getObject("stream");
                    stream.initialize(streamInfo, protectionController, protectionData);
                    EventBus.on(Events.STREAM_INITIALIZED, onStreamInitialized, this);
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
        } catch(e) {
            errHandler.manifestError(e.message, "nostreamscomposed", manifest);
            reset();
        }
    }

    function checkIfUpdateCompleted() {
        if (isUpdating) return;

        var ln = streams.length,
            i = 0;

        startAutoPlay();

        for (i; i < ln; i += 1) {
            if (!streams[i].isInitialized()) return;
        }

        EventBus.trigger(Events.STREAMS_COMPOSED);
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
            var manifest = e.manifest,
                streamInfo = adapter.getStreamsInfo(manifest)[0],
                mediaInfo = (
                    adapter.getMediaInfoForType(manifest, streamInfo, "video") ||
                    adapter.getMediaInfoForType(manifest, streamInfo, "audio")
                ),
                adaptation,
                useCalculatedLiveEdgeTime;

            if (mediaInfo) {
                adaptation = adapter.getDataForMedia(mediaInfo);
                useCalculatedLiveEdgeTime = manifestExt.getRepresentationsForAdaptation(manifest, adaptation)[0].useCalculatedLiveEdgeTime;

                if (useCalculatedLiveEdgeTime) {
                    log("SegmentTimeline detected using calculated Live Edge Time");
                    useManifestDateHeaderTimeSource = false;
                }
            }

            var manifestUTCTimingSources = manifestExt.getUTCTimingSources(e.manifest),
                allUTCTimingSources = (!manifestExt.getIsDynamic(manifest) || useCalculatedLiveEdgeTime ) ?  manifestUTCTimingSources :  manifestUTCTimingSources.concat(UTCTimingSources),
                isHTTPS = URIQueryAndFragmentModel.getInstance().isManifestHTTPS();
                //If https is detected on manifest then lets apply that protocol to only the default time source(s). In the future we may find the need to apply this to more then just default so left code at this level instead of in MediaPlayer.
                allUTCTimingSources.forEach(function(item){
                    if (item.value.replace(/.*?:\/\//g, "") === MediaPlayer.UTCTimingSources.default.value.replace(/.*?:\/\//g, "")){
                        item.value = item.value.replace(isHTTPS ? new RegExp(/^(http:)?\/\//i) : new RegExp(/^(https:)?\/\//i), isHTTPS ? "https://" : "http://");
                        log("Matching default timing source protocol to manifest protocol: " , item.value);
                    }
                });

            timeSyncController.initialize(allUTCTimingSources, useManifestDateHeaderTimeSource);

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

    function setUTCTimingSources(value, value2) {
        UTCTimingSources = value;
        useManifestDateHeaderTimeSource = value2;
    }

    function getStreamById(id) {
        return streams.filter(function(item){
            return item.getId() === id;
        })[0];
    }

    function load(url) {
        manifestLoader.load(url);
    }

    function loadWithManifest(manifest) {
        manifestUpdater.setManifest(manifest);
    }

    function setConfig(config){
        if (!config) return;

        if (config.log){
            log = config.log;
        }
        if (config.system){
            system = config.system;
        }
        if (config.capabilities){
            capabilities = config.capabilities;
        }
        if (config.manifestUpdater){
            manifestUpdater = config.manifestUpdater;
        }
        if (config.manifestLoader){
            manifestLoader = config.manifestLoader;
        }
        if (config.manifestModel){
            manifestModel = config.manifestModel;
        }
        if (config.manifestExt){
            manifestExt = config.manifestExt;
        }
        if (config.adapter){
            adapter = config.adapter;
        }
        if (config.metricsModel){
            metricsModel = config.metricsModel;
        }
        if (config.metricsExt){
            metricsExt = config.metricsExt;
        }
        if (config.videoExt){
            videoExt = config.videoExt;
        }
        if (config.liveEdgeFinder){
            liveEdgeFinder = config.liveEdgeFinder;
        }
        if (config.mediaSourceExt){
            mediaSourceExt = config.mediaSourceExt;
        }
        if (config.timeSyncController){
            timeSyncController = config.timeSyncController;
        }
        if (config.virtualBuffer){
            virtualBuffer = config.virtualBuffer;
        }
        if (config.errHandler){
            errHandler = config.errHandler;
        }
        if (config.timelineConverter){
            timelineConverter = config.timelineConverter;
        }
    }

    function reset() {

        var stream;
        timeSyncController.reset();

        for (var i = 0, ln = streams.length; i < ln; i++) {
            stream = streams[i];
            EventBus.off(Events.STREAM_INITIALIZED, onStreamInitialized, this);
            stream.reset(hasMediaError);
        }

        streams = [];

        EventBus.off(Events.PLAYBACK_TIME_UPDATED, onPlaybackTimeUpdated, this);
        EventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, this);
        EventBus.off(Events.CAN_PLAY, onCanPlay, this);
        EventBus.off(Events.PLAYBACK_ERROR, onPlaybackError, this);
        EventBus.off(Events.PLAYBACK_ENDED, onEnded, this);
        EventBus.off(Events.STREAM_BUFFERING_COMPLETED, onStreamBufferingCompleted, this);
        EventBus.off(Events.MANIFEST_UPDATED, onManifestUpdated, this);
        manifestUpdater.reset();
        metricsModel.clearAllCurrentMetrics();


        var manifestUrl = (manifestModel.getValue()) ? manifestModel.getValue().url : null;
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

        // Teardown the protection system, if necessary
        if (!protectionController) {
            EventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        }
        else if (ownProtectionController) {
            var onTeardownComplete = function () {
                EventBus.off(Events.TEARDOWN_COMPLETE, onTeardownComplete, this);
                // Complete teardown process
                ownProtectionController = false;
                protectionController = null;
                protectionData = null;
                if (manifestUrl) {
                    EventBus.trigger(Events.PROTECTION_DESTROYED, {data: manifestUrl});
                }
                EventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
            };
            EventBus.on(Events.TEARDOWN_COMPLETE, onTeardownComplete, this);
            protectionController.teardown();
        } else {
            protectionController.setMediaElement(null);
            protectionController = null;
            protectionData = null;
            EventBus.trigger(Events.STREAM_TEARDOWN_COMPLETE);
        }
    }
};
