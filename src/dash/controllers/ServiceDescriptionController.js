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
import Constants from '../../streaming/constants/Constants';
import DashConstants from '../constants/DashConstants';

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
        prftOffsets,
        logger,
        adapter;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function setConfig(config) {
        if (!config) return;

        if (config.adapter) {
            adapter = config.adapter;
        }
    }

    function reset() {
        _resetInitialSettings();
    }

    function _resetInitialSettings() {
        serviceDescriptionSettings = {
            liveDelay: NaN,
            liveCatchup: {
                maxDrift: NaN,
                playbackRate: {
                    min: NaN,
                    max: NaN
                },
            },
            minBitrate: {},
            maxBitrate: {},
            initialBitrate: {}
        };
        prftOffsets = [];
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

        const supportedServiceDescriptions = manifestInfo.serviceDescriptions.filter(sd => SUPPORTED_SCHEMES.includes(sd.schemeIdUri));
        const allClientsServiceDescriptions = manifestInfo.serviceDescriptions.filter(sd => sd.schemeIdUri == null);
        let sd = (supportedServiceDescriptions.length > 0)
            ? supportedServiceDescriptions[supportedServiceDescriptions.length - 1]
            : allClientsServiceDescriptions[allClientsServiceDescriptions.length - 1];
        if (!sd) return;

        if (sd.latency && sd.latency.target > 0) {
            _applyServiceDescriptionLatency(sd);
        }

        if (sd.playbackRate) {
            _applyServiceDescriptionPlaybackRate(sd);
        }

        if (sd.operatingQuality) {
            _applyServiceDescriptionOperatingQuality(sd);
        }

        if (sd.operatingBandwidth) {
            _applyServiceDescriptionOperatingBandwidth(sd);
        }
    }

    /**
     * Adjust the latency targets for the service.
     * @param {object} sd - service description element
     * @private
     */
    function _applyServiceDescriptionLatency(sd) {
        let params;

        if (sd.schemeIdUri === Constants.SERVICE_DESCRIPTION_DVB_LL_SCHEME) {
            params = _getDvbServiceDescriptionLatencyParameters(sd);
        } else {
            params = _getStandardServiceDescriptionLatencyParameters(sd);
        }

        if (prftOffsets.length > 0) {
            let { to, id } = _calculateTimeOffset(params);

            // TS 103 285 Clause 10.20.4. 3) Subtract calculated offset from Latency@target converted from milliseconds
            // liveLatency does not consider ST@availabilityTimeOffset so leave out that step
            // Since maxDrift is a difference rather than absolute it does not need offset applied
            serviceDescriptionSettings.liveDelay = params.liveDelay - to;
            serviceDescriptionSettings.liveCatchup.maxDrift = params.maxDrift;

            logger.debug(`
                Found latency properties coming from service description. Applied time offset of ${to} from ProducerReferenceTime element with id ${id}.
                Live Delay: ${params.liveDelay - to}, Live catchup max drift: ${params.maxDrift}
            `);
        } else {
            serviceDescriptionSettings.liveDelay = params.liveDelay;
            serviceDescriptionSettings.liveCatchup.maxDrift = params.maxDrift;

            logger.debug(`Found latency properties coming from service description: Live Delay: ${params.liveDelay}, Live catchup max drift: ${params.maxDrift}`);
        }
    }

    /**
     * Get default parameters for liveDelay,maxDrift
     * @param {object} sd
     * @return {{maxDrift: (number|undefined), liveDelay: number, referenceId: (number|undefined)}}
     * @private
     */
    function _getStandardServiceDescriptionLatencyParameters(sd) {
        const liveDelay = sd.latency.target / 1000;
        let maxDrift = !isNaN(sd.latency.max) && sd.latency.max > sd.latency.target ? (sd.latency.max - sd.latency.target + 500) / 1000 : NaN;
        const referenceId = sd.latency.referenceId || NaN;

        return {
            liveDelay,
            maxDrift,
            referenceId
        }
    }

    /**
     * Get DVB DASH parameters for liveDelay,maxDrift
     * @param sd
     * @return {{maxDrift: (number|undefined), liveDelay: number, referenceId: (number|undefined)}}
     * @private
     */
    function _getDvbServiceDescriptionLatencyParameters(sd) {
        const liveDelay = sd.latency.target / 1000;
        let maxDrift = !isNaN(sd.latency.max) && sd.latency.max > sd.latency.target ? (sd.latency.max - sd.latency.target + 500) / 1000 : NaN;
        const referenceId = sd.latency.referenceId || NaN;

        return {
            liveDelay,
            maxDrift,
            referenceId
        }
    }

    /**
     * Adjust the playback rate targets for the service
     * @param {object} sd
     * @private
     */
    function _applyServiceDescriptionPlaybackRate(sd) {
        // Convert each playback rate into a difference from 1. i.e 0.8 becomes -0.2.
        const min = sd.playbackRate.min ? (Math.round((sd.playbackRate.min - 1.0) * 1000) / 1000) : NaN;
        const max = sd.playbackRate.max ? (Math.round((sd.playbackRate.max - 1.0) * 1000) / 1000) : NaN;
        serviceDescriptionSettings.liveCatchup.playbackRate.min = min;
        serviceDescriptionSettings.liveCatchup.playbackRate.max = max;

        logger.debug(`Found latency properties coming from service description: Live catchup min playback rate: ${min}`);
        logger.debug(`Found latency properties coming from service description: Live catchup max playback rate: ${max}`);
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

    /**
     * Returns the current calculated time offsets based on ProducerReferenceTime elements
     * @returns {array}
     */
    function getProducerReferenceTimeOffsets() {
        return prftOffsets;
    }

    /**
     * Calculates an array of time offsets each with matching ProducerReferenceTime id.
     * Call before applyServiceDescription if producer reference time elements should be considered.
     * @param {array} streamInfos
     * @returns {array}
     * @private
     */
    function calculateProducerReferenceTimeOffsets(streamInfos) {
        try {
            let timeOffsets = [];
            if (streamInfos && streamInfos.length > 0) {
                const mediaTypes = [Constants.VIDEO, Constants.AUDIO, Constants.TEXT];
                const astInSeconds = adapter.getAvailabilityStartTime() / 1000;

                streamInfos.forEach((streamInfo) => {
                    const offsets = mediaTypes
                        .reduce((acc, mediaType) => {
                            acc = acc.concat(adapter.getAllMediaInfoForType(streamInfo, mediaType));
                            return acc;
                        }, [])
                        .reduce((acc, mediaInfo) => {
                            const prts = adapter.getProducerReferenceTimes(streamInfo, mediaInfo);
                            prts.forEach((prt) => {
                                const voRepresentations = adapter.getVoRepresentations(mediaInfo);
                                if (voRepresentations && voRepresentations.length > 0 && voRepresentations[0].adaptation && voRepresentations[0].segmentInfoType === DashConstants.SEGMENT_TEMPLATE) {
                                    const voRep = voRepresentations[0];
                                    const d = new Date(prt[DashConstants.WALL_CLOCK_TIME]);
                                    const wallClockTime = d.getTime() / 1000;
                                    // TS 103 285 Clause 10.20.4
                                    // 1) Calculate PRT0
                                    // i) take the PRT@presentationTime and subtract any ST@presentationTimeOffset
                                    // ii) convert this time to seconds by dividing by ST@timescale
                                    // iii) Add this to start time of period that contains PRT.
                                    // N.B presentationTimeOffset is already divided by timescale at this point
                                    const prt0 = wallClockTime - (((prt[DashConstants.PRESENTATION_TIME] / voRep[DashConstants.TIMESCALE]) - voRep[DashConstants.PRESENTATION_TIME_OFFSET]) + streamInfo.start);
                                    // 2) Calculate TO between PRT at the start of MPD timeline and the AST
                                    const to = astInSeconds - prt0;
                                    // 3) Not applicable as liveLatency does not consider ST@availabilityTimeOffset
                                    acc.push({ id: prt[DashConstants.ID], to });
                                }
                            });
                            return acc;
                        }, [])

                    timeOffsets = timeOffsets.concat(offsets);
                })
            }
            prftOffsets = timeOffsets;
        } catch (e) {
            logger.error(e);
            prftOffsets = [];
        }
    };

    /**
     * Calculates offset to apply to live delay as described in TS 103 285 Clause 10.20.4
     * @param {object} sdLatency - service description latency element
     * @returns {number}
     * @private
     */
    function _calculateTimeOffset(sdLatency) {
        let to = 0, id;
        let offset = prftOffsets.filter(prt => {
            return prt.id === sdLatency.referenceId;
        });

        // If only one ProducerReferenceTime to generate one TO, then use that regardless of matching ids
        if (offset.length === 0) {
            to = (prftOffsets.length > 0) ? prftOffsets[0].to : 0;
            id = prftOffsets[0].id || NaN;
        } else {
            // If multiple id matches, use the first but this should be invalid
            to = offset[0].to || 0;
            id = offset[0].id || NaN;
        }

        return { to, id }
    }

    instance = {
        getServiceDescriptionSettings,
        getProducerReferenceTimeOffsets,
        calculateProducerReferenceTimeOffsets,
        applyServiceDescription,
        reset,
        setConfig
    };

    setup();

    return instance;
}

ServiceDescriptionController.__dashjs_factory_name = 'ServiceDescriptionController';
export default FactoryMaker.getSingletonFactory(ServiceDescriptionController);
