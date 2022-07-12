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

import FactoryMaker from '../../core/FactoryMaker';
import Debug from '../../core/Debug';
import EventBus from '../../core/EventBus';
import MediaPlayerEvents from '../../streaming/MediaPlayerEvents';
import XHRLoader from '../net/XHRLoader';

function EventController() {

    const MPD_RELOAD_SCHEME = 'urn:mpeg:dash:event:2012';
    const MPD_RELOAD_VALUE = 1;

    const MPD_CALLBACK_SCHEME = 'urn:mpeg:dash:event:callback:2015';
    const MPD_CALLBACK_VALUE = 1;

    const REMAINING_EVENTS_THRESHOLD = 300;

    const EVENT_HANDLED_STATES = {
        DISCARDED: 'discarded',
        UPDATED: 'updated',
        ADDED: 'added'
    };

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        inlineEvents, // Holds all Inline Events not triggered yet
        inbandEvents, // Holds all Inband Events not triggered yet
        eventInterval, // variable holding the setInterval
        lastEventTimerCall,
        manifestUpdater,
        playbackController,
        settings,
        eventHandlingInProgress,
        isStarted;

    /**
     * Internal setup when class is instanced
     */
    function _setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    /**
     * Checks if the provded configuration is valid
     */
    function checkConfig() {
        if (!manifestUpdater || !playbackController) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    /**
     * Reset to initial settings
     */
    function _resetInitialSettings() {
        isStarted = false;
        inlineEvents = {}; // Format inlineEvents[periodID][schemeIdUri]
        inbandEvents = {}; // Format inbandEvents[periodID][schemeIdUri]
        eventInterval = null;
        eventHandlingInProgress = false;
        lastEventTimerCall = Date.now() / 1000;
    }

    /**
     * Stops the EventController by clearing the event interval
     */
    function _stop() {
        try {
            if (eventInterval !== null && isStarted) {
                clearInterval(eventInterval);
                eventInterval = null;
                isStarted = false;
                _onStopEventController();
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * Starts the interval function of the EventController
     */
    function start() {
        try {
            checkConfig();
            logger.debug('Start Event Controller');
            const refreshDelay = settings.get().streaming.eventControllerRefreshDelay;
            if (!isStarted && !isNaN(refreshDelay)) {
                isStarted = true;
                eventInterval = setInterval(_onEventTimer, refreshDelay);
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * Iterate through the eventList and trigger the events
     */
    function _onEventTimer() {
        try {
            if (!eventHandlingInProgress) {
                eventHandlingInProgress = true;
                const currentVideoTime = playbackController.getTime();
                let presentationTimeThreshold = (currentVideoTime - lastEventTimerCall);

                // For dynamic streams lastEventTimeCall will be large in the first iteration. Avoid firing all events at once.
                presentationTimeThreshold = lastEventTimerCall > 0 ? Math.max(0, presentationTimeThreshold) : 0;

                _triggerEvents(inbandEvents, presentationTimeThreshold, currentVideoTime);
                _triggerEvents(inlineEvents, presentationTimeThreshold, currentVideoTime);
                _removeOutdatedEventObjects(inbandEvents);
                _removeOutdatedEventObjects(inlineEvents);

                lastEventTimerCall = currentVideoTime;
                eventHandlingInProgress = false;
            }
        } catch (e) {
            eventHandlingInProgress = false;
            logger.error(e);
        }
    }

    /**
     * Iterate over a list of events and trigger the ones for which the presentation time is within the current timing interval
     * @param {object} events
     * @param {number} presentationTimeThreshold
     * @param {number} currentVideoTime
     * @private
     */
    function _triggerEvents(events, presentationTimeThreshold, currentVideoTime) {
        try {
            const callback = function (event) {
                if (event !== undefined) {
                    const duration = !isNaN(event.duration) ? event.duration : 0;
                    // The event is either about to start or has already been started and we are within its duration
                    if ((event.calculatedPresentationTime <= currentVideoTime && event.calculatedPresentationTime + presentationTimeThreshold + duration >= currentVideoTime)) {
                        _startEvent(event, MediaPlayerEvents.EVENT_MODE_ON_START);
                    } else if (_eventHasExpired(currentVideoTime, duration + presentationTimeThreshold, event.calculatedPresentationTime) || _eventIsInvalid(event)) {
                        logger.debug(`Removing event ${event.id} from period ${event.eventStream.period.id} as it is expired or invalid`);
                        _removeEvent(events, event);
                    }
                }
            };

            _iterateAndTriggerCallback(events, callback);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Iterates over the entries of the events object and deletes the entries for which no events are present
     * @param {object} events
     * @private
     */
    function _removeOutdatedEventObjects(events) {
        try {
            for (const key in events) {
                if (events.hasOwnProperty(key)) {
                    if (Object.keys(events[key]).length === 0)
                        delete events[key];
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Add MPD events to the list of events.
     * Events that are not in the MPD anymore but not triggered yet will still be deleted.
     * Existing events might get updated.
     * @param {Array.<Object>} values
     * @param {string} periodId
     */
    function addInlineEvents(values, periodId) {
        try {
            checkConfig();

            if (!inlineEvents[periodId]) {
                inlineEvents[periodId] = {};
            }

            if (values) {
                for (let i = 0; i < values.length; i++) {
                    let event = values[i];
                    const currentTime = playbackController.getTime();
                    const duration = !isNaN(event.duration) ? event.duration : 0;
                    if (!_eventHasExpired(currentTime, duration, event.calculatedPresentationTime)) {
                        let result = _addOrUpdateEvent(event, inlineEvents[periodId], true);

                        if (result === EVENT_HANDLED_STATES.ADDED) {
                            logger.debug(`Added inline event with id ${event.id} from period ${periodId}`);
                            // If we see the event for the first time we trigger it in onReceive mode
                            _startEvent(event, MediaPlayerEvents.EVENT_MODE_ON_RECEIVE);
                        } else if (result === EVENT_HANDLED_STATES.UPDATED) {
                            logger.debug(`Updated inline event with id ${event.id} from period ${periodId}`);
                        }
                    }
                }
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * Add EMSG events to the list of events
     * Messages with the same id within the scope of the same scheme_id_uri and value pair are equivalent , i.e. processing of any one event message box with the same id is sufficient.
     * @param {Array.<Object>} values
     * @param {string} periodId
     */
    function addInbandEvents(values, periodId) {
        try {
            checkConfig();

            if (!inbandEvents[periodId]) {
                inbandEvents[periodId] = {};
            }

            for (let i = 0; i < values.length; i++) {
                let event = values[i];
                const currentTime = playbackController.getTime();
                const duration = !isNaN(event.duration) ? event.duration : 0;
                if (!_eventHasExpired(currentTime, duration, event.calculatedPresentationTime)) {
                    let result = _addOrUpdateEvent(event, inbandEvents[periodId], false);

                    if (result === EVENT_HANDLED_STATES.ADDED) {
                        if (event.eventStream.schemeIdUri === MPD_RELOAD_SCHEME) {
                            _handleManifestReloadEvent(event);
                        }
                        logger.debug(`Added inband event with id ${event.id} from period ${periodId}`);
                        _startEvent(event, MediaPlayerEvents.EVENT_MODE_ON_RECEIVE);
                    } else {
                        logger.debug(`Inband event with scheme_id_uri ${event.eventStream.schemeIdUri}, value ${event.eventStream.value}, period id ${periodId} and event id ${event.id} was ignored because it has been added before.`);
                    }
                }
            }
            _onEventTimer();
        } catch (e) {
            throw e;
        }
    }

    /**
     * Adds or updates an event to/in the list of events
     * @param {object} event
     * @param {object} events
     * @param {boolean} shouldOverwriteExistingEvents
     * @return {string}
     * @private
     */
    function _addOrUpdateEvent(event, events, shouldOverwriteExistingEvents = false) {
        const schemeIdUri = event.eventStream.schemeIdUri;
        const value = event.eventStream.value;
        const id = event.id;
        let eventState = EVENT_HANDLED_STATES.DISCARDED;

        if (!events[schemeIdUri]) {
            events[schemeIdUri] = [];
        }

        const indexOfExistingEvent = events[schemeIdUri].findIndex((e) => {
            return ((!value || (e.eventStream.value && e.eventStream.value === value)) && (e.id === id));
        });

        // New event, we add it to our list of events
        if (indexOfExistingEvent === -1) {
            events[schemeIdUri].push(event);
            event.triggeredReceivedEvent = false;
            event.triggeredStartEvent = false;
            eventState = EVENT_HANDLED_STATES.ADDED;
        }

        // We have a similar event for this period with the same schemeIdUri, value and id. Overwrite it or ignore it
        else if (shouldOverwriteExistingEvents) {
            const oldEvent = events[schemeIdUri][indexOfExistingEvent];
            event.triggeredReceivedEvent = oldEvent.triggeredReceivedEvent;
            event.triggeredStartEvent = oldEvent.triggeredStartEvent;
            events[schemeIdUri][indexOfExistingEvent] = event;
            eventState = EVENT_HANDLED_STATES.UPDATED;
        }

        return eventState;
    }

    /**
     * Triggers an MPD reload
     * @param {object} event
     * @private
     */
    function _handleManifestReloadEvent(event) {
        try {
            if (event.eventStream.value == MPD_RELOAD_VALUE) {
                const validUntil = event.calculatedPresentationTime;
                let newDuration;
                if (event.calculatedPresentationTime == 0xFFFFFFFF) {//0xFF... means remaining duration unknown
                    newDuration = NaN;
                } else {
                    newDuration = event.calculatedPresentationTime + event.duration;
                }
                //logger.info('Manifest validity changed: Valid until: ' + validUntil + '; remaining duration: ' + newDuration);
                eventBus.trigger(MediaPlayerEvents.MANIFEST_VALIDITY_CHANGED, {
                    id: event.id,
                    validUntil: validUntil,
                    newDuration: newDuration,
                    newManifestValidAfter: NaN //event.message_data - this is an arraybuffer with a timestring in it, but not used yet
                }, {
                    mode: MediaPlayerEvents.EVENT_MODE_ON_START
                });
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * When the EventController is stopped this callback is triggered. Starts the remaining events.
     * @private
     */
    function _onStopEventController() {
        try {
            // EventController might be stopped before the period is over. Before we stop the event controller we check for events that needs to be triggered at the period boundary.
            _triggerRemainingEvents(inbandEvents);
            _triggerRemainingEvents(inlineEvents);
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Triggers the remaining events after the EventController has been stopped
     * @param {object} events
     * @private
     */
    function _triggerRemainingEvents(events) {
        try {
            const currentTime = playbackController.getTime();
            const callback = function (event) {
                const periodDuration = event.eventStream && event.eventStream.period && !isNaN(event.eventStream.period.duration) ? event.eventStream.period.duration : NaN;
                const periodStart = event.eventStream && event.eventStream.period && !isNaN(event.eventStream.period.start) ? event.eventStream.period.start : NaN;

                if (isNaN(periodDuration) || isNaN(periodStart)) {
                    return;
                }

                const calculatedPresentationTimeInSeconds = event.calculatedPresentationTime;

                if (Math.abs(calculatedPresentationTimeInSeconds - currentTime) < REMAINING_EVENTS_THRESHOLD) {
                    _startEvent(event, MediaPlayerEvents.EVENT_MODE_ON_START);
                }

            };

            _iterateAndTriggerCallback(events, callback);

        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Iterates over the inline/inband event object and triggers a callback for each event
     * @param {object} events
     * @param {function} callback
     * @private
     */
    function _iterateAndTriggerCallback(events, callback) {
        try {
            if (events) {
                const periodIds = Object.keys(events);
                for (let i = 0; i < periodIds.length; i++) {
                    const currentPeriod = events[periodIds[i]];
                    const schemeIdUris = Object.keys(currentPeriod);
                    for (let j = 0; j < schemeIdUris.length; j++) {
                        const schemeIdEvents = currentPeriod[schemeIdUris[j]];
                        schemeIdEvents.forEach((event) => {
                            if (event !== undefined) {
                                callback(event);
                            }
                        });
                    }
                }
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Checks if an event is expired. For instance if the presentationTime + the duration of an event are smaller than the current video time.
     * @param {number} currentVideoTime
     * @param {number} threshold
     * @param {number} calculatedPresentationTimeInSeconds
     * @return {boolean}
     * @private
     */
    function _eventHasExpired(currentVideoTime, threshold, calculatedPresentationTimeInSeconds) {
        try {
            return currentVideoTime - threshold > calculatedPresentationTimeInSeconds;
        } catch (e) {
            logger.error(e);
            return false;
        }
    }

    /**
     * Checks if an event is invalid. This is the case if the end time of the parent period is smaller than the presentation time of the event.
     * @param {object} event
     * @return {boolean}
     * @private
     */
    function _eventIsInvalid(event) {
        try {
            const periodEndTime = event.eventStream.period.start + event.eventStream.period.duration;

            return event.calculatedPresentationTime > periodEndTime;
        } catch (e) {
            logger.error(e);
            return false;
        }
    }

    /**
     * Starts an event. Depending on the schemeIdUri we distinguish between
     * - MPD Reload events
     * - MPD Callback events
     * - Events to be dispatched to the application
     * @param {object} event
     * @param {String} mode
     * @private
     */
    function _startEvent(event, mode) {
        try {
            const currentVideoTime = playbackController.getTime();
            const eventId = event.id;

            if (mode === MediaPlayerEvents.EVENT_MODE_ON_RECEIVE && !event.triggeredReceivedEvent) {
                logger.debug(`Received event ${eventId}`);
                event.triggeredReceivedEvent = true;
                eventBus.trigger(event.eventStream.schemeIdUri, { event: event }, { mode });
                return;
            }

            if (!event.triggeredStartEvent) {
                if (event.eventStream.schemeIdUri === MPD_RELOAD_SCHEME && event.eventStream.value == MPD_RELOAD_VALUE) {
                    //If both are set to zero, it indicates the media is over at this point. Don't reload the manifest.
                    if (event.duration !== 0 || event.presentationTimeDelta !== 0) {
                        logger.debug(`Starting manifest refresh event ${eventId} at ${currentVideoTime}`);
                        _refreshManifest();
                    }
                } else if (event.eventStream.schemeIdUri === MPD_CALLBACK_SCHEME && event.eventStream.value == MPD_CALLBACK_VALUE) {
                    logger.debug(`Starting callback event ${eventId} at ${currentVideoTime}`);
                    _sendCallbackRequest(event.messageData);
                } else {
                    logger.debug(`Starting event ${eventId} from period ${event.eventStream.period.id} at ${currentVideoTime}`);
                    eventBus.trigger(event.eventStream.schemeIdUri, { event: event }, { mode });
                }
                event.triggeredStartEvent = true;
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Removes an event from the list. If this is the last event of type "schemeIdUri"  the corresponding schemeIdUri Object in the list of events is deleted.
     * @param {object} events
     * @param {object} event
     * @private
     */
    function _removeEvent(events, event) {
        try {
            const schemeIdUri = event.eventStream.schemeIdUri;
            const periodId = event.eventStream.period.id;
            const value = event.eventStream.value;
            const id = event.id;

            events[periodId][schemeIdUri] = events[periodId][schemeIdUri].filter((e) => {
                return (value && e.eventStream.value && e.eventStream.value !== value) || e.id !== id;
            });

            if (events[periodId][schemeIdUri].length === 0) {
                delete events[periodId][schemeIdUri];
            }
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Refresh the manifest
     * @private
     */
    function _refreshManifest() {
        try {
            checkConfig();
            manifestUpdater.refreshManifest();
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Send a callback request
     * @param {String} url
     * @private
     */
    function _sendCallbackRequest(url) {
        try {
            let loader = XHRLoader(context).create({});
            loader.load({
                method: 'get',
                url: url,
                request: {
                    responseType: 'arraybuffer'
                }
            });
        } catch (e) {
            logger.error(e);
        }
    }

    /**
     * Set the config of the EventController
     * @param {object} config
     */
    function setConfig(config) {
        try {
            if (!config) {
                return;
            }
            if (config.manifestUpdater) {
                manifestUpdater = config.manifestUpdater;
            }
            if (config.playbackController) {
                playbackController = config.playbackController;
            }
            if (config.settings) {
                settings = config.settings;
            }

        } catch (e) {
            throw e;
        }
    }

    /**
     * Returns all inline events that have not been triggered yet
     * @return {object}
     */
    function getInlineEvents() {
        return inlineEvents;
    }

    /**
     * Returns all inband events that have not been triggered yet
     * @return {object}
     */
    function getInbandEvents() {
        return inbandEvents;
    }

    /**
     * Stop the EventController and reset all initial settings
     */
    function reset() {
        _stop();
        _resetInitialSettings();
    }

    instance = {
        addInlineEvents,
        addInbandEvents,
        getInbandEvents,
        getInlineEvents,
        start,
        setConfig,
        reset
    };

    _setup();

    return instance;
}

EventController.__dashjs_factory_name = 'EventController';
export default FactoryMaker.getSingletonFactory(EventController);
