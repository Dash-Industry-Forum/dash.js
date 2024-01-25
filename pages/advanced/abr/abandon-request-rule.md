---
layout: default
title: AbandonRequestRule
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# AbandonRequestRule

## Description
During the download of a media segment dash.js receives multiple `progress` events from the underlying API that is
used for downloading the data (e.g. `XMLHttpRequest`). These events have a timestamp and contain information about the
number of bytes that have been received so far. Using this information dash.js decides whether to abort the download of
a segment.

The `AbandonRequestRule` implements the logic to decide whether the download of a media segment shall be aborted.
Moreover, the rules decides to which quality to switch in such a scenario. Segment downloads are aborted if the current
throughput is not
sufficient to finish the download of the current media segment in a "reasonable" time.

For that reason, the `AbandonRequestRule` calculates the throughput based on the received samples (`progress` event)
from the current media segment. If the remaining download time for the current segment is larger than the current
segment duration multiplied
by `abandonDurationMultiplier` and the number of remaining bytes to download is larger than the number of total bytes
for the new quality the `AbandonRequestRule` triggers a switch to a lower quality:

```js
if (estimatedTimeOfDownloadInSeconds < request.duration * settings.get().streaming.abr.rules.abandonRequestsRule.parameters.abandonDurationMultiplier || abrController.isPlayingAtLowestQuality(representation)) {
    return switchRequest;
}

const remainingBytesToDownload = request.bytesTotal - request.bytesLoaded;
const optimalRepresentationForBitrate = abrController.getOptimalRepresentationForBitrate(mediaInfo, throughputInKbit, true);
const totalBytesForOptimalRepresentation = request.bytesTotal * optimalRepresentationForBitrate.bitrateInKbit / currentRequestedRepresentation.bitrateInKbit;

// Switch quality in case there is a Representation that requires less bytes to download
if (remainingBytesToDownload > totalBytesForOptimalRepresentation) {
    switchRequest.representation = optimalRepresentationForBitrate;
    switchRequest.reason = {
        throughputInKbit
    }
    abandonDict[request.index] = true;
    logger.info(`[AbandonRequestRule][${mediaType} is asking to abandon and switch to quality to ${optimalRepresentationForBitrate.absoluteIndex}. The measured bandwidth was ${throughputInKbit} kbit/s`);
}
```

## Configuration Options

| Parameter                                     | Description                                                                                                                                           |
|:--------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------|
| `abandonDurationMultiplier`           | Factor to multiply with the segment duration to compare against the estimated remaining download time of the current segment. See code example above. |
| `minSegmentDownloadTimeThresholdInMs` | The `AbandonRequestRule` only kicks if the download time of the current segment exceeds this value.                                                   |
| `minThroughputSamplesThreshold`       | Minimum throughput samples (equivalent to number of `progress` events) required before the `AbandonRequestRule` kicks in.                             |


## Example

```js
player.updateSettings({
    streaming: {
        abr: {
            activeRules: {
                abandonRequestsRule: {
                    active: true,
                    parameters: {
                        abandonDurationMultiplier: 1.8,
                        minSegmentDownloadTimeThresholdInMs: 500,
                        minThroughputSamplesThreshold: 6
                    }
                }
            }
        }
    }
});
```
