---
layout: default
title: Clock Synchronization
parent: Usage
---

# Clock synchronization

During playback of dynamic presentations, a wall clock is used as the timing reference for DASH client decisions. This
is a synchronized clock shared by the DASH client and service.

It is critical to synchronize the clocks of the DASH client and service when using a dynamic presentation because the
MPD timeline of a dynamic presentation is mapped to wall clock time and many playback decisions are clock driven and
assume a common understanding of time by the DASH client and service.

Clock synchronization mechanisms are described by UTCTiming elements in the MPD ([DASH] 5.8.4.11). For further
information please check the References [1] and [2].

## Clock synchronization in dash.js

dash.js supports multiple schemeIdUri and value combinations for clock synchronization:

* `urn:mpeg:dash:utc:http-head:2014`
* `urn:mpeg:dash:utc:http-xsdate:2014`
* `urn:mpeg:dash:utc:http-iso:2014`
* `urn:mpeg:dash:utc:direct:2014`
* `urn:mpeg:dash:utc:http-head:2012`
* `urn:mpeg:dash:utc:http-xsdate:2012`
* `urn:mpeg:dash:utc:http-iso:2012`
* `urn:mpeg:dash:utc:direct:2012`

The default timing source in dash.js uses the following `schemeIdUri` / `value` combination and can be configured as
follows:

```js
player.updateSettings({
    streaming: {
        utcSynchronization: {
            defaultTimingSource: {
                scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
                value: 'https://time.akamai.com/?iso&ms'
            }
        }
    }
});
```

`UTCTiming` elements in the MPD take precedence over the default timing source specified in the settings.

### Regular synchronization

By default, dash.js performs a clock synchronization at playback start and after each MPD update.

#### Synchronization at startup

At playback start an initial request to the timing server is issued. The offset between the client and the server clock
is calculated as described in the Section [Offset calculation](#offset-calculation).

In addition, dash.js performs a predefined number of background requests to verify the initially calculated offset. The
number of background attempts can be adjusted in the settings:

```js
player.updateSettings({
    streaming: {
        utcSynchronization: {
            backgroundAttempts: 2
        }
    }
});
```

#### Synchronization after MPD updates

By default, dash.js initiates a synchronization request after each MPD update. This behavior is modified by certain
settings parameters. The general workflow is as follows:

An MPD update triggers an event to attempt a clock synchronization. The `TimeSyncController` handles the event and
checks if a synchronization request is to be made:

```js
function _shouldPerformSynchronization() {
    try {
        const timeBetweenSyncAttempts = !isNaN(internalTimeBetweenSyncAttempts) ? internalTimeBetweenSyncAttempts : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS;

        if (!timeOfLastSync || !timeBetweenSyncAttempts || isNaN(timeBetweenSyncAttempts)) {
            return true;
        }

        return ((Date.now() - timeOfLastSync) / 1000) >= timeBetweenSyncAttempts;
    } catch (e) {
        return true;
    }
}
```

`_shouldPerformSynchronization()` compares the current wallclock time against the time of the last sync attempt. If the
difference is larger than `timeBetweenSyncAttempts` a synchronization request is issued. Otherwise, playback continues
without a clock sync.

The initial time between the sync attempts can be configured the following way:

```javascript
player.updateSettings({
    streaming: {
        utcSynchronization: {
            timeBetweenSyncAttempts: 30
        }
    }
});
```

#### Post-synchronization parameter adjustment

After each regular synchronization attempt, dash.js adjusts its internal `internalTimeBetweenSyncAttempts` parameter
based on certain criteria:

```javascript
function _adjustTimeBetweenSyncAttempts(offset) {
    const isOffsetDriftWithinThreshold = _isOffsetDriftWithinThreshold(offset);
    const timeBetweenSyncAttempts = !isNaN(internalTimeBetweenSyncAttempts) ? internalTimeBetweenSyncAttempts : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS;
    const timeBetweenSyncAttemptsAdjustmentFactor = !isNaN(settings.get().streaming.utcSynchronization.timeBetweenSyncAttemptsAdjustmentFactor) ? settings.get().streaming.utcSynchronization.timeBetweenSyncAttemptsAdjustmentFactor : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS_ADJUSTMENT_FACTOR;
    const maximumTimeBetweenSyncAttempts = !isNaN(settings.get().streaming.utcSynchronization.maximumTimeBetweenSyncAttempts) ? settings.get().streaming.utcSynchronization.maximumTimeBetweenSyncAttempts : DEFAULT_MAXIMUM_TIME_BETWEEN_SYNC;
    const minimumTimeBetweenSyncAttempts = !isNaN(settings.get().streaming.utcSynchronization.minimumTimeBetweenSyncAttempts) ? settings.get().streaming.utcSynchronization.minimumTimeBetweenSyncAttempts : DEFAULT_MINIMUM_TIME_BETWEEN_SYNC;
    let adjustedTimeBetweenSyncAttempts;

    if (isOffsetDriftWithinThreshold) {
        // The drift between the current offset and the last offset is within the allowed threshold. Increase sync time
        adjustedTimeBetweenSyncAttempts = Math.min(timeBetweenSyncAttempts * timeBetweenSyncAttemptsAdjustmentFactor, maximumTimeBetweenSyncAttempts);
        logger.debug(`Increasing timeBetweenSyncAttempts to ${adjustedTimeBetweenSyncAttempts}`);
    } else {
        // Drift between the current offset and the last offset is not within the allowed threshold. Decrease sync time
        adjustedTimeBetweenSyncAttempts = Math.max(timeBetweenSyncAttempts / timeBetweenSyncAttemptsAdjustmentFactor, minimumTimeBetweenSyncAttempts);
        logger.debug(`Decreasing timeBetweenSyncAttempts to ${adjustedTimeBetweenSyncAttempts}`);
    }

    internalTimeBetweenSyncAttempts = adjustedTimeBetweenSyncAttempts;
}
```

In the first step the player checks if the offset is within certain boundaries:

```javascript
function _isOffsetDriftWithinThreshold(offset) {
    try {
        if (isNaN(lastOffset)) {
            return true;
        }

        const maxAllowedDrift = settings.get().streaming.utcSynchronization.maximumAllowedDrift && !isNaN(settings.get().streaming.utcSynchronization.maximumAllowedDrift) ? settings.get().streaming.utcSynchronization.maximumAllowedDrift : DEFAULT_MAXIMUM_ALLOWED_DRIFT;
        const lowerBound = lastOffset - maxAllowedDrift;
        const upperBound = lastOffset + maxAllowedDrift;

        return offset >= lowerBound && offset <= upperBound;
    } catch (e) {
        return true;
    }
}
```

Depending on whether the offset is included in the calculated boundaries, `adjustedTimeBetweenSyncAttempts` is derived
by either multiplying or dividing the current `internalTimeBetweenSyncAttempts`
by `timeBetweenSyncAttemptsAdjustmentFactor`. By assigning specific values to `maximumTimeBetweenSyncAttempts`
and `minimumTimeBetweenSyncAttempts` upper and lower bounds for `internalTimeBetweenSyncAttempts` can be set.

The parameters can be adjusted in the settings:

```javascript
player.updateSettings({
    streaming: {
        utcSynchronization: {
            timeBetweenSyncAttempts: 30,
            maximumTimeBetweenSyncAttempts: 600,
            minimumTimeBetweenSyncAttempts: 2,
            timeBetweenSyncAttemptsAdjustmentFactor: 2,
            maximumAllowedDrift: 100,
        }
    }
})
```

### Synchronization after download errors

In addition to regular synchronization attempts, dash.js triggers a background synchronization in case requests to media
segments result in errors (e.g 404 errors). This is to make sure that the client clock is still synchronized and the
request error is not caused by an erroneous offset.

This feature can be enabled/disabled by adjusting the settings:

```javascript
player.updateSettings({
    streaming: {
        utcSynchronization: {
            enableBackgroundSyncAfterSegmentDownloadError: true
        }
    }
})
```

### Offset calculation

The offset between two consecutive synchronization requests is calculated by accounting for the round trip time:

```javascript
function _calculateOffset(deviceTimeBeforeSync, deviceTimeAfterSync, serverTime) {
    const deviceReferenceTime = deviceTimeAfterSync - ((deviceTimeAfterSync - deviceTimeBeforeSync) / 2);

    return serverTime - deviceReferenceTime;
}
```

### Configuration example

The available configuration parameters:

| Parameter                                       | Description                                                                                                                                                                                                                                                     |
|:------------------------------------------------|:----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------| 
| `enable`                                        | Enable/Disable UTC Time synchronization.                                                                                                                                                                                                                        | 
| `useManifestDateHeaderTimeSource`               | Allows you to enable the use of the Date Header, if exposed with CORS, as a timing source for live edge detection. The use of the date header will happen only after the other timing source that take precedence fail or are omitted as described.             | 
| `backgroundAttempts`                            | Number of synchronization attempts to perform in the background after an initial synchronization request has been done. This is used to verify that the derived client-server offset is correct.                                                                | 
| `timeBetweenSyncAttempts`                       | The time in seconds between two consecutive sync attempts. Note: This value is used as an initial starting value. The internal value of the TimeSyncController is adjusted during playback based on the drift between two consecutive synchronization attempts. |   
| `maximumTimeBetweenSyncAttempts`                | The maximum time in seconds between two consecutive sync attempts.                                                                                                                                                                                              |   
| `minimumTimeBetweenSyncAttempts`                | The minimum time in seconds between two consecutive sync attempts                                                                                                                                                                                               | 
| `timeBetweenSyncAttemptsAdjustmentFactor`       | The factor used to multiply or divide the timeBetweenSyncAttempts parameter after a sync. The maximumAllowedDrift defines whether this value is used as a factor or a dividend.                                                                                 |   
| `maximumAllowedDrift`                           | The maximum allowed drift specified in milliseconds between two consecutive synchronization attempts.                                                                                                                                                           |   
| `enableBackgroundSyncAfterSegmentDownloadError` | Enables or disables the background sync after the player ran into a segment download error.                                                                                                                                                                     | 
| `defaultTimingSource`                           | The default timing source to be used. The timing sources in the MPD take precedence over this one.                                                                                                                                                              |    

An example of a full configuration object looks the following:

```javascript
player.updateSettings({
    streaming: {
        utcSynchronization: {
            enable: true,
            useManifestDateHeaderTimeSource: true,
            backgroundAttempts: 2,
            timeBetweenSyncAttempts: 30,
            maximumTimeBetweenSyncAttempts: 600,
            minimumTimeBetweenSyncAttempts: 2,
            timeBetweenSyncAttemptsAdjustmentFactor: 2,
            maximumAllowedDrift: 100,
            enableBackgroundSyncAfterSegmentDownloadError: true,
            defaultTimingSource: {
                scheme: 'urn:mpeg:dash:utc:http-xsdate:2014',
                value: 'http://time.akamai.com/?iso&ms'
            }
        }
    }
})
```

## References

* [1] [DASH-IF Implementation Guidelines](https://dashif-documents.azurewebsites.net/Guidelines-TimingModel/master/Guidelines-TimingModel.html#clock-sync)
* [2] [DASH-IF IOP Guidelines](https://dash-industry-forum.github.io/docs/DASH-IF-IOP-v4.3.pdf)
