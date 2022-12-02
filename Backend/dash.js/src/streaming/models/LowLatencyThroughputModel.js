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
import Debug from '../../core/Debug';
import FactoryMaker from '../../core/FactoryMaker';

function LowLatencyThroughputModel() {

    const LLTM_MAX_MEASUREMENTS = 10;
    // factor (<1) is used to reduce the real needed download time when at very bleeding live edge
    const LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR = 0.8;
    const LLTM_OPTIMISTIC_ESTIMATE_FACTOR = 0.6;

    const LLTM_SLOW_SEGMENT_DOWNLOAD_TOLERANCE = 1.05;
    const LLTM_MAX_DELAY_MS = 250;

    const context = this.context;
    let instance;
    let logger;
    let measurements = {};

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    /**
     * Linear regression with least squares method to get a trend function for buffer lavel at chunk receive timestamps
     * @param {*} chunkMeasurements
     * @returns linear trend function
     */
    function createBufferLevelTrendFunction(chunkMeasurements) {
        const result = {};

        let sumX = 0
        let sumY = 0
        let sumXY = 0
        let sumXSq = 0
        const N = chunkMeasurements.length


        for (var i = 0; i < N; ++i) {
            sumX += chunkMeasurements[i].chunkDownloadTimeRelativeMS;
            sumY += chunkMeasurements[i].bufferLevel;
            sumXY += chunkMeasurements[i].chunkDownloadTimeRelativeMS * chunkMeasurements[i].bufferLevel;
            sumXSq += chunkMeasurements[i].chunkDownloadTimeRelativeMS * chunkMeasurements[i].chunkDownloadTimeRelativeMS
        }

        result.m = ((sumXY - sumX * sumY / N)) / (sumXSq - sumX * sumX / N)
        result.b = sumY / N - result.m * sumX / N

        return function (x) {
            return result.m * x + result.b
        }
    }

    function isBufferSafeAndStable(lastMeasurements) {
        let isBufferSafeAndStable = true;
        let lastBitrate;
        const aveBufferLevelLastSegements = lastMeasurements.reduce((prev, curr) => prev + curr.bufferLevelAtSegmentEnd, 0) / lastMeasurements.length;
        lastMeasurements.forEach(m => {
            // inner segment buffer stability
            if (Math.abs(m.bufferLevelAtSegmentEnd / m.bufferLevelAtSegmentStart) < 0.95) {
                isBufferSafeAndStable = false;
            }

            // inter segment buffer stability
            if (m.bufferLevelAtSegmentEnd / aveBufferLevelLastSegements < 0.8) {
                isBufferSafeAndStable = false;
            }

            // representation bitrate remained at least constant
            if (!lastBitrate) {
                lastBitrate = m.bitrate;
            } else if (lastBitrate > m.bitrate) {
                isBufferSafeAndStable = false;
            }
        });
        return isBufferSafeAndStable;
    }

    /**
     * Based on the MPD, timing and buffer information of the last recent segments and their chunks
     * the most stable download time (in milliseconds) is calculated.
     * @param {*} request HTTPLoader request object
     * @returns download time in milliseconds of last fetched segment
     */
    function getEstimatedDownloadDurationMS(request) {
        const lastMeasurement = measurements[request.mediaType].slice(-1).pop();
        const lastThreeMeasurements = measurements[request.mediaType].slice(-3)

        // calculate and remember the buffer level trend during the last fetched segment
        const lastChunkRelativeTimeMS = lastMeasurement.chunkMeasurements.slice(-1).pop().chunkDownloadTimeRelativeMS;
        lastMeasurement.bufferLevelAtSegmentStart = lastMeasurement.getEstimatedBufferLevel(lastChunkRelativeTimeMS / 2);
        lastMeasurement.bufferLevelAtSegmentEnd = lastMeasurement.getEstimatedBufferLevel(lastChunkRelativeTimeMS);

        const isBufferStable = isBufferSafeAndStable(lastThreeMeasurements);

        const selectedOptimisticFactor = isBufferStable ? LLTM_OPTIMISTIC_ESTIMATE_FACTOR : LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;

        // fetch duration was longer than segment duration, but buffer was stable
        if (lastMeasurement.isBufferStable && lastMeasurement.segDurationMS * LLTM_SLOW_SEGMENT_DOWNLOAD_TOLERANCE < lastMeasurement.fetchDownloadDurationMS) {
            return lastMeasurement.fetchDownloadDurationMS;
        }
        // buffer is drying or fetch took too long
        if (!isBufferStable || lastMeasurement.segDurationMS < lastMeasurement.fetchDownloadDurationMS) {
            return lastMeasurement.fetchDownloadDurationMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
        }

        // did we requested a fully available segment? -> most accurate throughput calculation
        // we use adjusted availability start time to decide
        // Note: this "download mode" usually happens at startup and if requests are delayed artificially
        if (lastMeasurement.adjustedAvailabilityStartTimeMS <= (lastMeasurement.requestTimeMS + lastMeasurement.throughputCapacityDelayMS) - lastMeasurement.segDurationMS) {
            return lastMeasurement.fetchDownloadDurationMS * LLTM_SEMI_OPTIMISTIC_ESTIMATE_FACTOR;
        }

        // get all chunks that have been downloaded before fetch reached bleeding live edge
        // the remaining chunks loaded at production rate we will approximated
        const chunkAvailablePeriod = (lastMeasurement.requestTimeMS + lastMeasurement.throughputCapacityDelayMS) - lastMeasurement.adjustedAvailabilityStartTimeMS;
        let chunkBytesBBLE = 0; // BBLE -> Before bleeding live edge
        let chunkDownloadtimeMSBBLE = 0;
        let chunkCount = 0;
        for (let index = 0; index < lastMeasurement.chunkMeasurements.length; index++) {
            const chunk = lastMeasurement.chunkMeasurements[index];
            if (chunkAvailablePeriod < chunkDownloadtimeMSBBLE + chunk.chunkDownloadDurationMS) {
                break;
            }
            chunkDownloadtimeMSBBLE += chunk.chunkDownloadDurationMS;
            chunkBytesBBLE += chunk.chunkBytes;
            chunkCount++;
        }

        if (chunkAvailablePeriod < 0) {
            logger.warn('request time was before adjusted availibitly start time');
        }

        // there have to be some chunks available (20% of max count)
        // otherwise we are at bleeding live edge and the few chunks are insufficient to estimate correctly
        if (chunkBytesBBLE && chunkDownloadtimeMSBBLE && chunkCount > lastMeasurement.chunkMeasurements.length * 0.2) {
            const downloadThroughput = chunkBytesBBLE / chunkDownloadtimeMSBBLE; // bytes per millesecond
            const estimatedDownloadtimeMS = lastMeasurement.segmentBytes / downloadThroughput;
            // if real download was shorter then report this incl. semi optimistical estimate factor
            if (lastMeasurement.fetchDownloadDurationMS < estimatedDownloadtimeMS) {
                return lastMeasurement.fetchDownloadDurationMS * selectedOptimisticFactor;
            }
            return estimatedDownloadtimeMS * selectedOptimisticFactor;
        }

        // when we are to tight at live edge and it's stable then
        // we start to optimistically estimate download time
        // in such a way that a switch to next rep will be possible
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
            return lastMeasurement.fetchDownloadDurationMS * selectedOptimisticFactor;
        }
        return selectedOptimisticFactor * lastMeasurement.segmentBytes * 8 * 1000 / nextHigherBitrate;
    }

    /**
     * Get calculated value for a safe artificial delay of the next request to allow to accumulate some chunks.
     * This allows better line throughput measurement.
     * @param {*} request
     * @param {*} currentBufferLevel current buffer level in milliseconds
     * @returns delay in milliseconds
     */
    function getThroughputCapacityDelayMS(request, currentBufferLevelMS) {
        const lastThreeMeasurements = measurements[request.mediaType] && measurements[request.mediaType].slice(-3);

        if (!lastThreeMeasurements || lastThreeMeasurements.length < 3) {
            return 0;
        }



        // in case not stable buffer, no artificially delay for the next request
        if (!isBufferSafeAndStable(lastThreeMeasurements)) {
            return 0;
        }

        // allowed artificial delay is the min of quater of buffer level in milliseconds and LLTM_MAX_DELAY_MS
        return currentBufferLevelMS / 4 > LLTM_MAX_DELAY_MS ? LLTM_MAX_DELAY_MS : currentBufferLevelMS / 4;
    }

    /**
     * Add some measurement data for bookkeeping and being able to derive decisions on estimated throughput.
     * @param {*} request HTTPLoader object to get MPD and media info from
     * @param {*} fetchDownloadDurationMS Duration how long the fetch actually took
     * @param {*} chunkMeasurements Array containing chunk timings and buffer levels
     * @param {*} requestTimeMS Timestamp at which the fetch was initiated
     * @param {*} throughputCapacityDelayMS An artificial delay that was used for this request
     */
    function addMeasurement(request, fetchDownloadDurationMS, chunkMeasurements, requestTimeMS, throughputCapacityDelayMS) {
        if (request && request.mediaType && !measurements[request.mediaType]) {
            measurements[request.mediaType] = [];
        }
        const bitrateEntry = request.mediaInfo.bitrateList.find(item => item.id === request.representationId);
        measurements[request.mediaType].push({
            index: request.index,
            repId: request.representationId,
            mediaType: request.mediaType,
            requestTimeMS,
            adjustedAvailabilityStartTimeMS: request.availabilityStartTime.getTime(),
            segDurationMS: request.duration * 1000,
            chunksDurationMS: chunkMeasurements.reduce((prev, curr) => prev + curr.chunkDownloadDurationMS, 0),
            segmentBytes: chunkMeasurements.reduce((prev, curr) => prev + curr.chunkBytes, 0),
            bitrate: bitrateEntry && bitrateEntry.bandwidth,
            bitrateList: request.mediaInfo.bitrateList,
            chunkMeasurements,
            fetchDownloadDurationMS,
            throughputCapacityDelayMS,
            getEstimatedBufferLevel: createBufferLevelTrendFunction(chunkMeasurements.slice(1)) // don't use first chunk's buffer level
        });
        // maintain only a maximum amount of most recent measurements
        if (measurements[request.mediaType].length > LLTM_MAX_MEASUREMENTS) {
            measurements[request.mediaType].shift();
        }
    }

    instance = {
        setup,
        addMeasurement,
        getThroughputCapacityDelayMS,
        getEstimatedDownloadDurationMS
    };

    setup()

    return instance;
}

LowLatencyThroughputModel.__dashjs_factory_name = 'LowLatencyThroughputModel';
export default FactoryMaker.getSingletonFactory(LowLatencyThroughputModel);
