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
import EventBus from './../core/EventBus';
import Events from './../core/events/Events';
import OfflineEvents from './events/OfflineEvents';
import FactoryMaker from './../core/FactoryMaker';
import Debug from './../core/Debug';
import OfflineStreamProcessor from './OfflineStreamProcessor';
import Constants from './../streaming/constants/Constants';

/**
 * @module  OfflineStream
 * @description Initialize and Manage Offline Stream for each type
 * @param {Object} config - dependences
 */
function OfflineStream(config) {

    config = config || {};
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        manifestId,
        adapter,
        baseURLController,
        dashManifestModel,
        mediaPlayerModel,
        offlineStreamProcessor,
        offlineStreamProcessors,
        startedOfflineStreamProcessors,
        finishedOfflineStreamProcessors,
        errHandler,
        streamInfo,
        availableSegments,
        allMediasInfosList,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();
        Events.extend(OfflineEvents);

        manifestId = config.id;
    }

    /**
     * Reset
     */
    function resetInitialSettings() {
        offlineStreamProcessors = [];
        availableSegments = 0;
        streamInfo = null;
        offlineStreamProcessors = [];
        startedOfflineStreamProcessors = 0;
        finishedOfflineStreamProcessors = 0;
        allMediasInfosList = [];
    }

    function setConfig(config) {
        if (!config) return;

        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

    }

    /**
     * Initialize offlinestream
     * @param {Object} initStreamInfo
     */
    function initialize(initStreamInfo) {
        streamInfo = initStreamInfo;
        getAvailableMedia(streamInfo);
        setAvailableSegments();
        eventBus.on(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, this);
    }

    /**
     * Creates media bitrate list
     * @param {Object} streamInfo
     */
    function getAvailableMedia(streamInfo) {
        let availableMedia = {
            video: [],
            audio: []
        };
        let mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.VIDEO);
        if (mediaInfo.length > 0) {
            mediaInfo.forEach((item) => {
                item.bitrateList.forEach((bitrate) => {
                    availableMedia.video.push({
                        id: bitrate.id,
                        bandwidth: bitrate.bandwidth,
                        width: bitrate.width,
                        height: bitrate.height
                    });
                });
            });
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.AUDIO);
        if (mediaInfo.length > 0) {
            mediaInfo.forEach((item) => {
                item.bitrateList.forEach((bitrate) => {
                    availableMedia.audio.push({
                        id: bitrate.id,
                        bandwidth: bitrate.bandwidth,
                        lang: item.lang
                    });
                });
            });
        }
        /** 1st, we download audio and video.
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.TEXT);
        if (mediaInfo.length > 0) {
            availableMedia.push(mediaInfo);
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.FRAGMENTED_TEXT);
        if (mediaInfo.length > 0) {
            availableMedia.push(mediaInfo);
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.EMBEDDED_TEXT);
        if (mediaInfo.length > 0) {
            availableMedia.push(mediaInfo);
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.MUXED);
        if (mediaInfo.length > 0) {
            availableMedia.push(mediaInfo);
        }
        mediaInfo = adapter.getAllMediaInfoForType(streamInfo, Constants.IMAGE);
        if (mediaInfo.length > 0) {
            availableMedia.push(mediaInfo);
        }
        */

        eventBus.trigger(Events.MEDIA_INFO_LOADED, {
            data: {
                id: manifestId,
                availableMedia: availableMedia
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
        setAvailableSegments();
    }

    /**
     * Initialize media for each type
     * @param {Object} streamInfo
     */
    function initializeMedia(streamInfo) {
        createOfflineStreamProcessorFor(Constants.VIDEO,streamInfo);
        createOfflineStreamProcessorFor(Constants.AUDIO,streamInfo);
        /* 1st, we download audio and video.
        createOfflineStreamProcessorFor(Constants.TEXT,streamInfo);
        createOfflineStreamProcessorFor(Constants.FRAGMENTED_TEXT,streamInfo);
        createOfflineStreamProcessorFor(Constants.EMBEDDED_TEXT,streamInfo);
        createOfflineStreamProcessorFor(Constants.MUXED,streamInfo);
        createOfflineStreamProcessorFor(Constants.IMAGE,streamInfo);
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

        let streamProcessor = OfflineStreamProcessor(context).create();
        streamProcessor.setConfig({
            type: mediaInfo.type,
            mimeType: mediaInfo.mimeType,
            mediaInfo: mediaInfo,
            bitrate: bitrate,
            adapter: adapter,
            dashManifestModel: dashManifestModel,
            baseURLController: baseURLController,
            errHandler: errHandler,
            stream: instance,
            mediaPlayerModel: mediaPlayerModel
        });
        offlineStreamProcessors.push(streamProcessor);
        streamProcessor.initialize();
    }

    function onStreamCompleted() {
        finishedOfflineStreamProcessors++;
        if (finishedOfflineStreamProcessors === offlineStreamProcessors.length) {
            eventBus.trigger(Events.DOWNLOADING_FINISHED, {sender: this, id: manifestId, message: 'Downloading has been successfully completed for this stream !'});
        }
    }

    function onDataUpdateCompleted(e) {
        let sp = e.sender.getStreamProcessor();
        if (sp.getStreamInfo() !== streamInfo) {
            return;
        }

        sp.start();
        checkIfAllOfflineStreamProcessorsStarted();
    }

    function checkIfAllOfflineStreamProcessorsStarted() {
        startedOfflineStreamProcessors++;
        if (startedOfflineStreamProcessors === offlineStreamProcessors.length) {
            eventBus.trigger(Events.DOWNLOADING_STARTED, {sender: this, id: manifestId, message: 'Downloading started for this stream !'});
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
     * Resume offline stream processors
     */
    function resumeOfflineStreamProcessors() {
        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            offlineStreamProcessors[i].resume();
        }
        eventBus.trigger(Events.DOWNLOADING_STARTED, {sender: this, id: manifestId, message: 'Downloading started for this stream !'});
    }

    /**
     * Returns the progression (nbDownloaded/availableSegments)
     * @returns {number} recordProgression
     */
    function getDownloadProgression() {
        let getDownloadedSegments = 0;

        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            getDownloadedSegments = getDownloadedSegments + offlineStreamProcessors[i].getDownloadedSegments();
        }
        return getDownloadedSegments / availableSegments;
    }

    /**
     * Initialize total numbers of segments
     */
    function setAvailableSegments() {
        //TODO compter par taille de segments et non par le nombre
        for (let i = 0; i < offlineStreamProcessors.length; i++) {
            if (offlineStreamProcessors[i].getAvailableSegmentsNumber()) {
                availableSegments = availableSegments +  offlineStreamProcessors[i].getAvailableSegmentsNumber();
            } else {    //format différent
                availableSegments = 0;
            }
        }
    }

    function deactivate() {
        let ln = offlineStreamProcessors ? offlineStreamProcessors.length : 0;
        for (let i = 0; i < ln; i++) {
            let fragmentModel = offlineStreamProcessors[i].getFragmentModel();
            fragmentModel.removeExecutedRequestsBeforeTime(getStartTime() + getDuration());
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

        eventBus.off(Events.DATA_UPDATE_COMPLETED, onDataUpdateCompleted, this);
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        initializeAllMediasInfoList: initializeAllMediasInfoList,
        offlineStreamProcessor: offlineStreamProcessor,
        getStreamInfo: getStreamInfo,
        stopOfflineStreamProcessors: stopOfflineStreamProcessors,
        resumeOfflineStreamProcessors: resumeOfflineStreamProcessors,
        getDownloadProgression: getDownloadProgression,
        setAvailableSegments: setAvailableSegments,
        reset: reset
    };

    setup();
    return instance;
}

OfflineStream.__dashjs_factory_name = 'OfflineStream';
export default FactoryMaker.getClassFactory(OfflineStream);
