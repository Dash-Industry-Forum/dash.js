---
layout: default
title: LoL+ Rule
parent: Adaptive Bitrate Streaming
grand_parent: Usage
---

# LoL+

## Description
LoL+ is an algorithm optimized for CMAF low latency. As such it should not be used for "standard" VoD and live content
and only be activated if the CMAG segments contain CMAF chunks. LoL+ is designed as a series of sophisticated yet robust
player improvements for low latency live (LLL) streaming. LoL+ consists of five essential modules:

1. The **bitrate selection module** implements a learning-based ABR algorithm to choose a suitable bitrate at each
   segment download. The ABR algorithm is based on an SOM model that considers multiple QoE metrics as well as bandwidth
   variability.
2. The **playback speed control module** implements a hybrid algorithm that considers both the current latency and
   buffer level to control the playback speed.
3. The **throughput measurement module** accurately calculates the throughout by removing the idle times between the
   chunks of a segment through a three-step algorithm.
4. The **QoE evaluation module** computes the QoE considering five key metrics: selected bitrate, number of bitrate
   switches, rebuffering duration, latency and playback speed.
5. Lastly, the **weight selection module** implements a two-step dynamic weight assignment for the SOM model features.
   We also added manual (equal value of 0.4 each) and random (based on Xavier formula) weight assignment for the SOM
   model features for comparison.

The modules can be found in the following files:

1. Bitrate selection module (i.e., ABR algorithm):
   `dash.js/src/streaming/rules/abr/lolp/LoLpRule.js` and
   `LearningAbrController.js`
2. Playback speed control module:
   `dash.js/src/streaming/controllers/CatchupController.js`
3. Throughput measurement module:
   `dash.js/src/streaming/net/FetchLoader.js`
4. QoE evaluation module:
   `dash.js/src/streaming/rules/abr/lolp/LoLpQoeInfo.js` and `dash.js/src/streaming/rules/abr/lolp/LoLpQoEEvaluator.js`
5. Weight selection module:
   `dash.js/src/streaming/rules/abr/lolp/LoLpWeightSelector.js`

## Basic dash.js configuration

How to enable each of the LoL+ modules:

```javascript
player.updateSettings({
    streaming: {
        abr: {
            rules : {
               loLPRule: {
                  active: true
               }
            },   
            throughput: {
               lowLatencyDownloadTimeCalculationMode: dashjs.Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING
            }   
        },
        liveCatchup: {  
            mode: dashjs.Constants.LIVE_CATCHUP_MODE_LOLP
        }
    }
});
```

Note: The weight selection module is used in the bitrate selection module and does not need to be enabled separately.

## Advanced tuning parameters

The parameters below are available but not advised to be changed. For advanced users, please refer to the paper [3] for
further details on these parameters. The following parameters are not exposed in the `settings` object and have to be
changed in the respective classes.

 Module                   | Parameter(s)                                                                | Remarks                                                                                                                                                                                                                                                                 
--------------------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Bitrate selection module | targetLatency = 0                                                           | SOM target latency                                                                                                                                                                                                                                                      
 Bitrate selection module | targetRebufferLevel = 0                                                     | SOM target rebuffering duration.                                                                                                                                                                                                                                        
 Bitrate selection module | targetSwitch = 0                                                            | SOM target number of switches.                                                                                                                                                                                                                                          
 Bitrate selection module | throughputDelta = 10000                                                     | SOM variation in throughput.                                                                                                                                                                                                                                            
 Weight selection module  | DWS_TARGET_LATENCY = 1.5                                                    | Latency constraint used in weight selection module (set in `LolpRule.js`).                                                                                                                                                                                              
 Weight selection module  | DWS_BUFFER_MIN = 0.3                                                        | Minimum buffer value constraint used in weight selection module (set in `LolpRule.js`).                                                                                                                                                                                 
 Weight selection module  | weightObj.throughput, weightObj.latency, weightObj.buffer, weightObj.switch | The weight (value ranges between 0 and 1) of the current throughput, latency, rebuffering duration, and number of switches features of the SOM model (Bitrate selection module) will be assigned dynamically by this module based on the defined optimization function. 

### Detailed code description

At each segment download, the bitrate selection module is triggered and works as follows:

##### (1) Obtain input parameters (pseudocode lines 4-10):

* Current player state: throughput, latency, rebuffer duration, bitrate variation (normalized)
* Weight vector from weight selection module: w

##### (2) Update previously selected neuron with current player state values (pseudocode line 11):

```javascript
// Code snippet from `LearningAbrController.js`
_updateNeurons(currentNeuron, somElements, [throughputNormalized, latency, rebuffer, bitrateSwitch]);
```

##### (3) Iterate all neurons to find the winner neuron that is closest (i.e., shortest distance) to the target state, while not violating special condition (pseudocode lines 12-27):

```js
// Code snippet from `LearningAbrController.js`
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
    winnerWeights = distanceWeights;
}
```

##### (4) Update the winner neuron with target state values. (pseudocode line 28):

```javascript
// Code snippet from `LearningAbrController.js`
_updateNeurons(winnerNeuron, somElements, [throughputNormalized, targetLatency, targetRebufferLevel, bitrateSwitch]);
```

Note: The QoE evaluation module is provided but QoE score is not used as a SOM factor in the current implementation of
the ABR algorithm. Advanced users may consider using it.

## Reference

* [May Lim, Mehmet N Akcay, Abdelhak  Bentaleb, Ali C. Begen, R. Zimmermann - When they go high, we go low: low-latency live streaming in dash.js with LoL](https://dl.acm.org/doi/abs/10.1145/3339825.3397043)
