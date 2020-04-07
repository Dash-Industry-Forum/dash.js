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
import DefaultURLUtils from './DefaultURLUtils';

/**
 * @module URLUtils
 * @ignore
 * @description Provides utility functions for operating on URLs.
 * Initially this is simply a method to determine the Base URL of a URL, but
 * should probably include other things provided all over the place such as
 * determining whether a URL is relative/absolute, resolving two paths etc.
 */
function URLUtils() {

    let instance;
    let defaultURLUtils;
    let regexUtils = [];
    const context = this.context;

    function getUtils(url) {
        let i;
        for (i = 0; i < regexUtils.length; i++) {
            let regex = regexUtils[i].regex;
            if (regex.test(url)) {
                return regexUtils[i].utils;
            }
        }
        return defaultURLUtils;
    }

    function setup() {
        defaultURLUtils = DefaultURLUtils(context).getInstance();
    }

    /**
     * Register a module to handle specific url.
     * @param {regex} regex - url regex
     * @param {object} utils - object that handles the regex
     * @memberof module:URLUtils
     * @instance
     */
    function registerUrlRegex(regex, utils) {
        regexUtils.push({regex: regex, utils: utils});
    }

    function internalCall(functionName, url, baseUrl) {
        let utils = getUtils(baseUrl || url);
        return utils && typeof (utils[functionName]) === 'function' ? utils[functionName](url, baseUrl) : defaultURLUtils[functionName](url, baseUrl);
    }

    /**
     * Returns a string that contains the Base URL of a URL, if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseBaseUrl(url) {
        return internalCall('parseBaseUrl', url);
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
        return internalCall('parseOrigin', url);
    }

    /**
     * Returns a string that contains the fragment of a URL without scheme,
     * if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function removeHostname(url) {
        return internalCall('removeHostname', url);
    }

    /**
     * Returns a string that contains the scheme of a URL, if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseScheme(url) {
        return internalCall('parseScheme', url);
    }

    /**
     * Determines whether the url is relative.
     * @return {boolean}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isRelative(url) {
        return internalCall('isRelative', url);
    }

    /**
     * Determines whether the url is path-absolute.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isPathAbsolute(url) {
        return internalCall('isPathAbsolute', url);
    }

    /**
     * Determines whether the url is scheme-relative.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isSchemeRelative(url) {
        return internalCall('isSchemeRelative', url);
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
        return internalCall('isHTTPURL', url);
    }

    /**
     * Determines whether the supplied url has https scheme
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isHTTPS(url) {
        return internalCall('isHTTPS', url);
    }

    /**
     * Resolves a url given an optional base url
     * @return {string}
     * @param {string} url
     * @param {string} [baseUrl]
     * @memberof module:URLUtils
     * @instance
     */
    function resolve(url, baseUrl) {
        return internalCall('resolve', url, baseUrl);
    }

    setup();
    instance = {
        registerUrlRegex:   registerUrlRegex,
        parseBaseUrl:       parseBaseUrl,
        parseOrigin:        parseOrigin,
        parseScheme:        parseScheme,
        isRelative:         isRelative,
        isPathAbsolute:     isPathAbsolute,
        isSchemeRelative:   isSchemeRelative,
        isHTTPURL:          isHTTPURL,
        isHTTPS:            isHTTPS,
        removeHostname:     removeHostname,
        resolve:            resolve
    };

    return instance;
}

URLUtils.__dashjs_factory_name = 'URLUtils';
const factory = FactoryMaker.getSingletonFactory(URLUtils);
export default factory;
