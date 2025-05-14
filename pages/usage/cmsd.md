---
layout: default
title: Common Media Server Data
parent: Usage
---

# Common Media Server Data

[CTA-5006 - Common Media Server Data](https://cdn.cta.tech/cta/media/media/resources/standards/pdfs/cta-5006-final.pdf) (
CMSD) defines a structure for data transmitted in the response to a request from a media player
for an HTTP adaptive streaming media object. The response usually originates at an origin server
and is then propagated through a series of intermediaries to the player.

The purpose of the Common Media Server Data (CMSD) specification is to define a standard
means by which every media server (intermediate and origin) can communicate data with each
media object response and have it received and processed consistently by every intermediary
and player, for the purpose of improving the efficiency and performance of distribution and
ultimately the quality of experience enjoyed by the users.

dash.js currently supports two CMSD keys, namely `etp` (estimated throughput) and `mb` (maximum suggested bitrate).

## Configuration Options

dash.js offers configuration options related to CMSD. The following settings can be configured:

| Setting              | Description                                                                                                                                                                                                                                                                                                                                                              |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `enabled`            | Enable or disable the CMSD response headers parsing.                                                                                                                                                                                                                                                                                                                     | 
| `abr.applyMb`        | Set to true if dash.js should apply the maximum suggested bitrate derived from the CMSD `mb` key in its ABR logic.                                                                                                                                                                                                                                                       | 
| `abr.etpWeightRatio` | Sets the weight ratio (between 0 and 1) that shall be applied on the value of the CMSD `etp` key compared to the measured throughput on client side. For instance, setting this value to 0.5 will result in an equal 50% weight on the throughput value provided by the server via CMSD and 50% weight on the throughput value calculated by dash.js on the client-side. | 

For a full documentation of all CMSD related options please refer to
our [API documentation](https://cdn.dashjs.org/latest/jsdoc/module-Settings.html#~CmsdSettings).

### Example configuration:

````js
player.updateSettings({
    streaming: {
        cmsd: {
            enabled: true,
            abr: {
                applyMb: true,
                etpWeightRatio: 0.5
            }
        },
    },
})
````

