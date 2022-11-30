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
import OfflineStreamProcessor from './OfflineStreamProcessor';

/**
 * Initialize and Manage Offline Stream for each type
 */
/**
 * @class OfflineStream
 * @description Initialize and Manage Offline Stream for each type
 * @param {Object} config - dependences
 * @ignore
 */
function OfflineStream(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const errors = config.errors;
    const constants = config.constants;
    const dashConstants = config.dashConstants;
    const settings = config.settings;
    const debug = config.debug;
    const errHandler = config.errHandler;
    const mediaPlayerModel = config.mediaPlayerModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const adapter = config.adapter;
    const dashMetrics = config.dashMetrics;
    const baseURLController = config.baseURLController;
    const timelineConverter = config.timelineConverter;
    const segmentBaseController = config.segmentBaseController;
    const offlineStoreController = config.offlineStoreController;
    const manifestId = config.id;
    const startedCb = config.callbacks && config.callbacks.started;
    const progressionCb = config.callbacks && config.callbacks.progression;
    const finishedCb = config.callbacks && config.callbacks.finished;
    const updateManifest = config.callbacks && config.callbacks.updateManifestNeeded;

    let instance,
        offlineStreamProcessors,
        startedOfflineStreamProcessors,
        finishedOfflineStreamProcessors,
        streamInfo,
        representationsToUpdate,
        allMediasInfosList,
        progressionById;

    function setup() {
        resetInitialSettings();
    }

    /**
     * Reset
     */
    function resetInitialSettings() {
        streamInfo = null;
        offlineStreamProcessors = [];
        startedOfflineStreamProcessors = 0;
        finishedOfflineStreamProcessors = 0;
        allMediasInfosList = [];
        representationsToUpdate = [];
        progressionById = {};
    }

    /**
     * Initialize offlinestream
     * @param {Object} initStreamInfo
     */
    function initialize(initStreamInfo) {
        streamInfo = initStreamInfo;
        eventBus.on(events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    function getStreamId() {
        return streamInfo.id;
    }

    /**
     * Creates media infos list, so that user will be able to choose the representation he wants to download
     */
    function getMediaInfos() {
        let mediaInfos = adapter.getAllMediaInfoForType(streamInfo, constants.VIDEO);
        mediaInfos = mediaInfos.concat(adapter.getAllMediaInfoForType(streamInfo, constants.AUDIO));
        mediaInfos = mediaInfos.concat(adapter.getAllMediaInfoForType(streamInfo, constants.TEXT));

        // mediaInfos = mediaInfos.concat(adapter.getAllMediaInfoForType(streamInfo, constants.MUXED));
        // mediaInfos = mediaInfos.concat(adapter.getAllMediaInfoForType(streamInfo, constants.IMAGE));

        eventBus.trigger(events.OFFLINE_RECORD_LOADEDMETADATA, {
            id: manifestId,
            mediaInfos: mediaInfos
        });
    }

    /**
     * Initialize with choosen representations by user
     * @param {Object} mediasInfoList
     */
    function initializeAllMediasInfoList(mediasInfoList) {
        allMediasInfosList = mediasInfoList;
        initializeMedia(streamInfo);
    }

    /**
     * Initialize media for each type
     * @param {Object} streamInfo
     */
    function initializeMedia(streamInfo) {
        createOfflineStreamProcessorFor(constants.VIDEO,streamInfo);
        createOfflineStreamProcessorFor(constants.AUDIO,streamInfo);
        createOfflineStreamProcessorFor(constants.TEXT,streamInfo);
        createOfflineStreamProcessorFor(constants.MUXED,streamInfo);
        createOfflineStreamProcessorFor(constants.IMAGE,streamInfo);
    }

    function createOfflineStreamProcessorFor(type, streamInfo) {
        // filter mediaInfo according to choosen representation id
        let allMediaInfoForType = adapter.getAllMediaInfoForType(streamInfo, type);
        allMediaInfoForType.forEach((media) => {
            media.bitrateList = media.bitrateList.filter((bitrate) => {
                if (allMediasInfosList[type] && allMediasInfosList[type].indexOf(bitrate.id) !== -1) {
                    return true;
                }
                return false;
            });
        });

        allMediaInfoForType = allMediaInfoForType.filter((media) => {
            return (media.bitrateList && media.bitrateList.length > 0);
        });

        // cration of an offline stream processor for each choosen representation
        allMediaInfoForType.forEach((mediaInfo) => {
            if (mediaInfo.bitrateList) {
                mediaInfo.bitrateList.forEach((bitrate) => {
                    createStreamProcessor(mediaInfo, bitrate);
                });
            }
        });
        return allMediaInfoForType;
    }

    function createStreamProcessor (mediaInfo, bitrate) {

        let streamProcessor = OfflineStreamProcessor(context).create({
            id: manifestId,
            streamInfo: streamInfo,
            debug: debug,
            events: events,
            errors: errors,
            eventBus: eventBus,
            constants: constants,
            dashConstants: dashConstants,
            settings: settings,
            type: mediaInfo.type,
            mimeType: mediaInfo.mimeType,
            bitrate: bitrate,
            errHandler: errHandler,
            mediaPlayerModel: mediaPlayerModel,
            abrController: abrController,
            playbackController: playbackController,
            adapter: adapter,
            dashMetrics: dashMetrics,
            baseURLController: baseURLController,
            timelineConverter: timelineConverter,
            offlineStoreController: offlineStoreController,
            segmentBaseController: segmentBaseController,
            callbacks: {
                completed: onStreamCompleted,
                progression: onStreamProgression
            }
        });
        offlineStreamProcessors.push(streamProcessor);
        streamProcessor.initialize(mediaInfo);

        progressionById[bitrate.id] = null;
    }

    function onStreamCompleted() {
        finishedOfflineStreamProcessors++;
        if (finishedOfflineStreamProcessors === offlineStreamProcessors.length) {
            finishedCb({sender: this, id: manifestId, message: 'Downloading has been successfully completed for this stream !'});
        }
    }

    function onStreamProgression(streamProcessor, downloadedSegments, availableSegments ) {
        progressionById[streamProcessor.getRepresentationId()] = {
            downloadedSegments,
            availableSegments
        };

        let segments = 0;
        let allSegments = 0;
        let waitForAllProgress;
        for (var property in progressionById) {
            if (progressionById.hasOwnProperty(property)) {
                if (progressionById[property] === null) {
                    waitForAllProgress = true;
                } else {
                    segments += progressionById[property].downloadedSegments;
                    allSegments += progressionById[property].availableSegments;
                }
            }
        }

        if (!waitForAllProgress && progressionCb) {
            // all progression have been started, we can compute global progression
            if (allSegments > 0) {
                progressionCb(instance, segments, allSegments);
            }
        }
    }

    function onDataUpdateCompleted(e) {
        if (e.currentRepresentation.segments && e.currentRepresentation.segments.length > 0) {
            representationsToUpdate.push(e.currentRepresentation);
        }

        let sp;
        // data are ready fr stream processor, let's start download
        for (let i = 0; i < offlineStreamProcessors.length; i++ ) {
            if (offlineStreamProcessors[i].getRepresentationController().getType() === e.mediaType) {
                sp = offlineStreamProcessors[i];
                break;
            }
        }

        if (sp) {
            checkIfAllOfflineStreamProcessorsStarted();
        }
    }

    function checkIfAllOfflineStreamProcessorsStarted() {
        startedOfflineStreamProcessors++;
        if (startedOfflineStreamProcessors === offlineStreamProcessors.length) {
            startedCb({sender: this, id: manifestId, message: 'Downloading started for this stream !'});

            if (representationsToUpdate.length > 0) {
                updateManifest({sender: this, id: manifestId, representations: representationsToUpdate });
            } else {
                startOfflineStreamProcessors();
            }
        }
    }

    function getStreamInfo() {
        return streamInfo;
    }

    function getStartTime() {
        return streamInfo ? streamInfo.start : NaN;
    }

    function getDuration() {
        return streamInfo ? streamInfo.duration : NaN;
    }

    /**
     * Stop offline stream processors
     */
    function stopOfflineStreamProcessors() {
        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            offlineStreamProcessors[i].stop();
        }
    }

    /**
     * Start offline stream processors
     */
    function startOfflineStreamProcessors() {
        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            offlineStreamProcessors[i].start();
        }
    }

    function deactivate() {
        let ln = offlineStreamProcessors ? offlineStreamProcessors.length : 0;
        for (let i = 0; i < ln; i++) {
            offlineStreamProcessors[i].removeExecutedRequestsBeforeTime(getStartTime() + getDuration());
            offlineStreamProcessors[i].reset();
        }
    }

    /**
     * Reset
     */
    function reset() {
        stopOfflineStreamProcessors();
        deactivate();
        resetInitialSettings();

        eventBus.off(events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, instance);
    }

    instance = {
        initialize: initialize,
        getStreamId: getStreamId,
        getMediaInfos: getMediaInfos,
        initializeAllMediasInfoList: initializeAllMediasInfoList,
        getStreamInfo: getStreamInfo,
        stopOfflineStreamProcessors: stopOfflineStreamProcessors,
        startOfflineStreamProcessors: startOfflineStreamProcessors,
        reset: reset
    };

    setup();
    return instance;
}

OfflineStream.__dashjs_factory_name = 'OfflineStream';
export default dashjs.FactoryMaker.getClassFactory(OfflineStream); /* jshint ignore:line */
