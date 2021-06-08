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

import OfflineConstants from '../constants/OfflineConstants';
import OfflineStoreController from './OfflineStoreController';
import OfflineDownload from '../OfflineDownload';
import IndexDBOfflineLoader from '../net/IndexDBOfflineLoader';
import OfflineUrlUtils from '../utils/OfflineUrlUtils';
import OfflineEvents from '../events/OfflineEvents';
import OfflineErrors from '../errors/OfflineErrors';
import OfflineRecord from '../vo/OfflineDownloadVo';

/**
 * @module OfflineController
 * @param {Object} config - dependencies
 * @description Provides access to offline stream recording and playback functionality. This module can be accessed using the MediaPlayer API getOfflineController()
 */
function OfflineController(config) {

    const context = this.context;
    const errHandler = config.errHandler;
    const events = config.events;
    const errors = config.errors;
    const settings = config.settings;
    const eventBus = config.eventBus;
    const debug = config.debug;
    const manifestLoader = config.manifestLoader;
    const manifestModel = config.manifestModel;
    const mediaPlayerModel = config.mediaPlayerModel;
    const abrController = config.abrController;
    const playbackController = config.playbackController;
    const dashMetrics = config.dashMetrics;
    const timelineConverter = config.timelineConverter;
    const segmentBaseController = config.segmentBaseController;
    const adapter = config.adapter;
    const manifestUpdater = config.manifestUpdater;
    const baseURLController = config.baseURLController;
    const schemeLoaderFactory = config.schemeLoaderFactory;
    const constants = config.constants;
    const dashConstants = config.dashConstants;
    const urlUtils = config.urlUtils;

    let instance,
        downloads,
        logger,
        offlineStoreController,
        offlineUrlUtils;

    function setup() {
        logger = debug.getLogger(instance);
        offlineStoreController = OfflineStoreController(context).create({
            eventBus: config.eventBus,
            errHandler: errHandler
        });
        offlineUrlUtils = OfflineUrlUtils(context).getInstance();
        urlUtils.registerUrlRegex(offlineUrlUtils.getRegex(), offlineUrlUtils);
        schemeLoaderFactory.registerLoader(OfflineConstants.OFFLINE_SCHEME, IndexDBOfflineLoader);

        downloads = [];
    }

    /*
    ---------------------------------------------------------------------------
        DOWNLOAD LIST FUNCTIONS
    ---------------------------------------------------------------------------
    */
    function getDownloadFromId(id) {
        let download = downloads.find((item) => {
            return item.getId() === id;
        });
        return download;
    }

    function createDownloadFromId(id) {
        let download;
        download = getDownloadFromId(id);

        if (!download) {
            // create download controller
            download = OfflineDownload(context).create({
                id: id,
                eventBus: eventBus,
                events: events,
                errors: errors,
                settings: settings,
                manifestLoader: manifestLoader,
                manifestModel: manifestModel,
                mediaPlayerModel: mediaPlayerModel,
                manifestUpdater: manifestUpdater,
                baseURLController: baseURLController,
                abrController: abrController,
                playbackController: playbackController,
                adapter: adapter,
                dashMetrics: dashMetrics,
                timelineConverter: timelineConverter,
                errHandler: errHandler,
                segmentBaseController: segmentBaseController,
                offlineStoreController: offlineStoreController,
                debug: debug,
                constants: constants,
                dashConstants: dashConstants,
                urlUtils: urlUtils
            });

            downloads.push(download);
        }

        return download;
    }

    function createDownloadFromStorage(offline) {
        let download = getDownloadFromId(offline.manifestId);

        if (!download) {
            download = createDownloadFromId(offline.manifestId);
            let status = offline.status;
            if (status === OfflineConstants.OFFLINE_STATUS_STARTED) {
                status = OfflineConstants.OFFLINE_STATUS_STOPPED;
            }

            download.setInitialState({
                url: offline.url,
                progress: offline.progress,
                originalUrl: offline.originalURL,
                status: status
            });
        }

        return download;
    }

    function removeDownloadFromId(id) {
        return new Promise(function (resolve, reject) {
            let download = getDownloadFromId(id);
            let waitForStatusChanged = false;
            if (download) {
                //is download running?
                if (download.isDownloading()) {
                    //register status changed event
                    waitForStatusChanged = true;
                    const downloadStopped = function () {
                        eventBus.off(events.OFFLINE_RECORD_STOPPED, downloadStopped, instance);
                        return offlineStoreController.deleteDownloadById(id).then(function () {
                            resolve();
                        }).catch(function (err) {
                            reject(err);
                        });
                    };
                    eventBus.on(events.OFFLINE_RECORD_STOPPED, downloadStopped, instance);
                }
                download.deleteDownload();
                let index = downloads.indexOf(download);
                downloads.splice(index, 1);
            }

            if (!waitForStatusChanged) {
                resolve();
            }
        });
    }

    function generateManifestId() {
        let timestamp = new Date().getTime();
        return timestamp;
    }

    /*
    ---------------------------------------------------------------------------

        OFFLINE CONTROLLER API

    ---------------------------------------------------------------------------
    */

    /**
     * Loads records from storage
     * This methods has to be called first, to be sure that all downloads have been loaded
     *
     * @return {Promise} asynchronously resolved
     * @memberof module:OfflineController
     */
    function loadRecordsFromStorage() {
        return new Promise(function (resolve, reject) {
            offlineStoreController.getAllManifests().then((items) => {
                items.manifests.forEach((offline) => {
                    createDownloadFromStorage(offline);
                });

                resolve();
            }).catch((e) => {
                logger.error('Failed to load downloads ' + e);
                reject(e);
            });
        });
    }

    /**
     * Get all records from storage
     *
     * @return {Promise} asynchronously resolved with records
     * @memberof module:OfflineController
     * @instance
     */
    function getAllRecords() {
        let records = [];
        downloads.forEach((download) => {
            const record = new OfflineRecord();
            record.id = download.getId();
            record.progress = download.getDownloadProgression();
            record.url = download.getOfflineUrl();
            record.originalUrl = download.getManifestUrl();
            record.status = download.getStatus();
            records.push(record);
        });
        return records;
    }

    /**
     * Create a new content record in storage and download manifest from url
     *
     * @param {string} manifestURL - the content manifest url
     * @return {Promise} asynchronously resolved with record identifier
     * @memberof module:OfflineController
     * @instance
     */
    function createRecord(manifestURL) {
        return new Promise(function (resolve, reject) {
            let id = generateManifestId();

            // create download controller
            let download = createDownloadFromId(id);

            download.downloadFromUrl(manifestURL).then(() => {
                download.initDownload();
                resolve(id);
            })
            .catch((e) => {
                logger.error('Failed to download ' + e);
                removeDownloadFromId(id).then(function () {
                    reject(e);
                });
            });
        });
    }

    /**
     * Start downloading the record with selected tracks representations
     *
     * @param {string} id - record identifier
     * @param {MediaInfo[]} mediaInfos - the selected tracks representations
     * @memberof module:OfflineController
     * @instance
     */
    function startRecord(id, mediaInfos) {
        let download = getDownloadFromId(id);
        if (download) {
            download.startDownload(mediaInfos);
        }
    }

    /**
     * Stop downloading of the record
     *
     * @param {string} id - record identifier
     * @memberof module:OfflineController
     * @instance
     */
    function stopRecord(id) {
        let download = getDownloadFromId(id);
        if (download) {
            download.stopDownload();
        }
    }

    /**
     * Resume downloading of the record
     *
     * @param {string} id - record identifier
     * @memberof module:OfflineController
     * @instance
     */
    function resumeRecord(id) {
        let download = getDownloadFromId(id);
        if (download) {
            download.resumeDownload();
        }
    }

    /**
     * Deletes a record from storage
     *
     * @param {string} id - record identifier
     * @memberof module:OfflineController
     * @instance
     */
    function deleteRecord(id) {
        return removeDownloadFromId(id).then(function () {
            return offlineStoreController.deleteDownloadById(id);
        });
    }


    /**
     * Get download progression of a record
     *
     * @param {string} id - record identifier
     * @return {number} percentage progression
     * @memberof module:OfflineController
     * @instance
     */
    function getRecordProgression(id) {
        let download = getDownloadFromId(id);
        if (download) {
            return download.getDownloadProgression();
        }
        return 0;
    }

    /**
     * Reset all records
     * @memberof module:OfflineController
     * @instance
     */
    function resetRecords() {
        downloads.forEach((download) => {
            download.resetDownload();
        });
    }

    /**
     * Reset
     * @instance
     */
    function reset() {
        resetRecords();
        schemeLoaderFactory.unregisterLoader(OfflineConstants.OFFLINE_SCHEME);
    }

    instance = {
        loadRecordsFromStorage: loadRecordsFromStorage,
        createRecord: createRecord,
        startRecord: startRecord,
        stopRecord: stopRecord,
        resumeRecord: resumeRecord,
        deleteRecord: deleteRecord,
        getRecordProgression: getRecordProgression,
        getAllRecords: getAllRecords,
        resetRecords: resetRecords,
        reset: reset
    };

    setup();

    return instance;
}

OfflineController.__dashjs_factory_name = 'OfflineController';
const factory = dashjs.FactoryMaker.getClassFactory(OfflineController); /* jshint ignore:line */
factory.events = OfflineEvents;
factory.errors = OfflineErrors;
dashjs.FactoryMaker.updateClassFactory(OfflineController.__dashjs_factory_name, factory); /* jshint ignore:line */
export default factory;
