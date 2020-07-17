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
import HTTPLoader from '../../streaming/net/HTTPLoader';

/**
 * @module
 * @description Choose right url loader for scheme
 * @ignore
 */
function SchemeLoaderFactory() {

    let instance;

    let schemeLoaderMap;

    function registerLoader(scheme, loader) {
        schemeLoaderMap[scheme] = loader;
    }

    function unregisterLoader(scheme) {
        if (schemeLoaderMap[scheme]) {
            delete schemeLoaderMap[scheme];
        }
    }

    function unregisterAllLoader() {
        schemeLoaderMap = {};
    }

    function getLoader(url) {

        // iterates through schemeLoaderMap to find a loader for the scheme
        for (var scheme in schemeLoaderMap) {
            if (schemeLoaderMap.hasOwnProperty(scheme) && url.startsWith(scheme)) {
                return schemeLoaderMap[scheme];
            }
        }

        return HTTPLoader;
    }

    function reset() {
        unregisterAllLoader();
    }

    function setup() {
        reset();
    }

    setup();

    instance = {
        getLoader: getLoader,
        registerLoader: registerLoader,
        unregisterLoader: unregisterLoader,
        unregisterAllLoader: unregisterAllLoader,
        reset: reset
    };

    return instance;
}

SchemeLoaderFactory.__dashjs_factory_name = 'SchemeLoaderFactory';
const factory = FactoryMaker.getSingletonFactory(SchemeLoaderFactory);
export default factory;
