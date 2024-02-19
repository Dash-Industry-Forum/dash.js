---
layout: default
title: DVB Font Downloading
parent: Advanced Features
---

<details  markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>

# DVB Font Downloading

Dash.js supports the mechanism described in the DVB DASH profile (ETSI TS 103 285 Section 7.2 Downloadable Fonts) for signalling downloadable fonts using descriptors within an MPD.
This is intended for use with [EBU-TT-D](https://tech.ebu.ch/publications/tech3380) (compatible with [IMSC1](https://www.w3.org/TR/ttml-imsc1.0.1/) Text Profile) subtitles.
The key details of the mechanism and how to use it are covered here.

## Usage

As a content provider, you may choose to specify fonts within your TTML subtitles that the subtitles should be rendered with.
This could be for accessibility, language, or stylistic reasons.
However this will only work if the specified fonts are available on the device or browser where the dash player is being used, which may not always be under the control of the content provider.

To assist with this, the DVB font download mechanism allows you to signal font resources for download in an MPD, and associate them with specific font family names used within the TTML.
This is achieved by including Supplemental or Essential Property descriptors with the specified scheme in the MPD.

Reference media which signals fonts for download can be found in the [dash.js reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/).

This functionality is always available and does not need to be enabled through player settings.
If a downloadable font is correctly signalled, the download will be attempted.

## Signalling Downloadable Fonts

Downloadable fonts are signalled in an MPD by using a `<SupplementalProperty>` descriptor, or a `<EssentialProperty>` descriptor, within an `<AdaptationSet>`.
The descriptor used must have a `schemeIdUri` attribute set to `"urn:dvb:dash:fontdownload:2014"` and a `value` attribute set to `"1"`.

### DVB Attributes

Additional attributes are required on the descriptors to signal information about the downloadable font.

These attributes are defined in the DVB namespace `urn:dvb:dash-extensions:2014-1`.
Below gives an example of mapping the namespace to a `dvb:` prefix in an MPD.

```xml
<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:dvb="urn:dvb:dash-extensions:2014-1">
```

The table below details the attributes themselves.

| Name             | Type   | Description                                                                            |
|:---------------- |:-------|:---------------------------------------------------------------------------------------|
| `dvb:url`        | URI    | The URL of the font to download. Can be absolute or can make use of relative BaseURLs. |
| `dvb:fontFamily` | String | The font family used in EBU-TT-D documents, within the [`tts:fontFamily`](https://www.w3.org/TR/ttml1/#style-attribute-fontFamily) style attribute.                                            |
| `dvb:mimeType`   | String | The mimeType of the font available from the URL.                                       |

### Property Descriptor Example

```xml
<SupplementalProperty
    schemeIdUri="urn:dvb:dash:fontdownload:2014"
    value="1"
    dvb:url="https://example.com/fonts/SubtitleDisplay.woff"
    dvb:fontFamily="SubtitleDisplay"
    dvb:mimeType="application/font-woff"
/>
```

### Mimetype Support

The DVB DASH specification denotes support for two mimeTypes:

* `application/font-sfnt` - This covers `.ttf` and `.otf` fonts.
* `application/font-woff` - Covering `.woff` fonts.

No further support for unspecified mimeTypes has been provided.

### Supplemental vs Essential Property Descriptors

SupplementalProperty descriptors are used when it is acceptable to show the subtitles in another font if the download fails.
EssentialProperty descriptors are used when the subtitles must not be shown at all if the download fails.

As such the player acts based on what kind of property descriptor was used to describe the downloadable font.
If a `<SupplementalProperty>` descriptor was used and download fails, then the `<AdaptationSet>` containing the descriptor continues to be presented as if the `<SupplementalProperty>` descriptor was not present.

If an `<EssentialProperty>` descriptor was used and download fails, then the `<AdaptationSet>` containing the descriptor is not be presented at all.

What this looks like on a client is described in a later section.

## Using the Downloaded Fonts

### TTML Font Family Attribute

The EBU-TT-D subtitles need to indicate that they want to use the downloaded font.
To do this, they must include the font family name within the comma-separated list of fonts in the [`tts:fontFamily`](https://www.w3.org/TR/ttml1/#style-attribute-fontFamily) attribute, and the name must match the value of the `dvb:fontFamily` attribute in the MPD.

So, for example, if we have this attribute in an MPD,

```xml
<SupplementalProperty
    dvb:fontFamily="SubtitleDisplay"
/>
```

we would need to ensure this is present in the subtitle TTML documents to put the font to use.

```xml
<style
    tts:fontFamily="SubtitleDisplay, Arial, default"
/>
```

Note that fallback fonts can still be specified.
In this case we have "Arial" specified as an expected system font, and "default" which is interpreted by [imsc](https://www.w3.org/TR/ttml-imsc1.1/) as the default monospace serif font provided by the browser/device in use.

### Download Process

Download of fonts happens alongside other media, as to not impede the start of playback.
If the download is successful then the font is added to the `document` interface.
When the player is reset, or a new source is added, any added fonts are then removed from the `document`.

The download status of a font, and the type of property descriptor used to describe the font, has an effect on display of the `<AdaptationSet>` it is related to.
Consider a situation where subtitles are set to display on load, and we have the correct entries in our MPD and TTML documents to use our hypothetical 'SubtitleDisplay' font.
The process followed for the different property descriptors is described below.

![fontdownloadflow]({{site.baseurl}}/assets/images/font-download-flowchart.png)

For a `<SupplementalProperty>` descriptor, the displayed subtitles can appear in a 'fall-back' font before 'SubtitleDisplay' has been downloaded, in this case 'Arial'.
This causes, in effect, a flash of unstyled text ([FOUT](https://fonts.google.com/knowledge/glossary/fout)).
The subtitles, handled as a [TextTrack](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack) can retain a [mode property](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack/mode) of `"showing"` throughout the process.

For an `<EssentialProperty>` descriptor, the subtitles will not appear unless the 'SubtitleDisplay' font downloads. Until this has downloaded, the mode property of the TextTrack handling these subtitles is set to `"disabled"`. This is done to best replicate what is expected by the DVB DASH specification, and also given there is no method to delete a TextTrack from a TextTrackList if the tracks are not linked to DOM elements. Once 'SubtitleDisplay' has downloaded the text track mode can be set to `"showing"`.
