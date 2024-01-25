---
layout: default
title: Low Latency Streaming
parent: Advanced Features
---

# Low Latency Streaming

One of the major challenges in OTT streaming is reducing the live streaming latency. This can be crucial for live events
like sport games or for an optimal streamer-user interaction in eSports games.

## Use case: On Par with Other Distribution Means

A live event is distributed over DASH as well over regular TV distribution. The event should play-out approximately at
the same time on both devices in order to avoid different perceptions of the same service when received over different
distribution means. The objective should be to get to a range of delay for the DASH based service that is equivalent to
cable and IPTV services [1].

## Use case: Sports Bar

Sports bars are commonly in close proximity to each other and may all show the same live sporting event. Some bars may
be using a provider which distributes the content using DVB-T or DVB-S services whilst others may be using DASH ABR.
Viewers in a bar with a high latency will have their viewing spoiled as they will hear cheers for the goal before it
occurs on their local screen.

This creates a commercial incentive for the bar operator to switch to the provider with the lowest latency. The
objective should be to get the latency range to not be perceptibly different to that of a DVB broadcast solution for
those users who have a sufficient quality (high and consistent speed) connection [1].

### Use case: Professional streamer with interactive chat

Professional streamers interacting with a live audience on social media, often via a directly coupled chat function in
the viewing app/environment. They can generate direct revenue in several ways including:

* In stream advertising
* Micropayments (for example Twitch “bits”)

A high degree of interactivity between the performer and the audience is required to enable engagement. Lower latencies
increases the engagement and consequently the incentive for the audience members to reward the performer with likes,
shares, subscribes, micropayments, etc.

Typical use cases include gamers, musicians and other performers where in some part the direction of the performance can
be guided by the audience response [1].

### Use case: Sports betting

A provider wants to offer a live stream that will be used for wagering within an event. The content must be delivered
with low latency and more importantly within a well-defined sync across endpoints so customers trust the game is fair.
There are in some cases legal considerations, for example the content cannot be shown if it is more than X seconds
behind live.

Visual and aural quality are secondary in priority in these scenarios to sync and latency. The lower the latency the
more opportunities for “in play betting” within the game/event. This in turn increases revenue potential from a
game/event [1].

## CMAF low latency streaming

The Common Media Application Format introduces the concept of "chunks". A CMAF chunk has multiple "moof" and "mdat"
boxes, allowing the client to access the media data before the segment is completely finished. The benefits of the
chunked mode become more obvious when looking at a concrete example:

![Low Latency streaming]({{site.baseurl}}/assets/images/llstreaming.png)

So let’s assume we have 8 second segments and we are currently 3 seconds into segment number four. For classic media
segments, this leaves us with two options:

* Option 1: since segment four is not completed, we start with segment three. That way, we end up 11 seconds behind the
  live edge – 8 seconds coming from segment three, and 3 seconds coming from segment four.
* Option 2: we wait for segment four to finish and immediately start downloading and playing it. We end up with 8
  seconds of latency and a waiting time of 5 seconds.

With CMAF chunks, on the other hand, we are able to play segment four before it is completely available. In the example
above, we have CMAF chunks with a 1 second duration, which leads to eight chunks per segment. Let’s assume that only the
first chunk contains an IDR frame and therefore we always need to start the playback from the beginning of a segment.
Being three seconds into segment four leaves us with 3 seconds of latency. That’s much better than what we achieved with
classic segments. We can also fast decode the first chunks and play even closer to the live edge [2].

## CMAF low latency streaming with dash.js

dash.js supports CMAF low latency streaming since version 2.6.8. For that reason, a dedicated sample page is available:

* [Low latency sample page](https://reference.dashif.org/dash.js/nightly/samples/low-latency/testplayer/testplayer.html)

### dash.js configuration

The following Sections below will give a detailed explanation on L2ALL and LoL+. Some parameters are valid for all low
latency algorithms:

| Parameter                                | Description                                                                                                                                                                                                                                                                                                                  |
|------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `streaming.delay.liveDelay`              | Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.                                                                                                                                                                                                                       |
| `streaming.delay.liveDelayFragmentCount` | Lowering this value will lower latency but may decrease the player's ability to build a stable buffer.                                                                                                                                                                                                                       |
| `streaming.liveCatchup.maxDrift`         | Maximum latency deviation allowed before dash.js to do a seeking to live position                                                                                                                                                                                                                                            |
| `streaming.liveCatchup.playbackRate`     | Defines the minimum and maximum catch-up rate, as a percentage relative to the default playback rate of `1`. Values must be in the range `-0.5` to `1`.                                                                                                                                                                      |

The corresponding API call looks the following:

```js
player.updateSettings({
    streaming: {
        delay: {
            liveDelay: 4
        },
        liveCatchup: {
            maxDrift: 0,
            playbackRate: {
                max: 1,
                min: -0.5
            }
        }
    }
});
```

Please check the [API documentation](http://cdn.dashjs.org/latest/jsdoc/module-Settings.html) for additional
information.

### MPD specific low latency parameters

It is also possible to configure specific low latency settings via MPD. The required information is encapsulated in
a `<ServiceDescription>` element:

```xml
<ServiceDescription id="0">
    <Latency max="6000" min="2000" referenceId="0" target="4000"/>
    <PlaybackRate max="1.04" min="0.96"/>
</ServiceDescription>
```

For more details please refer to the DASH-IF IOP guidelines [1].

### dash.js requirements

In order to use dash.js in low latency mode the following requirements have to be fullfilled:

#### Client requirements

> * The [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) must be supported on the client browser.
> * The server must
    support [HTTP 1.1 Chunked transfer encoding](https://en.wikipedia.org/wiki/Chunked_transfer_encoding)

#### Server and content requirements

The content and the manifest must be conditioned to support CMAF low latency chunks

The manifest must contain two additional attributes

* `@availabilityTimeComplete`: specifies if all segments of all associated representations are complete at the adjusted
  availability start time. If the value is set to false, then it may be inferred by the client that the segment is
  available at its announced location prior to completion.
* `@availabilityTimeOffset (ATO)`: provides the time in how much earlier segments are available compared to their computed
  availability start time (AST).

The segments must contain multiple CMAF chunks. This will result in multiple "moof" and "mdat" boxes per segment.
Example

````
[styp] size=8+16
[prft] size=8+24
[moof] size=8+96
  [mfhd] size=12+4
    sequence number = 827234
  [traf] size=8+72
    [tfhd] size=12+16, flags=20038
      track ID = 1
      default sample duration = 1001
      default sample size = 15704
      default sample flags = 1010000
    [tfdt] size=12+8, version=1
      base media decode time = 828060233
    [trun] size=12+12, flags=5
      sample count = 1
      data offset = 112
      first sample flags = 2000000
[mdat] size=8+15704
[prft] size=8+24
[moof] size=8+92
  [mfhd] size=12+4
    sequence number = 827235
  [traf] size=8+68
    [tfhd] size=12+16, flags=20038
      track ID = 1
      default sample duration = 1001
      default sample size = 897
      default sample flags = 1010000
    [tfdt] size=12+8, version=1
      base media decode time = 828061234
    [trun] size=12+8, flags=1
      sample count = 1
      data offset = 108
[mdat] size=8+897
````

## Challenges in low latency streaming

Compared to ABR algorithms for "classic" live streaming an ABR algorithm for low latency streaming has to overcome
additional challenges.

### Challenge 1: Throughput estimation

Common throughput based ABR algorithms calculate the available bandwidth on the client side using the download time for
a segment:

````
Calculated Throughput = Segment@Bitrate * Segment@duration / DownloadTime

Example: 

Calculated Throughput = 6Mbit/s * 6s / 3s = 12 Mbit/s
````

The concept described above is a problem for clients operating in low latency mode. Since segments are transferred via
HTTP 1.1 Chunked transfer encoding the **download time of a segment is often times similar to the segment duration**. The download
of a segment is started prior to its completion. Therefore, the data is still generated on the server side and arrives
in small chunks at the client side.

For instance, the download time for a segment with six second duration will be approximately six seconds. There will be
idle times in which no data is transferred from the server to the client. However, the connection remains open while the
client waits for new data. The total download time includes these idle times. Consequently, the total download time is
not a good indicator for the available bandwidth on the client side.

### Low latency throughput estimation in dash.js

dash.js offers two different modes for low latency throughput estimation

#### Default throughput estimation

For every segment that is downloaded the default algorithm saves the timestamp and the length of bytes received
throughout the download process. The data packets do not arrive at moof boundaries. For instance a single "data burst"
might contain multiple moof/mdat pairs. For every data point an entry in the corresponding array is created:

```javascript
 downloadedData.push({
    ts: Date.now(), // timestamp when the data arrived
    bytes: value.length // length of the data
});
```

After the download of a segment is completed, the array above is cleared and the throughput is calculated in the
following way:

```javascript
function calculateDownloadedTime(downloadedData, bytesReceived) {
    downloadedData = downloadedData.filter(data => data.bytes > ((bytesReceived / 4) / downloadedData.length));
    if (downloadedData.length > 1) {
        let time = 0;
        const avgTimeDistance = (downloadedData[downloadedData.length - 1].ts - downloadedData[0].ts) / downloadedData.length;
        downloadedData.forEach((data, index) => {
            // To be counted the data has to be over a threshold
            const next = downloadedData[index + 1];
            if (next) {
                const distance = next.ts - data.ts;
                time += distance < avgTimeDistance ? distance : 0;
            }
        });
        return time;
    }
}
```

1. In the first step the downloadedData array is filtered and all entries that do not have a certain size are removed.
2. In the next step the average time distance between two consecutive data points is calculated
3. If time distance between two consecutive data points is smaller than the average time distance the time distance is
   added to the total download time
4. The total download time is used to calculate the throughput as described before. Using this approach the download
   time is no longer equal to the duration of the segment.

#### Moof based throughput estimation

In contrast to the default throughput algorithm, the moof based throughput estimation is based on saving the download
time for each CMAF chunk. For that reason, the start and the endtime of each chunk, starting with a moof box and ending
with an mdat box are saved:

```javascript
// Store the start time of each chunk download                             
const flag1 = boxParser.parsePayload(['moof'], remaining, offset);
if (flag1.found) {
    // Store the beginning time of each chunk download 
    startTimeData.push({
        ts: performance.now(),
        bytes: value.length
    });
}

const boxesInfo = boxParser.findLastTopIsoBoxCompleted(['moov', 'mdat'], remaining, offset);
if (boxesInfo.found) {
    const end = boxesInfo.lastCompletedOffset + boxesInfo.size;

    // Store the end time of each chunk download 
    endTimeData.push({
        ts: performance.now(),
        bytes: remaining.length
    });
}
```

#### dash.js configuration

The desired download time calculation mode can be selected by changing the respective settings parameter:

 | Value                                                        | Mode                             |
 |--------------------------------------------------------------|----------------------------------|
 | `LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.DOWNLOADED_DATA` | Default throughput estimation    |
 | `LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING`    | Moof based throughput estimation |

```js
player.updateSettings({
    streaming: {
        abr: {
            throughput: {
                lowLatencyDownloadTimeCalculationMode: dashjs.Constants.LOW_LATENCY_DOWNLOAD_TIME_CALCULATION_MODE.MOOF_PARSING
            }
        }
    }
})
```

## Challenge 2: Maintaining a consistent live edge

When playing in low latency mode the client needs to maintain a consistent live edge allowing only small deviations
compared to the target latency.

### Maintaining a consistent live edge in dash.js

In order to maintain a consistent live edge dash.js either adjusts the playback rate of the video (catchup mechanism),
or performs a seek back to the live edge. The catchup behavior of dash.js based on the deviation compared to the target
latency is depicted below:

![ll-catchup]({{site.baseurl}}/assets/images/ll-catchup.png)

#### Default catchup mechanism

In order to determine whether the catchup mechanism should be enabled the following logic is applied:

```javascript
function _defaultNeedToCatchUp(currentLiveLatency, liveDelay, liveCatchupLatencyThreshold, minDrift) {
    try {
        const latencyDrift = Math.abs(_getLatencyDrift());

        return latencyDrift > 0;
    } catch (e) {
        return false;
    }
}
```

The latency drift is compared against the minimum allowed drift `minDrift`. In addition, the catchup mechanism is only
applied if the current live latency is smaller than the defined threshold in `latencyThreshold` (see dash.js
configuration above).

In case the catchup mechanism is applied the new playback rate is calculated the following way:

```javascript
function _calculateNewPlaybackRateDefault(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, bufferLevel, currentPlaybackRate) {
    const cpr = liveCatchUpPlaybackRate;
    const deltaLatency = currentLiveLatency - liveDelay;
    const d = deltaLatency * 5;

    // Playback rate must be between (1 - cpr) - (1 + cpr)
    // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
    const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
    let newRate = (1 - cpr) + s;
    // take into account situations in which there are buffer stalls,
    // in which increasing playbackRate to reach target latency will
    // just cause more and more stall situations
    if (playbackStalled) {
        // const bufferLevel = getBufferLevel();
        if (bufferLevel > liveDelay / 2) {
            // playbackStalled = false;
            playbackStalled = false;
        } else if (deltaLatency > 0) {
            newRate = 1.0;
        }
    }

    // don't change playbackrate for small variations (don't overload element with playbackrate changes)
    if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
        newRate = null;
    }

    return {
        newRate: newRate
    };
}
```

Note that the new playback rate must differ from the current playback rate by a hardcoded threshold:

```
minPlaybackRateChange = isSafari ? 0.25 : 0.02;
```

#### LoL+ based catchup mechanism

The LoL+ based catchup mechanism follows the same principles as the default catchup mechanism. In the first step dash.js
checks if the catchup mechanism should be applied:

```javascript
function _lolpNeedToCatchUpCustom(currentLiveLatency, liveDelay, minDrift, currentBuffer, playbackBufferMin, liveCatchupLatencyThreshold) {
    try {
        const latencyDrift = Math.abs(_getLatencyDrift());

        return latencyDrift > 0 || currentBuffer < playbackBufferMin;
    } catch (e) {
        return false;
    }
}
```

Compared to the default catchup mechanism, the LoL+ based catchup check uses `playbackBufferMin`. If either the latency
drift is larger than the minimum allowed drift `minDrift` or the current buffer length is smaller than the minimum
buffer `playbackBufferMin` the catchup mode is activated.

> Note that a change of playback rate can also mean that the playback rate is **decreased**. This can be useful to avoid
> buffer underruns.

The new playback rate is calculated in the following way:

```javascript
function _calculateNewPlaybackRateLolP(liveCatchUpPlaybackRate, currentLiveLatency, liveDelay, minDrift, playbackBufferMin, bufferLevel, currentPlaybackRate) {
    const cpr = liveCatchUpPlaybackRate;
    let newRate;

    // Hybrid: Buffer-based
    if (bufferLevel < playbackBufferMin) {
        // Buffer in danger, slow down
        const deltaBuffer = bufferLevel - playbackBufferMin;  // -ve value
        const d = deltaBuffer * 5;

        // Playback rate must be between (1 - cpr) - (1 + cpr)
        // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
        const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
        newRate = (1 - cpr) + s;

        logger.debug('[LoL+ playback control_buffer-based] bufferLevel: ' + bufferLevel + ', newRate: ' + newRate);
    } else {
        // Hybrid: Latency-based
        // Buffer is safe, vary playback rate based on latency

        // Check if latency is within range of target latency
        const minDifference = 0.02;
        if (Math.abs(currentLiveLatency - liveDelay) <= (minDifference * liveDelay)) {
            newRate = 1;
        } else {
            const deltaLatency = currentLiveLatency - liveDelay;
            const d = deltaLatency * 5;

            // Playback rate must be between (1 - cpr) - (1 + cpr)
            // ex: if cpr is 0.5, it can have values between 0.5 - 1.5
            const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
            newRate = (1 - cpr) + s;
        }

        logger.debug('[LoL+ playback control_latency-based] latency: ' + currentLiveLatency + ', newRate: ' + newRate);
    }

    if (playbackStalled) {
        if (bufferLevel > liveDelay / 2) {
            playbackStalled = false;
        }
    }

    // don't change playbackrate for small variations (don't overload element with playbackrate changes)
    if (Math.abs(currentPlaybackRate - newRate) <= minPlaybackRateChange) {
        newRate = null;
    }

    return {
        newRate: newRate
    };
}

``` 

If the buffer level is smaller than the buffer level defined in `playbackBufferMin` the playback rate is decreased. If
the buffer is "safe", the playback rate is adjusted depending on the latency.

#### Calculating the new playback rate

Both catchup mechanisms share a common method to determine the calculation of the new playback rate:

```javascript
const s = (cpr * 2) / (1 + Math.pow(Math.E, -d));
newRate = (1 - cpr) + s;
```

* `cpr` is defined as the catchup `playbackRate`
* `d` is defined as a multiple of the delta latency or the delta buffer
* `Math.E` represents the base of natural logarithms, e, approximately 2.718.

If the current live latency is greater larger than the target latency `d` is positive, otherwise `d` is negative.
Consequently, if the playback rate needs to be incremented to reach the target latency the
equation `Math.pow(Math.E, -d)` will result in values smaller than 1. For negative `d` values, situations in which the
playback rate should be decreased, the equation `Math.pow(Math.E, -d)` will result in values greater than 1.

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Exp.svg/2880px-Exp.svg.png" height="400" />

As an example consider a situation in which the target latency is set to 2 seconds and the current latency equals 5
seconds:

```formula
cpr = 0.5
delta latency = current latency - target latency = 5 - 2 = 3
d = delta latency * 5 = 3 * 5 = 15 
s = (cpr * 2) / (1 + Math.pow(Math.E, -d)) = (0.5 * 2) / (1 + 3.0590232050182605e-7) = 0.999999694097773
new rate = (1 - cpr) + s = (1 - 0.5) + 0.999999694097773 = 1.499999694097773
```

The new rate will always stay within the target boundaries `1 +/- 0.5`

#### dash.js configuration

The desired catchup mechanism can be selected by changing the respective settings parameter:

| Value                       | Mode                         |
|-----------------------------|------------------------------|
| `LIVE_CATCHUP_MODE_DEFAULT` | Default catchup mechanism    |
|  `LIVE_CATCHUP_MODE_LOLP`   | LoL+ based catchup mechanism |

```javascript
player.updateSettings({
    streaming: {
        liveCatchup: {
            mode: dashjs.Constants.LIVE_CATCHUP_MODE_DEFAULT
        }
    }
})
```

#### Seeking to the live edge

In addition, both catchup algorithms share a common logic to seek back to the live edge. If the latency delta exceeds
the threshold defined in `maxDrift` the seek is performed:

```javascript
// we reached the maxDrift. Do a seek
const maxDrift = mediaPlayerModel.getCatchupMaxDrift();
if (!isNaN(maxDrift) && maxDrift > 0 &&
    deltaLatency > maxDrift) {
    logger.info('[CatchupController]: Low Latency catchup mechanism. Latency too high, doing a seek to live point');
    isCatchupSeekInProgress = true;
    _seekToLive();
}
```

## Low latency ABR algorithms in dash.js

dash.js has two low latency specific algorithms [LoL+](abr/lol_plus.html) and [L2A](abr/l2a.html).


## Material

### Articles

* [Daniel Silhavy - dash.js – Low Latency Streaming with CMAF](https://websites.fraunhofer.de/video-dev/dash-js-low-latency-streaming-with-cmaf/)
* [Will Law - Using LL-HLS with byte-range addressing to achieve interoperability in low latency streaming](https://blogs.akamai.com/2020/11/using-ll-hls-with-byte-range-addressing-to-achieve-interoperability-in-low-latency-streaming.html)

### Videos

* [Will Law - Chunky Monkey](https://www.youtube.com/watch?v=BYRjZNUgzFc&list=PLkyaYNWEKcOfARqEht42i1P4kBemzEV2V&index=11)
* [Theo Karagkioules,R. Mekuria,Dirk  Griffioen, Arjen  Wagenaar - Online learning for low-latency adaptive streaming](https://www.youtube.com/watch?v=NV7a8k2AfYg)
* [May Lim, Mehmet N Akcay, Abdelhak  Bentaleb, Ali C. Begen, R. Zimmermann - When they go high, we go low: low-latency live streaming in dash.js with LoL](https://www.youtube.com/watch?v=9xU582WomTg)

## Bibliography

* [1] [DASH-IF - Report on Low-Latency Live Service with DASH](https://docs.google.com/document/d/1WW4b586znnn8gQ9wvd1uj_7iKzAW-Wf5QargrCtVGnQ)
* [2] [Daniel Silhavy - dash.js – Low Latency Streaming with CMAF ](https://websites.fraunhofer.de/video-dev/dash-js-low-latency-streaming-with-cmaf/)
