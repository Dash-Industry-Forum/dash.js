/*
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 */
class DynamicWeightsSelector {
    // Note in learningRule: weights = [
    //                         throughput,
    //                         latency,
    //                         buffer,
    //                         playbackRate,
    //                         QoE
    //                     ]

    //
    // First, ABR to create weightsSelector object 
    // at the start of streaming session
    //
    constructor(targetLatency, bufferMin, bufferMax, segmentDuration, qoeEvaluator) {

        // For later use in checking constraints
        this.targetLatency = targetLatency;
        this.bufferMin = bufferMin;
        this.bufferMax = bufferMax;
        this.segmentDuration = segmentDuration;
        this.qoeEvaluator = qoeEvaluator;

        // Generate all possible weight vectors
        let valueList = [0.2, 0.4, 0.6, 0.8, 1];
        let weightTypeCount = 4;
        this.weightOptions = this.getPermutations(valueList, weightTypeCount);

        this.previousLatency=0;

        // console.log(this.weightOptions.length); // e.g. 7776
    }

    //
    // Next, at each segment boundary, 
    // ABR to input current neurons and target state (only used in Method II)
    // to find the desired weight vector
    //
    findWeightVector(neurons, currentLatency, currentBuffer, currentRebuffer, currentThroughput, playbackRate) {

        // let minDistance = null; // the lower the better
        let maxQoE = null;      // the higher the better
        let winnerWeights = null;
        let winnerBitrate = null;

        let deltaLatency=Math.abs(currentLatency-this.previousLatency)

        // For each neuron, m
        neurons.forEach((neuron) => {

            // For each possible weight vector, z
            // E.g. For [ throughput, latency, buffer, playbackRate, QoE ]
            //      Possible weightVector = [ 0.2, 0.4, 0.2, 0, 0.2 ]
            this.weightOptions.forEach((weightVector) => {

                // Apply weightVector to neuron, compute utility and determine winnerWeights

                /*
                 * Method I: Utility based on QoE given current state
                 */
                let weightsObj = {
                    throughput: weightVector[0],
                    latency: weightVector[1],
                    buffer: weightVector[2],
                    switch: weightVector[3]
                };

                let downloadTime = (neuron.bitrate * this.segmentDuration) / currentThroughput;
                let nextBuffer = this.getNextBuffer(currentBuffer, downloadTime);
                let rebuffer = Math.max(0.00001, (downloadTime - nextBuffer));

                let wt;
                if (weightsObj.buffer == 0) wt = 10;
                else wt = (1 / weightsObj.buffer)
                let weightedRebuffer = wt * rebuffer;

                if (weightsObj.latency == 0) wt = 10;
                else wt = (1 / weightsObj.latency);         // inverse the weight because wt and latency should have positive relationship, i.e., higher latency = higher wt
                let weightedLatency = wt * neuron.state.latency;
                //let weightedLatency =  neuron.state.latency + ( neuron.state.latency - currentLatency ) * weightsObj.latency;

                if (weightsObj.switch == 0) wt = 10;
                else wt = (1 / weightsObj.switch);    // inverse the weight because wt and pbr should have positive relationship, i.e., higher pbr = higher wt
                let weightedSwitch = wt * neuron.state.switch;

                let totalQoE = this.qoeEvaluator.calculateSingleUseQoe(neuron.bitrate, weightedRebuffer, weightedLatency, playbackRate);
                if ((maxQoE == null || totalQoE > maxQoE) && this.checkConstraints(currentLatency, nextBuffer, rebuffer, deltaLatency)){
                    maxQoE = totalQoE;
                    winnerWeights = weightVector;
                    winnerBitrate = neuron.bitrate;
                }
            });
        });

        // winnerWeights was found, check if constraints are satisfied
        if (winnerWeights == null && winnerBitrate == null) {
            winnerWeights = -1;
        }

        this.previousLatency=currentLatency;
        return winnerWeights;
    }

    checkConstraints(nextLatency, nextBuffer, rebuffer, deltaLatency) {
        // A1
        // disabled till we find a better way of estimating latency
        // fails for all with current value
        
        if (nextLatency > this.targetLatency + deltaLatency) {
            // console.log('[DynamicWeightsSelector] Failed A1!');
            return false;
        }

        // A2

        if (nextBuffer < this.bufferMin) {
            // console.log('[DynamicWeightsSelector] Failed A2!');
            return false;
        }

        // A3
        if (rebuffer>0) {
            // console.log('[DynamicWeightsSelector] Failed A3!');
            return false;
        }
        
        return true;
    }

    getPermutations(list, length) {
        // Copy initial values as arrays
        var perm = list.map(function(val) {
            return [val];
        });
        // Our permutation generator
        var generate = function(perm, length, currLen) {
            // Reached desired length
            if (currLen === length) {
                return perm;
            }
            // For each existing permutation
            for (var i = 0, len = perm.length; i < len; i++) {
                var currPerm = perm.shift();
                // Create new permutation
                for (var k = 0; k < list.length; k++) {
                    perm.push(currPerm.concat(list[k]));
                }
            }
            // Recurse
            return generate(perm, length, currLen + 1);
        };
        // Start with size 1 because of initial values
        return generate(perm, length, 1);
    }

    getDistance(a, b, w) {
        return a
            .map((x, i) => (w[i] * (x-b[i]) ** 2)) // square the difference*w
            .reduce((sum, now) => sum + now) // sum
            ** (1/2) // square root
    }

    getMinBuffer(){
        return this.bufferMin;
    }

    getSegmentDuration(){
        return this.segmentDuration;
    }

    getNextBufferWithBitrate(bitrateToDownload, currentBuffer, currentThroughput){
        let downloadTime = (bitrateToDownload * this.segmentDuration) / currentThroughput;
        return this.getNextBuffer(currentBuffer, downloadTime);
    }

    getNextBuffer(currentBuffer, downloadTime){
        const segmentDuration= this.getSegmentDuration();
        let nextBuffer;
        if (downloadTime>segmentDuration){
            nextBuffer = currentBuffer - segmentDuration;
        } else {
            nextBuffer = currentBuffer + segmentDuration - downloadTime;
        }
        return nextBuffer;
    }

}

// Additional for run.js invocation of DynamicWeightsSelector
if (typeof exports !== 'undefined') {
    exports.DynamicWeightsSelector = DynamicWeightsSelector;
}
