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
 * @ignore
 * @description Provides utility functions for operating on URLs.
 * Initially this is simply a method to determine the Base URL of a URL, but
 * should probably include other things provided all over the place such as
 * determining whether a URL is relative/absolute, resolving two paths etc.
 */
function URLUtils() {

    let resolveFunction;

    const schemeRegex = /^[a-z][a-z0-9+\-.]*:/i;
    const httpUrlRegex = /^https?:\/\//i;
    const httpsUrlRegex = /^https:\/\//i;
    const originRegex = /^([a-z][a-z0-9+\-.]*:\/\/[^\/]+)\/?/i;

    /**
     * Resolves a url given an optional base url
     * Uses window.URL to do the resolution.
     *
     * @param {string} url
     * @param {string} [baseUrl]
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     * @private
     */
    const nativeURLResolver = (url, baseUrl) => {
        try {
            // this will throw if baseurl is undefined, invalid etc
            return new window.URL(url, baseUrl).toString();
        } catch (e) {
            return url;
        }
    };

    /**
     * Resolves a url given an optional base url
     * Does not resolve ./, ../ etc but will do enough to construct something
     * which will satisfy XHR etc when window.URL is not available ie
     * IE11/node etc.
     *
     * @param {string} url
     * @param {string} [baseUrl]
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     * @private
     */
    const dumbURLResolver = (url, baseUrl) => {
        let baseUrlParseFunc = parseBaseUrl;

        if (!baseUrl) {
            return url;
        }

        if (!isRelative(url)) {
            return url;
        }

        if (isPathAbsolute(url)) {
            baseUrlParseFunc = parseOrigin;
        }

        if (isSchemeRelative(url)) {
            baseUrlParseFunc = parseScheme;
        }

        const base = baseUrlParseFunc(baseUrl);
        const joinChar =
              base.charAt(base.length - 1) !== '/' &&
              url.charAt(0) !== '/' ?
              '/' : '';

        return [base, url].join(joinChar);
    };

    function setup() {
        try {
            const u = new window.URL('x', 'http://y'); //jshint ignore:line
            resolveFunction = nativeURLResolver;
        } catch (e) {
            // must be IE11/Node etc
        } finally {
            resolveFunction = resolveFunction || dumbURLResolver;
        }
    }

    /**
     * Returns a string that contains the Base URL of a URL, if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseBaseUrl(url) {
        const slashIndex = url.indexOf('/');
        const lastSlashIndex = url.lastIndexOf('/');

        if (slashIndex !== -1) {
            // if there is only '//'
            if (lastSlashIndex === slashIndex + 1) {
                return url;
            }

            if (url.indexOf('?') !== -1) {
                url = url.substring(0, url.indexOf('?'));
            }

            return url.substring(0, lastSlashIndex + 1);
        }

        return '';
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
     * Returns a string that contains the scheme of a URL, if determinable.
     * @param {string} url - full url
     * @return {string}
     * @memberof module:URLUtils
     * @instance
     */
    function parseScheme(url) {
        const matches = url.match(schemeRegex);

        if (matches) {
            return matches[0];
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
        return !schemeRegex.test(url);
    }

    /**
     * Determines whether the url is path-absolute.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isPathAbsolute(url) {
        return isRelative(url) && url.charAt(0) === '/';
    }

    /**
     * Determines whether the url is scheme-relative.
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isSchemeRelative(url) {
        return url.indexOf('//') === 0;
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

    /**
     * Determines whether the supplied url has https scheme
     * @return {bool}
     * @param {string} url
     * @memberof module:URLUtils
     * @instance
     */
    function isHTTPS(url) {
        return httpsUrlRegex.test(url);
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
        return resolveFunction(url, baseUrl);
    }

    setup();

    const instance = {
        parseBaseUrl:       parseBaseUrl,
        parseOrigin:        parseOrigin,
        parseScheme:        parseScheme,
        isRelative:         isRelative,
        isPathAbsolute:     isPathAbsolute,
        isSchemeRelative:   isSchemeRelative,
        isHTTPURL:          isHTTPURL,
        isHTTPS:            isHTTPS,
        resolve:            resolve
    };

    return instance;
}

URLUtils.__dashjs_factory_name = 'URLUtils';
export default FactoryMaker.getSingletonFactory(URLUtils);
