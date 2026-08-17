---
title: Thumbnails
---

# Thumbnails

dash.js supports thumbnail tracks as defined by the
[DASH-IF Interoperability Guidelines](https://dashif.org/guidelines/). Thumbnails are provided as an additional
Adaptation Set with `@contentType="image"`, typically containing tiled images (thumbnail sprites). Applications
commonly use thumbnails to show a preview when the user hovers over the seekbar.

## Querying thumbnails

Thumbnail tracks are handled automatically when present in the MPD. To retrieve the thumbnail for a specific media
time, use `provideThumbnail()`. The call is asynchronous, the result is passed to the provided callback:

```js
const player = dashjs.MediaPlayer().create();
player.initialize(videoElement, mpdUrl, true);

// time is relative to the value returned by player.duration()
player.provideThumbnail(120, (thumbnail) => {
    if (thumbnail === null) {
        // no thumbnail track or no thumbnail for this time position
        return;
    }
    console.log(thumbnail.url, thumbnail.x, thumbnail.y, thumbnail.width, thumbnail.height);
});
```

The `thumbnail` object describes a single tile within the (potentially tiled) thumbnail image:

| Property | Description                                              |
|:---------|:---------------------------------------------------------|
| `url`    | URL of the image containing the requested thumbnail      |
| `x`, `y` | Pixel offset of the thumbnail tile inside the image      |
| `width`  | Width of the thumbnail tile in pixels                    |
| `height` | Height of the thumbnail tile in pixels                   |

A typical seekbar preview renders the image as a CSS background positioned at `-x`/`-y` with the tile's width and
height as the visible area.

## Selecting a thumbnail representation

If the MPD contains multiple image representations (for instance different resolutions), they are exposed like any
other media type and can be queried and selected via the track and representation APIs using the media type `image`,
e.g. `player.getRepresentationsByType('image')`.

## Sample

- [Thumbnails](https://reference.dashif.org/dash.js/nightly/samples/thumbnails/thumbnails.html) - stream with tiled
  thumbnails, selectable in the control bar's bitrate menu.
