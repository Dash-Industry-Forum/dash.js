/**
 * The copyright in this software is being made available under the BSD License,
 * included below. This software may be subject to other third party and contributor
 * rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Dash Industry Forum.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *  * Redistributions of source code must retain the above copyright notice, this
 *  list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright notice,
 *  this list of conditions and the following disclaimer in the documentation and/or
 *  other materials provided with the distribution.
 *  * Neither the name of Dash Industry Forum nor the names of its
 *  contributors may be used to endorse or promote products derived from this software
 *  without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS AS IS AND ANY
 *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
 *  IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
 *  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
 *  NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *  PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 *  WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE.
 */
import DashJSError from './../vo/DashJSError';
import { HTTPRequest } from './../vo/metrics/HTTPRequest';
import EventBus from './../../core/EventBus';
import Events from './../../core/events/Events';
import Errors from './../../core/errors/Errors';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import URLUtils from '../utils/URLUtils';

const HTTP_TIMEOUT_MS = 5000;

function TimeSyncController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        offsetToDeviceTimeMs,
        isSynchronizing,
        useManifestDateHeaderTimeSource,
        handlers,
        dashMetrics,
        baseURLController;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function initialize(timingSources, useManifestDateHeader) {
        useManifestDateHeaderTimeSource = useManifestDateHeader;
        offsetToDeviceTimeMs = 0;
        isSynchronizing = false;

        // a list of known schemeIdUris and a method to call with @value
        handlers = {
            'urn:mpeg:dash:utc:http-head:2014':     httpHeadHandler,
            'urn:mpeg:dash:utc:http-xsdate:2014':   httpHandler.bind(null, xsdatetimeDecoder),
            'urn:mpeg:dash:utc:http-iso:2014':      httpHandler.bind(null, iso8601Decoder),
            'urn:mpeg:dash:utc:direct:2014':        directHandler,

            // some specs referencing early ISO23009-1 drafts incorrectly use
            // 2012 in the URI, rather than 2014. support these for now.
            'urn:mpeg:dash:utc:http-head:2012':     httpHeadHandler,
            'urn:mpeg:dash:utc:http-xsdate:2012':   httpHandler.bind(null, xsdatetimeDecoder),
            'urn:mpeg:dash:utc:http-iso:2012':      httpHandler.bind(null, iso8601Decoder),
            'urn:mpeg:dash:utc:direct:2012':        directHandler,

            // it isn't clear how the data returned would be formatted, and
            // no public examples available so http-ntp not supported for now.
            // presumably you would do an arraybuffer type xhr and decode the
            // binary data returned but I would want to see a sample first.
            'urn:mpeg:dash:utc:http-ntp:2014':      notSupportedHandler,

            // not clear how this would be supported in javascript (in browser)
            'urn:mpeg:dash:utc:ntp:2014':           notSupportedHandler,
            'urn:mpeg:dash:utc:sntp:2014':          notSupportedHandler
        };

        if (!getIsSynchronizing()) {
            attemptSync(timingSources);
        }
    }

    function setConfig(config) {
        if (!config) return;

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }
    }

    function getOffsetToDeviceTimeMs() {
        return getOffsetMs();
    }

    function setIsSynchronizing(value) {
        isSynchronizing = value;
    }

    function getIsSynchronizing() {
        return isSynchronizing;
    }

    function setOffsetMs(value) {
        offsetToDeviceTimeMs = value;
    }

    function getOffsetMs() {
        return offsetToDeviceTimeMs;
    }

    // takes xsdatetime and returns milliseconds since UNIX epoch
    // may not be necessary as xsdatetime is very similar to ISO 8601
    // which is natively understood by javascript Date parser
    function alternateXsdatetimeDecoder(xsdatetimeStr) {
        // taken from DashParser - should probably refactor both uses
        const SECONDS_IN_MIN = 60;
        const MINUTES_IN_HOUR = 60;
        const MILLISECONDS_IN_SECONDS = 1000;
        let datetimeRegex = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(?::([0-9]*)(\.[0-9]*)?)?(?:([+\-])([0-9]{2})([0-9]{2}))?/;

        let utcDate,
            timezoneOffset;

        let match = datetimeRegex.exec(xsdatetimeStr);

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
    }

    // try to use the built in parser, since xsdate is a constrained ISO8601
    // which is supported natively by Date.parse. if that fails, try a
    // regex-based version used elsewhere in this application.
    function xsdatetimeDecoder(xsdatetimeStr) {
        let parsedDate = Date.parse(xsdatetimeStr);

        if (isNaN(parsedDate)) {
            parsedDate = alternateXsdatetimeDecoder(xsdatetimeStr);
        }

        return parsedDate;
    }

    // takes ISO 8601 timestamp and returns milliseconds since UNIX epoch
    function iso8601Decoder(isoStr) {
        return Date.parse(isoStr);
    }

    // takes RFC 1123 timestamp (which is same as ISO8601) and returns
    // milliseconds since UNIX epoch
    function rfc1123Decoder(dateStr) {
        return Date.parse(dateStr);
    }

    function notSupportedHandler(url, onSuccessCB, onFailureCB) {
        onFailureCB();
    }

    function directHandler(xsdatetimeStr, onSuccessCB, onFailureCB) {
        let time = xsdatetimeDecoder(xsdatetimeStr);

        if (!isNaN(time)) {
            onSuccessCB(time);
            return;
        }

        onFailureCB();
    }

    function httpHandler(decoder, url, onSuccessCB, onFailureCB, isHeadRequest) {
        let oncomplete,
            onload;
        let complete = false;
        let req = new XMLHttpRequest();

        let verb = isHeadRequest ? HTTPRequest.HEAD : HTTPRequest.GET;
        let urls = url.match(/\S+/g);

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
                httpHandler(decoder, urls.join(' '), onSuccessCB, onFailureCB, isHeadRequest);
            } else {
                onFailureCB();
            }
        };

        onload = function () {
            let time,
                result;

            if (req.status === 200) {
                time = isHeadRequest ?
                        req.getResponseHeader('Date') :
                        req.response;

                result = decoder(time);

                // decoder returns NaN if non-standard input
                if (!isNaN(result)) {
                    onSuccessCB(result);
                    complete = true;
                }
            }
        };

        if (urlUtils.isRelative(url)) {
            // passing no path to resolve will return just MPD BaseURL/baseUri
            const baseUrl = baseURLController.resolve();
            if (baseUrl) {
                url = urlUtils.resolve(url, baseUrl.url);
            }
        }

        req.open(verb, url);
        req.timeout = HTTP_TIMEOUT_MS || 0;
        req.onload = onload;
        req.onloadend = oncomplete;
        req.send();
    }

    function httpHeadHandler(url, onSuccessCB, onFailureCB) {
        httpHandler(rfc1123Decoder, url, onSuccessCB, onFailureCB, true);
    }

    function checkForDateHeader() {
        let dateHeaderValue = dashMetrics.getLatestMPDRequestHeaderValueByID('Date');
        let dateHeaderTime = dateHeaderValue !== null ? new Date(dateHeaderValue).getTime() : Number.NaN;

        if (!isNaN(dateHeaderTime)) {
            setOffsetMs(dateHeaderTime - new Date().getTime());
            completeTimeSyncSequence(false, dateHeaderTime / 1000, offsetToDeviceTimeMs);
        } else {
            completeTimeSyncSequence(true);
        }
    }

    function completeTimeSyncSequence(failed, time, offset) {
        setIsSynchronizing(false);
        eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED, { time: time, offset: offset, error: failed ? new DashJSError(Errors.TIME_SYNC_FAILED_ERROR_CODE, Errors.TIME_SYNC_FAILED_ERROR_MESSAGE) : null });
    }

    function calculateTimeOffset(serverTime, deviceTime) {
        return serverTime - deviceTime;
    }

    function attemptSync(sources, sourceIndex) {

        // if called with no sourceIndex, use zero (highest priority)
        let  index = sourceIndex || 0;

        // the sources should be ordered in priority from the manifest.
        // try each in turn, from the top, until either something
        // sensible happens, or we run out of sources to try.
        let source = sources[index];

        // callback to emit event to listeners
        const onComplete = function (time, offset) {
            let failed = !time || !offset;
            if (failed && useManifestDateHeaderTimeSource) {
                //Before falling back to binary search , check if date header exists on MPD. if so, use for a time source.
                checkForDateHeader();
            } else {
                completeTimeSyncSequence(failed, time, offset);
            }
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
                        const deviceTime = new Date().getTime();
                        const offset = calculateTimeOffset(serverTime, deviceTime);

                        setOffsetMs(offset);

                        logger.info('Local time: ' + new Date(deviceTime));
                        logger.info('Server time: ' + new Date(serverTime));
                        logger.info('Server Time - Local Time (ms): ' + offset);

                        onComplete(serverTime, offset);
                    },
                    function () {
                        // the timing source was probably uncontactable
                        // or returned something we can't use - try again
                        // with the remaining sources
                        attemptSync(sources, index + 1);
                    }
                );
            } else {
                // an unknown schemeIdUri must have been found
                // try again with the remaining sources
                attemptSync(sources, index + 1);
            }
        } else {
            // no valid time source could be found, just use device time
            setOffsetMs(0);
            onComplete();
        }
    }

    function reset() {
        setIsSynchronizing(false);
    }

    instance = {
        initialize: initialize,
        getOffsetToDeviceTimeMs: getOffsetToDeviceTimeMs,
        setConfig: setConfig,
        reset: reset
    };

    setup();

    return instance;
}

TimeSyncController.__dashjs_factory_name = 'TimeSyncController';
const factory = FactoryMaker.getSingletonFactory(TimeSyncController);
factory.HTTP_TIMEOUT_MS = HTTP_TIMEOUT_MS;
FactoryMaker.updateSingletonFactory(TimeSyncController.__dashjs_factory_name, factory);
export default factory;
