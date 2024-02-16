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

Dash.js supports the mechanism described in the DVB DASH specification (ETSI TS 103 285 Section 7.2 Downloadable Fonts) for signalling downloadable fonts using descriptors within an MPD.
This is intended for use with EBU-TT-D subtitles. The key details of the mechanism and how to use it are covered here.

## Usage

As a content provider, you may want to specify a font for your TTML subtitles carried with your content to be displayed with.
This may be for accessibility, or language reasons.
It's possible that you may have no control over the webpage or device where the dash player used to play your content is used.
Therefore, it wont be possible to specify separate styling or initiate a font download on the webpage or device.

To combat this, it is possible to signal a font for download in an MPD. This is done by signalling it using additional DVB attributes in an MPD.

Reference media with signalled fonts for download can be found in the [dash.js reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/).

_N.B. If a downloadable font is correctly signalled, a download will be attempted. This functionality is not required to be enabled through player settings._

## Signalling Downloadable Fonts

Downloadable fonts can be signalled in an MPD by using a `<SupplementalProperty>` descriptor, or a `<EssentialProperty>` descriptor, within an `<AdaptationSet>`.
The descriptor used must have a `schemeIdUri` attribute set to `"urn:dvb:dash:fontdownload:2014"` and a `value` attribute set to `"1"`.

```xml
<SupplementalProperty
    schemeIdUri="urn:dvb:dash:fontdownload:2014"
    value="1"
    dvb:url="https://example.com/fonts/SubtitleDisplay.woff"
    dvb:fontFamily="SubtitleDisplay"
    dvb:mimeType="application/font-woff"
/>
```

### DVB Attributes

Additional DVB attributes are required to signal information about the downloadable font.

| Name             | Type   | Description                                                                            |
|:---------------- |:-------|:---------------------------------------------------------------------------------------|
| `dvb:url`        | URI    | The URL of the font to download. Can be absolute or can make use of relative BaseURLs. |
| `dvb:fontFamily` | String | The font family used in EBU-TT-D documents.                                            |
| `dvb:mimeType`   | String | The mimeType of the font available from the URL.                                       |

### Mimetype Support

The DVB DASH specification denotes support for two mimeTypes:

* `application/font-sfnt` - This covers `.ttf` and `.otf` fonts.
* `application/font-woff` - Covering `.woff` fonts.

No further support for unspecified mimeTypes has been provided.

### Supplemental vs Essential Property Descriptors

If it is not possible to download a font, then the player needs to act based on what kind of property descriptor was used to describe the downloadable font.
If a `<SupplementalProperty>` descriptor was used and download fails, then the `<AdaptationSet>` containing the descriptor should be presented as if the `<SupplementalProperty>` descriptor was not present.

If an `<EssentialProperty>` descriptor was used and download fails, then the `<AdapatationSet>` containing the descriptor should not be presented at all.

What this looks like on a client is described in a later section.

## Using the Downloaded Fonts

### TTML Font Family Attribute

The EBU-TT-D subtitles need to indicate that they want to use a downloaded font. To do this, they must use the same `fontFamily` name as described by the `dvb:fontFamily` attribute in an MPD.

So, for example, if we had this attribute in an MPD,

```xml
<SupplementalProperty
    ...
    dvb:fontFamily="SubtitleDisplay"
    ...
/>
```

we would need to ensure this was present in the subtitle TTML documents to put the font to use.

```xml
<style
    ...
    tts:fontFamily="SubtitleDisplay, Arial, default"
    ...
/>
```

Note that fallback fonts can still be specified. In this case we have "Arial" specified as an expected system font, and "default" which is interpreted by [imsc](https://www.w3.org/TR/ttml-imsc1.1/) as the default monospace serif font provided by the browser/device in use.

### Download Process

Download of fonts happens alongside other media, as to not impede starting playback.
If download is successful then the font is added to the `document` interface.
When the player is reset, or a new source is added, any added FontFamily's are then removed from the `document`.

The download status of a font, and the type of property descriptor used to describe the font, has an effect on display of the `<AdaptationSet>` it is related to.
Consider a situation where subtitles are set to display on load, and we have the correct entries in our MPD and TTML documents to use our hypothetical 'SubtitleDisplay' font.
The process followed for the different property descriptors is described below.

![fontdownloadflow]({{site.baseurl}}/assets/images/font-download-flowchart.png)

For a `<SupplementalProperty>` descriptor, the displayed subtitles can appear in a 'fall-back' font before 'SubtitleDisplay' has been downloaded, in this case 'Arial'. This causes, in effect, a flash of unstyled text ([FOUT](https://fonts.google.com/knowledge/glossary/fout)). The subtitles, handled as a [TextTrack](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack) can retain a [mode property](https://developer.mozilla.org/en-US/docs/Web/API/TextTrack/mode) of `"showing"` throughout the process.

For an `<EssentialProperty>` descriptor, the subtitles will not appear unless the 'SubtitleDisplay' font downloads. Whilst this has not download the mode property of the TextTrack handling these subtitles is set to `"disabled"`. This is done to best replicate what is expected by the DVB DASH specification, and also given there is no method to delete a TextTrack from a TextTrackList if the tracks are not linked to DOM elements. Once, 'SubtitleDisplay' has downloaded the text track mode can be set to `"showing"`. This can, in effect, produce a flash of invisible text ([FOIT](https://fonts.google.com/knowledge/glossary/foit)) on screen.
