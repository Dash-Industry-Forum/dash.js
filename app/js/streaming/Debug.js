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

    var htmlConsole = null;

    return {
        init: function (hc) {
            htmlConsole = $(hc);
        },

        log: function (message) {
            console.log(message);

            if (htmlConsole !== null) {
                var output = message + "</br>";//var output = message + "</br>" + htmlConsole.innerHTML;
                htmlConsole.prepend(output);//htmlConsole.innerHTML = output;
            }
        }
    };
};