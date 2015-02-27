/**
 * @copyright The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2014, British Broadcasting Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * - Neither the name of the British Broadcasting Corporation nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * @license THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*globals MediaPlayer*/

MediaPlayer.dependencies.TimeSyncController = function () {
    "use strict";

    var HTTP_TIMEOUT_MS = 5000,

        // the offset between the time returned from the time source
        // and the client time at that point, in milliseconds.
        offsetToDeviceTimeMs = 0,

        isSynchronizing = false,
        isInitialised = false,

        setIsSynchronizing = function (value) {
            isSynchronizing = value;
        },

        getIsSynchronizing = function () {
            return isSynchronizing;
        },

        setIsInitialised = function (value) {
            isInitialised = value;
        },

        setOffsetMs = function (value) {
            offsetToDeviceTimeMs = value;
        },

        getOffsetMs = function () {
            return offsetToDeviceTimeMs;
        },

        // takes xsdatetime and returns milliseconds since UNIX epoch
        // may not be necessary as xsdatetime is very similar to ISO 8601
        // which is natively understood by javascript Date parser
        alternateXsdatetimeDecoder = function (xsdatetimeStr) {
            // taken from DashParser - should probably refactor both uses
            var SECONDS_IN_MIN = 60,
                MINUTES_IN_HOUR = 60,
                MILLISECONDS_IN_SECONDS = 1000,
                datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+\-])([0-9]{2})([0-9]{2}))?/,
                match = datetimeRegex.exec(xsdatetimeStr),
                utcDate,
                timezoneOffset;

            // If the string does not contain a timezone offset different browsers can interpret it either
            // as UTC or as a local time so we have to parse the string manually to normalize the given date value for
            // all browsers
            utcDate = Date.UTC(
                parseInt(match[1], 10),
                parseInt(match[2], 10) - 1, // months start from zero
                parseInt(match[3], 10),
                parseInt(match[4], 10),
                parseInt(match[5], 10),
                (match[6] && (parseInt(match[6], 10) || 0)),
                (match[7] && parseFloat(match[7]) * MILLISECONDS_IN_SECONDS) || 0
            );
            // If the date has timezone offset take it into account as well
            if (match[9] && match[10]) {
                timezoneOffset = parseInt(match[9], 10) * MINUTES_IN_HOUR + parseInt(match[10], 10);
                utcDate += (match[8] === '+' ? -1 : +1) * timezoneOffset * SECONDS_IN_MIN * MILLISECONDS_IN_SECONDS;
            }

            return new Date(utcDate).getTime();
        },

        // try to use the built in parser, since xsdate is a contrained ISO8601
        // which is supported natively by Date.parse. if that fails, try a
        // regex-based version used elsewhere in this application.
        xsdatetimeDecoder = function (xsdatetimeStr) {
            var parsedDate = Date.parse(xsdatetimeStr);

            if (isNaN(parsedDate)) {
                parsedDate = alternateXsdatetimeDecoder(xsdatetimeStr);
            }

            return parsedDate;
        },

        // takes ISO 8601 timestamp and returns milliseconds since UNIX epoch
        iso8601Decoder = function (isoStr) {
            return Date.parse(isoStr);
        },

        // takes RFC 1123 timestamp (which is same as ISO8601) and returns
        // milliseconds since UNIX epoch
        rfc1123Decoder = function (dateStr) {
            return Date.parse(dateStr);
        },

        notSupportedHandler = function (url, onSuccessCB, onFailureCB) {
            onFailureCB();
        },

        directHandler = function (xsdatetimeStr, onSuccessCB, onFailureCB) {
            var time = xsdatetimeDecoder(xsdatetimeStr);

            if (!isNaN(time)) {
                onSuccessCB(time);
                return;
            }

            onFailureCB();
        },

        httpHandler = function (decoder, url, onSuccessCB, onFailureCB, isHeadRequest) {
            var oncomplete,
                onload,
                complete = false,
                req = new XMLHttpRequest(),
                verb = isHeadRequest ? 'HEAD' : 'GET',
                urls = url.match(/\S+/g);

            // according to ISO 23009-1, url could be a white-space
            // separated list of URLs. just handle one at a time.
            url = urls.shift();

            oncomplete = function () {
                if (complete) {
                    return;
                }

                // we only want to pass through here once per xhr,
                // regardless of whether the load was successful.
                complete = true;

                // if there are more urls to try, call self.
                if (urls.length) {
                    httpHandler(decoder, urls.join(" "), onSuccessCB, onFailureCB, isHeadRequest);
                } else {
                    onFailureCB();
                }
            };

            onload = function () {
                var time,
                    result;

                if (req.status === 200) {
                    time = isHeadRequest ?
                            req.getResponseHeader("Date") :
                            req.response;

                    result = decoder(time);

                    // decoder returns NaN if non-standard input
                    if (!isNaN(result)) {
                        onSuccessCB(result);
                        complete = true;
                    }
                }
            };

            req.open(verb, url);
            req.timeout = HTTP_TIMEOUT_MS || 0;
            req.onload = onload;
            req.onloadend = oncomplete;
            req.send();
        },

        httpHeadHandler = function (url, onSuccessCB, onFailureCB) {
            httpHandler.call(this, rfc1123Decoder, url, onSuccessCB, onFailureCB, true);
        },

        // a list of known schemeIdUris and a method to call with @value
        handlers = {

            "urn:mpeg:dash:utc:http-head:2014":     httpHeadHandler,
            "urn:mpeg:dash:utc:http-xsdate:2014":   httpHandler.bind(null, xsdatetimeDecoder),
            "urn:mpeg:dash:utc:http-iso:2014":      httpHandler.bind(null, iso8601Decoder),
            "urn:mpeg:dash:utc:direct:2014":        directHandler,

            // some specs referencing early ISO23009-1 drafts incorrectly use
            // 2012 in the URI, rather than 2014. support these for now.
            "urn:mpeg:dash:utc:http-head:2012":     httpHeadHandler,
            "urn:mpeg:dash:utc:http-xsdate:2012":   httpHandler.bind(null, xsdatetimeDecoder),
            "urn:mpeg:dash:utc:http-iso:2012":      httpHandler.bind(null, iso8601Decoder),
            "urn:mpeg:dash:utc:direct:2012":        directHandler,

            // it isn't clear how the data returned would be formatted, and
            // no public examples available so http-ntp not supported for now.
            // presumably you would do an arraybuffer type xhr and decode the
            // binary data returned but I would want to see a sample first.
            "urn:mpeg:dash:utc:http-ntp:2014":      notSupportedHandler,

            // not clear how this would be supported in javascript (in browser)
            "urn:mpeg:dash:utc:ntp:2014":           notSupportedHandler,
            "urn:mpeg:dash:utc:sntp:2014":          notSupportedHandler
        },

        attemptSync = function (sources, sourceIndex) {

            var self = this,

                // if called with no sourceIndex, use zero (highest priority)
                index = sourceIndex || 0,

                // the sources should be ordered in priority from the manifest.
                // try each in turn, from the top, until either something
                // sensible happens, or we run out of sources to try.
                source = sources[index],

                // callback to emit event to listeners
                onComplete = function (time, offset) {
                    var failed = !time || !offset;

                    setIsSynchronizing(false);

                    self.notify(
                        MediaPlayer.dependencies.TimeSyncController.eventList.ENAME_TIME_SYNCHRONIZATION_COMPLETED,
                        {
                            time: time,
                            offset: offset
                        },
                        failed ? new MediaPlayer.vo.Error(MediaPlayer.dependencies.TimeSyncController.TIME_SYNC_FAILED_ERROR_CODE) : null
                    );
                };

            setIsSynchronizing(true);

            if (source) {
                // check if there is a handler for this @schemeIdUri
                if (handlers.hasOwnProperty(source.schemeIdUri)) {
                    // if so, call it with its @value
                    handlers[source.schemeIdUri](
                        source.value,
                        function (serverTime) {
                            // the timing source returned something useful
                            var deviceTime = new Date().getTime(),
                                offset = serverTime - deviceTime;

                            setOffsetMs(offset);

                            self.log("Local time:      " + new Date(deviceTime));
                            self.log("Server time:     " + new Date(serverTime));
                            self.log("Difference (ms): " + offset);

                            onComplete.call(self, serverTime, offset);
                        },
                        function () {
                            // the timing source was probably uncontactable
                            // or returned something we can't use - try again
                            // with the remaining sources
                            attemptSync.call(self, sources, index + 1);
                        }
                    );
                } else {
                    // an unknown schemeIdUri must have been found
                    // try again with the remaining sources
                    attemptSync.call(self, sources, index + 1);
                }
            } else {
                // no valid time source could be found, just use device time
                setOffsetMs(0);
                onComplete.call(self);
            }
        };

    return {
        log: undefined,
        notify: undefined,
        subscribe: undefined,
        unsubscribe: undefined,

        getOffsetToDeviceTimeMs: function () {
            return getOffsetMs();
        },

        initialize: function (timingSources) {
            if (!getIsSynchronizing()) {
                attemptSync.call(this, timingSources);
                setIsInitialised(true);
            }
        },

        reset: function () {
            setIsInitialised(false);
            setIsSynchronizing(false);
        }
    };
};

MediaPlayer.dependencies.TimeSyncController.prototype = {
    constructor: MediaPlayer.dependencies.TimeSyncController
};

MediaPlayer.dependencies.TimeSyncController.eventList = {
    ENAME_TIME_SYNCHRONIZATION_COMPLETED: "timeSynchronizationComplete"
};

MediaPlayer.dependencies.TimeSyncController.TIME_SYNC_FAILED_ERROR_CODE = 1;
