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
import Debug from '../../core/Debug';
import Constants from "../constants/Constants";

const SUPPORTED_SCHEMES = [Constants.SERVICE_DESCRIPTION_DVB_LL_SCHEME];
const MEDIA_TYPES = {
    VIDEO: 'video',
    AUDIO: 'audio',
    ANY: 'any',
    ALL: 'all'
}

function ServiceDescriptionController() {
    const context = this.context;

    let instance,
        serviceDescriptionSettings,
        logger;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function reset() {
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        serviceDescriptionSettings = {
            liveDelay: NaN,
            liveCatchup: {
                maxDrift: NaN,
                playbackRate: NaN
            },
            minBitrate: {},
            maxBitrate: {},
            initialBitrate: {}
        };
    }

    /**
     * Returns the service description settings for latency, catchup and bandwidth
     */
    function getServiceDescriptionSettings() {
        return serviceDescriptionSettings
    }

    /**
     * Check for potential ServiceDescriptor elements in the MPD and update the settings accordingly
     * @param {object} manifestInfo
     * @private
     */
    function applyServiceDescription(manifestInfo) {
        if (!manifestInfo || !manifestInfo.serviceDescriptions) {
            return;
        }

        for (let i = 0; i < manifestInfo.serviceDescriptions.length; i++) {
            const sd = manifestInfo.serviceDescriptions[i];

            if (!sd.schemeIdUri || SUPPORTED_SCHEMES.includes(sd.schemeIdUri)) {

                if (sd.latency && sd.latency.target > 0) {
                    _applyServiceDescriptionLatency(sd);
                }

                if (sd.playbackRate && sd.playbackRate.max > 1.0) {
                    _applyServiceDescriptionPlaybackRate(sd);
                }

                if (sd.operatingQuality) {
                    _applyServiceDescriptionOperatingQuality(sd);
                }

                if (sd.operatingBandwidth) {
                    _applyServiceDescriptionOperatingBandwidth(sd);
                }
            }
        }
    }

    /**
     * Adjust the latency targets for the service.
     * @param {object} sd
     * @private
     */
    function _applyServiceDescriptionLatency(sd) {
        let params;

        if (sd.schemeIdUri === Constants.SERVICE_DESCRIPTION_DVB_LL_SCHEME) {
            params = _getDvbServiceDescriptionLatencyParameters(sd);
        } else {
            params = _getStandardServiceDescriptionLatencyParameters(sd);
        }

        serviceDescriptionSettings.liveDelay = params.liveDelay;
        serviceDescriptionSettings.liveCatchup.maxDrift = params.maxDrift;

        logger.debug(`Found latency properties coming from service description: Live Delay: ${params.liveDelay}, Live catchup max drift: ${params.maxDrift}`);
    }

    /**
     * Get default parameters for liveDelay,maxDrift
     * @param {object} sd
     * @return {{ maxDrift: (number|undefined), liveDelay: number}}
     * @private
     */
    function _getStandardServiceDescriptionLatencyParameters(sd) {
        const liveDelay = sd.latency.target / 1000;
        let maxDrift = !isNaN(sd.latency.max) && sd.latency.max > sd.latency.target ? (sd.latency.max - sd.latency.target + 500) / 1000 : NaN;

        return {
            liveDelay,
            maxDrift
        }
    }

    /**
     * Get DVB DASH parameters for liveDelay,maxDrift
     * @param sd
     * @return {{maxDrift: (number|undefined), liveDelay: number}}
     * @private
     */
    function _getDvbServiceDescriptionLatencyParameters(sd) {
        const liveDelay = sd.latency.target / 1000;
        let maxDrift = !isNaN(sd.latency.max) && sd.latency.max > sd.latency.target ? (sd.latency.max - sd.latency.target + 500) / 1000 : NaN;

        return {
            liveDelay,
            maxDrift
        }
    }

    /**
     * Adjust the playback rate targets for the service
     * @param {object} sd
     * @private
     */
    function _applyServiceDescriptionPlaybackRate(sd) {
        const playbackRate = (Math.round((sd.playbackRate.max - 1.0) * 1000) / 1000)

        serviceDescriptionSettings.liveCatchup.playbackRate = playbackRate;
        logger.debug(`Found latency properties coming from service description: Live catchup playback rate: ${playbackRate}`);

    }

    /**
     * Used to specify a quality ranking. We do not support this yet.
     * @private
     */
    function _applyServiceDescriptionOperatingQuality() {
        return;
    }

    /**
     * Adjust the operating quality targets for the service
     * @param {object} sd
     * @private
     */
    function _applyServiceDescriptionOperatingBandwidth(sd) {

        // Aggregation of media types is not supported yet
        if (!sd || !sd.operatingBandwidth || !sd.operatingBandwidth.mediaType || sd.operatingBandwidth.mediaType === MEDIA_TYPES.ALL) {
            return;
        }

        const params = {};

        params.minBandwidth = sd.operatingBandwidth.min;
        params.maxBandwidth = sd.operatingBandwidth.max;
        params.targetBandwidth = sd.operatingBandwidth.target;

        const mediaTypesToApply = [];

        if (sd.operatingBandwidth.mediaType === MEDIA_TYPES.VIDEO || sd.operatingBandwidth.mediaType === MEDIA_TYPES.AUDIO) {
            mediaTypesToApply.push(sd.operatingBandwidth.mediaType);
        } else if (sd.operatingBandwidth.mediaType === MEDIA_TYPES.ANY) {
            mediaTypesToApply.push(MEDIA_TYPES.AUDIO);
            mediaTypesToApply.push(MEDIA_TYPES.VIDEO);
        }

        mediaTypesToApply.forEach((mediaType) => {

            if (!isNaN(params.minBandwidth)) {
                _updateBandwidthSetting('minBitrate', mediaType, params.minBandwidth);
            }

            if (!isNaN(params.maxBandwidth)) {
                _updateBandwidthSetting('maxBitrate', mediaType, params.maxBandwidth);
            }

            if (!isNaN(params.targetBandwidth)) {
                _updateBandwidthSetting('initialBitrate', mediaType, params.targetBandwidth);
            }
        })
    }

    /**
     * Update the bandwidth settings vor a specific field and media type
     * @param {string} field
     * @param {string} mediaType
     * @param {number} value
     * @private
     */
    function _updateBandwidthSetting(field, mediaType, value) {
        try {
            // Service description values are specified in bps. Settings expect the value in kbps
            serviceDescriptionSettings[field][mediaType] = value / 1000;
        } catch (e) {
            logger.error(e);
        }
    }


    instance = {
        getServiceDescriptionSettings,
        applyServiceDescription,
        reset
    };

    setup();

    return instance;
}

ServiceDescriptionController.__dashjs_factory_name = 'ServiceDescriptionController';
export default FactoryMaker.getSingletonFactory(ServiceDescriptionController);
