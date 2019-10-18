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
import DashHandler from './../dash/DashHandler';
import RepresentationController from './../dash/controllers/RepresentationController';
import OfflineDownloaderRequestRule from './rules/OfflineDownloaderRequestRule';
import FragmentModel from './../streaming/models/FragmentModel';
import FragmentLoader from './../streaming/FragmentLoader';

/**
 * @module  OfflineStreamProcessor
 * @param {object} config configuration
 * @description Arrange downloading for each type
 */
function OfflineStreamProcessor(config) {
    const context = this.context;

    config = config || {};
    const eventBus = config.eventBus;
    const events = config.events;
    const debug = config.debug;
    const timelineConverter = config.timelineConverter;
    const constants = config.constants;
    const dashConstants = config.dashConstants;
    const requestModifier = config.requestModifier;
    const manifestId = config.id;
    const completedCb = config.completed;
    const urlUtils = config.urlUtils;
    const abrController = config.abrController;
    const playbackController = config.playbackController;

    let instance,
        adapter,
        logger,
        indexHandler,
        representationController,
        type,
        errHandler,
        mimeType,
        baseURLController,
        fragmentModel,
        mediaPlayerModel,
        mediaInfo,
        bitrate,
        updating,
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
        resetInitialSettings();
        logger = debug.getLogger(instance);
        eventBus.on(events.STREAM_COMPLETED, onStreamCompleted, instance);
        eventBus.on(events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
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
        indexHandler = DashHandler(context).create({
            type: type,
            mediaPlayerModel: mediaPlayerModel,
            mimeType: mimeType,
            baseURLController: baseURLController,
            errHandler: errHandler,
            timelineConverter: timelineConverter,
            settings: settings,
            dashMetrics: dashMetrics,
            eventBus: eventBus,
            events: events,
            debug: debug,
            dashConstants: dashConstants,
            urlUtils: urlUtils,
            streamInfo: getStreamInfo()
        });

        representationController = RepresentationController(context).create({
            abrController: abrController,
            dashMetrics: dashMetrics,
            playbackController: playbackController,
            timelineConverter: timelineConverter,
            type: type,
            eventBus: eventBus,
            events: events,
            streamId: getStreamInfo() ? getStreamInfo().id : null
        });

        let fragmentLoader = FragmentLoader(context).create({
            mediaPlayerModel: mediaPlayerModel,
            errHandler: errHandler,
            requestModifier: requestModifier,
            settings: settings,
            dashMetrics: dashMetrics,
            eventBus: eventBus,
            events: events,
            dashConstants: dashConstants,
            urlUtils: urlUtils
        });

        fragmentModel = FragmentModel(context).create({
            dashMetrics: dashMetrics,
            fragmentLoader: fragmentLoader,
            eventBus: eventBus,
            events: events,
            debug: debug
        });

        indexHandler.initialize(false);

        offlineDownloaderRequestRule = OfflineDownloaderRequestRule(context).create();
        offlineDownloaderRequestRule.initialize(indexHandler, fragmentModel);

        if (adapter.getIsTextTrack(mimeType)) {
            getInitRequest();
        }

        updateRepresentation(mediaInfo);
    }

    function removeExecutedRequestsBeforeTime(time) {
        if (fragmentModel) {
            fragmentModel.removeExecutedRequestsBeforeTime(time);
        }
    }

    /**
     * Execute init request for the represenation
     * @memberof OfflineStreamProcessor#
    */
    function getInitRequest() {
        if (!representationController.getCurrentRepresentation()) {
            return null;
        }

        let initRequest = indexHandler.getInitRequest(getMediaInfo(), representationController.getCurrentRepresentation());
        return fragmentModel.executeRequest(initRequest);
    }

    /**
     * Start download
     * @memberof OfflineStreamProcessor#
    */
    function start() {
        if (!representationController.getCurrentRepresentation()) {
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

        if (isNaN(representationController.getCurrentRepresentation())) {
            if (!isInitialized) {
                getInitRequest();
                isInitialized = true;
            } else {
                let request = offlineDownloaderRequestRule.execute(getMediaInfo(), representationController.getCurrentRepresentation());

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
        let quality = voRepresentations.findIndex((representation) => {
            return representation.id === bitrate.id;
        });

        if (type !== constants.VIDEO && type !== constants.AUDIO  && type !== constants.TEXT && type !== constants.FRAGMENTED_TEXT) {
            updating = false;
            return;
        }

        representationController.updateData(null, voRepresentations, type, quality);
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
        return representationController.getCurrentRepresentation().availableSegmentsNumber;
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

        eventBus.off(events.STREAM_COMPLETED, onStreamCompleted, instance);
        eventBus.off(events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    instance = {
        initialize: initialize,
        setConfig: setConfig,
        getStreamInfo: getStreamInfo,
        getMediaInfo: getMediaInfo,
        removeExecutedRequestsBeforeTime: removeExecutedRequestsBeforeTime,
        getType: getType,
        isUpdating: isUpdating,
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
const factory = dashjs.FactoryMaker.getClassFactory(OfflineStreamProcessor); /* jshint ignore:line */
export default factory;
