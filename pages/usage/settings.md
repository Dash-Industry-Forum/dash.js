---
layout: default
title: Settings
parent: Usage
---

# Settings

dash.js offers various configuration options that can be set to customize the player behavior. These options can be set
in the player settings object after initializing the player. All settings are maintained in the `Settings.js` file
and can easily be adjusted using the dash.js API.

An overview of all settings can be found in
our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-Settings.html).

## Example

To update a specific setting use the `updateSettings` method of the player object. A more detailed example can be found
in
our [sample section](https://reference.dashif.org/dash.js/latest/samples/getting-started/manual-load-with-custom-settings.html).

The example below shows how to change the log level:

````js
player.updateSettings({
    debug: {
        logLevel: dashjs.Debug.LOG_LEVEL_WARNING
    }
});
````
