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
        videoModel,
        currentEvent = null,
        isSwitching = false,
        hideAlternativePlayerControls = false,
        altPlayer,
        fullscreenDiv,
        playbackController,
        altVideoElement,
        alternativeContext,
        actualEventPresentationTime = 0,
        timeToSwitch = 0,
        manifestInfo = {},
        DashConstants,
        logger,
        prebufferedEvents = new Map(),
        prebufferedPlayers = new Map(),
        prebufferCleanupInterval = null;

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


        if (!!config.alternativeContext && !alternativeContext) {
            alternativeContext = config.alternativeContext
        }

        if (!!config.currentEvent && !currentEvent) {
            currentEvent = config.currentEvent;
        }
    }

    function initialize() {
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        
        // Listen to alternative MPD events directly from EventController
        eventBus.on(Constants.ALTERNATIVE_MPD.URIS.REPLACE, _onAlternativeEventTriggered, this);
        eventBus.on(Constants.ALTERNATIVE_MPD.URIS.INSERT, _onAlternativeEventTriggered, this);
        
        // Listen to event ready to resolve for prebuffering
        eventBus.on(Events.EVENT_READY_TO_RESOLVE, _onEventReadyToResolve, this);

        if (altPlayer) {
            altPlayer.on(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
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

        logger.info('Manifest loaded for alternative MPD controller');
        
        // Start cleanup interval for stale prebuffered content
        if (!prebufferCleanupInterval) {
            prebufferCleanupInterval = setInterval(_cleanupStalePrebufferedContent, 30000); // Every 30 seconds
        }
    }

    function _startAltnerativePlaybackTimeMonitoring() {
        altPlayer.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onAlternativePlaybackTimeUpdated, this);
    }

    function _onAlternativeEventTriggered(e) {
        try {
            const event = e.event;
            console.log(event)
            if (!event || !event.alternativeMpd) {
                return;
            }

            // Only Alternative MPD replace events can be used for dynamic MPD
            if (manifestInfo.type === DashConstants.DYNAMIC && event.alternativeMpd.mode === Constants.ALTERNATIVE_MPD.MODES.INSERT) {
                logger.warn('Insert mode not supported for dynamic manifests - ignoring event');
                return;
            }

            const parsedEvent = _parseEvent(event);
            if (!parsedEvent) {
                return;
            }

            // Try to prebuffer if not already done
            const eventKey = `${parsedEvent.schemeIdUri}_${parsedEvent.id}`;
            if (prebufferedEvents.has(eventKey) && !prebufferedEvents.get(eventKey).prebuffered) {
                _prebufferAlternativeContent(parsedEvent);
            }

            // Handle switching to alternative content
            if (!isSwitching && !currentEvent) {
                currentEvent = parsedEvent;
                actualEventPresentationTime = playbackController.getTime();
                timeToSwitch = parsedEvent.startWithOffset ? actualEventPresentationTime - parsedEvent.presentationTime : 0;
                timeToSwitch = timeToSwitch + _getAnchor(parsedEvent.alternativeMPD.url);
                _switchToAlternativeContent(parsedEvent, timeToSwitch);
            }
        } catch (err) {
            logger.error('Error handling alternative event:', err);
        }
    }

    function _onEventReadyToResolve(e) {
        try {
            const { schemeIdUri, eventId } = e;
            
            // Check if this is an alternative MPD event
            if (schemeIdUri === Constants.ALTERNATIVE_MPD.URIS.REPLACE || 
                schemeIdUri === Constants.ALTERNATIVE_MPD.URIS.INSERT) {
                
                logger.info(`Event ${eventId} is ready for prebuffering`);
                
                // Mark this event as ready for prebuffering
                const eventKey = `${schemeIdUri}_${eventId}`;
                if (!prebufferedEvents.has(eventKey)) {
                    prebufferedEvents.set(eventKey, {
                        schemeIdUri: schemeIdUri,
                        eventId: eventId,
                        readyTime: Date.now(),
                        prebuffered: false
                    });
                }
            }
        } catch (err) {
            logger.error('Error handling event ready to resolve:', err);
        }
    }

    function _prebufferAlternativeContent(event) {
        try {
            const eventKey = `${event.schemeIdUri}_${event.id}`;
            const prebufferInfo = prebufferedEvents.get(eventKey);
            
            if (!prebufferInfo || prebufferInfo.prebuffered) {
                return; // Already prebuffered or not ready
            }

            logger.info(`Starting prebuffering for event ${event.id}`);
            
            // Create a prebuffered video element
            const prebufferedVideoElement = document.createElement('video');
            prebufferedVideoElement.style.display = 'none';
            prebufferedVideoElement.autoplay = false;
            prebufferedVideoElement.controls = false;
            document.body.appendChild(prebufferedVideoElement);

            // Create a prebuffered player
            const prebufferedPlayer = MediaPlayer().create();
            prebufferedPlayer.initialize(prebufferedVideoElement, event.alternativeMPD.url, false, NaN, alternativeContext);
            prebufferedPlayer.setAutoPlay(false);

            // Store the prebuffered player
            prebufferedPlayers.set(eventKey, {
                player: prebufferedPlayer,
                videoElement: prebufferedVideoElement,
                event: event
            });

            // Mark as prebuffered
            prebufferInfo.prebuffered = true;

            prebufferedPlayer.on(Events.STREAM_INITIALIZED, () => {
                logger.info(`Prebuffering completed for event ${event.id}`);
            }, this);

            prebufferedPlayer.on(Events.ERROR, (e) => {
                logger.error(`Prebuffering error for event ${event.id}:`, e);
                _cleanupPrebufferedContent(eventKey);
            }, this);

        } catch (err) {
            logger.error('Error prebuffering alternative content:', err);
        }
    }

    function _cleanupPrebufferedContent(eventKey) {
        try {
            const prebufferedPlayer = prebufferedPlayers.get(eventKey);
            if (prebufferedPlayer) {
                prebufferedPlayer.player.off(Events.STREAM_INITIALIZED);
                prebufferedPlayer.player.off(Events.ERROR);
                prebufferedPlayer.player.reset();
                
                if (prebufferedPlayer.videoElement && prebufferedPlayer.videoElement.parentNode) {
                    prebufferedPlayer.videoElement.parentNode.removeChild(prebufferedPlayer.videoElement);
                }
                
                prebufferedPlayers.delete(eventKey);
            }
            
            prebufferedEvents.delete(eventKey);
            logger.debug(`Cleaned up prebuffered content for ${eventKey}`);
        } catch (err) {
            logger.error('Error cleaning up prebuffered content:', err);
        }
    }

    function _cleanupStalePrebufferedContent() {
        try {
            const now = Date.now();
            const maxAge = 5 * 60 * 1000; // 5 minutes
            
            for (const [eventKey, eventInfo] of prebufferedEvents) {
                if (now - eventInfo.readyTime > maxAge) {
                    logger.debug(`Cleaning up stale prebuffered content for ${eventKey}`);
                    _cleanupPrebufferedContent(eventKey);
                }
            }
        } catch (err) {
            logger.error('Error cleaning up stale prebuffered content:', err);
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

    function _parseEvent(event) {
        if (event.alternativeMpd) {
            const timescale = event.eventStream.timescale || 1;
            const alternativeMpdNode = event.alternativeMpd;
            const mode = alternativeMpdNode.mode || Constants.ALTERNATIVE_MPD.MODES.INSERT;
            return {
                presentationTime: event.presentationTime / timescale,
                duration: event.duration,
                id: event.id,
                schemeIdUri: event.eventStream.schemeIdUri,
                status: event.status,
                periodId: event.eventStream.period.id,
                maxDuration: alternativeMpdNode.maxDuration / timescale,
                alternativeMPD: {
                    url: alternativeMpdNode.url,
                    earliestResolutionTimeOffset: parseInt(alternativeMpdNode.earliestResolutionTimeOffset || DEFAULT_EARLIEST_RESOULTION_TIME_OFFSET, 10),
                },
                noJump: parseInt(alternativeMpdNode.noJump || 0, 10),
                mode: mode,
                type: DashConstants.STATIC,
                ...(alternativeMpdNode.returnOffset && { returnOffset: parseInt(alternativeMpdNode.returnOffset || '0', 10) / 1000 }),
                ...(alternativeMpdNode.maxDuration && { clip: alternativeMpdNode.clip }),
                ...(alternativeMpdNode.clip && { startWithOffset: alternativeMpdNode.startWithOffset }),
            };
        }
        return event;
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
        _initializeAlternativePlayer(event);
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

    function _switchToAlternativeContent(event, time = 0) {
        if (isSwitching) { 
            logger.debug('Switch already in progress - ignoring request');
            return 
        };
        
        logger.info(`Switching to alternative content at time ${time}`);
        isSwitching = true;

        const eventKey = `${event.schemeIdUri}_${event.id}`;
        const prebufferedContent = prebufferedPlayers.get(eventKey);

        if (prebufferedContent) {
            // Use prebuffered content
            logger.info(`Using prebuffered content for event ${event.id}`);
            
            // Move prebuffered video element to visible area
            altVideoElement = prebufferedContent.videoElement;
            altPlayer = prebufferedContent.player;
            
            // Remove from prebuffered storage
            prebufferedPlayers.delete(eventKey);

            // Setup video element for display
            altVideoElement.style.display = 'none';
            altVideoElement.controls = !hideAlternativePlayerControls;
            
            if (altVideoElement.parentNode !== fullscreenDiv) {
                fullscreenDiv.appendChild(altVideoElement);
            }
            
            // Insert into DOM if needed
            if (!videoModel.getElement().parentNode.contains(altVideoElement)) {
                videoModel.getElement().parentNode.insertBefore(altVideoElement, videoModel.getElement().nextSibling);
            }
        } else {
            // No prebuffered content, initialize normally
            _initializeAlternativePlayerElement(event);
        }

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
    }


    function reset() {
        if (altPlayer) {
            altPlayer.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
            altPlayer.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, _onAlternativePlaybackTimeUpdated, this);
            altPlayer.off(Events.ERROR, _onAlternativePlayerError, this);
            altPlayer.reset();
            altPlayer = null;
        }

        if (altVideoElement && altVideoElement.parentNode) {
            altVideoElement.parentNode.removeChild(altVideoElement);
            altVideoElement = null;
        }

        // Clean up all prebuffered content
        for (const [eventKey] of prebufferedPlayers) {
            _cleanupPrebufferedContent(eventKey);
        }
        prebufferedEvents.clear();
        prebufferedPlayers.clear();

        // Clear cleanup interval
        if (prebufferCleanupInterval) {
            clearInterval(prebufferCleanupInterval);
            prebufferCleanupInterval = null;
        }

        isSwitching = false;
        currentEvent = null;

        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, _onManifestLoaded, this);
        eventBus.off(Constants.ALTERNATIVE_MPD.URIS.REPLACE, _onAlternativeEventTriggered, this);
        eventBus.off(Constants.ALTERNATIVE_MPD.URIS.INSERT, _onAlternativeEventTriggered, this);
        eventBus.off(Events.EVENT_READY_TO_RESOLVE, _onEventReadyToResolve, this);
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
