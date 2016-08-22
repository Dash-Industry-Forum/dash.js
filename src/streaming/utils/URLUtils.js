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

/**
 * @module URLUtils
 * @description Provides utility functions for operating on URLs.
 * Initially this is simply a method to determine the Base URL of a URL, but
 * should probably include other things provided all over the place such as
 * determining whether a URL is relative/absolute, resolving two paths etc.
 */
function URLUtils() {

    let instance;

    const absUrl = /^(?:(?:[a-z]+:)?\/)?\//i;
    const httpUrlRegex = /^https?:\/\//i;
    const originRegex = /^(https?:\/\/[^\/]+)\/?/i;

    /**
     * Returns a string that contains the Base URL of a URL, if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseBaseUrl(url) {
        var base = '';

        if (url.indexOf('/') !== -1) {
            if (url.indexOf('?') !== -1) {
                url = url.substring(0, url.indexOf('?'));
            }
            base = url.substring(0, url.lastIndexOf('/') + 1);
        }

        return base;
    }

    /**
     * Returns a string that contains the scheme and origin of a URL,
     * if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseOrigin(url) {
        const matches = url.match(originRegex);

        if (matches) {
            return matches[1];
        }

        return '';
    }

    /**
     * Determines whether the url is relative.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isRelative(url) {
        return !absUrl.test(url);
    }


    /**
     * Determines whether the url is path-absolute.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isPathAbsolute(url) {
        return absUrl.test(url) && url.charAt(0) === '/';
    }

    /**
     * Determines whether the url is an HTTP-URL as defined in ISO/IEC
     * 23009-1:2014 3.1.15. ie URL with a fixed scheme of http or https
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isHTTPURL(url) {
        return httpUrlRegex.test(url);
    }

    instance = {
        parseBaseUrl:   parseBaseUrl,
        parseOrigin:    parseOrigin,
        isRelative:     isRelative,
        isPathAbsolute: isPathAbsolute,
        isHTTPURL:      isHTTPURL
    };

    return instance;
}

URLUtils.__dashjs_factory_name = 'URLUtils';
export default FactoryMaker.getSingletonFactory(URLUtils);
