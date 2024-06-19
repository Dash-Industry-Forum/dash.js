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

import URIFragmentData from '../vo/URIFragmentData.js';
import FactoryMaker from '../../core/FactoryMaker.js';

/**
 * Model class managing URI fragments.
 * @ignore
 */
function URIFragmentModel() {

    let instance,
        URIFragmentDataVO;

    /**
     * @param {string} uri The URI to parse for fragment extraction
     * @memberof module:URIFragmentModel
     * @instance
     */
    function initialize(uri) {
        URIFragmentDataVO = new URIFragmentData();

        if (!uri) {
            return null;
        }

        const hashIndex = uri.indexOf('#');
        if (hashIndex !== -1) {
            const fragments = uri.substr(hashIndex + 1).split('&');
            for (let i = 0, len = fragments.length; i < len; ++i) {
                const fragment = fragments[i];
                const equalIndex = fragment.indexOf('=');
                if (equalIndex !== -1) {
                    const key = fragment.substring(0, equalIndex);
                    if (URIFragmentDataVO.hasOwnProperty(key)) {
                        URIFragmentDataVO[key] = fragment.substr(equalIndex + 1);
                    }
                }
            }
        }
    }

    /**
     * @returns {URIFragmentData} Object containing supported URI fragments
     * @memberof module:URIFragmentModel
     * @instance
     */
    function getURIFragmentData() {
        return URIFragmentDataVO;
    }

    instance = {
        initialize: initialize,
        getURIFragmentData: getURIFragmentData
    };

    return instance;
}

URIFragmentModel.__dashjs_factory_name = 'URIFragmentModel';
export default FactoryMaker.getSingletonFactory(URIFragmentModel);
