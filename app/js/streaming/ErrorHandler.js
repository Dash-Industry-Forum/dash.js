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

MediaPlayer.dependencies.ErrorHandler = function () {
    "use strict";

    return {
        downloadError: function (err) {
            var msg = "<span>If you see the message 'XMLHttpRequest cannot load URL Origin URL is not allowed by Access-Control-Allow-Origin.' in the console, try turning off Chrome's web security.<br>-Right click the Chrome icon and select 'properties'.<br>-In the 'target' field add '--disable-web-security'.<br>-After launching Chrome you will see the message 'You are using an unsupported command-line flag: --disable-web-security. Stability and security will suffer.'</span>";
            var div = "<div id='message' class='message' style='display: none'><p><span style='text-align: center; width: 100%; font-weight: bold;'>" + err + "</span><br><br>" + msg + "</p><a href='#' class='close-notify'>X</a></div>";

            $("body").append(div);
            $("#message").fadeIn("slow");
            $("#message a.close-notify").click(function() {
                $("#message").fadeOut("slow");
                return false;
            });
        }
    };
};

MediaPlayer.dependencies.ErrorHandler.prototype = {
    constructor: MediaPlayer.dependencies.ErrorHandler
};