---
layout: default 
title: Logging 
parent: Advanced Features
---

# Logging

dash.js defines different cumulative log levels to output information in the console during playback. For example, if
you set the log level to `dashjs.Debug.LOG_LEVEL_WARNING` all warnings, errors and fatals will be logged.

## Example
An example is available as part of the [sample section](https://reference.dashif.org/dash.js/nightly/samples/getting-started/logging.html).

## Log level

| Log level                        | Numeric value | Description                                                                                |
|:---------------------------------|:--------------|:-------------------------------------------------------------------------------------------|
| `dashjs.Debug.LOG_LEVEL_NONE`    | 0             | No message is written in the browser console                                               |
| `dashjs.Debug.LOG_LEVEL_FATAL`   | 1             | Log fatal errors. An error is considered fatal when it causes playback to fail completely. |
| `dashjs.Debug.LOG_LEVEL_ERROR`   | 2             | Log error messages                                                                         |
| `dashjs.Debug.LOG_LEVEL_WARNING` | 3             | Log warning messages                                                                       |
| `dashjs.Debug.LOG_LEVEL_INFO`    | 4             | Log info messages                                                                          |
| `dashjs.Debug.LOG_LEVEL_DEBUG`   | 5             | Log all messages                                                                           |


## Setting the log level

To set the target log level simply update the settings with the desired value, for instance

```javascript
player.updateSettings({
    'debug': {
        'logLevel': dashjs.Debug.LOG_LEVEL_INFO
    }
});
```

or 

```javascript
player.updateSettings({
    'debug': {
        'logLevel': 4
    }
});
```
