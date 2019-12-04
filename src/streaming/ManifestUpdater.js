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
import FactoryMaker from '../core/FactoryMaker';
import Debug from '../core/Debug';
import Errors from '../core/errors/Errors';

function ManifestUpdater() {

    const context = this.context;
    const eventBus = EventBus(context).getInstance();

    let instance,
        logger,
        refreshDelay,
        refreshTimer,
        isPaused,
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
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);
    }

    function setManifest(manifest) {
        update(manifest);
    }

    function resetInitialSettings() {
        refreshDelay = NaN;
        isUpdating = false;
        isPaused = true;
        stopManifestRefreshTimer();
    }

    function reset() {

        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.off(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);

        resetInitialSettings();
    }

    function stopManifestRefreshTimer() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function startManifestRefreshTimer(delay) {
        stopManifestRefreshTimer();

        if (isNaN(delay) && !isNaN(refreshDelay)) {
            delay = refreshDelay * 1000;
        }

        if (!isNaN(delay)) {
            logger.debug('Refresh manifest in ' + delay + ' milliseconds.');
            refreshTimer = setTimeout(onRefreshTimer, delay);
        }
    }

    function refreshManifest() {
        isUpdating = true;
        const manifest = manifestModel.getValue();
        let url = manifest.url;
        const location = adapter.getLocation(manifest);
        if (location) {
            url = location;
        }
        manifestLoader.load(url);
    }

    function update(manifest) {

        manifestModel.setValue(manifest);

        const date = new Date();
        const latencyOfLastUpdate = (date.getTime() - manifest.loadedTime.getTime()) / 1000;
        refreshDelay = adapter.getManifestUpdatePeriod(manifest, latencyOfLastUpdate);
        // setTimeout uses a 32 bit number to store the delay. Any number greater than it
        // will cause event associated with setTimeout to trigger immediately
        if (refreshDelay * 1000 > 0x7FFFFFFF) {
            refreshDelay = 0x7FFFFFFF / 1000;
        }
        eventBus.trigger(Events.MANIFEST_UPDATED, {manifest: manifest});
        logger.info('Manifest has been refreshed at ' + date + '[' + date.getTime() / 1000 + '] ');

        if (!isPaused) {
            startManifestRefreshTimer();
        }
    }

    function onRefreshTimer() {
        if (isPaused && !settings.get().streaming.scheduleWhilePaused) {
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
        isPaused = true;
        stopManifestRefreshTimer();
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
