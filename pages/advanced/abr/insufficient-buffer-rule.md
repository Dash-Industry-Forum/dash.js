---
layout: default
title: InsufficientBufferRule
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# InsufficientBufferRule

## Description

The `InsufficientBufferRule` verifies each ABR choice to make sure the download is unlikely
to cause a rebuffering event. The rule is best explained by looking at a concrete example. Assume the following values:

* `currentThroughput` = 5Mbit/s
* `currentSafeThroughput` = `currentThroughput` * `throughputSafetyFactor` = 5Mbit/s * 0.9 = 4.5 Mbit/s
* `currentBufferLevel` = 10 seconds
* `segmentDuration` = 4 seconds

To avoid a buffer underrun we need to finish the download of the next segment in 10 seconds. This means we need to
download 4 seconds of content in 10 seconds. This leads us to the following expression that we need to solve:

`possibleBitrate <= currentSafeThroughput * currentBufferLevel / segmentDuration`

Plugging the examples values from above we get:

`possibleBitrate <= 4.5 Mbit/s * 10s / 4s`

So in this case we can select a maximum bitrate of `11.25 Mbit/s`.

## Configuration Options

| Parameter                | Description                                                                                                               |
|:-------------------------|:--------------------------------------------------------------------------------------------------------------------------|
| `throughputSafetyFactor` | The safety factor that is applied to the derived throughput, see example in the Description.                              |
| `segmentIgnoreCount`     | This rule is not taken into account until the first `segmentIgnoreCount` media segments have been appended to the buffer. |

## Example

```js
player.updateSettings({
    streaming: {
        abr: {
            activeRules: {
                insufficientBufferRule: {
                    active: true,
                    parameters: {
                        throughputSafetyFactor: 0.9,
                    }
                }
            }
        }
    }
});
```
