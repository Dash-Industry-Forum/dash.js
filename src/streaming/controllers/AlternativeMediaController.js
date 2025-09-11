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
import EventBus from './../../core/EventBus.js';
import FactoryMaker from '../../core/FactoryMaker.js';
import Constants from '../constants/Constants.js';
import DashConstants from '../../dash/constants/DashConstants.js';
import MediaManager from '../MediaManager.js';

function AlternativeMediaController() {
    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        manifestInfo = {},
        mediaManager,
        playbackController,
        currentEvent = null,
        actualEventPresentationTime = 0,
        timeToSwitch = 0;

    function setConfig(config) {
        if (!config) {
            return;
        }

        // Store playbackController reference
        if (config.playbackController && !playbackController) {
            playbackController = config.playbackController;
        }

        // Initialize the media manager if not already done
        if (!mediaManager) {
            mediaManager = MediaManager(context).getInstance();
        }

        // Forward config to media manager including shared eventBus
        mediaManager.setConfig({
            ...config,
            eventBus
        });
    }

    function initialize() {
        // Initialize the media manager
        if (!mediaManager) {
            mediaManager = MediaManager(context).getInstance();
        }
        
        mediaManager.initialize();

        // Set up event listeners
        eventBus.on(MediaPlayerEvents.MANIFEST_LOADED, onManifestLoaded, this);
        
        // Listen to alternative MPD events directly from EventController
        eventBus.on(Constants.ALTERNATIVE_MPD.URIS.REPLACE, onAlternativeEventTriggered, this);
        eventBus.on(Constants.ALTERNATIVE_MPD.URIS.INSERT, onAlternativeEventTriggered, this);
        
        // Listen to event ready to resolve for prebuffering
        eventBus.on(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve, this);
    }

    function onManifestLoaded(e) {
        const manifest = e.data
        manifestInfo.type = manifest.type;
        manifestInfo.originalUrl = manifest.originalUrl;
    }

    function getAnchor(url) {
        const regexT = /#.*?t=(\d+)(?:&|$)/;
        const t = url.match(regexT);
        return t ? Number(t[1]) : 0;
    }

    function parseEvent(event) {
        if (event.alternativeMpd) {
            const timescale = event.eventStream.timescale || 1;
            const alternativeMpdNode = event.alternativeMpd;
            const mode = alternativeMpdNode.mode || Constants.ALTERNATIVE_MPD.MODES.INSERT;
            return {
                presentationTime: event.presentationTime / timescale,
                duration: event.duration,
                id: event.id,
                schemeIdUri: event.eventStream.schemeIdUri,
                maxDuration: alternativeMpdNode.maxDuration / timescale,
                alternativeMPD: {
                    url: alternativeMpdNode.url,
                },
                mode: mode,
                type: DashConstants.STATIC,
                ...(alternativeMpdNode.returnOffset && { returnOffset: parseInt(alternativeMpdNode.returnOffset || '0', 10) / 1000 }),
                ...(alternativeMpdNode.maxDuration && { clip: alternativeMpdNode.clip }),
                ...(alternativeMpdNode.clip && { startWithOffset: alternativeMpdNode.startWithOffset }),
            };
        }
        return event;
    }

    function onAlternativeEventTriggered(e) {
        const event = e.event;
        try {
            if (!event || !event.alternativeMpd) {
                return;
            }

            // Only Alternative MPD replace events can be used for dynamic MPD
            if (manifestInfo.type === DashConstants.DYNAMIC && event.alternativeMpd.mode === Constants.ALTERNATIVE_MPD.MODES.INSERT) {
                console.warn('Insert mode not supported for dynamic manifests - ignoring event');
                return;
            }

            const parsedEvent = parseEvent(event);
            if (!parsedEvent) {
                return;
            }

            // Try to prebuffer if not already done
            mediaManager.prebufferAlternativeContent(parsedEvent);

            // Set current event and timing variables
            currentEvent = parsedEvent;
            
            // Handle switching to alternative content (need to determine timing)
            // This logic was previously in handleAlternativeEventTriggered
            if (playbackController) {
                actualEventPresentationTime = playbackController.getTime();
                timeToSwitch = parsedEvent.startWithOffset ? actualEventPresentationTime - parsedEvent.presentationTime : 0;
                timeToSwitch = timeToSwitch + getAnchor(parsedEvent.alternativeMPD.url);
                mediaManager.switchToAlternativeContent(parsedEvent, timeToSwitch);
            } else {
                mediaManager.switchToAlternativeContent(parsedEvent);
            }

            const altPlayer = mediaManager.getAlternativePlayer();
            if (altPlayer) {
                altPlayer.on(MediaPlayerEvents.PLAYBACK_TIME_UPDATED, onAlternativePlaybackTimeUpdated, this);
            }
        } catch (err) {
            console.error('Error handling alternative event:', err);
        }
    }

    function onEventReadyToResolve(e) {
        const { schemeIdUri, eventId, event } = e;
        
        try {
            // Check if this is an alternative MPD event
            if (schemeIdUri === Constants.ALTERNATIVE_MPD.URIS.REPLACE || 
                schemeIdUri === Constants.ALTERNATIVE_MPD.URIS.INSERT) {
                
                console.info(`Event ${eventId} is ready for prebuffering`);
                
                // Start prebuffering if we have the event data
                if (event && event.alternativeMpd) {
                    const parsedEvent = parseEvent(event);
                    if (parsedEvent) {
                        mediaManager.prebufferAlternativeContent(parsedEvent);
                    }
                }
            }
        } catch (err) {
            console.error('Error handling event ready to resolve:', err);
        }
    }

    function onAlternativePlaybackTimeUpdated(e) {
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
                (Math.round(mediaManager.getAlternativePlayer().duration() - e.time) === 0) ||
                (clip && actualEventPresentationTime + (e.time - timeToSwitch) >= presentationTime + maxDuration) ||
                (maxDuration && maxDuration <= e.time);
            if (shouldSwitchBack) {
                mediaManager.switchBackToMainContent(currentEvent);
                // Reset current event after switching back
                currentEvent = null;
                actualEventPresentationTime = 0;
                timeToSwitch = 0;
            }
        } catch (err) {
            console.error(`Error at ${actualEventPresentationTime} in onAlternativePlaybackTimeUpdated:`, err);
        }
    }

    function reset() {
        if (mediaManager) {
            mediaManager.reset();
        }

        // Reset current event state
        currentEvent = null;
        actualEventPresentationTime = 0;
        timeToSwitch = 0;

        eventBus.off(MediaPlayerEvents.MANIFEST_LOADED, onManifestLoaded, this);
        eventBus.off(Constants.ALTERNATIVE_MPD.URIS.REPLACE, onAlternativeEventTriggered, this);
        eventBus.off(Constants.ALTERNATIVE_MPD.URIS.INSERT, onAlternativeEventTriggered, this);
        eventBus.off(Events.EVENT_READY_TO_RESOLVE, onEventReadyToResolve, this);
    }

    instance = {
        setConfig,
        initialize,
        reset
    };

    return instance;
}

AlternativeMediaController.__dashjs_factory_name = 'AlternativeMediaController';
const factory = FactoryMaker.getSingletonFactory(AlternativeMediaController);
FactoryMaker.updateSingletonFactory(AlternativeMediaController.__dashjs_factory_name, factory);
export default factory;