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
MediaPlayer.utils.Debug = function () {
    "use strict";

    var htmlConsole = null,
        logToHtmlConsole = true,
        filter = "",
        updateFilter = function () {
            if (htmlConsole === null) {
                return;
            }

            if (filter === "") {
                htmlConsole.children().show();
            } else {
                htmlConsole.children().hide();
                htmlConsole.children().filter(":contains('" + filter + "')").show();
            }
        };

    return {
        init: function (hc) {
            htmlConsole = $(hc);
        },

        getFilter: function () {
            return filter;
        },

        setFilter: function (value) {
            if (value === filter) {
                return;
            }

            filter = value;
            updateFilter();
        },

        getLogToHtmlConsole: function () {
            return logToHtmlConsole;
        },

        setLogToHtmlConsole: function (value) {
            logToHtmlConsole = value;
        },

        log: function (message) {
            console.log(message);

            if (htmlConsole !== null && logToHtmlConsole) {
                var trace = "<dt>" + message + "</dt>";
                htmlConsole.prepend(trace);

                if (filter !== "") {
                    updateFilter();
                }
            }
        }
    };
};