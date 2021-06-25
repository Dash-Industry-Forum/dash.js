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
import {HTTPRequest} from '../vo/metrics/HTTPRequest';
import EventBus from './../../core/EventBus';
import Events from './../../core/events/Events';
import Errors from './../../core/errors/Errors';
import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import URLUtils from '../utils/URLUtils';

const HTTP_TIMEOUT_MS = 5000;
const DEFAULT_MAXIMUM_ALLOWED_DRIFT = 100;
const DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS_ADJUSTMENT_FACTOR = 2;
const DEFAULT_BACKGROUND_ATTEMPTS = 2;
const DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS = 30;
const DEFAULT_MINIMUM_TIME_BETWEEN_BACKGROUND_SYNC_ATTEMPTS = 30;
const DEFAULT_MAXIMUM_TIME_BETWEEN_SYNC = 600;
const DEFAULT_MINIMUM_TIME_BETWEEN_SYNC = 2;

function TimeSyncController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        isSynchronizing,
        isBackgroundSynchronizing,
        settings,
        handlers,
        dashMetrics,
        backgroundSyncTimeOffsets,
        timingSources,
        timeOfLastSync,
        timeOfLastBackgroundSync,
        lastOffset,
        lastTimingSource,
        internalTimeBetweenSyncAttempts,
        errHandler,
        baseURLController;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);

        eventBus.on(Events.ATTEMPT_BACKGROUND_SYNC, _onAttemptBackgroundSync, instance);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.dashMetrics) {
            dashMetrics = config.dashMetrics;
        }

        if (config.baseURLController) {
            baseURLController = config.baseURLController;
        }

        if (config.errHandler) {
            errHandler = config.errHandler;
        }

        if (config.settings) {
            settings = config.settings;
        }
    }

    function _resetInitialSettings() {
        backgroundSyncTimeOffsets = [];
        timingSources = [];
        timeOfLastSync = null;
        timeOfLastBackgroundSync = null;
        lastTimingSource = null;
        lastOffset = NaN;
        isSynchronizing = false;
        isBackgroundSynchronizing = false;
        internalTimeBetweenSyncAttempts = settings.get().streaming.utcSynchronization.timeBetweenSyncAttempts;
    }

    /**
     * Register the timing handler depending on the schemeIdUris. This method is called once when the StreamController is initialized
     */
    function initialize() {
        _resetInitialSettings();

        // a list of known schemeIdUris and a method to call with @value
        handlers = {
            'urn:mpeg:dash:utc:http-head:2014': _httpHeadHandler,
            'urn:mpeg:dash:utc:http-xsdate:2014': _httpHandler.bind(null, _xsdatetimeDecoder),
            'urn:mpeg:dash:utc:http-iso:2014': _httpHandler.bind(null, _iso8601Decoder),
            'urn:mpeg:dash:utc:direct:2014': _directHandler,

            // some specs referencing early ISO23009-1 drafts incorrectly use
            // 2012 in the URI, rather than 2014. support these for now.
            'urn:mpeg:dash:utc:http-head:2012': _httpHeadHandler,
            'urn:mpeg:dash:utc:http-xsdate:2012': _httpHandler.bind(null, _xsdatetimeDecoder),
            'urn:mpeg:dash:utc:http-iso:2012': _httpHandler.bind(null, _iso8601Decoder),
            'urn:mpeg:dash:utc:direct:2012': _directHandler,

            // it isn't clear how the data returned would be formatted, and
            // no public examples available so http-ntp not supported for now.
            // presumably you would do an arraybuffer type xhr and decode the
            // binary data returned but I would want to see a sample first.
            'urn:mpeg:dash:utc:http-ntp:2014': _notSupportedHandler,

            // not clear how this would be supported in javascript (in browser)
            'urn:mpeg:dash:utc:ntp:2014': _notSupportedHandler,
            'urn:mpeg:dash:utc:sntp:2014': _notSupportedHandler
        };

    }

    /**
     * Sync against a timing source. T
     * @param {array} tSources
     * @param {boolean} isDynamic
     */
    function attemptSync(tSources, isDynamic) {

        timingSources = tSources;

        // Stop if we are already synchronizing
        if (isSynchronizing) {
            return;
        }

        // No synchronization required we can signal the completion immediately
        if (!_shouldPerformSynchronization(isDynamic)) {
            eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
            return;
        }

        isSynchronizing = true;
        _attemptRecursiveSync();
    }

    /**
     * Does a synchronization in the background in case the last offset should be verified or a 404 occurs
     */
    function _onAttemptBackgroundSync() {
        if (isSynchronizing || isBackgroundSynchronizing || !lastTimingSource || !lastTimingSource.value || !lastTimingSource.schemeIdUri || isNaN(lastOffset) || isNaN(settings.get().streaming.utcSynchronization.backgroundAttempts)) {
            return;
        }

        if (timeOfLastBackgroundSync && ((Date.now() - timeOfLastBackgroundSync) / 1000) < DEFAULT_MINIMUM_TIME_BETWEEN_BACKGROUND_SYNC_ATTEMPTS) {
            return;
        }

        backgroundSyncTimeOffsets = [];
        isBackgroundSynchronizing = true;
        const backgroundAttempts = !isNaN(settings.get().streaming.utcSynchronization.backgroundAttempts) ? settings.get().streaming.utcSynchronization.backgroundAttempts : DEFAULT_BACKGROUND_ATTEMPTS;
        _attemptBackgroundSync(backgroundAttempts);
    }

    /**
     * Perform a defined number of background attempts
     * @param {number} attempts
     * @private
     */
    function _attemptBackgroundSync(attempts) {
        try {
            if (attempts <= 0) {
                _completeBackgroundTimeSyncSequence();
                return;
            }

            const deviceTimeBeforeSync = Date.now();
            handlers[lastTimingSource.schemeIdUri](
                lastTimingSource.value,
                function (serverTime) {
                    // the timing source returned something useful
                    const deviceTimeAfterSync = Date.now();
                    const offset = _calculateOffset(deviceTimeBeforeSync, deviceTimeAfterSync, serverTime);

                    backgroundSyncTimeOffsets.push(offset);
                    _attemptBackgroundSync(attempts - 1);
                },
                function () {
                    _completeBackgroundTimeSyncSequence();
                }
            );
        } catch (e) {
            _completeBackgroundTimeSyncSequence();
        }
    }

    /**
     * Sync against a timing source. This method is called recursively if the time sync for the first entry in timingSources fails.
     * @param {number} sourceIndex
     */
    function _attemptRecursiveSync(sourceIndex = null) {
        // if called with no sourceIndex, use zero (highest priority)
        let index = sourceIndex || 0;

        // the sources should be ordered in priority from the manifest.
        // try each in turn, from the top, until either something
        // sensible happens, or we run out of sources to try.
        if (!timingSources || timingSources.length === 0 || index >= timingSources.length) {
            _onComplete();
            return;
        }
        let source = timingSources[index];

        if (source) {
            // check if there is a handler for this @schemeIdUri
            if (handlers.hasOwnProperty(source.schemeIdUri)) {
                // if so, call it with its @value
                const deviceTimeBeforeSync = new Date().getTime();
                handlers[source.schemeIdUri](
                    source.value,
                    function (serverTime) {
                        // the timing source returned something useful
                        const deviceTimeAfterSync = new Date().getTime();
                        const offset = _calculateOffset(deviceTimeBeforeSync, deviceTimeAfterSync, serverTime);
                        lastTimingSource = source;

                        _onComplete(offset);
                    },
                    function () {
                        // the timing source was probably uncontactable
                        // or returned something we can't use - try again
                        // with the remaining sources
                        _attemptRecursiveSync(index + 1);
                    }
                );
            } else {
                // an unknown schemeIdUri must have been found
                // try again with the remaining sources
                _attemptRecursiveSync(index + 1);
            }
        } else {
            // no valid time source could be found, just use device time
            _onComplete();
        }

    }

    /**
     * Calculate the offset between client and server. Account for the roundtrip time
     * @param {number} deviceTimeBeforeSync
     * @param {number} deviceTimeAfterSync
     * @param {number} serverTime
     * @return {number}
     * @private
     */
    function _calculateOffset(deviceTimeBeforeSync, deviceTimeAfterSync, serverTime) {
        const deviceReferenceTime = deviceTimeAfterSync - ((deviceTimeAfterSync - deviceTimeBeforeSync) / 2);

        return serverTime - deviceReferenceTime;
    }

    /**
     * Checks if a synchronization is required
     * @param {boolean} isDynamic
     * @return {boolean}
     * @private
     */
    function _shouldPerformSynchronization(isDynamic) {
        try {
            if (!isDynamic) {
                return false;
            }
            const timeBetweenSyncAttempts = !isNaN(internalTimeBetweenSyncAttempts) ? internalTimeBetweenSyncAttempts : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS;

            if (!timeOfLastSync || !timeBetweenSyncAttempts || isNaN(timeBetweenSyncAttempts)) {
                return true;
            }

            return ((Date.now() - timeOfLastSync) / 1000) >= timeBetweenSyncAttempts;
        } catch (e) {
            return true;
        }
    }

    /**
     * Callback after sync has been completed
     * @param {number} offset
     * @private
     */
    function _onComplete(offset = NaN) {
        let failed = isNaN(offset);
        if (failed && settings.get().streaming.utcSynchronization.useManifestDateHeaderTimeSource) {
            //Before falling back to binary search , check if date header exists on MPD. if so, use for a time source.
            _checkForDateHeader();
        } else {
            _completeTimeSyncSequence(failed, offset);
        }
    }

    /**
     * Takes xsdatetime and returns milliseconds since UNIX epoch. May not be necessary as xsdatetime is very similar to ISO 8601 which is natively understood by javascript Date parser
     * @param {string} xsdatetimeStr
     * @return {number}
     * @private
     */
    function _alternateXsdatetimeDecoder(xsdatetimeStr) {
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


    /**
     * Try to use the built in parser, since xsdate is a constrained ISO8601 which is supported natively by Date.parse. if that fails, try a regex-based version used elsewhere in this application.
     * @param {string} xsdatetimeStr
     * @return {number}
     */
    function _xsdatetimeDecoder(xsdatetimeStr) {
        let parsedDate = Date.parse(xsdatetimeStr);

        if (isNaN(parsedDate)) {
            parsedDate = _alternateXsdatetimeDecoder(xsdatetimeStr);
        }

        return parsedDate;
    }

    /**
     * Takes ISO 8601 timestamp and returns milliseconds since UNIX epoch
     * @param {string} isoStr
     * @return {number}
     */
    function _iso8601Decoder(isoStr) {
        return Date.parse(isoStr);
    }

    /**
     * Takes RFC 1123 timestamp (which is same as ISO8601) and returns milliseconds since UNIX epoch
     * @param {string} dateStr
     * @return {number}
     */
    function _rfc1123Decoder(dateStr) {
        return Date.parse(dateStr);
    }

    /**
     * Handler for unsupported scheme ids.
     * @param {string} url
     * @param {function} onSuccessCB
     * @param {function} onFailureCB
     * @private
     */
    function _notSupportedHandler(url, onSuccessCB, onFailureCB) {
        onFailureCB();
    }

    /**
     * Direct handler
     * @param {string} xsdatetimeStr
     * @param {function} onSuccessCB
     * @param {function} onFailureCB
     */
    function _directHandler(xsdatetimeStr, onSuccessCB, onFailureCB) {
        let time = _xsdatetimeDecoder(xsdatetimeStr);

        if (!isNaN(time)) {
            onSuccessCB(time);
            return;
        }

        onFailureCB();
    }

    /**
     * Generic http handler
     * @param {function} decoder
     * @param {string} url
     * @param {function} onSuccessCB
     * @param {function} onFailureCB
     * @param {boolean} isHeadRequest
     * @private
     */
    function _httpHandler(decoder, url, onSuccessCB, onFailureCB, isHeadRequest) {
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
                _httpHandler(decoder, urls.join(' '), onSuccessCB, onFailureCB, isHeadRequest);
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

    /**
     * Handler for http-head schemeIdUri
     * @param {string} url
     * @param {function} onSuccessCB
     * @param {function} onFailureCB
     * @private
     */
    function _httpHeadHandler(url, onSuccessCB, onFailureCB) {
        _httpHandler(_rfc1123Decoder, url, onSuccessCB, onFailureCB, true);
    }

    /**
     * Checks if a date header is present in the MPD response and calculates the offset based on the header
     * @private
     */
    function _checkForDateHeader() {
        let dateHeaderValue = dashMetrics.getLatestMPDRequestHeaderValueByID('Date');
        let dateHeaderTime = dateHeaderValue !== null ? new Date(dateHeaderValue).getTime() : Number.NaN;

        if (!isNaN(dateHeaderTime)) {
            const offsetToDeviceTimeMs = dateHeaderTime - Date.now();
            _completeTimeSyncSequence(false, offsetToDeviceTimeMs);
        } else {
            _completeTimeSyncSequence(true);
        }
    }

    /**
     * Triggers the event to signal that the time synchronization was completed
     * @param {boolean} failed
     * @param {number} offset
     * @private
     */
    function _completeTimeSyncSequence(failed, offset) {

        // Adjust the time of the next sync based on the drift between current offset and last offset
        if (!isNaN(lastOffset) && !isNaN(offset) && !failed) {
            _adjustTimeBetweenSyncAttempts(offset);
        }

        // Update the internal data
        if (!failed && !isNaN(offset)) {
            timeOfLastSync = Date.now();
            isSynchronizing = false;

            // if this is the first sync we are doing perform background syncs as well to confirm current offset
            const shouldAttemptBackgroundSync = isNaN(lastOffset);
            lastOffset = offset;
            if (shouldAttemptBackgroundSync) {
                _onAttemptBackgroundSync();
            }
            logger.debug(`Completed UTC sync. Setting client - server offset to ${offset}`);
        }

        if (failed) {
            lastTimingSource = null;
            isSynchronizing = false;
            errHandler.error(new DashJSError(Errors.TIME_SYNC_FAILED_ERROR_CODE, Errors.TIME_SYNC_FAILED_ERROR_MESSAGE));
        }

        // Notify other classes
        eventBus.trigger(Events.UPDATE_TIME_SYNC_OFFSET, {
            offset: offset,
        });
        eventBus.trigger(Events.TIME_SYNCHRONIZATION_COMPLETED);
    }

    function _adjustTimeBetweenSyncAttempts(offset) {
        try {
            const isOffsetDriftWithinThreshold = _isOffsetDriftWithinThreshold(offset);
            const timeBetweenSyncAttempts = !isNaN(internalTimeBetweenSyncAttempts) ? internalTimeBetweenSyncAttempts : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS;
            const timeBetweenSyncAttemptsAdjustmentFactor = !isNaN(settings.get().streaming.utcSynchronization.timeBetweenSyncAttemptsAdjustmentFactor) ? settings.get().streaming.utcSynchronization.timeBetweenSyncAttemptsAdjustmentFactor : DEFAULT_TIME_BETWEEN_SYNC_ATTEMPTS_ADJUSTMENT_FACTOR;
            const maximumTimeBetweenSyncAttempts = !isNaN(settings.get().streaming.utcSynchronization.maximumTimeBetweenSyncAttempts) ? settings.get().streaming.utcSynchronization.maximumTimeBetweenSyncAttempts : DEFAULT_MAXIMUM_TIME_BETWEEN_SYNC;
            const minimumTimeBetweenSyncAttempts = !isNaN(settings.get().streaming.utcSynchronization.minimumTimeBetweenSyncAttempts) ? settings.get().streaming.utcSynchronization.minimumTimeBetweenSyncAttempts : DEFAULT_MINIMUM_TIME_BETWEEN_SYNC;
            let adjustedTimeBetweenSyncAttempts;

            if (isOffsetDriftWithinThreshold) {
                // The drift between the current offset and the last offset is within the allowed threshold. Increase sync time
                adjustedTimeBetweenSyncAttempts = Math.min(timeBetweenSyncAttempts * timeBetweenSyncAttemptsAdjustmentFactor, maximumTimeBetweenSyncAttempts);
                logger.debug(`Increasing timeBetweenSyncAttempts to ${adjustedTimeBetweenSyncAttempts}`);
            } else {
                // Drift between the current offset and the last offset is not within the allowed threshold. Decrease sync time
                adjustedTimeBetweenSyncAttempts = Math.max(timeBetweenSyncAttempts / timeBetweenSyncAttemptsAdjustmentFactor, minimumTimeBetweenSyncAttempts);
                logger.debug(`Decreasing timeBetweenSyncAttempts to ${adjustedTimeBetweenSyncAttempts}`);
            }

            internalTimeBetweenSyncAttempts = adjustedTimeBetweenSyncAttempts;
        } catch (e) {

        }
    }

    /**
     * Callback after all background syncs have been completed.
     * @private
     */
    function _completeBackgroundTimeSyncSequence() {
        if (!backgroundSyncTimeOffsets || backgroundSyncTimeOffsets.length === 0) {
            return;
        }

        const averageOffset = backgroundSyncTimeOffsets.reduce((acc, curr) => {
            return acc + curr;
        }, 0) / backgroundSyncTimeOffsets.length;

        if (!_isOffsetDriftWithinThreshold(averageOffset)) {
            logger.debug(`Completed background UTC sync. Setting client - server offset to ${averageOffset}`);
            lastOffset = averageOffset;
            eventBus.trigger(Events.UPDATE_TIME_SYNC_OFFSET, {
                offset: lastOffset
            });
        } else {
            logger.debug(`Completed background UTC sync. Offset is within allowed threshold and is not adjusted.`);
        }

        isBackgroundSynchronizing = false;
        timeOfLastBackgroundSync = Date.now();
    }

    function _isOffsetDriftWithinThreshold(offset) {
        try {
            if (isNaN(lastOffset)) {
                return true;
            }

            const maxAllowedDrift = settings.get().streaming.utcSynchronization.maximumAllowedDrift && !isNaN(settings.get().streaming.utcSynchronization.maximumAllowedDrift) ? settings.get().streaming.utcSynchronization.maximumAllowedDrift : DEFAULT_MAXIMUM_ALLOWED_DRIFT;
            const lowerBound = lastOffset - maxAllowedDrift;
            const upperBound = lastOffset + maxAllowedDrift;

            return offset >= lowerBound && offset <= upperBound;
        } catch (e) {
            return true;
        }
    }

    function reset() {
        _resetInitialSettings();

        eventBus.off(Events.ATTEMPT_BACKGROUND_SYNC, _onAttemptBackgroundSync, instance);
    }

    instance = {
        initialize,
        attemptSync,
        setConfig,
        reset
    };

    setup();

    return instance;
}

TimeSyncController.__dashjs_factory_name = 'TimeSyncController';
const factory = FactoryMaker.getSingletonFactory(TimeSyncController);
factory.HTTP_TIMEOUT_MS = HTTP_TIMEOUT_MS;
FactoryMaker.updateSingletonFactory(TimeSyncController.__dashjs_factory_name, factory);
export default factory;
