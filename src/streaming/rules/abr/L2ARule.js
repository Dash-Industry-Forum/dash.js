
/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2020, Unified Streaming.
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

// For a description of the Learn2Adapt-LowLatency (L2A-LL) bitrate adaptation algorithm, see https://github.com/unifiedstreaming/Learn2Adapt-LowLatency/blob/master/Online_learning_for_bitrate_adaptation_in_low_latency_live_streaming_CR.pdf

import MetricsConstants from '../../constants/MetricsConstants';
import SwitchRequest from '../SwitchRequest';
import FactoryMaker from '../../../core/FactoryMaker';
import { HTTPRequest } from '../../vo/metrics/HTTPRequest';
import EventBus from '../../../core/EventBus';
import Events from '../../../core/events/Events';
import Debug from '../../../core/Debug';

// L2A_STATE_ONE_BITRATE   : If there is only one bitrate (or initialization failed), always return NO_CHANGE.
// L2A_STATE_STARTUP       : Set placeholder buffer such that we download fragments at most recently measured throughput.
// L2A_STATE_STEADY        : Buffer primed, we switch to steady operation.
const L2A_STATE_ONE_BITRATE    = 0;
const L2A_STATE_STARTUP        = 1;
const L2A_STATE_STEADY         = 2;


let w = [];//Vector of probabilities associated with bitrate decisions
let prev_w = [];//Vector of probabilities associated with bitrate decisions calculated in the previous step
let Q=0;//Initialization of Lagrangian multiplier (This keeps track of the buffer displacement)
let segment_request_start_s=0;
let segment_download_finish_s=0;
let B_target=1.5;//Target buffer level



function L2ARule(config) {

    config = config || {};
    const context = this.context;

    const dashMetrics = config.dashMetrics;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        L2AStateDict;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        resetInitialSettings();

        eventBus.on(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.on(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.on(Events.METRIC_ADDED, onMetricAdded, instance);
        eventBus.on(Events.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested, instance);
    }

    function getInitialL2AState(rulesContext) {
        const initialState = {};
        const mediaInfo = rulesContext.getMediaInfo();
        const bitrates = mediaInfo.bitrateList.map(b => b.bandwidth)/1000;
        initialState.state = L2A_STATE_STARTUP;
        initialState.bitrates = bitrates;
        initialState.lastQuality = 0;
        clearL2AStateOnSeek(initialState);
        return initialState;
    }

    function clearL2AStateOnSeek(L2AState) {
        L2AState.placeholderBuffer = 0;
        L2AState.mostAdvancedSegmentStart = NaN;
        L2AState.lastSegmentWasReplacement = false;
        L2AState.lastSegmentStart = NaN;
        L2AState.lastSegmentDurationS = NaN;
        L2AState.lastSegmentRequestTimeMs = NaN;
        L2AState.lastSegmentFinishTimeMs = NaN;
    }

    function getL2AState(rulesContext) {
        const mediaType = rulesContext.getMediaType();
        let L2AState = L2AStateDict[mediaType];
        if (!L2AState) {
            L2AState = getInitialL2AState(rulesContext);
            L2AStateDict[mediaType] = L2AState;
        }
        return L2AState;
    }

    function onPlaybackSeeking() {
        for (const mediaType in L2AStateDict) {
            if (L2AStateDict.hasOwnProperty(mediaType)) {
                const L2AState = L2AStateDict[mediaType];
                if (L2AState.state !== L2A_STATE_ONE_BITRATE) {
                    L2AState.state = L2A_STATE_STARTUP; 
                    clearL2AStateOnSeek(L2AState);
                }
            }
        }
    }

    function onMediaFragmentLoaded(e) {
        if (e && e.chunk && e.chunk.mediaInfo) {
            const L2AState = L2AStateDict[e.chunk.mediaInfo.type];
            if (L2AState && L2AState.state !== L2A_STATE_ONE_BITRATE) {
                const start = e.chunk.start;
                if (isNaN(L2AState.mostAdvancedSegmentStart) || start > L2AState.mostAdvancedSegmentStart) {
                    L2AState.mostAdvancedSegmentStart = start;
                    L2AState.lastSegmentWasReplacement = false;
                } else {
                    L2AState.lastSegmentWasReplacement = true;
                }

                L2AState.lastSegmentStart = start;
                L2AState.lastSegmentDurationS = e.chunk.duration;
                L2AState.lastQuality = e.chunk.quality;

                checkNewSegment(L2AState, e.chunk.mediaInfo.type);
            }
        }
    }

    function onMetricAdded(e) {
        if (e && e.metric === MetricsConstants.HTTP_REQUEST && e.value && e.value.type === HTTPRequest.MEDIA_SEGMENT_TYPE && e.value.trace && e.value.trace.length) {
            const L2AState = L2AStateDict[e.mediaType];
            if (L2AState && L2AState.state !== L2A_STATE_ONE_BITRATE) {
                L2AState.lastSegmentRequestTimeMs = e.value.trequest.getTime();
                L2AState.lastSegmentFinishTimeMs = e.value._tfinish.getTime();

               checkNewSegment(L2AState, e.mediaType);
            }
        }
    }

   function checkNewSegment(L2AState, mediaType) {
        if (!isNaN(L2AState.lastSegmentStart) && !isNaN(L2AState.lastSegmentRequestTimeMs)){

            segment_request_start_s=0.001*L2AState.lastSegmentRequestTimeMs;
            segment_download_finish_s=0.001*L2AState.lastSegmentFinishTimeMs;
            L2AState.lastSegmentStart = NaN;
            L2AState.lastSegmentRequestTimeMs = NaN;
        }
    }

    function onQualityChangeRequested(e) {
        // Useful to store change requests when abandoning a download.
        if (e) {
            const L2AState = L2AStateDict[e.mediaType];
            if (L2AState && L2AState.state !== L2A_STATE_ONE_BITRATE) {
                L2AState.abrQuality = e.newQuality;
            }
        }
    }

   function indexOfMin(arr) {
        // Calculates teh index of the minimum value of an array
        if (arr.length === 0) {
           return -1;
        }
       var min = arr[0];
       var minIndex = 0;  
       for (var i = 0; i < arr.length; i++) {
           if (arr[i] <= min) {
               minIndex = i;
               min = arr[i];
            }
        }
        return minIndex;
    } 

   function dotmultiplication(arr1,arr2) {
        // Dot multiplication of two arrays
       if (arr1.length != arr2.length) {
           return -1;
       }
       var sumdot =0;
       for (var i = 0; i < arr1.length; i++) {
           sumdot=sumdot+arr1[i]*arr2[i];
       } 
       return sumdot;
   } 
   
   function Euclidean_projection(arr) {
        //project an n-dim vector y to the simplex Dn
        // Dn = { x : x n-dim, 1 >= x >= 0, sum(x) = 1}
        //Algorithm is explained at http://arxiv.org/abs/1101.6081
        const m = arr.length
        var bget = false;
        var arr2=[];
        for (let ii = 0; ii < m; ++ii) {
            arr2[ii]=arr[ii];
        }
        var s =arr.sort(function(a, b){return b-a}); 
        var tmpsum = 0;
        var tmax = 0;
        var x=[];   
        for (let ii = 0; ii < m-1; ++ii) {
            tmpsum = tmpsum + s[ii];
            tmax = (tmpsum - 1)/(ii+1);
            if (tmax >= s[ii+1]){
                bget = true;
                break;
            }      
        }
        if (!bget){
           tmax = (tmpsum + s[m-1] -1)/m;
        }
       for (let ii = 0; ii < m; ++ii) {
            x[ii] = Math.max(arr2[ii]-tmax,0);
        }
        return x;
    }

    function getMaxIndex(rulesContext) {
        const switchRequest = SwitchRequest(context).create();
        const horizon=8//Optimization horizon
        const VL = Math.pow(horizon,0.2);//Cautiousness parameter
        const alpha =Math.max(Math.pow(horizon,0.7),VL*Math.sqrt(horizon));//Step size
        let diff1=[]//Used to calculate the difference between consecutive decisions (w-w_prev) 
        const mediaInfo = rulesContext.getMediaInfo();
        const mediaType = rulesContext.getMediaType();
        const bitrates = mediaInfo.bitrateList.map(b => b.bandwidth);
        const bitrateCount = bitrates.length;
        const scheduleController = rulesContext.getScheduleController();
        const streamInfo = rulesContext.getStreamInfo();
        const abrController = rulesContext.getAbrController();
        const throughputHistory = abrController.getThroughputHistory();
        const isDynamic = streamInfo && streamInfo.manifestInfo && streamInfo.manifestInfo.isDynamic;
        const useL2AABR = rulesContext.useL2AABR();
        const bufferLevel = dashMetrics.getCurrentBufferLevel(mediaType, true);
        const safeThroughput = throughputHistory.getSafeAverageThroughput(mediaType, isDynamic);
        const throughput = throughputHistory.getAverageThroughput(mediaType, isDynamic);     
        const c_throughput=throughput/1000;//Throughput in Mbps
        const react=20;///Reactiveness to throughput drops
        const latency = throughputHistory.getAverageLatency(mediaType);
        let quality;
    
        if (!rulesContext || !rulesContext.hasOwnProperty('getMediaInfo') || !rulesContext.hasOwnProperty('getMediaType') ||
            !rulesContext.hasOwnProperty('getScheduleController') || !rulesContext.hasOwnProperty('getStreamInfo') ||
            !rulesContext.hasOwnProperty('getAbrController') || !rulesContext.hasOwnProperty('useL2AABR')) {
                console.log(!rulesContext.hasOwnProperty('useL2AABR'))
            return switchRequest;
        }

        switchRequest.reason = switchRequest.reason || {};

        if (!useL2AABR) {
            return switchRequest;
        }

        scheduleController.setTimeToLoadDelay(0);

        const L2AState = getL2AState(rulesContext);

        if (L2AState.state === L2A_STATE_ONE_BITRATE) {
            // shouldn't even have been called
            return switchRequest;
        }

        switchRequest.reason.state = L2AState.state;
        switchRequest.reason.throughput = throughput;
        switchRequest.reason.latency = latency;

        if (isNaN(throughput)) {
            // still starting up - not enough information
            return switchRequest;
        }

        switch (L2AState.state) {
            case L2A_STATE_STARTUP:
                quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, latency);

                switchRequest.quality = quality;
                switchRequest.reason.throughput = safeThroughput;

                L2AState.lastQuality = quality;

                if (!isNaN(L2AState.lastSegmentDurationS) && bufferLevel >= L2AState.lastSegmentDurationS) {
                    L2AState.state = L2A_STATE_STEADY;
                }

                break; // L2A_STATE_STARTUP

            case L2A_STATE_STEADY:


                /////////////////////////////////////////////////////////

                //Main adaptation logic of L2A-LL
                let V=L2AState.lastSegmentDurationS;
                //const  cc_throughput=(bitrates[L2AState.lastQuality]*V/(segment_download_finish_s-segment_request_start_s))/(1000*1000);
                //console.log('Computed throughput:',cc_throughput);
                
                if (w.length==0){//Initialization of w and w_prev
                    Q=0;
                    for (let i = 0; i < bitrateCount; ++i) {
                    if (i==0){
                            w[i]=0.33;
                            prev_w[i]=1
                        }
                        else{
                            w[i]=0.33;
                            prev_w[i]=0;
                        }
                    }
                } 
              
                for (let i = 0; i < bitrateCount; ++i) {
                    bitrates[i]=bitrates[i]/(1000*1000);   //Bitrates in Mbps
                    w[i]=prev_w[i]-(1/(2*alpha))*(V*bitrates[i])*((Q-VL)/Math.min(2*bitrates[bitrateCount-1],c_throughput));  //Lagrangian descent 
                    diff1[i]=w[i]-prev_w[i]; 
                }                        
                
                w=Euclidean_projection(w);       

                if (bitrates[L2AState.lastQuality]>((bitrates[L2AState.lastQuality]*V/(segment_download_finish_s-segment_request_start_s)))){if (Q<VL){Q=horizon*VL*react;}}//Reset Lagrangian multiplier (Q) to speed up potential bitrate switch based on previous throughput measurement
                //else if (bitrates[L2AState.lastQuality]<=(c_throughput)){if (Q>=VL){Q=0;}}////********* changed
                
                Q=Math.max(0,Q+V*dotmultiplication(bitrates,prev_w)/Math.min(2*bitrates[bitrateCount-1],c_throughput)-(react/2)*V+V*(dotmultiplication(bitrates,diff1)/Math.min(2*bitrates[bitrateCount-1],c_throughput)));      
           
                let temp=[];
            
                for (let i = 0; i < bitrateCount; ++i) {
                    prev_w[i]=w[i];            
                    temp[i]=Math.abs(bitrates[i]-dotmultiplication(w,bitrates));  
                }
                              
                //// Quality is calculated as argmin of the aboslute differnce between available bitrates (bitrates[i]) and bitrate estimation (dotmultiplication(w,bitrates)). We employ a stepwise ascent/descent
               
                if (indexOfMin(temp)>L2AState.lastQuality){quality=L2AState.lastQuality+1;}
                else if(indexOfMin(temp)<L2AState.lastQuality){quality=L2AState.lastQuality-1;}
                else{quality = indexOfMin(temp);}

                /// Provision againts over-estimation.
                if ((bitrates[quality]>=c_throughput)&&(bufferLevel<B_target)){
                    quality=L2AState.lastQuality;

                }
            
                switchRequest.quality = quality;       
                switchRequest.reason.throughput = throughput;
                switchRequest.reason.latency = latency;
                switchRequest.reason.bufferLevel = bufferLevel;
                L2AState.lastQuality = quality;
                
                break; // L2A_STATE_STEADY

            default:
                logger.debug('L2A ABR rule invoked in bad state.');
                // should not arrive here, try to recover
                switchRequest.quality = abrController.getQualityForBitrate(mediaInfo, safeThroughput, latency);
                switchRequest.reason.state = L2AState.state;
                switchRequest.reason.throughput = safeThroughput;
                switchRequest.reason.latency = latency;
                L2AState.state = L2A_STATE_STARTUP;
                clearL2AStateOnSeek(L2AState);
        }
       

        return switchRequest;
    }

    function resetInitialSettings() {
        L2AStateDict = {};
    }

    function reset() {
        resetInitialSettings();

        eventBus.off(Events.PLAYBACK_SEEKING, onPlaybackSeeking, instance);
        eventBus.off(Events.MEDIA_FRAGMENT_LOADED, onMediaFragmentLoaded, instance);
        eventBus.off(Events.METRIC_ADDED, onMetricAdded, instance);
        eventBus.off(Events.QUALITY_CHANGE_REQUESTED, onQualityChangeRequested, instance);
    }

    instance = {
        getMaxIndex: getMaxIndex,
        reset: reset
    };

    setup();
    return instance;
}

L2ARule.__dashjs_factory_name = 'L2ARule';
export default FactoryMaker.getClassFactory(L2ARule);