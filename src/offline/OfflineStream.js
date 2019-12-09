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
 * @module  OfflineStream
 * @description Initialize and Manage Offline Stream for each type
 * @param {Object} config - dependences
 */
function OfflineStream(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const constants = config.constants;
    const debug = config.debug;
    const adapter = config.adapter;
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
        eventBus.on(events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
    }

    /**
     * Creates media bitrate list, so that user will be able to choose the representation he wants to download
     */
    function getDownloadableRepresentations() {
        let downloadableRepresentations = {
            video: [],
            audio: [],
            text: []
        };

        const trackKindMap = { subtitle: 'subtitles', caption: 'captions' }; //Dash Spec has no "s" on end of KIND but HTML needs plural.
        const getKind = function (mediaInfo) {
            let kind = (mediaInfo.roles.length > 0) ? trackKindMap[mediaInfo.roles[0]] : trackKindMap.caption;
            kind = (kind === trackKindMap.caption || kind === trackKindMap.subtitle) ? kind : trackKindMap.caption;
            return kind;
        };

        // video
        let mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.VIDEO);
        if (mediaInfo.length > 0) {
            mediaInfo.forEach((item) => {
                item.bitrateList.forEach((bitrate) => {
                    downloadableRepresentations.video.push({
                        id: bitrate.id,
                        bandwidth: bitrate.bandwidth,
                        width: bitrate.width,
                        height: bitrate.height
                    });
                });
            });
        }

        // audio
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.AUDIO);
        if (mediaInfo.length > 0) {
            mediaInfo.forEach((item) => {
                item.bitrateList.forEach((bitrate) => {
                    downloadableRepresentations.audio.push({
                        id: bitrate.id,
                        bandwidth: bitrate.bandwidth,
                        lang: item.lang
                    });
                });
            });
        }

        // text

        const addTextInfo = function (infos, type) {
            if (infos.length > 0) {

                infos.forEach((item) => {
                    item.bitrateList.forEach((bitrate) => {
                        downloadableRepresentations.text.push({
                            id: bitrate.id,
                            lang: item.lang,
                            kind: getKind(item),
                            roles: item.roles,
                            accessibility: item.accessibility,
                            type: type
                        });
                    });
                });
            }
        };

        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.FRAGMENTED_TEXT);
        addTextInfo(mediaInfo, constants.FRAGMENTED_TEXT);

        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.TEXT);
        addTextInfo(mediaInfo, constants.TEXT);

        /**
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.MUXED);
        if (mediaInfo.length > 0) {
            downloadableRepresentations.push(mediaInfo);
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, constants.IMAGE);
        if (mediaInfo.length > 0) {
            downloadableRepresentations.push(mediaInfo);
        }
        */

        eventBus.trigger(events.DOWNLOADABLE_REPRESENTATIONS_LOADED, {
            data: {
                id: manifestId,
                downloadableRepresentations: downloadableRepresentations
            },
            sender: this
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
        createOfflineStreamProcessorFor(constants.FRAGMENTED_TEXT,streamInfo);
        createOfflineStreamProcessorFor(constants.TEXT,streamInfo);

        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            offlineStreamProcessors[i].initialize();
        }
        /*
        createOfflineStreamProcessorFor(constants.MUXED,streamInfo);
        createOfflineStreamProcessorFor(constants.IMAGE,streamInfo);
        */
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
            callbacks: {
                completed: onStreamCompleted,
                progression: onStreamProgression
            },
            debug: debug,
            events: events,
            eventBus: eventBus,
            constants: constants
        });
        streamProcessor.setConfig({
            type: mediaInfo.type,
            mimeType: mediaInfo.mimeType,
            mediaInfo: mediaInfo,
            bitrate: bitrate,
            adapter: adapter,
            stream: instance,
            offlineStoreController: offlineStoreController
        });
        offlineStreamProcessors.push(streamProcessor);

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
        let repCtrl = e.sender;
        if (!streamInfo || repCtrl.getStreamId() !== streamInfo.id) return;

        if (e.currentRepresentation.segments && e.currentRepresentation.segments.length > 0) {
            representationsToUpdate.push(e.currentRepresentation);
        }

        let sp;
        // data are ready fr stream processor, let's start download
        for (let i = 0; i < offlineStreamProcessors.length; i++ ) {
            if (offlineStreamProcessors[i].getRepresentationController() === repCtrl) {
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

        eventBus.off(events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
    }

    instance = {
        initialize: initialize,
        getDownloadableRepresentations: getDownloadableRepresentations,
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
