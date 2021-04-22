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
import EventBus from '../core/EventBus';
import Events from '../core/events/Events';
import MediaPlayerEvents from '../streaming/MediaPlayerEvents';
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import Errors from '../core/errors/Errors';
import DashConstants from '../dash/constants/DashConstants';
import URLUtils from './utils/URLUtils';

function ManifestUpdater() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();
    const urlUtils = URLUtils(context).getInstance();

    let instance,
        logger,
        refreshDelay,
        refreshTimer,
        isPaused,
        isStopped,
        isUpdating,
        manifestLoader,
        manifestModel,
        adapter,
        errHandler,
        settings;

    function setup() {
        logger = Debug(context).getInstance().getLogger(instance);
    }

    function setConfig(config) {
        if (!config) return;

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.adapter) {
            adapter = config.adapter;
        }
        if (config.manifestLoader) {
            manifestLoader = config.manifestLoader;
        }
        if (config.errHandler) {
            errHandler = config.errHandler;
        }
        if (config.settings) {
            settings = config.settings;
        }
    }

    function initialize() {
        resetInitialSettings();

        eventBus.on(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(MediaPlayerEvents.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);
    }

    function setManifest(manifest) {
        update(manifest);
    }

    function resetInitialSettings() {
        refreshDelay = NaN;
        isUpdating = false;
        isPaused = true;
        isStopped = false;
        stopManifestRefreshTimer();
    }

    function reset() {

        eventBus.off(MediaPlayerEvents.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(MediaPlayerEvents.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.off(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);

        resetInitialSettings();
    }

    function stopManifestRefreshTimer() {
        if (refreshTimer !== null) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
    }

    function startManifestRefreshTimer(delay) {
        stopManifestRefreshTimer();

        if (isStopped) {
            return;
        }

        if (isNaN(delay) && !isNaN(refreshDelay)) {
            delay = refreshDelay * 1000;
        }

        if (!isNaN(delay)) {
            logger.debug('Refresh manifest in ' + delay + ' milliseconds.');
            refreshTimer = setTimeout(onRefreshTimer, delay);
        }
    }

    function refreshManifest(ignorePatch = false) {
        isUpdating = true;
        const manifest = manifestModel.getValue();

        // default to the original url in the manifest
        let url = manifest.url;

        // Check for PatchLocation and Location alternatives
        const patchLocation = adapter.getPatchLocation(manifest);
        const location = adapter.getLocation(manifest);
        if (patchLocation && !ignorePatch) {
            url = patchLocation;
        } else if (location) {
            url = location;
        }

        // if one of the alternatives was relative, convert to absolute
        if (urlUtils.isRelative(url)) {
            url = urlUtils.resolve(url, manifest.url);
        }

        manifestLoader.load(url);
    }

    function update(manifest) {
        if (!manifest) {
            // successful update with no content implies existing manifest remains valid
            manifest = manifestModel.getValue();

            // override load time to avoid invalid latency tracking and ensure update cadence
            manifest.loadedTime = new Date();
        } else if (adapter.getIsPatch(manifest)) {
            // with patches the in-memory manifest is our base
            let patch = manifest;
            manifest = manifestModel.getValue();

            // check for patch validity
            let isPatchValid = adapter.isPatchValid(manifest, patch);
            let patchSuccessful = isPatchValid;

            if (isPatchValid) {
                // grab publish time before update
                let publishTime = adapter.getPublishTime(manifest);

                // apply validated patch to manifest
                patchSuccessful = adapter.applyPatchToManifest(manifest, patch);

                // get the updated publish time
                let updatedPublishTime = adapter.getPublishTime(manifest);

                // ensure the patch properly updated the in-memory publish time
                patchSuccessful = publishTime.getTime() != updatedPublishTime.getTime();
            }

            // if the patch failed to apply, force a full manifest refresh
            if (!patchSuccessful) {
                logger.debug('Patch provided is invalid, performing full manifest refresh');
                refreshManifest(true);
                return;
            }

            // override load time to avoid invalid latency tracking and ensure update cadence
            manifest.loadedTime = new Date();
        }

        // See DASH-IF IOP v4.3 section 4.6.4 "Transition Phase between Live and On-Demand"
        // Stop manifest update, ignore static manifest and signal end of dynamic stream to detect end of stream
        if (manifestModel.getValue() && manifestModel.getValue().type === DashConstants.DYNAMIC && manifest.type === DashConstants.STATIC) {
            eventBus.trigger(Events.DYNAMIC_TO_STATIC);
            isUpdating = false;
            isStopped = true;
            return;
        }

        manifestModel.setValue(manifest);

        const date = new Date();
        const latencyOfLastUpdate = (date.getTime() - manifest.loadedTime.getTime()) / 1000;
        refreshDelay = adapter.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
        // setTimeout uses a 32 bit number to store the delay. Any number greater than it
        // will cause event associated with setTimeout to trigger immediately
        if (refreshDelay * 1000 > 0x7FFFFFFF) {
            refreshDelay = 0x7FFFFFFF / 1000;
        }
        eventBus.trigger(Events.MANIFEST_UPDATED, { manifest: manifest });
        logger.info('Manifest has been refreshed at ' + date + '[' + date.getTime() / 1000 + '] ');

        if (!isPaused) {
            startManifestRefreshTimer();
        }
    }

    function onRefreshTimer() {
        if (isPaused) {
            return;
        }
        if (isUpdating) {
            startManifestRefreshTimer(settings.get().streaming.manifestUpdateRetryInterval);
            return;
        }
        refreshManifest();
    }

    function onManifestLoaded(e) {
        if (!e.error) {
            update(e.manifest);
        } else if (e.error.code === Errors.MANIFEST_LOADER_PARSING_FAILURE_ERROR_CODE) {
            errHandler.error(e.error);
        }
    }

    function onPlaybackStarted (/*e*/) {
        isPaused = false;
        startManifestRefreshTimer();
    }

    function onPlaybackPaused(/*e*/) {
        isPaused = !settings.get().streaming.scheduling.scheduleWhilePaused;

        if (isPaused) {
            stopManifestRefreshTimer();
        }
    }

    function onStreamsComposed(/*e*/) {
        // When streams are ready we can consider manifest update completed. Resolve the update promise.
        isUpdating = false;
    }

    instance = {
        initialize: initialize,
        setManifest: setManifest,
        refreshManifest: refreshManifest,
        setConfig: setConfig,
        reset: reset
    };

    setup();
    return instance;
}
ManifestUpdater.__dashjs_factory_name = 'ManifestUpdater';
export default FactoryMaker.getClassFactory(ManifestUpdater);
