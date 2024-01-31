---
layout: default
title: SwitchHistoryRule
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# SwitchHistoryRule

## Description

Frequent quality switches result in a negative QoE for the end-user. The main objective of the `SwitchHistoryRule` is to
to detect and avoid any extreme bitrate oscillations allowed by the ABR algorithms. For that reason,
the `SwitchHistoryRule` monitors quality down-switches. It derives a ratio of down-switches divided by the number of
times the quality stayed the same or even improved. If this ratio exceeds the `switchPercentageThreshold` the quality is
reduced.

````js
if (drops + noDrops >= settings.get().streaming.abr.rules.switchHistoryRule.parameters.sampleSize
    && (drops / noDrops > settings.get().streaming.abr.rules.switchHistoryRule.parameters.switchPercentageThreshold)) {
    switchRequest.representation = (i > 0 && switchRequests[currentPossibleRepresentation.id].drops > 0) ? representations[i - 1] : currentPossibleRepresentation;
}
````

## Configuration Options

| Parameter                   | Description                                                                                                                                                   |
|:----------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `minimumSampleSize`         | Sum of ABR quality checks required before the rule kicks in.                                                                                                  |
| `switchPercentageThreshold` | Ratio of quality drops compared to no quality drops must exceed this threshold before a potential quality down-switch by the `SwitchHistoryRule` is enforced. |

## Example

```js
player.updateSettings({
    streaming: {
        abr: {
            rules: {
                switchHistoryRule: {
                    active: true,
                    parameters: {
                        minimumSampleSize: 8,
                        switchPercentageThreshold: 0.075
                    }
                }
            }
        }
    }
});
```
