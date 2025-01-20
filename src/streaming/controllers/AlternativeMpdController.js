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
        scheduledEvents = [],
        eventTimeouts = [],
        videoModel,
        bufferedEvent = null,
        currentEvent = null,
        isSwitching = false,
        hideAlternativePlayerControls = false,
        altPlayer,
        fullscreenDiv,
        useDashEventsForScheduling = false,
        playbackController,
        altVideoElement,
        alternativeContext,
        isMainDynamic = false,
        lastTimestamp = 0,
        manifestInfo = {};

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (!videoModel) {
            videoModel = config.videoModel;
        }

        if (!!config.playbackController && !playbackController) {
            playbackController = config.playbackController;
        }

        if (!!config.hideAlternativePlayerControls && !hideAlternativePlayerControls) {
            hideAlternativePlayerControls = config.hideAlternativePlayerControls;
        }

        if (!!config.useDashEventsForScheduling && !useDashEventsForScheduling) {
            console.log(`Event strategy: ${'Timestamps based' ? config.useDashEventsForScheduling : 'Interval based'}`)
            useDashEventsForScheduling = config.useDashEventsForScheduling;
        }

        if (!!config.alternativeContext && !alternativeContext) {
            alternativeContext = config.alternativeContext
        }

        if (!!config.lastTimestamp) {
            lastTimestamp = config.lastTimestamp || 0;
        }

        if (!!config.currentEvent && !currentEvent) {
            currentEvent = config.currentEvent;
        }
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.on(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventeReceived, this);

        if (altPlayer) {
            altPlayer.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
            altPlayer.on(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventeReceived, this);
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement === videoModel.getElement()) {
                console.log('Ay ay');
                // document.exitFullscreen();
                // fullscreenDiv.requestFullscreen();
            } else {
                console.log('Esto no se va a triggerear nunca');
                // document.exitFullscreen();
            }
        });

        // Borrar por el amor de dios
        if (!fullscreenDiv) {
            fullscreenDiv = document.createElement('div');
            fullscreenDiv.id = 'fullscreenDiv';
            videoModel.getElement().parentNode.insertBefore(fullscreenDiv, videoModel.getElement());
            fullscreenDiv.appendChild(videoModel.getElement());
        }
    }

    function _onManifestLoaded(e) {
        const manifest = e.data
        manifestInfo.type = manifest.type;
        manifestInfo.originalUrl = manifest.originalUrl;

        scheduledEvents.forEach((scheduledEvent) => {
            if (scheduledEvent.alternativeMPD.url == manifestInfo.originalUrl) {
                scheduledEvent.type = manifestInfo.type;
            }
        });
    }

    function _onAlternativeEventeReceived(event) {
        const alternativeEvent = _parseAlternativeMPDEvent(event)
        if (scheduledEvents && scheduledEvents.length > 0) {
            scheduledEvents.push(alternativeEvent)
        } else {
            scheduledEvents = [alternativeEvent]
        }

        switch (manifestInfo.type) {
            case 'dynamic':
                if (!currentEvent && !altPlayer) {
                    isMainDynamic = true;
                    _scheduleAlternativeMPDEvents();
                }
                break;
            case 'static':
                if (!isMainDynamic) {
                    _prebufferNextAlternative();
                    _startDashEventPlaybackTimeMonitoring();
                }
                break;
            default:
                console.log('Unknown manifest type')
                break;
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
            const currentTime = e.time;
            if (!currentEvent) {
                lastTimestamp = e.time;
                const event = _getCurrentEvent(currentTime);

                if (event && !isSwitching && !currentEvent) {
                    currentEvent = event;
                    const timeToSwitch = event.startAtPlayhead ? lastTimestamp - event.presentationTime : 0
                    _switchToAlternativeContent(event, timeToSwitch);
                }
                return;
            }

            if (currentEvent.type == 'dynamic') {
                return;
            }

            const { presentationTime, maxDuration, clip } = currentEvent;
            if (Math.round(e.time - lastTimestamp) === 0) {
                return
            }

            const shouldSwitchBack = 
            (Math.round(altPlayer.duration() - currentTime) === 0) ||
            (clip && lastTimestamp + e.time >= presentationTime + maxDuration) ||
            (maxDuration && maxDuration <= e.time);

            if (shouldSwitchBack) {
                _switchBackToMainContent(currentEvent);
            }
        } catch (err) {
            console.error('Error in onDashPlaybackTimeUpdated:', err);
        }
    }

    function _getCurrentEvent(currentTime) {
        return scheduledEvents.find(event => {
            if (event.completed) {
                event.completed = !(currentTime > event.presentationTime + event.duration)
                return false;
            }
            return currentTime >= event.presentationTime &&
                currentTime < event.presentationTime + event.duration;
        });
    }

    function _initializeAlternativePlayerElement(event) {
        if (!altVideoElement) {
            // Create a new video element for the alternative content
            altVideoElement = document.createElement('video');
            altVideoElement.style.display = 'none'; // Hide the alternative video element initially
            altVideoElement.autoplay = false;
            altVideoElement.controls = !hideAlternativePlayerControls;
            fullscreenDiv.appendChild(altVideoElement);

            // Insert the alternative video element into the DOM
            videoModel.getElement().parentNode.insertBefore(altVideoElement, videoModel.getElement().nextSibling);
        };

        // Initialize alternative player
        if (event != bufferedEvent) {
            _initializeAlternativePlayer(event);
            _startDashEventPlaybackTimeMonitoring();
        }
    }

    function _initializeAlternativePlayer(event) {
        // Initialize alternative player
        altPlayer = MediaPlayer().create();
        altPlayer.initialize(altVideoElement, event.alternativeMPD.url, false, NaN, alternativeContext);
        altPlayer.setAutoPlay(false);

        altPlayer.on(Events.ERROR, (e) => {
            console.error('Alternative player error:', e);
        }, this);
    }

    function _parseAlternativeMPDEvent(event) {
        if (event.alternativeMpd) {
            const timescale = event.eventStream.timescale || 1;
            const alternativeMpdNode = event.alternativeMpd;
            const mode = alternativeMpdNode.mode || 'insert';
            return {
                presentationTime: event.presentationTime / timescale,
                duration: event.duration,
                maxDuration: alternativeMpdNode.maxDuration / timescale,
                alternativeMPD: {
                    url: alternativeMpdNode.url,
                    earliestResolutionTimeOffset: parseInt(alternativeMpdNode.earliestResolutionTimeOffset || '0', 10) / 1000,
                },
                mode: mode,
                triggered: false,
                completed: false,
                type: 'static',
                ...(alternativeMpdNode.returnOffset && { returnOffset: parseInt(alternativeMpdNode.returnOffset || '0', 10) / 1000 }),
                ...(alternativeMpdNode.maxDuration && { clip: alternativeMpdNode.clip }),
                ...(alternativeMpdNode.clip && { startAtPlayhead: alternativeMpdNode.startAtPlayhead }),
            };
        }
    }

    function _scheduleAlternativeMPDEvents() {
        scheduledEvents.forEach(event => {
            if (event.length == 0) {
                return;
            }
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

    function _descheduleAlternativeMPDEvents(event) {
        if (currentEvent) {
            setTimeout(() => {
                _switchBackToMainContent(event);
            }, event.duration * 1000);
        }
    }

    function _prebufferNextAlternative() {
        const nextEvent = scheduledEvents.find(event => {
            if (event.completed) {
                return false;
            }
            return !event.triggered;
        });

        if (nextEvent && !bufferedEvent) {
            console.log(`Preloading event starting at ${nextEvent.presentationTime}`)
            _prebufferAlternativeContent(nextEvent);
        }
    }

    function _prebufferAlternativeContent(event) {
        if (event.triggered) { return };
        event.triggered = true;

        _initializeAlternativePlayerElement(event);
        bufferedEvent = event;

        altPlayer.on(Events.STREAM_INITIALIZED, () => {
            console.log('I\'m buffering')
            // altPlayer.seek(event.earliestResolutionTimeOffset);
            // Do not play yet, just buffer
        }, this);
    }

    function _switchToAlternativeContent(event, time = 0) {
        if (isSwitching) { return };
        isSwitching = true;
        event.triggered = true;

        _initializeAlternativePlayerElement(event);

        if (event.type == 'dynamic') {
            _descheduleAlternativeMPDEvents(currentEvent);
        }

        videoModel.pause();

        videoModel.getElement().style.display = 'none';
        altVideoElement.style.display = 'block';

        if (time) {
            altPlayer.seek(time);
        }

        altPlayer.play();

        isSwitching = false;
        bufferedEvent = null;
    }

    function _switchBackToMainContent(event) {
        if (isSwitching) { return };
        isSwitching = true;

        altPlayer.pause();
        altVideoElement.style.display = 'none';
        videoModel.getElement().style.display = 'block';

        let seekTime;
        if (event.mode === 'replace') {
            if (event.returnOffset || event.returnOffset === 0) {
                seekTime = event.presentationTime + event.returnOffset;
            } else {
                const alternativeDuration = (event.maxDuration || event.maxDuration === 0) ? event.maxDuration : altPlayer.duration()
                seekTime = event.presentationTime + alternativeDuration;
            }
        } else if (event.mode === 'insert') {
            seekTime = event.presentationTime;
        }

        if (!event.completed) {
            event.completed = true;
        }

        if (playbackController.getIsDynamic()) {
            playbackController.seekToOriginalLive(true, false, false);
        } else {
            playbackController.seek(seekTime, false, false);
        }

        videoModel.play();

        altPlayer.reset();
        altPlayer = null;

        altVideoElement.parentNode.removeChild(altVideoElement);
        altVideoElement = null;

        isSwitching = false;
        currentEvent = null;

        _prebufferNextAlternative();
    }


    function reset() {
        scheduledEvents = [];
        eventTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        eventTimeouts = [];

        if (altPlayer) {
            altPlayer.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
            altPlayer.off(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventeReceived, this);
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
        eventBus.off(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventeReceived, this);
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
