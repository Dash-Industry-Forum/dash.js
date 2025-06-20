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
import Constants from '../constants/Constants.js';

function AlternativeMpdController() {

    const DEFAULT_EARLIEST_RESOULTION_TIME_OFFSET = 60;

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        scheduledEvents = [],
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
        actualEventPresentationTime = 0,
        timeToSwitch = 0,
        manifestInfo = {},
        DashConstants,
        logger;

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (!videoModel) {
            videoModel = config.videoModel;
        }

        if (config.DashConstants) {
            DashConstants = config.DashConstants
        }

        if (config.logger) {
            logger = config.logger;
        }

        if (!!config.playbackController && !playbackController) {
            playbackController = config.playbackController;
        }

        if (!!config.hideAlternativePlayerControls && !hideAlternativePlayerControls) {
            hideAlternativePlayerControls = config.hideAlternativePlayerControls;
        }

        if (!!config.useDashEventsForScheduling && !useDashEventsForScheduling) {
            logger.info(`Event strategy: ${'Timestamps based' ? config.useDashEventsForScheduling : 'Interval based'}`)
            useDashEventsForScheduling = config.useDashEventsForScheduling;
        }

        if (!!config.alternativeContext && !alternativeContext) {
            alternativeContext = config.alternativeContext
        }

        if (!!config.currentEvent && !currentEvent) {
            currentEvent = config.currentEvent;
        }
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.on(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventReceived, this);

        if (altPlayer) {
            altPlayer.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
            altPlayer.on(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventReceived, this);
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement === videoModel.getElement()) {
                // TODO: Implement fullscreen
            } else {
                // TODO: Handle error
            }
        });

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

        logger.debug(`Manifest loaded - Type: ${manifestInfo.type}, URL: ${manifestInfo.originalUrl}`);

        scheduledEvents.forEach((scheduledEvent) => {
            if (scheduledEvent.alternativeMPD.url == manifestInfo.originalUrl) {
                scheduledEvent.type = manifestInfo.type;
                logger.debug(`Updated scheduled event type to ${manifestInfo.type} for URL: ${scheduledEvent.alternativeMPD.url}`);
            }
        });
    }

    function _onAlternativeEventReceived(event) {
        // Only Alternative MPD replace events can be used used for dynamic MPD
        if (manifestInfo.type === DashConstants.DYNAMIC && event?.alternativeMpd.mode === Constants.ALTERNATIVE_MPD.MODES.INSERT) {
            logger.warn('Insert mode not supported for dynamic manifests - ignoring event');
            return
        }

        const alternativeEvent = _parseAlternativeMPDEvent(event);
        if (!alternativeEvent) {   
            return
        }
        if (scheduledEvents && scheduledEvents.length > 0) {
            scheduledEvents.push(alternativeEvent)
            logger.info(`Added new alternative event. Total scheduled events: ${scheduledEvents.length}`);
        } else {
            scheduledEvents = [alternativeEvent]
            logger.info('First alternative event scheduled');
        }

        logger.info('Starting playback time monitoring for static manifest');
        _startPlaybackTimeMonitoring();
    }

    function _startPlaybackTimeMonitoring() {
        eventBus.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onMainPlaybackTimeUpdated, this);
    }

    function _startAltnerativePlaybackTimeMonitoring() {
        altPlayer.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onAlternativePlaybackTimeUpdated, this);
    }

    // Handles main player time updates (no currentEvent)
    function _onMainPlaybackTimeUpdated(e) {
        try {
            const currentTime = e.time;
            const streamId = e.streamId || 0;
            if (!currentEvent) {
                const nextEvent = _getEventToPrebuff(currentTime);
                if (nextEvent) {
                    _prebufferNextAlternative(nextEvent);
                }

                actualEventPresentationTime = e.time;
                const event = _getCurrentEvent(currentTime, streamId);

                if (event && !isSwitching && !currentEvent) {
                    currentEvent = event;
                    timeToSwitch = event.startWithOffset ? actualEventPresentationTime - event.presentationTime : 0;
                    timeToSwitch = timeToSwitch + _getAnchor(event.alternativeMPD.url);
                    _switchToAlternativeContent(event, timeToSwitch);
                }
            }
        } catch (err) {
            logger.error(`Error at ${actualEventPresentationTime} in _onMainPlaybackTimeUpdated:`, err);
        }
    }

    // Handles alternative player time updates (with currentEvent)
    function _onAlternativePlaybackTimeUpdated(e) {
        try {
            if (!currentEvent) {
                return;
            }

            if (currentEvent.type == DashConstants.DYNAMIC) {
                return;
            }

            const { presentationTime, maxDuration, clip } = currentEvent;
            if (Math.round(e.time - actualEventPresentationTime) === 0) {
                return;
            }

            const shouldSwitchBack =
                (Math.round(altPlayer.duration() - e.time) === 0) ||
                (clip && actualEventPresentationTime + (e.time - timeToSwitch) >= presentationTime + maxDuration) ||
                (maxDuration && maxDuration <= e.time);

            if (shouldSwitchBack) {
                _switchBackToMainContent(currentEvent);
            }
        } catch (err) {
            logger.error(`Error at ${actualEventPresentationTime} in _onAlternativePlaybackTimeUpdated:`, err);
        }
    }

    function _getCurrentEvent(currentTime, streamId) {
        return scheduledEvents.find(event => {
            if (event.executeOnce && event.executionCount > 0) {
                return false; // Skip if executeOnce and already executed
            }
            
            if (event.completed) {
                const hasDuration = !isNaN(event.duration);
                const isPastEnd = hasDuration && currentTime > event.presentationTime + event.duration;
                const isBeforeStart = currentTime < event.presentationTime;

                event.completed = !(isPastEnd || isBeforeStart);
                return false;
            }

            if (event.noJump) {
                return currentTime > event.presentationTime;
            }

            if (streamId !== event.periodId) {
                return false;
            }

            return currentTime >= event.presentationTime &&
                (isNaN(event.duration) || currentTime < event.presentationTime + event.duration);
        });
    }

    function _getEventToPrebuff(currentTime) {
        return scheduledEvents.find(event => {
            if (event.executeOnce && event.executionCount > 0) {
                return false; // Skip if executeOnce and already executed
            }

            if (event.triggered) {
                const hasDuration = !isNaN(event.duration);
                const isPastEnd = hasDuration && currentTime > event.presentationTime + event.duration;
                const isBeforeStart = currentTime < event.presentationTime - event.earliestResolutionTimeOffset;

                event.triggered = !(isPastEnd || isBeforeStart);
                return false;
            }
            return currentTime >= event.presentationTime - event.alternativeMPD.earliestResolutionTimeOffset &&
                currentTime < event.presentationTime;
        });
    }

    function _initializeAlternativePlayerElement(event) {
        if (!altVideoElement) {
            // Create a new video element for the alternative content
            altVideoElement = document.createElement('video');
            altVideoElement.style.display = 'none';
            altVideoElement.autoplay = false;
            altVideoElement.controls = !hideAlternativePlayerControls;
            fullscreenDiv.appendChild(altVideoElement);

            // Insert the alternative video element into the DOM
            videoModel.getElement().parentNode.insertBefore(altVideoElement, videoModel.getElement().nextSibling);
        };

        // Initialize alternative player
        if (event != bufferedEvent) {
            _initializeAlternativePlayer(event);
        }
    }

    function _initializeAlternativePlayer(event) {
        // Clean up previous error listener if any
        if (altPlayer) {
            altPlayer.off(Events.ERROR, _onAlternativePlayerError, this);
        }
        // Initialize alternative player
        altPlayer = MediaPlayer().create();
        altPlayer.initialize(altVideoElement, event.alternativeMPD.url, false, NaN, alternativeContext);
        altPlayer.setAutoPlay(false);
        altPlayer.on(Events.ERROR, _onAlternativePlayerError, this);
    }

    function _onAlternativePlayerError(e) {
        if (logger) {
            logger.error('Alternative player error:', e);
        }
    }


    function _parseAlternativeMPDEvent(event) {
        if (event.alternativeMpd) {
            const timescale = event.eventStream.timescale || 1;
            const alternativeMpdNode = event.alternativeMpd;
            const mode = alternativeMpdNode.mode || Constants.ALTERNATIVE_MPD.MODES.INSERT;
            return {
                presentationTime: event.presentationTime / timescale,
                duration: event.duration,
                periodId: event.eventStream.period.id,
                maxDuration: alternativeMpdNode.maxDuration / timescale,
                alternativeMPD: {
                    url: alternativeMpdNode.url,
                    earliestResolutionTimeOffset: parseInt(alternativeMpdNode.earliestResolutionTimeOffset || DEFAULT_EARLIEST_RESOULTION_TIME_OFFSET, 10),
                },
                noJump: parseInt(alternativeMpdNode.noJump || 0, 10),
                mode: mode,
                triggered: false,
                completed: false,
                type: DashConstants.STATIC,
                executeOnce: alternativeMpdNode.executeOnce || false,
                executionCount: 0,
                ...(alternativeMpdNode.returnOffset && { returnOffset: parseInt(alternativeMpdNode.returnOffset || '0', 10) / 1000 }),
                ...(alternativeMpdNode.maxDuration && { clip: alternativeMpdNode.clip }),
                ...(alternativeMpdNode.clip && { startWithOffset: alternativeMpdNode.startWithOffset }),
            };
        }
    }

    function _prebufferNextAlternative(nextEvent) {
        if (nextEvent && !bufferedEvent) {
            logger.info(`Preloading event starting at ${nextEvent.presentationTime}`)
            _prebufferAlternativeContent(nextEvent);
        }
    }

    function _prebufferAlternativeContent(event) {
        if (event.triggered) { return };
        event.triggered = true;

        _initializeAlternativePlayerElement(event);
        bufferedEvent = event;

        altPlayer.on(Events.STREAM_INITIALIZED, () => {
            logger.info('Buffering alternative content')
        }, this);
    }

    function _switchToAlternativeContent(event, time = 0) {
        if (isSwitching) { 
            logger.debug('Switch already in progress - ignoring request');
            return 
        };
        
        logger.info(`Switching to alternative content at time ${time}`);
        isSwitching = true;
        event.triggered = true;
        event.noJump = 0;

        _initializeAlternativePlayerElement(event);

        videoModel.pause();
        logger.debug('Main video paused');

        videoModel.getElement().style.display = 'none';
        altVideoElement.style.display = 'block';

        if (time) {
            logger.debug(`Seeking alternative content to time: ${time}`);
            altPlayer.seek(time);
        }

        altPlayer.play();
        logger.info('Alternative content playback started');
        _startAltnerativePlaybackTimeMonitoring();

        isSwitching = false;
        bufferedEvent = null;

        event.executionCount++;
    }

    function _getAnchor(url) {
        const regexT = /#.*?t=(\d+)(?:&|$)/;
        const t = url.match(regexT);
        return t ? Number(t[1]) : 0;
    }

    function _switchBackToMainContent(event) {
        if (isSwitching) { 
            logger.debug('Switch already in progress - ignoring request');
            return 
        };
        
        logger.info('Switching back to main content');
        isSwitching = true;

        altPlayer.pause();
        altVideoElement.style.display = 'none';
        videoModel.getElement().style.display = 'block';

        let seekTime;
        if (event.mode === Constants.ALTERNATIVE_MPD.MODES.REPLACE) {
            if (event.returnOffset || event.returnOffset === 0) {
                seekTime = event.presentationTime + event.returnOffset;
                logger.debug(`Using return offset - seeking to: ${seekTime}`);
            } else {
                const alternativeDuration = altPlayer.duration()
                const alternativeEffectiveDuration = !isNaN(event.maxDuration) ? Math.min(event.maxDuration, alternativeDuration) : alternativeDuration
                seekTime = event.presentationTime + alternativeEffectiveDuration;
                logger.debug(`Using alternative duration - seeking to: ${seekTime}`);
            }
        } else if (event.mode === Constants.ALTERNATIVE_MPD.MODES.INSERT) {
            seekTime = event.presentationTime;
            logger.debug(`Insert mode - seeking to original presentation time: ${seekTime}`);
        }

        if (!event.completed) {
            event.completed = true;
        }

        if (playbackController.getIsDynamic()) {
            logger.debug('Seeking to original live point for dynamic manifest');
            playbackController.seekToOriginalLive(true, false, false);
        } else {
            logger.debug(`Seeking main content to time: ${seekTime}`);
            playbackController.seek(seekTime, false, false);
        }

        videoModel.play();
        logger.info('Main content playback resumed');

        altPlayer.reset();
        altPlayer = null;

        altVideoElement.parentNode.removeChild(altVideoElement);
        altVideoElement = null;

        isSwitching = false;
        currentEvent = null;

        logger.debug('Alternative player resources cleaned up');
        _prebufferNextAlternative();
    }


    function reset() {
        scheduledEvents = [];

        if (altPlayer) {
            altPlayer.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
            altPlayer.off(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventReceived, this);
            altPlayer.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onAlternativePlaybackTimeUpdated, this);
            altPlayer.off(Events.ERROR, _onAlternativePlayerError, this);
            altPlayer.reset();
            altPlayer = null;
        }

        if (altVideoElement && altVideoElement.parentNode) {
            altVideoElement.parentNode.removeChild(altVideoElement);
            altVideoElement = null;
        }

        if (videoModel) {
            videoModel.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onMainPlaybackTimeUpdated, this);
        }

        isSwitching = false;
        currentEvent = null;

        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.off(Events.ALTERNATIVE_EVENT_RECEIVED, _onAlternativeEventReceived, this);
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
