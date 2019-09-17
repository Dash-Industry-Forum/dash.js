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
import Debug from './../core/Debug';
import Events from './../core/events/Events';
import FactoryMaker from './../core/FactoryMaker';
import DashHandler from './../dash/DashHandler';
import Constants from './../streaming/constants/Constants';
import OfflineDownloaderRequestRule from './rules/OfflineDownloaderRequestRule';
import FragmentModel from './../streaming/models/FragmentModel';
import FragmentLoader from './../streaming/FragmentLoader';
import RequestModifier from './../streaming/utils/RequestModifier';
import TimelineConverter from './../dash/utils/TimelineConverter';

/**
 * @module  OfflineStreamProcessor
 * @param {object} config configuration
 * @description Arrange downloading for each type
 */
function OfflineStreamProcessor(config) {

    config = config || {};
    let context = this.context;

    let instance,
        manifestId,
        completedCb,
        adapter,
        logger,
        indexHandler,
        type,
        errHandler,
        eventBus,
        mimeType,
        baseURLController,
        fragmentModel,
        mediaPlayerModel,
        mediaInfo,
        bitrate,
        updating,
        currentVoRepresentation,
        offlineDownloaderRequestRule,
        offlineStoreController,
        downloadedSegments,
        isInitialized,
        isStopped,
        stream,
        settings,
        dashMetrics;

    function setConfig(config) {

        if (!config) return;

        if (config.type) {
            type = config.type;
        }

        if (config.stream) {
            stream = config.stream;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.mimeType) {
            mimeType = config.mimeType;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.mediaInfo) {
            mediaInfo = config.mediaInfo;
        }

        if (config.bitrate) {
            bitrate = config.bitrate;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.offlineStoreController) {
            offlineStoreController = config.offlineStoreController;
        }

        if (config.settings) {
            settings = config.settings;
        }

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }
    }

    function setup() {
        manifestId = config.id;
        completedCb = config.completed;

        resetInitialSettings();
        logger = Debug(context).getInstance().getLogger(instance);
        eventBus = EventBus(context).getInstance();
        eventBus.on(Events.STREAM_COMPLETED, onStreamCompleted, instance);
        eventBus.on(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.on(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);

    }


    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) {
            return;
        }

        if (e.request !== null) {
            let fragmentName = e.request.representationId + '_' + e.request.index;
            offlineStoreController.storeFragment(manifestId, fragmentName, e.response);
        }

        downloadedSegments++;

        if (e.error && e.request.serviceLocation && !isStopped) {
            fragmentModel.executeRequest(e.request);
        }

        download();
    }

    function getStreamProcessor() {
        return instance;
    }

    function onStreamCompleted(e) {
        if (e.fragmentModel !== fragmentModel) {
            return;
        }
        logger.info(`[${manifestId}] Stream is complete`);
        stop();
        completedCb();
    }

    /**
     * Stops download of fragments
     * @memberof OfflineStreamProcessor#
     */
    function stop() {
        if (isStopped) {
            return;
        }
        isStopped = true;
    }

    /**
     * Resume download
     * @memberof OfflineStreamProcessor#
     */
    function resume() {
        isStopped = false;
        download();
    }

    /**
     * Initialization
     * @memberof OfflineStreamProcessor#
    */
    function initialize() {
        let requestModifier = RequestModifier(context).getInstance();

        indexHandler = DashHandler(context).create({
            mediaPlayerModel: mediaPlayerModel,
            mimeType: mimeType,
            baseURLController: baseURLController,
            errHandler: errHandler,
            timelineConverter:  TimelineConverter(context).getInstance(),
            settings: settings,
            dashMetrics: dashMetrics
        });
        indexHandler.initialize(instance);

        let fragmentLoader = FragmentLoader(context).create({
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            requestModifier: requestModifier,
            settings: settings,
            dashMetrics: dashMetrics
        });

        fragmentModel = FragmentModel(context).create({
            dashMetrics: dashMetrics,
            fragmentLoader: fragmentLoader
        });

        offlineDownloaderRequestRule = OfflineDownloaderRequestRule(context).create();
        offlineDownloaderRequestRule.initialize(indexHandler, fragmentModel);

        if (adapter.getIsTextTrack(mimeType)) {
            getInitRequest();
        }

        updateData();
    }

    function getIndexHandler() {
        return indexHandler;
    }

    function getFragmentModel() {
        return fragmentModel;
    }

    function updateData() {
        updateRepresentation(mediaInfo);
    }

    /**
     * Execute init request for the represenation
     * @memberof OfflineStreamProcessor#
    */
    function getInitRequest() {
        if (!currentVoRepresentation) {
            return null;
        }

        let initRequest = indexHandler.getInitRequest(currentVoRepresentation);
        return fragmentModel.executeRequest(initRequest);
    }


    /**
     * Start download
     * @memberof OfflineStreamProcessor#
    */
    function start() {
        if (!currentVoRepresentation) {
            throw new Error('Start denied to OfflineStreamProcessor');
        }
        isStopped = false;
        download();
    }

    /**
     * Performs download of fragment according to type
     * @memberof OfflineStreamProcessor#
    */
    function download() {
        if (isStopped) {
            return;
        }

        if (isNaN(currentVoRepresentation)) {
            if (!isInitialized) {
                getInitRequest();
                isInitialized = true;
            } else {
                let request = offlineDownloaderRequestRule.execute(currentVoRepresentation);

                if (request) {
                    logger.info(`[${manifestId}] getNextFragment - request is ${request.url}`);
                    fragmentModel.executeRequest(request);
                }
            }
        }
    }

    /**
     * Update representation
     * @param {Object} mediaInfo - mediaInfo
     * @memberof OfflineStreamProcessor#
     */
    function updateRepresentation(mediaInfo) {
        updating = true;

        let voRepresentations = adapter.getVoRepresentations(mediaInfo);

        // get representation VO according to id.
        let rep = voRepresentations.find((representation) => {
            return representation.id === bitrate.id;
        });

        if (type !== Constants.VIDEO && type !== Constants.AUDIO  && type !== Constants.TEXT && type !== Constants.FRAGMENTED_TEXT) {
            updating = false;
            return;
        }

        indexHandler.updateRepresentation(rep, true, true);
    }

    function onRepresentationUpdated(e) {
        if (e.sender.getStreamProcessor() !== instance || !isUpdating()) return;

        currentVoRepresentation = e.representation;
        eventBus.trigger(Events.DATA_UPDATE_COMPLETED, {sender: instance, currentRepresentation: currentVoRepresentation});
    }

    function getRepresentation() {
        return currentVoRepresentation;
    }

    function getCurrentRepresentationInfo() {
        return currentVoRepresentation ? adapter.convertDataToRepresentationInfo(currentVoRepresentation) : null;
    }

    function getStreamInfo() {
        return stream ? stream.getStreamInfo() : null;
    }

    function isUpdating() {
        return updating;
    }

    function getType() {
        return type;
    }

    function getMediaInfo() {
        return mediaInfo;
    }

    function getAvailableSegmentsNumber() {
        return getRepresentation().availableSegmentsNumber;
    }

    function getDownloadedSegments() {
        return downloadedSegments;
    }

    function resetInitialSettings() {
        isInitialized = false;
        downloadedSegments = 0;
        mimeType = null;
        mediaInfo = null;
        bitrate = null;
        updating = false;
        currentVoRepresentation = NaN;
        downloadedSegments = null;
        type = null;
        stream = null;
    }

    /**
     * Reset
     * @memberof OfflineStreamProcessor#
    */
    function reset() {
        resetInitialSettings();
        indexHandler.reset();

        eventBus.off(Events.STREAM_COMPLETED, onStreamCompleted, instance);
        eventBus.off(Events.REPRESENTATION_UPDATED, onRepresentationUpdated, instance);
        eventBus.off(Events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getIndexHandler: getIndexHandler,
        getCurrentRepresentationInfo: getCurrentRepresentationInfo,
        getFragmentModel: getFragmentModel,
        getStreamInfo: getStreamInfo,
        getMediaInfo: getMediaInfo,
        getType: getType,
        isUpdating: isUpdating,
        getRepresentation: getRepresentation,
        getStreamProcessor: getStreamProcessor,
        start: start,
        stop: stop,
        resume: resume,
        getAvailableSegmentsNumber: getAvailableSegmentsNumber,
        getDownloadedSegments: getDownloadedSegments,
        reset: reset
    };

    setup();

    return instance;
}
OfflineStreamProcessor.__dashjs_factory_name = 'OfflineStreamProcessor';
const factory = FactoryMaker.getClassFactory(OfflineStreamProcessor);
export default factory;
