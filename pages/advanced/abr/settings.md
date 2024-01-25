---
layout: default
title: ABR Settings
parent: Adaptive Bitrate Streaming
grand_parent: Advanced Features
nav_order: 1
---

<details open markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# ABR Settings

## ABR Examples

Multiple samples implementing the functionalities described in this documentation can be found in
the [ABR section](https://reference.dashif.org/dash.js/nightly/samples/index.html).

## Changing the default ABR algorithm

dash.js ships with multiple ABR rules. Per default, dash.js combines a throughput based ABR rule (`throughputRule`) with
a buffer based
ABR rule (`bolaRule`). The `abr` section in `Settings.js` allows a reconfiguration of the default ABR algorithms:

```js
player.updateSettings({
    streaming: {
        abr: {
            activeRules: {
                throughputRule: {
                    active: true
                },
                bolaRule: {
                    active: true
                }
            }
        }
    }
});
```

| ABR Rule         | Description |
|:-----------------|:------------|
| `throughputRule` | tbd         |
| `bolaRule`       | tbd         |

**Important**: If both `throughputRule` and `bolaRule` are enabled dash.js dynamically switches between those two
rules based on the current buffer level.

An example illustrating how to change the ABR rules is
available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/abr.html).

## Additional ABR rules

Next to the two main ABR rules described above, dash.js defines additional ABR rules that run alongside the main rules
and
can be dynamically enabled and disabled.

```js
player.updateSettings({
    abr: {
        activeRules: {
            insufficientBufferRule: {
                active: false
            },
            switchHistoryRule: {
                active: false
            },
            droppedFramesRule: {
                active: false
            },
            abandonRequestsRule: {
                active: false
            },
            l2ARule: {
                active: false
            },
            loLPRule: {
                active: false
            }
        }
    }
});
```

| ABR Rule                 | Description                                     |
|:-------------------------|:------------------------------------------------|
| `insufficientBufferRule` | tbd                                             |
| `switchHistoryRule`      | tbd                                             |
| `droppedFramesRule`      | tbd                                             |
| `abandonRequestsRule`    | [AbandonRequestRule](abandon-request-rule.html) |
| `l2ARule`                | [L2ARule](l2a.html)                             |
| `loLPRule`               | [LoL+](lol_plus.html)                           |

A detailed example is available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/abr.html).

## Adding a custom ABR rule

dash.js allows applications to define their own ABR algorithms. For that reason, disable the default ABR rules and
use `player.addABRCustomRule()` to add your new rule:

```js
/* don't use dash.js default rules */
player.updateSettings({
    abr: {
        activeRules: {
            throughputRule: {
                active: false
            },
            bolaRule: {
                active: false
            },
            insufficientBufferRule: {
                active: false
            },
            switchHistoryRule: {
                active: false
            },
            droppedFramesRule: {
                active: false
            },
            abandonRequestsRule: {
                active: false
            }
        }
    }
});

/* add my custom quality switch rule. Look at LowestBitrateRule.js to know more */
/* about the structure of a custom rule */
player.addABRCustomRule('qualitySwitchRules', 'LowestBitrateRule', LowestBitrateRule);
```

A detailed example is available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/custom-abr-rules.html).

## Disabling the ABR behavior

dash.js allows applications to disable the adaptive bitrate behavior for the `audio` and/or `video` media type. For that
reason, simply disable the `autoSwitchBitrate` setting for the respective media type:

```js
player.updateSettings({
    streaming: {
        abr: {
            autoSwitchBitrate: { audio: true, video: false },
        }
    }
});
```

A detailed example is available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/disable-abr.html).

## Selecting the initial bitrate

In some cases the application might want to define the initial bitrate for either the audio track or the video track
prior to
the start of the playback.
For that reason, dash.js exposes the `initialBitrate` setting. The target value is specified in kbps. In the example
below
the initial bitrate for video is set to 800 kbit/s.

```js
player.updateSettings({
    streaming: {
        abr: {
            initialBitrate: { audio: -1, video: 800 }
        }
    }
});
```

A detailed example is available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/initial-bitrate.html).

## Defining a minium/maximum bitrate

It is also possible to define a minimum and/or a maximum bitrate for the ABR algorithms. dash.js will then only adapt
the bitrate
within these thresholds.
In the example below the maximum bitrate for video is set to 5000 kbit/s while the minimum bitrate for video is defined
as 2000 kbit/s.

```js
player.updateSettings({
    streaming: {
        abr: {
            maxBitrate: { audio: -1, video: 5000 },
            minBitrate: { audio: -1, video: 2000 },
        }
    }
});
```

A detailed example is available [here](http://reference.dashif.org/dash.js/nightly/samples/abr/max-min-bitrate.html).

## Fast bitrate switching

When the quality/bitrate for a certain media type is changed dash.js has two options. It can either append the next
fragment at the end of the current buffer or replace existing parts of the buffer with the newly selected quality.

When `fastSwitchEnabled` is set to `true` the next fragment is requested and appended close to the current playback
time. Note: When ABR down-switch is detected, dash.js appends the lower quality at the end of the buffer range to
preserve the
higher quality media for as long as possible.

![ABR]({{site.baseurl}}/assets/images/fastswitch.png)

```js
player.updateSettings({
    streaming: {
        buffer: {
            fastSwitchEnabled: true
        }
    }
});
```

A detailed example is available [here](https://reference.dashif.org/dash.js/nightly/samples/abr/fastswitch.html).

## Throughput calculation modes

dash.js provides multiple options to configure the calculation of the current average throughput. This calculation is an
important input for most of the ABR rules e.g. the `ThroughputRule`.
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
