---
layout: default
title: Throughput Calculation 
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
---

# Throughput Calculation

dash.js provides multiple options to configure the calculation of the current average throughput. This calculation is an
important input for most of the ABR rules e.g. the [ThroughputRule](throughput-rule.html).
The following options are available:

| Throughput Calculation Mode          | Description                                                                                                                                                                                                                                                                                                                                     |
|:-------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `EWMA`                               | Exponential Weighted Moving Average (EWMA) is a calculation mode that assigns exponentially decreasing weights to the historical data points. It gives more importance to recent data while gradually decreasing the influence of older data points. The `settings.abr.throughput.ewma` object allows the configuration of the EWMA parameters. |
| `ZLEMA`                              | Zero-Lag Exponential Moving Average (ZLEMA) is a calculation mode that aims to reduce or eliminate the lag typically associated with traditional exponential moving averages. It achieves this by using a specific formula that adjusts the weights of the data points to minimize lag                                                          |
| `ARITHMETIC_MEAN`                    | Arithmetic mean, also known as the average, is a statistical measure that calculates the sum of a set of values divided by the number of values in the set.                                                                                                                                                                                     |
| `BYTE_SIZE_WEIGHTED_ARITHMETIC_MEAN` | Byte size weighted arithmetic mean is a calculation method that assigns weights to different values based on their respective byte sizes. To calculate the byte size weighted arithmetic mean, you multiply each value by its corresponding byte size, then sum up the weighted values, and divide the sum by the total byte size.              |
| `DATE_WEIGHTED_ARITHMETIC_MEAN`      | Date-weighted arithmetic mean is a calculation method that assigns weights to different values based on their respective dates. To calculate the date-weighted arithmetic mean, you multiply each value by its corresponding weight based on the date, then sum up the weighted values, and divide the sum by the total weight.                 |
| `HARMONIC_MEAN`                      | To calculate the harmonic mean, you take the total number of values in the set, divide it by the sum of the reciprocals of each value, and then take the reciprocal of that result. As the harmonic mean involves taking the reciprocals of the values, extremely large values have a significant impact on the calculation.                    |
| `BYTE_SIZE_WEIGHTED_HARMONIC_MEAN`   | Similar to the harmonic mean calculation but assigns weights to the different sample values based on their respective byte sizes.                                                                                                                                                                                                               |
| `DATE_WEIGHTED_HARMONIC_MEAN`        | Similar to the harmonic mean calculation but assigns weights to the different sample values based on their respective dates. The most recent sample has a higher weight than the previous samples.                                                                                                                                              |

The default mode is `EWMA`. Most of the throughput calculation modes work on a fixed number of throughput samples.
The `settings.abr.throughput.sampleSettings` objects allows the configuration of sample related settings.

In the example below we change the default mode to byte size weighted harmonic mean. In addition, we change the number
of samples to be used to five and disable the automatic adjustment of the sample
size.

A detailed example is
available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/average-calculation-mode.html).

```js
player.updateSettings({
    streaming: {
        abr: {
            throughput: {
                averageCalculationMode: dashjs.Constants.THROUGHPUT_CALCULATION_MODES.BYTE_SIZE_WEIGHTED_HARMONIC_MEAN,
                sampleSettings: {
                    vod: 5,
                    enableSampleSizeAdjustment: false
                }
            },
        }
    }
});
```
