---
layout: default
title: Track Selection
parent: Usage
---

# Track Selection
Some media streams offer multiple audio or video tracks. In MPEG-DASH this is done by placing the different tracks in
separate Adaptation Sets. dash.js allows the application to define an initial track at startup and switch between tracks
at runtime.

## Capability checks
While parsing a manifest, dash.js removes all Adaptation Sets it assumes that are not supported based on the `@codecs` attribute, the `EssentialProperty` elements, required DRM systems and other properties.

By default, dash.js filters out AdaptationSets/Representations whose `EssentialProperty` descriptors are not recognized as supported. This behavior is controlled by `settings.capabilities.filterUnsupportedEssentialProperties` (enabled by default) together with an allow‑list in `settings.capabilities.supportedEssentialProperties`. The allow‑list includes a small, conservative set of schemes (e.g., DVB font download, DASH-IF thumbnails) and a minimal SDR‑only subset of CICP colorimetry values for `ColourPrimaries`, `MatrixCoefficients`, and `TransferCharacteristics`. As a result, HDR variants may be pruned unless you either

* enable MediaCapabilities‑based filtering (see below) or 
* extend the allow‑list to add the CICP values your target devices support.

If your application can rely on the MediaCapabilities API, you can set:

```js
player.updateSettings({
    capabilities: {
        useMediaCapabilitiesApi: true,
        filterVideoColorimetryEssentialProperties: true,
        filterHDRMetadataFormatEssentialProperties: true
    }
});
```

With these flags, dash.js will query the platform to evaluate colorimetry/HDR EssentialProperty combinations instead of relying solely on the static allow‑list, reducing the risk of “over‑filtering” valid HDR tracks on capable devices.

If MediaCapabilities is not an option, you should explicitly extend `capabilities.supportedEssentialProperties` to include the HDR schemes/values (e.g., PQ10: primaries=9, matrix=9, transfer=16) that are known to work across your device fleet.

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


