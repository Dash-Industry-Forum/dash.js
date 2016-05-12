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

function ManifestUpdater() {

    let context = this.context;
    let log = Debug(context).getInstance().log;
    let eventBus = EventBus(context).getInstance();

    let instance,
        refreshDelay,
        refreshTimer,
        isStopped,
        isUpdating,
        manifestLoader,
        manifestModel,
        dashManifestModel;

    function setConfig(config) {
        if (!config) return;

        if (config.manifestModel) {
            manifestModel = config.manifestModel;
        }
        if (config.dashManifestModel) {
            dashManifestModel = config.dashManifestModel;
        }
    }

    function initialize(loader) {
        manifestLoader = loader;
        refreshDelay = NaN;
        refreshTimer = null;
        isUpdating = false;
        isStopped = true;

        eventBus.on(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.on(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.on(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.on(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);
    }

    function setManifest(manifest) {
        update(manifest);
    }

    function getManifestLoader() {
        return manifestLoader;
    }

    function reset() {
        eventBus.off(Events.PLAYBACK_STARTED, onPlaybackStarted, this);
        eventBus.off(Events.PLAYBACK_PAUSED, onPlaybackPaused, this);
        eventBus.off(Events.STREAMS_COMPOSED, onStreamsComposed, this);
        eventBus.off(Events.INTERNAL_MANIFEST_LOADED, onManifestLoaded, this);

        isStopped = true;
        isUpdating = false;
        clear();
        refreshDelay = NaN;
    }

    function clear() {
        if (refreshTimer !== null) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    function startManifestRefreshTimer() {
        clear();
        if (!isNaN(refreshDelay)) {
            log('Refresh manifest in ' + refreshDelay + ' seconds.');
            refreshTimer = setTimeout(onRefreshTimer, Math.min(refreshDelay * 1000, Math.pow(2, 31) - 1), this);
        }
    }

    function update(manifest) {
        var delay,
            timeSinceLastUpdate;

        var date = new Date();

        manifestModel.setValue(manifest);
        log('Manifest has been refreshed at ' + date + '[' + date.getTime() / 1000 + '] ');

        delay = dashManifestModel.getRefreshDelay(manifest);
        timeSinceLastUpdate = (new Date().getTime() - manifest.loadedTime.getTime()) / 1000;
        refreshDelay = Math.max(delay - timeSinceLastUpdate, 0);

        eventBus.trigger(Events.MANIFEST_UPDATED, {manifest: manifest});

        if (!isStopped) {
            startManifestRefreshTimer();
        }
    }

    function onRefreshTimer() {
        var manifest,
            url;

        if (isStopped || isUpdating) return;

        isUpdating = true;
        manifest = manifestModel.getValue();
        url = manifest.url;

        const location = dashManifestModel.getLocation(manifest);
        if (location) {
            url = location;
        }

        //log("Refresh manifest @ " + url);

        manifestLoader.load(url);
    }

    function onManifestLoaded(e) {
        if (!e.error) {
            update(e.manifest);
        }
    }

    function onPlaybackStarted (/*e*/) {
        isStopped = false;
        startManifestRefreshTimer();
    }

    function onPlaybackPaused(/*e*/) {
        isStopped = true;
        clear();
    }

    function onStreamsComposed(/*e*/) {
        // When streams are ready we can consider manifest update completed. Resolve the update promise.
        isUpdating = false;
    }

    instance = {
        initialize: initialize,
        setManifest: setManifest,
        getManifestLoader: getManifestLoader,
        setConfig: setConfig,
        reset: reset
    };

    return instance;
}
ManifestUpdater.__dashjs_factory_name = 'ManifestUpdater';
export default FactoryMaker.getSingletonFactory(ManifestUpdater);
