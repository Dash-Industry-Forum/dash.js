---
layout: default
title: Event handling - MPD and Inband events
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

# Events

dash.js supports inline and inband events included in the MPD and the media segments. For more details on events, their
timing and how to use them please checkout ISO/IEC 23009-1 and the DASH-IF IOP Guidelines.

## Example

An example is available as part of
the [sample section](https://reference.dashif.org/dash.js/nightly/samples/advanced/listening-to-SCTE-EMSG-events.html).

## Inband Events

Inband events are events that are included in the ISOBMFF segments as an `emsg` box.
The `schemeIdUri` and the `value` of inband events need to be signaled in the MPD using an `InbandEventStream` element.

An example of an `InbandEventStream` element and the structure of the `emsg` box are depicted below:

```xml

<InbandEventStream schemeIdUri="urn:scte:scte35:2013:xml" value="999"/>
```

```
aligned(8) class DASHEventMessageBox extends FullBox('emsg', version, flags=0){
   if (version==0) {
      string scheme_id_uri;
      string value;
      unsigned int(32) timescale;
      unsigned int(32) presentation_time_delta;
      unsigned int(32) event_duration;
      unsigned int(32) id;
    }
   else if (version==1) {
       unsigned int(32) timescale;
       unsigned int(64) presentation_time;
       unsigned int(32) event_duration;
       unsigned int(32) id;
       string scheme_id_uri;
       string value;
  }
unsigned int(8) message_data[];
```

## MPD events

MPD events are signaled directly in the MPD. Events of the same type are summarized in an `EventStream` element.
An example of an MPD event is depicted below.

```xml

<EventStream schemeIdUri="urn:scte:scte35:2013:xml" value="999">
    <Event duration="1" presentationTime="10">someMessage</Event>
</EventStream>
```

## dash.js event handling

### Application events

dash.js dispatches events that are not directly processed by the player (application events) to the underlying
application. To register for a specific type
of event use the `on` method of the `player` object and specify the target `schemeIdUri` to listen for:

```javascript
const SCHEMEIDURI = "urn:scte:scte35:2013:xml";
const EVENT_MODE_ON_START = dashjs.MediaPlayer.events.EVENT_MODE_ON_START;
const EVENT_MODE_ON_RECEIVE = dashjs.MediaPlayer.events.EVENT_MODE_ON_RECEIVE;

player.on(SCHEMEIDURI, showStartEvent, null);
player.on(SCHEMEIDURI, showReceiveEvent, null, { mode: EVENT_MODE_ON_RECEIVE });
```

Two dispatch modes are supported

* `eventModeOnStart` (default): The event is dispatched once its start time is reached.
* `eventModeOnReceive`: The event is immediately dispatched once it was signaled to the dash.js player.

### DASH-specific events

Some events are to be processed by the DASH player directly and are not dispatched to the application:

| schemeIdUri                         | value | Description                                                        |
|:------------------------------------|:------|:-------------------------------------------------------------------|
| `urn:mpeg:dash:event:2012`          | 1     | Triggers and MPD reload                                            |
| `urn:mpeg:dash:event:callback:2015` | 1     | Sends a callback request to the provided URL ignoring the response |

### ID3 parsing

dash.js uses the [Common Media Library](https://github.com/streaming-video-technology-alliance/common-media-library) to
support the parsing of ID3 time metadata for inband events. ID3 time metadata is signaled via
the `https://aomedia.org/emsg/ID3` `schemeIdUri`. The parsed message data is dispatched via
the `event.parsedMessageData`
field. The raw ID3 message data is available via the `event.messageData` field. As an example:

````js
event.messageData = Uint8Array(89)[
...]
event.parsedMessageData = [
    {
        "key": "PRIV",
        "info": "com.elementaltechnologies.timestamp.utc",
        "data": {}
    }
]
````
