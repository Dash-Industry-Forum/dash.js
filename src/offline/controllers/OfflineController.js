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
import Events from '../../core/events/Events';
import OfflineEvents from '../events/OfflineEvents';
import OfflineConstants from '../constants/OfflineConstants';
import DOMExceptionsEvents from '../events/DOMExceptionsEvents';
import FactoryMaker from '../../core/FactoryMaker';
import BaseURLController from '../../streaming/controllers/BaseURLController';
import OfflineStoreController from './OfflineStoreController';
import OfflineDownload from '../OfflineDownload';
import IndexDBOfflineLoader from '../net/IndexDBOfflineLoader';
import OfflineUrlUtils from '../utils/OfflineUrlUtils';
import URLUtils from '../../streaming/utils/URLUtils';

/**
 * @class OfflineController
 */
function OfflineController() {

    const context = this.context;

    let instance,
        downloads,
        adapter,
        schemeLoaderFactory,
        baseURLController,

        manifestLoader,
        manifestModel,
        dashManifestModel,
        mediaPlayerModel,
        offlineStoreController,
        offlineUtlUtils,
        errHandler;

    function setup() {
        offlineStoreController = OfflineStoreController(context).create();
        baseURLController = BaseURLController(context).getInstance();
        offlineUtlUtils = OfflineUrlUtils(context).getInstance();
        URLUtils(context).getInstance().registerUrlRegex(offlineUtlUtils.getRegex(),offlineUtlUtils);
        Events.extend(OfflineEvents);
        Events.extend(DOMExceptionsEvents);

        downloads = [];
    }

    function setConfig(config) {
        if (!config) return;

        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }

        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }

        if (config.mediaPlayerModel) {
            mediaPlayerModel = config.mediaPlayerModel;
        }

        if (config.adapter) {
            adapter = config.adapter;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.schemeLoaderFactory) {
            schemeLoaderFactory = config.schemeLoaderFactory;
        }

        baseURLController.setConfig({
            dashManifestModel: dashManifestModel
        });

        offlineStoreController.setConfig({
            errHandler: errHandler
        });

        schemeLoaderFactory.registerLoader(OfflineConstants.OFFLINE_SCHEME, IndexDBOfflineLoader);
    }

    function getDownloadFromId (id) {
        let download = downloads.find((item) => {
            return item.getId() === id;
        });
        return download;
    }

    function generateManifestId() {
        let timestamp = new Date().getTime();
        return timestamp;
    }

    function record(url) {
        let manifestId = generateManifestId();

        // create download controller
        let download = OfflineDownload(context).create({
            id: manifestId
        });

        download.setConfig({
            manifestLoader: manifestLoader,
            mediaPlayerModel: mediaPlayerModel,
            manifestModel: manifestModel,
            dashManifestModel: dashManifestModel,
            adapter: adapter,
            errHandler: errHandler,
            schemeLoaderFactory: schemeLoaderFactory,
            offlineStoreController: offlineStoreController,
            baseURLController: baseURLController
        });

        download.record(url);

        downloads.push(download);
        return manifestId;
    }


    function startDownload(id, allSelectedMediaInfos) {
        let download = getDownloadFromId(id);
        if (download) {
            download.startDownload(allSelectedMediaInfos);
        }
    }

    function getAllRecords() {
        return offlineStoreController.getAllManifests();
    }

    function stopDownload(id) {
        let download = getDownloadFromId(id);
        if (download) {
            download.stopDownload();
        }
    }

    function deleteDownload(id) {
        let download = getDownloadFromId(id);
        if (download) {
            // download is running
            download.deleteDownload();
            let index = downloads.indexOf(download);
            downloads.splice(index,1);
        }

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

    function resetRecords() {
        downloads.forEach((download) => {
            download.resetRecord();
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
        setConfig: setConfig,
        record: record,
        startDownload: startDownload,
        stopDownload: stopDownload,
        resumeDownload: resumeDownload,
        deleteDownload: deleteDownload,
        getDownloadProgression: getDownloadProgression,
        getAllRecords: getAllRecords,
        resetRecords: resetRecords,
        reset: reset
    };

    setup();

    return instance;
}

OfflineController.__dashjs_factory_name = 'OfflineController';
export default FactoryMaker.getClassFactory(OfflineController);
