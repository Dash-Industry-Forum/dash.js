/*
 * The copyright in this software is being made available under the BSD License, included below. This software may be subject to other third party and contributor rights, including patent rights, and no such rights are granted under this license.
 *
 * Copyright (c) 2013, Digital Primates
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 * •  Neither the name of the Digital Primates nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
MediaPlayer.dependencies.ManifestUpdater = function () {
    "use strict";

    var refreshDelay = NaN,
        refreshTimer = null,
        isStopped = false,
        isUpdating = false,
        updateByEventMessageOnly = false,

        setIgnoreMinimumUpdatePeriod = function (doIt) {
            updateByEventMessageOnly = !!doIt;

            this.debug.log("Disable minimumUpdatePeriod: " + !!doIt);
        },

        getIgnoreMinimumUpdatePeriod = function () {
            return updateByEventMessageOnly;
        },

        clear = function () {
            if (refreshTimer !== null) {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        },

        start = function () {
            clear.call(this);

            if (!isNaN(refreshDelay)) {
                this.debug.log("Refresh manifest in " + refreshDelay + " seconds.");
                refreshTimer = setTimeout(onRefreshTimer.bind(this), Math.min(refreshDelay * 1000, Math.pow(2, 31) - 1), this);
            }
        },

        update = function () {
            var self = this,
                manifest = self.manifestModel.getValue(),
                delay,
                timeSinceLastUpdate;

            if (manifest !== undefined && manifest !== null) {
                delay = self.manifestExt.getRefreshDelay(manifest);
                timeSinceLastUpdate = (new Date().getTime() - manifest.loadedTime.getTime()) / 1000;
                refreshDelay = Math.max(delay - timeSinceLastUpdate, 0);
                start.call(self);
            }
        },

        onRefreshTimer = function () {
            var self = this,
                manifest,
                url;

            if (isUpdating) return;

            isUpdating = true;
            manifest = self.manifestModel.getValue();
            url = manifest.url;

            if (manifest.hasOwnProperty("Location")) {
                url = manifest.Location;
            }

            //self.debug.log("Refresh manifest @ " + url);

            self.manifestLoader.load(url);
        },

        onManifestLoaded = function(sender, manifest, error) {
            if (error) return;

            this.manifestModel.setValue(manifest);
            this.debug.log("Manifest has been refreshed.");
            //self.debug.log(manifestResult);
            if (isStopped) return;

            update.call(this);
        },

        onPlaybackStarted = function() {
            this.start();
        },

        onPlaybackPaused = function() {
            this.stop();
        },

        onStreamsComposed = function(/*sender, error*/) {
            // When streams are ready we can consider manifest update completed. Resolve the update promise.
            isUpdating = false;
        },

        onEventStreamsChanged = function (event) {
            var self = this,
                trackEventHandler = function (event) {
                    var track = event.target;

                    // this assumes that there is only one active update
                    // message at a time.
                    if (track.activeCues.length) {
                        self.debug.log("ManifestUpdater: refreshing manifest due to event message");
                        onRefreshTimer.call(this);
                    }
                },
                siu = event.track.label.split(" ")[0],
                val = event.track.label.split(" ")[1];

            // check this is an event handler we are interested in
            if ((siu === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_SCHEME_ID_URI) &&
                    ((val === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_UPDATE) ||
                     (val === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_PATCH) ||
                     (val === MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_INBAND))) {
                if (event.type === "addtrack") {
                    setIgnoreMinimumUpdatePeriod.call(self, true);
                    this.stop();
                    event.track.addEventListener('cuechange', trackEventHandler.bind(this));
                } else if (event.type === "removetrack") {
                    setIgnoreMinimumUpdatePeriod.call(self, false);
                    this.start();
                    event.track.removeEventListener('cuechange', trackEventHandler.bind(this));
                }
            }
        };

    return {
        debug: undefined,
        system: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,
        eventBus: undefined,

        setup: function () {
            // Listen to streamsComposed event to be aware that the streams have been composed
            this.streamsComposed = onStreamsComposed;
            this.manifestLoaded = onManifestLoaded;
            this.playbackStarted = onPlaybackStarted;
            this.playbackPaused = onPlaybackPaused;

            // listen for TextTrack changes, there may be something for us
            this.eventBus.addEventListener("addtrack", onEventStreamsChanged.bind(this));
            this.eventBus.addEventListener("removetrack", onEventStreamsChanged.bind(this));
        },

        start: function () {
            isStopped = false;
            update.call(this);
        },

        stop: function() {
            if (!getIgnoreMinimumUpdatePeriod()) {
                isStopped = false;
                update.call(this);
            }
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_SCHEME_ID_URI = "urn:mpeg:dash:event:2012";
MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_UPDATE = "1";
MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_PATCH = "2";
MediaPlayer.dependencies.ManifestUpdater.MANIFEST_UPDATE_EMSG_VALUE_INBAND = "3";

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};
