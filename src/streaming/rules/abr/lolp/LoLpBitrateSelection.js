/*
 * Authors:
 * Abdelhak Bentaleb | National University of Singapore | bentaleb@comp.nus.edu.sg
 * Mehmet N. Akcay | Ozyegin University | necmettin.akcay@ozu.edu.tr
 * May Lim | National University of Singapore | maylim@comp.nus.edu.sg
 */

import Debug from '../../../../core/Debug';
import FactoryMaker from '../../../../core/FactoryMaker';
import LearningAbrController from './LearningAbrController';
import LoLpQoeEvaluator from './LoLpQoEEvaluator';
import SwitchRequest from '../../SwitchRequest';
import MetricsConstants from '../../../constants/MetricsConstants';

function LoLpBitrateSelection(config) {

    config = config || {};

    let factory = dashjs.FactoryMaker;
    let dashMetrics = config.dashMetrics;
    let PlaybackController = factory.getSingletonFactoryByName('PlaybackController');
    let context = this.context;

    let logger,
        instance,
        learningController,
        qoeEvaluator;

    function _setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        learningController = LearningAbrController(context).create();
        qoeEvaluator = LoLpQoeEvaluator().create();
    }

    function getMaxIndex(rulesContext) {
        let switchRequest = SwitchRequest(context).create();
        let mediaType = rulesContext.getMediaInfo().type;
        let playbackController = PlaybackController(context).getInstance();
        let abrController = rulesContext.getAbrController();
        const streamInfo = rulesContext.getStreamInfo();
        let currentQuality = abrController.getQualityFor(mediaType, streamInfo);
        const mediaInfo = rulesContext.getMediaInfo();
        const bufferStateVO = dashMetrics.getLatestBufferInfoVO(mediaType, true, MetricsConstants.BUFFER_STATE);
        const scheduleController = rulesContext.getScheduleController();
        const currentBufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
        const isDynamic = streamInfo && streamInfo.manifestInfo ? streamInfo.manifestInfo.isDynamic : null;
        let latency = playbackController.getCurrentLiveLatency();

        if (!latency) {
            latency = 0;
        }

        const playbackRate = playbackController.getPlaybackRate();
        const throughputHistory = abrController.getThroughputHistory();
        const throughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        logger.debug(`Throughput ${Math.round(throughput)} kbps`);

        if (isNaN(throughput) || !bufferStateVO) {
            return switchRequest;
        }

        if (abrController.getAbandonmentStateFor(mediaType) === MetricsConstants.ABANDON_LOAD) {
            return switchRequest;
        }

        // QoE parameters
        let bitrateList = mediaInfo.bitrateList;  // [{bandwidth: 200000, width: 640, height: 360}, ...]
        let segmentDuration = rulesContext.getRepresentationInfo().fragmentDuration;
        let minBitrateKbps = bitrateList[0].bandwidth / 1000.0;                         // min bitrate level
        let maxBitrateKbps = bitrateList[bitrateList.length - 1].bandwidth / 1000.0;    // max bitrate level
        for (let i = 0; i < bitrateList.length; i++) {  // in case bitrateList is not sorted as expected
            let b = bitrateList[i].bandwidth / 1000.0;
            if (b > maxBitrateKbps)
                maxBitrateKbps = b;
            else if (b < minBitrateKbps) {
                minBitrateKbps = b;
            }
        }

        // Learning rule pre-calculations
        let currentBitrate = bitrateList[currentQuality].bandwidth;
        let currentBitrateKbps = currentBitrate / 1000.0;
        let httpRequest = dashMetrics.getCurrentHttpRequest(mediaType, true);
        let lastFragmentDownloadTime = (httpRequest.tresponse.getTime() - httpRequest.trequest.getTime()) / 1000;
        let segmentRebufferTime = lastFragmentDownloadTime > segmentDuration ? lastFragmentDownloadTime - segmentDuration : 0;
        qoeEvaluator.setupPerSegmentQoe(segmentDuration, maxBitrateKbps, minBitrateKbps);
        qoeEvaluator.logSegmentMetrics(currentBitrateKbps, segmentRebufferTime, latency, playbackRate);
        let currentQoeInfo = qoeEvaluator.getPerSegmentQoe();
        let currentTotalQoe = currentQoeInfo.totalQoe;
        console.log("QoE: ", currentTotalQoe);


        /*
        * Dynamic Weights Selector (step 1/2: initialization)
        */
        // let userTargetLatency = mediaPlayerModel.getLiveDelay();    // not ideal to use this value as it is used for playback controller and too conservative for this..
        // Todo: To consider specifying param values via UI
        let dwsTargetLatency = 1.5;
        let dwsBufferMin = 0.3;                             // for safe buffer constraint
        let dwsBufferMax = dwsBufferMin + segmentDuration;  // for safe buffer constraint
        let dynamicWeightsSelector = new DynamicWeightsSelector(dwsTargetLatency, dwsBufferMin, dwsBufferMax, segmentDuration, qoeEvaluator);

        /*
         * Select next quality
         */
        switchRequest.quality = learningController.getNextQuality(mediaInfo, throughput * 1000, latency, currentBufferLevel, playbackRate, currentQuality, dynamicWeightsSelector);
        switchRequest.reason = { throughput: throughput, latency: latency };
        switchRequest.priority = SwitchRequest.PRIORITY.STRONG;

        scheduleController.setTimeToLoadDelay(0);

        if (switchRequest.quality != currentQuality) {
            console.log('[TgcLearningRule][' + mediaType + '] requesting switch to index: ', switchRequest.quality, 'Average throughput', Math.round(throughput), 'kbps');
        }

        return switchRequest;
    }


    instance = {
        getMaxIndex: getMaxIndex
    };

    _setup();

    return instance;
}

LoLpBitrateSelection.__dashjs_factory_name = 'LoLpBitrateSelection';
export default FactoryMaker.getClassFactory(LoLpBitrateSelection);
