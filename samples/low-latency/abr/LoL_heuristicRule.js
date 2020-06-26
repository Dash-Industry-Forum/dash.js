/*
 * Authors:
 * May Lim | National University of Singapore | maylim17@u.nus.edu
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 */
var TgcHeuristicRule;

function TgcHeuristicRuleClass() {

    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let MetricsModel = factory.getSingletonFactoryByName('MetricsModel');
    let DashMetrics = factory.getSingletonFactoryByName('DashMetrics');
    let StreamController = factory.getSingletonFactoryByName('StreamController');
    let PlaybackController = factory.getSingletonFactoryByName('PlaybackController');
    let MediaPlayerModel = factory.getSingletonFactoryByName('MediaPlayerModel');

    let context = this.context;
    let instance;

    let metricsConstants = {
        ABANDON_LOAD: 'abandonload',
        BUFFER_STATE: 'BufferState'
    }

    const heuristicController = new HeuristicAbrController();

    function setup() {
    }

    function getMaxIndex(rulesContext) {
        let switchRequest = SwitchRequest(context).create();

        let metricsModel = MetricsModel(context).getInstance();
        let dashMetrics = DashMetrics(context).getInstance();
        let mediaType = rulesContext.getMediaInfo().type;
        let metrics = metricsModel.getMetricsFor(mediaType, true);

        // Dash controllers
        let streamController = StreamController(context).getInstance();
        let playbackController = PlaybackController(context).getInstance();
        let abrController = rulesContext.getAbrController();
        
        // Additional stuff for Heuristic rule
        let mediaPlayerModel = MediaPlayerModel(context).getInstance();
        let liveDelay = mediaPlayerModel.getLiveDelay();  

        // Additional stuff for both
        const mediaInfo = rulesContext.getMediaInfo();
        // const bitrateList = mediaInfo.bitrateList;  // [{bandwidth: 200000, width: 640, height: 360}, ...]
        const bufferStateVO = dashMetrics.getLatestBufferInfoVO(mediaType, true, metricsConstants.BUFFER_STATE);
        const scheduleController = rulesContext.getScheduleController();
        const currentBufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
        const streamInfo = rulesContext.getStreamInfo();
        const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
        
        let latency = playbackController.getCurrentLiveLatency();
        if (!latency) latency = 0;
        const playbackRate = playbackController.getPlaybackRate();

        /*
         * Throughput
         */
        const throughputHistory = abrController.getThroughputHistory();
        // const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);
        const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        console.log('[TgcHeuristicRule] throughput: ' + Math.round(throughput) + 'kbps');

        if (isNaN(throughput)) {
            return switchRequest;
        }

        if (abrController.getAbandonmentStateFor(mediaType) === metricsConstants.ABANDON_LOAD) {
            return switchRequest;
        }

        // QoE parameters
        let bitrateList = mediaInfo.bitrateList;  // [{bandwidth: 200000, width: 640, height: 360}, ...]
        let segmentDuration = rulesContext.getRepresentationInfo().fragmentDuration;
        let minBitrateKbps = bitrateList[0].bandwidth / 1000.0;                         // min bitrate level
        let maxBitrateKbps = bitrateList[bitrateList.length - 1].bandwidth / 1000.0;    // max bitrate level
        for (let i = 0; i < bitrateList.length; i++){
            let b = bitrateList[i].bandwidth / 1000.0;
            if (b > maxBitrateKbps) maxBitrateKbps = b;
            else if (b < minBitrateKbps) minBitrateKbps = b;
        }

        /*
         * Select next quality
         */
        if (currentBufferLevel < 0.2) {
            console.log('-- buffer in danger');
            switchRequest.quality = 0;
        } else {
            switchRequest.quality = heuristicController.getNextQuality(segmentDuration, bitrateList, latency, currentBufferLevel, playbackRate, throughput, liveDelay, player, playbackController, abrController);
        }
        switchRequest.reason = { throughput: throughput, latency: latency};
        switchRequest.priority = SwitchRequest.PRIORITY.STRONG;

        scheduleController.setTimeToLoadDelay(0);

        console.log('[TgcHeuristicRule][' + mediaType + '] requesting switch to index: ', switchRequest.quality, 'Average throughput', Math.round(throughput), 'kbps');

        return switchRequest;
    }

    instance = {
        getMaxIndex: getMaxIndex
    };

    setup();

    return instance;
}

/* *******************************
*    Main abr logic
* ******************************* */
class HeuristicAbrController{

    constructor() {
        // Store past throughputs to calculate harmonic mean for future bandwidth prediction
        this.pastThroughputs = [];
    }

    getNextQuality(segmentDuration, bitrateList, latency, currentBufferLevel, playbackRate, throughput, liveDelay, player, playbackController, abrController) {
        // Update throughput value
        this.pastThroughputs.push(throughput);

        let futureSegmentCount = 5;     // lookahead window
        // let futureSegmentCount = 2;     // lookahead window - small
        let maxReward = -100000000;
        let bestOption = [];
        let bestQoeInfo = {};

        // Qoe stuff
        let qoeEvaluatorTmp = new QoeEvaluator();
        let minBitrateKbps = bitrateList[0].bandwidth / 1000.0;                         // min bitrate level
        let maxBitrateKbps = bitrateList[bitrateList.length - 1].bandwidth / 1000.0;    // max bitrate level
        for (let i = 0; i < bitrateList.length; i++) {   // in case bitrateList is not sorted as expeected
            let b = bitrateList[i].bandwidth / 1000.0;
            if (b > maxBitrateKbps) maxBitrateKbps = b;
            else if (b < minBitrateKbps) minBitrateKbps = b;
        }

        // Iterate all possible combinations of bitrates
        // (numBitrates^futureSegmentCount e.g. 3^5 = 243 options)
        let qualityList = [];
        bitrateList.forEach(function (bitrateInfo, index) { qualityList.push(index); });
        let options = this.getPermutations(qualityList, futureSegmentCount);
        // console.log(options.length); // e.g. 243

        // For each option, compute reward and identify option with maxReward
        options.forEach((segments, optionIndex) => {
            // console.log('------------- Option: ' + segments + ' -------------');

            // Set up new (per-segment) Qoe evaluation for each option
            qoeEvaluatorTmp.setupPerSegmentQoe(segmentDuration, maxBitrateKbps, minBitrateKbps);
            // qoeEvaluatorTmp.setupPerChunkQoe((0.5/15), maxBitrateKbps, minBitrateKbps);

            // Set up tmpBuffer to simulate and estimate rebuffer time for each future segment
            let tmpBuffer = currentBufferLevel;
            let currentPlaybackSpeed = playbackRate;
            let currentLatency = 0; // in case latency = NaN, set latency to 0 to ignore this factor
            if (latency) currentLatency = latency;

            // Estimate futureBandwidth as harmonic mean of past X throughput values
            let pastThroughputCount = 5;
            let futureBandwidthKbps = this.calculateHarmonicMean(this.pastThroughputs.slice(pastThroughputCount * -1));
            // console.log('Estimated futureBandwidthKbps: ' + futureBandwidthKbps);

            // For each segment in lookahead window (window size: futureSegmentCount)
            segments.forEach((quality, segmentIndex) => {
                // console.log('### Segment, quality: ' + quality + ' ###');
                // Metrics required for each future segment
                let segmentBitrateKbps = bitrateList[quality].bandwidth / 1000.0;
                let segmentRebufferTime;

                // Estimate futureSegmentSize
                let futureSegmentSizeKbits;

                // R-hat (Naive) //
                futureSegmentSizeKbits = segmentDuration * segmentBitrateKbps;

                // R-hat (Avg of past X segments) //
                // Todo - Assumed same size for all future segments, to update?
                // Todo - Omit anomaly sizes (e.g. those for the init segment)
                // Todo - Estimated segment size should be post-proportioned according to quality level
                // if (!metrics.RequestsQueue || !metrics.RequestsQueue.executedRequests) {
                //     // No previous request data, use naive estimation for segment size
                //     futureSegmentSizeKbits = segmentDuration * segmentBitrateKbps; 
                // }
                // else {
                //     // Estimate futureSegmentSize based on past request data, i.e. previous segments downloaded
                //     let pastSegmentSizeCount = Math.min(5, metrics.RequestsQueue.executedRequests.length);
                //     let pastSegmentSizes = [];
                //     for (let i = pastSegmentSizeCount; i > 0; i--) {
                //         let index = metrics.RequestsQueue.executedRequests.length - i;
                //         let pastRequest = metrics.RequestsQueue.executedRequests[index];
                //         let segmentSizeBytes = pastRequest.bytesTotal;
                //         pastSegmentSizes.push(segmentSizeBytes);
                //     }
                //     futureSegmentSizeKbits = (calculateArithmeticMean(pastSegmentSizes) * 8 / 1000.0);
                //     console.log('pastSegmentSizes:');
                //     console.log(pastSegmentSizes);
                //     console.log('Estimated futureSegmentSize: ' + calculateArithmeticMean(pastSegmentSizes));
                // }
                // console.log('Estimated futureSegmentSizeKbits: ' + futureSegmentSizeKbits);

                // Estimate downloadTime based on futureBandwidth and futureSegmentSize
                let downloadTime = futureSegmentSizeKbits / futureBandwidthKbps;
                // console.log('Estimated downloadTime: ' + downloadTime);
                
                // console.log('-------------------------------------------');
                // console.log('tmpBuffer (bef): ' + tmpBuffer + ', futureBandwidthKbps: ' + futureBandwidthKbps + ', futureSegmentSizeKbits: ' + futureSegmentSizeKbits + ', downloadTime: ' + downloadTime);

                /*
                 * Determine segmentRebufferTime (if any) for this future segment
                 * Future work: Account for playback speed
                 */
                if (downloadTime > tmpBuffer) { 
                    // Rebuffer case
                    segmentRebufferTime = (downloadTime - tmpBuffer);
                    // Update buffer
                    tmpBuffer = segmentDuration;
                    // Update latency
                    currentLatency += segmentRebufferTime;
                } else {
                    // No rebuffer case
                    segmentRebufferTime = 0;
                    // Update buffer
                    tmpBuffer -= downloadTime;
                    tmpBuffer += segmentDuration;
                }

                // console.log('tmpBuffer (aft): ' + tmpBuffer + ', segmentRebufferTime: ' + segmentRebufferTime);
                // console.log('-------------------------------------------');

                /* 
                 * Determine playbackSpeed after the download of this future segment
                 */
                let liveCatchUpPlaybackRate = player.getSettings().streaming.liveCatchUpPlaybackRate;   // user-specified playbackRate bound
                let liveCatchUpMinDrift = player.getSettings().streaming.liveCatchUpMinDrift            // user-specified min. drift (between latency target and actual latency)
                let playbackStalled = false;    // calc pbSpeed -after- download of future segment, hence there will not be any stall since the segment is assumed to have just completed download
                let futurePlaybackSpeed;

                // Check if to use custom or default playback rate calculations
                let useCustomPlaybackControl, playbackBufferMin, playbackBufferMax;
                if (player.getSettings().streaming.playbackBufferMin && player.getSettings().streaming.playbackBufferMax) {
                    useCustomPlaybackControl = true;
                    playbackBufferMin = player.getSettings().streaming.playbackBufferMin;
                    playbackBufferMax = player.getSettings().streaming.playbackBufferMax;
                } else {
                    useCustomPlaybackControl = false;
                }

                // Check if need to catch up (custom/default methods)
                let needToCatchUp;
                if (useCustomPlaybackControl) {
                    // Custom method
                    needToCatchUp = playbackController.tryNeedToCatchUpCustom(liveCatchUpPlaybackRate, currentLatency, liveDelay, liveCatchUpMinDrift, tmpBuffer, playbackBufferMin, playbackBufferMax);
                } else {
                    // Default method
                    needToCatchUp = playbackController.tryNeedToCatchUp(liveCatchUpPlaybackRate, currentLatency, liveDelay, liveCatchUpMinDrift);
                }

                // If need to catch up, calculate new playback rate (custom/default methods)
                if (needToCatchUp) {
                    let newRate;
                    if (useCustomPlaybackControl) {
                        newRate = playbackController.calculateNewPlaybackRateCustom(liveCatchUpPlaybackRate, currentLatency, liveDelay, liveCatchUpMinDrift, playbackBufferMin, playbackBufferMax, playbackStalled, tmpBuffer, currentPlaybackSpeed).newRate;
                    } else {
                        newRate = playbackController.calculateNewPlaybackRate(liveCatchUpPlaybackRate, currentLatency, liveDelay, playbackStalled, tmpBuffer, currentPlaybackSpeed).newRate;
                    }
                    if (newRate) {
                        futurePlaybackSpeed = newRate;
                    } else {
                        // E.g. don't change playbackrate for small variations
                        futurePlaybackSpeed = currentPlaybackSpeed;
                    }
                }
                else {
                    // If no need to catch up, run equivalent to playbackController.stopPlaybackCatchUp()
                    futurePlaybackSpeed = 1.0;
                }
                // console.log('futurePlaybackSpeed: ' + futurePlaybackSpeed);

                /*
                 * Determine latency after the download (and playback) of this future segment
                 * Note: Assume the next segment is played uniformly with the playback speed calculated at the start of the segment
                 */
                let catchupDuration = segmentDuration - (segmentDuration / futurePlaybackSpeed);
                let futureLatency = currentLatency - catchupDuration;
                // console.log('currentLatency: ' + currentLatency + ', catchupDuration: ' + catchupDuration + ', futureLatency: ' + futureLatency);

                qoeEvaluatorTmp.logSegmentMetrics(segmentBitrateKbps, segmentRebufferTime, futureLatency, futurePlaybackSpeed);

                // Update values for next segment loop
                currentLatency = futureLatency;
                currentPlaybackSpeed = futurePlaybackSpeed;
            });

            // Calculate potential reward for this option
            let currentQoeInfo = qoeEvaluatorTmp.getPerSegmentQoe();
            // console.log('### QoeInfo ###');
            // console.log(currentQoeInfo);

            let reward = currentQoeInfo.totalQoe;
            if (reward > maxReward) {
                maxReward = reward;
                bestOption = options[optionIndex];
                bestQoeInfo = currentQoeInfo;
            }
        });

        // For debugging
        // console.log('### bestOption: ' + bestOption + ' ###');
        // console.log('### bestQoeInfo ###');
        // console.log(bestQoeInfo);

        let nextQuality;
        if (bestOption.length < 1) { 
            // If no bestOption was found, use quality best matched to throughput
            nextQuality = abrController.getQualityForBitrate(mediaInfo, throughput, latency);
        } else {
            nextQuality = bestOption[0];
        }

        return nextQuality;
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

    calculateHarmonicMean(arrOfValues) {
        let sumOfReciprocals = 0;
        arrOfValues.forEach(function (value, index) {
            sumOfReciprocals += (1.0 / value);
        });
        // Return harmonic mean
        return (1.0 / (sumOfReciprocals / arrOfValues.length));
    }

}

TgcHeuristicRuleClass.__dashjs_factory_name = 'TgcHeuristicRule';
TgcHeuristicRule = dashjs.FactoryMaker.getClassFactory(TgcHeuristicRuleClass);