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
import FactoryMaker from '../../core/FactoryMaker';
import IndexDBStore from '../storage/IndexDBStore';
import DOMExceptionsEvents from '../events/DOMExceptionsEvents';
import EventBus from '../../core/EventBus';
import Events from '../../core/events/Events';

/**
 * @class OfflineStoreController
 * This class manages database store
 * @description Offline Storage Controller
 */
function OfflineStoreController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        errHandler,
        indexDBStore;

    function setup() {
        indexDBStore = IndexDBStore(context).getInstance();
        Events.extend(DOMExceptionsEvents);
    }

    function setConfig(config) {
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
    }

    function createFragmentStore(manifestId, storeName) {
        try {
            indexDBStore.createFragmentStore(manifestId, storeName);
        } catch (err) {
            manageDOMError(err);
        }
    }

    function storeFragment(manifestId, fragmentId, fragmentData) {
        indexDBStore.storeFragment(manifestId, fragmentId, fragmentData).catch(function (err) {
            manageDOMError(err);
        });
    }

    function storeOfflineManifest(manifest) {
        return indexDBStore.storeManifest(manifest).catch(function (err) {
            manageDOMError(err);
        });
    }

    function getCurrentHigherManifestId() {
        return indexDBStore.getCurrentHigherManifestId().catch(function (err) {
            manageDOMError(err);
        });
    }

    function getAllManifests() {
        return indexDBStore.getAllManifests().catch(function (err) {
            manageDOMError(err);
        });
    }

    function deleteDownloadById(manifestId) {
        return indexDBStore.deleteDownloadById(manifestId).catch(function (err) {
            manageDOMError(err);
        });
    }

    function setDownloadingStatus(manifestId, status) {
        indexDBStore.setDownloadingStatus(manifestId, status).catch(function (err) {
            manageDOMError(err);
        });
    }

    function manageDOMError(err) {
        if (err) {
            switch (err.name) {
                case 'QuotaExceededError':
                    eventBus.trigger(Events.INDEXEDDB_QUOTA_EXCEED_ERROR);
                    break;
                case 'InvalidStateError':
                    eventBus.trigger(Events.INDEXEDDB_INVALID_STATE_ERROR);
                    break;
                case 'NotFoundError':
                    eventBus.trigger(Events.INDEXEDDB_NOT_FOUND_ERROR);
                    break;
                case 'VersionError':
                    eventBus.trigger(Events.INDEXEDDB_VERSION_ERROR);
                    break;
                // TODO : Manage all DOM cases
            }
            errHandler.indexedDBError(err);
        }
    }

    instance = {
        setConfig: setConfig,
        storeFragment: storeFragment,
        storeOfflineManifest: storeOfflineManifest,
        createFragmentStore: createFragmentStore,
        getCurrentHigherManifestId: getCurrentHigherManifestId,
        getAllManifests: getAllManifests,
        deleteDownloadById: deleteDownloadById,
        setDownloadingStatus: setDownloadingStatus
    };

    setup();

    return instance;
}

OfflineStoreController.__dashjs_factory_name = 'OfflineStoreController';
export default FactoryMaker.getClassFactory(OfflineStoreController);
