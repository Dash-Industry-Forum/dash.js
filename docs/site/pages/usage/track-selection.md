---
title: Track Selection
---

# Track Selection
Some media streams offer multiple audio or video tracks. In MPEG-DASH this is done by placing the different tracks in
separate Adaptation Sets. dash.js allows the application to define an initial track at startup and switch between tracks
at runtime.

## Capability checks
While parsing a manifest, dash.js removes Adaptation Sets / Representations it deems unsupported based on the `@codecs` 
attribute, `EssentialProperty` descriptors, required DRM systems and other properties.

### Handling of `@supplementalCodecs`
dash.js will evaluate optionally present `@supplementalCodecs` and if it is recognized as supported, then its content 
will be used instead of the value provided with the `@codecs` attribute.

### Basic filtering
The MediaCapabilities API is the default mechanism used by dash.js to determine device capabilities for track selection.
This can be disabled by setting the `streaming.capabilities.useMediaCapabilitiesApi` setting to ***false***, which makes dash.js to 
utilize `isTypeSupported()` from `MediaSource` instead.

### Advanced filtering using MediaCapabilities
By default, only `@codecs` is used to query the media capabilities of the MediaCapabilities API.

Audio tracks can also be filtered by matching the AudioChannelConfiguration against the number of
audio channels supported by the device.
This option is disabled by default and can be enabled using the `streaming.capabilities.filterAudioChannelConfiguration` setting.

Other media capabilities can be matched against `EssentialProperty` descriptors (see the next section).

### Filtering using `EssentialProperty` descriptors
By default, dash.js will filter-out AdaptationSets / Representations whose `EssentialProperty` descriptors are not 
recognized.
This behavour is controlled by the `streaming.capabilities.filterUnsupportedEssentialProperties` setting.
If set to ***false***, all EssentialProperty descriptors are ignored and do not influence track selection.

Two mechanisms can be used to configure filtering using EssentialProperty descriptors:

* an allow‑list using a regular-expression syntax; or
* MediaCapabilities API‑based filtering.

Simple filtering can be controlled by defining regular expressions to match values in
`EssentialProperty` descriptors.
The `streaming.capabilities.supportedEssentialProperties` setting can list the `@schemeIdUri` of supported descriptors and
regular expressions to match against descriptor `@value`.

For example, the following configuration would remove all DVB low-latency tracks:

```js
player.updateSettings({
    streaming: {
        capabilities: {
            supportedEssentialProperties: [
                { schemeIdUri: 'urn:dvb:dash:lowlatency:critical:2019', value: 'false' }
            ]
        }
    }
});
```

By default, a conservative allow-list is defined that handles `EssentialProperty` descriptors for
DVB font download, DASH‑IF thumbnails, and an **SDR‑only** subset of CICP colorimetry
(`ColourPrimaries`, `MatrixCoefficients`, `TransferCharacteristics`).

If your application can rely on the MediaCapabilities API, then dash.js can match
`EssentialProperty` descriptors against device capabilities.

The following settings can be used to control matching logic for
`EssentialProperty` descriptors:
* `filterVideoColorimetryEssentialProperties`
* `filterHDRMetadataFormatEssentialProperties`

These settings are needed to ensure that HDR tracks are correctly matched against device capabilities.

For example:
```js
player.updateSettings({
    streaming: {
        capabilities: {
            useMediaCapabilitiesApi: true,
            filterVideoColorimetryEssentialProperties: true,
            filterHDRMetadataFormatEssentialProperties: true
        }
    }
});
```

With these flags, dash.js will query the platform to evaluate colorimetry / HDR `EssentialProperty` combinations instead
of relying solely on the static allow‑list, reducing the risk of “over‑filtering” valid HDR tracks on capable devices.

## Initial track selection
dash.js offers multiple ways to control the initial track selection as described below.

### Initial media settings
To select an initial track prior to the start of the playback based on specific media settings use the
`setInitialMediaSettingsFor()` function. The function takes
an object as input allowing you to define initial values such as the target language or accessibility preferences. 

For each parameter present in the configuration object, dash.js tries to find matching Adaptation Sets and keeps only 
those that match the given setting. If no Adaptation Set is found or the parameter is not present in configuration 
object, all Adaptation Sets are kept. This processing iterates sequentially the following parameters in the given order:
1. `@id`
2. `@lang`
3. Index (i.e. order of Adaptation Sets in the MPD)
4. `Viewpoint`
5. `Role`
6. `Accessibility`
7. `AudioChannelConfiguration`
8. `@codecs`

Notes and Exceptions:
- dash.js does normalize and compare the values provided via the `@lang` attributes and the `lang` setting according to 
  the rules provided with IETF BCP 47 (e.g. `spa` will get converted to `es` prior to comparison)
- If `accessibility` is not provided as parameter, dash.js prioritizes those AdaptationSets where no `Accessibility` 
  element is present

For a detailed description of this method checkout
our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html#setInitialMediaSettingsFor).

### Example

An example how to set the initial audio track by specifying the target language is shown below:

```js
player.initialize(videoElement, url, true);
player.setInitialMediaSettingsFor('audio', {
    lang: 'es',
    accessibility: {
        schemeIdUri:'urn:mpeg:dash:role:2011',
        value:'description'
    }
});
```

A working example can be found in
our [sample section](https://reference.dashif.org/dash.js/nightly/samples/multi-audio/multi-audio-default-lang-acc.html).

### Custom track selection function

You can also define your own custom track selection function. This function will be called by the player to determine
which track to select.

### Example

```js
 var getTrackWithLowestBitrate = function (trackArr) {
    let min = Infinity;
    let result = [];
    let tmp;

    trackArr.forEach(function (track) {
        tmp = Math.min.apply(Math, track.bitrateList.map(function (obj) {
            return obj.bandwidth;
        }));

        if (tmp < min) {
            min = tmp;
            result = [track];
        }
    });

    return result;
}

player.setCustomInitialTrackSelectionFunction(getTrackWithLowestBitrate);
```

A working example can be found in
our [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/custom-initial-track-selection.html)

### Changing the default track selection logic
When neither initial media setting nor any custom track selection function provided a unique selection, the
`selectionPriority` attribute from the MPD is used to determine which track to select. This logic can be disabled by 
adjusting the corresponding settings flag:

```js
player.updateSettings({
    streaming: {
        ignoreSelectionPriority: true
    }
})
```

After this, dash.js tries to find the "main" track based on the `Role` descriptor. 
This logic can be disabled by adjusting the corresponding settings flag:

```js
player.updateSettings({
    streaming: {
        prioritizeRoleMain: false
    }
})
```

To accomplish this and if no `Role` descriptor with `@value="main"` is present, dash.js considers the absence of this 
descriptor also as "main". This feature can be disabled by adjusting the `streaming.assumeDefaultRoleAsMain` settings flag.


If still no unique selection could be made, dash.js offers various predefined approaches to select the initial track.
The default track selection mode can be changed using the `selectionModeForInitialTrack` setting. The following modes
are supported:

| Mode                           | Description                                                                                                 |
|:-------------------------------|:------------------------------------------------------------------------------------------------------------|
| `lowestStartupDelay` (default) | This mode makes the player select the track that contains partial segments that start with SAP type 0 or 1. |
| `highestBitrate`               | This mode makes the player select the track with a highest bitrate.                                         |
| `firstTrack`                   | This mode makes the player select the first track found in the manifest                                     |
| `highestEfficiency`            | This mode makes the player select the track with the lowest bitrate per pixel average.                      |
| `widestRange`                  | This mode makes the player select the track with a widest range of bitrates.                                |

### Example

```js
player.updateSettings({
    streaming: {
        selectionModeForInitialTrack: 'highestBitrate'
    }
})
```

## Track selection at runtime

To switch to a different track at runtime use the `setCurrentTrack(track)` method. You need to provide a valid track as
the input to this function. A list of all available tracks can be obtained by calling `getTracksFor()`.

### Example

```js
const targetIndex = 1;
const availableTracks = player.getTracksFor('audio');
const targetTrack = availableTracks[targetIndex];
player.setCurrentTrack(targetTrack);
```


