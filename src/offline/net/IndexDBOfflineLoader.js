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
import URLUtils from './../../streaming/utils/URLUtils';
import Constants from './../../streaming/constants/Constants';

/**
 * @module
 * @description Load Offline resources

 */
function IndexDBOfflineLoader() {

    const context = this.context;
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        indexDBStore;

    function setup() {
        indexDBStore = IndexDBStore(context).getInstance();
    }

    function getManifestId (url) {
        let myURL = urlUtils.removeHostname(url);
        var parts = myURL.split('/');
        return parts[0];
    }
    /**
     * Load manifest or fragment from indexeddb database
     * @param {object} config configuration of request
     * @memberof module:offline
     * @instance
     */
    function load(config) {
        if (config.request) {
            let manifestId = getManifestId(config.request.url);
            if (manifestId % 1 === 0) {
                if (
                    config.request.mediaType === Constants.AUDIO ||
                    config.request.mediaType === Constants.VIDEO ||
                    config.request.mediaType === Constants.TEXT ||
                    config.request.mediaType === Constants.MUXED ||
                    config.request.mediaType === Constants.IMAGE ||
                    config.request.mediaType === Constants.FRAGMENTED_TEXT ||
                    config.request.mediaType === Constants.EMBEDDED_TEXT
                ) {
                    let key = config.request.representationId + '_' + config.request.index;
                    indexDBStore.getFragmentByKey(manifestId, key).then(function (fragment) {
                        config.success(fragment, null, config.request.url, Constants.ARRAY_BUFFER);
                    }).catch(function (err) {
                        config.error(err);
                    });
                } else if (config.request.type === Constants.MPD) {
                    indexDBStore.getManifestById(manifestId).then(function (item) {
                        indexDBStore.createFragmentStore(item.fragmentStore);
                        config.success(item.manifest, null, config.request.url, Constants.XML);
                    }).catch(function (err) {
                        config.error(config.request.url, 404, err);
                    });
                }
            } else {
                config.error(new Error('MediaType cannot be found'));
            }
        }
    }

    function abort() {
        // nothing to do
    }

    setup();

    instance = {
        load: load,
        abort: abort
    };

    return instance;
}

IndexDBOfflineLoader.__dashjs_factory_name = 'IndexDBOfflineLoader';
const factory = FactoryMaker.getClassFactory(IndexDBOfflineLoader);
export default factory;
