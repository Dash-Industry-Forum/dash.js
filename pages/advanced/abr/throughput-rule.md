---
layout: default
title: ThroughputRule
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# ThroughputRule

## Description

The `ThroughputRule` is a very simple ABR rule that uses the average throughput of the previous media segment downloads
to derive the optimal bitrate for the next media segment request.

The essential lines in the implementation are depicted below:

```js
const throughput = throughputController.getSafeAverageThroughput(mediaType);
switchRequest.representation = abrController.getOptimalRepresentationForBitrate(mediaInfo, throughput, true);
```

## Configuration Options

There are no values that are specifically targeting the rule. However, there are some throughput related parameters that
implicitly influence this rule as it is using `throughputController.getSafeAverageThroughput()`. The throughput related
parameters are documented [here](throughput-calculation.html).
