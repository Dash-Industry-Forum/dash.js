---
layout: default
title: Common Media Client Data
parent: Usage
---

# Common Media Client Data

[CTA-5004 - Common Media Client Data](https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5004-final.pdf) (
CMCD) defines data
that is collected by the media player and is sent as a custom HTTP header or query parameter alongside each object
request to a CDN. This enables use cases such as log analysis, quality of service monitoring, prioritization of
requests, cross correlation of performance problems with specific devices and platforms and improved edge caching.

CMCD version 1 is fully supported in dash.js. CMCD version 2 fields are gradually being added to dash.js.

## Configuration Options

dash.js offers various configuration options related to CMCD. The following settings can be configured:

| Setting                | Description                                                                                                                                                                                                           |
|------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| applyParametersFromMpd | Enable if dash.js should use the CMCD parameters defined in the MPD                                                                                                                                                   | 
| enabled                | Enable or disable the CMCD reporting.                                                                                                                                                                                 | 
| sid                    | GUID identifying the current playback session.Should be defined in UUID format                                                                                                                                        | 
| cid                    | A unique string to identify the current content. If not specified it will be a hash of the MPD URL.                                                                                                                   | 
| rtp                    | The requested maximum throughput that the client considers sufficient for delivery of the asset. If not specified this value will be dynamically calculated in the CMCDModel based on the current buffer level.       | 
| rtpSafetyFactor        | This value is used as a factor for the rtp value calculation: rtp = minBandwidth * rtpSafetyFactor. If not specified this value defaults to 5. Note that this value is only used when no static rtp value is defined. | 
| mode                   | The method to use to attach cmcd metrics to the requests. 'query' to use query parameters, 'header' to use http headers.If not specified this value defaults to 'query'.                                              | 
| enabledKeys            | This value is used to specify the desired CMCD parameters. Parameters not included in this list are not reported.                                                                                                     | 
| includeInRequests      | Specifies which HTTP GET requests shall carry parameters. If not specified this value defaults to ['segment', 'mpd].                                                                                                  | 
| version                | The version of the CMCD to use. If not specified this value defaults to 1.                                                                                                                                            | 

For a full documentation of all CMCD related options please refer to
our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-Settings.html#~CmcdSettings).

Example configuration:

````js
player.updateSettings({
    streaming: {
        cmcd: {
            applyParametersFromMpd: true,
            enabled: false,
            sid: null,
            cid: null,
            rtp: null,
            rtpSafetyFactor: 5,
            mode: 'query',
            enabledKeys: ['br', 'd', 'ot', 'tb', 'bl', 'dl', 'mtp', 'nor', 'nrr', 'su', 'bs', 'rtp', 'cid', 'pr', 'sf', 'sid', 'st', 'v'],
            includeInRequests: ['segment', 'mpd'],
            version: 1
        }
    },
})
````

## Example
An example illustrating CMCD reporting can be found in our dash.js [sample section](https://reference.dashif.org/dash.js/latest/samples/advanced/cmcd.html).
