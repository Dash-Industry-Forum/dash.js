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

/**
 * @ignore
 */
const localforage = require('localforage');
const entities = require('html-entities').XmlEntities;

function IndexDBStore() {

    let instance,
        manifestStore,
        fragmentStores;

    function setup() {
        fragmentStores = {};

        if (typeof window === 'undefined') {
            return;
        }

        localforage.config({
            driver: localforage.INDEXEDDB,
            name: 'dash_offline_db'
        });

        manifestStore = localforage.createInstance({
            driver: localforage.INDEXEDDB,
            name: 'dash_offline_db',
            version: 1.0,
            storeName: 'manifest'
        });
    }

    /////////////////////////////////////////
    //
    // GET/SET Methods
    //
    ////////////////////////////////////////

    /**
     * Creates an instance of localforage to store fragments in indexed db
     * @param {string} storeName
     * @instance
     */
    function createFragmentStore(storeName) {

        if (!fragmentStores[storeName]) {
            console.log('setStore  ' + storeName);
            let fragmentStore = localforage.createInstance({
                driver: localforage.INDEXEDDB,
                name: 'dash_offline_db',
                version: 1.0,
                storeName: storeName
            });
            fragmentStores[storeName] = fragmentStore;
        }
    }

    /**
     * Update download status
     * @param {number} manifestId
     * @param {string} newStatus
     * @returns {Promise} promise
     * @instance
     */
    function setDownloadingStatus(manifestId, newStatus) {
        return getManifestById(manifestId).then(function (item) {
            item.status = newStatus;
            return updateManifest(item).catch(function () {
                return Promise.reject('Cannot set status ' + newStatus + ' for this stream !');
            });
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Updat last downloaded fragment index for representationId
     * @param {number} manifestId - manifest id
      * @param {string} representationId - representation
     * @param {number} state - representation state
     * @returns {Promise} promise
     * @instance
     */
    function setRepresentationCurrentState(manifestId, representationId, state) {
        return getManifestById(manifestId).then(function (item) {
            if (!item.state) {
                item.state = {};
            }

            if (!item.state[representationId]) {
                item.state[representationId] = {
                    index: -1,
                    downloaded: 0
                };
            }

            item.state[representationId] = state;
            return updateManifest(item).catch(function () {
                return Promise.reject('Cannot set current index for represenation id ' + representationId);
            });
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Returns current downloaded segment index for representation
     * @param {number} manifestId - manifest id
     * @param {string} representationId - representation
     * @returns {Promise} promise
     * @instance
     */
    function getRepresentationCurrentState(manifestId, representationId) {
        return getManifestById(manifestId).then(function (item) {
            let state = {
                index: -1,
                downloaded: 0
            };
            if (item.state && item.state[representationId]) {
                state = item.state[representationId];
            }
            return Promise.resolve(state);
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Returns a fragment from its key
     * @param {number} manifestId
     * @param {number} key
     * @returns {Promise} fragment
     * @instance
     */
    function getFragmentByKey(manifestId, key) {
        let fragmentStore = fragmentStores[manifestId];

        if (!fragmentStore) {
            return Promise.reject(new Error (`No fragment store found for manifest ${manifestId}`));
        }

        return fragmentStore.getItem(key).then(function (value) {
            return Promise.resolve(value);
        }).catch(function (err) {
            return Promise.reject(err);
        });

    }

    /**
     * Returns a manifest from its identifier
     * @param {number} id
     * @returns {Promise} {Object[]} manifests
     * @instance
     */
    function getManifestById(id) {
        return getAllManifests().then(function (array) {
            if (array) {
                let item = null;
                for (let i = 0; i < array.manifests.length; i++) {
                    if (array.manifests[i].manifestId === parseInt(id)) {
                        item = array.manifests[i];
                    }
                }
                if (item !== null) {
                    item.manifest = entities.decode(item.manifest);
                    return Promise.resolve(item);
                } else {
                    return Promise.reject('Cannot found manifest with this manifestId : ' + id);
                }
            } else {
                return Promise.reject('Any manifests stored in DB !');
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Returns all offline manifests
     * @returns {Promise} {Object[]} manifests
     * @instance
     */
    function getAllManifests() {
        return manifestStore.getItem('manifest').then(function (array) {
            return Promise.resolve(array ? array : {
                'manifests': []
            });
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Return higher manifest id
     * @returns {Promise} number
     * @instance
     */
    function getCurrentHigherManifestId() {
        return getAllManifests().then(function (array) {
            let higherManifestId = 0;
            if (array) {
                for (let i = 0; i < array.manifests.length; i++) {
                    if (array.manifests[i].manifestId > higherManifestId) {
                        higherManifestId = array.manifests[i].manifestId;
                    }
                }
                return Promise.resolve(higherManifestId);
            } else {
                return Promise.resolve(higherManifestId);
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Update manifest
     * @param {Object} manifest updated manifest
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function updateManifest(manifest) {
        return getAllManifests().then(function (array) {
            try {
                for (let i = 0; i < array.manifests.length; i++) {
                    if (array.manifests[i].manifestId === manifest.manifestId) {
                        array.manifests[i] = manifest;
                    }
                }
                return manifestStore.setItem('manifest', array);
            } catch (err) {
                throw new Error('Any results found !');
            }
        });
    }

    /**
     * save selected representation by user
     * @param {Object} manifest updated manifest
     * @param {Object} selected selected representations
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function saveSelectedRepresentations(manifest, selected) {
        return getManifestById(manifest).then(function (item) {
            if (!item.selected) {
                item.selected = {};
            }

            item.selected = selected;
            return updateManifest(item).catch(function () {
                return Promise.reject('Cannot save selected representations');
            });
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Store a manifest in manifest array
     * @param {Object} manifest
     * @instance
     */
    function storeManifest(manifest) {
        return manifestStore.getItem('manifest').then(function (results) {
            let array = results ? results : {
                'manifests': []
            };
            array.manifests.push(manifest);
            return manifestStore.setItem('manifest', array);
        });
    }

    /**
     * Store a fragment in fragment store
     * @param {number} manifestId
     * @param {number} fragmentId
     * @param {Object} fragmentData
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function storeFragment(manifestId, fragmentId, fragmentData) {
        let fragmentStore = fragmentStores[manifestId];

        if (!fragmentStore) {
            return Promise.reject(new Error (`No fragment store found for manifest ${manifestId}`));
        }

        return fragmentStore.setItem(fragmentId, fragmentData, function () {
            return Promise.resolve();
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /////////////////////////////////////////
    //
    // DROP Methods
    //
    ////////////////////////////////////////

    /**
     * Remove all manifest and fragment store
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function dropAll() {
        return localforage.clear().then(function () {
            return Promise.resolve();
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Remove framgent store given its name
     * @param {string} storeName
     * @instance
     */
    function dropFragmentStore(storeName) {
        localforage.dropInstance({
            driver: localforage.INDEXEDDB,
            name: 'dash_offline_db',
            version: 1.0,
            storeName: storeName
        }).then(function () {
            delete fragmentStores[storeName];
        }).catch(function (err) {
            console.log('dropFragmentStore failed ' + err);
        });
        return;
    }

    /**
     * Remove download given its id (fragmentStore + manifest entry in manifest array)
     * @param {number} manifestId
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function deleteDownloadById(manifestId) {
        return manifestStore.getItem('manifest').then(function (array) {
            if (array) {
                return deleteFragmentStore(manifestId).then(function () {
                    for (let i = 0; i < array.manifests.length; i++) {
                        if (array.manifests[i].manifestId === parseInt(manifestId)) {
                            array.manifests.splice(i, 1);
                        }
                    }
                    return manifestStore.setItem('manifest', array).then(function () {
                        return Promise.resolve('This stream has been successfull removed !');
                    }).catch(function () {
                        return Promise.reject('An error occured when trying to delete this manifest');
                    });
                });
            } else {
                return Promise.resolve('Nothing to delete !');
            }
        }).catch(function (err) {
            return Promise.reject(err);
        });
    }

    /**
     * Remove fragment store
     * @param {string} storeName
     * @returns {Promise} promise asynchronously resolved
     * @instance
     */
    function deleteFragmentStore(storeName) {
        localforage.createInstance({
            name: 'dash_offline_db',
            storeName: storeName
        });
        return localforage.dropInstance({
            name: 'dash_offline_db',
            storeName: storeName
        }).then(function () {
            delete fragmentStores[storeName];
            return Promise.resolve();
        }).catch(function (err) {
            console.log(err);
            return Promise.reject(err);
        });

    }


    setup();

    instance = {
        dropAll: dropAll,
        getFragmentByKey: getFragmentByKey,
        getManifestById: getManifestById,
        storeFragment: storeFragment,
        storeManifest: storeManifest,
        updateManifest: updateManifest,
        saveSelectedRepresentations: saveSelectedRepresentations,
        createFragmentStore: createFragmentStore,
        setDownloadingStatus: setDownloadingStatus,
        setRepresentationCurrentState: setRepresentationCurrentState,
        getRepresentationCurrentState: getRepresentationCurrentState,
        getCurrentHigherManifestId: getCurrentHigherManifestId,
        getAllManifests: getAllManifests,
        dropFragmentStore: dropFragmentStore,
        deleteDownloadById: deleteDownloadById
    };

    return instance;
}

IndexDBStore.__dashjs_factory_name = 'IndexDBStore';
export default dashjs.FactoryMaker.getSingletonFactory(IndexDBStore); /* jshint ignore:line */
