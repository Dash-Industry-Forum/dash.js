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
import DOMExceptionsEvents from '../events/DOMExceptionsEvents';

/**
 * @class OfflineController
 */
function OfflineController() {

    const context = this.context;

    let instance,
        downloads,
        adapter,
        schemeLoaderFactory,
        debug,
        logger,
        manifestLoader,
        manifestModel,
        manifestUpdater,
        baseURLController,
        offlineStoreController,
        urlUtils,
        offlineUrlUtils,
        events,
        eventBus,
        constants,
        dashConstants,
        errHandler;

    function setup() {
        offlineUrlUtils = OfflineUrlUtils(context).getInstance();

        downloads = [];
    }

    function setConfig(config) {
        if (!config) return;

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.events && config.eventBus) {
            events = config.events;
            eventBus = config.eventBus;
            offlineStoreController = OfflineStoreController(context).create({events: config.events, eventBus: config.eventBus, errHandler: errHandler});
        }

        if (config.debug) {
            debug = config.debug;
            logger = debug.getLogger(instance);
        }

        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.manifestUpdater) {
            manifestUpdater = config.manifestUpdater;
        }

        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.schemeLoaderFactory) {
            schemeLoaderFactory = config.schemeLoaderFactory;
        }

        if (config.constants) {
            constants = config.constants;
        }

        if (config.dashConstants) {
            dashConstants = config.dashConstants;
        }

        if (config.urlUtils) {
            urlUtils = config.urlUtils;
            urlUtils.registerUrlRegex(offlineUrlUtils.getRegex(), offlineUrlUtils);
        }

        schemeLoaderFactory.registerLoader(OfflineConstants.OFFLINE_SCHEME, IndexDBOfflineLoader);
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
                manifestLoader: manifestLoader,
                manifestModel: manifestModel,
                manifestUpdater: manifestUpdater,
                baseURLController: baseURLController,
                adapter: adapter,
                errHandler: errHandler,
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

    function removeDownloadFromId(id) {
        let download = getDownloadFromId(id);
        if (download) {
            // download is running
            download.deleteDownload();
            let index = downloads.indexOf(download);
            downloads.splice(index, 1);
        }
    }

    /*
    ---------------------------------------------------------------------------

        DOWNLOAD FUNCTIONS

    ---------------------------------------------------------------------------
    */
    function generateManifestId() {
        let timestamp = new Date().getTime();
        return timestamp;
    }

    function createDownload(url) {
        return new Promise(function (resolve, reject) {
            let id = generateManifestId();

            // create download controller
            let download = createDownloadFromId(id);

            download.downloadFromUrl(url).then(() => {
                resolve();
            })
            .catch((e) => {
                logger.error('Failed to download ' + e);
                removeDownloadFromId(id);
                reject(e);
            });
        });
    }

    function startDownload(id, selectedRepresentations) {
        let download = getDownloadFromId(id);
        if (download) {
            download.startDownload(selectedRepresentations);
        }
    }

    function getAllDownloads() {
        return offlineStoreController.getAllManifests();
    }

    function stopDownload(id) {
        let download = getDownloadFromId(id);
        if (download) {
            download.stopDownload();
        }
    }

    function deleteDownload(id) {
        removeDownloadFromId(id);

        return offlineStoreController.deleteDownloadById(id).then(function () {
            return Promise.resolve();
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    function resumeDownload(id) {
        let download = getDownloadFromId(id);
        if (download) {
            download.resumeDownload();
        }
    }

    function getDownloadProgression(id) {
        let download = getDownloadFromId(id);
        if (download) {
            return download.getDownloadProgression();
        }
        return 0;
    }

    function resetDownloads() {
        downloads.forEach((download) => {
            download.resetDownload();
        });
    }

    /**
     * Reset
     * @instance
     */
    function reset() {
        resetDownloads();
        schemeLoaderFactory.unregisterLoader(OfflineConstants.OFFLINE_SCHEME);
    }

    instance = {
        setConfig: setConfig,
        createDownload: createDownload,
        startDownload: startDownload,
        stopDownload: stopDownload,
        resumeDownload: resumeDownload,
        deleteDownload: deleteDownload,
        getDownloadProgression: getDownloadProgression,
        getAllDownloads: getAllDownloads,
        resetDownloads: resetDownloads,
        reset: reset
    };

    setup();

    return instance;
}

OfflineController.__dashjs_factory_name = 'OfflineController';
const factory = dashjs.FactoryMaker.getClassFactory(OfflineController); /* jshint ignore:line */
factory.events = OfflineEvents;
factory.domExceptionEvents = DOMExceptionsEvents;
dashjs.FactoryMaker.updateClassFactory(OfflineController.__dashjs_factory_name, factory); /* jshint ignore:line */
export default factory;
