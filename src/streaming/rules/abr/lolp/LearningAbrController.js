/* *******************************
*    Main abr logic
* ******************************* */
import FactoryMaker from "../../../../core/FactoryMaker";
import Debug from '../../../core/Debug';

function LearningAbrController() {
    const context = this.context;

    let instance,
        logger,
        somBitrateNeurons,
        bitrateNormalizationFactor,
        latencyNormalizationFactor,
        minBitrate,
        minBitrateNeuron,
        weights,
        sortedCenters;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function reset() {

    }

    function _resetInitialSettings() {
        somBitrateNeurons = null;
        bitrateNormalizationFactor = 1;
        latencyNormalizationFactor = 100;
        minBitrate = 0;
        minBitrateNeuron = null;
        weights = null;
        sortedCenters = null;
    }

    function _getSomBitrateNeurons(mediaInfo) {
        if (!this.somBitrateNeurons) {
            this.somBitrateNeurons = [];
            const bitrateList = mediaInfo.bitrateList;
            let bitrateVector = [];
            this.minBitrate = bitrateList[0].bandwidth;
            bitrateList.forEach(element => {
                bitrateVector.push(element.bandwidth);
                if (element.bandwidth < this.minBitrate) {
                    this.minBitrate = element.bandwidth;
                }
            });
            this.bitrateNormalizationFactor = this.getMagnitude(bitrateVector);
            console.log("throughput normalization factor is " + this.bitrateNormalizationFactor);

            for (let i = 0; i < bitrateList.length; i++) {
                let neuron = {
                    qualityIndex: i,
                    bitrate: bitrateList[i].bandwidth,
                    state: {
                        // normalize throughputs
                        throughput: bitrateList[i].bandwidth / this.bitrateNormalizationFactor,
                        latency: 0,
                        rebuffer: 0,
                        switch: 0
                    }
                }
                this.somBitrateNeurons.push(neuron);
                if (neuron.bitrate == this.minBitrate) {
                    this.minBitrateNeuron = neuron;
                }
            }

            this.sortedCenters = this.getInitialKmeansPlusPlusCenters(this.somBitrateNeurons);
        }
        return this.somBitrateNeurons;
    }

    function _getMaxThroughput() {
        let maxThroughput = 0;
        if (this.somBitrateNeurons) {
            for (let i = 0; i < this.somBitrateNeurons.length; i++) {
                let n = this.somBitrateNeurons[i];
                if (n.state.throughput > maxThroughput) {
                    maxThroughput = n.state.throughput;
                }
            }
        }
        return maxThroughput;
    }

    function _getMagnitude(w) {
        return w
                .map((x) => (x ** 2)) // square each element
                .reduce((sum, now) => sum + now) // sum
            ** (1 / 2) // square root
    }

    function _getDistance(a, b, w) {
        let sum = a
            .map((x, i) => (w[i] * (x - b[i]) ** 2)) // square the difference*w
            .reduce((sum, now) => sum + now) // sum
        let sign = (sum < 0) ? -1 : 1;
        return sign * Math.abs(sum) ** (1 / 2)
    }

    function _getNeuronDistance(a, b) {
        let aState = [a.state.throughput, a.state.latency, a.state.rebuffer, a.state.switch];
        let bState = [b.state.throughput, b.state.latency, b.state.rebuffer, b.state.switch];
        return this.getDistance(aState, bState, [1, 1, 1, 1]);
    }

    function _updateNeurons(winnerNeuron, somElements, x) {
        // update all neurons
        for (let i = 0; i < somElements.length; i++) {
            let somNeuron = somElements[i];
            let sigma = 0.1;
            let neighbourHood = Math.exp(-1 * this.getNeuronDistance(somNeuron, winnerNeuron) ** 2 / (2 * sigma ** 2));
            this.updateNeuronState(somNeuron, x, neighbourHood);
        }
    }

    function _updateNeuronState(neuron, x, neighbourHood) {
        let state = neuron.state;
        let w = [0.01, 0.01, 0.01, 0.01]; // learning rate
        // console.log("before update: neuron=",neuron.qualityIndex," throughput=",state.throughput," latency=",state.latency," rebuffer=",state.rebuffer)
        state.throughput = state.throughput + (x[0] - state.throughput) * w[0] * neighbourHood;
        state.latency = state.latency + (x[1] - state.latency) * w[1] * neighbourHood;
        state.rebuffer = state.rebuffer + (x[2] - state.rebuffer) * w[2] * neighbourHood;
        state.switch = state.switch + (x[3] - state.switch) * w[3] * neighbourHood;
        console.log("after update: neuron=", neuron.qualityIndex, "throughput=", state.throughput,
            "latency=", state.latency, " rebuffer=", state.rebuffer,
            "switch=", state.switch);
    }

    function _getDownShiftNeuron(currentNeuron, currentThroughput) {
        let maxSuitableBitrate = 0;
        let result = currentNeuron;
        if (this.somBitrateNeurons) {
            for (let i = 0; i < this.somBitrateNeurons.length; i++) {
                let n = this.somBitrateNeurons[i];
                if (n.bitrate < currentNeuron.bitrate
                    && n.bitrate > maxSuitableBitrate
                    && currentThroughput > n.bitrate) {
                    // possible downshiftable neuron
                    maxSuitableBitrate = n.bitrate;
                    result = n;
                }
            }
        }
        return result;
    }

    function getNextQuality(mediaInfo, throughput, latency, bufferSize, playbackRate, currentQualityIndex, dynamicWeightsSelector) {
        // For Dynamic Weights Selector
        let currentLatency = latency;
        let currentBuffer = bufferSize;
        let currentThroughput = throughput;

        let somElements = this.getSomBitrateNeurons(mediaInfo);
        // normalize throughput
        let throughputNormalized = throughput / this.bitrateNormalizationFactor;
        // saturate values higher than 1
        if (throughputNormalized > 1) throughputNormalized = this.getMaxThroughput();
        // normalize latency
        latency = latency / this.latencyNormalizationFactor;

        const targetLatency = 0;
        const targetRebufferLevel = 0;
        const targetSwitch = 0;
        // 10K + video encoding is the recommended throughput
        const throughputDelta = 10000;

        console.log("getNextQuality called throughput=" + throughputNormalized + " latency=" + latency + " bufferSize=" + bufferSize, " currentQualityIndex=", currentQualityIndex, " playbackRate=", playbackRate);

        let currentNeuron = somElements[currentQualityIndex];
        let downloadTime = (currentNeuron.bitrate * dynamicWeightsSelector.getSegmentDuration()) / currentThroughput;
        let rebuffer = Math.max(0, (downloadTime - currentBuffer));

        // check buffer for possible stall
        if (currentBuffer - downloadTime < dynamicWeightsSelector.getMinBuffer()) {
            console.log("Buffer is low for bitrate=" + currentNeuron.bitrate + " downloadTime=" + downloadTime + " currentBuffer=" + currentBuffer + " rebuffer=" + rebuffer);
            return this.getDownShiftNeuron(currentNeuron, currentThroughput).qualityIndex;
        }

        // Weight Selection //

        /*
         * Option 1: Manual weights
         */
        // let throughputWeight = 0.4;
        // let latencyWeight = 0.4;
        // let bufferWeight = 0.4;
        // let switchWeight = 0.4;
        // this.weights = [ throughputWeight, latencyWeight, bufferWeight, switchWeight ]; // throughput, latency, buffer, switch

        /*
         * Option 2: Random (Xavier) weights
         */
        // this.weights = this.getXavierWeights(somElements.length,4);

        /*
         * Option 3: Dynamic Weight Selector weights
         */
        // Initial kmeans++ weights
        if (!this.weights) {
            this.weights = this.sortedCenters[this.sortedCenters.length - 1];
        }
        // Dynamic Weights Selector (step 2/2: find weights)
        let neurons = somElements;
        let weightVector = dynamicWeightsSelector.findWeightVector(neurons, currentLatency, currentBuffer, rebuffer, currentThroughput, playbackRate);
        //let weightVector = dynamicWeightsSelector.findWeightVectorByDistance(neurons, [throughputNormalized,targetLatency,targetRebufferLevel,targetSwitch]);
        if (weightVector != null && weightVector != -1) {   // null: something went wrong, -1: constraints not met
            this.weights = weightVector;
        }

        // End Weight Selection //

        let minDistance = null;
        let minIndex = null;
        let winnerNeuron = null;
        let winnerWeights = null;

        for (let i = 0; i < somElements.length; i++) {
            let somNeuron = somElements[i];
            let somNeuronState = somNeuron.state;
            let somData = [somNeuronState.throughput,
                somNeuronState.latency,
                somNeuronState.rebuffer,
                somNeuronState.switch];

            let distanceWeights = this.weights.slice();
            let nextBuffer = dynamicWeightsSelector.getNextBufferWithBitrate(somNeuron.bitrate, currentBuffer, currentThroughput);
            let isBufferLow = nextBuffer < dynamicWeightsSelector.getMinBuffer();
            if (isBufferLow) {
                console.log("Buffer is low for bitrate=" + somNeuron.bitrate + " downloadTime=" + downloadTime + " currentBuffer=" + currentBuffer + " nextBuffer=" + nextBuffer);
            }
            // special condition downshift immediately
            if (somNeuron.bitrate > throughput - throughputDelta || isBufferLow) {
                if (somNeuron.bitrate != this.minBitrate) {
                    // encourage to pick smaller bitrates throughputWeight=100
                    distanceWeights[0] = 100;
                }
            }

            // calculate the distance with the target
            let distance = this.getDistance(somData, [throughputNormalized, targetLatency, targetRebufferLevel, targetSwitch], distanceWeights);
            if (minDistance == null || distance < minDistance) {
                minDistance = distance;
                minIndex = somNeuron.qualityIndex;
                winnerNeuron = somNeuron;
                winnerWeights = distanceWeights;
            }
            console.log("distance=", distance);
        }

        // update current neuron and the neighbourhood with the calculated QoE
        // will punish current if it is not picked
        let bitrateSwitch = Math.abs(currentNeuron.bitrate - winnerNeuron.bitrate) / this.bitrateNormalizationFactor;
        this.updateNeurons(currentNeuron, somElements, [throughputNormalized, latency, rebuffer, bitrateSwitch]);

        console.log('--- minDistance: ', minDistance);
        console.log('--- winnerWeights: ', winnerWeights);

        // update bmu and  neighnours with targetQoE=1, targetLatency=0
        this.updateNeurons(winnerNeuron, somElements, [throughputNormalized, targetLatency, targetRebufferLevel, bitrateSwitch]);

        return minIndex;
    }

    function _getXavierWeights(neuronCount, weightCount) {
        // if (!this.weights){
        let W = [];
        let upperBound = (2 / neuronCount) ** 1 / 2;
        for (let i = 0; i < weightCount; i++) {
            W.push(Math.random() * upperBound);
        }
        console.log("Xavier Weights=", W);
        this.weights = W;
        // }
        return this.weights;
    }

    function _getRandomData(size) {
        let dataArray = [];
        for (let i = 0; i < size; i++) {
            let data = [
                Math.random() * this.getMaxThroughput(), //throughput
                Math.random(), //latency
                Math.random(), //buffersize
                Math.random(), //switch
            ];
            dataArray.push(data);
        }
        return dataArray;
    }

    function _getInitialKmeansPlusPlusCenters(somElements) {
        let centers = [];
        let randomDataSet = this.getRandomData(somElements.length ** 2);
        centers.push(randomDataSet[0]);
        let distanceWeights = [1, 1, 1, 1];
        for (let k = 1; k < somElements.length; k++) {
            let nextPoint = null;
            let maxDistance = null;
            for (let i = 0; i < randomDataSet.length; i++) {
                let currentPoint = randomDataSet[i];
                let minDistance = null;
                for (let j = 0; j < centers.length; j++) {
                    let distance = this.getDistance(currentPoint, centers[j], distanceWeights);
                    if (minDistance == null || distance < minDistance) {
                        minDistance = distance;
                    }
                }
                if (maxDistance == null || minDistance > maxDistance) {
                    nextPoint = currentPoint;
                }
            }
            centers.push(nextPoint);
        }
        // console.log("Centers=",centers);
        // find the least similar center
        let maxDistance = null;
        let leastSimilarIndex = null;
        for (let i = 0; i < centers.length; i++) {
            let distance = 0;
            for (let j = 0; j < centers.length; j++) {
                if (i == j) continue;
                distance += this.getDistance(centers[i], centers[j], distanceWeights);
            }
            if (maxDistance == null || distance > maxDistance) {
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
                let distance = this.getDistance(sortedCenters[0], centers[i], distanceWeights);
                if (minDistance == null || distance < minDistance) {
                    minDistance = distance;
                    minIndex = i;
                }
            }
            sortedCenters.push(centers[minIndex]);
            centers.splice(minIndex, 1);
        }

        console.log("sortedCenters=", sortedCenters);
        return sortedCenters;
    }

    instance = {
        getNextQuality
    };

    setup();
    return instance;
}

LearningAbrController.__dashjs_factory_name = 'LearningAbrController';
export default FactoryMaker.getClassFactory(LearningAbrController);
