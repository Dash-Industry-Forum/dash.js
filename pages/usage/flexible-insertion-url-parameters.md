---
layout: default
title: Flexible Insertion of URL Parameters
parent: Usage
---

# Flexible Insertion of URL Parameters

Annex I of the MPEG-DASH specification defines how to configure URL parameters of media segment URLs in a similar
fashion to the URL template mechanism. This mechanism allows an "inheritance" from MPD URL parameters when the MPD is
delivered over HTTP, i.e. extraction of one or more key-value pairs from the query string of the URL used to fetch MPD.

## Example procedure

In an easy example the initial request URL to the MPD looks like this
`https://livesim.dashif.org/livesim2/annexI_dashjs=rocks/testpic_6s/Manifest.mpd?dashjs=rocks`. The link to the MPD
contains a query parameter with the key `dashjs` and the corresponding value set to `rocks`.

The `AdaptationSet` of type `video` in the MPD has an additional `EssentialProperty`:

````xml

<EssentialProperty schemeIdUri="urn:mpeg:dash:urlparam:2014">
    <up:UrlQueryInfo xmlns:up="urn:mpeg:dash:schema:urlparam:2014" queryTemplate="$querypart$"
                     useMPDUrlQuery="true"></up:UrlQueryInfo>
</EssentialProperty>
````

This configuration in the MPD tells dash.js to use the query parameters from the MPD URL for the media segment URLs. As
a consequence, the outgoing requests to video segments will look like this:

`https://livesim.dashif.org/livesim2/annexI_dashjs=rocks/testpic_6s/V300/289578461.m4s?dashjs=rocks`. dash.js is
automatically appending the query string `dashjs=rocks` to the media segment request.

## Example implementation

An example of flexible insertion of URL parameters can be found in
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/ext-url-query-info.html).
