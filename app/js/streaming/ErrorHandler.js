/*
 *
 * The copyright in this software is being made available under the BSD
 * License, included below. This software may be subject to other third party
 * and contributor rights, including patent rights, and no such rights are
 * granted under this license.
 * 
 * Copyright (c) 2013, Dash Industry Forum
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * •  Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * •  Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * •  Neither the name of the Dash Industry Forum nor the names of its
 *    contributors may be used to endorse or promote products derived from this
 *    software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS”
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

MediaPlayer.dependencies.ErrorHandler = function () {
    "use strict";

    return {
        downloadError: function (err) {
            //var msg = "<span>If you see the message 'XMLHttpRequest cannot load URL Origin URL is not allowed by Access-Control-Allow-Origin.' in the console, try turning off Chrome's web security.<br/>-Right click the Chrome icon and select 'properties'.<br/>-In the 'target' field add '--disable-web-security'.<br/>-After launching Chrome you will see the message 'You are using an unsupported command-line flag: --disable-web-security. Stability and security will suffer.'</span>",
            //    div = "<div id='message' class='message' style='display: none'><p><span style='text-align: center; width: 100%; font-weight: bold;'>" + err + "</span><br/><br/>" + msg + "</p><a href='#' class='close-notify'>X</a></div>";

            var msg = "<span>File loading error.  This is most likely caused by the Cross Origin Resource Sharing (CORS) headers not being present in the response from the server which is hosting the file. Please check your server implementation to ensure that CORS headers are in place, as the JavaScript will not be able to request the manifest or segments without them.</span>",
                div = "<div id='message' class='message' style='display: none'><p><span style='text-align: center; width: 100%; font-weight: bold;'>" + err + "</span><br/><br/>" + msg + "</p><a href='#' class='close-notify'>X</a></div>";

            $("body").append(div);
            $("#message").fadeIn("slow");
            $("#message a.close-notify").click(function() {
                $("#message").fadeOut("slow");
                return false;
            });
        },

        mediaSourceError: function (err) {
            var msg = "<span>MediaSource has encountered an error.</span>",
                div = "<div id='message' class='message' style='display: none'><p><span style='text-align: center; width: 100%; font-weight: bold;'>" + err + "</span><br/><br/>" + msg + "</p><a href='#' class='close-notify'>X</a></div>";

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