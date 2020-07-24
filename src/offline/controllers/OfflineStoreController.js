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
import IndexDBStore from '../storage/IndexDBStore';
import OfflineErrors from '../errors/OfflineErrors';

/**
 * @class OfflineStoreController
 * @description This class manages database store
 * @param {object} config
 * @ignore
 */
function OfflineStoreController(config) {

    config = config || {};
    const context = this.context;
    const errHandler = config.errHandler;

    let instance,
        indexDBStore;

    function setup() {
        indexDBStore = IndexDBStore(context).getInstance();
    }

    function createFragmentStore(manifestId, storeName) {
        try {
            indexDBStore.createFragmentStore(manifestId, storeName);
        } catch (err) {
            manageDOMError(err);
        }
    }

    function storeFragment(manifestId, fragmentId, fragmentData) {
        return indexDBStore.storeFragment(manifestId, fragmentId, fragmentData).catch(function (err) {
            manageDOMError(err);
        });
    }

    function createOfflineManifest(manifest) {
        return indexDBStore.storeManifest(manifest).catch(function (err) {
            manageDOMError(err);
        });
    }

    function updateOfflineManifest(manifest) {
        return indexDBStore.updateManifest(manifest).catch(function (err) {
            manageDOMError(err);
        });
    }

    function getManifestById(manifestId) {
        return indexDBStore.getManifestById(manifestId).catch(function (err) {
            manageDOMError(err);
        });
    }

    function saveSelectedRepresentations (manifestId, selected) {
        return indexDBStore.saveSelectedRepresentations(manifestId, selected).catch(function (err) {
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
        return indexDBStore.setDownloadingStatus(manifestId, status).catch(function (err) {
            manageDOMError(err);
        });
    }

    function setRepresentationCurrentState(manifestId, representationId, state) {
        return indexDBStore.setRepresentationCurrentState(manifestId, representationId, state).catch(function (err) {
            manageDOMError(err);
        });
    }

    function getRepresentationCurrentState(manifestId, representationId) {
        return indexDBStore.getRepresentationCurrentState(manifestId, representationId).catch(function (err) {
            manageDOMError(err);
        });
    }

    function manageDOMError(err) {
        let error;
        if (err) {
            switch (err.name) {
                case 'QuotaExceededError':
                    error = OfflineErrors.INDEXEDDB_QUOTA_EXCEED_ERROR;
                    break;
                case 'InvalidStateError':
                    error = OfflineErrors.INDEXEDDB_INVALID_STATE_ERROR;
                    break;
                case 'NotFoundError':
                    error = OfflineErrors.INDEXEDDB_NOT_FOUND_ERROR;
                    break;
                case 'VersionError':
                    error = OfflineErrors.INDEXEDDB_VERSION_ERROR;
                    break;
                // TODO : Manage all DOM cases
            }

            // avoid importing DashJSError object from streaming
            errHandler.error({code: error, message: err.name, data: err});
        }
    }

    instance = {
        storeFragment: storeFragment,
        createOfflineManifest: createOfflineManifest,
        updateOfflineManifest: updateOfflineManifest,
        getManifestById: getManifestById,
        saveSelectedRepresentations: saveSelectedRepresentations,
        createFragmentStore: createFragmentStore,
        getCurrentHigherManifestId: getCurrentHigherManifestId,
        getAllManifests: getAllManifests,
        deleteDownloadById: deleteDownloadById,
        setDownloadingStatus: setDownloadingStatus,
        setRepresentationCurrentState: setRepresentationCurrentState,
        getRepresentationCurrentState: getRepresentationCurrentState
    };

    setup();

    return instance;
}

OfflineStoreController.__dashjs_factory_name = 'OfflineStoreController';
export default dashjs.FactoryMaker.getClassFactory(OfflineStoreController); /* jshint ignore:line */
