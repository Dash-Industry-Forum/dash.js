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
import Events from '../../core/events/Events.js';
import MediaPlayerEvents from '../MediaPlayerEvents.js';
import MediaPlayer from '../MediaPlayer.js';
import EventBus from './../../core/EventBus.js';
import FactoryMaker from '../../core/FactoryMaker.js';

/*
TODOS:
-> Prebuffering could be done in a queue style, where at initialization you preload the first one, when that is done you preload the following, etc
    -> This is specially good for the timeupdate scheduling approach
-> I should save the last mainPlayer time reference in order to search current event while in alternative and to easily calculate time back
-> When going to the alternative you could seek into the content taking into account the duration of the alternative or go back to the time before the alternative
*/

function AlternativeMpdController() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        dashConstants,
        // manifestModel,
        scheduledEvents = [],
        eventTimeouts = [],
        videoModel,
        currentEvent = null,
        isSwitching = false,
        hideAlternativePlayerControls = true,
        altPlayer,
        useDashEventsForScheduling = true,
        playbackController,
        altVideoElement,
        alternativeContext,
        lastTimestamp = 0;

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (!videoModel) {
            videoModel = config.videoModel;
        }
        // manifestModel = config.manifestModel;
        dashConstants = config.DashConstants;

        // if (!altPlayer) {
        //     let mediaPlayerFactory = config.mediaPlayerFactory;
        //     altPlayer = mediaPlayerFactory.create();
        // }

        if (!!config.playbackController && !playbackController) {
            playbackController = config.playbackController;
        }

        if (!!config.hideAlternativePlayerControls && !hideAlternativePlayerControls) {
            hideAlternativePlayerControls = config.hideAlternativePlayerControls;
        }

        if (!!config.useDashEventsForScheduling && !useDashEventsForScheduling) {
            useDashEventsForScheduling = config.useDashEventsForScheduling;
        }

        if (!!config.alternativeContext && !alternativeContext) {
            alternativeContext = config.alternativeContext
        }

        // if (!!config.lastTimestamp) {
        //     lastTimestamp = config.lastTimestamp || 0;
        // }

        if (!!config.currentEvent && !currentEvent) {
            currentEvent = config.currentEvent;
        }
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        if (altPlayer) {
            altPlayer.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        }

        if (useDashEventsForScheduling) {
            _startDashEventPlaybackTimeMonitoring();
        }
    }

    function _onManifestLoaded(e) {
        console.log('I\'m about to experience brain damange')
        console.log(e)
        const manifest = e.data;
        const events = _parseAlternativeMPDEvents(manifest)
        if (scheduledEvents && scheduledEvents.length > 0) {
            scheduledEvents.push(events)
        } else {
            scheduledEvents = events
        }
        if (!useDashEventsForScheduling) {
            _scheduleAlternativeMPDEvents();
        }
    }

    function _startDashEventPlaybackTimeMonitoring() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onDashPlaybackTimeUpdated, this);
        if (altPlayer) {
            altPlayer.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onDashPlaybackTimeUpdated, this);
        }
    }

    function _onDashPlaybackTimeUpdated(e) {
        try {
            if (e.streamId == 'defaultId_0') {
                const currentTime = e.time;
                lastTimestamp = e.time;
                console.log(`Time elapsed for main player ${e.time}`);

                const event = _getCurrentEvent(currentTime);

                if (event && !isSwitching && !currentEvent) {
                    _switchToAlternativeContent(event);
                } else if (!event && !isSwitching && currentEvent) {
                    _switchBackToMainContent(currentEvent);
                }
            } else {
                console.log('I\'m not being played during main content');
                console.log(lastTimestamp);
                console.log(`Time elapsed for alternative player ${e.time}`);
                // Check of end of event and dispatch switch to mainPlayer
                if (currentEvent && currentEvent.duration <= e.time) {
                    _switchBackToMainContent(currentEvent);
                }
            }
        } catch (err) {
            console.error('Error in onDashPlaybackTimeUpdated:', err);
        }
    }

    function _getCurrentEvent(currentTime) {
        return scheduledEvents.find(event => {
            return currentTime >= event.presentationTime &&
                currentTime < event.presentationTime + event.duration;
        });
    }

    function _initializeAlternativePlayer(event) {
        if (altVideoElement && altPlayer) { return };

        // Create a new video element for the alternative content
        altVideoElement = document.createElement('video');
        altVideoElement.style.display = 'none'; // Hide the alternative video element initially
        altVideoElement.autoplay = false;
        altVideoElement.controls = !hideAlternativePlayerControls;

        // Insert the alternative video element into the DOM
        videoModel.getElement().parentNode.insertBefore(altVideoElement, videoModel.getElement().nextSibling);

        // Initialize alternative player
        altPlayer = MediaPlayer().create();
        altPlayer.initialize(altVideoElement, event.alternativeMPD.uri, false, NaN, alternativeContext);
        altPlayer.setAutoPlay(false);

        altPlayer.on(Events.ERROR, (e) => {
            console.error('Alternative player error:', e);
        }, this);
    }

    function _parseAlternativeMPDEvents(manifest) {
        // This should not be done instead using DashManifestModel and DashAdaptor
        const events = [];
        const periods = manifest.Period || [];

        periods.forEach(period => {
            const eventStreams = period.EventStream || [];
            eventStreams.forEach(eventStream => {
                if (eventStream.schemeIdUri === dashConstants.ALTERNATIVE_MPD_SCHEME_ID) {
                    const timescale = eventStream.timescale || 1;
                    const eventsArray = eventStream.Event || [];
                    eventsArray.forEach(event => {
                        if (event && event.AlternativeMPD) {
                            const alternativeMPDNode = event.AlternativeMPD;
                            events.push({
                                presentationTime: event.presentationTime / timescale,
                                duration: event.duration / timescale,
                                alternativeMPD: {
                                    uri: alternativeMPDNode.uri,
                                    earliestResolutionTimeOffset: parseInt(alternativeMPDNode.earliestResolutionTimeOffset || '0', 10) / 1000, // Convert to seconds
                                },
                                triggered: false,
                            });
                        }
                    });
                }
            });
        });

        return events;
    }

    function _scheduleAlternativeMPDEvents() {
        scheduledEvents.forEach(event => {
            const currentTime = videoModel.getElement().currentTime;
            const timeToEvent = event.presentationTime - currentTime;
            const timeToPrebuffer = (event.presentationTime - event.alternativeMPD.earliestResolutionTimeOffset) - currentTime;

            if (timeToPrebuffer >= 0) {
                const prebufferTimeoutId = setTimeout(() => {
                    _prebufferAlternativeContent(event);
                }, timeToPrebuffer * 1000);

                eventTimeouts.push(prebufferTimeoutId);
            } else {
                _prebufferAlternativeContent(event);
            }

            if (timeToEvent >= 0) {
                const switchToAltTimeoutId = setTimeout(() => {
                    _switchToAlternativeContent(event);
                }, timeToEvent * 1000);

                eventTimeouts.push(switchToAltTimeoutId);

                const switchToMainTimeoutId = setTimeout(() => {
                    _switchBackToMainContent(event);
                }, (timeToEvent + event.duration) * 1000);

                eventTimeouts.push(switchToMainTimeoutId);
            } else if (currentTime < event.presentationTime + event.duration) {
                _switchToAlternativeContent(event);

                const timeLeft = (event.presentationTime + event.duration - currentTime) * 1000;
                const switchToMainTimeoutId = setTimeout(() => {
                    _switchBackToMainContent(event);
                }, timeLeft);

                eventTimeouts.push(switchToMainTimeoutId);
            }
        });
    }

    function _prebufferAlternativeContent(event) {
        if (event.triggered) { return };
        event.triggered = true;

        _initializeAlternativePlayer(event);

        altPlayer.on(Events.STREAM_INITIALIZED, () => {
            console.log('I\'m buffering')
            // altPlayer.seek(event.earliestResolutionTimeOffset);
            // Do not play yet, just buffer
        }, this);
    }

    function _switchToAlternativeContent(event) {
        if (isSwitching) { return };
        isSwitching = true;
        currentEvent = {...event, triggered: true};

        if (!altVideoElement || !altPlayer) {
            _initializeAlternativePlayer(event);
        }

        videoModel.pause();

        videoModel.getElement().style.display = 'none';
        altVideoElement.style.display = 'block';

        altPlayer.play();

        isSwitching = false;
    }

    function _switchBackToMainContent(event) {
        if (isSwitching) { return };
        isSwitching = true;

        altPlayer.pause();

        altVideoElement.style.display = 'none';
        videoModel.getElement().style.display = 'block';

        // If we implement more depth juggling this is necessary
        // @TODO: This seek should be changed according to the mode
        const returnTime = event.presentationTime + event.duration;
        playbackController.seek(returnTime, false, false);
        console.log(event);
        videoModel.play();

        altPlayer.reset();
        altPlayer = null;

        altVideoElement.parentNode.removeChild(altVideoElement);
        altVideoElement = null;

        isSwitching = false;
        currentEvent = null;
    }


    function reset() {
        scheduledEvents = [];
        eventTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        eventTimeouts = [];

        if (altPlayer) {
            altPlayer.reset();
            altPlayer = null;
        }

        if (altVideoElement) {
            altVideoElement.parentNode.removeChild(altVideoElement);
            altVideoElement = null;
        }

        if (useDashEventsForScheduling && videoModel) {
            videoModel.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onDashPlaybackTimeUpdated, this);
        }

        isSwitching = false;
        currentEvent = null;

        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
    }

    instance = {
        setConfig,
        initialize,
        reset
    };

    return instance;
}

AlternativeMpdController.__dashjs_factory_name = 'AlternativeMpdController';
const factory = FactoryMaker.getSingletonFactory(AlternativeMpdController);
FactoryMaker.updateSingletonFactory(AlternativeMpdController.__dashjs_factory_name, factory);
export default factory;
