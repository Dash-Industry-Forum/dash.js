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
import Events from '../core/events/Events.js';
import MediaPlayerEvents from './MediaPlayerEvents.js';
import MediaPlayer from './MediaPlayer.js';
import FactoryMaker from '../core/FactoryMaker.js';
import Constants from './constants/Constants.js';

function MediaManager() {
    let instance,
        videoModel,
        isSwitching = false,
        hideAlternativePlayerControls = false,
        altPlayer,
        fullscreenDiv,
        playbackController,
        altVideoElement,
        alternativeContext,
        logger,
        prebufferedPlayers = new Map(),
        prebufferCleanupInterval = null;

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (!videoModel) {
            videoModel = config.videoModel;
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
    }

    function initialize() {
        if (!fullscreenDiv) {
            fullscreenDiv = document.createElement('div');
            fullscreenDiv.id = 'fullscreenDiv';
            const videoElement = videoModel.getElement();
            const parentNode = videoElement && videoElement.parentNode;
            if (parentNode) {
                parentNode.insertBefore(fullscreenDiv, videoElement);
                fullscreenDiv.appendChild(videoElement);
            }
        }

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement === videoModel.getElement()) {
                // TODO: Implement fullscreen
            } else {
                // TODO: Handle error
            }
        });
    }


    function prebufferAlternativeContent(event) {
        try {
            const eventKey = `${event.schemeIdUri}_${event.id}`;
            
            if (prebufferedPlayers.has(eventKey)) {
                return; // Already prebuffered
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

            prebufferedPlayer.on(Events.STREAM_INITIALIZED, () => {
                logger.info(`Prebuffering completed for event ${event.id}`);
            }, this);

            prebufferedPlayer.on(Events.ERROR, (e) => {
                logger.error(`Prebuffering error for event ${event.id}:`, e);
                cleanupPrebufferedContent(eventKey);
            }, this);

        } catch (err) {
            logger.error('Error prebuffering alternative content:', err);
        }
    }

    function cleanupPrebufferedContent(eventKey) {
        try {
            const prebufferedPlayer = prebufferedPlayers.get(eventKey);
            if (prebufferedPlayer) {
                prebufferedPlayer.player.off(Events.STREAM_INITIALIZED);
                prebufferedPlayer.player.off(Events.ERROR);
                prebufferedPlayer.player.reset();
                
                if (prebufferedPlayer.videoElement && prebufferedPlayer.videoElement?.parentNode) {
                    prebufferedPlayer.videoElement.parentNode?.removeChild(prebufferedPlayer.videoElement);
                }
                
                prebufferedPlayers.delete(eventKey);
            }
            logger.debug(`Cleaned up prebuffered content for ${eventKey}`);
        } catch (err) {
            logger.error('Error cleaning up prebuffered content:', err);
        }
    }

    function initializeAlternativePlayerElement(event) {
        if (!altVideoElement) {
            // Create a new video element for the alternative content
            altVideoElement = document.createElement('video');
            altVideoElement.style.display = 'none';
            altVideoElement.autoplay = false;
            altVideoElement.controls = !hideAlternativePlayerControls;
            fullscreenDiv.appendChild(altVideoElement);

            // Insert the alternative video element into the DOM
            const videoElement = videoModel.getElement();
            const parentNode = videoElement && videoElement.parentNode;
            if (parentNode) {
                parentNode.insertBefore(altVideoElement, videoElement.nextSibling);
            }
        };

        // Initialize alternative player
        initializeAlternativePlayer(event);
    }

    function initializeAlternativePlayer(event) {
        // Clean up previous error listener if any
        if (altPlayer) {
            altPlayer.off(Events.ERROR, onAlternativePlayerError, this);
        }
        // Initialize alternative player
        altPlayer = MediaPlayer().create();
        altPlayer.initialize(altVideoElement, event.alternativeMPD.url, false, NaN, alternativeContext);
        altPlayer.setAutoPlay(false);
        altPlayer.on(Events.ERROR, onAlternativePlayerError, this);
    }

    function onAlternativePlayerError(e) {
        if (logger) {
            logger.error('Alternative player error:', e);
        }
    }

    function switchToAlternativeContent(event, time = 0) {
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
            const videoElement = videoModel.getElement();
            const parentNode = videoElement && videoElement.parentNode;
            if (parentNode && !parentNode.contains(altVideoElement)) {
                parentNode.insertBefore(altVideoElement, videoElement.nextSibling);
            }
        } else {
            // No prebuffered content, initialize normally
            initializeAlternativePlayerElement(event);
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

        isSwitching = false;
    }


    function switchBackToMainContent(event) {
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
        
        altVideoElement.parentNode.removeChild(altVideoElement);
        altVideoElement = null;

        altPlayer.reset();
        altPlayer = null;


        isSwitching = false;

        logger.debug('Alternative player resources cleaned up');
    }


    function reset() {
        if (altPlayer) {
            altPlayer.off(MediaPlayerEvents.PLAYBACK_TIME_UPDATED);
            altPlayer.off(Events.ERROR, onAlternativePlayerError, this);
            altPlayer.reset();
            altPlayer = null;
        }

        if (altVideoElement && altVideoElement.parentNode) {
            altVideoElement.parentNode.removeChild(altVideoElement);
            altVideoElement = null;
        }

        // Clean up all prebuffered content
        for (const [eventKey] of prebufferedPlayers) {
            cleanupPrebufferedContent(eventKey);
        }
        prebufferedPlayers.clear();

        // Clear cleanup interval
        if (prebufferCleanupInterval) {
            clearInterval(prebufferCleanupInterval);
            prebufferCleanupInterval = null;
        }

        isSwitching = false;
    }

    function getAlternativePlayer() {
        return altPlayer;
    }

    instance = {
        setConfig,
        initialize,
        prebufferAlternativeContent,
        cleanupPrebufferedContent,
        switchToAlternativeContent,
        switchBackToMainContent,
        getAlternativePlayer,
        reset
    };

    return instance;
}

MediaManager.__dashjs_factory_name = 'MediaManager';
const factory = FactoryMaker.getSingletonFactory(MediaManager);
FactoryMaker.updateSingletonFactory(MediaManager.__dashjs_factory_name, factory);
export default factory;