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
import DashHandler from '../dash/DashHandler';
import RepresentationController from '../dash/controllers/RepresentationController';
import FragmentModel from '../streaming/models/FragmentModel';
import FragmentLoader from '../streaming/FragmentLoader';
import URLUtils from '../streaming/utils/URLUtils';
import RequestModifier from '../streaming/utils/RequestModifier';
import SegmentsController from '../dash/controllers/SegmentsController';

function OfflineStreamProcessor(config) {

    config = config || {};
    const context = this.context;
    const eventBus = config.eventBus;
    const events = config.events;
    const errors = config.errors;
    const debug = config.debug;
    const constants = config.constants;
    const settings = config.settings;
    const dashConstants = config.dashConstants;
    const manifestId = config.id;
    const type = config.type;
    const streamInfo = config.streamInfo;
    const errHandler = config.errHandler;
    const mediaPlayerModel = config.mediaPlayerModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const adapter = config.adapter;
    const dashMetrics = config.dashMetrics;
    const baseURLController = config.baseURLController;
    const timelineConverter = config.timelineConverter;
    const bitrate = config.bitrate;
    const offlineStoreController = config.offlineStoreController;
    const completedCb = config.callbacks && config.callbacks.completed;
    const progressCb = config.callbacks && config.callbacks.progression;

    let instance,
        logger,
        mediaInfo,
        indexHandler,
        representationController,
        fragmentModel,
        updating,
        downloadedSegments,
        isInitialized,
        segmentsController,
        isStopped;

    function setup() {
        resetInitialSettings();
        logger = debug.getLogger(instance);

        segmentsController = SegmentsController(context).create({
            events,
            eventBus,
            streamInfo,
            timelineConverter,
            dashConstants,
            segmentBaseController: config.segmentBaseController,
            type
        });

        indexHandler = DashHandler(context).create({
            streamInfo: streamInfo,
            type: type,
            timelineConverter: timelineConverter,
            dashMetrics: dashMetrics,
            mediaPlayerModel: mediaPlayerModel,
            baseURLController: baseURLController,
            errHandler: errHandler,
            settings: settings,
            // boxParser: boxParser,
            eventBus: eventBus,
            events: events,
            debug: debug,
            requestModifier: RequestModifier(context).getInstance(),
            dashConstants: dashConstants,
            constants: constants,
            segmentsController: segmentsController,
            urlUtils: URLUtils(context).getInstance()
        });

        representationController = RepresentationController(context).create({
            streamInfo: streamInfo,
            type: type,
            abrController: abrController,
            dashMetrics: dashMetrics,
            playbackController: playbackController,
            timelineConverter: timelineConverter,
            dashConstants: dashConstants,
            events: events,
            eventBus: eventBus,
            errors: errors,
            segmentsController: segmentsController
        });

        fragmentModel = FragmentModel(context).create({
            streamInfo: streamInfo,
            dashMetrics: dashMetrics,
            fragmentLoader: FragmentLoader(context).create({
                dashMetrics: dashMetrics,
                mediaPlayerModel: mediaPlayerModel,
                errHandler: errHandler,
                requestModifier: RequestModifier(context).getInstance(),
                settings: settings,
                eventBus: eventBus,
                events: events,
                errors: errors,
                constants: constants,
                dashConstants: dashConstants,
                urlUtils: URLUtils(context).getInstance()
            }),
            debug: debug,
            eventBus: eventBus,
            events: events
        });

        eventBus.on(events.STREAM_REQUESTING_COMPLETED, onStreamRequestingCompleted, instance);
        eventBus.on(events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    function initialize(_mediaInfo) {
        mediaInfo = _mediaInfo;
        indexHandler.initialize(false);
        updateRepresentation(mediaInfo);
    }

    function isInitRequest(request) {
        return request.type === 'InitializationSegment';
    }

    function onFragmentLoadingCompleted(e) {
        if (e.sender !== fragmentModel) {
            return;
        }

        if (e.request !== null) {
            let isInit = isInitRequest(e.request);
            let suffix = isInit ? 'init' : e.request.index;
            let fragmentName = e.request.representationId + '_' + suffix;
            offlineStoreController.storeFragment(manifestId, fragmentName, e.response)
            .then(() => {
                if (!isInit) {
                    // store current index and downloadedSegments number
                    offlineStoreController.setRepresentationCurrentState(manifestId, e.request.representationId, {
                        index: e.request.index,
                        downloaded: downloadedSegments
                    } );
                }
            });
        }

        if (e.error && e.request.serviceLocation && !isStopped) {
            fragmentModel.executeRequest(e.request);
        } else {
            downloadedSegments++;
            download();
        }
    }

    function onStreamRequestingCompleted(e) {
        if (e.fragmentModel !== fragmentModel) {
            return;
        }
        logger.info(`[${manifestId}] Stream is complete`);
        stop();
        completedCb();
    }

    function getRepresentationController () {
        return representationController;
    }

    function getRepresentationId() {
        return representationController.getCurrentRepresentation().id;
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

        return indexHandler.getInitRequest(getMediaInfo(), representationController.getCurrentRepresentation());
    }

    /**
     * Get next request
     * @memberof OfflineStreamProcessor#
    */
    function getNextRequest() {
        return indexHandler.getNextSegmentRequest(getMediaInfo(), representationController.getCurrentRepresentation());
    }

    /**
     * Start download
     * @memberof OfflineStreamProcessor#
    */
    function start() {
        if (representationController) {
            if (!representationController.getCurrentRepresentation()) {
                throw new Error('Start denied to OfflineStreamProcessor');
            }
            isStopped = false;

            offlineStoreController.getRepresentationCurrentState(manifestId, representationController.getCurrentRepresentation().id)
            .then((state) => {
                if (state) {
                    indexHandler.setCurrentIndex(state.index);
                    downloadedSegments = state.downloaded;
                }
                download();
            }).catch(() => {
                // start from beginining
                download();
            });
        }
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
            let request = null;
            if (!isInitialized) {
                request = getInitRequest();
                isInitialized = true;
            } else {
                request = getNextRequest();

                // update progression : done here because availableSegmentsNumber is done in getNextRequest from dash handler
                updateProgression();
            }

            if (request) {
                logger.info(`[${manifestId}] download request : ${request.url}`);
                fragmentModel.executeRequest(request);
            } else {
                logger.info(`[${manifestId}] no request to be downloaded`);
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

        if (type !== constants.VIDEO && type !== constants.AUDIO  && type !== constants.TEXT) {
            updating = false;
            return;
        }

        representationController.updateData(null, voRepresentations, type, mediaInfo.isFragmented, quality);
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
        return representationController.getCurrentRepresentation().numberOfSegments + 1; // do not forget init segment
    }

    function updateProgression () {
        if (progressCb) {
            progressCb(instance, downloadedSegments, getAvailableSegmentsNumber());
        }
    }

    function resetInitialSettings() {
        isInitialized = false;
        downloadedSegments = 0;
        updating = false;
    }

    /**
     * Reset
     * @memberof OfflineStreamProcessor#
    */
    function reset() {
        resetInitialSettings();
        indexHandler.reset();

        eventBus.off(events.STREAM_REQUESTING_COMPLETED, onStreamRequestingCompleted, instance);
        eventBus.off(events.FRAGMENT_LOADING_COMPLETED, onFragmentLoadingCompleted, instance);
    }

    instance = {
        initialize: initialize,
        getMediaInfo: getMediaInfo,
        getRepresentationController: getRepresentationController,
        removeExecutedRequestsBeforeTime: removeExecutedRequestsBeforeTime,
        getType: getType,
        getRepresentationId: getRepresentationId,
        isUpdating: isUpdating,
        start: start,
        stop: stop,
        getAvailableSegmentsNumber: getAvailableSegmentsNumber,
        reset: reset
    };

    setup();

    return instance;
}
OfflineStreamProcessor.__dashjs_factory_name = 'OfflineStreamProcessor';
const factory = dashjs.FactoryMaker.getClassFactory(OfflineStreamProcessor); /* jshint ignore:line */
export default factory;
