/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2024, Dash Industry Forum.
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

import FactoryMaker from '../../../core/FactoryMaker.js';
import CmcdPropertyMap from './CmcdPropertyMap.js';
import Settings from '../../../core/Settings.js';
import Constants from '../../constants/Constants.js';

/**
 * @module CmcdConfigAccessor
 * @description Provides unified access to CMCD configuration properties.
 *
 * This accessor abstracts away the differences between:
 * - Player settings (settings.get().streaming.cmcd)
 * - Manifest parameters (CMCDParameters from MPD)
 * - CMCD versions (v1 and v2)
 *
 * It uses CmcdPropertyMap for declarative configuration and provides
 * a version-agnostic API for accessing CMCD properties with automatic
 * fallback resolution.
 *
 * @example
 * const cmcdConfig = CmcdConfigAccessor(context).getInstance();
 * cmcdConfig.setManifestParams(manifestParams);
 *
 * const version = cmcdConfig.getVersion();        // 1 or 2
 * const keys = cmcdConfig.get('keys');            // Resolves with fallback
 * const isEnabled = cmcdConfig.isEnabled();       // Boolean
 *
 * @ignore
 */
function CmcdConfigAccessor() {
    let instance;
    let settings;
    let manifestParams;
    let manifestParamsProvider;

    const context = this.context;

    /**
     * Initialize the accessor
     * @private
     */
    function setup() {
        settings = Settings(context).getInstance();
        manifestParams = null;
        manifestParamsProvider = null;
    }

    /**
     * Set a provider function for live access to manifest params
     * This enables lazy loading of CMCDParameters, resolving timing issues
     * where params are needed before they're available in the manifest
     *
     * @param {Function} providerFn - Function that returns CMCDParameters object or null
     * @public
     *
     * @example
     * cmcdConfig.setManifestParamsProvider(() => {
     *   return serviceDescriptionController.getServiceDescriptionSettings()
     *     ?.clientDataReporting?.cmcdParameters || null;
     * });
     */
    function setManifestParamsProvider(providerFn) {
        manifestParamsProvider = providerFn;
    }

    /**
     * Get CMCDParameters from the provider function
     * @returns {Object|null} CMCDParameters or null if provider not set or returns nothing
     * @private
     */
    function _getManifestParamsFromProvider() {
        if (typeof manifestParamsProvider !== 'function') {
            return null;
        }
        try {
            return manifestParamsProvider();
        } catch (e) {
            // Provider not ready yet or threw an error
            return null;
        }
    }

    /**
     * Get the effective manifest params (live from provider, or cached)
     * Prefers live access from provider when available
     * @returns {Object|null} CMCDParameters
     * @private
     */
    function _getEffectiveManifestParams() {
        // Try live access first (resolves timing issues)
        const liveParams = _getManifestParamsFromProvider();
        if (liveParams && Object.keys(liveParams).length > 0) {
            return liveParams;
        }
        // Fall back to cached params
        return manifestParams;
    }

    /**
     * Set manifest parameters from MPD CMCDParameters
     * @param {Object} params - CMCDParameters from manifest
     * @public
     */
    function setManifestParams(params) {
        manifestParams = params;
    }

    /**
     * Detect the CMCD version from available sources
     * Priority: manifest > settings > default (1)
     * @returns {number} CMCD version (1 or 2)
     * @private
     */
    function _detectVersion() {
        // Check manifest parameters first (use live access for timing safety)
        const effectiveManifestParams = _getEffectiveManifestParams();
        if (effectiveManifestParams && effectiveManifestParams.version) {
            return parseInt(effectiveManifestParams.version, 10);
        }

        // Check settings (don't cache - settings can change dynamically)
        const cmcdSettings = settings.get().streaming.cmcd;
        if (cmcdSettings && cmcdSettings.version) {
            return parseInt(cmcdSettings.version, 10);
        }

        // Default
        return Constants.CMCD_DEFAULT_VERSION;
    }

    /**
     * Resolve a dot-notation path in an object with support for array notation and context variables
     * @param {Object} obj - Object to traverse
     * @param {string} path - Dot-notation path (e.g., 'streaming.cmcd.version' or 'targets[0].mode')
     * @param {Object} pathContext - Context variables for path interpolation (e.g., {targetIndex: 0})
     * @returns {*} Resolved value or undefined
     * @private
     *
     * @example
     * // Simple path
     * _resolvePath(obj, 'settings.streaming.cmcd.version')
     *
     * // Array notation
     * _resolvePath(obj, 'settings.streaming.cmcd.targets[0].url')
     *
     * // Context variables
     * _resolvePath(obj, 'settings.streaming.cmcd.targets[{targetIndex}].url', {targetIndex: 0})
     */
    function _resolvePath(obj, path, pathContext = {}) {
        if (!obj || !path) {
            return undefined;
        }

        // Replace contextual variables in the path
        // Example: 'targets[{targetIndex}].mode' with {targetIndex: 0} -> 'targets[0].mode'
        let resolvedPath = path;
        for (const [key, value] of Object.entries(pathContext)) {
            resolvedPath = resolvedPath.replace(`{${key}}`, value);
        }

        // Split path by dots
        const parts = resolvedPath.split('.');
        let current = obj;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (current === null || current === undefined) {
                return undefined;
            }

            // Handle array notation: targets[0]
            const arrayMatch = part.match(/^([^\[]+)\[(\d+)\]$/);

            if (arrayMatch) {
                const [, arrayName, arrayIndex] = arrayMatch;

                // First get the array
                current = current[arrayName];

                // Check if it's actually an array
                if (!Array.isArray(current)) {
                    return undefined;
                }

                // Then access the specific index
                const index = parseInt(arrayIndex, 10);
                current = current[index];
            } else {
                // Normal property access
                current = current[part];
            }
        }

        return current;
    }

    /**
     * Get the available data context for property resolution
     * @returns {Object} Context object with settings and manifestParams
     * @private
     */
    function _getContext() {
        return {
            settings: settings.get(),
            manifestParams: _getEffectiveManifestParams() || {}
        };
    }

    /**
     * Get a CMCD property value with automatic fallback resolution
     * @param {string} property - Property name from CmcdPropertyMap
     * @param {Object} options - Optional configuration
     * @param {*} options.defaultValue - Override default value
     * @param {number} options.targetIndex - Target index for V2 contextual properties
     * @returns {*} Property value or default
     * @public
     */
    function get(property, options = {}) {
        const propertyMapping = CmcdPropertyMap[property];

        if (!propertyMapping) {
            return options.defaultValue !== undefined ? options.defaultValue : undefined;
        }

        const version = _detectVersion();
        const context = _getContext();

        // Check if this mapping applies to the current version
        if (propertyMapping.version && !propertyMapping.version.includes(version)) {
            return options.defaultValue !== undefined ? options.defaultValue : undefined;
        }

        // Build path context for interpolation (e.g., {targetIndex: 0})
        const pathContext = {};
        if (options.targetIndex !== undefined) {
            pathContext.targetIndex = options.targetIndex;
        }

        // Check if we should skip manifest params (avoid circular dependency by checking settings directly)
        const applyParametersFromMpd = property === 'applyParametersFromMpd' ? true :
            (context.settings?.streaming?.cmcd?.applyParametersFromMpd ?? true);

        // Sort sources by priority (lower number = higher priority)
        const sortedSources = [...propertyMapping.sources].sort((a, b) => a.priority - b.priority);

        // First pass: Try to find an actual value from any source
        for (const source of sortedSources) {
            // Skip manifestParams sources if applyParametersFromMpd is false
            if (!applyParametersFromMpd && source.path.startsWith('manifestParams')) {
                continue;
            }

            const value = _resolvePath(context, source.path, pathContext);

            // Check if value exists and is not null/undefined
            if (value !== null && value !== undefined) {
                // Apply transformation if provided
                if (typeof source.transform === 'function') {
                    return source.transform(value);
                }

                return value;
            }
        }

        // Second pass: If no actual value found, look for the highest-priority default
        for (const source of sortedSources) {
            // Skip manifestParams sources if applyParametersFromMpd is false
            if (!applyParametersFromMpd && source.path.startsWith('manifestParams')) {
                continue;
            }

            if (source.default !== undefined) {
                return source.default;
            }
        }

        // No value or default found in any source, return override default or undefined
        return options.defaultValue !== undefined ? options.defaultValue : undefined;
    }

    /**
     * Check if a property has a non-null/undefined value
     * @param {string} property - Property name from CmcdPropertyMap
     * @returns {boolean} True if property has a value
     * @public
     */
    function has(property) {
        const value = get(property);
        return value !== null && value !== undefined;
    }

    /**
     * Get the detected CMCD version
     * @returns {number} CMCD version (1 or 2)
     * @public
     */
    function getVersion() {
        return _detectVersion();
    }

    /**
     * Check if CMCD is enabled
     *
     * CMCD is considered enabled if:
     * 1. Manifest has CMCDParameters configured (presence implies enabled), OR
     * 2. Player settings explicitly set enabled: true
     *
     * Note: 'enabled' attribute does not exist in the manifest standard,
     * only in player configuration.
     *
     * @returns {boolean} True if CMCD is enabled
     * @public
     */
    function isEnabled() {
        // Use live access to manifest params (resolves timing issues)
        const effectiveManifestParams = _getEffectiveManifestParams();
        if (effectiveManifestParams && effectiveManifestParams.version) {
            return true;
        }

        // Fall back to player settings configuration
        return get('enabled') === true;
    }

    /**
     * Reset the accessor state
     * @public
     */
    function reset() {
        manifestParams = null;
        manifestParamsProvider = null;
    }

    /**
     * Get the array of reporting targets (V2 only)
     * @returns {Array} Array of target objects, empty array if V1 or no targets
     * @public
     *
     * @example
     * const targets = cmcdConfig.getTargets();
     * targets.forEach((target, index) => {
     *   const targetAccessor = cmcdConfig.getTarget(index);
     *   const keys = targetAccessor.get('targetKeys');
     * });
     */
    function getTargets() {
        const version = _detectVersion();

        // Only V2 supports targets
        if (version !== 2) {
            return [];
        }

        const targets = get('targets');
        return Array.isArray(targets) ? targets : [];
    }

    /**
     * Get a target accessor for a specific target index (V2 only)
     * @param {number} index - Target index
     * @returns {Object|null} Target accessor object or null if invalid index
     * @public
     *
     * @example
     * const target = cmcdConfig.getTarget(0);
     * if (target) {
     *   const url = target.get('targetUrl');
     *   const keys = target.get('targetKeys');
     *   const events = target.get('targetEvents');
     * }
     */
    function getTarget(index) {
        const targets = getTargets();

        // Validate index
        if (index < 0 || index >= targets.length) {
            return null;
        }

        // Return accessor object for this specific target
        return {
            /**
             * Get a target-specific property value
             * @param {string} property - Property name (should be target-specific like 'targetUrl', 'targetKeys', etc.)
             * @returns {*} Property value
             */
            get: (property) => {
                return get(property, { targetIndex: index });
            },

            /**
             * Check if a target-specific property has a value
             * @param {string} property - Property name
             * @returns {boolean} True if property has a value
             */
            has: (property) => {
                const value = get(property, { targetIndex: index });
                return value !== null && value !== undefined;
            },

            /**
             * Target index
             * @type {number}
             */
            index: index,

            /**
             * Raw target object from settings/manifest
             * @type {Object}
             */
            raw: targets[index]
        };
    }

    instance = {
        setManifestParamsProvider,
        setManifestParams,
        get,
        has,
        getVersion,
        isEnabled,
        getTargets,
        getTarget,
        reset
    };

    setup();

    return instance;
}

CmcdConfigAccessor.__dashjs_factory_name = 'CmcdConfigAccessor';
export default FactoryMaker.getSingletonFactory(CmcdConfigAccessor);
