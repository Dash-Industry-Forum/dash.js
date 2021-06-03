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

    let instance;
    let measurements = {};

    let mcount = 0

    /**
     *
     * @param {*} request
     * @returns
     */
    function getEstimatedDownloadDurationMS(request) {
        if (mcount === 10) {
            ['video', 'audio'].forEach(mediaType => {
                console.log(`${mediaType}-index(-chunk)?;ast;reqt;diffLast;bytes`);
                for (let mx = 0; mx < measurements[mediaType].length; mx++) {
                    const seg = measurements[mediaType][mx];

                    const index = seg.index;
                    const ast = seg.ast;
                    const reqt = new Date(seg.requestTime);
                    const diffLast = reqt.getTime() - ast.getTime();

                    console.log(`${mediaType}-${index};${ast.toISOString()};${reqt.toISOString()};${diffLast}`);

                    for (let cx = 0; cx < seg.measurement.length; cx++) {
                        //const chunk = seg.measurement[cx];
                        //console.log(`${mediaType}-${index}-${cx};-;-;${chunk.dur};${chunk.bytes}`);
                    }
                }

            });
        }

        const lastMeasurement = measurements[request.mediaType].slice(-1).pop();

        if (request.mediaType === 'video') mcount++;

        const chunksDurationMS = lastMeasurement.chunksDurationMS;

        // approx download duration longer than segment duration? Report this to result in ABR down switching
        // 20% tolerance
        if (request.duration * 1200 < request.fetchDownloadDurationMS) {
            console.log('slow', request.fetchDownloadDurationMS)
            return request.fetchDownloadDurationMS;
        }

        // otherwise download was possible on time
        return (lastMeasurement.bytes * 8) / lastMeasurement.bitrate;


        const beforeLastMeasurement = measurements[request.mediaType].slice(-2, -1).pop();


        const reqDelay = new Date(lastMeasurement.requestTime).getTime() - new Date(lastMeasurement.ast).getTime();

        const reqInterval = new Date(beforeLastMeasurement.requestTime).getTime() - new Date(lastMeasurement.requestTime).getTime();

        if (request.mediaType === 'video') {
            console.log(`ReqT-AST: ${reqDelay} ms ${8 * lastMeasurement.bytes * 1000 / chunksDurationMS}, req-interval: ${reqInterval}`)
        }

        // last download took at least same as segment length?
        // So report this measured fetch time, since this indicates that network throughput went down
        // Note: the next download is usually faster as the data accumulates at source
        if (lastMeasurement.segDuration * 1000 <= chunksDurationMS) {
            console.log('last download took at least same as segment length! So report this measured fetch time')
            return chunksDurationMS;
        }

        if (reqDelay < 100) {
            return chunksDurationMS / 2;
        }

        return chunksDurationMS;


        const time = lastMeasurement.bytes * 8 / lastMeasurement.bitrate;
        console.log(time, request.mediaType, 'chunks dur', lastMeasurement.chunksDuration);
        return lastMeasurement.chunksDuration;

        const lastTen = measurements[request.mediaType].slice(-10);
        let lastTenAveDuration = lastTen.reduce((prev, curr) => prev + curr.fetchDownloadDurationMS, 0) / (1000 * lastTen.length);
        lastTenAveDuration = lastTenAveDuration + lastTenAveDuration * 0.10;
        if (request.mediaType === 'video') {
            console.log('dl time', lastTenAveDuration);
        }
        return lastTenAveDuration;
        //const lastTenBytes = lastTen.reduce((prev, curr) => prev + curr.fetchDownloadDurationMS, 0) / (1000 * lastTen.bytes);




        // are we far away from live edge? So report the average of up to last three measured fetch durations
        // reasons: a) on startup when we fetch already existing segments, b) after bandwidth drop when the previous download took longer
        if (lastMeasurement.segDuration > chunksDurationMS * 2) {
            const uptoLastFive = measurements[request.mediaType].slice(-5);
            const aveFetchDurationLastFiveSegments = uptoLastFive.reduce((prev, curr) => prev + curr.fetchDownloadDurationMS, 0) / (1000 * uptoLastFive.length);
            console.log(' we are far away from live edge! So report measured fetch time ')
            return aveFetchDurationLastFiveSegments;
        }

        // last download took at least same as segment length? So report this measured fetch time
        if (lastMeasurement.segDuration <= chunksDurationMS) {

            console.log('last download took at least same as segment length! So report this measured fetch time')
            return chunksDurationMS;
        }

        // was last fetch artificially delayed? So estimate download time, to allow switch to higher bitrate
        if (lastMeasurement.throughputCapacityDelay) {

        }

        // in other cases it is safe to continue with current bitrate
        return lastMeasurement.chunksDuration;
    }

    /**
     * Get calculated value for next artificial delay to allow accumulate some chunks and allow better line throughput measurement
     * @param {*} request
     * @returns
     */
    function getThroughputCapacityDelay(request) {
        return request ? 0 : 0;
    }

    /**
     * Add some measurement data for bookkeeping and being able to derive decisions on estimated throughput.
     * @param {*} request
     * @param {*} fetchDownloadDurationMS
     * @param {*} measurement
     * @param {*} requestTime
     * @param {*} throughputCapacityDelay
     */
    function addMeasurement(request, fetchDownloadDurationMS, measurement, requestTime, throughputCapacityDelay, responseHeaders) {
        if (request && request.mediaType && !measurements[request.mediaType]) {
            measurements[request.mediaType] = [];
        }
        if (throughputCapacityDelay >= 0) {
            const bitrateEntry = { bandwidth: 300000 };  //request.mediaInfo.bitrateList.find(item => item.id === request.representationId);
            measurements[request.mediaType].push({
                index: request.index,
                requestTime,
                ast: request.availabilityStartTime,
                segDuration: request.duration,
                chunksDurationMS: measurement.reduce((prev, curr) => prev + curr.dur, 0),
                bytes: measurement.reduce((prev, curr) => prev + curr.bytes, 0),
                bitrate: bitrateEntry && bitrateEntry.bandwidth,
                measurement,//: measurement.sort((a, b) => b.kbps - a.kbps),
                fetchDownloadDurationMS,
                throughputCapacityDelay,
                responseHeaders
            });
            // maintain only a maximum amount of most recent measurements
            if (measurements[request.mediaType].length > LLTM_MAX_MEASUREMENTS) {
                measurements[request.mediaType].shift();
            }
        }
    }

    instance = {
        addMeasurement,
        getThroughputCapacityDelay,
        getEstimatedDownloadDurationMS
    };

    return instance;
}

LowLatencyThroughputModel.__dashjs_factory_name = 'LowLatencyThroughputModel';
export default FactoryMaker.getSingletonFactory(LowLatencyThroughputModel);