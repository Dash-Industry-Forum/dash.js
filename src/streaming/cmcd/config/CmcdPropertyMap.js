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

import Constants from '../../constants/Constants.js';

/**
 * @module CmcdPropertyMap
 * @description Declarative configuration for CMCD property mappings.
 *
 * Maps logical property names to physical paths in different sources (manifest, settings)
 * with version awareness, priority-based fallback, and optional transformations.
 *
 * This centralized configuration allows handling structure changes in CMCD settings
 * without modifying business logic across the codebase.
 *
 * @typedef {Object} PropertySource
 * @property {string} path - Dot-notation path to property (e.g., 'settings.streaming.cmcd.version')
 * @property {number} priority - Order of precedence (1 = highest)
 * @property {string} [type] - Expected data type ('string', 'number', 'boolean', 'array', 'object')
 * @property {Function} [transform] - Optional transformation function
 * @property {*} [default] - Default value if not found
 * @property {boolean} [deprecated] - Mark as deprecated for backward compatibility
 *
 * @typedef {Object} PropertyMapping
 * @property {number[]} [version] - CMCD versions this mapping applies to (omit for all versions)
 * @property {PropertySource[]} sources - Ordered list of sources to check
 */

/**
 * Property mappings for CMCD configuration
 * @type {Object.<string, PropertyMapping>}
 */
const CmcdPropertyMap = {
    /**
     * CMCD version number
     * Priority: manifest > settings > default (1)
     */
    version: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.version',
                priority: 1,
                type: 'number'
            },
            {
                path: 'settings.streaming.cmcd.version',
                priority: 2,
                type: 'number',
                default: Constants.CMCD_DEFAULT_VERSION
            }
        ]
    },

    /**
     * CMCD enabled flag
     * Note: This only exists in player settings, not in manifest.
     * Manifest presence (CMCDParameters tag) implies enabled=true.
     * Priority: settings > default (false)
     */
    enabled: {
        version: [1, 2],
        sources: [
            {
                path: 'settings.streaming.cmcd.enabled',
                priority: 1,
                type: 'boolean',
                default: false
            }
        ]
    },

    /**
     * Session ID (sid)
     * Priority: manifest > settings > null
     */
    sessionID: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.sessionID',
                priority: 1,
                type: 'string'
            },
            {
                path: 'settings.streaming.cmcd.sid',
                priority: 2,
                type: 'string',
                default: null
            }
        ]
    },

    /**
     * Content ID (cid)
     * Priority: manifest > settings > null
     */
    contentID: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.contentID',
                priority: 1,
                type: 'string'
            },
            {
                path: 'settings.streaming.cmcd.cid',
                priority: 2,
                type: 'string',
                default: null
            }
        ]
    },

    /**
     * Transmission mode (query, header, body)
     * Priority: manifest > settings > default (query)
     *
     * V1: Single global mode
     * V2: Can be per-target or global
     */
    mode: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.mode',
                priority: 1,
                type: 'string'
            },
            {
                path: 'settings.streaming.cmcd.mode',
                priority: 2,
                type: 'string',
                default: Constants.CMCD_MODE_QUERY
            }
        ]
    },

    /**
     * Requested throughput (rtp)
     * Priority: settings > null (calculated dynamically if null)
     */
    rtp: {
        version: [1, 2],
        sources: [
            {
                path: 'settings.streaming.cmcd.rtp',
                priority: 1,
                type: 'number',
                default: null
            }
        ]
    },

    /**
     * RTP safety factor for throughput calculation
     * Priority: settings > default (5)
     */
    rtpSafetyFactor: {
        version: [1, 2],
        sources: [
            {
                path: 'settings.streaming.cmcd.rtpSafetyFactor',
                priority: 1,
                type: 'number',
                default: 5
            }
        ]
    },

    /**
     * Global enabled CMCD keys
     * Priority: manifest > settings > default (all keys)
     *
     * Note: In V1, this is a global setting.
     * In V2, keys can be per-target (see targetKeys), and this serves as a fallback.
     */
    keys: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.keys',
                priority: 1,
                type: 'array',
                transform: (val) => {
                    // If string with spaces, split into array
                    if (typeof val === 'string') {
                        return val.split(' ');
                    }
                    return val;
                }
            },
            {
                path: 'settings.streaming.cmcd.enabledKeys',
                priority: 2,
                type: 'array',
                default: Constants.CMCD_KEYS
            }
        ]
    },

    /**
     * Request types to include CMCD data in
     * Priority: manifest > settings > default (['segment', 'mpd'])
     */
    includeRequestTypes: {
        version: [1, 2],
        sources: [
            {
                path: 'manifestParams.includeInRequests',
                priority: 1,
                type: 'array',
                transform: (val) => {
                    // If string with spaces, split into array
                    if (typeof val === 'string') {
                        return val.split(' ');
                    }
                    return val;
                }
            },
            {
                path: 'settings.streaming.cmcd.includeRequestTypes',
                priority: 2,
                type: 'array',
                default: ['segment', 'mpd']
            }
        ]
    },

    /**
     * Apply CMCD parameters from MPD manifest
     * Priority: settings > default (true)
     */
    applyParametersFromMpd: {
        version: [1, 2],
        sources: [
            {
                path: 'settings.streaming.cmcd.applyParametersFromMpd',
                priority: 1,
                type: 'boolean',
                default: true
            }
        ]
    },

    /**
     * V2: Reporting eventTargets array
     * Priority: settings > default ([])
     */
    eventTargets: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets',
                priority: 1,
                type: 'array',
                default: []
            }
        ]
    },

    /**
     * V2: Target enabled flag
     * Note: This is target-specific, requires context
     */
    targetEnabled: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].enabled',
                priority: 1,
                type: 'boolean',
                default: true
            }
        ]
    },

    /**
     * V2: Target URL for event reporting
     * Note: This is target-specific, requires context
     */
    targetUrl: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].url',
                priority: 1,
                type: 'string',
                default: null
            }
        ]
    },

    /**
     * V2: Target enabled keys (can override global keys)
     * Note: This is target-specific, requires context
     */
    targetKeys: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].enabledKeys',
                priority: 1,
                type: 'array',
                default: []
            }
        ]
    },

    /**
     * V2: Target events to report
     * Note: This is target-specific, requires context
     */
    targetEvents: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].events',
                priority: 1,
                type: 'array',
                default: []
            }
        ]
    },

    /**
     * V2: Target time interval for periodic reporting
     * Note: This is target-specific, requires context
     */
    targetInterval: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].interval',
                priority: 1,
                type: 'number',
                default: Constants.CMCD_DEFAULT_TIME_INTERVAL
            }
        ]
    },

    /**
     * V2: Target batch size for batched reporting
     * Note: This is target-specific, requires context
     */
    targetBatchSize: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].batchSize',
                priority: 1,
                type: 'number',
                default: 0
            }
        ]
    },

    /**
     * V2: Target includeRequestTypes filter
     * Note: This is target-specific, requires context
     */
    targetIncludeRequestTypes: {
        version: [2],
        sources: [
            {
                path: 'settings.streaming.cmcd.eventTargets[{targetIndex}].includeRequestTypes',
                priority: 1,
                type: 'array'
            },
            {
                path: 'manifestParams.includeInRequests',
                priority: 2,
                type: 'array',
                transform: (val) => {
                    if (typeof val === 'string') {
                        return val.split(' ');
                    }
                    return val;
                }
            },
            {
                path: 'settings.streaming.cmcd.includeRequestTypes',
                priority: 3,
                type: 'array',
                default: ['segment', 'mpd']
            }
        ]
    }
};

export default CmcdPropertyMap;
