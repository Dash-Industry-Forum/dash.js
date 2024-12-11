---
layout: default
title: L2A Rule
parent: Adaptive Bitrate Streaming
grand_parent: Usage
---

# L2A

## Description

In the context of adaptive streaming, an ABR algorithm aims at seamlessly adjusting (or adapting) the rate of the media
stream, to compensate for changing network conditions. Additionally, a buffer is typically deployed to protect the
client from abrupt changes in the communication channel (throughput, jitter etc.), or temporal misestimations of the ABR
algorithm. Since long buffer queues compound delay of the media rendering process, low-latency streaming requires very
short buffers, that in turn offer less protection against channel state estimation errors. Such errors are propagated to
the ABR decisions, that in turn can have a detrimental effect on streaming experience.

Therefore the goal of  **Learn2Adapt-LowLatency (L2A-LL)**, a low-latency ABR, is to strike a favorable balance between
keeping the buffer as short as possible, while provisioning against its complete depletion. This is achieved by
selecting the highest sustainable bitrate for each video fragment, that does not completely consume the buffer budget
available at the time of request. L2A-LL is, in essence, an optimization solution with the objective of minimizing
latency, while at the same time maximizing achievable video bitrate and ensuring uninterrupted and stable streaming.

L2A-LL formulates the ABR optimization problem under an online (machine) learning framework, based on convex
optimization. First, the streaming client is modelled by a learning agent, whose objective is to minimize the average
buffer displacement of a streaming session. Second, certain requirements regarding the decision set (available bitrates)
and constraint functions are fulfilled by a) allowing the learning agent to make decisions on the video bitrate of each
fragment, according to a probability distribution and by b) deriving an appropriate constraint function associated with
the upper bound of the buffer queue, that adheres to time averaging constraints.

## Basic dash.js configuration

How to enable L2A:

```js
player.updateSettings({
    streaming: {
        abr: {
            rules: {
                l2a: {
                    active: true
                }
            }
        }
    }
});
```

## Advanced Tuning parameters

The following changes are for experienced users and need to be made in `streaming/rules/abr/L2ARule.js`. Please check
the [paper](https://dl.acm.org/doi/pdf/10.1145/3339825.3397042) for further details.

| Line | Parameter   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Conclusion                                                                                                                                                                                                                                                                               |
|------|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 306  | `horizon=4` | **Optimization horizon**: This parameter is used to specify the amount of steps required to achieve convergence. In live streaming settings this parameter must be kept low for stable performance. The selected value has been verified experimentally and alteration is not suggested. This parameter is used in lines 307 and 308, at the calculation of the 'vl' and 'alpha' parameters respectively. The calculation of 'vl' and 'alpha' are according to the theoretical performance guarantees as specified in the MMSys Publication [5]. Higher 'vl' values make the algorithm more aggressive in the bitrate selection and 'alpha' is the step size of the gradient descent approach of the learning process. | higher 'horizon' leads to more aggressive bitrate selection (higher 'vl') and less exploration (large 'alpha'). Not advisable for live streaming scenarios with short buffers.                                                                                                           |
| 322  | `react=2`   | **Reactiveness to volatility** (abrupt throughput drops). This parameter is used to recalibrate the 'l2AParameter.Q'. Higher values make the algorithm more conservative. The chosen value has been experimentally selected and alteration is not suggested.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Higher 'react' results in a more conservative algorithm (higher l2AParameter.Q). Caution: 'react' values higher than the selected (react=2) may make the algorithm select lowest bitrate for extended periods, until recovery of the l2AParameter.Q (updated at every fragment download) |

## Reference
* [Theo Karagkioules,R. Mekuria,Dirk  Griffioen, Arjen  Wagenaar - Online learning for low-latency adaptive streaming](https://dl.acm.org/doi/pdf/10.1145/3339825.3397042)
