---
layout: default
title: Content Steering
parent: Usage
---

# Content Steering

Content steering describes a deterministic capability for a content distributor to switch the content source that a
player uses either at start-up
or midstream by means of a remote steering service.

It adds new `<ContentSteering>` element to the MPD and the `<BaseURL>` elements will contain a `serviceLocation`
attribute that can be used as an identifier. In addition, a steering server is required to provide the player with the
required steering information.

dash.js applies content steering if the required information are present in the MPD and the steering server is returning a valid steering manifest

## Example
An example of content steering can be found in our [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/content-steering.html).

To disable content steering, set the `applyContentSteering` property to `false` in the `streaming` section of the player settings.

````js
player.updateSettings({
    streaming: {
        applyContentSteering: false
    }
});
````
