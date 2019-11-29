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
import OfflineConstants from './constants/OfflineConstants';
import OfflineStream from './OfflineStream';
import OfflineIndexDBManifestParser from './utils/OfflineIndexDBManifestParser';
import OfflineErrors from './errors/OfflineErrors';

/**
 * @class OfflineDownload
 */
function OfflineDownload(config) {
    config = config || {};

    const manifestLoader = config.manifestLoader;
    const adapter = config.adapter;
    const offlineStoreController = config.offlineStoreController;
    const manifestId = config.id;
    const eventBus = config.eventBus;
    const errHandler = config.errHandler;
    const events = config.events;
    const debug = config.debug;
    const manifestUpdater = config.manifestUpdater;
    const baseURLController = config.baseURLController;
    const constants = config.constants;
    const dashConstants = config.dashConstants;
    const urlUtils = config.urlUtils;

    const context = this.context;

    let instance,
        manifestURL,
        XMLManifest,
        streams,
        manifest,
        isDownloadingStatus,
        logger,
        isComposed,
        representationsToUpdate,
        indexDBManifestParser;


    function setup() {
        logger = debug.getLogger(instance);
        manifestUpdater.initialize();
        streams = [];
        isDownloadingStatus = false;
        isComposed = false;
    }

    function getId() {
        return manifestId;
    }

    /**
     * Download a stream, from url of manifest
     * @param {string} url
     * @instance
     */
    function downloadFromUrl(url) {
        manifestURL = url;
        setupOfflineEvents();
        let offlineManifest = {
            'fragmentStore': manifestId,
            'status': OfflineConstants.OFFLINE_STATUS_CREATED,
            'manifestId': manifestId,
            'url': OfflineConstants.OFFLINE_SCHEME + '://' + manifestId,
            'originalURL': url
        };
        return createOfflineManifest(offlineManifest);
    }

    function initDownload() {
        manifestLoader.load(manifestURL);
        isDownloadingStatus = true;
    }

    function setupOfflineEvents() {
        eventBus.on(events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.on(events.ORIGINAL_MANIFEST_LOADED, onOriginalManifestLoaded, instance);
        setupIndexedDBEvents();
    }

    function setupIndexedDBEvents() {
        eventBus.on(events.ERROR, onError, instance);
    }

    function isDownloading() {
        return isDownloadingStatus;
    }

    function onManifestUpdated(e) {
        if (isComposed) {
            return;
        }
        if (!e.error) {
            try {
                manifest = e.manifest;
            } catch (err) {
                errHandler.error({
                    code: OfflineErrors.OFFLINE_ERROR,
                    message: err.message,
                    data: {
                        id: manifestId,
                        status: OfflineConstants.OFFLINE_STATUS_ERROR
                    }
                });
            }
        }
    }

    function onDownloadingStarted(e) {
        if (e.id !== manifestId) {
            return;
        }
        if (!e.error && manifestId !== null) {
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_STARTED).then(function () {
                eventBus.trigger(events.DOWNLOADING_STARTED, {id: manifestId, message: 'Downloading started for this stream !'});
            });
        } else {
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: 'Cannot start download ',
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR,
                    error: e.error
                }
            });
        }
    }

    function onDownloadingFinished(e) {
        if (e.id !== manifestId) {
            return;
        }
        if (!e.error && manifestId !== null) {
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_FINISHED).then(function () {
                if (representationsToUpdate.length > 0) {
                    indexDBManifestParser.parse(XMLManifest, representationsToUpdate).then(function (parsedManifest) {
                        if (parsedManifest !== null && manifestId !== null) {
                            let offlineManifest = {
                                'fragmentStore': manifestId,
                                'status': OfflineConstants.OFFLINE_STATUS_FINISHED,
                                'manifestId': manifestId,
                                'url': OfflineConstants.OFFLINE_SCHEME + '://' + manifestId,
                                'originalURL': manifest.url,
                                'manifest': parsedManifest
                            };
                            updateOfflineManifest(offlineManifest).then( function () {
                                eventBus.trigger(events.DOWNLOADING_FINISHED, {id: manifestId, message: 'Downloading has been successfully completed for this stream !'});
                                resetDownload();
                            });
                        } else {
                            throw 'falling parsing offline manifest';
                        }
                    }).catch(function (err) {
                        throw err;
                    });
                } else {
                    eventBus.trigger(events.DOWNLOADING_FINISHED, {id: manifestId, message: 'Downloading has been successfully completed for this stream !'});
                    resetDownload();
                }
            });
        } else {
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: 'Error finishing download ',
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR,
                    error: e.error
                }
            });
        }
    }

    function onManifestUpdateNeeded(e) {
        if (e.id !== manifestId) {
            return;
        }

        representationsToUpdate = e.representations;
    }

    function composeStreams() {
        try {
            adapter.updatePeriods(manifest);
            baseURLController.initialize(manifest);
            const streamsInfo = adapter.getStreamsInfo();
            if (streamsInfo.length === 0) {
                errHandler.error({
                    code: OfflineErrors.OFFLINE_ERROR,
                    message: 'Cannot download - no streams',
                    data: {
                        id: manifestId,
                        status: OfflineConstants.OFFLINE_STATUS_ERROR
                    }
                });
            }
            for (let i = 0, ln = streamsInfo.length; i < ln; i++) {
                const streamInfo = streamsInfo[i];
                let stream = OfflineStream(context).create({
                    id: manifestId,
                    started: onDownloadingStarted,
                    finished: onDownloadingFinished,
                    updateManifestNeeded: onManifestUpdateNeeded,
                    constants: constants,
                    eventBus: eventBus,
                    events: events,
                    debug: debug,
                    adapter: adapter,
                    offlineStoreController: offlineStoreController
                });
                streams.push(stream);

                // initialise stream and get downloadable representations
                stream.initialize(streamInfo);
            }
            isComposed = true;
        } catch (e) {
            logger.info(e);
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: e.message,
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR,
                    error: e.error
                }
            });
        }
    }

    function getDownloadableRepresentations() {
        streams.forEach(stream => {
            stream.getDownloadableRepresentations();
        });
    }

    /**
     * Init databsse to store fragments
     * @param {number} manifestId
     * @instance
     */
    function createFragmentStore(manifestId) {
        return offlineStoreController.createFragmentStore(manifestId);
    }

    /**
     * Store in database the string representation of offline manifest (with only downloaded representations)
     * @param {object} offlineManifest
     * @instance
     */
    function createOfflineManifest(offlineManifest) {
        return offlineStoreController.createOfflineManifest(offlineManifest);
    }

    /**
     * Store in database the string representation of offline manifest (with only downloaded representations)
     * @param {object} offlineManifest
     * @instance
     */
    function updateOfflineManifest(offlineManifest) {
        return offlineStoreController.updateOfflineManifest(offlineManifest);
    }

    /**
     * Triggered when manifest is loaded from internet.
     * @param {Object[]} e
     */
    function onOriginalManifestLoaded(e) {
        // unregister form event
        eventBus.off(events.ORIGINAL_MANIFEST_LOADED, onOriginalManifestLoaded, instance);

        XMLManifest = e.originalManifest;

        if (manifest.type === dashConstants.DYNAMIC) {
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: 'Cannot handle DYNAMIC manifest',
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR
                }
            });
            logger.error('Cannot handle DYNAMIC manifest');

            return;
        }

        if (manifest.Period_asArray.length > 1) {
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: 'MultiPeriod manifest are not yet supported',
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR
                }
            });
            logger.error('MultiPeriod manifest are not yet supported');

            return;
        }

        // initialise offline streams
        composeStreams(manifest);

        // get downloadable representations
        getDownloadableRepresentations();

        eventBus.trigger(events.STREAMS_COMPOSED);
    }

    function initializeAllMediasInfoList(selectedRepresentations) {
        for (let i = 0; i < streams.length; i++) {
            streams[i].initializeAllMediasInfoList(selectedRepresentations);
        }
    }

    function formatSelectedRepresentations(selectedRepresentations) {
        let ret = {
        };

        ret[constants.VIDEO] = [];
        ret[constants.AUDIO] = [];
        ret[constants.TEXT] = [];
        ret[constants.FRAGMENTED_TEXT] = [];
        selectedRepresentations.video.forEach(item => {
            ret[constants.VIDEO].push(item.id);
        });
        selectedRepresentations.audio.forEach(item => {
            ret[constants.AUDIO].push(item.id);
        });
        selectedRepresentations.text.forEach(item => {
            ret[item.type].push(item.id);
        });

        return ret;
    }

    function startDownload(selectedRepresentations) {
        try {
            let rep = formatSelectedRepresentations(selectedRepresentations);
            createFragmentStore(manifestId);
            generateOfflineManifest(XMLManifest, rep, manifestId).then(function () {
                initializeAllMediasInfoList(rep);
            });
        } catch (err) {
            errHandler.error({
                code: OfflineErrors.OFFLINE_ERROR,
                message: err.message,
                data: {
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_ERROR
                }
            });
        }
    }

    /**
     * Create the parser used to convert original manifest in offline manifest
     * Creates a JSON object that will be stored in database
     * @param {string} XMLManifest
     * @param {Object[]} selectedRepresentations
     * @param {number} manifestId
     * @instance
     */
    function generateOfflineManifest(XMLManifest, selectedRepresentations, manifestId) {
        indexDBManifestParser = OfflineIndexDBManifestParser(context).create({
            manifestId: manifestId,
            allMediaInfos: selectedRepresentations,
            debug: debug,
            dashConstants: dashConstants,
            constants: constants,
            urlUtils: urlUtils
        });

        return indexDBManifestParser.parse(XMLManifest).then(function (parsedManifest) {
            if (parsedManifest !== null && manifestId !== null) {
                let offlineManifest = {
                    'fragmentStore': manifestId,
                    'status': OfflineConstants.OFFLINE_STATUS_CREATED,
                    'manifestId': manifestId,
                    'url': OfflineConstants.OFFLINE_SCHEME + '://' + manifestId,
                    'originalURL': manifest.url,
                    'manifest': parsedManifest
                };
                return updateOfflineManifest(offlineManifest);
            } else {
                return Promise.reject('falling parsing offline manifest');
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Stops downloading of fragments
     * @instance
     */
    function stopDownload() {
        if (manifestId !== null && isDownloading()) {
            for (let i = 0, ln = streams.length; i < ln; i++) {
                streams[i].stopOfflineStreamProcessors();
            }
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_STOPPED).then(function () {
                eventBus.trigger(events.DOWNLOADING_STOPPED, {
                    sender: this,
                    id: manifestId,
                    status: OfflineConstants.OFFLINE_STATUS_STOPPED,
                    message: 'Downloading has been stopped for this stream !'
                });
                isDownloadingStatus = false;
            });
        }
    }

    /**
     * Delete an offline manifest (and all of its data)
     * @instance
     */
    function deleteDownload() {
        stopDownload();
    }

    /**
     * Resume download of a stream
     * @instance
     */
    function resumeDownload() {
        if (isDownloading()) {
            for (let i = 0, ln = streams.length; i < ln; i++) {
                streams[i].resumeOfflineStreamProcessors();
            }
        }
    }

    /**
     * Compute the progression of download
     * @instance
     */
    function getDownloadProgression() {
        let globalProgression = 0;
        for (let i = 0, ln = streams.length; i < ln; i++) {
            globalProgression = +streams[i].getDownloadProgression();
        }
        return Math.round(globalProgression * 100);
    }

    /**
     * Reset events listeners
     * @instance
     */
    function resetDownload() {
        for (let i = 0, ln = streams.length; i < ln; i++) {
            streams[i].reset();
        }
        indexDBManifestParser = null;
        isDownloadingStatus = false;
        streams = [];
        eventBus.off(events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.off(events.ORIGINAL_MANIFEST_LOADED, onOriginalManifestLoaded, instance);
        resetIndexedDBEvents();
    }

    function onError(e) {
        if ( e.error.code === OfflineErrors.INDEXEDDB_QUOTA_EXCEED_ERROR ||
             e.error.code === OfflineErrors.INDEXEDDB_INVALID_STATE_ERROR ) {
            stopDownload();
        }
    }

    function resetIndexedDBEvents() {
        eventBus.on(events.ERROR, onError, instance);
    }

    /**
     * Reset
     * @instance
     */
    function reset() {
        if (isDownloading()) {
            resetDownload();
        }
        baseURLController.reset();
        manifestUpdater.reset();
    }

    instance = {
        reset: reset,
        getId: getId,
        initDownload: initDownload,
        downloadFromUrl: downloadFromUrl,
        startDownload: startDownload,
        stopDownload: stopDownload,
        resumeDownload: resumeDownload,
        deleteDownload: deleteDownload,
        getDownloadProgression: getDownloadProgression,
        isDownloading: isDownloading,
        resetDownload: resetDownload
    };

    setup();

    return instance;
}

OfflineDownload.__dashjs_factory_name = 'OfflineDownload';
export default dashjs.FactoryMaker.getClassFactory(OfflineDownload); /* jshint ignore:line */
