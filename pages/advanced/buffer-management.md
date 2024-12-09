---
layout: default
title: Buffer Management
parent: Advanced Features
---

# Buffer Management

dash.js offers a variety of settings to manage the buffer. The buffer is used to store media segments that have been
downloaded but not yet played. The buffer is managed by the player and can be adjusted to meet specific requirements.

The dash.js settings allow the configuration of the initial, backward and forward buffer.

## Configuration Options

The buffer can be configured using the following settings:

| Setting                            | Description                                                                                                                                                                                                                                                                                       |
|:-----------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `initialBufferLevel`               | Initial buffer level to be reached before playback is automatically started. Not that this setting only applies at playback start and is not taken into account after a seek or when the buffer ran dry.                                                                                          |
| `bufferToKeep`                     | Defines how much backward buffer to keep. The backward buffer is the buffer behind the current play position.                                                                                                                                                                                     |
| `bufferTimeDefault`                | The time that the forward buffer target will be set to when not playing at the top quality.                                                                                                                                                                                                       |
| `bufferTimeAtTopQuality`           | The time that the forward buffer target will be set to if playing the top quality. If there are multiple bitrates available, and the media is playing at the highest bitrate, then dash.js tries to build a larger buffer at the top quality to increase stability and to maintain media quality. |
| `bufferTimeAtTopQualityLongForm`   | The time that the forward buffer target will be set to if playing the top quality for long form content.                                                                                                                                                                                          |
| `longFormContentDurationThreshold` | The threshold which defines if the media is considered long form content. This will directly affect the buffer targets when playing back at the top quality.                                                                                                                                      |

![buffer-management]({{site.baseurl}}/assets/images/buffer-management.jpg)

> Note: For a full list of all buffer related options including enabling and disabling specific features of the Media
> Source Extensions (MSE) buffer
> objects please refer to our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-Settings.html#~Buffer).

## Examples

In the example below we change the default buffer settings to reduce the forward and backward buffer.

````js
player.updateSettings({
    streaming: {
        buffer: {
            bufferTimeAtTopQuality: 20,
            bufferTimeAtTopQualityLongForm: 30,
            bufferTimeDefault: 10,
            longFormContentDurationThreshold: 300,
        }
    }
});
````

More detailed examples are
available in the [buffer section](https://reference.dashif.org/dash.js/nightly/samples/index.html#Buffer) of the dash.js
sample page.
