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
import UTCTiming from '../../dash/vo/UTCTiming';
import FactoryMaker from '../../core/FactoryMaker';
import Settings from '../../core/Settings';
import {checkParameterType} from '../utils/SupervisorTools';
import ABRRulesCollection from '../rules/abr/ABRRulesCollection';
import Constants from '../constants/Constants';

const DEFAULT_XHR_WITH_CREDENTIALS = false;

function CustomParametersModel() {

    let instance,
        utcTimingSources,
        xhrWithCredentials,
        licenseRequestFilters,
        licenseResponseFilters,
        customCapabilitiesFilters,
        customInitialTrackSelectionFunction,
        customAbrRules;

    const context = this.context;
    const settings = Settings(context).getInstance();

    function setup() {
        xhrWithCredentials = {
            default: DEFAULT_XHR_WITH_CREDENTIALS
        };
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        licenseRequestFilters = [];
        licenseResponseFilters = [];
        customCapabilitiesFilters = [];
        customAbrRules = [];
        customInitialTrackSelectionFunction = null;
        utcTimingSources = [];
    }


    function reset() {
        _resetInitialSettings();
    }

    function setConfig() {

    }

    /**
     * Registers a custom initial track selection function. Only one function is allowed. Calling this method will overwrite a potentially existing function.
     * @param {function} customFunc - the custom function that returns the initial track
     */
    function setCustomInitialTrackSelectionFunction(customFunc) {
        customInitialTrackSelectionFunction = customFunc;
    }

    /**
     * Resets the custom initial track selection
     */
    function resetCustomInitialTrackSelectionFunction() {
        customInitialTrackSelectionFunction = null;
    }

    /**
     * Returns the initial track selection function
     * @return {function}
     */
    function getCustomInitialTrackSelectionFunction() {
        return customInitialTrackSelectionFunction;
    }

    /**
     * Returns all license request filters
     * @return {array}
     */
    function getLicenseRequestFilters() {
        return licenseRequestFilters;
    }

    /**
     * Returns all license response filters
     * @return {array}
     */
    function getLicenseResponseFilters() {
        return licenseResponseFilters;
    }

    /**
     * Registers a license request filter. This enables application to manipulate/overwrite any request parameter and/or request data.
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license request filter callback
     */
    function registerLicenseRequestFilter(filter) {
        licenseRequestFilters.push(filter);
    }

    /**
     * Registers a license response filter. This enables application to manipulate/overwrite the response data
     * The provided callback function shall return a promise that shall be resolved once the filter process is completed.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the license response filter callback
     */
    function registerLicenseResponseFilter(filter) {
        licenseResponseFilters.push(filter);
    }

    /**
     * Unregisters a license request filter.
     * @param {function} filter - the license request filter callback
     */
    function unregisterLicenseRequestFilter(filter) {
        _unregisterFilter(licenseRequestFilters, filter);
    }

    /**
     * Unregisters a license response filter.
     * @param {function} filter - the license response filter callback
     */
    function unregisterLicenseResponseFilter(filter) {
        _unregisterFilter(licenseResponseFilters, filter);
    }

    /**
     * Returns all custom capabilities filter
     * @return {array}
     */
    function getCustomCapabilitiesFilters() {
        return customCapabilitiesFilters;
    }

    /**
     * Registers a custom capabilities filter. This enables application to filter representations to use.
     * The provided callback function shall return a boolean based on whether or not to use the representation.
     * The filters are applied in the order they are registered.
     * @param {function} filter - the custom capabilities filter callback
     */
    function registerCustomCapabilitiesFilter(filter) {
        customCapabilitiesFilters.push(filter);
    }

    /**
     * Unregisters a custom capabilities filter.
     * @param {function} filter - the custom capabilities filter callback
     */
    function unregisterCustomCapabilitiesFilter(filter) {
        _unregisterFilter(customCapabilitiesFilters, filter);
    }

    /**
     * Unregister a filter from the list of existing filers.
     * @param {array} filters
     * @param {function} filter
     * @private
     */
    function _unregisterFilter(filters, filter) {
        let index = -1;
        filters.some((item, i) => {
            if (item === filter) {
                index = i;
                return true;
            }
        });
        if (index < 0) return;
        filters.splice(index, 1);
    }

    /**
     * Iterate through the list of custom ABR rules and find the right rule by name
     * @param {string} rulename
     * @return {number} rule number
     */
    function _findAbrCustomRuleIndex(rulename) {
        let i;
        for (i = 0; i < customAbrRules.length; i++) {
            if (customAbrRules[i].rulename === rulename) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Add a custom ABR Rule
     * Rule will be apply on next stream if a stream is being played
     *
     * @param {string} type - rule type (one of ['qualitySwitchRules','abandonFragmentRules'])
     * @param {string} rulename - name of rule (used to identify custom rule). If one rule of same name has been added, then existing rule will be updated
     * @param {object} rule - the rule object instance
     * @throws {@link Constants#BAD_ARGUMENT_ERROR BAD_ARGUMENT_ERROR} if called with invalid arguments.
     */
    function addAbrCustomRule(type, rulename, rule) {
        if (typeof type !== 'string' || (type !== ABRRulesCollection.ABANDON_FRAGMENT_RULES && type !== ABRRulesCollection.QUALITY_SWITCH_RULES) ||
            typeof rulename !== 'string') {
            throw Constants.BAD_ARGUMENT_ERROR;
        }
        let index = _findAbrCustomRuleIndex(rulename);
        if (index === -1) {
            // add rule
            customAbrRules.push({
                type: type,
                rulename: rulename,
                rule: rule
            });
        } else {
            // update rule
            customAbrRules[index].type = type;
            customAbrRules[index].rule = rule;
        }
    }

    /**
     * Remove a custom ABR Rule
     *
     * @param {string} rulename - name of the rule to be removed
     */
    function removeAbrCustomRule(rulename) {
        if (rulename) {
            let index = _findAbrCustomRuleIndex(rulename);
            //if no rulename custom rule has been found, do nothing
            if (index !== -1) {
                // remove rule
                customAbrRules.splice(index, 1);
            }
        } else {
            //if no rulename is defined, remove all ABR custome rules
            customAbrRules = [];
        }
    }

    /**
     * Remove all custom rules
     */
    function removeAllAbrCustomRule() {
        customAbrRules = [];
    }

    /**
     * Return all ABR custom rules
     * @return {array}
     */
    function getAbrCustomRules() {
        return customAbrRules;
    }


    /**
     * Add a UTC timing source at the top of the list
     * @param {string} schemeIdUri
     * @param {string} value
     */
    function addUTCTimingSource(schemeIdUri, value) {
        removeUTCTimingSource(schemeIdUri, value); //check if it already exists and remove if so.
        let vo = new UTCTiming();
        vo.schemeIdUri = schemeIdUri;
        vo.value = value;
        utcTimingSources.push(vo);
    }

    /**
     * Return all UTC timing sources
     * @return {array}
     */
    function getUTCTimingSources() {
        return utcTimingSources;
    }

    /**
     * Remove a specific timing source from the array
     * @param {string} schemeIdUri
     * @param {string} value
     */
    function removeUTCTimingSource(schemeIdUri, value) {
        checkParameterType(schemeIdUri, 'string');
        checkParameterType(value, 'string');
        utcTimingSources.forEach(function (obj, idx) {
            if (obj.schemeIdUri === schemeIdUri && obj.value === value) {
                utcTimingSources.splice(idx, 1);
            }
        });
    }

    /**
     * Remove all timing sources
     */
    function clearDefaultUTCTimingSources() {
        utcTimingSources = [];
    }

    /**
     * Add the default timing source to the list
     */
    function restoreDefaultUTCTimingSources() {
        let defaultUtcTimingSource = settings.get().streaming.utcSynchronization.defaultTimingSource;
        addUTCTimingSource(defaultUtcTimingSource.scheme, defaultUtcTimingSource.value);
    }

    function setXHRWithCredentialsForType(type, value) {
        if (!type) {
            Object.keys(xhrWithCredentials).forEach(key => {
                setXHRWithCredentialsForType(key, value);
            });
        } else {
            xhrWithCredentials[type] = !!value;
        }
    }

    function getXHRWithCredentialsForType(type) {
        const useCreds = xhrWithCredentials[type];

        return useCreds === undefined ? xhrWithCredentials.default : useCreds;
    }

    instance = {
        getCustomInitialTrackSelectionFunction,
        setCustomInitialTrackSelectionFunction,
        resetCustomInitialTrackSelectionFunction,
        getLicenseResponseFilters,
        getLicenseRequestFilters,
        getCustomCapabilitiesFilters,
        registerCustomCapabilitiesFilter,
        registerLicenseResponseFilter,
        registerLicenseRequestFilter,
        unregisterCustomCapabilitiesFilter,
        unregisterLicenseResponseFilter,
        unregisterLicenseRequestFilter,
        addAbrCustomRule,
        removeAllAbrCustomRule,
        removeAbrCustomRule,
        getAbrCustomRules,
        addUTCTimingSource,
        removeUTCTimingSource,
        getUTCTimingSources,
        clearDefaultUTCTimingSources,
        restoreDefaultUTCTimingSources,
        setXHRWithCredentialsForType,
        getXHRWithCredentialsForType,
        setConfig,
        reset
    };

    setup();

    return instance;
}

CustomParametersModel.__dashjs_factory_name = 'CustomParametersModel';
export default FactoryMaker.getSingletonFactory(CustomParametersModel);
