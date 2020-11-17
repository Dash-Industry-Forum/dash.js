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
import Events from '../../core/events/Events';
import XHRLoader from '../net/XHRLoader';
import {EVENT_MODE_ON_START, EVENT_MODE_ON_RECEIVE} from '../MediaPlayerEvents';

function EventController() {

    const MPD_RELOAD_SCHEME = 'urn:mpeg:dash:event:2012';
    const MPD_RELOAD_VALUE = 1;

    const MPD_CALLBACK_SCHEME = 'urn:mpeg:dash:event:callback:2015';
    const MPD_CALLBACK_VALUE = 1;

    const REFRESH_DELAY = 100;
    const REMAINING_EVENTS_THRESHOLD = 300;

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        inlineEvents, // Holds all Inline Events not triggered yet
        inbandEvents, // Holds all Inband Events not triggered yet
        activeEvents, // Holds all Events currently running
        eventInterval, // variable holding the setInterval
        lastEventTimerCall,
        manifestUpdater,
        playbackController,
        eventHandlingInProgress,
        isStarted;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
        _resetInitialSettings();
    }

    function checkConfig() {
        if (!manifestUpdater || !playbackController) {
            throw new Error('setConfig function has to be called previously');
        }
    }

    function _resetInitialSettings() {
        isStarted = false;
        inlineEvents = {};
        inbandEvents = {};
        activeEvents = {};
        eventInterval = null;
        eventHandlingInProgress = false;
        lastEventTimerCall = Date.now() / 1000;
    }

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

    function start() {
        try {
            checkConfig();
            logger.debug('Start Event Controller');
            if (!isStarted && !isNaN(REFRESH_DELAY)) {
                isStarted = true;
                eventInterval = setInterval(_onEventTimer, REFRESH_DELAY);
            }
        } catch (e) {
            throw e;
        }
    }

    /**
     * Add events to the eventList. Events that are not in the mpd anymore but not triggered yet will still be deleted
     * @param {Array.<Object>} values
     */
    function addInlineEvents(values) {
        try {
            checkConfig();

            if (values) {
                for (let i = 0; i < values.length; i++) {
                    let event = values[i];
                    inlineEvents[event.id] = event;
                    logger.debug('Add inline event with id ' + event.id);
                    _startEvent(event.id, event, values, EVENT_MODE_ON_RECEIVE);
                }
            }
            logger.debug(`Added ${values.length} inline events`);
        } catch (e) {
            throw e;
        }
    }

    /**
     * i.e. processing of any one event message box with the same id is sufficient
     * @param {Array.<Object>} values
     */
    function addInbandEvents(values) {
        try {
            checkConfig();

            for (let i = 0; i < values.length; i++) {
                let event = values[i];
                if (!(event.id in inbandEvents)) {
                    if (event.eventStream.schemeIdUri === MPD_RELOAD_SCHEME && inbandEvents[event.id] === undefined) {
                        _handleManifestReloadEvent(event);
                    }
                    inbandEvents[event.id] = event;
                    logger.debug('Add inband event with id ' + event.id);
                    _startEvent(event.id, event, values, EVENT_MODE_ON_RECEIVE);
                } else {
                    logger.debug('Repeated event with id ' + event.id);
                }
            }
            _onEventTimer();
        } catch (e) {
            throw e;
        }
    }

    function _handleManifestReloadEvent(event) {
        try {
            if (event.eventStream.value == MPD_RELOAD_VALUE) {
                const timescale = event.eventStream.timescale || 1;
                const validUntil = event.calculatedPresentationTime / timescale;
                let newDuration;
                if (event.calculatedPresentationTime == 0xFFFFFFFF) {//0xFF... means remaining duration unknown
                    newDuration = NaN;
                } else {
                    newDuration = (event.calculatedPresentationTime + event.duration) / timescale;
                }
                logger.info('Manifest validity changed: Valid until: ' + validUntil + '; remaining duration: ' + newDuration);
                eventBus.trigger(Events.MANIFEST_VALIDITY_CHANGED, {
                    id: event.id,
                    validUntil: validUntil,
                    newDuration: newDuration,
                    newManifestValidAfter: NaN //event.message_data - this is an arraybuffer with a timestring in it, but not used yet
                }, {
                    mode: EVENT_MODE_ON_START
                });
            }
        } catch (e) {
        }
    }

    /**
     * Remove expired events from the list
     */
    function _removeEvents() {
        try {
            if (activeEvents) {
                let currentVideoTime = playbackController.getTime();
                let eventIds = Object.keys(activeEvents);

                for (let i = 0; i < eventIds.length; i++) {
                    let eventId = eventIds[i];
                    let event = activeEvents[eventId];
                    if (event !== null && (event.duration + event.calculatedPresentationTime) / event.eventStream.timescale < currentVideoTime) {
                        logger.debug('Remove Event ' + eventId + ' at time ' + currentVideoTime);
                        event = null;
                        delete activeEvents[eventId];
                    }
                }
            }
        } catch (e) {
        }
    }

    /**
     * Iterate through the eventList and trigger/remove the events
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
                _removeEvents();

                lastEventTimerCall = currentVideoTime;
                eventHandlingInProgress = false;
            }
        } catch (e) {
            eventHandlingInProgress = false;
        }
    }

    function _onStopEventController() {
        try {
            // EventController might be stopped before the period is over. Before we stop the event controller we check for events that needs to be triggered at the period boundary.
            _triggerRemainingEvents(inbandEvents);
            _triggerRemainingEvents(inlineEvents);
        } catch (e) {

        }
    }

    function _triggerEvents(events, presentationTimeThreshold, currentVideoTime) {
        try {
            if (events) {
                let eventIds = Object.keys(events);

                for (let i = 0; i < eventIds.length; i++) {
                    let eventId = eventIds[i];
                    let event = events[eventId];

                    if (event !== undefined) {
                        const calculatedPresentationTimeInSeconds = event.calculatedPresentationTime / event.eventStream.timescale;

                        if (calculatedPresentationTimeInSeconds <= currentVideoTime && calculatedPresentationTimeInSeconds + presentationTimeThreshold >= currentVideoTime) {
                            _startEvent(eventId, event, events, EVENT_MODE_ON_START);
                        } else if (_eventHasExpired(currentVideoTime, presentationTimeThreshold, calculatedPresentationTimeInSeconds) || _eventIsInvalid(event)) {
                            logger.debug(`Deleting event ${eventId} as it is expired or invalid`);
                            delete events[eventId];
                        }
                    }
                }
            }
        } catch (e) {
        }
    }

    function _eventHasExpired(currentVideoTime, presentationTimeThreshold, calculatedPresentationTimeInSeconds) {
        try {
            return currentVideoTime - presentationTimeThreshold > calculatedPresentationTimeInSeconds;
        } catch (e) {
            return false;
        }
    }

    function _eventIsInvalid(event) {
        try {
            const periodEndTime = event.eventStream.period.start + event.eventStream.period.duration;

            return event.calculatedPresentationTime / 1000 > periodEndTime;
        } catch (e) {
            return false;
        }
    }

    function _triggerRemainingEvents(events) {
        try {
            const eventIds = Object.keys(events);
            const currentTime = playbackController.getTime();

            if (!eventIds || eventIds.length === 0) {
                return;
            }

            const periodDuration = events[eventIds[0]].eventStream && events[eventIds[0]].eventStream.period && !isNaN(events[eventIds[0]].eventStream.period.duration) ? events[eventIds[0]].eventStream.period.duration : NaN;
            const periodStart = events[eventIds[0]].eventStream && events[eventIds[0]].eventStream.period && !isNaN(events[eventIds[0]].eventStream.period.start) ? events[eventIds[0]].eventStream.period.start : NaN;

            if (isNaN(periodDuration) || isNaN(periodStart)) {
                return;
            }

            eventIds.forEach((eventId) => {
                const event = events[eventId];
                const calculatedPresentationTimeInSeconds = event.calculatedPresentationTime / event.eventStream.timescale;

                if (Math.abs(calculatedPresentationTimeInSeconds - currentTime) < REMAINING_EVENTS_THRESHOLD) {
                    _startEvent(eventId, event, events, EVENT_MODE_ON_START);
                }
            });
        } catch (e) {

        }
    }

    function _startEvent(eventId, event, events, mode) {
        try {
            const currentVideoTime = playbackController.getTime();

            if (mode === EVENT_MODE_ON_RECEIVE) {
                logger.debug(`Received event ${eventId}`);
                eventBus.trigger(event.eventStream.schemeIdUri, { event: event }, { mode });
                return;
            }

            if (event.duration > 0) {
                activeEvents[eventId] = event;
            }

            if (event.eventStream.schemeIdUri === MPD_RELOAD_SCHEME && event.eventStream.value === MPD_RELOAD_VALUE) {
                if (event.duration !== 0 || event.presentationTimeDelta !== 0) { //If both are set to zero, it indicates the media is over at this point. Don't reload the manifest.
                    logger.debug(`Starting manifest refresh event ${eventId} at ${currentVideoTime}`);
                    _refreshManifest();
                }
            } else if (event.eventStream.schemeIdUri === MPD_CALLBACK_SCHEME && event.eventStream.value === MPD_CALLBACK_VALUE) {
                logger.debug(`Starting callback event ${eventId} at ${currentVideoTime}`);
                _sendCallbackRequest(event.messageData);
            } else {
                logger.debug(`Starting event ${eventId} at ${currentVideoTime}`);
                eventBus.trigger(event.eventStream.schemeIdUri, { event: event }, { mode });
            }

            delete events[eventId];

        } catch (e) {
        }
    }

    function _refreshManifest() {
        try {
            checkConfig();
            manifestUpdater.refreshManifest();
        } catch (e) {
        }
    }

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
            throw e;
        }
    }

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
        } catch (e) {
            throw e;
        }
    }

    function reset() {
        _stop();
        _resetInitialSettings();
    }

    instance = {
        addInlineEvents,
        addInbandEvents,
        start,
        setConfig,
        reset
    };

    setup();

    return instance;
}

EventController.__dashjs_factory_name = 'EventController';
export default FactoryMaker.getSingletonFactory(EventController);
