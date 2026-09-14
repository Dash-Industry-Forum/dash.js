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
import ExternalSubtitle from '../vo/ExternalSubtitle.js';
import FactoryMaker from '../../core/FactoryMaker.js';

function CustomParametersApi() {
    let instance,
        state;

    function setConfig(config) {
        if (!config) {
            return;
        }
        if (config.state) {
            state = config.state;
        }
    }

    /**
     * Add a custom ABR Rule
     * Rule will be apply on next stream if a stream is being played
     *
     * @param {string} type - rule type (one of ['qualitySwitchRules','abandonFragmentRules'])
     * @param {string} rulename - name of rule (used to identify custom rule). If one rule of same name has been added, then existing rule will be updated
     * @param {object} rule - the rule object instance
     * @memberof module:MediaPlayer
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments.
     * @instance
     */
    function addABRCustomRule(type, rulename, rule) {
        state.customParametersModel.addAbrCustomRule(type, rulename, rule);
    }

    /**
     * Remove a custom ABR Rule
     *
     * @param {string} rulename - name of the rule to be removed
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeABRCustomRule(rulename) {
        state.customParametersModel.removeAbrCustomRule(rulename);
    }

    /**
     * Remove all ABR custom rules
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeAllABRCustomRule() {
        state.customParametersModel.removeAllAbrCustomRule();
    }

    /**
     * Returns all ABR custom rules
     * @return {Array}
     */
    function getABRCustomRules() {
        return state.customParametersModel.getAbrCustomRules();
    }

    /**
     * <p>Allows you to set a scheme and server source for UTC live edge detection for dynamic streams.
     * If UTCTiming is defined in the manifest, it will take precedence over any time source manually added.</p>
     * <p>If you have exposed the Date header, use the method {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}.
     * This will allow the date header on the manifest to be used instead of a time server</p>
     * @param {string} schemeIdUri - <ul>
     * <li>urn:mpeg:dash:utc:http-head:2014</li>
     * <li>urn:mpeg:dash:utc:http-xsdate:2014</li>
     * <li>urn:mpeg:dash:utc:http-iso:2014</li>
     * <li>urn:mpeg:dash:utc:direct:2014</li>
     * </ul>
     * <p>Some specs referencing early ISO23009-1 drafts incorrectly use
     * 2012 in the URI, rather than 2014. support these for now.</p>
     * <ul>
     * <li>urn:mpeg:dash:utc:http-head:2012</li>
     * <li>urn:mpeg:dash:utc:http-xsdate:2012</li>
     * <li>urn:mpeg:dash:utc:http-iso:2012</li>
     * <li>urn:mpeg:dash:utc:direct:2012</li>
     * </ul>
     * @param {string} value - Path to a time source.
     * @default
     * <ul>
     *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
     *     <li>value:http://time.akamai.com/?iso&ms/li>
     * </ul>
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#removeUTCTimingSource removeUTCTimingSource()}
     * @instance
     */
    function addUTCTimingSource(schemeIdUri, value) {
        state.customParametersModel.addUTCTimingSource(schemeIdUri, value);
    }

    /**
     * <p>Allows you to remove a UTC time source. Both schemeIdUri and value need to match the Dash.vo.UTCTiming properties in order for the
     * entry to be removed from the array</p>
     * @param {string} schemeIdUri - see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @param {string} value - see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments, schemeIdUri and value are not string type.
     * @instance
     */
    function removeUTCTimingSource(schemeIdUri, value) {
        state.customParametersModel.removeUTCTimingSource(schemeIdUri, value);
    }

    /**
     * <p>Allows you to clear the stored array of time sources.</p>
     * <p>Example use: If you have exposed the Date header, calling this method
     * will allow the date header on the manifest to be used instead of the time server.</p>
     * <p>Example use: Calling this method, assuming there is not an exposed date header on the manifest,  will default back
     * to using a binary search to discover the live edge</p>
     *
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#restoreDefaultUTCTimingSources restoreDefaultUTCTimingSources()}
     * @instance
     */
    function clearDefaultUTCTimingSources() {
        state.customParametersModel.clearDefaultUTCTimingSources();
    }

    /**
     * <p>Allows you to restore the default time sources after calling {@link module:MediaPlayer#clearDefaultUTCTimingSources clearDefaultUTCTimingSources()}</p>
     *
     * @default
     * <ul>
     *     <li>schemeIdUri:urn:mpeg:dash:utc:http-xsdate:2014</li>
     *     <li>value:http://time.akamai.com/?iso&ms</li>
     * </ul>
     *
     * @memberof module:MediaPlayer
     * @see {@link module:MediaPlayer#addUTCTimingSource addUTCTimingSource()}
     * @instance
     */
    function restoreDefaultUTCTimingSources() {
        state.customParametersModel.restoreDefaultUTCTimingSources();
    }

    /**
     * Sets whether withCredentials on XHR requests for a particular request
     * type is true or false
     *
     * @default false
     * @param {string} type - one of HTTPRequest.*_TYPE
     * @param {boolean} value
     * @memberof module:MediaPlayer
     * @instance
     */
    function setXHRWithCredentialsForType(type, value) {
        state.customParametersModel.setXHRWithCredentialsForType(type, value);
    }

    /**
     * Gets whether withCredentials on XHR requests for a particular request
     * type is true or false
     *
     * @param {string} type - one of HTTPRequest.*_TYPE
     * @return {boolean}
     * @memberof module:MediaPlayer
     * @instance
     */
    function getXHRWithCredentialsForType(type) {
        return state.customParametersModel.getXHRWithCredentialsForType(type);
    }

    /**
     * Registers a custom capabilities filter. This enables application to filter representations to use.
     * The provided callback function shall return either a boolean or a promise resolving to a boolean based on whether or not to use the representation.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerCustomCapabilitiesFilter(filter) {
        state.customParametersModel.registerCustomCapabilitiesFilter(filter);
    }

    /**
     * Unregisters a custom capabilities filter.
     * @param {function} filter - the custom capabilities filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterCustomCapabilitiesFilter(filter) {
        state.customParametersModel.unregisterCustomCapabilitiesFilter(filter);
    }

    /**
     * Registers a custom initial track selection function. Only one function is allowed. Calling this method will overwrite a potentially existing function.
     * @param {function} customFunc - the custom function that returns the initial track
     * @memberof module:MediaPlayer
     * @instance
     */
    function setCustomInitialTrackSelectionFunction(customFunc) {
        state.customParametersModel.setCustomInitialTrackSelectionFunction(customFunc);
    }

    /**
     * Resets the custom initial track selection
     * @memberof module:MediaPlayer
     * @instance
     */
    function resetCustomInitialTrackSelectionFunction() {
        state.customParametersModel.resetCustomInitialTrackSelectionFunction(null);

    }

    /**
     * Adds an external subtitle file. The provided externalSubtitle must be an instance of the ExternalSubtitle class.
     * @param {ExternalSubtitle} externalSubtitle
     * @memberof module:MediaPlayer
     * @instance
     */
    function addExternalSubtitle(externalSubtitle) {
        if (!(externalSubtitle instanceof ExternalSubtitle)) {
            state.logger.error('Invalid external subtitle object. Must be an instance of dashjs.ExternalSubtitle');
        }
        state.customParametersModel.addExternalSubtitle(externalSubtitle);
    }

    /**
     * Removes an external subtitle file by its ID.
     * @param {string} id
     */
    function removeExternalSubtitleById(id) {
        state.customParametersModel.removeExternalSubtitleById(id);
    }

    /**
     * Removes an external subtitle file by its url.
     * @param {string} url
     */
    function removeExternalSubtitleByUrl(url) {
        state.customParametersModel.removeExternalSubtitleByUrl(url);
    }

    /**
     * Returns all external subtitles
     */
    function getExternalSubtitles() {
        return state.customParametersModel.getExternalSubtitles();
    }

    /**
     * Adds a request interceptor. This enables application to monitor, manipulate, overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise with updated request that shall be resolved once the process of the request is completed.
     * The interceptors are applied in the order they are added.
     * @param {function} interceptor - the request interceptor callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function addRequestInterceptor(interceptor) {
        state.customParametersModel.addRequestInterceptor(interceptor);
    }

    /**
     * Removes a request interceptor.
     * @param {function} interceptor - the request interceptor callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeRequestInterceptor(interceptor) {
        state.customParametersModel.removeRequestInterceptor(interceptor);
    }

    /**
     * Adds a response interceptor. This enables application to monitor, manipulate, overwrite the response data
     * The provided callback function shall return a promise with updated response that shall be resolved once the process of the response is completed.
     * The interceptors are applied in the order they are added.
     * @param {function} interceptor - the response interceptor
     * @memberof module:MediaPlayer
     * @instance
     */
    function addResponseInterceptor(interceptor) {
        state.customParametersModel.addResponseInterceptor(interceptor);
    }

    /**
     * Removes a response interceptor.
     * @param {function} interceptor - the request interceptor
     * @memberof module:MediaPlayer
     * @instance
     */
    function removeResponseInterceptor(interceptor) {
        state.customParametersModel.removeResponseInterceptor(interceptor);
    }

    /**
     * Registers a certificate request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerCertificateRequestFilter(filter) {
        state.customParametersModel.registerCertificateRequestFilter(filter);
    }

    /**
     * Registers a certificate response filter. This enables application to manipulate/overwrite the response data
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerCertificateResponseFilter(filter) {
        state.customParametersModel.registerCertificateResponseFilter(filter);
    }

    /**
     * Unregisters a certificate request filter.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterCertificateRequestFilter(filter) {
        state.customParametersModel.unregisterCertificateRequestFilter(filter);
    }

    /**
     * Unregisters a certificate response filter.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterCertificateResponseFilter(filter) {
        state.customParametersModel.unregisterCertificateResponseFilter(filter);
    }

    /**
     * Registers a license request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerLicenseRequestFilter(filter) {
        state.customParametersModel.registerLicenseRequestFilter(filter);
    }

    /**
     * Registers a license response filter. This enables application to manipulate/overwrite the response data
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function registerLicenseResponseFilter(filter) {
        state.customParametersModel.registerLicenseResponseFilter(filter);
    }

    /**
     * Unregisters a license request filter.
     * @param {function} filter - the license request filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseRequestFilter(filter) {
        state.customParametersModel.unregisterLicenseRequestFilter(filter);
    }

    /**
     * Unregisters a license response filter.
     * @param {function} filter - the license response filter callback
     * @memberof module:MediaPlayer
     * @instance
     */
    function unregisterLicenseResponseFilter(filter) {
        state.customParametersModel.unregisterLicenseResponseFilter(filter);
    }

    instance = {
        addABRCustomRule,
        addExternalSubtitle,
        addRequestInterceptor,
        addResponseInterceptor,
        addUTCTimingSource,
        clearDefaultUTCTimingSources,
        getABRCustomRules,
        getExternalSubtitles,
        getXHRWithCredentialsForType,
        registerCertificateRequestFilter,
        registerCertificateResponseFilter,
        registerCustomCapabilitiesFilter,
        registerLicenseRequestFilter,
        registerLicenseResponseFilter,
        removeABRCustomRule,
        removeAllABRCustomRule,
        removeExternalSubtitleById,
        removeExternalSubtitleByUrl,
        removeRequestInterceptor,
        removeResponseInterceptor,
        removeUTCTimingSource,
        resetCustomInitialTrackSelectionFunction,
        restoreDefaultUTCTimingSources,
        setConfig,
        setCustomInitialTrackSelectionFunction,
        setXHRWithCredentialsForType,
        unregisterCertificateRequestFilter,
        unregisterCertificateResponseFilter,
        unregisterCustomCapabilitiesFilter,
        unregisterLicenseRequestFilter,
        unregisterLicenseResponseFilter,
    };

    return instance;
}

CustomParametersApi.__dashjs_factory_name = 'CustomParametersApi';
export default FactoryMaker.getClassFactory(CustomParametersApi);
