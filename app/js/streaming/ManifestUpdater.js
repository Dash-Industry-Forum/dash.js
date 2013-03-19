/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Digital Primates
 * copyright dash-if 2012
 */
MediaPlayer.dependencies.ManifestUpdater = function () {
    "use strict";

    var refreshDelay = NaN,
        refreshTimer = null,
        onRefreshTimer = null,

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
                refreshTimer = setInterval(onRefreshTimer.bind(this), refreshDelay * 1000, this);
            }
        },

        update = function () {
            var self = this,
                manifest = self.manifestModel.getValue();

            if (manifest !== undefined && manifest !== null) {
                self.manifestExt.getRefreshDelay(manifest).then(
                    function (t) {
                        refreshDelay = t;
                        start.call(self);
                    }
                );
            }
        };

    onRefreshTimer = function () {
        var self = this,
            manifest = self.manifestModel.getValue();

        self.debug.log("Refresh manifest.");
        self.manifestLoader.load(manifest.mpdUrl).then(
            function (manifestResult) {
                self.debug.log("Manifest has been updated.");
                self.manifestModel.setValue(manifestResult);
                self.debug.log("Manifest has been refreshed.");
                update.call(self);
                self.system.notify("manifestUpdated");
            }
        );
    };

    return {
        debug: undefined,
        system: undefined,
        manifestModel: undefined,
        manifestExt: undefined,
        manifestLoader: undefined,

        setup: function () {
            update.call(this);
        },

        init: function () {
            update.call(this);
        }
    };
};

MediaPlayer.dependencies.ManifestUpdater.prototype = {
    constructor: MediaPlayer.dependencies.ManifestUpdater
};