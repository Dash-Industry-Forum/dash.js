---
layout: default
title: BolaRule
parent: Adaptive Bitrate Streaming
grand_parent: Usage
---

# BolaRule

## Description

The `BolaRule` is a buffer based ABR rule. BOLA uses a bitrate selection function that maps the current buffer level to
the bitrate of the next segment to be downloaded. The illustration below shows an example of a bitrate selection
function for a video that is encoded in three bitrates (1000, 2500 and 5000 kbps) and has a buffer capacity of 18
seconds. The thresholds for switching to a different quality are at 5 and 10 seconds of buffer. 

![ABR]({{site.baseurl}}/assets/images/bola.png)

For additional details about the BOLA rule check out the following two paper:

* [From Theory to Practice: Improving Bitrate Adaptation in the DASH Reference Player](https://dl.acm.org/doi/pdf/10.1145/3336497)
* [BOLA: Near-optimal bitrate adaptation for online videos](https://ieeexplore.ieee.org/document/7524428)

## Example

```js
player.updateSettings({
    streaming: {
        abr: {
            rules: {
                bolaRule: {
                    active: true
                }
            }
        }
    }
});
```


