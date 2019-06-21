# Dash.js Migration Document 2.x --> 3.0
Fortunately, most of the big changes coming in dash.js v3 are internal and are not affecting MediaPlayer API. These are changes focused on making Dash.js core more robust and ready for advanced features that are starting to be popular (ex: dynamic ads insertion using multi-period).

We took advantage of this new major version to refactor Dash.js source code and simplified API's exposed by Dash.js. In this document we will cover the major changes to consider when migrating your player from Dash.js version 2.x to 3.0. Here are some high level points:
* We have refactored the classes of Dash.js responsible of managing metrics.
* We have homogeneized error raised and their parameters.
* We have changed how to apply settings to ```MediaPlayer```.


## New way of accessing Dash.js metrics
In Dash.js v2.x, metris related methods were shared across the classes ```DashMetrics``` and ```MetricsModel```. In Dash.js v3 we have introduced two main changes related with this:
* All metrics related methods have been moved to ```DashMetrics```. Besides other things, this implies ```getMetricsFor``` method of ```MediaPlayer``` has been removed.
* All methods exposed by ```DashMetrics``` related with getting information of the manifest have been moved to ```DashAdapter```. These are:
   * getBandwidthForRepresentation
   * getIndexForRepresentation
   * getMaxIndexForBufferType

  ```DashAdapter``` is accessible through ```getDashAdapter()``` method of ```MediaPlayer```.

*Example of how to access metrics in v3*
```js
var dashMetrics = player.getDashMetrics();
var currentBuffer = dashMetrics.getCurrentBufferLevel('video');
```

*Example of how get bandwidth of a representation  in v3*
```js
var dashAdapter = player.getDashAdapter();
var maxIndex = dashAdapter.getMaxIndexForBufferType(type, periodIdx);
```

Please, note these changes affect to most of analytics plugins integrated with dash.js.


## Error management
The following type of errors, that were deprecated in dash.js v2.9.1, have been finally removed:
* 'capability'
* 'download'
* 'manifestError'
* 'cc'
* 'mediasource'
* 'key_session'
* 'key_message'
* 'manifest'
* 'content'
* 'initialization'
* 'xlink'


## The new Settings module
In Dash.js v2.x, the large number of getter/setter functions on ```MediaPlayer``` class to manage it configuration was quite annoying. Not just because Dash.js users need to call a bunch of methods to configure the player, also because the old approach did more difficult to maintain and read dash.js documentation.

Dash.js v3 aims to replace the old approach by proposing a configuration method based on a single settings object which keeps all configuration properties. There are just three methods exposed by Dash.js that interact with this settings object, which allow to retrieve, update and reset settings.

* ```getSettings()```. Get the current settings object being used on the player.
* ```updateSettings(settingsObj)```. Update the current settings object being used on the player. It updates only the properties found on settingsObj and the default configuration object.
* ```resetSettings()```. Resets the settings object back to the default.


This new approach, based on a single json object that keeps all the configuration, also allows to easy save, move and manage configuration properties of Dash.js.

*Example of how to change debug log level*

``` js
player.updateSettings({
    'debug': {
        'logLevel': dashjs.Debug.LOG_LEVEL_DEBUG
        }
    }
);
```

*Example of how to set max bitrate*

``` js
player.updateSettings({
    'streaming': {
        'abr': {
            'maxBitrate': {
                'video':
            }
        }
    }
);
```

As a helper for the migration process, below table shows which property of the new setting objects correspond with dash.js v2.x configuration methods. More information about the settings object and its properties can be found in Dash.js API documentation.

| Dash.js v2 method                     | Dash.js settings path                     |
|---------------------------------------|-------------------------------------------|
|Debug.setLogLevel                      | debug.logLevel                            |
|MediaPlayer.setAbandonLoadTimeout      | streaming.abandonLoadTimeout              |
|MediaPlayer.setLiveDelayFragmentCount  | streaming.liveDelayFragmentCount          |
|MediaPlayer.setLiveDelay               | streaming.liveDelay                       |
|MediaPlayer.setScheduleWhilePaused     | streaming.scheduleWhilePaused             |
|MediaPlayer.setFastSwitchEnabled       | streaming.fastSwitchEnabled               |
|MediaPlayer.setBufferPruningInterval   | streaming.bufferPruningInterval           |
|MediaPlayer.setBufferToKeep            | streaming.bufferToKeep                    |
|MediaPlayer.setBufferAheadToKeep       | streaming.bufferAheadToKeep               |
|MediaPlayer.setJumpGaps                | streaming.jumpGaps                        |
|MediaPlayer.setSmallGapLimit           | streaming.smallGapLimit                   |
|MediaPlayer.setStableBufferTime        | streaming.stableBufferTime                |
|MediaPlayer.setBufferTimeAtTopQuality  | streaming.bufferTimeAtTopQuality          |
|MediaPlayer.setBufferTimeAtTopQualityLongForm   | streaming.bufferTimeAtTopQualityLongForm    |
|MediaPlayer.setLongFormContentDurationThreshold | streaming.longFormContentDurationThreshold  |
|MediaPlayer.setLowLatencyEnabled       | streaming.lowLatencyEnabled               |
|MediaPlayer.keepProtectionMediaKeys    | streaming.keepProtectionMediaKeys         |
|MediaPlayer.enableManifestDateHeaderTimeSource  | streaming.useManifestDateHeaderTimeSource   |
|MediaPlayer.useSuggestedPresentationDelay       | streaming.useSuggestedPresentationDelay     |
|MediaPlayer.setManifestUpdateRetryInterval      | streaming.manifestUpdateRetryInterval       |
|MediaPlayer.setLowLatencyMinDrift      | streaming.liveCatchUpMinDrift             |
|MediaPlayer.setLowLatencyMaxDrift      | streaming.liveCatchUpMaxDrift             |
|MediaPlayer.setCatchUpPlaybackRate     | streaming.liveCatchUpPlaybackRate         |
|MediaPlayer.enableLastBitrateCaching   | streaming.lastBitrateCachingInfo.enabled<br>streaming.lastBitrateCachingInfo.ttl       |
|MediaPlayer.enableLastMediaSettingsCaching      | streaming.lastMediaSettingsCachingInfo.enabled<br>lastMediaSettingsCachingInfo.ttl        |
|MediaPlayer.setMovingAverageMethod     | streaming.abr.movingAverageMethod         |
|MediaPlayer.setABRStrategy             | streaming.abr.ABRStrategy                 |
|MediaPlayer.setBandwidthSafetyFactor   | streaming.abr.bandwidthSafetyFactor       |
|MediaPlayer.useDefaultABRRules         | streaming.abr.useDefaultABRRules          |
|MediaPlayer.enableBufferOccupancyABR   | streaming.abr.useBufferOccupancyABR       |
|MediaPlayer.setUseDeadTimeLatencyForAbr| streaming.abr.useDeadTimeLatency          |
|MediaPlayer.setLimitBitrateByPortal    | streaming.abr.limitBitrateByPortal        |
|MediaPlayer.setUsePixelRatioInLimitBitrateByPortal | streaming.abr.usePixelRatioInLimitBitrateByPortal     |
|MediaPlayer.setMaxAllowedBitrateFor    | streaming.abr.maxBitrate.audio<br>streaming.abr.maxBitrate.video  |
|MediaPlayer.setMinAllowedBitrateFor    | streaming.abr.minBitrate.audio<br>streaming.abr.minBitrate.video  |
|MediaPlayer.setInitialRepresentationRatioFor     | streaming.abr.initialRepresentationRatio.audio<br>streaming.abr.initialRepresentationRatio.video |
|MediaPlayer.setMaxAllowedRepresentationRatioFor  | streaming.abr.maxRepresentationRatio.audio<br>streaming.abr.maxRepresentationRatio.video         |
|MediaPlayer.setInitialBitrateFor  | streaming.abr.initialBitrate.audio<br>streaming.abr.initialBitrate.video|
|MediaPlayer.setAutoSwitchQualityFor         | streaming.abr.autoSwitchBitrate.audio<br>streaming.abr.autoSwitchBitrate.video          |
|MediaPlayer.setManifestUpdateRetryInterval   | streaming.manifestUpdateRetryInterval   |
|MediaPlayer.setManifestLoaderRetryInterval   | streaming.retryIntervals.MPD            |
|MediaPlayer.setFragmentLoaderRetryInterval   | streaming.retryIntervals.MediaSegment   |
|MediaPlayer.setManifestLoaderRetryAttempts   | streaming.retryAttempts.MPD             |
|MediaPlayer.setFragmentLoaderRetryAttempts   | streaming.retryAttempts.MediaSegment    |
