---
layout: default
title: DroppedFramesRule
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# DroppedFramesRule

## Description

While the current throughput and the current buffer level might allow playing the video stream on a high
quality `Representation` the underlying platform might not be able to render the content without dropping frames.
Dropped frames refer to video frames that are not successfully delivered or displayed during playback. This can occur
when the video playback system is unable to keep up with the required frame rate, resulting in skipped frames. Dropped
frames can cause a decrease in video quality and a disruption in smooth playback.

The `DroppedFramesRule` monitors the ratio of dropped frames and total frames and reduces the video quality if the ratio
exceeds the value defined in `droppedFramesPercentageThreshold`:

````js
if (totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.minimumSampleSize 
    && droppedFrames / totalFrames > settings.get().streaming.abr.rules.droppedFramesRule.parameters.droppedFramesPercentageThreshold) {
    newRepresentation = representations[i - 1];
}
````

## Configuration Options

| Parameter                          | Description                                                                                                                               |
|:-----------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------|
| `minimumSampleSize`                | Sum of rendered and dropped frames required for each Representation before the rule kicks in.                                             |
| `droppedFramesPercentageThreshold` | Minimum percentage of dropped frames compared to total frames to trigger a quality downs-switch. Values are defined in the range of 0 - 1 |

## Example

```js
player.updateSettings({
    streaming: {
        abr: {
            rules: {
                droppedFramesRule: {
                    active: true,
                    parameters: {
                        minimumSampleSize: 375,
                        droppedFramesPercentageThreshold: 0.15
                    }
                }
            }
        }
    }
});
```
