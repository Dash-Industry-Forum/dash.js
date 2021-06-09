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

function LowLatencyThroughputModel() {

    const LLTM_MAX_MEASUREMENTS = 10;
    // factor (<1) is used to reduce the real needed download time when at very bleeding live edge
    const LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR = 0.7;

    let dashMetrics;

    let instance;
    let measurements = {};

    /**
     *
     * @param {*} config
     */
    function setConfig(config) {
        dashMetrics = config.dashMetrics;
    }

    /**
     *
     * @param {*} request
     * @returns
     */
    function getEstimatedDownloadDurationMS(request) {
        const lastMeasurement = measurements[request.mediaType].slice(-1).pop();

        // fetch duration was longer than segment duration? 
        if (lastMeasurement.segDurationMS < lastMeasurement.fetchDownloadDurationMS) {
            console.log(1);

            return lastMeasurement.fetchDownloadDurationMS;
        }

        // we have requested a fully available segment -> most accurate throughput calculation
        // this usually happens at startup
        // ... and if requests are delayed artificially
        if (lastMeasurement.ast <= lastMeasurement.requestTime - lastMeasurement.segDurationMS) {
            console.log(2);

            return lastMeasurement.fetchDownloadDurationMS;
        }

        // get all chunks that have been downloaded before fetch reached bleeding live edge
        // the remaining chunks loaded at production rate we will approximated
        const chunkAvailabePeriod = lastMeasurement.requestTime - lastMeasurement.ast;
        let chunkBytesBBLE = 0; // BBLE -> Before bleeding live edge
        let chunkDownloadtimeMSBBLE = 0;
        let chunkCount = 0;
        for (let index = 0; index < lastMeasurement.measurement.length; index++) {
            const chunk = lastMeasurement.measurement[index];
            if (chunkAvailabePeriod < chunkDownloadtimeMSBBLE + chunk.dur) {
                break;
            }
            chunkDownloadtimeMSBBLE += chunk.dur;
            chunkBytesBBLE += chunk.bytes;
            chunkCount++;
        }
        // there have to be some chunks available (20% of max count)
        // otherwise we are at bleeding live edge and the few chunks are insufficient to estimate correctly
        if (chunkBytesBBLE && chunkDownloadtimeMSBBLE && chunkCount > lastMeasurement.measurement.length * 0.2) {
            const downloadThroughput = chunkBytesBBLE / chunkDownloadtimeMSBBLE; // bytes per millesecond
            const estimatedDownloadtimeMS = lastMeasurement.bytes / downloadThroughput;
            // if real download was shorter then report this incl. semi optimistical estimate factor
            if (lastMeasurement.fetchDownloadDurationMS < estimatedDownloadtimeMS) {
                console.log(3);

                return lastMeasurement.fetchDownloadDurationMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
            }
            console.log(4);

            return estimatedDownloadtimeMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
        }

        lastMeasurement.bufferLevelBLE = dashMetrics.getCurrentBufferLevel(lastMeasurement.mediaType);

        // when we are to tight at live edge and it's stable then
        // we start to optimistically estimate download time
        // in such a way that a switch to next rep will be possible
        const lastThree = measurements[request.mediaType].slice(-3);
        if (lastThree.length < 3 || lastThree.some(m => !m.bufferLevelBLE || m.bufferLevelBLE < 0.8)) {
            // semi optimistical estimate factor
            return lastMeasurement.fetchDownloadDurationMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
        }
        // optimistical estimate: assume download was fast enough for next higher rendition 
        let nextHigherBitrate = lastMeasurement.bitrate;
        lastMeasurement.bitrateList.some(b => {
            if (b.bandwidth > lastMeasurement.bitrate) {
                nextHigherBitrate = b.bandwidth;
                return true;
            }
        });
        // already highest bitrate?
        if (nextHigherBitrate === lastMeasurement.bitrate) {
            return lastMeasurement.fetchDownloadDurationMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
        }
        return LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR * lastMeasurement.bytes * 8 * 1000 / nextHigherBitrate;
    }

    /**
     * Get calculated value to artificially and safely delay the next request to allow to accumulate some chunks
     * This allows better line throughput measurement
     * @param {*} request
     * @returns
     */
    function getThroughputCapacityDelay(request) {
        // TODO: this concept is under construction
        if (request) {
            return 0;
        }
        return 0;
    }

    /**
     * Add some measurement data for bookkeeping and being able to derive decisions on estimated throughput.
     * @param {*} request
     * @param {*} fetchDownloadDurationMS
     * @param {*} measurement
     * @param {*} requestTime
     * @param {*} throughputCapacityDelayMS
     */
    function addMeasurement(request, fetchDownloadDurationMS, measurement, requestTime, throughputCapacityDelayMS) {
        if (request && request.mediaType && !measurements[request.mediaType]) {
            measurements[request.mediaType] = [];
        }
        const bitrateEntry = request.mediaInfo.bitrateList.find(item => item.id === request.representationId);
        measurements[request.mediaType].push({
            index: request.index,
            repId: request.representationId,
            mediaType: request.mediaType,
            requestTime,
            ast: request.availabilityStartTime.getTime(),
            segDurationMS: request.duration * 1000,
            chunksDurationMS: measurement.reduce((prev, curr) => prev + curr.dur, 0),
            bytes: measurement.reduce((prev, curr) => prev + curr.bytes, 0),
            bitrate: bitrateEntry && bitrateEntry.bandwidth,
            bitrateList: request.mediaInfo.bitrateList,
            measurement,
            fetchDownloadDurationMS,
            throughputCapacityDelayMS
        });
        // maintain only a maximum amount of most recent measurements
        if (measurements[request.mediaType].length > LLTM_MAX_MEASUREMENTS) {
            measurements[request.mediaType].shift();
        }
    }

    instance = {
        setConfig,
        addMeasurement,
        getThroughputCapacityDelay,
        getEstimatedDownloadDurationMS
    };

    return instance;
}

LowLatencyThroughputModel.__dashjs_factory_name = 'LowLatencyThroughputModel';
export default FactoryMaker.getSingletonFactory(LowLatencyThroughputModel);