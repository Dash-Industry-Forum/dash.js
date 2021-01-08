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

/**
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 */

import FactoryMaker from '../../../../core/FactoryMaker';

function LoLpWeightSelector(config) {
    let targetLatency = config.targetLatency;
    let bufferMin = config.bufferMin;
    let segmentDuration = config.segmentDuration;
    let qoeEvaluator = config.qoeEvaluator;
    let instance,
        valueList,
        weightTypeCount,
        weightOptions,
        previousLatency;

    /**
     *
     * @private
     */
    function _setup() {
        _resetInitialSettings();
    }

    /**
     *
     * @private
     */
    function _resetInitialSettings() {
        valueList = [0.2, 0.4, 0.6, 0.8, 1];
        weightTypeCount = 4;
        weightOptions = _getPermutations(valueList, weightTypeCount);
        previousLatency = 0;
    }

    /**
     * Next, at each segment boundary, ABR to input current neurons and target state (only used in Method II) to find the desired weight vector
     * @param {array} neurons
     * @param {number} currentLatency
     * @param {number} currentBuffer
     * @param {number} currentRebuffer
     * @param {number} currentThroughput
     * @param {number} playbackRate
     * @return {null}
     * @private
     */
    function findWeightVector(neurons, currentLatency, currentBuffer, currentRebuffer, currentThroughput, playbackRate) {
        let maxQoE = null;
        let winnerWeights = null;
        let winnerBitrate = null;
        let deltaLatency = Math.abs(currentLatency - previousLatency);

        // For each neuron, m
        neurons.forEach((neuron) => {

            // For each possible weight vector, z
            // E.g. For [ throughput, latency, buffer, playbackRate, QoE ]
            //      Possible weightVector = [ 0.2, 0.4, 0.2, 0, 0.2 ]
            weightOptions.forEach((weightVector) => {

                // Apply weightVector to neuron, compute utility and determine winnerWeights
                // Method I: Utility based on QoE given current state

                let weightsObj = {
                    throughput: weightVector[0],
                    latency: weightVector[1],
                    buffer: weightVector[2],
                    switch: weightVector[3]
                };

                let downloadTime = (neuron.bitrate * segmentDuration) / currentThroughput;
                let nextBuffer = getNextBuffer(currentBuffer, downloadTime);
                let rebuffer = Math.max(0.00001, (downloadTime - nextBuffer));
                let wt;
                if (weightsObj.buffer === 0) {
                    wt = 10;
                } else {
                    wt = (1 / weightsObj.buffer);
                }
                let weightedRebuffer = wt * rebuffer;

                if (weightsObj.latency === 0) {
                    wt = 10;
                } else {
                    wt = (1 / weightsObj.latency); // inverse the weight because wt and latency should have positive relationship, i.e., higher latency = higher wt
                }
                let weightedLatency = wt * neuron.state.latency;

                let totalQoE = qoeEvaluator.calculateSingleUseQoe(neuron.bitrate, weightedRebuffer, weightedLatency, playbackRate);
                if ((maxQoE === null || totalQoE > maxQoE) && _checkConstraints(currentLatency, nextBuffer, deltaLatency)) {
                    maxQoE = totalQoE;
                    winnerWeights = weightVector;
                    winnerBitrate = neuron.bitrate;
                }
            });
        });

        // winnerWeights was found, check if constraints are satisfied
        if (winnerWeights === null && winnerBitrate === null) {
            winnerWeights = -1;
        }

        previousLatency = currentLatency;
        return winnerWeights;
    }

    /**
     *
     * @param {number} nextLatency
     * @param {number} nextBuffer
     * @param {number} deltaLatency
     * @return {boolean}
     * @private
     */
    function _checkConstraints(nextLatency, nextBuffer, deltaLatency) {
        // A1
        // disabled till we find a better way of estimating latency
        // fails for all with current value
        if (nextLatency > targetLatency + deltaLatency) {
            return false;
        }

        return nextBuffer >= bufferMin;
    }

    /**
     *
     * @param {array} list
     * @param {number} length
     * @return {*}
     * @private
     */
    function _getPermutations(list, length) {
        // Copy initial values as arrays
        let perm = list.map(function (val) {
            return [val];
        });
        // Our permutation generator
        let generate = function (perm, length, currLen) {
            // Reached desired length
            if (currLen === length) {
                return perm;
            }
            // For each existing permutation
            let len = perm.length;
            for (let i = 0; i < len; i++) {
                let currPerm = perm.shift();
                // Create new permutation
                for (let k = 0; k < list.length; k++) {
                    perm.push(currPerm.concat(list[k]));
                }
            }
            // Recurse
            return generate(perm, length, currLen + 1);
        };
        // Start with size 1 because of initial values
        return generate(perm, length, 1);
    }

    /**
     *
     * @return {number}
     */
    function getMinBuffer() {
        return bufferMin;
    }

    /**
     *
     * @return {number}
     */
    function getSegmentDuration() {
        return segmentDuration;
    }

    /**
     *
     * @param {number} bitrateToDownload
     * @param {number} currentBuffer
     * @param {number} currentThroughput
     * @return {number}
     */
    function getNextBufferWithBitrate(bitrateToDownload, currentBuffer, currentThroughput) {
        let downloadTime = (bitrateToDownload * segmentDuration) / currentThroughput;
        return getNextBuffer(currentBuffer, downloadTime);
    }

    /**
     *
     * @param {number} currentBuffer
     * @param {number} downloadTime
     * @return {number}
     */
    function getNextBuffer(currentBuffer, downloadTime) {
        const segmentDuration = getSegmentDuration();
        let nextBuffer;
        if (downloadTime > segmentDuration) {
            nextBuffer = currentBuffer - segmentDuration;
        } else {
            nextBuffer = currentBuffer + segmentDuration - downloadTime;
        }
        return nextBuffer;
    }

    instance = {
        getMinBuffer,
        getSegmentDuration,
        getNextBufferWithBitrate,
        getNextBuffer,
        findWeightVector
    };

    _setup();

    return instance;
}

LoLpWeightSelector.__dashjs_factory_name = 'LoLpWeightSelector';
export default FactoryMaker.getClassFactory(LoLpWeightSelector);
