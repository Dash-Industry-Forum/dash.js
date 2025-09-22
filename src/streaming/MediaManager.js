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
import Debug from '../core/Debug.js';

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
        debug,
        prebufferedPlayers = new Map(),
        prebufferCleanupInterval = null;

    function setConfig(config) {
        if (!config) {
            return;
        }

        if (!videoModel) {
            videoModel = config.videoModel;
        }

        if (config.debug) {
            debug = config.debug;
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
        if (!debug) {
            debug = Debug(context).getInstance();
        }

        logger = debug.getLogger(instance);

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


    function prebufferAlternativeContent(playerId, alternativeMpdUrl) {
        try {
            if (prebufferedPlayers.has(playerId)) {
                return; // Already prebuffered
            }

            logger.info(`Starting prebuffering for player ${playerId}`);

            // Create a prebuffered player
            const prebufferedPlayer = MediaPlayer().create();
            prebufferedPlayer.initialize(null, alternativeMpdUrl, false, NaN);
            prebufferedPlayer.updateSettings({
                streaming: {cacheInitSegments: true}
            });
            prebufferedPlayer.preload();
            prebufferedPlayer.setAutoPlay(false);

            // Store the prebuffered player
            prebufferedPlayers.set(playerId, {
                player: prebufferedPlayer,
                playerId: playerId
            });

            prebufferedPlayer.on(Events.STREAM_INITIALIZED, () => {
                logger.info(`Prebuffering completed for player ${playerId}`);
            }, this);

            prebufferedPlayer.on(Events.ERROR, (e) => {
                logger.error(`Prebuffering error for player ${playerId}:`, e);
                cleanupPrebufferedContent(playerId);
            }, this);

        } catch (err) {
            logger.error('Error prebuffering alternative content:', err);
        }
    }

    function cleanupPrebufferedContent(playerId) {
        try {
            const prebufferedPlayer = prebufferedPlayers.get(playerId);
            if (prebufferedPlayer) {
                prebufferedPlayer.player.off(Events.STREAM_INITIALIZED);
                prebufferedPlayer.player.off(Events.ERROR);
                prebufferedPlayer.player.reset();
                
                if (prebufferedPlayer.videoElement && prebufferedPlayer.videoElement?.parentNode) {
                    prebufferedPlayer.videoElement.parentNode?.removeChild(prebufferedPlayer.videoElement);
                }
                
                prebufferedPlayers.delete(playerId);
            }
            logger.debug(`Cleaned up prebuffered content for ${playerId}`);
        } catch (err) {
            logger.error('Error cleaning up prebuffered content:', err);
        }
    }

    function initializeAlternativePlayer(alternativeMpdUrl) {
        if (altPlayer) {
            altPlayer.off(Events.ERROR, onAlternativePlayerError, this);
        }

        altPlayer = MediaPlayer().create();
        altPlayer.updateSettings({
            streaming: {
                cacheInitSegments: true
            }
        });
        altPlayer.initialize(null, alternativeMpdUrl, false, NaN);
        altPlayer.preload();
        altPlayer.setAutoPlay(false);
        altPlayer.on(Events.ERROR, onAlternativePlayerError, this);
    }

    function onAlternativePlayerError(e) {
        if (logger) {
            logger.error('Alternative player error:', e);
        }
    }

    function switchToAlternativeContent(playerId, alternativeMpdUrl, time = 0) {
        if (isSwitching) { 
            logger.debug('Switch already in progress - ignoring request');
            return 
        };
        
        logger.info(`Switching to alternative content at time ${time}`);
        isSwitching = true;

        const prebufferedContent = prebufferedPlayers.get(playerId);

        if (prebufferedContent) {
            // Use prebuffered content
            logger.info(`Using prebuffered content for player ${playerId}`);

            // Move prebuffered video element to visible area
            altPlayer = prebufferedContent.player;
            
            // Remove from prebuffered storage
            prebufferedPlayers.delete(playerId);

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

            altPlayer.attachView(altVideoElement);
        } else {
            initializeAlternativePlayer(alternativeMpdUrl);
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


    function switchBackToMainContent(seekTime) {
        if (isSwitching) { 
            logger.debug('Switch already in progress - ignoring request');
            return 
        };
        
        logger.info('Switching back to main content');
        isSwitching = true;

        altPlayer.pause();
        altVideoElement.style.display = 'none';
        videoModel.getElement().style.display = 'block';

        if (playbackController.getIsDynamic()) {
            logger.debug('Seeking to original live point for dynamic manifest');
            playbackController.seekToOriginalLive(true, false, false);
        } else {
            logger.debug(`Seeking main content to time: ${seekTime}`);
            playbackController.seek(seekTime, false, false);
        }

        videoModel.play();
        logger.info('Main content playback resumed');

        altPlayer.destroy();
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

        if (altVideoElement) {
            altVideoElement.style.display = 'none';
        }

        // Clean up all prebuffered content
        for (const [playerId] of prebufferedPlayers) {
            cleanupPrebufferedContent(playerId);
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

    function setAlternativeVideoElement(alternativeVideoElement) {
        altVideoElement = alternativeVideoElement;
    }

    instance = {
        setConfig,
        initialize,
        prebufferAlternativeContent,
        cleanupPrebufferedContent,
        switchToAlternativeContent,
        switchBackToMainContent,
        getAlternativePlayer,
        setAlternativeVideoElement,
        reset
    };

    return instance;
}

MediaManager.__dashjs_factory_name = 'MediaManager';
const factory = FactoryMaker.getSingletonFactory(MediaManager);
FactoryMaker.updateSingletonFactory(MediaManager.__dashjs_factory_name, factory);
export default factory;