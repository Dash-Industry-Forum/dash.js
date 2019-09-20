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

/**
 * @class OfflineDownload
 */
function OfflineDownload(config) {
    config = config || {};

    const manifestLoader = config.manifestLoader;
    const mediaPlayerModel = config.mediaPlayerModel;
    const adapter = config.adapter;
    const errHandler = config.errHandler;
    const offlineStoreController = config.offlineStoreController;
    const settings = config.settings;
    const dashMetrics = config.dashMetrics;
    const manifestId = config.id;
    const eventBus = config.eventBus;
    const events = config.events;
    const debug = config.debug;
    const manifestUpdater = config.manifestUpdater;
    const baseURLController = config.baseURLController;
    const constants = config.constants;
    const timelineConverter = config.timelineConverter;
    const requestModifier = config.requestModifier;

    const context = this.context;

    let instance,
        XMLManifest,
        streams,
        manifest,
        isDownloadingStatus,
        logger,
        isComposed;


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
        setupOfflineEvents();
        manifestLoader.load(url);
        isDownloadingStatus = true;

        let offlineManifest = {
            'fragmentStore': manifestId,
            'status': OfflineConstants.OFFLINE_STATUS_CREATED,
            'manifestId': manifestId,
            'url': OfflineConstants.OFFLINE_SCHEME + '://' + manifestId,
            'originalURL': url
        };
        return createOfflineManifest(offlineManifest);
    }

    function setupOfflineEvents() {
        eventBus.on(events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.on(events.ORIGINAL_MANIFEST_LOADED, onOriginalManifestLoaded, instance);
        setupIndexedDBEvents();
    }

    function setupIndexedDBEvents() {
        eventBus.on(events.INDEXEDDB_QUOTA_EXCEED_ERROR, stopDownload, instance);
        eventBus.on(events.INDEXEDDB_INVALID_STATE_ERROR, stopDownload, instance);
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

                // initialise offline streams
                composeStreams(manifest);

                // get downloadable representations
                getDownloadableRepresentations();

                eventBus.trigger(events.STREAMS_COMPOSED);
            } catch (err) {
                throw new Error(err);
            }
        }
    }

    function onDownloadingStarted(e) {
        if (e.id !== manifestId) {
            return;
        }
        if (!e.error && manifestId !== null) {
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_STARTED);
            eventBus.trigger(events.DOWNLOADING_STARTED, {id: manifestId, message: 'Downloading started for this stream !'});
        } else {
            throw e.error;
        }
    }

    function onDownloadingFinished(e) {
        if (e.id !== manifestId) {
            return;
        }
        if (!e.error && manifestId !== null) {
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_FINISHED);
            eventBus.trigger(events.DOWNLOADING_FINISHED, {id: manifestId, message: 'Downloading has been successfully completed for this stream !'});
        } else {
            throw e.error;
        }
        resetDownload();
    }

    function composeStreams() {
        try {
            adapter.updatePeriods(manifest);
            baseURLController.initialize(manifest);
            const streamsInfo = adapter.getStreamsInfo();
            if (streamsInfo.length === 0) {
                throw new Error('There are no streams');
            }
            for (let i = 0, ln = streamsInfo.length; i < ln; i++) {
                const streamInfo = streamsInfo[i];
                let stream = OfflineStream(context).create({
                    id: manifestId,
                    started: onDownloadingStarted,
                    finished: onDownloadingFinished,
                    constants: constants,
                    eventBus: eventBus,
                    events: events,
                    debug: debug,
                    timelineConverter: timelineConverter,
                    requestModifier: requestModifier,
                    adapter: adapter,
                    errHandler: errHandler,
                    baseURLController: baseURLController,
                    mediaPlayerModel: mediaPlayerModel,
                    offlineStoreController: offlineStoreController,
                    settings: settings,
                    dashMetrics: dashMetrics
                });
                streams.push(stream);

                // initialise stream and get downloadable representations
                stream.initialize(streamInfo);
            }
            isComposed = true;
        } catch (e) {
            logger.info(e);
            throw e.error;
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
        XMLManifest = e.originalManifest;
    }

    function initializeAllMediasInfoList(selectedRepresentations) {
        for (let i = 0; i < streams.length; i++) {
            streams[i].initializeAllMediasInfoList(selectedRepresentations);
        }
    }

    function startDownload(selectedRepresentations) {
        try {
            createFragmentStore(manifestId);
            generateOfflineManifest(XMLManifest, selectedRepresentations, manifestId).then(function () {
                initializeAllMediasInfoList(selectedRepresentations);
            });
        } catch (err) {
            throw new Error(err);
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
        let parser = OfflineIndexDBManifestParser(context).create({
            manifestId: manifestId,
            allMediaInfos: selectedRepresentations,
            debug: debug
        });

        return parser.parse(XMLManifest).then(function (parsedManifest) {
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
        if (manifestId !== null && isDownloading) {
            for (let i = 0, ln = streams.length; i < ln; i++) {
                streams[i].stopOfflineStreamProcessors();
            }
            offlineStoreController.setDownloadingStatus(manifestId, OfflineConstants.OFFLINE_STATUS_STOPPED);
            eventBus.trigger(events.DOWNLOADING_STOPPED, {
                sender: this,
                id: manifestId,
                status: OfflineConstants.OFFLINE_STATUS_STOPPED,
                message: 'Downloading has been stopped for this stream !'
            });
        }
    }

    /**
     * Delete an offline manifest (and all of its data)
     * @instance
     */
    function deleteDownload() {
        if (streams.length >= 1) {
            stopDownload();
            isDownloadingStatus = false;
        }
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
        isDownloadingStatus = false;
        streams = [];
        eventBus.off(events.MANIFEST_UPDATED, onManifestUpdated, instance);
        eventBus.off(events.ORIGINAL_MANIFEST_LOADED, onOriginalManifestLoaded, instance);
        resetOfflineEvents();
    }

    function resetOfflineEvents() {
        resetIndexedDBEvents();
    }

    function resetIndexedDBEvents() {
        eventBus.off(events.INDEXEDDB_QUOTA_EXCEED_ERROR, stopDownload, instance);
        eventBus.off(events.INDEXEDDB_INVALID_STATE_ERROR, stopDownload, instance);
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
