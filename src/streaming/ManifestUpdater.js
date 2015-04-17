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
MediaPlayer.dependencies.ManifestUpdater = function () {
    "use strict";

    var refreshDelay = NaN,
        refreshTimer = null,
        isStopped = true,
        isUpdating = false,
        manifestLoader,

        clear = function () {
            if (refreshTimer !== null) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        },

        start = function () {
            clear.call(this);

            if (!isNaN(refreshDelay)) {
                this.log("Refresh manifest in " + refreshDelay + " seconds.");
                refreshTimer = setTimeout(onRefreshTimer.bind(this), Math.min(refreshDelay * 1000, Math.pow(2, 31) - 1), this);
            }
        },

        update = function (manifest) {

            var delay,
                timeSinceLastUpdate;

            this.manifestModel.setValue(manifest);
            this.log("Manifest has been refreshed.");

            delay = this.manifestExt.getRefreshDelay(manifest);
            timeSinceLastUpdate = (new Date().getTime() - manifest.loadedTime.getTime()) / 1000;
            refreshDelay = Math.max(delay - timeSinceLastUpdate, 0);

            this.notify(MediaPlayer.dependencies.ManifestUpdater.eventList.ENAME_MANIFEST_UPDATED, {manifest:manifest});

            if (!isStopped) {
                start.call(this);
            }
        },

        onRefreshTimer = function () {
            var self = this,
                manifest,
                url;

            if (isStopped || isUpdating) return;

            isUpdating = true;
            manifest = self.manifestModel.getValue();
            url = manifest.url;

            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }

            //self.log("Refresh manifest @ " + url);

            manifestLoader.load(url);
        },

        onManifestLoaded = function(e) {
            if (!e.error) {
                update.call(this, e.data.manifest);
            }
        },

        onPlaybackStarted = function(/*e*/) {
            isStopped = false;
            start.call(this);
        },

        onPlaybackPaused = function(/*e*/) {
            isStopped = true;
            clear.call(this);
        },

        onStreamsComposed = function(/*e*/) {
            // When streams are ready we can consider manifest update completed. Resolve the update promise.
            isUpdating = false;
        };

    return {
        log: undefined,
        system: undefined,
        subscribe: undefined,
        unsubscribe: undefined,
        notify: undefined,
        manifestModel: undefined,
        manifestExt: undefined,

        setup: function () {
            // Listen to streamsComposed event to be aware that the streams have been composed
            this[MediaPlayer.dependencies.StreamController.eventList.ENAME_STREAMS_COMPOSED] = onStreamsComposed;
            this[MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED] = onManifestLoaded;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_STARTED] = onPlaybackStarted;
            this[MediaPlayer.dependencies.PlaybackController.eventList.ENAME_PLAYBACK_PAUSED] = onPlaybackPaused;
        },

        initialize: function (loader) {
            isUpdating = false;
            isStopped = true;
            manifestLoader = loader;
            manifestLoader.subscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, this);
        },

        setManifest: function (m) {
            update.call(this, m);
        },

        getManifestLoader: function () {
            return manifestLoader;
        },

        reset: function() {
            isStopped = true;
            isUpdating = false;
            clear.call(this);
            manifestLoader.unsubscribe(MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, this);
            refreshDelay = NaN;
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};

MediaPlayer.dependencies.ManifestUpdater.eventList = {
    ENAME_MANIFEST_UPDATED: "manifestUpdated"
};
