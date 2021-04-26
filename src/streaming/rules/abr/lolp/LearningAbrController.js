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
import Debug from '../../../../core/Debug';

const WEIGHT_SELECTION_MODES = {
    MANUAL: 'manual_weight_selection',
    RANDOM: 'random_weight_selection',
    DYNAMIC: 'dynamic_weight_selection'
};

function LearningAbrController() {
    const context = this.context;

    let instance,
        logger,
        somBitrateNeurons,
        bitrateNormalizationFactor,
        latencyNormalizationFactor,
        minBitrate,
        weights,
        sortedCenters,
        weightSelectionMode;

    /**
     * Setup the class
     */
    function _setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    /**
     * Reset all values
     */
    function reset() {
        _resetInitialSettings();
    }

    /**
     * Reset to initial settings
     * @private
     */
    function _resetInitialSettings() {
        somBitrateNeurons = null;
        bitrateNormalizationFactor = 1;
        latencyNormalizationFactor = 100;
        minBitrate = 0;
        weights = null;
        sortedCenters = null;
        weightSelectionMode = WEIGHT_SELECTION_MODES.DYNAMIC;
    }

    /**
     * Returns the maximum throughput
     * @return {number}
     * @private
     */
    function _getMaxThroughput() {
        let maxThroughput = 0;

        if (somBitrateNeurons) {
            for (let i = 0; i < somBitrateNeurons.length; i++) {
                let neuron = somBitrateNeurons[i];
                if (neuron.state.throughput > maxThroughput) {
                    maxThroughput = neuron.state.throughput;
                }
            }
        }

        return maxThroughput;
    }

    /**
     *
     * @param {array} w
     * @return {number}
     * @private
     */
    function _getMagnitude(w) {
        const magnitude = w.map((x) => (Math.pow(x, 2))).reduce((sum, now) => sum + now);

        return Math.sqrt(magnitude);
    }

    /**
     *
     * @param {array} a
     * @param {array} b
     * @param {array} w
     * @return {number}
     * @private
     */
    function _getDistance(a, b, w) {
        let sum = a
            .map((x, i) => (w[i] * (Math.pow(x - b[i], 2)))) // square the difference*w
            .reduce((sum, now) => sum + now); // sum
        let sign = (sum < 0) ? -1 : 1;

        return sign * Math.sqrt(Math.abs(sum));
    }

    /**
     *
     * @param {object} a
     * @param {object} b
     * @return {number}
     * @private
     */
    function _getNeuronDistance(a, b) {
        let aState = [a.state.throughput, a.state.latency, a.state.rebuffer, a.state.switch];
        let bState = [b.state.throughput, b.state.latency, b.state.rebuffer, b.state.switch];

        return _getDistance(aState, bState, [1, 1, 1, 1]);
    }

    /**
     *
     * @param {object} winnerNeuron
     * @param {array} somElements
     * @param {array} x
     * @private
     */
    function _updateNeurons(winnerNeuron, somElements, x) {
        for (let i = 0; i < somElements.length; i++) {
            let somNeuron = somElements[i];
            let sigma = 0.1;
            const neuronDistance = _getNeuronDistance(somNeuron, winnerNeuron);
            let neighbourHood = Math.exp(-1 * Math.pow(neuronDistance, 2) / (2 * Math.pow(sigma, 2)));
            _updateNeuronState(somNeuron, x, neighbourHood);
        }
    }

    /**
     *
     * @param {object} neuron
     * @param {array} x
     * @param {object} neighbourHood
     * @private
     */
    function _updateNeuronState(neuron, x, neighbourHood) {
        let state = neuron.state;
        let w = [0.01, 0.01, 0.01, 0.01]; // learning rate

        state.throughput = state.throughput + (x[0] - state.throughput) * w[0] * neighbourHood;
        state.latency = state.latency + (x[1] - state.latency) * w[1] * neighbourHood;
        state.rebuffer = state.rebuffer + (x[2] - state.rebuffer) * w[2] * neighbourHood;
        state.switch = state.switch + (x[3] - state.switch) * w[3] * neighbourHood;
    }

    /**
     *
     * @param {object} currentNeuron
     * @param {number} currentThroughput
     * @return {object}
     * @private
     */
    function _getDownShiftNeuron(currentNeuron, currentThroughput) {
        let maxSuitableBitrate = 0;
        let result = currentNeuron;

        if (somBitrateNeurons) {
            for (let i = 0; i < somBitrateNeurons.length; i++) {
                let n = somBitrateNeurons[i];
                if (n.bitrate < currentNeuron.bitrate && n.bitrate > maxSuitableBitrate && currentThroughput > n.bitrate) {
                    // possible downshiftable neuron
                    maxSuitableBitrate = n.bitrate;
                    result = n;
                }
            }
        }

        return result;
    }

    /**
     *
     * @param {object} mediaInfo
     * @param {number} throughput
     * @param {number} latency
     * @param {number} bufferSize
     * @param {number} playbackRate
     * @param {number} currentQualityIndex
     * @param {object} dynamicWeightsSelector
     * @return {null|*}
     */
    function getNextQuality(mediaInfo, throughput, latency, bufferSize, playbackRate, currentQualityIndex, dynamicWeightsSelector) {
        // For Dynamic Weights Selector
        let currentLatency = latency;
        let currentBuffer = bufferSize;
        let currentThroughput = throughput;

        let somElements = _getSomBitrateNeurons(mediaInfo);
        // normalize throughput
        let throughputNormalized = throughput / bitrateNormalizationFactor;
        // saturate values higher than 1
        if (throughputNormalized > 1) {
            throughputNormalized = _getMaxThroughput();
        }
        // normalize latency
        latency = latency / latencyNormalizationFactor;

        const targetLatency = 0;
        const targetRebufferLevel = 0;
        const targetSwitch = 0;
        // 10K + video encoding is the recommended throughput
        const throughputDelta = 10000;

        logger.debug(`getNextQuality called throughput:${throughputNormalized} latency:${latency} bufferSize:${bufferSize} currentQualityIndex:${currentQualityIndex} playbackRate:${playbackRate}`);

        let currentNeuron = somElements[currentQualityIndex];
        let downloadTime = (currentNeuron.bitrate * dynamicWeightsSelector.getSegmentDuration()) / currentThroughput;
        let rebuffer = Math.max(0, (downloadTime - currentBuffer));

        // check buffer for possible stall
        if (currentBuffer - downloadTime < dynamicWeightsSelector.getMinBuffer()) {
            logger.debug(`Buffer is low for bitrate= ${currentNeuron.bitrate} downloadTime=${downloadTime} currentBuffer=${currentBuffer} rebuffer=${rebuffer}`);
            return _getDownShiftNeuron(currentNeuron, currentThroughput).qualityIndex;
        }

        switch (weightSelectionMode) {
            case WEIGHT_SELECTION_MODES.MANUAL:
                _manualWeightSelection();
                break;
            case WEIGHT_SELECTION_MODES.RANDOM:
                _randomWeightSelection(somElements);
                break;
            case WEIGHT_SELECTION_MODES.DYNAMIC:
                _dynamicWeightSelection(dynamicWeightsSelector, somElements, currentLatency, currentBuffer, rebuffer, currentThroughput, playbackRate);
                break;
            default:
                _dynamicWeightSelection(dynamicWeightsSelector, somElements, currentLatency, currentBuffer, rebuffer, currentThroughput, playbackRate);

        }

        let minDistance = null;
        let minIndex = null;
        let winnerNeuron = null;

        for (let i = 0; i < somElements.length; i++) {
            let somNeuron = somElements[i];
            let somNeuronState = somNeuron.state;
            let somData = [somNeuronState.throughput,
                somNeuronState.latency,
                somNeuronState.rebuffer,
                somNeuronState.switch];

            let distanceWeights = weights.slice();
            let nextBuffer = dynamicWeightsSelector.getNextBufferWithBitrate(somNeuron.bitrate, currentBuffer, currentThroughput);
            let isBufferLow = nextBuffer < dynamicWeightsSelector.getMinBuffer();
            if (isBufferLow) {
                logger.debug(`Buffer is low for bitrate=${somNeuron.bitrate} downloadTime=${downloadTime} currentBuffer=${currentBuffer} nextBuffer=${nextBuffer}`);
            }
            // special condition downshift immediately
            if (somNeuron.bitrate > throughput - throughputDelta || isBufferLow) {
                if (somNeuron.bitrate !== minBitrate) {
                    // encourage to pick smaller bitrates throughputWeight=100
                    distanceWeights[0] = 100;
                }
            }

            // calculate the distance with the target
            let distance = _getDistance(somData, [throughputNormalized, targetLatency, targetRebufferLevel, targetSwitch], distanceWeights);
            if (minDistance === null || distance < minDistance) {
                minDistance = distance;
                minIndex = somNeuron.qualityIndex;
                winnerNeuron = somNeuron;
            }
        }

        // update current neuron and the neighbourhood with the calculated QoE
        // will punish current if it is not picked
        let bitrateSwitch = Math.abs(currentNeuron.bitrate - winnerNeuron.bitrate) / bitrateNormalizationFactor;
        _updateNeurons(currentNeuron, somElements, [throughputNormalized, latency, rebuffer, bitrateSwitch]);

        // update bmu and  neighbours with targetQoE=1, targetLatency=0
        _updateNeurons(winnerNeuron, somElements, [throughputNormalized, targetLatency, targetRebufferLevel, bitrateSwitch]);

        return minIndex;
    }

    /**
     * Option 1: Manual weights
     * @private
     */
    function _manualWeightSelection() {
        let throughputWeight = 0.4;
        let latencyWeight = 0.4;
        let bufferWeight = 0.4;
        let switchWeight = 0.4;

        weights = [throughputWeight, latencyWeight, bufferWeight, switchWeight]; // throughput, latency, buffer, switch
    }

    /**
     * Option 2: Random (Xavier) weights
     * @param {array} somElements
     * @private
     */
    function _randomWeightSelection(somElements) {
        weights = _getXavierWeights(somElements.length, 4);
    }

    /**
     * Dynamic Weight Selector weights
     * @param {object} dynamicWeightsSelector
     * @param {array} somElements
     * @param {number} currentLatency
     * @param {number} currentBuffer
     * @param {number} rebuffer
     * @param {number} currentThroughput
     * @param {number} playbackRate
     * @private
     */
    function _dynamicWeightSelection(dynamicWeightsSelector, somElements, currentLatency, currentBuffer, rebuffer, currentThroughput, playbackRate) {
        if (!weights) {
            weights = sortedCenters[sortedCenters.length - 1];
        }
        // Dynamic Weights Selector (step 2/2: find weights)
        let weightVector = dynamicWeightsSelector.findWeightVector(somElements, currentLatency, currentBuffer, rebuffer, currentThroughput, playbackRate);
        if (weightVector !== null && weightVector !== -1) {   // null: something went wrong, -1: constraints not met
            weights = weightVector;
        }
    }

    /**
     *
     * @param {number }neuronCount
     * @param {number }weightCount
     * @return {array}
     * @private
     */
    function _getXavierWeights(neuronCount, weightCount) {
        let W = [];
        let upperBound = Math.sqrt((2 / neuronCount));

        for (let i = 0; i < weightCount; i++) {
            W.push(Math.random() * upperBound);
        }

        weights = W;

        return weights;
    }

    /**
     *
     * @param {object} mediaInfo
     * @return {array}
     * @private
     */
    function _getSomBitrateNeurons(mediaInfo) {
        if (!somBitrateNeurons) {
            somBitrateNeurons = [];
            const bitrateList = mediaInfo.bitrateList;
            let bitrateVector = [];
            minBitrate = bitrateList[0].bandwidth;

            bitrateList.forEach(element => {
                bitrateVector.push(element.bandwidth);
                if (element.bandwidth < minBitrate) {
                    minBitrate = element.bandwidth;
                }
            });
            bitrateNormalizationFactor = _getMagnitude(bitrateVector);

            for (let i = 0; i < bitrateList.length; i++) {
                let neuron = {
                    qualityIndex: i,
                    bitrate: bitrateList[i].bandwidth,
                    state: {
                        // normalize throughputs
                        throughput: bitrateList[i].bandwidth / bitrateNormalizationFactor,
                        latency: 0,
                        rebuffer: 0,
                        switch: 0
                    }
                };
                somBitrateNeurons.push(neuron);
            }

            sortedCenters = _getInitialKmeansPlusPlusCenters(somBitrateNeurons);
        }

        return somBitrateNeurons;
    }

    /**
     *
     * @param {number} size
     * @return {array}
     * @private
     */
    function _getRandomData(size) {
        let dataArray = [];

        for (let i = 0; i < size; i++) {
            let data = [
                Math.random() * _getMaxThroughput(), //throughput
                Math.random(), //latency
                Math.random(), //buffersize
                Math.random() //switch
            ];
            dataArray.push(data);
        }

        return dataArray;
    }

    /**
     *
     * @param {array} somElements
     * @return {array}
     * @private
     */
    function _getInitialKmeansPlusPlusCenters(somElements) {
        let centers = [];
        let randomDataSet = _getRandomData(Math.pow(somElements.length, 2));
        centers.push(randomDataSet[0]);
        let distanceWeights = [1, 1, 1, 1];

        for (let k = 1; k < somElements.length; k++) {
            let nextPoint = null;
            let maxDistance = null;
            for (let i = 0; i < randomDataSet.length; i++) {
                let currentPoint = randomDataSet[i];
                let minDistance = null;
                for (let j = 0; j < centers.length; j++) {
                    let distance = _getDistance(currentPoint, centers[j], distanceWeights);
                    if (minDistance === null || distance < minDistance) {
                        minDistance = distance;
                    }
                }
                if (maxDistance === null || minDistance > maxDistance) {
                    nextPoint = currentPoint;
                    maxDistance = minDistance;
                }
            }
            centers.push(nextPoint);
        }

        // find the least similar center
        let maxDistance = null;
        let leastSimilarIndex = null;
        for (let i = 0; i < centers.length; i++) {
            let distance = 0;
            for (let j = 0; j < centers.length; j++) {
                if (i === j) continue;
                distance += _getDistance(centers[i], centers[j], distanceWeights);
            }
            if (maxDistance === null || distance > maxDistance) {
                maxDistance = distance;
                leastSimilarIndex = i;
            }
        }

        // move centers to sortedCenters
        let sortedCenters = [];
        sortedCenters.push(centers[leastSimilarIndex]);
        centers.splice(leastSimilarIndex, 1);
        while (centers.length > 0) {
            let minDistance = null;
            let minIndex = null;
            for (let i = 0; i < centers.length; i++) {
                let distance = _getDistance(sortedCenters[0], centers[i], distanceWeights);
                if (minDistance === null || distance < minDistance) {
                    minDistance = distance;
                    minIndex = i;
                }
            }
            sortedCenters.push(centers[minIndex]);
            centers.splice(minIndex, 1);
        }

        return sortedCenters;
    }

    instance = {
        getNextQuality,
        reset
    };

    _setup();
    return instance;
}

LearningAbrController.__dashjs_factory_name = 'LearningAbrController';
export default FactoryMaker.getClassFactory(LearningAbrController);
